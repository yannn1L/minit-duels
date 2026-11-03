// ============================================================
// COMPACT CHARACTER SELECT / EDITOR SCENE (ES Module)
// Minimal, Crisp & Responsive (Landscape & Portrait)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';
import { Textures } from '../engine/AssetBaker.js';
import { CustomMinitManager } from '../engine/CustomMinitManager.js';
import { DebugConfig } from '../engine/DebugConfig.js';
import { SceneManager } from '../engine/SceneManager.js';
import { openWorkshopModal } from '../main.js';

export class EditorScene extends PIXI.Container {
  constructor(onStartDuel) {
    super();
    this.sel = [];
    this.cb = onStartDuel;
    this.currentOrientation = null;
    this.scrollOffset = 0;
    this.mSY = 0;

    this.rebuild(SceneManager.getIsLandscape());

    this.unsubscribeDebug = DebugConfig.subscribe(() => {
      this.rebuild(SceneManager.getIsLandscape());
    });

    this._onWheel = (e) => {
      if (!this.sC || this.mSY >= 0) return;
      if (document.querySelector('.mw-backdrop.open')) return;
      this.sC.y = Math.round(Math.min(0, Math.max(this.mSY, this.sC.y - e.deltaY * 0.5)));
      this.scrollOffset = this.sC.y;
    };
    window.addEventListener('wheel', this._onWheel, { passive: true });
  }

  onResize(isLandscape) {
    if (this.currentOrientation !== isLandscape) {
      this.scrollOffset = 0;
      this.rebuild(isLandscape);
    }
  }

