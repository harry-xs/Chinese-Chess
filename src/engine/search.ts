import { generateMoves, kingInCheck } from './board';
import { RED } from './constants';
import { evaluate, pieceValue } from './evaluate';
import { TT_EXACT, TT_LOWER, TT_UPPER, TranspositionTable } from './tt';
import { Z_TURN, computeZobrist, zobristPiece } from './zobrist';
import type { Level } from './types';

const MATE = 30000;
const MAX_PLY = 64;
const INF = 1 << 20;
const TIMEOUT = Symbol('timeout');

interface SearchOptions {
  timeLimit: number;
  maxDepth: number;
  blunder: number;
  useTT: boolean;
  useKillers: boolean;
  useHistory: boolean;
  useNullMove: boolean;
  checkExtension: boolean;
}

export interface SearchResult {
  move: number;
  score: number;
  depth: number;
  nodes: number;
  time: number;
}

export interface RootMove {
  move: number;
  score: number;
}

interface Ctx {
  board: Int8Array;
  hash: bigint;
  tt: TranspositionTable;
  nodes: number;
  deadline: number;
  stopped: boolean;
  killers: Int32Array;
  history: Int32Array;
  opts: SearchOptions;
}

export const LEVEL_OPTIONS: Record<Level, SearchOptions> = {
  intermediate: {
    timeLimit: 600,
    maxDepth: 4,
    blunder: 30,
    useTT: true,
    useKillers: true,
    useHistory: false,
    useNullMove: false,
    checkExtension: false,
  },
  advanced: {
    timeLimit: 1500,
    maxDepth: 6,
    blunder: 10,
    useTT: true,
    useKillers: true,
    useHistory: true,
    useNullMove: false,
    checkExtension: true,
  },
  master: {
    timeLimit: 2500,
    maxDepth: 8,
    blunder: 0,
    useTT: true,
    useKillers: true,
    useHistory: true,
    useNullMove: true,
    checkExtension: true,
  },
  grandmaster: {
    timeLimit: 4000,
    maxDepth: 10,
    blunder: 0,
    useTT: true,
    useKillers: true,
    useHistory: true,
    useNullMove: true,
    checkExtension: true,
  },
  sage: {
    timeLimit: 6000,
    maxDepth: 14,
    blunder: 0,
    useTT: true,
    useKillers: true,
    useHistory: true,
    useNullMove: true,
    checkExtension: true,
  },
};

const tt = new TranspositionTable(1 << 18);

function doMove(ctx: Ctx, move: number): number {
  const from = move >> 8;
  const to = move & 0xff;
  const board = ctx.board;
  const piece = board[from];
  const captured = board[to];
  ctx.hash ^= zobristPiece(piece, from);
  ctx.hash ^= zobristPiece(piece, to);
  if (captured !== 0) ctx.hash ^= zobristPiece(captured, to);
  board[to] = piece;
  board[from] = 0;
  return captured;
}

function undoMove(ctx: Ctx, move: number, captured: number): void {
  const from = move >> 8;
  const to = move & 0xff;
  const board = ctx.board;
  const piece = board[to];
  board[from] = piece;
  board[to] = captured;
  ctx.hash ^= zobristPiece(piece, from);
  ctx.hash ^= zobristPiece(piece, to);
  if (captured !== 0) ctx.hash ^= zobristPiece(captured, to);
}

function checkTime(ctx: Ctx): void {
  if (ctx.stopped) throw TIMEOUT;
  if ((ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline) {
    ctx.stopped = true;
    throw TIMEOUT;
  }
}

function orderMoves(ctx: Ctx, moves: number[], ttMove: number, ply: number): void {
  const { board } = ctx;
  const k1 = ctx.killers[ply * 2];
  const k2 = ctx.killers[ply * 2 + 1];
  const scores = new Array<number>(moves.length);
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    let score = 0;
    if (move === ttMove) {
      score = 1_000_000_000;
    } else {
      const from = move >> 8;
      const to = move & 0xff;
      const captured = board[to];
      if (captured !== 0) {
        score =
          1_000_000 + pieceValue(Math.abs(captured)) * 10 - pieceValue(Math.abs(board[from]));
      } else if (move === k1) {
        score = 800_000;
      } else if (move === k2) {
        score = 790_000;
      } else if (ctx.opts.useHistory) {
        score = ctx.history[from * 90 + to];
      }
    }
    scores[i] = score;
  }
  const indices = moves.map((_, i) => i);
  indices.sort((a, b) => scores[b] - scores[a]);
  const sorted = indices.map((i) => moves[i]);
  for (let i = 0; i < moves.length; i++) moves[i] = sorted[i];
}

