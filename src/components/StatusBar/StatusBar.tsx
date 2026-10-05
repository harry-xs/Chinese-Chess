import { useGameStore } from '../../game/store';
import styles from './StatusBar.module.css';

const LEVEL_LABELS: Record<string, string> = {
  intermediate: '中级',
  advanced: '高级',
  master: '大师',
  grandmaster: '宗师',
  sage: '棋圣',
};

export function StatusBar() {
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const inCheck = useGameStore((s) => s.inCheck);
  const turn = useGameStore((s) => s.position.turn);
  const playerColor = useGameStore((s) => s.playerColor);
  const statusMessage = useGameStore((s) => s.statusMessage);

  let text = '';
  let variant = '';

  if (statusMessage) {
    text = statusMessage;
  } else if (result) {
    text = result.winner ? `${result.winner === 'red' ? '红方胜' : '黑方胜'}` : '和棋';
  } else if (status === 'thinking') {
    text = '思考中';
    variant = styles.thinking;
  } else if (inCheck) {
    text = '将军';
    variant = styles.check;
  } else if (turn === playerColor) {
    text = '轮到你走';
  } else {
    text = '思考中';
    variant = styles.thinking;
  }

  return (
    <div className={styles.bar} aria-live="polite">
      {variant === styles.thinking && !statusMessage && !result && (
        <span className={styles.dot} />
      )}
      <span key={text} className={`${styles.text} ${variant}`}>
        {text}
      </span>
    </div>
  );
}

export { LEVEL_LABELS };
