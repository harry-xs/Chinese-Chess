export type Color = 'red' | 'black';

export type Side = 1 | -1;

export type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Move {
  from: number;
  to: number;
  piece: number;
  captured: number;
}

export interface Position {
  board: Int8Array;
  turn: Color;
  zobrist: bigint;
  halfMoveClock: number;
}

export type Level =
  | 'intermediate'
  | 'advanced'
  | 'master'
  | 'grandmaster'
  | 'sage';

export interface Snapshot {
  board: Int8Array;
  turn: Color;
  zobrist: bigint;
  halfMoveClock: number;
  positionKeys: string[];
  lastMove: Move | null;
}

export type GameStatus = 'idle' | 'playing' | 'thinking' | 'over';

export interface GameResult {
  winner: Color | null;
  reason: 'checkmate' | 'stalemate' | 'resign' | 'perpetual-check' | 'agreement';
}
