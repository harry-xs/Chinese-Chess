import { create } from 'zustand';
import {
  encodeMove,
  kingInCheck,
  legalMoves,
  legalMovesFrom,
} from '../engine/board';
import { pieceValue } from '../engine/evaluate';
import { computeZobrist } from '../engine/zobrist';
import type { Color, GameResult, GameStatus, Level, Move, Position } from '../engine/types';
import { requestEngine } from './engineClient';
import {
  DEFAULT_SETTINGS,
  clearGame,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
  type SavedGame,
  type Settings,
} from './persistence';
import {
  adjudicateRepetition,
  applyMove,
  checkGameOver,
  colorOfSide,
  computeChecks,
  initialPosition,
  opposite,
  positionKey,
  sideOfColor,
} from './rules';
import { initAudio, playSound, setSoundEnabled, vibrate } from './sound';

interface Snapshot {
  board: Int8Array;
  turn: Color;
  zobrist: bigint;
  halfMoveClock: number;
  positionKeys: string[];
  lastMove: Move | null;
  moveListLen: number;
}

type Screen = 'setup' | 'game';

interface GameStore {
  screen: Screen;
  settings: Settings;
  position: Position;
  history: Snapshot[];
  moveList: Move[];
  positionKeys: string[];
  status: GameStatus;
  result: GameResult | null;
  playerColor: Color;
  level: Level;
  selectedSquare: number | null;
  legalTargets: number[];
  lastMove: Move | null;
  hint: { from: number; to: number } | null;
  thinking: boolean;
  inCheck: boolean;
  statusMessage: string | null;
  hasSave: boolean;
  gameId: number;

  init: () => void;
  setPlayerColor: (c: Color) => void;
  setLevel: (l: Level) => void;
  toggleSound: () => void;
  startGame: (continueSaved?: boolean) => void;
  returnToSetup: () => void;
  selectSquare: (idx: number) => void;
  undo: () => void;
  requestHint: () => void;
  restart: () => void;
  resign: () => void;
  offerDraw: () => void;
  playClick: () => void;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isPlayerPiece(pos: Position, idx: number, playerColor: Color): boolean {
  const piece = pos.board[idx];
  return piece !== 0 && sideOfColor(playerColor) === (piece > 0 ? 1 : -1);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(game: SavedGame): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveGame(game), 500);
}

