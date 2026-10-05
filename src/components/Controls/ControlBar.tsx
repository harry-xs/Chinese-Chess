import { useGameStore } from '../../game/store';
import { Icon } from '../ui/Icon';
import styles from './ControlBar.module.css';

interface ControlBarProps {
  onOpenMoves: () => void;
}

export function ControlBar({ onOpenMoves }: ControlBarProps) {
  const thinking = useGameStore((s) => s.thinking);
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const history = useGameStore((s) => s.history);
  const turn = useGameStore((s) => s.position.turn);
  const playerColor = useGameStore((s) => s.playerColor);
  const undo = useGameStore((s) => s.undo);
  const requestHint = useGameStore((s) => s.requestHint);

  const playing = status === 'playing' && !result;
  const undoEnabled = playing && !thinking && history.length > 0;
  const hintEnabled = playing && !thinking && turn === playerColor;

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.button}
        disabled={!undoEnabled}
        onClick={undo}
      >
        <Icon name="undo" size={20} />
        <span>悔棋</span>
      </button>
      <button
        type="button"
        className={styles.button}
        disabled={!hintEnabled}
        onClick={requestHint}
      >
        <Icon name="hint" size={20} />
        <span>提示</span>
      </button>
      <button type="button" className={styles.button} onClick={onOpenMoves}>
        <Icon name="list" size={20} />
        <span>记录</span>
      </button>
    </div>
  );
}
