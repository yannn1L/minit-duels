// ============================================================
// MINIT DUELS - MAIN APPLICATION ENTRY POINT (ES Module)
// Supports Adaptive Landscape (Desktop) & Portrait (Mobile)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from './config.js';
import { AudioSys } from './engine/AudioSys.js';
import { registerBaseAssets } from './engine/AssetTemplate.js';
import { registerTraitsAndTargeting } from './engine/traitBeh.js';
import { registerAllMinits } from './minits/index.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { EditorScene } from './scenes/EditorScene.js';
import { SimulationScene } from './scenes/SimulationScene.js';

// Setup PIXI defaults for crisp HD pixel art
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.WRAP_MODE = PIXI.WRAP_MODES.CLAMP;
PIXI.settings.ROUND_PIXELS = false;

// Initialize Core Registries
registerBaseAssets();
registerTraitsAndTargeting();
registerAllMinits();

// Create PIXI Application with High-DPI support
const canvas = document.getElementById('gameCanvas');
const dpr = Math.min(window.devicePixelRatio || 1, 2);

export const app = new PIXI.Application({
  view: canvas,
  resizeTo: window,
  backgroundColor: CFG.APP.BG_COLOR,
  resolution: dpr,
  autoDensity: true,
  antialias: false,
  powerPreference: 'high-performance'
});

app.renderer.texture.defaultScaleMode = PIXI.SCALE_MODES.NEAREST;

export const gameContainer = new PIXI.Container();
app.stage.addChild(gameContainer);

// Scene Management State
let activeScene = null;

// Detect Orientation
export function getIsLandscape() {
  return window.innerWidth >= window.innerHeight;
}

// Adaptive Resize: Centers arena and scales game container based on orientation
export function handleResize() {
  const isLandscape = getIsLandscape();
  const targetDims = isLandscape ? CFG.APP.LANDSCAPE : CFG.APP.PORTRAIT;

  app.renderer.resize(window.innerWidth, window.innerHeight);
  const scale = Math.min(window.innerWidth / targetDims.W, window.innerHeight / targetDims.H);
  gameContainer.scale.set(scale);
  gameContainer.x = Math.round((window.innerWidth - targetDims.W * scale) / 2);
  gameContainer.y = Math.round((window.innerHeight - targetDims.H * scale) / 2);

  if (activeScene && typeof activeScene.onResize === 'function') {
    activeScene.onResize(isLandscape);
  }
}

window.addEventListener('resize', handleResize);
handleResize();

export function setScene(scene) {
  if (activeScene) {
    gameContainer.removeChild(activeScene);
    activeScene.destroy({ children: true });
  }
  activeScene = scene;
  gameContainer.addChild(activeScene);
  handleResize();
}

// User interaction gesture to unlock Web Audio Context
function unlockAudio() {
  AudioSys.init();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Boot game sequence
console.log('⚔️ Booting Minit Duels HD Pixel Edition...');
setScene(
  new LoadingScene(app, () => {
    goToEditor();
  })
);

export function goToEditor() {
  setScene(
    new EditorScene((selectedMinits) => {
      setScene(new SimulationScene(app, selectedMinits, () => goToEditor()));
    })
  );
}
