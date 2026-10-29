// ============================================================
// COMPACT CHARACTER SELECT / EDITOR SCENE (ES Module)
// Responsive & Data-Driven: Supports Landscape & Portrait
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';
import { Textures } from '../engine/AssetBaker.js';
import { getIsLandscape } from '../main.js';

export class EditorScene extends PIXI.Container {
  constructor(onStartDuel) {
    super();
    this.sel = [];
    this.cb = onStartDuel;
    this.currentOrientation = null;
    this.rebuild(getIsLandscape());
  }

  onResize(isLandscape) {
    if (this.currentOrientation !== isLandscape) {
      this.rebuild(isLandscape);
    }
  }

  rebuild(isLandscape) {
    this.currentOrientation = isLandscape;
    this.removeChildren();

    // Data-driven layout config
    const L = isLandscape ? CFG.LAYOUT.EDITOR.LANDSCAPE : CFG.LAYOUT.EDITOR.PORTRAIT;

    // Header Title
    const ttl = new PIXI.Text('MINIT DUELS', UI_STYLE.H1);
    ttl.resolution = 2;
    ttl.anchor.set(0.5, 0);
    ttl.position.set(L.title.x, L.title.y);
    this.addChild(ttl);

    // Header Subtitle
    const sub = new PIXI.Text('SELECT 2 MINITS TO DUEL', UI_STYLE.STATS_LARGE);
    sub.resolution = 2;
    sub.anchor.set(0.5, 0);
    sub.position.set(L.subtitle.x, L.subtitle.y);
    this.addChild(sub);

    // Scroll Area
    this.sM = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(L.scroll.x, L.scroll.y, L.scroll.w, L.scroll.h)
      .endFill();
    this.addChild(this.sM);

    this.sC = new PIXI.Container();
    this.sC.mask = this.sM;
    this.sC.eventMode = 'static';
    this.sC.hitArea = new PIXI.Rectangle(L.scroll.x, L.scroll.y, L.scroll.w, L.scroll.h);
    this.addChild(this.sC);

    // Cards Grid
    const mArr = Object.values(MinitEngine.Registry.minits);
    const cCfg = L.card;
    const cW = cCfg.baseW * cCfg.scale;
    const cH = cCfg.baseH * cCfg.scale;
    const cols = cCfg.cols;

    const totW = cols * cW + (cols - 1) * cCfg.gapX;
    const sX = (L.scroll.w - totW) / 2;

    const numRows = Math.ceil(mArr.length / cols);
    const totalContentH = numRows * (cH + cCfg.gapY);
    this.mSY = Math.min(0, L.scroll.h - totalContentH - 20);

    mArr.forEach((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Center cards if the last row has fewer items
      let rowStartX = sX;
      if (row === numRows - 1 && mArr.length % cols !== 0) {
        const lastRowCols = mArr.length % cols;
        const lastRowW = lastRowCols * cW + (lastRowCols - 1) * cCfg.gapX;
        rowStartX = (L.scroll.w - lastRowW) / 2;
      }

      const cd = this._createCard(0, 0, cCfg.baseW, cCfg.baseH, m, cCfg);
      cd.scale.set(cCfg.scale);
      cd.position.set(
        Math.round(rowStartX + col * (cW + cCfg.gapX)),
        Math.round(cCfg.startY + row * (cH + cCfg.gapY))
      );
      this.sC.addChild(cd);
    });

    // Touch & pointer scrolling
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

    // Footer - Selected Indicator Label
    const fCfg = L.footer;
    const stT = new PIXI.Text('SELECTED:', { ...UI_STYLE.H2, fill: PALETTE.TEXT });
    stT.resolution = 2;
    stT.anchor.set(0.5, 0.5);
    stT.position.set(fCfg.selectedTxt.x, fCfg.selectedTxt.y);
    this.addChild(stT);

    // Selected Icons Container
    this.iC = new PIXI.Container();
    this.iC.position.set(fCfg.indicator.x, fCfg.indicator.y);
    this.addChild(this.iC);

    // Start Button
    this.bD = this._createButton('START DUEL!', fCfg.btnDuel.x, fCfg.btnDuel.y, () =>
      this.cb(this.sel.slice(0, 2))
    );
    this.bD.visible = this.sel.length === 2;
    this.addChild(this.bD);

    this._updateSelectedPreview();
  }

