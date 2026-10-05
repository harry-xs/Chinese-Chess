import type { Color, GameResult, Level, Move } from '../engine/types';

export interface Settings {
  playerColor: Color;
  level: Level;
  soundEnabled: boolean;
}

const SETTINGS_KEY = 'xq:settings';
const SAVE_KEY = 'xq:savegame';

export const DEFAULT_SETTINGS: Settings = {
  playerColor: 'red',
  level: 'intermediate',
  soundEnabled: true,
};

const VALID_LEVELS: Level[] = ['intermediate', 'advanced', 'master', 'grandmaster', 'sage'];

export function normalizeLevel(level: unknown): Level {
  return VALID_LEVELS.includes(level as Level) ? (level as Level) : 'intermediate';
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      level: normalizeLevel(parsed.level),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export interface SavedGame {
  board: number[];
  turn: Color;
  halfMoveClock: number;
  moveList: Move[];
  positionKeys: string[];
  playerColor: Color;
  level: Level;
  lastMove: Move | null;
  result: GameResult | null;
  moveCount: number;
}

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {
    /* ignore */
  }
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    return { ...parsed, level: normalizeLevel(parsed.level) };
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
