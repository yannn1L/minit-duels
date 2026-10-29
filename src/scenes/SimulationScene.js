// ============================================================
// SIMULATION / COMBAT SCENE (ES Module)
// Responsive & Data-Driven: Supports Landscape & Portrait
// In Landscape: Arena is in center, Minit cards on Left & Right
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';
import { Textures } from '../engine/AssetBaker.js';
import { Arena } from '../engine/Arena.js';
import { getIsLandscape } from '../main.js';

export class SimulationScene extends PIXI.Container {
  constructor(app, selectedMinits, onRestart) {
    super();
    this.app = app;
    this.selectedMinits = selectedMinits;
    this.onRestart = onRestart;
    this.f = false;
    this.isS = false;
    this.currentOrientation = null;

    this.arena = new Arena(selectedMinits, Textures);
    this.uC = [];
    this.playerCards = [];

    this.buildScene(getIsLandscape());

    this.arena.fxPool.initTex();
    AudioSys.play('start');

    this.loopBound = this.loop.bind(this);
    this.app.ticker.add(this.loopBound);
  }

  onResize(isLandscape) {
    if (this.currentOrientation !== isLandscape) {
      this.applyLayout(isLandscape);
    }
  }

  buildScene(isLandscape) {
    this.currentOrientation = isLandscape;
    const L = isLandscape ? CFG.LAYOUT.DUEL.LANDSCAPE : CFG.LAYOUT.DUEL.PORTRAIT;

    // Title
    this.titleText = new PIXI.Text('MINIT DUELS!', UI_STYLE.H1);
    this.titleText.resolution = 2;
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(L.title.x, L.title.y);
    this.addChild(this.titleText);

    // Arena Container (Positioned in exact center for landscape)
    this.aG = new PIXI.Container();
    this.aG.pivot.set((CFG.GRID.COLS * CFG.GRID.TS) / 2, (CFG.GRID.ROWS * CFG.GRID.TS) / 2);
    this.aG.position.set(L.arena.x, L.arena.y);
    this.aG.scale.set(L.arena.scale);
    this.aG.addChild(this.arena);
    this.addChild(this.aG);

    // Build Player Cards
    this.uC = [];
    this.playerCards = [];

    this.selectedMinits.forEach((id, idx) => {
      const md = MinitEngine.Registry.minits[id];
      const cardCfg = idx === 0 ? L.p1_card : L.p2_card;
      const cardContainer = new PIXI.Container();

      this._setupCardContent(cardContainer, md, cardCfg, isLandscape, idx);

      this.playerCards.push(cardContainer);
      this.addChild(cardContainer);
    });
  }

  _setupCardContent(c, md, cardCfg, isLandscape, idx) {
    c.removeChildren();
    c.position.set(Math.round(cardCfg.x), Math.round(cardCfg.y));
    c.pivot.set(cardCfg.width / 2, cardCfg.height / 2);

    // Crisp card body
    const bg = new PIXI.Graphics()
      .beginFill(PALETTE.CARD_BG)
      .lineStyle(2, PALETTE.BORDER, 1)
      .drawRoundedRect(0, 0, cardCfg.width, cardCfg.height, 4)
      .endFill();
    c.addChild(bg);
    c.addChild(new PIXI.Graphics().beginFill(md.color).drawRect(0, 0, cardCfg.width, 3).endFill());

    // 16x16 Pixel Art Icon
    const ic = new PIXI.Sprite(Textures[`minit_${md.id}_base`] || PIXI.Texture.WHITE);
    ic.anchor.set(0.5);
    ic.scale.set(cardCfg.icon.scale);
    ic.position.set(Math.round(cardCfg.icon.x), Math.round(cardCfg.icon.y));
    c.addChild(ic);

    // Minit Name
    const nm = new PIXI.Text(`${md.name}`, { ...UI_STYLE.H3, fill: md.color });
    nm.resolution = 2;
    if (isLandscape) {
      nm.anchor.set(0.5, 0.5);
    }
    nm.position.set(Math.round(cardCfg.name.x), Math.round(cardCfg.name.y));
    c.addChild(nm);

    // HP Bar
    const hpC = new PIXI.Container();
    hpC.position.set(Math.round(cardCfg.hp.x), Math.round(cardCfg.hp.y));

    const hbB = new PIXI.Graphics()
      .beginFill(PALETTE.HP.BG)
      .lineStyle(1, PALETTE.BORDER, 1)
      .drawRect(0, 0, cardCfg.hp.w, cardCfg.hp.h)
      .endFill();

    hbB.beginFill(PALETTE.HP.EMPTY);
    for (let s = 0; s < cardCfg.hp.segments; s++) {
      hbB.drawRect(
        s * (cardCfg.hp.segW + cardCfg.hp.gap),
        0,
        cardCfg.hp.segW,
        cardCfg.hp.h
      );
    }
    hbB.endFill();

    const hbF = new PIXI.Graphics();
    hpC.addChild(hbB, hbF);
    c.addChild(hpC);

    // Description
    const ds = new PIXI.Text(md.desc, {
      ...UI_STYLE.DESC_LARGE,
      wordWrapWidth: cardCfg.desc.wrapWidth
    });
    ds.resolution = 2;
    ds.position.set(Math.round(cardCfg.desc.x), Math.round(cardCfg.desc.y));
    c.addChild(ds);

    // Status debuff icons
    const stC = new PIXI.Container();
    stC.position.set(Math.round(cardCfg.status.x), Math.round(cardCfg.status.y));
    c.addChild(stC);

    for (let i = 0; i < 5; i++) {
      const sic = new PIXI.Sprite();
      sic.width = cardCfg.status.size;
      sic.height = cardCfg.status.size;
      sic.visible = false;
      stC.addChild(sic);
    }

    this.uC[idx] = { fg: hbF, max: md.stats.hp, stC: stC, hpCfg: cardCfg.hp };
  }

