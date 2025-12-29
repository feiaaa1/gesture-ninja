
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Gesture, GameState, Obstacle } from '../types';
import { 
  PLAYER_SIZE, 
  PLAYER_SPEED, 
  OBSTACLE_MIN_WIDTH, 
  OBSTACLE_MAX_WIDTH, 
  OBSTACLE_HEIGHT, 
  FALL_SPEED_BASE, 
  SPAWN_RATE 
} from '../constants';

interface GameCanvasProps {
  currentGesture: Gesture;
  onGameOver: (score: number) => void;
  gameState: 'START' | 'PLAYING' | 'GAMEOVER';
  setGameState: (state: 'START' | 'PLAYING' | 'GAMEOVER') => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ currentGesture, onGameOver, gameState, setGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 修复：在某些严格环境下 useRef 需要初始参数
  const requestRef = useRef<number | undefined>(undefined);
  const [score, setScore] = useState(0);
  const keysPressed = useRef<Set<string>>(new Set());
  
  // 使用 ref 保存手势以保持游戏循环稳定并避免重新渲染/重新执行副作用
  const gestureRef = useRef<Gesture>(currentGesture);
  useEffect(() => {
    gestureRef.current = currentGesture;
  }, [currentGesture]);

  // 使用 refs 保存回调函数以避免循环重新依赖
  const onGameOverRef = useRef(onGameOver);
  const setGameStateRef = useRef(setGameState);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
    setGameStateRef.current = setGameState;
  }, [onGameOver, setGameState]);

  // 游戏循环的内部可变状态
  const gameRef = useRef<GameState>({
    score: 0,
    isGameOver: false,
    isPaused: false,
    playerX: 0,
    obstacles: []
  });

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    const { width } = canvasRef.current;
    gameRef.current = {
      score: 0,
      isGameOver: false,
      isPaused: false,
      playerX: width / 2 - PLAYER_SIZE / 2,
      obstacles: []
    };
    setScore(0);
  }, []);

  // 当转换到 PLAYING 状态时同步重置游戏状态
  useEffect(() => {
    if (gameState === 'PLAYING') {
      initGame();
    }
  }, [gameState, initGame]);

  const spawnObstacle = (width: number) => {
    const oWidth = Math.random() * (OBSTACLE_MAX_WIDTH - OBSTACLE_MIN_WIDTH) + OBSTACLE_MIN_WIDTH;
    const x = Math.random() * (width - oWidth);
    const obstacle: Obstacle = {
      id: Date.now() + Math.random(),
      x,
      y: -OBSTACLE_HEIGHT,
      width: oWidth,
      height: OBSTACLE_HEIGHT,
      speed: FALL_SPEED_BASE + Math.random() * 2 + (gameRef.current.score / 500)
    };
    gameRef.current.obstacles.push(obstacle);
  };

  const update = useCallback(() => {
    if (gameState !== 'PLAYING' || !canvasRef.current) return;
    
    const { width, height } = canvasRef.current;
    const state = gameRef.current;

    // 检查键盘输入
    const isLeftPressed = keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a') || keysPressed.current.has('A');
    const isRightPressed = keysPressed.current.has('ArrowRight') || keysPressed.current.has('d') || keysPressed.current.has('D');

    // 根据手势 ref 或键盘移动玩家
    if (gestureRef.current === Gesture.FIST || isLeftPressed) {
      state.playerX = Math.max(0, state.playerX - PLAYER_SPEED);
    } else if (gestureRef.current === Gesture.OPEN || isRightPressed) {
      state.playerX = Math.min(width - PLAYER_SIZE, state.playerX + PLAYER_SPEED);
    }

    // 生成障碍物
    if (Math.random() < SPAWN_RATE) {
      spawnObstacle(width);
    }

    // 更新障碍物
    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obs = state.obstacles[i];
      obs.y += obs.speed;

      // 碰撞检测
      if (
        obs.x < state.playerX + PLAYER_SIZE &&
        obs.x + obs.width > state.playerX &&
        obs.y < height - 50 + PLAYER_SIZE &&
        obs.y + obs.height > height - 50
      ) {
        setGameStateRef.current('GAMEOVER');
        onGameOverRef.current(state.score);
        return;
      }

      // 移除屏幕外的障碍物并增加分数
      if (obs.y > height) {
        state.obstacles.splice(i, 1);
        state.score += 10;
        // 优化：仅在每几个点或使用单独的计数器时更新 React 状态中的分数
        setScore(state.score);
      }
    }
  }, [gameState]); // 仅依赖 gameState 来控制逻辑流程

  const draw = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasRef.current;
    const state = gameRef.current;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(state.playerX, height - 50, state.playerX + PLAYER_SIZE, height - 50 + PLAYER_SIZE);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#3b82f6';
    ctx.fillStyle = gradient;
    ctx.fillRect(state.playerX, height - 50, PLAYER_SIZE, PLAYER_SIZE);
    
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.strokeRect(state.playerX + 5, height - 45, PLAYER_SIZE - 10, PLAYER_SIZE - 10);
    ctx.shadowBlur = 0;

    state.obstacles.forEach(obs => {
      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.shadowBlur = 0;
    });
  }, []);

  // 主稳定循环
  const loop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        // 不要在这里调用 initGame，因为它会重置进度
        // 只需确保玩家在边界内
        const width = window.innerWidth;
        gameRef.current.playerX = Math.min(gameRef.current.playerX, width - PLAYER_SIZE);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 设置初始大小

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]); // 稳定的循环确保此副作用仅运行一次

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0" />
      
      <div className="fixed top-8 left-8 flex flex-col pointer-events-none">
        <span className="text-gray-400 text-xs uppercase tracking-widest font-bold">Session Score</span>
        <span className="text-white text-5xl font-black tabular-nums">{score}</span>
      </div>

      <div className="fixed top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white font-mono text-sm">
        CONTROLLER: <span className={`font-bold ${currentGesture === Gesture.UNKNOWN ? 'text-gray-500' : 'text-blue-400'}`}>
          {currentGesture === Gesture.UNKNOWN ? 'SCANNING...' : currentGesture}
        </span>
      </div>

      {gameState === 'PLAYING' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-12 text-white/40 text-xs uppercase tracking-widest bg-black/20 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="px-2 py-1 bg-white/10 rounded border border-white/20 font-bold">Fist</span>
              <span className="px-2 py-1 bg-white/10 rounded border border-white/20 font-bold">A</span>
              <span className="px-2 py-1 bg-white/10 rounded border border-white/20 font-bold">←</span>
            </div>
            <span>Move Left</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="px-2 py-1 bg-white/10 rounded border border-white/20 font-bold">Open</span>
              <span className="px-2 py-1 bg-white/10 rounded border border-white/20 font-bold">D</span>
              <span className="px-2 py-1 bg-white/10 rounded border border-white/20 font-bold">→</span>
            </div>
            <span>Move Right</span>
          </div>
        </div>
      )}
    </>
  );
};

export default GameCanvas;
