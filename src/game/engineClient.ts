import type { Color, Level } from '../engine/types';

export interface EngineMoveResult {
  move: number;
  score: number;
  depth: number;
  nodes: number;
  time: number;
  hint: boolean;
  budget: number;
}

let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, (r: EngineMoveResult) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        requestId: number;
        move?: number;
        score?: number;
        depth?: number;
        nodes?: number;
        time?: number;
        hint?: boolean;
        budget?: number;
      };
      if (data.type === 'bestmove') {
        const resolve = pending.get(data.requestId);
        if (resolve) {
          pending.delete(data.requestId);
          resolve({
            move: data.move ?? 0,
            score: data.score ?? 0,
            depth: data.depth ?? 0,
            nodes: data.nodes ?? 0,
            time: data.time ?? 0,
            hint: data.hint ?? false,
            budget: data.budget ?? 0,
          });
        }
      } else if (data.type === 'error') {
        const resolve = pending.get(data.requestId);
        if (resolve) {
          pending.delete(data.requestId);
          resolve({ move: 0, score: 0, depth: 0, nodes: 0, time: 0, hint: false, budget: 0 });
        }
      }
    };
  }
  return worker;
}

export function requestEngine(
  board: Int8Array,
  turn: Color,
  level: Level,
  history: string[],
  hint = false,
): Promise<EngineMoveResult> {
  const w = getWorker();
  const requestId = ++counter;
  return new Promise<EngineMoveResult>((resolve) => {
    pending.set(requestId, resolve);
    w.postMessage({ type: hint ? 'hint' : 'go', board, turn, level, history, requestId });
  });
}