  _updateSelectedPreview() {
    if (!this.iC) return;
    this.iC.removeChildren();
    this.sel.forEach((id, idx) => {
      const sp = new PIXI.Sprite(Textures[`minit_${id}_base`] || PIXI.Texture.WHITE);
      sp.anchor.set(0.5);
      sp.scale.set(2.4);
      sp.x = Math.round(idx * 48 - (this.sel.length - 1) * 24);
      this.iC.addChild(sp);
    });
    if (this.bD) {
      this.bD.visible = this.sel.length === 2;
    }
  }

  _createButton(txt, x, y, act) {
    const b = new PIXI.Container();
    b.position.set(Math.round(x), Math.round(y));
    b.eventMode = 'static';
    b.cursor = 'pointer';

    const t = new PIXI.Text(txt, { ...UI_STYLE.H2, fill: PALETTE.TEXT });
    t.resolution = 2;
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

  _createCard(x, y, w, h, d, cCfg) {
    const c = new PIXI.Container();
    c.position.set(x, y);
    c.eventMode = 'static';
    c.cursor = 'pointer';

    const isSelected = this.sel.includes(d.id);
    c.isS = isSelected;

    // Crisp card body
    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(2, isSelected ? PALETTE.NEON : PALETTE.BORDER, 1)
      .drawRoundedRect(0, 0, w, h, 4)
      .endFill();
    const bdr = new PIXI.Graphics().beginFill(d.color).drawRect(0, 0, 4, h).endFill();
    c.addChild(bg, bdr);

    // 16x16 Pixel Art Icon
    const icTex = Textures[`minit_${d.id}_base`];
    const ic = new PIXI.Sprite(icTex || PIXI.Texture.WHITE);
    ic.anchor.set(0.5);
    ic.scale.set(cCfg.icon.scale);
    ic.position.set(Math.round(cCfg.icon.x), Math.round(cCfg.icon.y));
    c.addChild(ic);

    // Name Label
    const nm = new PIXI.Text(d.name, { ...UI_STYLE.H3, fill: d.color });
    nm.resolution = 2;
    nm.position.set(Math.round(cCfg.name.x), Math.round(cCfg.name.y));
    c.addChild(nm);

    // HP Mini Bar
    const hpC = new PIXI.Container();
    hpC.position.set(Math.round(cCfg.hp.x), Math.round(cCfg.hp.y));
    const hpBg = new PIXI.Graphics()
      .beginFill(PALETTE.HP.BG)
      .drawRect(0, 0, cCfg.hp.w, cCfg.hp.h)
      .endFill();
    hpBg.beginFill(PALETTE.HP.HIGH);
    for (let s = 0; s < cCfg.hp.segments; s++) {
      hpBg.drawRect(s * (cCfg.hp.segW + cCfg.hp.gap), 0, cCfg.hp.segW, cCfg.hp.h);
    }
    hpBg.endFill();
    hpC.addChild(hpBg);
    c.addChild(hpC);

    // Description text
    const ds = new PIXI.Text(d.desc, {
      ...UI_STYLE.DESC_LARGE,
      wordWrapWidth: cCfg.desc.wrapWidth
    });
    ds.resolution = 2;
    ds.position.set(Math.round(cCfg.desc.x), Math.round(cCfg.desc.y));
    c.addChild(ds);

    // Corner Selection Indicators
    const cor = new PIXI.Graphics()
      .beginFill(PALETTE.NEON)
      .drawRect(0, 0, 12, 3)
      .drawRect(0, 0, 3, 12)
      .drawRect(w - 12, 0, 12, 3)
      .drawRect(w - 3, 0, 3, 12)
      .drawRect(0, h - 3, 12, 3)
      .drawRect(0, h - 12, 3, 12)
      .drawRect(w - 12, h - 3, 12, 3)
      .drawRect(w - 3, h - 12, 3, 12)
      .endFill();
    cor.visible = isSelected;
    c.addChild(cor);

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
          bg.tint = 0xffffff;
          this.sel = this.sel.filter((id) => id !== d.id);
        } else if (this.sel.length < 2) {
          c.isS = true;
          cor.visible = true;
          bg.tint = 0x162230;
          this.sel.push(d.id);
        }
        this._updateSelectedPreview();
      }
      c.pD = false;
    });

    c.on('pointerover', () => {
      if (!c.isS) bg.tint = 0x161622;
    });
    c.on('pointerout', () => {
      if (!c.isS) bg.tint = 0xffffff;
    });

    c.on('pointerupoutside', () => (c.pD = false));
    return c;
  }
}
