import { ADVISOR, CANNON, ELEPHANT, HORSE, KING, PAWN, RED, ROOK, colOf, sideOf } from './constants';
import { fromOf, toOf } from './board';

const RED_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const BLACK_DIGITS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const PIECE_NAME: Record<number, { red: string; black: string }> = {
  [KING]: { red: '帅', black: '将' },
  [ADVISOR]: { red: '仕', black: '士' },
  [ELEPHANT]: { red: '相', black: '象' },
  [ROOK]: { red: '车', black: '车' },
  [HORSE]: { red: '马', black: '马' },
  [CANNON]: { red: '炮', black: '炮' },
  [PAWN]: { red: '兵', black: '卒' },
};

function digit(side: number, n: number): string {
  const table = side === RED ? RED_DIGITS : BLACK_DIGITS;
  if (n < 1) n = 1;
  if (n > 9) n = 9;
  return table[n];
}

function fileLabel(side: number, col: number): string {
  return digit(side, side === RED ? 9 - col : col + 1);
}

function pieceName(piece: number): string {
  const type = Math.abs(piece);
  return sideOf(piece) === RED ? PIECE_NAME[type].red : PIECE_NAME[type].black;
}

function startLabel(
  board: Int8Array,
  move: number,
  side: number,
): { prefix: boolean; label: string } {
  const from = fromOf(move);
  const piece = board[from];
  const col = colOf(from);

  const files: number[] = [];
  for (let i = 0; i < 90; i++) {
    if (board[i] === piece && colOf(i) === col) files.push(i);
  }

  if (files.length <= 1) return { prefix: false, label: fileLabel(side, col) };

  files.sort((a, b) => (side === RED ? a - b : b - a));
  const pos = files.indexOf(from);
  if (files.length === 2) return { prefix: true, label: pos === 0 ? '前' : '后' };
  if (files.length === 3) {
    return { prefix: true, label: pos === 0 ? '前' : pos === 1 ? '中' : '后' };
  }
  return { prefix: true, label: digit(side, pos + 1) };
}

export function moveToNotation(board: Int8Array, move: number): string {
  const from = fromOf(move);
  const to = toOf(move);
  const piece = board[from];
  if (piece === 0) return '';
  const side = sideOf(piece);
  const type = Math.abs(piece);
  const fromRow = (from / 9) | 0;
  const toRow = (to / 9) | 0;
  const toCol = to % 9;

  const start = startLabel(board, move, side);
  const name = pieceName(piece);
  const head = start.prefix ? `${start.label}${name}` : `${name}${start.label}`;

  if (fromRow === toRow) {
    return `${head}平${fileLabel(side, toCol)}`;
  }

  const forward = side === RED ? toRow < fromRow : toRow > fromRow;
  const action = forward ? '进' : '退';

  const ranks = Math.abs(toRow - fromRow);
  const useRank = type === ROOK || type === CANNON || type === PAWN || type === KING;
  const target = useRank ? digit(side, ranks) : fileLabel(side, toCol);
  return `${head}${action}${target}`;
}
