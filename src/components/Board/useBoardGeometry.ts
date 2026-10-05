import { useEffect, useRef, useState } from 'react';

export interface BoardGeometry {
  ref: React.RefObject<HTMLDivElement>;
  cell: number;
  pad: number;
  width: number;
  height: number;
  ready: boolean;
}

const COLS = 9;
const ROWS = 10;

export function useBoardGeometry(): BoardGeometry {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const cell = Math.max(0, Math.min(size.w / (COLS + 1.1), size.h / (ROWS + 1.1)));
  const pad = 0.55 * cell;
  return {
    ref,
    cell,
    pad,
    width: (COLS + 0.1) * cell,
    height: (ROWS + 0.1) * cell,
    ready: cell > 0,
  };
}

export { COLS, ROWS };
