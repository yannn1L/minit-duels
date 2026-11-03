// ============================================================
// COMPACT CHARACTER SELECT / EDITOR SCENE (ES Module)
// Responsive & Data-Driven: Landscape, Portrait, Matchup Dock & Workshop
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

const P1_ACCENT = 0x00e5ff;
const P2_ACCENT = 0xff2a6d;

export class EditorScene extends PIXI.Container {
  constructor(onStartDuel) {
    super();
    this.sel = [];
    this.cb = onStartDuel;
    this.currentOrientation = null;
    this.scrollOffset = 0;
    this.mSY = 0;
    this.cardRefs = new Map();

    this.rebuild(SceneManager.getIsLandscape());

    this.unsubscribeDebug = DebugConfig.subscribe(() => {
      this.rebuild(SceneManager.getIsLandscape());
    });

    this._onWheel = (e) => {
      if (!this.sC || this.mSY >= 0) return;
      if (document.querySelector('.mw-backdrop.open')) return;
      this._setScrollY(this.sC.y - e.deltaY * 0.55);
    };
    window.addEventListener('wheel', this._onWheel, { passive: true });
  }

  onResize(isLandscape) {
    if (this.currentOrientation !== isLandscape) {
      this.scrollOffset = 0;
      this.rebuild(isLandscape);
    }
  }

  _setScrollY(nextY) {
    if (!this.sC) return;
    const clamped = Math.min(0, Math.max(this.mSY, nextY));
    this.sC.y = Math.round(clamped);
    this.scrollOffset = this.sC.y;
    this._updateScrollbarThumb();
  }

  _updateScrollbarThumb() {
    if (!this.scrollThumb || !this.scrollTrackCfg) return;
    if (this.mSY >= 0) {
      this.scrollThumb.visible = false;
      return;
    }
    this.scrollThumb.visible = true;
    const { x, y, h, thumbH } = this.scrollTrackCfg;
    const progress = this.mSY < 0 ? Math.min(1, Math.max(0, this.sC.y / this.mSY)) : 0;
    const availH = Math.max(0, h - thumbH);
    this.scrollThumb.position.set(x, Math.round(y + progress * availH));
  }

