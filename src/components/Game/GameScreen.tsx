import { useEffect, useState } from 'react';
import { useGameStore } from '../../game/store';
import { Board } from '../Board/Board';
import { ControlBar } from '../Controls/ControlBar';
import { GameOverSheet } from '../GameOver/GameOverSheet';
import { MoveListDrawer } from '../MoveList/MoveListDrawer';
import { StatusBar } from '../StatusBar/StatusBar';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TopBar } from '../TopBar/TopBar';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const result = useGameStore((s) => s.result);
  const returnToSetup = useGameStore((s) => s.returnToSetup);
  const restart = useGameStore((s) => s.restart);
  const resign = useGameStore((s) => s.resign);
  const offerDraw = useGameStore((s) => s.offerDraw);
  const selectedSquare = useGameStore((s) => s.selectedSquare);
  const selectSquare = useGameStore((s) => s.selectSquare);

  const [movesOpen, setMovesOpen] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [backOpen, setBackOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);

  useEffect(() => {
    if (result) setGameOverOpen(true);
    else setGameOverOpen(false);
  }, [result]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSquare !== null) selectSquare(selectedSquare);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSquare, selectSquare]);

  return (
    <div className={styles.screen}>
      <TopBar
        onBack={() => setBackOpen(true)}
        onRestart={() => setRestartOpen(true)}
        onResign={() => setResignOpen(true)}
        onDraw={() => setDrawOpen(true)}
      />
      <Board />
      <StatusBar />
      <ControlBar onOpenMoves={() => setMovesOpen(true)} />

      <MoveListDrawer open={movesOpen} onClose={() => setMovesOpen(false)} />

      <GameOverSheet
        open={gameOverOpen}
        onRematch={() => {
          setGameOverOpen(false);
          restart();
        }}
        onViewMoves={() => {
          setGameOverOpen(false);
          setMovesOpen(true);
        }}
        onBackToSetup={() => {
          setGameOverOpen(false);
          returnToSetup();
        }}
      />

      <ConfirmDialog
        open={backOpen}
        title="退出对局？"
        message="当前对局将丢失"
        confirmText="退出"
        destructive
        onCancel={() => setBackOpen(false)}
        onConfirm={() => {
          setBackOpen(false);
          returnToSetup();
        }}
      />

      <ConfirmDialog
        open={restartOpen}
        title="重新开始？"
        message="当前对局将重新开始"
        confirmText="重新开始"
        destructive
        onCancel={() => setRestartOpen(false)}
        onConfirm={() => {
          setRestartOpen(false);
          restart();
        }}
      />

      <ConfirmDialog
        open={resignOpen}
        title="确认认输？"
        message="本局将判定为对方获胜"
        confirmText="认输"
        destructive
        onCancel={() => setResignOpen(false)}
        onConfirm={() => {
          setResignOpen(false);
          resign();
        }}
      />

      <ConfirmDialog
        open={drawOpen}
        title="提议和棋？"
        message="本局将判定为和棋"
        confirmText="和棋"
        onCancel={() => setDrawOpen(false)}
        onConfirm={() => {
          setDrawOpen(false);
          offerDraw();
        }}
      />
    </div>
  );
}
