import { think } from './search';
import { LEVEL_OPTIONS } from './search';
import type { Level } from './types';

interface GoRequest {
  type: 'go' | 'hint';
  board: Int8Array | number[];
  turn: 'red' | 'black';
  level?: Level;
  history?: string[];
  requestId: number;
}

self.onmessage = (event: MessageEvent) => {
  const data = event.data as GoRequest | { type: 'init' | 'stop' };

  if (data.type === 'init') {
    (self as unknown as Worker).postMessage({ type: 'ready' });
    return;
  }
  if (data.type === 'stop') return;

  if (data.type === 'go' || data.type === 'hint') {
    const board = data.board instanceof Int8Array ? data.board : Int8Array.from(data.board);
    const side = data.turn === 'red' ? 1 : -1;
    const level: Level = data.type === 'hint' ? 'intermediate' : (data.level ?? 'intermediate');
    const timeLimit = data.type === 'hint' ? 300 : LEVEL_OPTIONS[level].timeLimit;
    const started = performance.now();
    try {
      const result = think(board, side, level, data.history ?? [], timeLimit);
      const time = Math.max(Math.round(performance.now() - started), result.time);
      (self as unknown as Worker).postMessage({
        type: 'bestmove',
        move: result.move,
        score: result.score,
        depth: result.depth,
        nodes: result.nodes,
        time,
        requestId: data.requestId,
        hint: data.type === 'hint',
        budget: timeLimit,
      });
    } catch (err) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
        requestId: data.requestId,
      });
    }
  }
};

export {};