  rebuild(isLandscape) {
    this.currentOrientation = isLandscape;
    this.removeChildren();
    this.cardRefs.clear();

    // Filter out any deleted custom minit IDs from current selection
    this.sel = this.sel.filter((id) => MinitEngine.Registry.hasMinit(id));

    const L = isLandscape ? CFG.LAYOUT.EDITOR.LANDSCAPE : CFG.LAYOUT.EDITOR.PORTRAIT;
    const targetDims = isLandscape ? CFG.APP.LANDSCAPE : CFG.APP.PORTRAIT;
    const mArr = Object.values(MinitEngine.Registry.minits);
    const customCount = mArr.filter((m) => MinitEngine.Registry.isCustomMinit(m.id)).length;

    // 1. Tactical Arena Grid Backdrop
    this._buildBackdrop(targetDims.W, targetDims.H, L);

    // 2. Top Header Bar
    this._buildHeader(isLandscape, L, mArr.length, customCount);

    // 3. Scroll Viewport & Minit Cards Grid
    // IMPORTANT: `scrollViewport` stays fixed at (L.scroll.x, L.scroll.y) with a stationary `hitArea`
    // while `this.sC` moves inside it. This guarantees bottom cards in Portrait mode are always selectable!
    const scrollBoxBg = new PIXI.Graphics()
      .beginFill(0x0a0a14, 0.7)
      .lineStyle(1, 0x1e1e32, 0.9)
      .drawRoundedRect(L.scroll.x, L.scroll.y, L.scroll.w, L.scroll.h, 6)
      .endFill();
    scrollBoxBg.eventMode = 'none';
    this.addChild(scrollBoxBg);

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

    // Transparent hit plane inside viewport so dragging between cards also scrolls smoothly
    const dragSurface = new PIXI.Graphics()
      .beginFill(0x000000, 0.001)
      .drawRect(0, 0, L.scroll.w, L.scroll.h)
      .endFill();
    this.scrollViewport.addChild(dragSurface);

    this.sC = new PIXI.Container();
    this.scrollViewport.addChild(this.sC);

    // Build Cards Grid inside `this.sC` (local coordinates relative to `scrollViewport`)
    const cCfg = L.card;
    const cW = cCfg.baseW * cCfg.scale;
    const cH = cCfg.baseH * cCfg.scale;
    const cols = cCfg.cols;

    const totW = cols * cW + (cols - 1) * cCfg.gapX;
    const sX = Math.round((L.scroll.w - totW) / 2);

    const numRows = Math.ceil(mArr.length / cols);
    const contentHeight = cCfg.startY + numRows * cH + Math.max(0, numRows - 1) * cCfg.gapY + 14;
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
      this.cardRefs.set(m.id, cd);
    });

    // Scrollbar Track & Thumb (shown when content exceeds viewport height)
    this._buildScrollbar(L);

    // Restore scroll position safely
    this._setScrollY(this.scrollOffset);

    // Touch & pointer scrolling on `scrollViewport` with threshold so taps never get swallowed
    let pointerDown = false;
    let isDraggingScroll = false;
    let startGlobalY = 0;
    let startScrollY = 0;

    this.scrollViewport.on('pointerdown', (e) => {
      if (this.mSY >= 0) return;
      pointerDown = true;
      isDraggingScroll = false;
      startGlobalY = e.global.y;
      startScrollY = this.sC.y;
    });

    this.scrollViewport.on('pointermove', (e) => {
      if (!pointerDown || this.mSY >= 0) return;
      const dyGlobal = e.global.y - startGlobalY;
      if (!isDraggingScroll && Math.abs(dyGlobal) > 8) {
        isDraggingScroll = true;
      }
      if (isDraggingScroll) {
        const scaleY = this.parent?.scale?.y || 1;
        this._setScrollY(startScrollY + dyGlobal / scaleY);
      }
    });

    const releaseDrag = () => {
      pointerDown = false;
      isDraggingScroll = false;
    };
    this.scrollViewport.on('pointerup', releaseDrag);
    this.scrollViewport.on('pointerupoutside', releaseDrag);
    this.scrollViewport.on('pointercancel', releaseDrag);

    // 4. Bottom Matchup Dock (Interactive P1 & P2 Mini-Cards + Random + Start Duel)
    this.dockContainer = new PIXI.Container();
    this.addChild(this.dockContainer);
    this._refreshSelectionUI();
  }

  _buildBackdrop(W, H, L) {
    const bg = new PIXI.Graphics();

    // Subtle background grid
    bg.lineStyle(1, 0x121222, 0.65);
    const step = 24;
    for (let x = 0; x <= W; x += step) {
      bg.moveTo(x, 0).lineTo(x, H);
    }
    for (let y = 0; y <= H; y += step) {
      bg.moveTo(0, y).lineTo(W, y);
    }

    // Header surface bar
    bg.lineStyle(0)
      .beginFill(0x0b0b15, 0.94)
      .drawRect(0, 0, W, L.scroll.y - 6)
      .endFill();
    bg.lineStyle(1, 0x222238, 1)
      .moveTo(0, L.scroll.y - 6)
      .lineTo(W, L.scroll.y - 6);

    bg.eventMode = 'none';
    this.addChild(bg);
  }

  _buildHeader(isLandscape, L, totalCount, customCount) {
    // Title
    const titleFontSize = isLandscape ? 19 : 15;
    const ttl = new PIXI.Text('MINIT DUELS', {
      ...UI_STYLE.H1,
      fontSize: titleFontSize
    });
    ttl.resolution = 2;
    ttl.anchor.set(0.5, 0);
    ttl.position.set(L.title.x, L.title.y);
    this.addChild(ttl);

    // Subtitle with live roster count
    const subStr =
      customCount > 0
        ? `SELECT 2 FIGHTERS · ${totalCount} ROSTER (${customCount} MOD)`
        : `SELECT 2 FIGHTERS · ${totalCount} MINITS READY`;
    const sub = new PIXI.Text(subStr, {
      ...UI_STYLE.STATS_LARGE,
      fontSize: isLandscape ? 8 : 7,
      fill: 0x94a3b8
    });
    sub.resolution = 2;
    sub.anchor.set(0.5, 0);
    sub.position.set(L.subtitle.x, L.subtitle.y);
    this.addChild(sub);

    // Left Header Button: Balance Check (available in BOTH Landscape & Portrait)
    const balX = isLandscape ? 92 : 68;
    const balY = 30;
    const balBtn = this._createCompactButton(
      isLandscape ? 'BALANCE CHECK' : 'BALANCE',
      balX,
      balY,
      0xffdd00,
      () => openWorkshopModal('balance')
    );
    this.addChild(balBtn);

    // Right Header Button: Workshop / Dev Tools
    const dbgOn = DebugConfig.state.enabled;
    const wsLabel = isLandscape
      ? dbgOn
        ? 'WORKSHOP [DBG]'
        : 'WORKSHOP / MODS'
      : dbgOn
        ? 'MODS [DBG]'
        : 'WORKSHOP';
    const wsX = isLandscape ? 800 : 470;
    const wsY = 30;
    const wsBtn = this._createCompactButton(
      wsLabel,
      wsX,
      wsY,
      dbgOn ? 0x00ff66 : PALETTE.NEON,
      () => openWorkshopModal('minits')
    );
    this.addChild(wsBtn);
  }

  _buildScrollbar(L) {
    const trackX = L.scroll.x + L.scroll.w - 6;
    const trackY = L.scroll.y + 6;
    const trackH = L.scroll.h - 12;

    const track = new PIXI.Graphics()
      .beginFill(0x161626, 0.85)
      .drawRoundedRect(trackX, trackY, 4, trackH, 2)
      .endFill();
    track.visible = this.mSY < 0;
    track.eventMode = 'none';
    this.addChild(track);

    const contentH = L.scroll.h - this.mSY;
    const ratio = contentH > 0 ? Math.max(0.18, Math.min(1, L.scroll.h / contentH)) : 1;
    const thumbH = Math.max(28, Math.round(trackH * ratio));

    this.scrollThumb = new PIXI.Graphics()
      .beginFill(PALETTE.NEON, 0.75)
      .drawRoundedRect(0, 0, 4, thumbH, 2)
      .endFill();
    this.scrollThumb.position.set(trackX, trackY);
    this.scrollThumb.visible = this.mSY < 0;
    this.scrollThumb.eventMode = 'none';
    this.addChild(this.scrollThumb);

    this.scrollTrackCfg = { x: trackX, y: trackY, h: trackH, thumbH };
  }

  _toggleSelectMinit(minitId) {
    const existingIdx = this.sel.indexOf(minitId);
    if (existingIdx !== -1) {
      this.sel.splice(existingIdx, 1);
      AudioSys.init();
      AudioSys.play('click');
      this._refreshSelectionUI();
      return;
    }

    if (this.sel.length < 2) {
      this.sel.push(minitId);
      AudioSys.init();
      AudioSys.play('click');
      this._refreshSelectionUI();
    } else {
      // Replace P2 if 2 are already selected so switching fighters is effortless
      this.sel[1] = minitId;
      AudioSys.init();
      AudioSys.play('click');
      this._refreshSelectionUI();
    }
  }

  _pickRandomMatchup() {
    const ids = Object.keys(MinitEngine.Registry.minits);
    if (ids.length === 0) return;

    AudioSys.init();
    AudioSys.play('click');

    if (ids.length === 1) {
      this.sel = [ids[0], ids[0]];
    } else {
      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      this.sel = [shuffled[0], shuffled[1]];
    }
    this._refreshSelectionUI();
  }

  _refreshSelectionUI() {
    // 1. Update each card's visual selection state (P1 / P2 border, tint & badge)
    this.cardRefs.forEach((card, id) => {
      if (typeof card.updateSelectionState === 'function') {
        const slotIdx = this.sel.indexOf(id); // -1, 0 (P1), or 1 (P2)
        card.updateSelectionState(slotIdx);
      }
    });

    // 2. Rebuild Bottom Matchup Dock
    if (!this.dockContainer) return;
    this.dockContainer.removeChildren();

    const isLandscape = this.currentOrientation;
    const L = isLandscape ? CFG.LAYOUT.EDITOR.LANDSCAPE : CFG.LAYOUT.EDITOR.PORTRAIT;
    const fCfg = L.footer;

    // Dock Panel Surface
    const dockBg = new PIXI.Graphics()
      .beginFill(0x0b0b16, 0.96)
      .lineStyle(2, this.sel.length === 2 ? 0x263850 : 0x1e1e32, 1)
      .drawRoundedRect(fCfg.dock.x, fCfg.dock.y, fCfg.dock.w, fCfg.dock.h, 6)
      .endFill();
    this.dockContainer.addChild(dockBg);

    // P1 Interactive Mini-Card Slot
    const p1Card = this._createDockSlotCard(
      fCfg.p1Slot.x,
      fCfg.p1Slot.y,
      fCfg.p1Slot.w,
      fCfg.p1Slot.h,
      0,
      this.sel[0] || null
    );
    this.dockContainer.addChild(p1Card);

    // VS Emblem
    const vsBadge = new PIXI.Text('VS', {
      ...UI_STYLE.H3,
      fontSize: 10,
      fill: this.sel.length === 2 ? 0xffdd00 : 0x555570
    });
    vsBadge.resolution = 2;
    vsBadge.anchor.set(0.5);
    vsBadge.position.set(fCfg.vsTxt.x, fCfg.vsTxt.y);
    this.dockContainer.addChild(vsBadge);

    // P2 Interactive Mini-Card Slot
    const p2Card = this._createDockSlotCard(
      fCfg.p2Slot.x,
      fCfg.p2Slot.y,
      fCfg.p2Slot.w,
      fCfg.p2Slot.h,
      1,
      this.sel[1] || null
    );
    this.dockContainer.addChild(p2Card);

    // RANDOM Matchup Button
    const rndBtn = this._createActionButton(
      'RANDOM',
      fCfg.btnRandom.x,
      fCfg.btnRandom.y,
      fCfg.btnRandom.w,
      fCfg.btnRandom.h,
      0xffdd00,
      true,
      () => this._pickRandomMatchup()
    );
    this.dockContainer.addChild(rndBtn);

    // START DUEL Button (Always visible; enabled when 2 fighters are chosen)
    const isReady = this.sel.length === 2;
    const duelLabel = isReady
      ? 'START DUEL!'
      : this.sel.length === 1
        ? 'PICK 1 MORE'
        : 'PICK 2 MINITS';

    const duelBtn = this._createActionButton(
      duelLabel,
      fCfg.btnDuel.x,
      fCfg.btnDuel.y,
      fCfg.btnDuel.w,
      fCfg.btnDuel.h,
      isReady ? 0x00ff88 : 0x3b3b54,
      isReady,
      () => {
        if (this.sel.length === 2) {
          AudioSys.init();
          AudioSys.play('start');
          this.cb(this.sel.slice(0, 2));
        }
      }
    );
    this.dockContainer.addChild(duelBtn);
  }

  /**
   * Creates an interactive P1 or P2 mini-card slot in the bottom Matchup Dock.
   * Pressing a filled mini-card deselects that fighter; pressing an empty slot fills it randomly.
   */
  _createDockSlotCard(x, y, w, h, slotIdx, minitId) {
    const slot = new PIXI.Container();
    slot.position.set(Math.round(x), Math.round(y));
    slot.eventMode = 'static';
    slot.cursor = 'pointer';
    slot.hitArea = new PIXI.Rectangle(0, 0, w, h);

    const slotColor = slotIdx === 0 ? P1_ACCENT : P2_ACCENT;
    const slotTag = slotIdx === 0 ? 'P1' : 'P2';
    const minitDef = minitId ? MinitEngine.Registry.getMinit(minitId) : null;

    const bg = new PIXI.Graphics()
      .beginFill(minitDef ? 0x121526 : 0x0d0d18, 0.96)
      .lineStyle(2, minitDef ? slotColor : 0x25253a, 1)
      .drawRoundedRect(0, 0, w, h, 4)
      .endFill();

    // Left slot color stripe
    bg.beginFill(minitDef ? minitDef.color || slotColor : 0x25253a)
      .drawRect(0, 0, 5, h)
      .endFill();
    slot.addChild(bg);

    // Slot Tag Badge (P1 / P2)
    const tagBg = new PIXI.Graphics()
      .beginFill(slotColor, minitDef ? 1 : 0.25)
      .drawRoundedRect(10, 7, 24, 13, 2)
      .endFill();
    const tagTxt = new PIXI.Text(slotTag, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 7,
      fill: minitDef ? 0x05050a : slotColor
    });
    tagTxt.resolution = 2;
    tagTxt.anchor.set(0.5);
    tagTxt.position.set(22, 13.5);
    slot.addChild(tagBg, tagTxt);

    if (minitDef) {
      // Fighter Icon Pedestal
      const iconFrame = new PIXI.Graphics()
        .beginFill(0x090912, 0.9)
        .lineStyle(1, minitDef.color || slotColor, 0.6)
        .drawRoundedRect(40, 12, 44, 44, 4)
        .endFill();
      slot.addChild(iconFrame);

      const sp = new PIXI.Sprite(Textures[`minit_${minitDef.id}_base`] || PIXI.Texture.WHITE);
      sp.anchor.set(0.5);
      sp.scale.set(2.1);
      sp.position.set(62, 34);
      slot.addChild(sp);

      // Fighter Name
      const nm = new PIXI.Text(minitDef.name.toUpperCase(), {
        ...UI_STYLE.H3,
        fontSize: 9,
        fill: minitDef.color || PALETTE.TEXT
      });
      nm.resolution = 2;
      nm.position.set(92, 14);
      slot.addChild(nm);

      // Fighter HP & SPD summary
      const spdVal = Math.round((minitDef.stats?.speed || 0.12) * 100);
      const statTxt = new PIXI.Text(`HP ${minitDef.stats?.hp || 1000} · SPD ${spdVal}`, {
        ...UI_STYLE.STATS_LARGE,
        fontSize: 7,
        fill: 0xb0bac9
      });
      statTxt.resolution = 2;
      statTxt.position.set(92, 32);
      slot.addChild(statTxt);

      // Tap to remove hint
      const hintTxt = new PIXI.Text('TAP TO CLEAR ×', {
        ...UI_STYLE.STATS_LARGE,
        fontSize: 6,
        fill: slotColor
      });
      hintTxt.resolution = 2;
      hintTxt.position.set(92, 48);
      slot.addChild(hintTxt);
    } else {
      const emptyTitle = new PIXI.Text(`${slotTag} FIGHTER SLOT`, {
        ...UI_STYLE.STATS_LARGE,
        fontSize: 8,
        fill: 0x788296
      });
      emptyTitle.resolution = 2;
      emptyTitle.position.set(42, 18);
      slot.addChild(emptyTitle);

      const emptySub = new PIXI.Text('TAP CARD OR TAP HERE', {
        ...UI_STYLE.STATS_LARGE,
        fontSize: 7,
        fill: 0x4c5468
      });
      emptySub.resolution = 2;
      emptySub.position.set(42, 38);
      slot.addChild(emptySub);
    }

    slot.on('pointerover', () => {
      bg.tint = 0xccf4ff;
    });
    slot.on('pointerout', () => {
      bg.tint = 0xffffff;
    });
    slot.on('pointerdown', (e) => {
      e.stopPropagation();
      AudioSys.init();
      AudioSys.play('click');
      if (minitDef) {
        // Deselect this slot
        this.sel.splice(slotIdx, 1);
        this._refreshSelectionUI();
      } else {
        // Pick a random unselected minit into the next open slot
        const allIds = Object.keys(MinitEngine.Registry.minits);
        const avail = allIds.filter((id) => !this.sel.includes(id));
        const pool = avail.length > 0 ? avail : allIds;
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          this.sel.push(pick);
          this._refreshSelectionUI();
        }
      }
    });

    return slot;
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

    const bgW = Math.max(88, t.width + 20);
    const bgH = Math.max(30, t.height + 14);
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

  _createActionButton(txt, x, y, w, h, borderColor, enabled, act) {
    const b = new PIXI.Container();
    b.position.set(Math.round(x), Math.round(y));
    b.eventMode = 'static';
    b.cursor = enabled ? 'pointer' : 'default';
    b.hitArea = new PIXI.Rectangle(-w / 2, -h / 2, w, h);

    const t = new PIXI.Text(txt, {
      ...UI_STYLE.H2,
      fontSize: 11,
      fill: enabled ? PALETTE.TEXT : 0x64647a
    });
    t.resolution = 2;
    t.anchor.set(0.5);

    const bg = new PIXI.Graphics()
      .beginFill(enabled ? 0x101826 : 0x0c0c14)
      .lineStyle(2, borderColor, 1)
      .drawRoundedRect(-w / 2, -h / 2, w, h, 4)
      .endFill();

    b.addChild(bg, t);
    b.on('pointerover', () => {
      if (enabled) bg.tint = 0x66ffcc;
    });
    b.on('pointerout', () => {
      bg.tint = 0xffffff;
    });
    b.on('pointerdown', (e) => {
      e.stopPropagation();
      if (enabled) act();
    });
    return b;
  }

  _createCard(x, y, w, h, d, cCfg) {
    const c = new PIXI.Container();
    c.position.set(x, y);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.hitArea = new PIXI.Rectangle(0, 0, w, h);

    // Base card body
    const bg = new PIXI.Graphics();
    const drawCardBg = (slotIdx, isHovered = false) => {
      bg.clear();
      const isSelected = slotIdx !== -1;
      const borderCol =
        slotIdx === 0
          ? P1_ACCENT
          : slotIdx === 1
            ? P2_ACCENT
            : isHovered
              ? 0x4a5578
              : PALETTE.BORDER;
      const fillCol =
        slotIdx === 0
          ? 0x101d2c
          : slotIdx === 1
            ? 0x241020
            : isHovered
              ? 0x141424
              : PALETTE.CARD_BG;

      bg.beginFill(fillCol, 0.98)
        .lineStyle(2, borderCol, 1)
        .drawRoundedRect(0, 0, w, h, 5)
        .endFill();

      // Subtle header band inside card
      bg.beginFill(0x161626, 0.55)
        .drawRect(4, 2, w - 6, 46)
        .endFill();

      // Left signature color bar
      bg.beginFill(d.color || PALETTE.NEON)
        .drawRect(0, 0, 5, h)
        .endFill();

      if (isSelected) {
        // Corner selection brackets
        const bCol = slotIdx === 0 ? P1_ACCENT : P2_ACCENT;
        bg.beginFill(bCol)
          .drawRect(0, 0, 12, 3)
          .drawRect(0, 0, 3, 12)
          .drawRect(w - 12, 0, 12, 3)
          .drawRect(w - 3, 0, 3, 12)
          .drawRect(0, h - 3, 12, 3)
          .drawRect(0, h - 12, 3, 12)
          .drawRect(w - 12, h - 3, 12, 3)
          .drawRect(w - 3, h - 12, 3, 12)
          .endFill();
      }
    };

    c.addChild(bg);

    // Framed Icon Pedestal
    const pedSize = 38;
    const ped = new PIXI.Graphics()
      .beginFill(0x080810, 0.95)
      .lineStyle(1, d.color || PALETTE.BORDER, 0.45)
      .drawRoundedRect(
        Math.round(cCfg.icon.x - pedSize / 2),
        Math.round(cCfg.icon.y - pedSize / 2),
        pedSize,
        pedSize,
        4
      )
      .endFill();
    c.addChild(ped);

    // 16x16 Pixel Art Icon
    const icTex = Textures[`minit_${d.id}_base`];
    const ic = new PIXI.Sprite(icTex || PIXI.Texture.WHITE);
    ic.anchor.set(0.5);
    ic.scale.set(cCfg.icon.scale);
    ic.position.set(Math.round(cCfg.icon.x), Math.round(cCfg.icon.y));
    c.addChild(ic);

    // Name Label
    const nm = new PIXI.Text(d.name, {
      ...UI_STYLE.H3,
      fontSize: 10,
      fill: d.color || PALETTE.TEXT
    });
    nm.resolution = 2;
    nm.position.set(Math.round(cCfg.name.x), Math.round(cCfg.name.y));
    c.addChild(nm);

    // Proportional HP Segmented Bar
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

    // Numerical Stat Line (HP · SPD · CD)
    const spdVal = Math.round((d.stats?.speed || 0.12) * 100);
    const cdSec = ((d.action?.cd || 120) / 60).toFixed(1);
    const statLine = new PIXI.Text(`HP ${hpVal} · SPD ${spdVal} · CD ${cdSec}s`, {
      ...UI_STYLE.STATS_LARGE,
      fontSize: 6.5,
      fill: 0x94a3b8
    });
    statLine.resolution = 2;
    statLine.position.set(Math.round(cCfg.hp.x), Math.round(cCfg.hp.y + 11));
    c.addChild(statLine);

    // Description text
    const ds = new PIXI.Text(d.desc, {
      ...UI_STYLE.DESC_LARGE,
      fontSize: 7.5,
      lineHeight: 11,
      wordWrapWidth: cCfg.desc.wrapWidth
    });
    ds.resolution = 2;
    ds.position.set(Math.round(cCfg.desc.x), Math.round(cCfg.desc.y));
    c.addChild(ds);

    // P1 / P2 Selection Tag Badge (Top-Right of card)
    const selBadge = new PIXI.Container();
    const isCustom = MinitEngine.Registry.isCustomMinit(d.id);
    const badgeX = isCustom ? w - 50 : w - 30;
    selBadge.position.set(badgeX, 7);
    const selBadgeBg = new PIXI.Graphics();
    const selBadgeTxt = new PIXI.Text('P1', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 7,
      fill: 0x05050a
    });
    selBadgeTxt.resolution = 2;
    selBadgeTxt.anchor.set(0.5);
    selBadgeTxt.position.set(12, 7);
    selBadge.addChild(selBadgeBg, selBadgeTxt);
    selBadge.visible = false;
    c.addChild(selBadge);

    // Custom Minit Delete button directly on the card
    if (isCustom) {
      const delBtn = new PIXI.Container();
      delBtn.position.set(w - 22, 6);
      delBtn.eventMode = 'static';
      delBtn.cursor = 'pointer';
      delBtn.hitArea = new PIXI.Rectangle(-4, -4, 24, 24);
      const delBg = new PIXI.Graphics()
        .beginFill(0x2a0814, 0.95)
        .lineStyle(1, PALETTE.ALERT, 1)
        .drawRoundedRect(0, 0, 16, 14, 2)
        .endFill();
      const delTxt = new PIXI.Text('X', {
        fontFamily: 'monospace',
        fontSize: 9,
        fontWeight: 'bold',
        fill: PALETTE.ALERT
      });
      delTxt.resolution = 2;
      delTxt.anchor.set(0.5);
      delTxt.position.set(8, 7);
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

    let currentSlotIdx = this.sel.indexOf(d.id);
    let isHovered = false;

    c.updateSelectionState = (slotIdx) => {
      currentSlotIdx = slotIdx;
      drawCardBg(currentSlotIdx, isHovered);
      if (slotIdx === 0 || slotIdx === 1) {
        const bCol = slotIdx === 0 ? P1_ACCENT : P2_ACCENT;
        selBadgeBg
          .clear()
          .beginFill(bCol, 1)
          .drawRoundedRect(0, 0, 24, 14, 2)
          .endFill();
        selBadgeTxt.text = slotIdx === 0 ? 'P1' : 'P2';
        selBadge.visible = true;
      } else {
        selBadge.visible = false;
      }
    };

    c.updateSelectionState(currentSlotIdx);

    // Reliable Tap / Click Handler (works with both desktop mouse and mobile portrait touch)
    c.on('pointerdown', (e) => {
      c.pD = true;
      c.cSX = e.global.x;
      c.cSY = e.global.y;
    });

    c.on('pointerup', (e) => {
      const dx = Math.abs(e.global.x - (c.cSX ?? e.global.x));
      const dy = Math.abs(e.global.y - (c.cSY ?? e.global.y));
      if (c.pD && dx < 16 && dy < 16) {
        this._toggleSelectMinit(d.id);
      }
      c.pD = false;
    });

    c.on('pointerover', () => {
      isHovered = true;
      drawCardBg(currentSlotIdx, true);
    });
    c.on('pointerout', () => {
      isHovered = false;
      drawCardBg(currentSlotIdx, false);
    });
    c.on('pointerupoutside', () => {
      c.pD = false;
      isHovered = false;
      drawCardBg(currentSlotIdx, false);
    });

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
