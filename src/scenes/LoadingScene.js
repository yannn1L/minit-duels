// ============================================================
// LOADING SCENE (ES Module - Crisp HD)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, UI_STYLE } from '../config.js';
import { AssetBaker } from '../engine/AssetBaker.js';

export class LoadingScene extends PIXI.Container {
  constructor(app, onComplete) {
    super();

    const t = new PIXI.Text('BOOTING SYSTEM...', UI_STYLE.H2);
    t.resolution = 2;
    t.anchor.set(0.5);
    t.position.set(CFG.APP.W / 2, CFG.APP.H / 2);
    this.addChild(t);

    Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => setTimeout(r, 800))
    ]).then(async () => {
      await AssetBaker.bake(app);
      window.dispatchEvent(new Event('resize'));
      setTimeout(onComplete, 120);
    });
  }
}
