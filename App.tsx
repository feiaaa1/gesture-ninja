
import React, { useState, useCallback } from 'react';
import { Gesture } from './types';
import GameCanvas from './components/GameCanvas';
import HandOverlay from './components/HandOverlay';

const App: React.FC = () => {
  const [gesture, setGesture] = useState<Gesture>(Gesture.UNKNOWN);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [finalScore, setFinalScore] = useState(0);

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setGameState('GAMEOVER');
  }, []);

  const restartGame = () => {
    setGameState('PLAYING');
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans">
      <GameCanvas 
        currentGesture={gesture} 
        onGameOver={handleGameOver}
        gameState={gameState}
        setGameState={setGameState}
      />
      
      <HandOverlay onGestureChange={setGesture} />

      {/* Overlays */}
      {gameState === 'START' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center p-12 rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl max-w-lg">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600 mb-4 tracking-tighter">
              GESTURE NINJA
            </h1>
            <p className="text-gray-400 mb-10 text-lg">
              Control the square with your hands. <br/>
              No keyboard. No mouse. Only skill.
            </p>
            <button
              onClick={() => setGameState('PLAYING')}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(37,99,235,0.3)]"
            >
              INITIALIZE SYSTEM
            </button>
            <div className="mt-8 flex justify-center gap-6 text-xs text-gray-500">
              <div className="flex flex-col items-center">
                <span className="font-bold text-gray-300">FIST</span>
                <span>LEFT</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-bold text-gray-300">OPEN</span>
                <span>RIGHT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/40 backdrop-blur-md">
          <div className="text-center p-12 rounded-3xl border border-red-500/20 bg-slate-900/80 shadow-2xl">
            <h2 className="text-5xl font-black text-red-500 mb-2">SYSTEM FAILURE</h2>
            <p className="text-gray-400 mb-8 uppercase tracking-widest text-sm">Obstacle detected at critical range</p>
            
            <div className="mb-10">
              <span className="block text-gray-500 text-xs uppercase font-bold mb-1">Final Score</span>
              <span className="text-7xl font-black text-white">{finalScore}</span>
            </div>

            <button
              onClick={restartGame}
              className="w-full px-10 py-4 bg-white text-black hover:bg-gray-200 rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