  rebuild(isLandscape) {
    this.currentOrientation = isLandscape;
    this.removeChildren();

    // Filter out any deleted custom minit IDs from current selection
    this.sel = this.sel.filter((id) => MinitEngine.Registry.hasMinit(id));

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

    // Single Unified Compact DEV Button (Top-Right)
    const dbgOn = DebugConfig.state.enabled;
    const devLabel = dbgOn ? 'DEV [ON]' : 'DEV';
    const devBtnX = isLandscape ? 836 : 486;
    const devBtnY = 30;
    const devBtn = this._createCompactButton(
      devLabel,
      devBtnX,
      devBtnY,
      dbgOn ? 0x00ff66 : PALETTE.NEON,
      () => openWorkshopModal()
    );
    this.addChild(devBtn);

    // Stationary Scroll Viewport (fixes Portrait bottom-card selection permanently)
    this.sM = new PIXI.Graphics()
      .beginFill(0xffffff)
      .drawRect(L.scroll.x, L.scroll.y, L.scroll.w, L.scroll.h)
      .endFill();
    this.sM.eventMode = 'none';
    this.addChild(this.sM);

    this.scrollViewport = new PIXI.Container();
    this.scrollViewport.position.set(L.scroll.x, L.scroll.y);
    this.scrollViewport.mask = this.sM;
    this.scrollViewport.eventMode = 'static';
    this.scrollViewport.hitArea = new PIXI.Rectangle(0, 0, L.scroll.w, L.scroll.h);
    this.addChild(this.scrollViewport);

    // Transparent hit surface inside viewport for smooth touch/mouse drag scrolling
    const dragBg = new PIXI.Graphics()
      .beginFill(0x000000, 0.001)
      .drawRect(0, 0, L.scroll.w, L.scroll.h)
      .endFill();
    this.scrollViewport.addChild(dragBg);

    this.sC = new PIXI.Container();
    this.scrollViewport.addChild(this.sC);

    // Minimal Fighter Cards Grid
    const mArr = Object.values(MinitEngine.Registry.minits);
    const cCfg = L.card;
    const cW = cCfg.baseW * cCfg.scale;
    const cH = cCfg.baseH * cCfg.scale;
    const cols = cCfg.cols;

    const totW = cols * cW + (cols - 1) * cCfg.gapX;
    const sX = Math.round((L.scroll.w - totW) / 2);

    const numRows = Math.ceil(mArr.length / cols);
    const contentHeight = cCfg.startY + numRows * cH + Math.max(0, numRows - 1) * cCfg.gapY + 12;
    this.mSY = Math.min(0, L.scroll.h - contentHeight);

    mArr.forEach((m, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      let rowStartX = sX;
      if (row === numRows - 1 && mArr.length % cols !== 0) {
        const lastRowCols = mArr.length % cols;
        const lastRowW = lastRowCols * cW + (lastRowCols - 1) * cCfg.gapX;
        rowStartX = Math.round((L.scroll.w - lastRowW) / 2);
      }

      const cd = this._createCard(0, 0, cCfg.baseW, cCfg.baseH, m, cCfg);
      cd.scale.set(cCfg.scale);
      cd.position.set(
        Math.round(rowStartX + col * (cW + cCfg.gapX)),
        Math.round(cCfg.startY + row * (cH + cCfg.gapY))
      );
      this.sC.addChild(cd);
    });

    // Restore scroll position safely
    this.sC.y = Math.round(Math.min(0, Math.max(this.mSY, this.scrollOffset)));

    // Touch & pointer scrolling on `scrollViewport`
    let pointerDown = false;
    let isDragging = false;
    let dragY = 0;
    let baseY = 0;

    this.scrollViewport.on('pointerdown', (e) => {
      if (this.mSY >= 0) return;
      pointerDown = true;
      isDragging = false;
      dragY = e.global.y;
      baseY = this.sC.y;
    });

    this.scrollViewport.on('pointermove', (e) => {
      if (!pointerDown || this.mSY >= 0) return;
      const dy = e.global.y - dragY;
      if (!isDragging && Math.abs(dy) > 8) {
        isDragging = true;
      }
      if (isDragging) {
        const scaleY = this.parent?.scale?.y || 1;
        this.sC.y = Math.round(Math.min(0, Math.max(this.mSY, baseY + dy / scaleY)));
        this.scrollOffset = this.sC.y;
      }
    });

    const releaseDrag = () => {
      pointerDown = false;
      isDragging = false;
    };
    this.scrollViewport.on('pointerup', releaseDrag);
    this.scrollViewport.on('pointerupoutside', releaseDrag);
    this.scrollViewport.on('pointercancel', releaseDrag);

    // Compact Bottom Selection Bar
    const fCfg = L.footer;
    const stT = new PIXI.Text('SELECTED:', { ...UI_STYLE.H2, fill: PALETTE.TEXT });
    stT.resolution = 2;
    stT.anchor.set(0.5, 0.5);
    stT.position.set(fCfg.selectedTxt.x, fCfg.selectedTxt.y);
    this.addChild(stT);

    this.iC = new PIXI.Container();
    this.iC.position.set(fCfg.indicator.x, fCfg.indicator.y);
    this.addChild(this.iC);

    // Start Duel Button (Visible ONLY when 2 fighters are picked)
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
      sp.eventMode = 'static';
      sp.cursor = 'pointer';
      sp.on('pointerdown', (e) => {
        e.stopPropagation();
        AudioSys.init();
        AudioSys.play('click');
        this.sel = this.sel.filter((item) => item !== id);
        this.rebuild(this.currentOrientation);
      });
      this.iC.addChild(sp);
    });
    if (this.bD) {
      this.bD.visible = this.sel.length === 2;
    }
  }

  _createCompactButton(txt, x, y, borderColor, act) {
    const b = new PIXI.Container();
    b.position.set(Math.round(x), Math.round(y));
    b.eventMode = 'static';
    b.cursor = 'pointer';

    const t = new PIXI.Text(txt, {
      ...UI_STYLE.STATS_LARGE,
      fontSize: 8,
      fill: borderColor
    });
    t.resolution = 2;
    t.anchor.set(0.5);

    const bgW = Math.max(64, t.width + 20);
    const bgH = Math.max(28, t.height + 12);
    b.hitArea = new PIXI.Rectangle(-bgW / 2, -bgH / 2, bgW, bgH);

    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(2, borderColor, 1)
      .drawRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 4)
      .endFill();

    b.addChild(bg, t);
    b.on('pointerover', () => {
      bg.tint = 0x55ffaa;
    });
    b.on('pointerout', () => {
      bg.tint = 0xffffff;
    });
    b.on('pointerdown', (e) => {
      e.stopPropagation();
      AudioSys.init();
      AudioSys.play('click');
      act();
    });
    return b;
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
    b.hitArea = new PIXI.Rectangle(-bgW / 2, -bgH / 2, bgW, bgH);

    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(2, PALETTE.NEON, 1)
      .drawRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 4)
      .endFill();

    b.addChild(bg, t);
    b.on('pointerover', () => (bg.tint = 0x55ffaa));
    b.on('pointerout', () => (bg.tint = 0xffffff));
    b.on('pointerdown', (e) => {
      e.stopPropagation();
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
    c.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const isSelected = this.sel.includes(d.id);
    c.isS = isSelected;

    // Minimal card body
    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(2, isSelected ? PALETTE.NEON : PALETTE.BORDER, 1)
      .drawRoundedRect(0, 0, w, h, 4)
      .endFill();
    if (isSelected) {
      bg.tint = 0x162230;
    }

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

    // Custom Minit Delete button directly on the card
    if (MinitEngine.Registry.isCustomMinit(d.id)) {
      const delBtn = new PIXI.Container();
      delBtn.position.set(w - 20, 6);
      delBtn.eventMode = 'static';
      delBtn.cursor = 'pointer';
      delBtn.hitArea = new PIXI.Rectangle(-4, -4, 22, 22);
      const delBg = new PIXI.Graphics()
        .beginFill(0x2a0814, 0.95)
        .lineStyle(1, PALETTE.ALERT, 1)
        .drawRoundedRect(0, 0, 14, 14, 2)
        .endFill();
      const delTxt = new PIXI.Text('X', {
        fontFamily: 'monospace',
        fontSize: 8,
        fontWeight: 'bold',
        fill: PALETTE.ALERT
      });
      delTxt.resolution = 2;
      delTxt.anchor.set(0.5);
      delTxt.position.set(7, 7);
      delBtn.addChild(delBg, delTxt);
      delBtn.on('pointerdown', (e) => {
        e.stopPropagation();
        AudioSys.init();
        AudioSys.play('crush', 0.4);
        CustomMinitManager.deleteCustomMinit(d.id);
        this.rebuild(this.currentOrientation);
      });
      c.addChild(delBtn);
    }

    // Proportional HP Mini Bar
    const hpC = new PIXI.Container();
    hpC.position.set(Math.round(cCfg.hp.x), Math.round(cCfg.hp.y));
    const hpVal = d.stats?.hp || 1000;
    const filledSegs = Math.max(
      2,
      Math.min(cCfg.hp.segments, Math.round((hpVal / 1500) * cCfg.hp.segments))
    );

    const hpBg = new PIXI.Graphics()
      .beginFill(PALETTE.HP.BG)
      .drawRect(0, 0, cCfg.hp.w, cCfg.hp.h)
      .endFill();
    for (let s = 0; s < cCfg.hp.segments; s++) {
      hpBg.beginFill(s < filledSegs ? PALETTE.HP.HIGH : PALETTE.HP.EMPTY);
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

    // Reliable Tap / Click Handler (with generous touch tolerance for mobile Portrait mode)
    c.on('pointerdown', (e) => {
      c.pD = true;
      c.cSX = e.global.x;
      c.cSY = e.global.y;
    });

    c.on('pointerup', (e) => {
      const dx = Math.abs(e.global.x - (c.cSX ?? e.global.x));
      const dy = Math.abs(e.global.y - (c.cSY ?? e.global.y));
      if (c.pD && dx < 16 && dy < 16) {
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

  destroy(options) {
    if (this.unsubscribeDebug) {
      this.unsubscribeDebug();
    }
    if (this._onWheel) {
      window.removeEventListener('wheel', this._onWheel);
    }
    super.destroy(options);
  }
}
