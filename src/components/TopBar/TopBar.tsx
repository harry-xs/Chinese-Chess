import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/store';
import { Icon } from '../ui/Icon';
import { LEVEL_LABELS } from '../StatusBar/StatusBar';
import styles from './TopBar.module.css';

interface TopBarProps {
  onBack: () => void;
  onRestart: () => void;
  onResign: () => void;
  onDraw: () => void;
}

export function TopBar({ onBack, onRestart, onResign, onDraw }: TopBarProps) {
  const level = useGameStore((s) => s.level);
  const soundEnabled = useGameStore((s) => s.settings.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const playClick = useGameStore((s) => s.playClick);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  return (
    <div className={styles.topbar}>
      <button type="button" className={styles.iconButton} onClick={onBack} aria-label="返回">
        <Icon name="chevron-left" size={22} />
      </button>
      <span className={styles.title}>难度：{LEVEL_LABELS[level]}</span>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => {
            playClick();
            setMenuOpen((v) => !v);
          }}
          aria-label="更多"
          aria-expanded={menuOpen}
        >
          <Icon name="more" size={22} />
        </button>
        {menuOpen && (
          <div className={styles.menu} role="menu">
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                onRestart();
              }}
            >
              <Icon name="refresh" size={18} />
              <span>重新开始</span>
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                onDraw();
              }}
            >
              <Icon name="draw" size={18} />
              <span>和棋</span>
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                onResign();
              }}
            >
              <Icon name="flag" size={18} />
              <span>认输</span>
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => toggleSound()}
            >
              <Icon name={soundEnabled ? 'volume-on' : 'volume-off'} size={18} />
              <span>音效</span>
              <span className={`${styles.switch} ${soundEnabled ? styles.switchOn : ''}`}>
                <span className={styles.knob} />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
