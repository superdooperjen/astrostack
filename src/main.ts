import { 
  createGrid, 
  createPiece, 
  getRandomPieceType, 
  checkCollision, 
  rotatePiece, 
  mergePiece, 
  clearLines, 
  getNintendoScore
} from './engine/game';
import { GameRenderer } from './engine/renderer';
import { SynthAudio } from './audio/synth';
import type { GameState, Tetromino, Theme } from './types';

// Speed Curve (drop interval in ms based on level)
const SPEED_CURVE = [1000, 800, 650, 500, 400, 300, 220, 150, 100, 80];

// Game instances
const audio = new SynthAudio();
let renderer: GameRenderer;

// Game states
let grid = createGrid();
let currentPiece: Tetromino | null = null;
let nextPiece: Tetromino | null = null;

const state: GameState = {
  score: 0,
  highScore: parseInt(localStorage.getItem('astrostack_high_score') || '0', 10),
  level: 0,
  linesCleared: 0,
  gameOver: false,
  paused: false
};

// Loop timers
let lastTime = 0;
let dropCounter = 0;
let animationFrameId: number | null = null;

// Visual animations speed modifiers
let starSpeedMultiplier = 1;

// DOM Elements
const scoreEl = document.getElementById('score')!;
const highScoreEl = document.getElementById('high-score')!;
const levelEl = document.getElementById('level')!;
const linesEl = document.getElementById('lines-cleared')!;

const startOverlay = document.getElementById('start-overlay')!;
const pauseOverlay = document.getElementById('pause-overlay')!;
const gameOverOverlay = document.getElementById('game-over-overlay')!;
const finalScoreEl = document.getElementById('final-score')!;

const startBtn = document.getElementById('start-btn')!;
const resumeBtn = document.getElementById('resume-btn')!;
const restartBtn = document.getElementById('restart-btn')!;

const muteBtn = document.getElementById('mute-btn')!;
const muteIcon = document.getElementById('mute-icon')!;

// Theme buttons
const themeBtnDark = document.getElementById('theme-btn-dark')!;
const themeBtnLight = document.getElementById('theme-btn-light')!;
const themeBtnGalaxy = document.getElementById('theme-btn-galaxy')!;

// Mobile Control Buttons
const mBtnRot = document.getElementById('m-btn-rot')!;
const mBtnLeft = document.getElementById('m-btn-left')!;
const mBtnRight = document.getElementById('m-btn-right')!;
const mBtnSoft = document.getElementById('m-btn-soft')!;
const mBtnHard = document.getElementById('m-btn-hard')!;
const mBtnPause = document.getElementById('m-btn-pause')!;

// Initialize UI States
function initUI() {
  highScoreEl.textContent = state.highScore.toString();
  updateMuteIcon();
  
  // Set initial theme
  const savedTheme = (localStorage.getItem('astrostack_theme') || 'dark') as Theme;
  setTheme(savedTheme);
}

// Set game theme
function setTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('astrostack_theme', theme);

  // Update button active classes
  [themeBtnDark, themeBtnLight, themeBtnGalaxy].forEach(btn => btn.classList.remove('active'));
  if (theme === 'dark') themeBtnDark.classList.add('active');
  if (theme === 'light') themeBtnLight.classList.add('active');
  if (theme === 'galaxy') themeBtnGalaxy.classList.add('active');
}

// Update SVG speaker icons based on mute state
function updateMuteIcon() {
  const isMuted = audio.getMuteState();
  if (isMuted) {
    // Speaker off with a diagonal mute slash
    muteIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    `;
  } else {
    // Speaker on with volume waves
    muteIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    `;
  }
}

// Toggle audio mute
muteBtn.addEventListener('click', () => {
  audio.toggleMute();
  updateMuteIcon();
});

// Theme switcher event listeners
themeBtnDark.addEventListener('click', () => setTheme('dark'));
themeBtnLight.addEventListener('click', () => setTheme('light'));
themeBtnGalaxy.addEventListener('click', () => setTheme('galaxy'));

