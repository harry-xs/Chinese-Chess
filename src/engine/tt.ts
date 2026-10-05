export const TT_EXACT = 0;
export const TT_LOWER = 1;
export const TT_UPPER = 2;

export interface TTEntry {
  key: bigint;
  depth: number;
  score: number;
  flag: number;
  move: number;
}

export class TranspositionTable {
  private map = new Map<bigint, TTEntry>();
  private limit: number;

  constructor(limit = 1 << 18) {
    this.limit = limit;
  }

  clear(): void {
    this.map.clear();
  }

  get(key: bigint): TTEntry | undefined {
    return this.map.get(key);
  }

  set(key: bigint, entry: TTEntry): void {
    if (this.map.size >= this.limit) this.map.clear();
    this.map.set(key, entry);
  }
}
