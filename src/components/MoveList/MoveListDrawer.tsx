import { useMemo } from 'react';
import { makeMove } from '../../engine/board';
import { initialBoard } from '../../engine/constants';
import { moveToNotation } from '../../engine/notation';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useGameStore } from '../../game/store';
import { Sheet } from '../ui/Sheet';
import styles from './MoveListDrawer.module.css';

interface MoveListDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface Round {
  index: number;
  red: string;
  black: string;
}

export function MoveListDrawer({ open, onClose }: MoveListDrawerProps) {
  const moveList = useGameStore((s) => s.moveList);
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const rounds = useMemo(() => {
    const board = initialBoard();
    const notations: string[] = [];
    for (const mv of moveList) {
      notations.push(moveToNotation(board, (mv.from << 8) | mv.to));
      makeMove(board, (mv.from << 8) | mv.to);
    }
    const result: Round[] = [];
    for (let i = 0; i < notations.length; i += 2) {
      result.push({
        index: i / 2 + 1,
        red: notations[i] ?? '',
        black: notations[i + 1] ?? '',
      });
    }
    return result;
  }, [moveList]);

  const latest = rounds.length - 1;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant={isDesktop ? 'right' : 'bottom'}
      showClose
      label="走子记录"
    >
      <div className={styles.root}>
        <h2 className={styles.title}>走子记录</h2>
        {rounds.length === 0 ? (
          <p className={styles.empty}>暂无记录</p>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.row} ${styles.head}`}>
              <span className={styles.cellIndex}>回合</span>
              <span className={styles.cell}>红方</span>
              <span className={styles.cell}>黑方</span>
            </div>
            <div className={styles.scroll}>
              {rounds.map((r) => (
                <div
                  key={r.index}
                  className={`${styles.row} ${r.index - 1 === latest ? styles.current : ''}`}
                  ref={
                    r.index - 1 === latest
                      ? (el) => el?.scrollIntoView({ block: 'nearest' })
                      : undefined
                  }
                >
                  <span className={styles.cellIndex}>{r.index}</span>
                  <span className={styles.cell}>{r.red}</span>
                  <span className={styles.cell}>{r.black}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