// Start / Initialize game
function launchGame() {
  grid = createGrid();
  state.score = 0;
  state.level = 0;
  state.linesCleared = 0;
  state.gameOver = false;
  state.paused = false;

  scoreEl.textContent = '0';
  levelEl.textContent = '0';
  linesEl.textContent = '0';

  currentPiece = createPiece(getRandomPieceType());
  nextPiece = createPiece(getRandomPieceType());

  // Hide overlays
  startOverlay.classList.remove('active');
  gameOverOverlay.classList.remove('active');
  pauseOverlay.classList.remove('active');

  renderer.particles.clear();
  
  // Audio trigger
  audio.playLevelUp(); // play starting chime

  lastTime = 0;
  dropCounter = 0;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Move piece left
function moveLeft() {
  if (state.gameOver || state.paused || !currentPiece) return;
  if (!checkCollision(currentPiece, grid, { x: -1, y: 0 })) {
    currentPiece.position.x--;
    audio.playMove();
  }
}

// Move piece right
function moveRight() {
  if (state.gameOver || state.paused || !currentPiece) return;
  if (!checkCollision(currentPiece, grid, { x: 1, y: 0 })) {
    currentPiece.position.x++;
    audio.playMove();
  }
}

// Rotate piece
function rotate() {
  if (state.gameOver || state.paused || !currentPiece) return;
  const rotated = rotatePiece(currentPiece, grid);
  if (rotated) {
    audio.playRotate();
  }
}

// Move piece down (Soft Drop)
function moveDown() {
  if (state.gameOver || state.paused || !currentPiece) return;
  
  if (!checkCollision(currentPiece, grid, { x: 0, y: 1 })) {
    currentPiece.position.y++;
    state.score += 1; // 1 point per soft drop row
    scoreEl.textContent = state.score.toString();
    audio.playMove();
    return true;
  }
  
  lockPiece();
  return false;
}

// Hard Drop
function hardDrop() {
  if (state.gameOver || state.paused || !currentPiece) return;
  
  let dropRows = 0;
  while (!checkCollision(currentPiece, grid, { x: 0, y: 1 })) {
    currentPiece.position.y++;
    dropRows++;
  }

  state.score += dropRows * 2; // 2 points per hard drop row
  scoreEl.textContent = state.score.toString();
  
  // Temporary speed up starfield for splash impact
  starSpeedMultiplier = 8;
  setTimeout(() => starSpeedMultiplier = 1, 150);

  audio.playMove();
  lockPiece();
}

// Lock the active piece, trigger line clears, check game over
function lockPiece() {
  if (!currentPiece) return;

  mergePiece(currentPiece, grid);

  // Sound play
  audio.playMove();

  // Clear filled rows
  const clearedRows = clearLines(grid);
  if (clearedRows.length > 0) {
    // Score increment
    const earned = getNintendoScore(clearedRows.length, state.level);
    state.score += earned;
    state.linesCleared += clearedRows.length;

    // Trigger visual explosions
    // Calculate cell pixel height on board
    const canvasHeight = document.getElementById('game-board')!.clientHeight;
    const currentCellSize = canvasHeight / 20;
    renderer.particles.triggerLineClearExplosion(clearedRows, currentCellSize);

    // Audio line clear arpeggio
    audio.playLineClear();

    // Check level up (every 10 lines)
    const newLevel = Math.floor(state.linesCleared / 10);
    if (newLevel > state.level) {
      state.level = newLevel;
      audio.playLevelUp();
    }

    // Update HUD
    scoreEl.textContent = state.score.toString();
    levelEl.textContent = state.level.toString();
    linesEl.textContent = state.linesCleared.toString();
  }

  // Next piece logic
  currentPiece = nextPiece;
  nextPiece = createPiece(getRandomPieceType());

  // Check Game Over
  if (checkCollision(currentPiece!, grid, { x: 0, y: 0 })) {
    triggerGameOver();
  }
}

// Trigger Game Over screen and particle animation
function triggerGameOver() {
  state.gameOver = true;
  
  // High score sync
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('astrostack_high_score', state.highScore.toString());
    highScoreEl.textContent = state.highScore.toString();
  }

  // Trigger game-over explosions
  const canvasHeight = document.getElementById('game-board')!.clientHeight;
  const currentCellSize = canvasHeight / 20;
  renderer.particles.triggerGameOverExplosion(grid, currentCellSize);

  // Play audio
  audio.playGameOver();

  // Show overlay
  finalScoreEl.textContent = state.score.toString();
  gameOverOverlay.classList.add('active');
}

