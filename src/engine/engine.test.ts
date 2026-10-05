import { describe, expect, it } from 'vitest';
import {
  findKing,
  generateMoves,
  kingInCheck,
  legalMoves,
  makeMove,
  unmakeMove,
} from './board';
import { RED, BLACK, initialBoard } from './constants';
import { moveToNotation } from './notation';
import { think } from './search';
import { computeZobrist } from './zobrist';
import { adjudicateRepetition, checkGameOver } from '../game/rules';

const empty = () => new Int8Array(90);

describe('initial position', () => {
  it('has 32 pieces and correct kings', () => {
    const board = initialBoard();
    let count = 0;
    for (let i = 0; i < 90; i++) if (board[i] !== 0) count++;
    expect(count).toBe(32);
    expect(findKing(board, RED)).toBe(85);
    expect(findKing(board, BLACK)).toBe(4);
  });

  it('has legal moves for red', () => {
    const board = initialBoard();
    const moves = legalMoves(board, RED);
    expect(moves.length).toBeGreaterThan(30);
  });

  it('zobrist is stable and turn dependent', () => {
    const board = initialBoard();
    const a = computeZobrist(board, true);
    const b = computeZobrist(board, true);
    const c = computeZobrist(board, false);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('make/unmake', () => {
  it('restores the board', () => {
    const board = initialBoard();
    const before = Int8Array.from(board);
    const move = generateMoves(board, RED)[0];
    const captured = makeMove(board, move);
    unmakeMove(board, move, captured);
    expect(Array.from(board)).toEqual(Array.from(before));
  });
});

describe('flying general', () => {
  it('detects kings facing on an open file', () => {
    const board = empty();
    board[85] = 1; // red king (9,4)
    board[4] = -1; // black king (0,4)
    expect(kingInCheck(board, RED)).toBe(true);
    expect(kingInCheck(board, BLACK)).toBe(true);
  });

  it('blocked by a piece is not check', () => {
    const board = empty();
    board[85] = 1;
    board[4] = -1;
    board[40] = 7; // red pawn (4,4) between
    expect(kingInCheck(board, RED)).toBe(false);
  });
});

describe('horse leg', () => {
  it('blocks the horse when the leg is occupied', () => {
    const board = empty();
    board[85] = 1;
    board[4] = -1;
    const horseSq = 5 * 9 + 4; // (5,4)
    board[horseSq] = 5;
    const targets = generateMoves(board, RED).filter((m) => m >> 8 === horseSq);
    const clearCount = targets.length;
    board[5 * 9 + 3] = 7; // leg for moving up (4,4)
    const blocked = generateMoves(board, RED).filter(
      (m) => m >> 8 === horseSq && (m & 0xff) === 4 * 9 + 4,
    );
    expect(clearCount).toBeGreaterThan(0);
    expect(blocked.length).toBe(0);
  });
});

describe('notation', () => {
  it('renders cannon to center', () => {
    const board = initialBoard();
    const from = 7 * 9 + 7; // red cannon col 7
    const to = 7 * 9 + 4;
    expect(moveToNotation(board, (from << 8) | to)).toBe('炮二平五');
  });

  it('renders horse advancing', () => {
    const board = initialBoard();
    const from = 9 * 9 + 7; // red horse col 7
    const to = 7 * 9 + 6;
    expect(moveToNotation(board, (from << 8) | to)).toBe('马二进三');
  });

  it('renders black horse', () => {
    const board = initialBoard();
    const from = 0 * 9 + 7; // black horse col 7 (file 8)
    const to = 2 * 9 + 6;
    expect(moveToNotation(board, (from << 8) | to)).toBe('马8进7');
  });
});

describe('check detection', () => {
  it('rook gives check along a file', () => {
    const board = empty();
    board[85] = 1; // red king (9,4)
    board[4] = -1; // black king (0,4)
    board[4 * 9 + 4] = -4; // black rook (4,4) gives check to red
    expect(kingInCheck(board, RED)).toBe(true);
  });
});

describe('draw rules', () => {
  it('does not adjudicate before the third repetition', () => {
    const keys = ['A', 'B', 'A'];
    const checks = [false, false];
    expect(adjudicateRepetition(keys, checks)).toBeNull();
  });

  it('judges red as losing when red is the perpetual checker', () => {
    const keys = ['A', 'B', 'A', 'B', 'A'];
    const checks = [false, false, true, false];
    const result = adjudicateRepetition(keys, checks);
    expect(result).toEqual({ winner: 'black', reason: 'perpetual-check' });
  });

  it('judges black as losing when black is the perpetual checker', () => {
    const keys = ['A', 'B', 'A', 'B', 'A'];
    const checks = [false, false, false, true];
    const result = adjudicateRepetition(keys, checks);
    expect(result).toEqual({ winner: 'red', reason: 'perpetual-check' });
  });

  it('leaves non-checking repetition unresolved (manual draw only)', () => {
    const keys = ['A', 'B', 'A', 'B', 'A'];
    const checks = [false, false, false, false];
    expect(adjudicateRepetition(keys, checks)).toBeNull();
  });

  it('does not auto-draw dead positions', () => {
    const board = empty();
    board[85] = 1; // red king
    board[4] = -1; // black king
    const pos = {
      board,
      turn: 'red' as const,
      zobrist: 0n,
      halfMoveClock: 200,
    };
    expect(checkGameOver(pos)).toBeNull();
  });
});

describe('search', () => {
  it('returns a legal move for red from the initial position', () => {
    const board = initialBoard();
    const legal = legalMoves(board, RED);
    const result = think(board, RED, 'intermediate');
    expect(legal).toContain(result.move);
    expect(result.nodes).toBeGreaterThan(0);
  });

  it('plays a legal self-play game', () => {
    const board = initialBoard();
    let side = RED;
    for (let ply = 0; ply < 20; ply++) {
      const legal = legalMoves(board, side);
      if (legal.length === 0) break;
      const result = think(board, side, 'intermediate', []);
      expect(legal, `illegal move at ply ${ply}`).toContain(result.move);
      makeMove(board, result.move);
      side = -side;
    }
  });
});
