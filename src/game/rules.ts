import { RED, initialBoard } from '../engine/constants';
import { computeZobrist } from '../engine/zobrist';
import { hasAnyLegalMove, kingInCheck, makeMove } from '../engine/board';
import type { Color, GameResult, Move, Position } from '../engine/types';

export const sideOfColor = (c: Color): number => (c === 'red' ? 1 : -1);
export const colorOfSide = (s: number): Color => (s === RED ? 'red' : 'black');
export const opposite = (c: Color): Color => (c === 'red' ? 'black' : 'red');

export function initialPosition(turn: Color = 'red'): Position {
  const board = initialBoard();
  return {
    board,
    turn,
    zobrist: computeZobrist(board, turn === 'red'),
    halfMoveClock: 0,
  };
}

export function positionKey(pos: Position): string {
  return pos.zobrist.toString(16);
}

export interface AppliedMove {
  next: Position;
  move: Move;
}

export function applyMove(pos: Position, encoded: number): AppliedMove {
  const from = encoded >> 8;
  const to = encoded & 0xff;
  const board = Int8Array.from(pos.board);
  const piece = board[from];
  const captured = board[to];
  board[to] = piece;
  board[from] = 0;
  const turn = opposite(pos.turn);
  const next: Position = {
    board,
    turn,
    zobrist: computeZobrist(board, turn === 'red'),
    halfMoveClock: captured !== 0 ? 0 : pos.halfMoveClock + 1,
  };
  return { next, move: { from, to, piece, captured } };
}

/**
 * Checkmate / stalemate only. Draws are never adjudicated automatically: the
 * game ends as a draw only when a player asks for one, or through the
 * perpetual-check rule below.
 */
export function checkGameOver(pos: Position): GameResult | null {
  const side = sideOfColor(pos.turn);
  if (!hasAnyLegalMove(pos.board, side)) {
    if (kingInCheck(pos.board, side)) {
      return { winner: opposite(pos.turn), reason: 'checkmate' };
    }
    return { winner: opposite(pos.turn), reason: 'stalemate' };
  }
  return null;
}

/** For every move, whether it delivered check to the opponent. */
export function computeChecks(moveList: Move[]): boolean[] {
  const board = initialBoard();
  const checks: boolean[] = [];
  for (const mv of moveList) {
    makeMove(board, (mv.from << 8) | mv.to);
    const mover = mv.piece > 0 ? 'red' : 'black';
    checks.push(kingInCheck(board, sideOfColor(opposite(mover))));
  }
  return checks;
}

/**
 * 长将判负 (perpetual check loses).
 *
 * Official Chinese-chess rules forbid a player from repeatedly delivering check
 * so that the position repeats. When the current position has occurred three
 * times, we inspect the cycle that produced it: if exactly one side checked on
 * every one of its moves during that cycle, that side is the perpetual checker
 * and is judged to lose. Any other repetition (双方长兑、长拦等) is not
 * adjudicated here — it simply continues until a player claims a draw.
 */
export function adjudicateRepetition(
  positionKeys: string[],
  checks: boolean[],
): GameResult | null {
  const n = checks.length; // number of moves played
  if (positionKeys.length !== n + 1) return null;
  const current = positionKeys[n];

  let prev = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (positionKeys[i] === current) {
      prev = i;
      break;
    }
  }
  if (prev < 0) return null;

  let occurrences = 0;
  for (const k of positionKeys) if (k === current) occurrences++;
  if (occurrences < 3) return null;

  let redMoves = 0;
  let blackMoves = 0;
  let redAllCheck = true;
  let blackAllCheck = true;
  for (let i = prev; i < n; i++) {
    const isRed = i % 2 === 0; // red always moves first
    if (isRed) {
      redMoves++;
      if (!checks[i]) redAllCheck = false;
    } else {
      blackMoves++;
      if (!checks[i]) blackAllCheck = false;
    }
  }

  const redPerpetual = redMoves > 0 && redAllCheck;
  const blackPerpetual = blackMoves > 0 && blackAllCheck;

  if (redPerpetual && !blackPerpetual) {
    return { winner: 'black', reason: 'perpetual-check' };
  }
  if (blackPerpetual && !redPerpetual) {
    return { winner: 'red', reason: 'perpetual-check' };
  }
  return null;
}
