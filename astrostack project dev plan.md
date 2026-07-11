# AstroStack - Project Development Plan

AstroStack is a mobile-responsive, space-themed cosmic block-stacking game built using HTML5 Canvas, TypeScript, and Vite. The game features vibrant neon tetrominoes, a responsive layout with mobile touch support, light and dark themes, progressive difficulty levels, sound effects, and a dynamic game-over particle explosion effect.

---

## Technical Architecture Overview
*   **Bundler/Build Tool:** Vite (configured with relative paths for GitHub Pages).
*   **Language:** TypeScript (for strict typing of matrices, game states, and coordinates).
*   **Rendering:** HTML5 2D Canvas for the game board, next-piece preview, and particle explosions.
*   **Styling:** CSS variables (custom properties) mapped to light/dark themes, utilizing a responsive CSS Grid/Flexbox layout for UI overlays.
*   **Audio:** Web Audio API (or lightweight HTML5 Audio elements) for sound effects.

---

## Phase 1: Project Setup & Architecture

### 1.1 Directory Structure
Set up a clean, modular TypeScript project:
```text
tetris-galaxy/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD script for GitHub Pages
├── public/
│   ├── assets/
│   │   ├── sounds/             # SFX files (rotate.mp3, clear.mp3, etc.)
│   │   └── fonts/              # Space-themed typography (optional)
├── src/
│   ├── audio/                  # Audio engine controller
│   ├── components/             # Theme toggles, UI modals
│   ├── engine/                 # Core Tetris math, physics, collision detection
│   ├── particles/              # Particle engine for explosion effects
│   ├── styles/
│   │   ├── main.css            # Base styles and theme declarations
│   │   └── themes.css          # Dark/Light/Galaxy variables
│   ├── types/
│   │   └── index.ts            # Type definitions (Tetromino, Point, GameState)
│   ├── main.ts                 # Application entry point & game loop
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 1.2 Configuration Files
**`vite.config.ts`**
Ensure your base path matches your GitHub repository name for correct assets resolution.
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative assets work on GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
```

---

## Phase 2: Core Game Engine & Physics (Canvas-based)

This phase establishes the mathematical representation of the Tetris board (10 columns × 20 rows).

### 2.1 Type Definitions (`src/types/index.ts`)
Define the structures for coordinates, the game board, and current states.
```typescript
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
```

### 2.2 Board, Tetrominoes, and Collisions
1.  **Grid Representation:** Represent the 10x20 board as a 2D array initialized with `0`.
2.  **Tetromino Definitions:** Create matrices for the standard 7 shapes (I, J, L, O, S, T, Z) using bright, neon color values (e.g., `#00f0f0`, `#f0a000`, `#a000f0`).
3.  **Collision Logic:** Create a helper function checking if a tetromino's prospective position overlaps with the grid boundaries or already placed blocks:
    ```typescript
    function checkCollision(piece: Tetromino, grid: Grid, offset: Point): boolean {
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix[r].length; c++) {
          if (piece.matrix[r][c] !== 0) {
            const nextX = piece.position.x + c + offset.x;
            const nextY = piece.position.y + r + offset.y;
            
            if (nextX < 0 || nextX >= 10 || nextY >= 20) return true;
            if (nextY >= 0 && grid[nextY][nextX] !== 0) return true;
          }
        }
      }
      return false;
    }
    ```
4.  **Rotation Logic:** Implement matrix transposition and reversing to rotate blocks, paired with a simple wall-kick algorithm (checking shifting left or right if a rotation hits a boundary).

---

## Phase 3: Game Loop, Scoring, and Sound

### 3.1 Adaptive Game Loop
To make the game speed up as the player levels up, map levels to the drop interval (in milliseconds).

```typescript
const SPEED_CURVE = [1000, 800, 650, 500, 400, 300, 220, 150, 100, 80]; // ms per step

let lastTime = 0;
let dropCounter = 0;

function gameLoop(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  
  if (!state.gameOver && !state.paused) {
    dropCounter += deltaTime;
    const currentInterval = SPEED_CURVE[Math.min(state.level, SPEED_CURVE.length - 1)];
    
    if (dropCounter > currentInterval) {
      movePieceDown();
      dropCounter = 0;
    }
    
    render();
  }
  
  requestAnimationFrame(gameLoop);
}
```

### 3.2 Score & Progression Mechanics
*   **Scoring System (Original Nintendo style):**
    *   1 Line: $40 \times (\text{level} + 1)$
    *   2 Lines: $100 \times (\text{level} + 1)$
    *   3 Lines: $300 \times (\text{level} + 1)$
    *   4 Lines (Tetris): $1200 \times (\text{level} + 1)$
