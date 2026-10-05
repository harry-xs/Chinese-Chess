import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  variant?: 'bottom' | 'center' | 'right';
  showClose?: boolean;
  label?: string;
}

export function Sheet({
  open,
  onClose,
  children,
  variant = 'bottom',
  showClose = false,
  label,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`${styles.overlay} ${styles[variant]}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={label}>
        {showClose && onClose && (
          <button type="button" className={styles.close} onClick={onClose} aria-label="关闭">
            <Icon name="close" size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
