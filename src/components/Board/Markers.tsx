import type { Move } from '../../engine/types';
import styles from './Markers.module.css';

interface MarkersProps {
  cell: number;
  pad: number;
  width: number;
  height: number;
  board: Int8Array;
  lastMove: Move | null;
  selectedSquare: number | null;
  legalTargets: number[];
  hint: { from: number; to: number } | null;
  checkSquare: number | null;
}

export function Markers({
  cell,
  pad,
  width,
  height,
  board,
  lastMove,
  selectedSquare,
  legalTargets,
  hint,
  checkSquare,
}: MarkersProps) {
  const px = (col: number) => pad + col * cell;
  const py = (row: number) => pad + row * cell;
  const point = (sq: number) => ({ x: px(sq % 9), y: py((sq / 9) | 0) });
  const half = 0.43 * cell;

  const sqRect = (sq: number, cls: string) => {
    const { x, y } = point(sq);
    return (
      <rect
        key={`${cls}-${sq}`}
        className={cls}
        x={x - half}
        y={y - half}
        width={half * 2}
        height={half * 2}
        rx={6}
      />
    );
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {lastMove && sqRect(lastMove.from, styles.lastFrom)}
      {lastMove && sqRect(lastMove.to, styles.lastTo)}

      {checkSquare !== null && (
        <g
          style={{
            transformOrigin: `${point(checkSquare).x}px ${point(checkSquare).y}px`,
          }}
        >
          <circle
            className={styles.check}
            cx={point(checkSquare).x}
            cy={point(checkSquare).y}
            r={0.55 * cell}
          />
        </g>
      )}

      {hint && (
        <g className={styles.hint}>
          <line
            x1={point(hint.from).x}
            y1={point(hint.from).y}
            x2={point(hint.to).x}
            y2={point(hint.to).y}
            className={styles.hintLine}
            strokeWidth={0.14 * cell}
          />
          <circle
            cx={point(hint.from).x}
            cy={point(hint.from).y}
            r={0.47 * cell}
            className={styles.hintFrom}
            strokeDasharray="4 4"
          />
          <circle
            cx={point(hint.to).x}
            cy={point(hint.to).y}
            r={0.2 * cell}
            className={styles.hintTo}
          />
        </g>
      )}

      {selectedSquare !== null && (
        <circle
          className={styles.selection}
          cx={point(selectedSquare).x}
          cy={point(selectedSquare).y}
          r={0.47 * cell}
          strokeWidth={2}
        />
      )}

      {legalTargets.map((sq) => {
        const { x, y } = point(sq);
        if (board[sq] !== 0) {
          return (
            <circle
              key={`cap-${sq}`}
              className={styles.capture}
              cx={x}
              cy={y}
              r={0.47 * cell}
              strokeWidth={2.5}
            />
          );
        }
        return <circle key={`dot-${sq}`} className={styles.dot} cx={x} cy={y} r={0.11 * cell} />;
      })}
    </svg>
  );
}
