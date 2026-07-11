export type Point = { x: number; y: number };
export type Grid = (string | 0)[][]; // 0 representing empty, string representing hex color

export interface Tetromino {
  matrix: number[][];
  color: string;
  position: Point;
}

export interface GameState {
  score: number;
  highScore: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  paused: boolean;
}

export type Theme = 'dark' | 'light' | 'galaxy';
