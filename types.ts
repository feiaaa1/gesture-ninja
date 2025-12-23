
export enum Gesture {
  FIST = 'FIST',
  OPEN = 'OPEN',
  UNKNOWN = 'UNKNOWN'
}

export interface Point {
  x: number;
  y: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface GameState {
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
  playerX: number;
  obstacles: Obstacle[];
}

export interface HandData {
  gesture: Gesture;
  landmarks: any[];
}
