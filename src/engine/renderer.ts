import type { Grid, Tetromino } from '../types';
import { COLS, ROWS, checkCollision } from './game';
import { ParticleSystem } from '../particles/Explosion';
import { Starfield } from '../particles/Starfield';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  
  public particles: ParticleSystem;
  public starfield: Starfield;

  private cellSize: number = 30;
  private previewCellSize: number = 25;

  constructor(
    canvasId: string,
    previewCanvasId: string
  ) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.previewCanvas = document.getElementById(previewCanvasId) as HTMLCanvasElement;
    this.previewCtx = this.previewCanvas.getContext('2d')!;

    this.particles = new ParticleSystem();
    this.starfield = new Starfield(100);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    // Get the maximum height we can occupy (leave some room for header/controls)
    const maxHeight = window.innerHeight * 0.70;
    const parentWidth = parent.clientWidth;

    // Calculate grid size based on space limits maintaining 1:2 aspect ratio
    let height = maxHeight;
    let width = height / 2;

    if (width > parentWidth) {
      width = parentWidth;
      height = width * 2;
    }

    // Set canvas resolutions
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Scale cell sizes
    this.cellSize = width / COLS;

    // Resize Starfield
    this.starfield.resize(width, height);

    // Setup preview canvas
    this.previewCanvas.width = 120;
    this.previewCanvas.height = 120;
    this.previewCellSize = 120 / 4.5;
  }

  // Draw a block with professional neon aesthetics
  private drawBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    cellSize: number,
    isGhost: boolean = false
  ) {
    ctx.save();

    const padding = 1.5;
    const bx = x * cellSize + padding;
    const by = y * cellSize + padding;
    const size = cellSize - padding * 2;
    const radius = Math.max(3, cellSize * 0.12);

    if (isGhost) {
      // Dashed neon outline for ghost piece
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;
      
      ctx.beginPath();
      ctx.roundRect(bx, by, size, size, radius);
      ctx.stroke();
    } else {
      // Normal Neon Block
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;

      // Gradient Fill
      const grad = ctx.createLinearGradient(bx, by, bx + size, by + size);
      grad.addColorStop(0, color);
      // Darken the bottom right slightly
      grad.addColorStop(1, this.adjustBrightness(color, -30));
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(bx, by, size, size, radius);
      ctx.fill();

      // Soft light overlay at the top left corner (3D sheen)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Draw top and left border inner arcs
      ctx.roundRect(bx + 1, by + 1, size - 2, size - 2, radius - 1);
      ctx.stroke();

      // Glow center dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(bx + size * 0.3, by + size * 0.3, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Helper to adjust hex color brightness
  private adjustBrightness(hex: string, percent: number): string {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.min(255, Math.max(0, R + percent));
    G = Math.min(255, Math.max(0, G + percent));
    B = Math.min(255, Math.max(0, B + percent));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  // Draw the background grid lines with slight glassmorphic/neon styling
  private drawGridLines(theme: string) {
    this.ctx.save();
    this.ctx.strokeStyle = theme === 'light' 
      ? 'rgba(0, 0, 0, 0.04)' 
      : 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let c = 1; c < COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * this.cellSize, 0);
      this.ctx.lineTo(c * this.cellSize, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let r = 1; r < ROWS; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * this.cellSize);
      this.ctx.lineTo(this.canvas.width, r * this.cellSize);
      this.ctx.stroke();
    }

    // Border glow of the main canvas
    this.ctx.restore();
  }

  // Calculate where the piece would land (ghost coordinates)
  private getGhostY(piece: Tetromino, grid: Grid): number {
    let offset = 0;
    while (!checkCollision(piece, grid, { x: 0, y: offset + 1 })) {
      offset++;
    }
    return piece.position.y + offset;
  }

  // Master render call
  render(
    grid: Grid,
    currentPiece: Tetromino | null,
    nextPiece: Tetromino | null,
    theme: string,
    paused: boolean,
    gameOver: boolean,
    starSpeedMultiplier: number = 1
  ) {
    // 1. Clear main canvas with appropriate background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Draw starfield background
    this.starfield.update(paused ? 0.1 : starSpeedMultiplier);
    this.starfield.draw(this.ctx, theme);

    // 3. Draw grid lines
    this.drawGridLines(theme);

    // 4. Render placed blocks in the grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = grid[r][c];
        if (color !== 0) {
          this.drawBlock(this.ctx, c, r, color, this.cellSize);
        }
      }
    }

    // 5. Render falling piece and ghost projection
    if (currentPiece && !gameOver && !paused) {
      // Draw ghost piece
      const ghostY = this.getGhostY(currentPiece, grid);
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c] !== 0) {
            const blockX = currentPiece.position.x + c;
            const blockY = ghostY + r;
            if (blockY >= 0) {
              this.drawBlock(this.ctx, blockX, blockY, currentPiece.color, this.cellSize, true);
            }
          }
        }
      }

      // Draw active falling piece
      for (let r = 0; r < currentPiece.matrix.length; r++) {
        for (let c = 0; c < currentPiece.matrix[r].length; c++) {
          if (currentPiece.matrix[r][c] !== 0) {
            const blockX = currentPiece.position.x + c;
            const blockY = currentPiece.position.y + r;
            if (blockY >= 0) {
              this.drawBlock(this.ctx, blockX, blockY, currentPiece.color, this.cellSize);
            }
          }
        }
      }
    }

    // 6. Draw explosions and particles
    this.particles.updateAndDraw(this.ctx);

    // 7. Render next-piece preview box
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    
    // Draw preview box background stars slightly
    this.previewCtx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.01)';
    this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    if (nextPiece && !gameOver) {
      // Center the next piece in the preview box
      const matrix = nextPiece.matrix;
      const h = matrix.length;
      const w = matrix[0].length;
      
      // Calculate centering offsets
      const offsetX = (4.5 - w) / 2;
      const offsetY = (4.5 - h) / 2;

      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (matrix[r][c] !== 0) {
            this.drawBlock(
              this.previewCtx,
              c + offsetX,
              r + offsetY,
              nextPiece.color,
              this.previewCellSize
            );
          }
        }
      }
    }
  }
}
