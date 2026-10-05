interface BoardGridProps {
  cell: number;
  pad: number;
  width: number;
  height: number;
}

const CANNON_POINTS: [number, number][] = [
  [1, 2],
  [7, 2],
  [1, 7],
  [7, 7],
];
const PAWN_POINTS: [number, number][] = [
  [0, 3],
  [2, 3],
  [4, 3],
  [6, 3],
  [8, 3],
  [0, 6],
  [2, 6],
  [4, 6],
  [6, 6],
  [8, 6],
];

export function BoardGrid({ cell, pad, width, height }: BoardGridProps) {
  const x = (col: number) => pad + col * cell;
  const y = (row: number) => pad + row * cell;
  const d = 0.1 * cell;
  const l = 0.16 * cell;

  const starMarks: React.ReactNode[] = [];
  for (const [col, row] of [...CANNON_POINTS, ...PAWN_POINTS]) {
    const cx = x(col);
    const cy = y(row);
    for (const dx of [-1, 1]) {
      for (const dy of [-1, 1]) {
        if ((dx < 0 && col === 0) || (dx > 0 && col === 8)) continue;
        if ((dy < 0 && row === 0) || (dy > 0 && row === 9)) continue;
        starMarks.push(
          <path
            key={`${col}-${row}-${dx}-${dy}`}
            d={`M ${cx + dx * d} ${cy + dy * (d + l)} L ${cx + dx * d} ${cy + dy * d} L ${
              cx + dx * (d + l)
            } ${cy + dy * d}`}
            stroke="var(--board-line)"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />,
        );
      }
    }
  }

  return (
    <svg
      className="board-grid"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      <rect
        x={pad}
        y={pad}
        width={8 * cell}
        height={9 * cell}
        fill="none"
        stroke="var(--board-line-strong)"
        strokeWidth={1.5}
      />

      {Array.from({ length: 10 }, (_, r) => (
        <line
          key={`h${r}`}
          x1={x(0)}
          y1={y(r)}
          x2={x(8)}
          y2={y(r)}
          stroke={r === 0 || r === 9 ? 'var(--board-line-strong)' : 'var(--board-line)'}
          strokeWidth={r === 0 || r === 9 ? 1.5 : 1}
        />
      ))}

      {Array.from({ length: 9 }, (_, c) => {
        if (c === 0 || c === 8) {
          return (
            <line
              key={`v${c}`}
              x1={x(c)}
              y1={y(0)}
              x2={x(c)}
              y2={y(9)}
              stroke="var(--board-line-strong)"
              strokeWidth={1.5}
            />
          );
        }
        return (
          <g key={`v${c}`}>
            <line x1={x(c)} y1={y(0)} x2={x(c)} y2={y(4)} stroke="var(--board-line)" strokeWidth={1} />
            <line x1={x(c)} y1={y(5)} x2={x(c)} y2={y(9)} stroke="var(--board-line)" strokeWidth={1} />
          </g>
        );
      })}

      <path
        d={`M ${x(3)} ${y(0)} L ${x(5)} ${y(2)} M ${x(5)} ${y(0)} L ${x(3)} ${y(2)}`}
        stroke="var(--board-line)"
        strokeWidth={1}
        fill="none"
      />
      <path
        d={`M ${x(3)} ${y(7)} L ${x(5)} ${y(9)} M ${x(5)} ${y(7)} L ${x(3)} ${y(9)}`}
        stroke="var(--board-line)"
        strokeWidth={1}
        fill="none"
      />

      {starMarks}

      <text
        x={x(2)}
        y={y(4.5)}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--board-river-text)"
        fontFamily="var(--font-piece)"
        fontSize={0.42 * cell}
        letterSpacing="0.3em"
      >
        楚 河
      </text>
      <text
        x={x(6)}
        y={y(4.5)}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--board-river-text)"
        fontFamily="var(--font-piece)"
        fontSize={0.42 * cell}
        letterSpacing="0.3em"
      >
        汉 界
      </text>
    </svg>
  );
}