export const useGameStore = create<GameStore>((set, get) => {
  const snapshot = (): Snapshot => {
    const s = get();
    return {
      board: Int8Array.from(s.position.board),
      turn: s.position.turn,
      zobrist: s.position.zobrist,
      halfMoveClock: s.position.halfMoveClock,
      positionKeys: [...s.positionKeys],
      lastMove: s.lastMove,
      moveListLen: s.moveList.length,
    };
  };

  const persist = (): void => {
    const s = get();
    if (s.status === 'idle') return;
    scheduleSave({
      board: Array.from(s.position.board),
      turn: s.position.turn,
      halfMoveClock: s.position.halfMoveClock,
      moveList: s.moveList,
      positionKeys: s.positionKeys,
      playerColor: s.playerColor,
      level: s.level,
      lastMove: s.lastMove,
      result: s.result,
      moveCount: s.moveList.length,
    });
  };

  const clearTransient = (): void => {
    setTimeout(() => {
      if (get().statusMessage) set({ statusMessage: null });
    }, 800);
  };

  const commit = (encoded: number): void => {
    const s = get();
    const history = [...s.history, snapshot()];
    const { next, move } = applyMove(s.position, encoded);
    const positionKeys = [...s.positionKeys, positionKey(next)];
    const moveList = [...s.moveList, move];
    const checks = computeChecks(moveList);
    const result =
      checkGameOver(next) ?? adjudicateRepetition(positionKeys, checks);
    const inCheck = result ? false : kingInCheck(next.board, sideOfColor(next.turn));

    set({
      history,
      position: next,
      positionKeys,
      moveList,
      lastMove: move,
      selectedSquare: null,
      legalTargets: [],
      hint: null,
      status: result ? 'over' : 'playing',
      result,
      inCheck,
    });

    if (move.captured !== 0) {
      playSound('capture');
      vibrate([6, 20, 10]);
    } else {
      playSound('place');
      vibrate(8);
    }
    if (result) {
      finishSounds(result);
    } else if (inCheck) {
      playSound('check');
      vibrate([10, 40, 10, 40, 15]);
    }
    persist();
  };

  const perpetualLossFor = (encoded: number): boolean => {
    const s = get();
    const applied = applyMove(s.position, encoded);
    const positionKeys = [...s.positionKeys, positionKey(applied.next)];
    const checks = computeChecks([...s.moveList, applied.move]);
    const rep = adjudicateRepetition(positionKeys, checks);
    return !!(rep && rep.reason === 'perpetual-check' && rep.winner !== s.position.turn);
  };

  const finishSounds = (result: GameResult): void => {
    const s = get();
    if (!result.winner) {
      playSound('lose');
      return;
    }
    if (result.winner === s.playerColor) playSound('win');
    else playSound('lose');
  };

  const triggerAi = async (): Promise<void> => {
    const s = get();
    if (s.result || s.position.turn === s.playerColor || s.status === 'idle') return;
    const id = s.gameId;
    set({ status: 'thinking', thinking: true });
    const started = performance.now();
    let encoded = 0;
    try {
      const res = await requestEngine(
        s.position.board,
        s.position.turn,
        s.level,
        s.positionKeys,
      );
      encoded = res.move;
    } catch {
      encoded = 0;
    }
    const elapsed = performance.now() - started;
    const wait = Math.min(Math.max(400 - elapsed, 0), 600);
    if (wait > 0) await delay(wait);

    const cur = get();
    if (cur.gameId !== id || cur.result || cur.status === 'idle') return;

    const side = sideOfColor(cur.position.turn);
    const legal = legalMoves(cur.position.board, side);
    if (legal.length === 0) {
      set({ thinking: false });
      return;
    }
    if (!legal.includes(encoded)) {
      encoded = pickFallback(legal, cur.position.board);
    }
    if (perpetualLossFor(encoded)) {
      const alternatives = legal.filter((m) => !perpetualLossFor(m));
      encoded = pickFallback(alternatives.length > 0 ? alternatives : legal, cur.position.board);
    }
    set({ thinking: false });
    commit(encoded);
    if (!get().result) void maybeTriggerAi();
  };

  const maybeTriggerAi = async (): Promise<void> => {
    if (get().position.turn !== get().playerColor) await triggerAi();
  };

  const startFrom = (
    playerColor: Color,
    level: Level,
    position: Position,
    extra?: Partial<GameStore>,
  ): void => {
    set({
      screen: 'game',
      playerColor,
      level,
      position,
      history: extra?.history ?? [],
      moveList: extra?.moveList ?? [],
      positionKeys: extra?.positionKeys ?? [positionKey(position)],
      lastMove: extra?.lastMove ?? null,
      status: 'playing',
      result: null,
      selectedSquare: null,
      legalTargets: [],
      hint: null,
      thinking: false,
      inCheck: kingInCheck(position.board, sideOfColor(position.turn)),
      statusMessage: null,
      gameId: get().gameId + 1,
    });
    saveSettings({ ...get().settings, playerColor, level });
    void maybeTriggerAi();
  };

  return {
    screen: 'setup',
    settings: { ...DEFAULT_SETTINGS },
    position: initialPosition(),
    history: [],
    moveList: [],
    positionKeys: [positionKey(initialPosition())],
    status: 'idle',
    result: null,
    playerColor: 'red',
    level: 'intermediate',
    selectedSquare: null,
    legalTargets: [],
    lastMove: null,
    hint: null,
    thinking: false,
    inCheck: false,
    statusMessage: null,
    hasSave: false,
    gameId: 0,

    init: () => {
      const settings = loadSettings();
      const saved = loadGame();
      setSoundEnabled(settings.soundEnabled);
      if (saved && saved.result) {
        clearGame();
        set({
          settings,
          playerColor: settings.playerColor,
          level: settings.level,
          hasSave: false,
        });
        return;
      }
      set({ settings, playerColor: settings.playerColor, level: settings.level, hasSave: !!saved });
    },

    setPlayerColor: (c) => {
      const settings = { ...get().settings, playerColor: c };
      set({ playerColor: c, settings });
      saveSettings(settings);
      playSound('click');
    },

    setLevel: (l) => {
      const settings = { ...get().settings, level: l };
      set({ level: l, settings });
      saveSettings(settings);
      playSound('click');
    },

    toggleSound: () => {
      const soundEnabled = !get().settings.soundEnabled;
      const settings = { ...get().settings, soundEnabled };
      setSoundEnabled(soundEnabled);
      set({ settings });
      saveSettings(settings);
      initAudio();
      if (soundEnabled) playSound('click');
    },

    playClick: () => {
      initAudio();
      playSound('click');
    },

    startGame: (continueSaved = false) => {
      initAudio();
      const s = get();
      if (continueSaved && s.hasSave) {
        const saved = loadGame();
        if (saved) {
          const board = Int8Array.from(saved.board);
          const position: Position = {
            board,
            turn: saved.turn,
            zobrist: computeZobrist(board, saved.turn === 'red'),
            halfMoveClock: saved.halfMoveClock,
          };
          startFrom(saved.playerColor, saved.level, position, {
            moveList: saved.moveList,
            positionKeys: saved.positionKeys,
            lastMove: saved.lastMove,
          });
          return;
        }
      }
      startFrom(s.playerColor, s.level, initialPosition());
    },

    returnToSetup: () => {
      clearGame();
      saveTimer && clearTimeout(saveTimer);
      set({
        screen: 'setup',
        status: 'idle',
        result: null,
        hasSave: false,
        thinking: false,
        gameId: get().gameId + 1,
      });
    },

    selectSquare: (idx) => {
      const s = get();
      if (s.status !== 'playing' || s.position.turn !== s.playerColor) return;
      if (s.selectedSquare !== null && s.legalTargets.includes(idx)) {
        const encoded = encodeMove(s.selectedSquare, idx);
        initAudio();
        commit(encoded);
        if (!get().result) void maybeTriggerAi();
        return;
      }
      if (isPlayerPiece(s.position, idx, s.playerColor)) {
        if (s.selectedSquare === idx) {
          set({ selectedSquare: null, legalTargets: [] });
          return;
        }
        const targets = legalMovesFrom(s.position.board, idx).map((m) => m & 0xff);
        playSound('click');
        set({ selectedSquare: idx, legalTargets: targets });
        return;
      }
      set({ selectedSquare: null, legalTargets: [] });
    },

    undo: () => {
      const s = get();
      if (s.thinking || s.history.length === 0) return;
      const history = [...s.history];
      let position = s.position;
      let positionKeys = s.positionKeys;
      let lastMove: Move | null = s.lastMove;
      let moveList = s.moveList;
      do {
        const snap = history.pop();
        if (!snap) break;
        position = {
          board: Int8Array.from(snap.board),
          turn: snap.turn,
          zobrist: snap.zobrist,
          halfMoveClock: snap.halfMoveClock,
        };
        positionKeys = snap.positionKeys;
        lastMove = snap.lastMove;
        moveList = moveList.slice(0, snap.moveListLen);
      } while (position.turn !== s.playerColor && history.length > 0);

      const inCheck = kingInCheck(position.board, sideOfColor(position.turn));
      set({
        history,
        position,
        positionKeys,
        moveList,
        lastMove,
        selectedSquare: null,
        legalTargets: [],
        hint: null,
        result: null,
        status: 'playing',
        inCheck,
        statusMessage: '已悔棋',
        gameId: s.gameId,
      });
      playSound('undo');
      vibrate([8, 20, 8]);
      clearTransient();
      persist();
      if (position.turn !== s.playerColor) {
        set({ gameId: s.gameId + 1 });
        void maybeTriggerAi();
      }
    },

    requestHint: () => {
      const s = get();
      if (s.status !== 'playing' || s.position.turn !== s.playerColor) return;
      const id = s.gameId;
      void requestEngine(s.position.board, s.position.turn, 'intermediate', s.positionKeys, true).then(
        (res) => {
          const cur = get();
          if (cur.gameId !== id || cur.status !== 'playing') return;
          const legal = legalMoves(cur.position.board, sideOfColor(cur.position.turn));
          if (!legal.includes(res.move)) return;
          set({ hint: { from: res.move >> 8, to: res.move & 0xff } });
          const from = res.move >> 8;
          setTimeout(() => {
            const h = get().hint;
            if (h && h.from === from) set({ hint: null });
          }, 2500);
        },
      );
    },

    restart: () => {
      const s = get();
      clearGame();
      saveTimer && clearTimeout(saveTimer);
      set({
        position: initialPosition(),
        history: [],
        moveList: [],
        positionKeys: [positionKey(initialPosition())],
        lastMove: null,
        selectedSquare: null,
        legalTargets: [],
        hint: null,
        result: null,
        status: 'playing',
        inCheck: false,
        thinking: false,
        statusMessage: null,
        gameId: s.gameId + 1,
      });
      void maybeTriggerAi();
    },

    resign: () => {
      const s = get();
      if (s.result) return;
      const result: GameResult = { winner: opposite(s.playerColor), reason: 'resign' };
      set({ result, status: 'over', thinking: false, selectedSquare: null, legalTargets: [], hint: null });
      finishSounds(result);
      persist();
    },

    offerDraw: () => {
      const s = get();
      if (s.result || s.status === 'idle' || s.status === 'thinking') return;
      const result: GameResult = { winner: null, reason: 'agreement' };
      set({
        result,
        status: 'over',
        thinking: false,
        selectedSquare: null,
        legalTargets: [],
        hint: null,
      });
      playSound('click');
      persist();
    },
  };
});

function pickFallback(legal: number[], board: Int8Array): number {
  let best = legal[0] ?? 0;
  let bestScore = -Infinity;
  for (const m of legal) {
    const to = m & 0xff;
    const captured = board[to];
    const score = captured !== 0 ? pieceValue(Math.abs(captured)) : 0;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

export { colorOfSide };

if (import.meta.env.DEV) {
  (window as unknown as { __xqStore?: unknown }).__xqStore = useGameStore;
}
