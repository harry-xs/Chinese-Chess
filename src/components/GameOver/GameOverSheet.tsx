import { useGameStore } from '../../game/store';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import styles from './GameOverSheet.module.css';

interface GameOverSheetProps {
  open: boolean;
  onRematch: () => void;
  onViewMoves: () => void;
  onBackToSetup: () => void;
}

export function GameOverSheet({
  open,
  onRematch,
  onViewMoves,
  onBackToSetup,
}: GameOverSheetProps) {
  const result = useGameStore((s) => s.result);
  const moveList = useGameStore((s) => s.moveList);
  const playerColor = useGameStore((s) => s.playerColor);

  const title = !result
    ? ''
    : result.winner
      ? result.winner === 'red'
        ? '红方胜'
        : '黑方胜'
      : '和棋';

  const outcome =
    !result || !result.winner ? 'draw' : result.winner === playerColor ? 'win' : 'lose';

  const reasonLabel: Record<string, string> = {
    checkmate: '将死',
    stalemate: '困毙',
    resign: '认输',
    'perpetual-check': '长将判负',
    agreement: '双方和棋',
  };
  const caption = result ? reasonLabel[result.reason] ?? '' : '';

  const rounds = Math.ceil(moveList.length / 2);

  return (
    <Sheet open={open} variant="bottom" label="对局结束">
      <div className={styles.body}>
        <div className={styles.rule} />
        <h2 className={`${styles.title} ${styles[outcome]}`}>{title}</h2>
        <p className={styles.caption}>{caption}</p>
        <p className={styles.rounds}>共 {rounds} 回合</p>
        <div className={styles.actions}>
          <Button variant="primary" fullWidth onClick={onRematch}>
            再来一局
          </Button>
          <Button variant="secondary" fullWidth onClick={onViewMoves}>
            查看棋谱
          </Button>
          <Button variant="ghost" fullWidth onClick={onBackToSetup}>
            返回设置
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
