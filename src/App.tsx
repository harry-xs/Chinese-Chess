import { useEffect } from 'react';
import { GameScreen } from './components/Game/GameScreen';
import { Setup } from './components/Setup/Setup';
import { useGameStore } from './game/store';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const init = useGameStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="app">{screen === 'setup' ? <Setup /> : <GameScreen />}</div>
  );
}
