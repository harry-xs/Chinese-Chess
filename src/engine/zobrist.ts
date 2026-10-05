function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0x9e3779b9);

function random64(): bigint {
  const hi = Math.floor(rng() * 0x100000000) >>> 0;
  const lo = Math.floor(rng() * 0x100000000) >>> 0;
  return (BigInt(hi) << 32n) | BigInt(lo);
}

// index 0..14 maps piece -7..7 (piece + 7)
const Z_PIECE: bigint[][] = [];
for (let p = 0; p < 15; p++) {
  const row: bigint[] = new Array(90);
  for (let i = 0; i < 90; i++) row[i] = random64();
  Z_PIECE.push(row);
}

export const Z_TURN = random64();

export function zobristPiece(piece: number, sq: number): bigint {
  return Z_PIECE[piece + 7][sq];
}

export function computeZobrist(board: Int8Array, redToMove: boolean): bigint {
  let h = 0n;
  for (let i = 0; i < 90; i++) {
    const p = board[i];
    if (p !== 0) h ^= Z_PIECE[p + 7][i];
  }
  if (!redToMove) h ^= Z_TURN;
  return h;
}
