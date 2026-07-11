import type { Grid } from '../types';
import { COLS } from '../engine/game';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
  gravity: number;
  sparkle?: boolean;
}

export class ParticleSystem {
  particles: Particle[] = [];

  // Spawns particles corresponding to current grid elements during Game Over
  triggerGameOverExplosion(grid: Grid, cellSize: number) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== 0) {
          const color = grid[r][c] as string;
          const startX = c * cellSize + cellSize / 2;
          const startY = r * cellSize + cellSize / 2;
          
          // Generate multiple particles per occupied cell
          const particleCount = 4 + Math.floor(Math.random() * 3); // 4-6 particles
          for (let i = 0; i < particleCount; i++) {
            this.particles.push({
              x: startX,
              y: startY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6 - 3, // upward bias
              color,
              alpha: 1,
              size: Math.random() * 3 + 2,
              decay: 0.01 + Math.random() * 0.015,
              gravity: 0.12
            });
          }
        }
      }
    }
  }

  // Spawns particles for line clears at specific row indexes
  triggerLineClearExplosion(rows: number[], cellSize: number) {
    rows.forEach(r => {
      const startY = r * cellSize + cellSize / 2;
      
      // Spawn particles along the row
      for (let c = 0; c < COLS; c++) {
        const startX = c * cellSize + cellSize / 2;
        
        // Spawn sparkles/explosion blocks
        const count = 3;
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 10, // burst outwards horizontally
            vy: (Math.random() - 0.5) * 4,  // minor vertical spread
            color: '#ffffff', // bright white core for line clear
            alpha: 1,
            size: Math.random() * 4 + 2,
            decay: 0.02 + Math.random() * 0.02,
            gravity: 0.05,
            sparkle: true
          });

          this.particles.push({
            x: startX,
            y: startY,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: '#00f0ff', // cyan trailing sparks
            alpha: 1,
            size: Math.random() * 3 + 1,
            decay: 0.015 + Math.random() * 0.02,
            gravity: 0.08,
            sparkle: true
          });
        }
      }
    });
  }

  updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity; // Apply particle gravity
      p.alpha -= p.decay; // Apply decay

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      
      // Neon glow effect for particles
      ctx.shadowBlur = p.sparkle ? 12 : 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      if (p.sparkle && Math.random() > 0.5) {
        // Draw cross star for sparkles
        const s = p.size * 1.5;
        ctx.moveTo(p.x - s, p.y);
        ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = p.color;
        ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
