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
import { SceneManager } from './engine/SceneManager.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { EditorScene } from './scenes/EditorScene.js';
import { SimulationScene } from './scenes/SimulationScene.js';

// Setup PIXI defaults for crisp HD pixel art (without deprecation warnings)
if (PIXI.BaseTexture?.defaultOptions) {
  PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
  PIXI.BaseTexture.defaultOptions.wrapMode = PIXI.WRAP_MODES.CLAMP;
}
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

// Initialize SceneManager
SceneManager.init(app, gameContainer);

// Re-exports for scene backward-compatibility
export function getIsLandscape() {
  return SceneManager.getIsLandscape();
}

export function handleResize() {
  SceneManager.handleResize();
}

export function setScene(scene) {
  SceneManager.setScene(scene);
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

export function goToEditor() {
  setScene(
    new EditorScene((selectedMinits) => {
      setScene(new SimulationScene(app, selectedMinits, () => goToEditor()));
    })
  );
}

// Start with Loading Screen
setScene(
  new LoadingScene(app, () => {
    goToEditor();
  })
);