*   **Level Up:** Clear 10 lines to increment the level.
*   **LocalStorage Sync:**
    ```typescript
    function updateHighScore(score: number) {
      const currentHighScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);
      if (score > currentHighScore) {
        localStorage.setItem('tetris_high_score', score.toString());
        state.highScore = score;
      }
    }
    ```

### 3.3 Audio Engine
Create an `AudioController` class using the Web Audio API or simplified `Audio` elements to handle concurrent triggers of sound effects (such as *move*, *rotate*, *line-clear*, *level-up*, and *game-over*). Use a user interaction check to unlock audio playback.

---

## Phase 4: UI, Themes & Mobile Responsiveness

### 4.1 UI Layout & CSS Custom Properties
Using a space/galaxy aesthetic, style the light and dark modes with neon highlights. Define CSS variables for high contrast.

```css
/* src/styles/themes.css */
:root[data-theme="dark"] {
  --bg-color: #0b0b1e;
  --galaxy-gradient: radial-gradient(circle, #1a1a3a 0%, #050510 100%);
  --panel-bg: rgba(255, 255, 255, 0.05);
  --border-color: rgba(255, 255, 255, 0.15);
  --text-color: #f1f1ff;
  --accent-color: #bf40bf;
  --star-opacity: 0.8;
}

:root[data-theme="light"] {
  --bg-color: #f0f3f8;
  --galaxy-gradient: radial-gradient(circle, #e2e8f0 0%, #cbd5e1 100%);
  --panel-bg: rgba(255, 255, 255, 0.7);
  --border-color: rgba(0, 0, 0, 0.1);
  --text-color: #1e293b;
  --accent-color: #7c3aed;
  --star-opacity: 0.15;
}
```

### 4.2 Mobile Responsiveness
*   **Canvas Scaling:** Track the container size, dynamically updating the Canvas drawing scale while maintaining the $1:2$ aspect ratio.
*   **Touch Controls Overlay:** Introduce an on-screen D-Pad or horizontal sliding area for touch inputs on mobile devices.
*   **Preventing Default Gestures:** Apply `touch-action: none` via CSS to the canvas and control elements to prevent unintended double-tap zooming or page bounces.

---

## Phase 5: Visual Polish & Explosion Animation

To make the block placement feel impactful, you can add glow filters to the canvas context when rendering current pieces.

### 5.1 Game Over Particle Explosion
When the game ends, gather coordinates from all populated grid cells and launch a canvas particle explosion:

```typescript
// src/particles/Explosion.ts
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
}

class ParticleSystem {
  particles: Particle[] = [];

  // Spawns particles corresponding to current grid elements
  triggerExplosion(grid: Grid, cellSize: number) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== 0) {
          const color = grid[r][c] as string;
          const startX = c * cellSize + cellSize / 2;
          const startY = r * cellSize + cellSize / 2;
          
          // Generate multiple particles per occupied cell
          for (let i = 0; i < 6; i++) {
            this.particles.push({
              x: startX,
              y: startY,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8 - 2, // Slight upward bias
              color: color,
              alpha: 1,
              size: Math.random() * 3 + 2
            });
          }
        }
      }
    }
  }

  updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.alpha -= 0.015; // Fade out
      
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
```

---

## Phase 6: Deployment & CI/CD Script

Using a GitHub Action automated process allows you to push changes directly to your repository and deploy them automatically to GitHub Pages.

### 6.1 GitHub Pages CI/CD Script
Create a workflow file under `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main # Or your default branch

permissions:
  contents: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-node: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          branch: gh-pages
          clean: true
```

---

## Implementation Checklist

| Phase | Milestone Task | Status |
| :--- | :--- | :---: |
| **Phase 1** | Scaffolding Vite + TS project structures | ⬜ |
| **Phase 1** | CSS variables setup for themes and grid layout | ⬜ |
| **Phase 2** | Establish Tetris core matrices and wall collision checking | ⬜ |
| **Phase 2** | Render the game loop on a basic `<canvas>` element | ⬜ |
| **Phase 3** | Implement speed curve linked to scoring rules | ⬜ |
| **Phase 3** | Connect Web Audio playbacks on triggers (lines, rotations) | ⬜ |
| **Phase 4** | Build responsive overlay HUD (Next Piece, Scores) | ⬜ |
| **Phase 4** | Add touchscreen button controls with touch-action fixes | ⬜ |
| **Phase 5** | Create Canvas background starfield and particle explosions | ⬜ |
| **Phase 6** | Enable GitHub Pages publishing action for continuous delivery | ⬜ |