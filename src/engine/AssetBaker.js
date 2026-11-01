// ============================================================
// ASSET BAKER & PNG/SVG/DATA-URL LOADER (ES Module - HD Pixel Optimized)
// Supports Full Boot Baking & Incremental Single-Minit Runtime Baking
// ============================================================
import * as PIXI from 'pixi.js';
import { UI_STYLE } from '../config.js';
import { MinitEngine } from './Registry.js';

export const Textures = {};

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function createFallbackTexture(app, color = 0x00e5ff) {
  const g = new PIXI.Graphics();
  g.beginFill(0x10101a, 0.95).drawRoundedRect(-7, -7, 14, 14, 2).endFill();
  g.lineStyle(1.5, color, 1).drawRoundedRect(-7, -7, 14, 14, 2);
  g.lineStyle(0).beginFill(color, 0.9).drawRect(-4, -4, 8, 8).endFill();
  g.beginFill(0xffffff, 0.95).drawRect(-3, -2, 2, 2).drawRect(1, -2, 2, 2).endFill();
  const tex = app.renderer.generateTexture(g, {
    scaleMode: PIXI.SCALE_MODES.NEAREST,
    resolution: 2
  });
  g.destroy();
  return tex;
}

export class AssetBaker {
  static async bakeKeyList(app, keys) {
    if (!app || !keys || keys.length === 0) return;

    const gfx = new PIXI.Graphics();
    const proceduralTasks = [];
    const externalLoads = [];

    for (const k of keys) {
      const v = MinitEngine.Registry.textures[k];
      if (!v) continue;

      if (typeof v === 'string') {
        externalLoads.push({ key: k, url: v });
      } else if (typeof v === 'function') {
        proceduralTasks.push({ key: k, generator: v });
      }
    }

    if (externalLoads.length > 0) {
      await Promise.all(
        externalLoads.map(async ({ key, url }) => {
          try {
            const img = await loadImageElement(url);
            const baseTex = new PIXI.BaseTexture(img, {
              scaleMode: PIXI.SCALE_MODES.NEAREST,
              wrapMode: PIXI.WRAP_MODES.CLAMP,
              mipmap: PIXI.MIPMAP_MODES.OFF
            });
            Textures[key] = new PIXI.Texture(baseTex);
          } catch (e) {
            console.warn(`[AssetBaker] Could not load texture "${url}" for "${key}", using procedural fallback.`);
            Textures[key] = createFallbackTexture(app, 0x00e5ff);
          }
        })
      );
    }

    const CHUNK_SIZE = 8;
    for (let i = 0; i < proceduralTasks.length; i++) {
      const task = proceduralTasks[i];
      try {
        gfx.clear();
        task.generator(gfx);
        const tex = app.renderer.generateTexture(gfx, {
          scaleMode: PIXI.SCALE_MODES.NEAREST,
          resolution: 2
        });
        if (tex?.baseTexture) {
          tex.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
          tex.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
        }
        Textures[task.key] = tex;
      } catch (err) {
        console.warn(`[AssetBaker] Procedural texture "${task.key}" failed:`, err);
        Textures[task.key] = createFallbackTexture(app, 0x00e5ff);
      }

      if ((i + 1) % CHUNK_SIZE === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    gfx.destroy();
  }

  static async bakeSingleMinit(app, minitConfig) {
    if (!app || !minitConfig) return;
    const keys = [];
    if (minitConfig.textures) {
      Object.keys(minitConfig.textures).forEach((k) => {
        keys.push(`minit_${minitConfig.id}_${k}`);
      });
    }
    if (minitConfig.customTextures) {
      Object.keys(minitConfig.customTextures).forEach((k) => {
        keys.push(k);
      });
    }
    await this.bakeKeyList(app, keys);
  }

  static removeMinitTextures(id, minitConfig) {
    const keys = [`minit_${id}_base`];
    if (minitConfig?.textures) {
      Object.keys(minitConfig.textures).forEach((k) => keys.push(`minit_${id}_${k}`));
    }
    if (minitConfig?.customTextures) {
      Object.keys(minitConfig.customTextures).forEach((k) => keys.push(k));
    }
    keys.forEach((k) => {
      delete Textures[k];
    });
  }

  static async bake(app) {
    console.log('  Memulai AssetBaker HD Pixel Edition...');
    const allKeys = Object.keys(MinitEngine.Registry.textures);
    await this.bakeKeyList(app, allKeys);

    // Digits for damage popup numbers (rendered at 2x resolution for HD crispness)
    const digitTasks = [];
    for (let i = 0; i <= 9; i++) {
      digitTasks.push({ key: 'digit_' + i, text: i.toString() });
    }
    digitTasks.push({ key: 'digit_minus', text: '-' });

    for (let i = 0; i < digitTasks.length; i++) {
      const task = digitTasks[i];
      const t = new PIXI.Text(task.text, UI_STYLE.DMG_POPUP);
      t.resolution = 2;
      const tex = app.renderer.generateTexture(t, {
        scaleMode: PIXI.SCALE_MODES.NEAREST,
        resolution: 2
      });
      if (tex?.baseTexture) {
        tex.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
        tex.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
      }
      Textures[task.key] = tex;
      t.destroy();
    }

    console.log('  Semua Asset & Texture siap dalam format HD!');
    return Textures;
  }
}
