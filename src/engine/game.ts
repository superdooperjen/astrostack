import type { Grid, Point, Tetromino } from '../types';

export const COLS = 10;
export const ROWS = 20;

export const SHAPES: { [key: string]: number[][] } = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

export const COLORS: { [key: string]: string } = {
  I: '#00f0ff', // Neon Cyan
  O: '#ffe600', // Neon Yellow
  T: '#d300ff', // Neon Magenta/Purple
  S: '#39ff14', // Neon Lime Green
  Z: '#ff073a', // Neon Red
  J: '#1f51ff', // Neon Blue
  L: '#ff5f1f'  // Neon Orange
};

export function createGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function getRandomPieceType(): string {
  const pieces = 'IOTSZJL';
  return pieces[Math.floor(Math.random() * pieces.length)];
}

export function createPiece(type: string): Tetromino {
  const matrix = SHAPES[type].map(row => [...row]);
  const color = COLORS[type];
  
  // Center the piece at the top
  const width = matrix[0].length;
  const x = Math.floor((COLS - width) / 2);
  const y = type === 'I' ? -1 : 0; // standard initial vertical offset

  return {
    matrix,
    color,
    position: { x, y }
  };
}

export function checkCollision(piece: Tetromino, grid: Grid, offset: Point): boolean {
  for (let r = 0; r < piece.matrix.length; r++) {
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (piece.matrix[r][c] !== 0) {
        const nextX = piece.position.x + c + offset.x;
        const nextY = piece.position.y + r + offset.y;

        // Boundaries check
        if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
          return true;
        }

        // Only check collision with grid if it is on the board
        if (nextY >= 0 && grid[nextY][nextX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Matrix transposition & reverse for 90 deg clockwise rotation
function rotateMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const rotated = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
}

export function rotatePiece(piece: Tetromino, grid: Grid): boolean {
  const rotatedMatrix = rotateMatrix(piece.matrix);
  
  const rotatedPiece = {
    ...piece,
    matrix: rotatedMatrix
  };

  // Wall-kick offsets to try
  const kicks = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: -1 } // kick upwards if on the ground
  ];

  for (const kick of kicks) {
    if (!checkCollision(rotatedPiece, grid, kick)) {
      piece.matrix = rotatedMatrix;
      piece.position.x += kick.x;
      piece.position.y += kick.y;
      return true;
    }
  }

  return false; // Could not rotate
}

export function mergePiece(piece: Tetromino, grid: Grid): void {
  for (let r = 0; r < piece.matrix.length; r++) {
    for (let c = 0; c < piece.matrix[r].length; c++) {
      if (piece.matrix[r][c] !== 0) {
        const gridX = piece.position.x + c;
        const gridY = piece.position.y + r;
        if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
          grid[gridY][gridX] = piece.color;
        }
      }
    }
  }
}

// Clears rows and returns indices of cleared rows for particle effects
export function clearLines(grid: Grid): number[] {
  const clearedRows: number[] = [];
  
  for (let r = ROWS - 1; r >= 0; r--) {
    const isFull = grid[r].every(value => value !== 0);
    if (isFull) {
      clearedRows.push(r);
    }
  }

  if (clearedRows.length > 0) {
    // Sort clearedRows in ascending order so we process them bottom-up
    clearedRows.sort((a, b) => a - b);
    
    // Remove the full lines and add empty ones at the top
    for (const rowIndex of clearedRows) {
      grid.splice(rowIndex, 1);
      grid.unshift(Array(COLS).fill(0));
    }
  }

  return clearedRows;
}

export function getNintendoScore(lines: number, level: number): number {
  if (lines <= 0) return 0;
  const baseScores = [0, 40, 100, 300, 1200];
  const score = baseScores[Math.min(lines, 4)];
  return score * (level + 1);
}
