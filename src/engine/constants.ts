import type { PieceType } from './types';

export const KING = 1;
export const ADVISOR = 2;
export const ELEPHANT = 3;
export const ROOK = 4;
export const HORSE = 5;
export const CANNON = 6;
export const PAWN = 7;

export const RED = 1;
export const BLACK = -1;

export const PIECE_VALUES: Record<PieceType, number> = {
  1: 10000,
  2: 200,
  3: 200,
  4: 900,
  5: 400,
  6: 450,
  7: 100,
};

export const PIECE_CHAR: Record<string, string> = {
  '1': '帥',
  '-1': '將',
  '2': '仕',
  '-2': '士',
  '3': '相',
  '-3': '象',
  '4': '俥',
  '-4': '車',
  '5': '傌',
  '-5': '馬',
  '6': '炮',
  '-6': '砲',
  '7': '兵',
  '-7': '卒',
};

export const INITIAL_BOARD: readonly number[] = [
  -4, -5, -3, -2, -1, -2, -3, -5, -4,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, -6, 0, 0, 0, 0, 0, -6, 0,
  -7, 0, -7, 0, -7, 0, -7, 0, -7,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  7, 0, 7, 0, 7, 0, 7, 0, 7,
  0, 6, 0, 0, 0, 0, 0, 6, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  4, 5, 3, 2, 1, 2, 3, 5, 4,
];

export function initialBoard(): Int8Array {
  return Int8Array.from(INITIAL_BOARD);
}

export const rowOf = (idx: number): number => (idx / 9) | 0;
export const colOf = (idx: number): number => idx % 9;
export const idxOf = (row: number, col: number): number => row * 9 + col;

export const isRed = (piece: number): boolean => piece > 0;
export const isBlack = (piece: number): boolean => piece < 0;
export const sideOf = (piece: number): number => (piece > 0 ? 1 : piece < 0 ? -1 : 0);

export const inBoard = (row: number, col: number): boolean =>
  row >= 0 && row <= 9 && col >= 0 && col <= 8;

export const RED_PALACE_MIN_ROW = 7;
export const RED_PALACE_MAX_ROW = 9;
export const BLACK_PALACE_MIN_ROW = 0;
export const BLACK_PALACE_MAX_ROW = 2;
export const PALACE_MIN_COL = 3;
export const PALACE_MAX_COL = 5;

export const inPalace = (row: number, col: number, side: number): boolean => {
  if (col < PALACE_MIN_COL || col > PALACE_MAX_COL) return false;
  if (side === RED) return row >= RED_PALACE_MIN_ROW && row <= RED_PALACE_MAX_ROW;
  return row >= BLACK_PALACE_MIN_ROW && row <= BLACK_PALACE_MAX_ROW;
};

export const ownHalf = (row: number, side: number): boolean =>
  side === RED ? row >= 5 : row <= 4;