  applyLayout(isLandscape) {
    this.currentOrientation = isLandscape;
    const L = isLandscape ? CFG.LAYOUT.DUEL.LANDSCAPE : CFG.LAYOUT.DUEL.PORTRAIT;

    if (this.titleText) {
      this.titleText.position.set(L.title.x, L.title.y);
    }
    if (this.aG) {
      this.aG.position.set(L.arena.x, L.arena.y);
      this.aG.scale.set(L.arena.scale);
    }

    this.selectedMinits.forEach((id, idx) => {
      const md = MinitEngine.Registry.minits[id];
      const cardCfg = idx === 0 ? L.p1_card : L.p2_card;
      const c = this.playerCards[idx];
      if (c) {
        this._setupCardContent(c, md, cardCfg, isLandscape, idx);
      }
    });
  }

  loop(dl) {
    const cDl = Math.min(dl, CFG.SIM.MAX_DT);
    let cS = 1.0 * cDl;

    if (this.isS) {
      if (this.sT > 0) {
        cS = CFG.SIM.SLOWMO_SPEED * cDl;
        this.sT -= cDl;
        if (this.sT <= 0) this.end();
      }
    }

    this.arena.update(cS);

    if (this.f && this.wP && this.sP) {
      const f = (1.0 - this.wP.scale.x) * 0.3;
      this.wV = (this.wV + f) * 0.7;
      this.wP.scale.set(this.wP.scale.x + this.wV);
    }

    let activeCount = 0;
    let winnerId = null;

    this.arena.players.forEach((p, idx) => {
      const ui = this.uC[idx];
      if (!ui) return;
      const pct = Math.max(0, p.hp / ui.max);

      ui.fg.clear();
      if (pct > 0) {
        const fC = pct > 0.6 ? PALETTE.HP.HIGH : pct > 0.3 ? PALETTE.HP.MID : PALETTE.HP.LOW;
        ui.fg.beginFill(fC);
        const hpCfg = ui.hpCfg;
        const aS = Math.ceil(pct * hpCfg.segments);
        for (let s = 0; s < aS; s++) {
          ui.fg.drawRect(s * (hpCfg.segW + hpCfg.gap), 0, hpCfg.segW, hpCfg.h);
        }
        ui.fg.endFill();
      }

      ui.stC.children.forEach((c) => (c.visible = false));
      let sIdx = 0;
      p.activeStatuses.forEach((s) => {
        const ic = ui.stC.children[sIdx];
        if (ic && Textures[s]) {
          ic.texture = Textures[s];
          ic.x = sIdx * (ui.hpCfg.h + 4);
          ic.visible = true;
        }
        sIdx++;
      });

      if (p.hp > 0) {
        activeCount++;
        winnerId = p.def.id;
      }
    });

    if (activeCount <= 1 && !this.isS) {
      this.isS = true;
      this.sT = CFG.SIM.SLOWMO_DUR;
      this.wId = winnerId;
    }
  }

  end() {
    this.f = true;
    AudioSys.play('win');

    const overlay = new PIXI.Graphics()
      .beginFill(0x000000, 0.75)
      .drawRect(-window.innerWidth, -window.innerHeight, window.innerWidth * 3, window.innerHeight * 3)
      .endFill();
    overlay.eventMode = 'static';
    overlay.cursor = 'pointer';

    overlay.on('pointerdown', () => {
      AudioSys.play('click');
      this.cleanup();
      this.onRestart();
    });

    const isLandscape = getIsLandscape();
    const centerX = isLandscape ? CFG.APP.LANDSCAPE.W / 2 : CFG.APP.PORTRAIT.W / 2;
    const centerY = isLandscape ? CFG.APP.LANDSCAPE.H / 2 : CFG.APP.PORTRAIT.H / 2;

    this.wP = new PIXI.Container();
    this.wP.position.set(centerX, centerY);
    this.wP.scale.set(0.1);
    this.wV = 0;

    if (this.wId) {
      const md = MinitEngine.Registry.minits[this.wId];
      const ic = new PIXI.Sprite(Textures[`minit_${md.id}_base`] || PIXI.Texture.WHITE);
      ic.anchor.set(0.5);
      ic.scale.set(5);
      ic.position.set(0, -50);
      this.wP.addChild(ic);

      const nm = new PIXI.Text(`${md.name} WINS!`, { ...UI_STYLE.H1, fill: md.color });
      nm.resolution = 2;
      nm.anchor.set(0.5);
      nm.position.set(0, 40);
      this.wP.addChild(nm);
    } else {
      const nm = new PIXI.Text('DRAW!', { ...UI_STYLE.H1, fill: PALETTE.MUTED });
      nm.resolution = 2;
      nm.anchor.set(0.5);
      nm.position.set(0, 0);
      this.wP.addChild(nm);
    }

    const tip = new PIXI.Text('CLICK ANYWHERE TO REMATCH', UI_STYLE.STATS_LARGE);
    tip.resolution = 2;
    tip.anchor.set(0.5);
    tip.position.set(0, 80);
    this.wP.addChild(tip);

    this.sP = false;
    setTimeout(() => {
      this.addChild(overlay, this.wP);
      this.sP = true;
    }, 60);
  }

  cleanup() {
    if (this.loopBound) {
      this.app.ticker.remove(this.loopBound);
      this.loopBound = null;
    }
  }

  destroy(options) {
    this.cleanup();
    super.destroy(options);
  }
}
