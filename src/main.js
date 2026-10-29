// ============================================================
// MINIT DUELS - MAIN APPLICATION ENTRY POINT (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from './config.js';
import { AudioSys } from './engine/AudioSys.js';
import { registerBaseAssets } from './engine/AssetTemplate.js';
import { registerTraitsAndTargeting } from './engine/traitBeh.js';
import { registerAllMinits } from './minits/index.js';
import { CRTFilter } from './filters/Filters.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { EditorScene } from './scenes/EditorScene.js';
import { SimulationScene } from './scenes/SimulationScene.js';

// Setup PIXI defaults for crisp pixel art
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
PIXI.settings.ROUND_PIXELS = true;

// Initialize Core Registries
registerBaseAssets();
registerTraitsAndTargeting();
registerAllMinits();

// Create PIXI Application
const canvas = document.getElementById('gameCanvas');
const app = new PIXI.Application({
  view: canvas,
  resizeTo: window,
  backgroundColor: CFG.APP.BG_COLOR,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true,
  antialias: false,
  powerPreference: 'high-performance'
});

const bgContainer = new PIXI.Container();
const gameContainer = new PIXI.Container();
app.stage.addChild(bgContainer, gameContainer);

// CRT Filter
const crtFilter = new CRTFilter();
app.stage.filters = [crtFilter];
app.ticker.add((d) => crtFilter.update(d));

// Global Background Tiling Sprite
const globalBg = new PIXI.TilingSprite(PIXI.Texture.EMPTY, window.innerWidth, window.innerHeight);
globalBg.alpha = 0.5;
bgContainer.addChild(globalBg);

// Responsive Resizing
function handleResize() {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  if (globalBg.texture !== PIXI.Texture.EMPTY) {
    globalBg.width = window.innerWidth;
    globalBg.height = window.innerHeight;
  }
  const scale = Math.min(window.innerWidth / CFG.APP.W, window.innerHeight / CFG.APP.H);
  gameContainer.scale.set(scale);
  gameContainer.x = (window.innerWidth - CFG.APP.W * scale) / 2;
  gameContainer.y = (window.innerHeight - CFG.APP.H * scale) / 2;
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
console.log('⚔️ Booting Minit Duels ES Modules...');
setScene(
  new LoadingScene(app, bgContainer, globalBg, () => {
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