// Pause toggle
function togglePause() {
  if (state.gameOver) return;

  state.paused = !state.paused;
  if (state.paused) {
    pauseOverlay.classList.add('active');
  } else {
    pauseOverlay.classList.remove('active');
    lastTime = performance.now(); // reset timer offset
  }
}

// Main game clock loop
function gameLoop(time = 0) {
  if (state.gameOver) {
    // Keep rendering background & gameover explosion particles
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    renderer.render(grid, null, null, currentTheme, false, true, 0.2);
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  if (!state.paused) {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    // Map speed based on current level
    const currentInterval = SPEED_CURVE[Math.min(state.level, SPEED_CURVE.length - 1)];

    if (dropCounter > currentInterval) {
      moveDown();
      dropCounter = 0;
    }
  }

  // Render current frame
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  renderer.render(
    grid,
    currentPiece,
    nextPiece,
    currentTheme,
    state.paused,
    state.gameOver,
    starSpeedMultiplier
  );

  animationFrameId = requestAnimationFrame(gameLoop);
}

// Keyboard controls handler
window.addEventListener('keydown', (e) => {
  if (state.gameOver) return;

  switch (e.code) {
    case 'ArrowLeft':
      moveLeft();
      e.preventDefault();
      break;
    case 'ArrowRight':
      moveRight();
      e.preventDefault();
      break;
    case 'ArrowUp':
      rotate();
      e.preventDefault();
      break;
    case 'ArrowDown':
      moveDown();
      e.preventDefault();
      break;
    case 'Space':
      hardDrop();
      e.preventDefault();
      break;
    case 'KeyP':
    case 'Escape':
      togglePause();
      e.preventDefault();
      break;
  }
});

// Prevent scrolling inside canvas or controls when swiping on mobile
document.addEventListener('touchmove', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('.board-container') || target.closest('.mobile-controls')) {
    e.preventDefault();
  }
}, { passive: false });

// Mobile Button Listeners
mBtnLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); moveLeft(); });
mBtnRight.addEventListener('pointerdown', (e) => { e.preventDefault(); moveRight(); });
mBtnRot.addEventListener('pointerdown', (e) => { e.preventDefault(); rotate(); });
mBtnSoft.addEventListener('pointerdown', (e) => { e.preventDefault(); moveDown(); });
mBtnHard.addEventListener('pointerdown', (e) => { e.preventDefault(); hardDrop(); });
mBtnPause.addEventListener('pointerdown', (e) => { e.preventDefault(); togglePause(); });

// Overlay Button Listeners
startBtn.addEventListener('click', launchGame);
resumeBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', launchGame);

// Main bootstrap
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Renderer
  renderer = new GameRenderer('game-board', 'next-preview');
  
  // Initialize UI & highscores
  initUI();
  
  // Run initial background render before game launch
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  renderer.render(grid, null, null, currentTheme, false, false, 0.4);
  
  // Run passive rendering of background/stars before user clicks launch
  function initialRender() {
    if (startOverlay.classList.contains('active')) {
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      renderer.render(grid, null, null, theme, false, false, 0.5);
      requestAnimationFrame(initialRender);
    }
  }
  requestAnimationFrame(initialRender);
});
