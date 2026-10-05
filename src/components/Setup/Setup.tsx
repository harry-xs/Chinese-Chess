import type { Color, Level } from '../../engine/types';
import { useGameStore } from '../../game/store';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { SegmentedControl } from '../ui/SegmentedControl';
import styles from './Setup.module.css';

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: 'intermediate', label: '中级', hint: '有攻防意识' },
  { value: 'advanced', label: '高级', hint: '计算深入，很少失误' },
  { value: 'master', label: '大师', hint: '全力应对' },
  { value: 'grandmaster', label: '宗师', hint: '深算如渊，步步紧逼' },
  { value: 'sage', label: '棋圣', hint: '穷极变化，寸土不让' },
];

export function Setup() {
  const playerColor = useGameStore((s) => s.playerColor);
  const level = useGameStore((s) => s.level);
  const hasSave = useGameStore((s) => s.hasSave);
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);
  const setLevel = useGameStore((s) => s.setLevel);
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>中国象棋</h1>
          <p className={styles.subtitle}>人机对战</p>
        </header>

        {hasSave && (
          <button type="button" className={styles.resume} onClick={() => startGame(true)}>
            <span>继续上局</span>
            <Icon name="chevron-left" size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        <section className={styles.section}>
          <span className={styles.label}>执子</span>
          <SegmentedControl<Color>
            ariaLabel="选择执子"
            value={playerColor}
            onChange={setPlayerColor}
            options={[
              {
                value: 'red',
                label: '执红',
                adornment: <span className={`${styles.disc} ${styles.red}`}>帥</span>,
              },
              {
                value: 'black',
                label: '执黑',
                adornment: <span className={`${styles.disc} ${styles.black}`}>將</span>,
              },
            ]}
          />
        </section>

        <section className={styles.section}>
          <span className={styles.label}>难度</span>
          <div className={styles.levels} role="radiogroup" aria-label="选择难度">
            {LEVELS.map((item) => {
              const active = item.value === level;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${styles.level} ${active ? styles.levelActive : ''}`}
                  onClick={() => setLevel(item.value)}
                >
                  <span className={styles.levelBar} />
                  <span className={styles.levelText}>
                    <span className={styles.levelName}>{item.label}</span>
                    <span className={styles.levelHint}>{item.hint}</span>
                  </span>
                  {active && <Icon name="check" size={20} className={styles.levelCheck} />}
                </button>
              );
            })}
          </div>
        </section>

        <div className={styles.footer}>
          <Button variant="primary" fullWidth onClick={() => startGame(false)}>
            开始对局
          </Button>
        </div>
      </div>
    </div>
  );
}
