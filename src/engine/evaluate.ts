import {
  ADVISOR,
  CANNON,
  ELEPHANT,
  HORSE,
  KING,
  PIECE_VALUES,
  PAWN,
  ROOK,
  colOf,
  rowOf,
} from './constants';

type Tables = Record<number, Int16Array>;

function buildTables(): Tables {
  const tables: Tables = {} as Tables;
  for (let t = 1; t <= 7; t++) tables[t] = new Int16Array(90);

  const central = (col: number) => 4 - Math.abs(col - 4);

  for (let i = 0; i < 90; i++) {
    const row = rowOf(i);
    const col = colOf(i);

    tables[KING][i] = row === 9 ? 4 : 0;

    tables[ADVISOR][i] = 0;
    tables[ELEPHANT][i] = central(col);

    tables[ROOK][i] = (9 - row) + central(col) * 2;
    tables[HORSE][i] = (9 - row) + central(col) * 3 - (col === 0 || col === 8 ? 4 : 0);
    tables[CANNON][i] = central(col) * 3 + (9 - row);
    tables[PAWN][i] = row <= 4 ? (5 - row) * 15 + central(col) * 5 : 0;
  }
  return tables;
}

const PST = buildTables();

export function evaluate(board: Int8Array): number {
  let score = 0;
  for (let i = 0; i < 90; i++) {
    const piece = board[i];
    if (piece === 0) continue;
    const type = Math.abs(piece);
    const value = PIECE_VALUES[type as keyof typeof PIECE_VALUES];
    if (piece > 0) {
      score += value + PST[type][i];
    } else {
      score -= value + PST[type][89 - i];
    }
  }
  return score;
}

export function pieceValue(type: number): number {
  return PIECE_VALUES[type as keyof typeof PIECE_VALUES] ?? 0;
}
