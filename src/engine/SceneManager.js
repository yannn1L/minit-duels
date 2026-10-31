// ============================================================
// SCENE MANAGER & VIEWPORT CONTROLLER (ES Module)
// Handles scene lifecycle, memory disposal & adaptive orientation
// ============================================================
import { CFG } from '../config.js';

export class SceneManager {
  static app = null;
  static container = null;
  static activeScene = null;
  static isInitialized = false;

  static init(app, container) {
    this.app = app;
    this.container = container;
    this.isInitialized = true;

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  static getIsLandscape() {
    return window.innerWidth >= window.innerHeight;
  }

  static handleResize() {
    if (!this.app || !this.container) return;

    const isLandscape = this.getIsLandscape();
    const targetDims = isLandscape ? CFG.APP.LANDSCAPE : CFG.APP.PORTRAIT;

    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    const scale = Math.min(window.innerWidth / targetDims.W, window.innerHeight / targetDims.H);
    this.container.scale.set(scale);
    this.container.x = Math.round((window.innerWidth - targetDims.W * scale) / 2);
    this.container.y = Math.round((window.innerHeight - targetDims.H * scale) / 2);

    if (this.activeScene && typeof this.activeScene.onResize === 'function') {
      this.activeScene.onResize(isLandscape);
    }
  }

  static setScene(scene) {
    if (!this.container) return;

    if (this.activeScene) {
      this.container.removeChild(this.activeScene);
      if (typeof this.activeScene.destroy === 'function') {
        this.activeScene.destroy({ children: true });
      }
    }

    this.activeScene = scene;
    this.container.addChild(scene);
    this.handleResize();
  }

  static getActiveScene() {
    return this.activeScene;
  }
}
