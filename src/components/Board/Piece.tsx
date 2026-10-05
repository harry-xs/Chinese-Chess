import { PIECE_CHAR } from '../../engine/constants';
import styles from './Piece.module.css';

interface PieceProps {
  piece: number;
  cell: number;
  centerX: number;
  centerY: number;
  scale?: number;
  dragging?: boolean;
  selected?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export function Piece({
  piece,
  cell,
  centerX,
  centerY,
  scale = 1,
  dragging = false,
  selected = false,
  onPointerDown,
}: PieceProps) {
  const size = 0.86 * cell;
  const transform = `translate3d(${centerX - size / 2}px, ${centerY - size / 2}px, 0) scale(${scale})`;
  const isRed = piece > 0;
  return (
    <div
      className={[
        styles.piece,
        isRed ? styles.red : styles.black,
        dragging ? styles.dragging : '',
        selected ? styles.selected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size, transform }}
      onPointerDown={onPointerDown}
    >
      <span className={styles.text} style={{ fontSize: 0.56 * cell }}>
        {PIECE_CHAR[String(piece)]}
      </span>
    </div>
  );
}
