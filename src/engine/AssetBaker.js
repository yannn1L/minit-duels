// ============================================================
// ASSET BAKER & PNG/SVG LOADER (ES Module - HD Pixel Optimized)
// ============================================================
import * as PIXI from 'pixi.js';
import { UI_STYLE } from '../config.js';
import { MinitEngine } from './Registry.js';
import { MINIT_ICONS } from '../assets/icons.js';

export const Textures = {};

export class AssetBaker {
  static async bake(app) {
    console.log('  Memulai AssetBaker HD Pixel Edition...');
    const gfx = new PIXI.Graphics();
    const proceduralTasks = [];
    const externalLoads = [];

    // Stage 1: Sort between external images (PNG/SVG) and procedural graphics
    for (const k of Object.keys(MinitEngine.Registry.textures)) {
      const v = MinitEngine.Registry.textures[k];
      if (Textures[k]) {
        Textures[k].destroy(true);
        delete Textures[k];
      }

      if (typeof v === 'string') {
        externalLoads.push({ key: k, url: v });
      } else if (typeof v === 'function') {
        proceduralTasks.push({ key: k, generator: v });
      }
    }

    // Stage 2: Load and configure external PNG/SVG assets with strict pixel-art settings
    if (externalLoads.length > 0) {
      console.log(`  Loading ${externalLoads.length} PNG/SVG textures...`);
      await Promise.all(
        externalLoads.map(async ({ key, url }) => {
          try {
            let tex;
            try {
              tex = await PIXI.Assets.load(url);
            } catch (err) {
              tex = PIXI.Texture.from(url);
            }

            // CRITICAL for pixel perfection:
            // 1. NEAREST scale mode - sharp pixel edges
            // 2. CLAMP wrap mode - eliminates texture edge bleeding
            // 3. MIPMAP OFF - prevents downsampling blur
            if (tex?.baseTexture) {
              tex.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
              tex.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
              tex.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
              tex.baseTexture.update();
            }
            Textures[key] = tex;
          } catch (e) {
            console.warn(`Could not load image ${url}, generating procedural fallback for ${key}`, e);
            const minitKey = key.replace('minit_', '').replace('_base', '');
            const fallback = MINIT_ICONS[minitKey];
            if (fallback) {
              gfx.clear();
              fallback(gfx);
              const baked = app.renderer.generateTexture(gfx, {
                scaleMode: PIXI.SCALE_MODES.NEAREST,
                resolution: 2
              });
              if (baked?.baseTexture) {
                baked.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
                baked.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
              }
              Textures[key] = baked;
            }
          }
        })
      );
    }

    // Stage 3: Digits for damage popup numbers (rendered at 2x resolution for HD crispness)
    for (let i = 0; i <= 9; i++) {
      proceduralTasks.push({ key: 'digit_' + i, isText: true, text: i.toString() });
    }
    proceduralTasks.push({ key: 'digit_minus', isText: true, text: '-' });

    // Stage 4: Render procedural textures
    const CHUNK_SIZE = 8;
    for (let i = 0; i < proceduralTasks.length; i++) {
      const task = proceduralTasks[i];
      if (Textures[task.key]) {
        Textures[task.key].destroy(true);
      }

      if (task.isText) {
        const t = new PIXI.Text(task.text, UI_STYLE.DMG_POPUP);
        t.resolution = 2; // Crisp high-DPI text texture
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
      } else {
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
      }

      if ((i + 1) % CHUNK_SIZE === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    gfx.destroy();
    console.log('  Semua Asset & Texture siap dalam format HD!');
    return Textures;
  }
}
