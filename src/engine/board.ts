import {
  ADVISOR,
  CANNON,
  ELEPHANT,
  HORSE,
  KING,
  PAWN,
  RED,
  ROOK,
  colOf,
  idxOf,
  inBoard,
  inPalace,
  ownHalf,
  rowOf,
  sideOf,
} from './constants';

export const encodeMove = (from: number, to: number): number => (from << 8) | to;
export const fromOf = (move: number): number => move >> 8;
export const toOf = (move: number): number => move & 0xff;

const KING_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIAG_OFFSETS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const ELEPHANT_OFFSETS = [
  [-2, -2],
  [-2, 2],
  [2, -2],
  [2, 2],
];
const HORSE_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

export function findKing(board: Int8Array, side: number): number {
  const target = KING * side;
  for (let i = 0; i < 90; i++) if (board[i] === target) return i;
  return -1;
}

export function makeMove(board: Int8Array, move: number): number {
  const from = move >> 8;
  const to = move & 0xff;
  const captured = board[to];
  board[to] = board[from];
  board[from] = 0;
  return captured;
}

export function unmakeMove(board: Int8Array, move: number, captured: number): void {
  const from = move >> 8;
  const to = move & 0xff;
  board[from] = board[to];
  board[to] = captured;
}

function pushMove(
  out: number[],
  board: Int8Array,
  from: number,
  row: number,
  col: number,
  capturesOnly: boolean,
): void {
  if (!inBoard(row, col)) return;
  const to = idxOf(row, col);
  const target = board[to];
  if (target === 0) {
    if (!capturesOnly) out.push(encodeMove(from, to));
    return;
  }
  if (sideOf(target) !== sideOf(board[from])) out.push(encodeMove(from, to));
}