function quiescence(ctx: Ctx, alpha: number, beta: number, side: number, ply: number): number {
  ctx.nodes++;
  checkTime(ctx);
  const standPat = evaluate(ctx.board) * side;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (ply >= MAX_PLY - 1) return alpha;

  const moves = generateMoves(ctx.board, side, true);
  if (moves.length === 0) return alpha;
  orderMoves(ctx, moves, 0, ply);

  for (const move of moves) {
    const captured = doMove(ctx, move);
    if (kingInCheck(ctx.board, side)) {
      undoMove(ctx, move, captured);
      continue;
    }
    const score = -quiescence(ctx, -beta, -alpha, -side, ply + 1);
    undoMove(ctx, move, captured);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(
  ctx: Ctx,
  depth: number,
  alpha: number,
  beta: number,
  side: number,
  ply: number,
  canNull: boolean,
): number {
  if (ply >= MAX_PLY - 1) return evaluate(ctx.board) * side;
  ctx.nodes++;
  checkTime(ctx);

  const inCheck = kingInCheck(ctx.board, side);
  if (inCheck && ctx.opts.checkExtension) depth++;
  if (depth <= 0) return quiescence(ctx, alpha, beta, side, ply);

  const alphaOrig = alpha;
  const key = ctx.hash ^ (side === RED ? 0n : Z_TURN);
  let ttMove = 0;
  if (ctx.opts.useTT) {
    const entry = ctx.tt.get(key);
    if (entry) {
      ttMove = entry.move;
      if (entry.depth >= depth) {
        if (entry.flag === TT_EXACT) return entry.score;
        if (entry.flag === TT_LOWER && entry.score >= beta) return entry.score;
        if (entry.flag === TT_UPPER && entry.score <= alpha) return entry.score;
      }
    }
  }

  if (ctx.opts.useNullMove && canNull && !inCheck && depth >= 3) {
    const score = -search(ctx, depth - 3, -beta, -beta + 1, -side, ply + 1, false);
    if (score >= beta) return beta;
  }

  const moves = generateMoves(ctx.board, side, false);
  orderMoves(ctx, moves, ttMove, ply);

  let best = -INF;
  let bestMove = 0;
  let legal = 0;

  for (const move of moves) {
    const captured = doMove(ctx, move);
    if (kingInCheck(ctx.board, side)) {
      undoMove(ctx, move, captured);
      continue;
    }
    legal++;
    let score: number;
    if (legal === 1) {
      score = -search(ctx, depth - 1, -beta, -alpha, -side, ply + 1, true);
    } else {
      score = -search(ctx, depth - 1, -alpha - 1, -alpha, -side, ply + 1, true);
      if (score > alpha && score < beta) {
        score = -search(ctx, depth - 1, -beta, -alpha, -side, ply + 1, true);
      }
    }
    undoMove(ctx, move, captured);

    if (score > best) {
      best = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (captured === 0 && ctx.opts.useKillers) {
        if (ctx.killers[ply * 2] !== move) {
          ctx.killers[ply * 2 + 1] = ctx.killers[ply * 2];
          ctx.killers[ply * 2] = move;
        }
      }
      if (captured === 0 && ctx.opts.useHistory) {
        ctx.history[(move >> 8) * 90 + (move & 0xff)] += depth * depth;
      }
      break;
    }
  }

  if (legal === 0) return -MATE + ply;

  if (ctx.opts.useTT && bestMove !== 0) {
    let flag = TT_EXACT;
    if (best <= alphaOrig) flag = TT_UPPER;
    else if (best >= beta) flag = TT_LOWER;
    ctx.tt.set(key, { key, depth, score: best, flag, move: bestMove });
  }

  return best;
}

function rootSearch(
  ctx: Ctx,
  side: number,
  depth: number,
): { bestMove: number; bestScore: number; scored: RootMove[] } {
  const moves = generateMoves(ctx.board, side, false);
  const legalMoves: number[] = [];
  for (const move of moves) {
    const captured = doMove(ctx, move);
    if (!kingInCheck(ctx.board, side)) legalMoves.push(move);
    undoMove(ctx, move, captured);
  }
  orderMoves(ctx, legalMoves, 0, 0);

  const scored: RootMove[] = [];
  let bestScore = -INF;
  let bestMove = legalMoves[0] ?? 0;
  let alpha = -INF;
  const beta = INF;

  for (let i = 0; i < legalMoves.length; i++) {
    const move = legalMoves[i];
    const captured = doMove(ctx, move);
    let score: number;
    if (i === 0) {
      score = -search(ctx, depth - 1, -beta, -alpha, -side, 1, true);
    } else {
      score = -search(ctx, depth - 1, -alpha - 1, -alpha, -side, 1, true);
      if (score > alpha) {
        score = -search(ctx, depth - 1, -beta, -alpha, -side, 1, true);
      }
    }
    undoMove(ctx, move, captured);

    scored.push({ move, score });
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      if (score > alpha) alpha = score;
    }
  }
  return { bestMove, bestScore, scored };
}

function weightedPick(candidates: RootMove[], bestScore: number, range: number): number {
  if (candidates.length === 1) return candidates[0].move;
  const scale = Math.max(range / 2, 1);
  let total = 0;
  const weights = candidates.map((c) => {
    const w = Math.exp((c.score - bestScore) / scale);
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].move;
  }
  return candidates[candidates.length - 1].move;
}

export function think(
  boardInput: Int8Array,
  side: number,
  level: Level,
  historyKeys: string[] = [],
  timeLimitOverride?: number,
): SearchResult {
  const opts = LEVEL_OPTIONS[level];
  const timeLimit = timeLimitOverride ?? opts.timeLimit;
  const board = Int8Array.from(boardInput);
  const start = performance.now();
  const ctx: Ctx = {
    board,
    hash: computeZobrist(board, true),
    tt,
    nodes: 0,
    deadline: start + timeLimit * 0.9,
    stopped: false,
    killers: new Int32Array(MAX_PLY * 2),
    history: new Int32Array(90 * 90),
    opts,
  };

  if (opts.useTT) tt.clear();

  let bestMove = 0;
  let bestScore = 0;
  let bestDepth = 0;
  let lastScored: RootMove[] = [];

  for (let depth = 1; depth <= opts.maxDepth; depth++) {
    try {
      const result = rootSearch(ctx, side, depth);
      bestMove = result.bestMove;
      bestScore = result.bestScore;
      bestDepth = depth;
      lastScored = result.scored;
      if (Math.abs(bestScore) > MATE - 100) break;
    } catch (e) {
      if (e === TIMEOUT) break;
      throw e;
    }
    if (performance.now() - start > timeLimit * 0.9) break;
  }

  // Discourage repeating positions already seen this game (avoids endless shuffling
  // and perpetual check loops, which would be adjudicated as a loss).
  if (historyKeys.length > 0 && lastScored.length > 1) {
    const seen = new Set(historyKeys);
    for (const rm of lastScored) {
      const captured = doMove(ctx, rm.move);
      const key = (ctx.hash ^ (side === RED ? 0n : Z_TURN)).toString(16);
      undoMove(ctx, rm.move, captured);
      if (seen.has(key)) rm.score -= 150;
    }
    let best = -INF;
    for (const rm of lastScored) {
      if (rm.score > best) {
        best = rm.score;
        bestMove = rm.move;
      }
    }
    bestScore = best;
  }

  if (opts.blunder > 0 && lastScored.length > 1) {
    const candidates = lastScored.filter((m) => m.score >= bestScore - opts.blunder);
    bestMove = weightedPick(candidates, bestScore, opts.blunder);
  }

  return {
    move: bestMove,
    score: bestScore,
    depth: bestDepth,
    nodes: ctx.nodes,
    time: Math.round(performance.now() - start),
  };
}
