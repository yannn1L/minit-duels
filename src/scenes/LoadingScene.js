// ============================================================
// LOADING SCENE (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, UI_STYLE } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AssetBaker, Textures } from '../engine/AssetBaker.js';
import { Shaders } from '../filters/Filters.js';
import { MinitEngine } from '../engine/Registry.js';

export class LoadingScene extends PIXI.Container {
  constructor(app, bgContainer, globalBg, onComplete) {
    super();
    Shaders.init();

    const t = new PIXI.Text('BOOTING SYSTEM...', UI_STYLE.H2);
    t.anchor.set(0.5);
    t.position.set(CFG.APP.W / 2, CFG.APP.H / 2);
    this.addChild(t);

    Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => setTimeout(r, 1200))
    ]).then(async () => {
      await AssetBaker.bake(app);

      if (Textures['bg_grid']) {
        globalBg.texture = Textures['bg_grid'];
      }

      const keys = Object.keys(MinitEngine.Registry.minits);
      const bgFloaters = [];
      const floaterCount = Math.min(keys.length * 2, CFG.BG.FLOATER_COUNT);

      for (let i = 0; i < floaterCount; i++) {
        const id = keys[(Math.random() * keys.length) | 0];
        const tex = Textures[`minit_${id}_base`];
        if (!tex) continue;

        const f = new PIXI.Sprite(tex);
        f.anchor.set(0.5);
        f.scale.set(FastMath.randRange(1.5, 3));
        f.x = Math.random() * window.innerWidth;
        f.y = Math.random() * window.innerHeight;
        f.vx = FastMath.randRange(-CFG.BG.FLOATER_SPEED_X, CFG.BG.FLOATER_SPEED_X);
        f.vy = FastMath.randRange(-CFG.BG.FLOATER_SPEED_Y, CFG.BG.FLOATER_SPEED_Y);
        f.alpha = 0.12;
        f.tint = 0x00ccff;
        bgContainer.addChild(f);
        bgFloaters.push(f);
      }

      let bgAcc = 0;
      const bgTg = 60 / CFG.BG.FPS;

      app.ticker.add((d) => {
        bgAcc += d;
        if (bgAcc >= bgTg) {
          globalBg.tilePosition.x += CFG.BG.GRID_SPEED_X * bgAcc;
          globalBg.tilePosition.y += CFG.BG.GRID_SPEED_Y * bgAcc;
          bgFloaters.forEach((f) => {
            f.x += f.vx * bgAcc;
            f.y += f.vy * bgAcc;
            f.rotation += f.vx * 0.02 * bgAcc;
            if (f.x < -100) f.x = window.innerWidth + 100;
            else if (f.x > window.innerWidth + 100) f.x = -100;
            if (f.y < -100) f.y = window.innerHeight + 100;
            else if (f.y > window.innerHeight + 100) f.y = -100;
          });
          bgAcc = 0;
        }
      });

      window.dispatchEvent(new Event('resize'));
      setTimeout(onComplete, 200);
    });
  }
}