export function pseudoMovesFrom(
  board: Int8Array,
  from: number,
  capturesOnly = false,
  out: number[] = [],
): number[] {
  const piece = board[from];
  if (piece === 0) return out;
  const side = sideOf(piece);
  const row = rowOf(from);
  const col = colOf(from);
  const type = Math.abs(piece);

  switch (type) {
    case KING: {
      for (const [dr, dc] of KING_OFFSETS) {
        const nr = row + dr;
        const nc = col + dc;
        if (inPalace(nr, nc, side)) pushMove(out, board, from, nr, nc, capturesOnly);
      }
      // flying general capture
      for (const dr of [-1, 1]) {
        let nr = row + dr;
        const nc = col;
        while (nr >= 0 && nr <= 9) {
          const p = board[idxOf(nr, nc)];
          if (p !== 0) {
            if (p === KING * -side) out.push(encodeMove(from, idxOf(nr, nc)));
            break;
          }
          nr += dr;
        }
      }
      break;
    }
    case ADVISOR: {
      for (const [dr, dc] of DIAG_OFFSETS) {
        const nr = row + dr;
        const nc = col + dc;
        if (inPalace(nr, nc, side)) pushMove(out, board, from, nr, nc, capturesOnly);
      }
      break;
    }
    case ELEPHANT: {
      for (const [dr, dc] of ELEPHANT_OFFSETS) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBoard(nr, nc) || !ownHalf(nr, side)) continue;
        if (board[idxOf(row + dr / 2, col + dc / 2)] !== 0) continue;
        pushMove(out, board, from, nr, nc, capturesOnly);
      }
      break;
    }
    case HORSE: {
      for (const [dr, dc] of HORSE_OFFSETS) {
        const nr = row + dr;
        const nc = col + dc;
        if (!inBoard(nr, nc)) continue;
        const legRow = Math.abs(dr) === 2 ? row + dr / 2 : row;
        const legCol = Math.abs(dc) === 2 ? col + dc / 2 : col;
        if (board[idxOf(legRow, legCol)] !== 0) continue;
        pushMove(out, board, from, nr, nc, capturesOnly);
      }
      break;
    }
    case ROOK: {
      for (const [dr, dc] of KING_OFFSETS) {
        let nr = row + dr;
        let nc = col + dc;
        while (inBoard(nr, nc)) {
          const to = idxOf(nr, nc);
          const target = board[to];
          if (target === 0) {
            if (!capturesOnly) out.push(encodeMove(from, to));
          } else {
            if (sideOf(target) !== side) out.push(encodeMove(from, to));
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    case CANNON: {
      for (const [dr, dc] of KING_OFFSETS) {
        let nr = row + dr;
        let nc = col + dc;
        let jumped = false;
        while (inBoard(nr, nc)) {
          const to = idxOf(nr, nc);
          const target = board[to];
          if (!jumped) {
            if (target === 0) {
              if (!capturesOnly) out.push(encodeMove(from, to));
            } else {
              jumped = true;
            }
          } else if (target !== 0) {
            if (sideOf(target) !== side) out.push(encodeMove(from, to));
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }
    case PAWN: {
      const forward = side === RED ? -1 : 1;
      pushMove(out, board, from, row + forward, col, capturesOnly);
      const crossed = side === RED ? row <= 4 : row >= 5;
      if (crossed) {
        pushMove(out, board, from, row, col - 1, capturesOnly);
        pushMove(out, board, from, row, col + 1, capturesOnly);
      }
      break;
    }
  }
  return out;
}

export function generateMoves(
  board: Int8Array,
  side: number,
  capturesOnly = false,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < 90; i++) {
    const p = board[i];
    if (p !== 0 && sideOf(p) === side) pseudoMovesFrom(board, i, capturesOnly, out);
  }
  return out;
}

export function kingInCheck(board: Int8Array, side: number): boolean {
  const king = findKing(board, side);
  if (king < 0) return true;
  const kr = rowOf(king);
  const kc = colOf(king);
  const enemy = -side;

  // Orthogonal rays: rook / cannon / flying general
  for (const [dr, dc] of KING_OFFSETS) {
    let nr = kr + dr;
    let nc = kc + dc;
    let first = 0;
    while (inBoard(nr, nc)) {
      const p = board[idxOf(nr, nc)];
      if (p !== 0) {
        first = p;
        break;
      }
      nr += dr;
      nc += dc;
    }
    if (first === 0) continue;
    const firstType = Math.abs(first);
    if (sideOf(first) === enemy && firstType === ROOK) return true;
    if (sideOf(first) === enemy && firstType === KING && dc === 0) return true;
    // continue to second piece for cannon
    nr += dr;
    nc += dc;
    let second = 0;
    while (inBoard(nr, nc)) {
      const p = board[idxOf(nr, nc)];
      if (p !== 0) {
        second = p;
        break;
      }
      nr += dr;
      nc += dc;
    }
    if (sideOf(second) === enemy && Math.abs(second) === CANNON) return true;
  }

  // Horse
  for (const [dr, dc] of HORSE_OFFSETS) {
    const hr = kr + dr;
    const hc = kc + dc;
    if (!inBoard(hr, hc)) continue;
    const piece = board[idxOf(hr, hc)];
    if (sideOf(piece) !== enemy || Math.abs(piece) !== HORSE) continue;
    const legRow = Math.abs(dr) === 2 ? hr - dr / 2 : hr;
    const legCol = Math.abs(dc) === 2 ? hc - dc / 2 : hc;
    if (board[idxOf(legRow, legCol)] === 0) return true;
  }

  // Pawn
  if (side === RED) {
    if (kr - 1 >= 0 && board[idxOf(kr - 1, kc)] === -PAWN) return true;
    if (kr >= 5) {
      if (kc - 1 >= 0 && board[idxOf(kr, kc - 1)] === -PAWN) return true;
      if (kc + 1 <= 8 && board[idxOf(kr, kc + 1)] === -PAWN) return true;
    }
  } else {
    if (kr + 1 <= 9 && board[idxOf(kr + 1, kc)] === PAWN) return true;
    if (kr <= 4) {
      if (kc - 1 >= 0 && board[idxOf(kr, kc - 1)] === PAWN) return true;
      if (kc + 1 <= 8 && board[idxOf(kr, kc + 1)] === PAWN) return true;
    }
  }

  return false;
}

export function isLegal(board: Int8Array, move: number, side: number): boolean {
  const captured = makeMove(board, move);
  const ok = !kingInCheck(board, side);
  unmakeMove(board, move, captured);
  return ok;
}

export function legalMoves(board: Int8Array, side: number): number[] {
  const pseudo = generateMoves(board, side, false);
  const out: number[] = [];
  for (const move of pseudo) {
    if (isLegal(board, move, side)) out.push(move);
  }
  return out;
}

export function legalMovesFrom(board: Int8Array, from: number): number[] {
  const piece = board[from];
  if (piece === 0) return [];
  const side = sideOf(piece);
  const pseudo = pseudoMovesFrom(board, from, false);
  const out: number[] = [];
  for (const move of pseudo) {
    if (isLegal(board, move, side)) out.push(move);
  }
  return out;
}

export function hasAnyLegalMove(board: Int8Array, side: number): boolean {
  const pseudo = generateMoves(board, side, false);
  for (const move of pseudo) {
    if (isLegal(board, move, side)) return true;
  }
  return false;
}
