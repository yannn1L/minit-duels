// ============================================================
// MINIT DUELS - MAIN APPLICATION ENTRY POINT (ES Module)
// Crisp HD Pixel Art Engine - Zero Blur, Zero Jitter, Zero Bleed
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

// Setup PIXI defaults for razor-sharp HD pixel art
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.WRAP_MODE = PIXI.WRAP_MODES.CLAMP;
// Setting ROUND_PIXELS to false prevents subpixel snapping jitter during smooth motion
PIXI.settings.ROUND_PIXELS = false;

// Initialize Core Registries
registerBaseAssets();
registerTraitsAndTargeting();
registerAllMinits();

// Create PIXI Application with High-DPI support for crisp HD text and pixel clarity
const canvas = document.getElementById('gameCanvas');
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const app = new PIXI.Application({
  view: canvas,
  resizeTo: window,
  backgroundColor: CFG.APP.BG_COLOR,
  resolution: dpr,
  autoDensity: true,
  antialias: false,
  powerPreference: 'high-performance'
});

// Crisp scaling for renderer
app.renderer.texture.defaultScaleMode = PIXI.SCALE_MODES.NEAREST;

const gameContainer = new PIXI.Container();
app.stage.addChild(gameContainer);

// Integer-aligned responsive resizing to eliminate edge jitter
function handleResize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  const scale = Math.min(window.innerWidth / CFG.APP.W, window.innerHeight / CFG.APP.H);
  gameContainer.scale.set(scale);
  gameContainer.x = Math.round((window.innerWidth - CFG.APP.W * scale) / 2);
  gameContainer.y = Math.round((window.innerHeight - CFG.APP.H * scale) / 2);
}

window.addEventListener('resize', handleResize);
handleResize();

// Scene Management
let activeScene = null;

export function setScene(scene) {
  if (activeScene) {
    gameContainer.removeChild(activeScene);
    activeScene.destroy({ children: true });
  }
  activeScene = scene;
  gameContainer.addChild(activeScene);
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

function goToEditor() {
  setScene(
    new EditorScene((selectedMinits) => {
      setScene(new SimulationScene(app, selectedMinits, () => goToEditor()));
    })
  );
}
