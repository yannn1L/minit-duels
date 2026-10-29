// ============================================================
// ASSET BAKER (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';
import { UI_STYLE } from '../config.js';
import { MinitEngine } from './Registry.js';

export const Textures = {};

export class AssetBaker {
  static async bake(app) {
    console.log('  Memulai AssetBaker...');
    const gfx = new PIXI.Graphics();
    const proceduralTasks = [];

    // Stage 1: Collect procedural textures
    for (const k of Object.keys(MinitEngine.Registry.textures)) {
      const v = MinitEngine.Registry.textures[k];
      if (Textures[k]) {
        Textures[k].destroy(true);
        delete Textures[k];
      }
      if (typeof v === 'function') {
        proceduralTasks.push({ key: k, generator: v });
      }
    }

    // Stage 2: Digits for damage popup numbers
    for (let i = 0; i <= 9; i++) {
      proceduralTasks.push({ key: 'digit_' + i, isText: true, text: i.toString() });
    }
    proceduralTasks.push({ key: 'digit_minus', isText: true, text: '-' });

    // Stage 3: Chunked rendering
    const CHUNK_SIZE = 6;
    for (let i = 0; i < proceduralTasks.length; i++) {
      const task = proceduralTasks[i];
      if (Textures[task.key]) {
        Textures[task.key].destroy(true);
      }

      if (task.isText) {
        const t = new PIXI.Text(task.text, UI_STYLE.DMG_POPUP);
        Textures[task.key] = app.renderer.generateTexture(t);
        t.destroy();
      } else {
        gfx.clear();
        task.generator(gfx);
        Textures[task.key] = app.renderer.generateTexture(gfx);
      }

      if ((i + 1) % CHUNK_SIZE === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    gfx.destroy();
    console.log('  Semua Asset & Texture siap!');
    return Textures;
  }
}
