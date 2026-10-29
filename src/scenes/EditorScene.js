// ============================================================
// EDITOR / CHARACTER SELECT SCENE (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';
import { Textures } from '../engine/AssetBaker.js';
import { Shaders } from '../filters/Filters.js';

export class EditorScene extends PIXI.Container {
  constructor(onStartDuel) {
    super();
    this.sel = [];
    this.cb = onStartDuel;
    const l = CFG.LAYOUT.EDITOR;

    // Title
    const ttl = new PIXI.Text('MINIT DUELS', UI_STYLE.H1);
    ttl.anchor.set(0.5, 0);
    ttl.position.set(l.title.x, l.title.y);
    this.addChild(ttl);

    // Subtitle
    const sub = new PIXI.Text('SELECT 2 MINITS TO DUEL', UI_STYLE.STATS_LARGE);
    sub.anchor.set(0.5, 0);
    sub.position.set(l.subtitle.x, l.subtitle.y);
    this.addChild(sub);

    // Scroll mask & container
    this.sM = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(0, CFG.UI.SCROLL.Y, CFG.APP.W, CFG.UI.SCROLL.H)
      .endFill();
    this.addChild(this.sM);

    this.sC = new PIXI.Container();
    this.sC.mask = this.sM;
    this.sC.eventMode = 'static';
    this.sC.hitArea = new PIXI.Rectangle(0, CFG.UI.SCROLL.Y, CFG.APP.W, CFG.UI.SCROLL.H);
    this.addChild(this.sC);

    // Cards Layout
    const L = CFG.UI.CARD_LAYOUT;
    const cW = L.BASE_W * L.SCALE;
    const cH = L.BASE_H * L.SCALE;
    const mArr = Object.values(MinitEngine.Registry.minits);
    const totW = cW * L.COLS + L.GAP_X * (L.COLS - 1);
    const sX = (CFG.APP.W - totW) / 2;
    this.mSY = Math.min(0, CFG.UI.SCROLL.H - Math.ceil(mArr.length / L.COLS) * (cH + L.GAP_Y));

    mArr.forEach((m, i) => {
      const c = i % L.COLS;
      const r = Math.floor(i / L.COLS);
      const cd = this._createCard(0, 0, L.BASE_W, L.BASE_H, m);
      cd.scale.set(L.SCALE);
      cd.position.set(sX + c * (cW + L.GAP_X), L.START_Y + r * (cH + L.GAP_Y));
      this.sC.addChild(cd);
    });

    // Scroll handling
    let dragY = 0;
    let baseY = 0;
    this.sC.on('pointerdown', (e) => {
      dragY = e.global.y;
      baseY = this.sC.y;
    });
    this.sC.on('pointermove', (e) => {
      if (dragY !== 0) {
        this.sC.y = baseY + (e.global.y - dragY);
        this.sC.y = Math.min(0, Math.max(this.mSY, this.sC.y));
      }
    });
    const releaseDrag = () => {
      dragY = 0;
    };
    this.sC.on('pointerup', releaseDrag);
    this.sC.on('pointerupoutside', releaseDrag);

    // Selected indicator
    const stT = new PIXI.Text('SELECTED:', { ...UI_STYLE.H2, fill: PALETTE.TEXT });
    stT.anchor.set(0.5, 0);
    stT.position.set(l.selectedTxt.x, l.selectedTxt.y);
    this.addChild(stT);

    this.iC = new PIXI.Container();
    this.iC.position.set(l.indicator.x, l.indicator.y);
    this.addChild(this.iC);

    // Start button
    this.bD = this._createButton('START DUEL!', l.btnDuel.x, l.btnDuel.y, () =>
      this.cb(this.sel.slice(0, 2))
    );
    this.bD.visible = false;
    this.addChild(this.bD);
  }

  _createButton(txt, x, y, act) {
    const b = new PIXI.Container();
    b.position.set(x, y);
    b.eventMode = 'static';
    b.cursor = 'pointer';

    const t = new PIXI.Text(txt, { ...UI_STYLE.H2, fill: PALETTE.TEXT });
    t.anchor.set(0.5);

    const bgW = t.width + CFG.UI.BTN.PAD_X * 2;
    const bgH = t.height + CFG.UI.BTN.PAD_Y * 2;

    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(2, PALETTE.NEON, 1)
      .drawRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 4)
      .endFill();

    b.addChild(bg, t);
    b.on('pointerover', () => (bg.tint = 0x55ffaa));
    b.on('pointerout', () => (bg.tint = 0xffffff));
    b.on('pointerdown', () => {
      AudioSys.init();
      AudioSys.play('start');
      act();
    });
    return b;
  }

  _createCard(x, y, w, h, d) {
    const L = CFG.UI.CARD_LAYOUT;
    const c = new PIXI.Container();
    c.position.set(x, y);
    c.eventMode = 'static';
    c.cursor = 'pointer';

    // Background
    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(1.5, PALETTE.BORDER, 1)
      .drawRoundedRect(0, 0, w, h, 4)
      .endFill();
    const bdr = new PIXI.Graphics().beginFill(d.color).drawRect(0, 0, 5, h).endFill();
    c.addChild(bg, bdr);

    // Icon
    const icTex = Textures[`minit_${d.id}_base`];
    const ic = new PIXI.Sprite(icTex || PIXI.Texture.WHITE);
    ic.anchor.set(0.5);
    ic.scale.set(L.ICON.SCALE);
    ic.position.set(L.ICON.X, L.ICON.Y);
    c.addChild(ic);

    // Selection corner
    const cor = new PIXI.Graphics()
      .beginFill(PALETTE.NEON)
      .drawRect(0, 0, 14, 4)
      .drawRect(0, 0, 4, 14)
      .drawRect(w - 14, 0, 14, 4)
      .drawRect(w - 4, 0, 4, 14)
      .drawRect(0, h - 4, 14, 4)
      .drawRect(0, h - 14, 4, 14)
      .drawRect(w - 14, h - 4, 14, 4)
      .drawRect(w - 4, h - 14, 4, 14)
      .endFill();
    cor.visible = false;
    c.addChild(cor);

    // Name
    const nm = new PIXI.Text(d.name, { ...UI_STYLE.H3, fill: d.color });
    nm.position.set(L.NAME.X, L.NAME.Y);
    c.addChild(nm);

    // Description
    const ds = new PIXI.Text(d.desc, UI_STYLE.DESC_LARGE);
    ds.position.set(L.DESC.X, L.DESC.Y);
    c.addChild(ds);

    // Click handler
    c.on('pointerdown', (e) => {
      c.pD = true;
      c.cSY = e.global.y;
    });

    c.on('pointerup', (e) => {
      if (c.pD && Math.abs(e.global.y - c.cSY) < 6) {
        AudioSys.init();
        AudioSys.play('click');
        if (c.isS) {
          c.isS = false;
          cor.visible = false;
          this.sel = this.sel.filter((id) => id !== d.id);
        } else if (this.sel.length < 2) {
          c.isS = true;
          cor.visible = true;
          this.sel.push(d.id);
        }

        // Update selected indicators
        this.iC.removeChildren();
        this.sel.forEach((id, idx) => {
          const sp = new PIXI.Sprite(Textures[`minit_${id}_base`]);
          sp.anchor.set(0.5);
          sp.scale.set(2);
          sp.x = idx * 50 - (this.sel.length - 1) * 25;
          this.iC.addChild(sp);
        });

        this.bD.visible = this.sel.length === 2;
      }
      c.pD = false;
    });

    c.on('pointerupoutside', () => (c.pD = false));
    return c;
  }
}
