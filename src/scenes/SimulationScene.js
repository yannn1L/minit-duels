// ============================================================
// SIMULATION / COMBAT SCENE (ES Module - Crisp HD Pixel)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitEngine } from '../engine/Registry.js';
import { Textures } from '../engine/AssetBaker.js';
import { Arena } from '../engine/Arena.js';

export class SimulationScene extends PIXI.Container {
  constructor(app, selectedMinits, onRestart) {
    super();
    this.app = app;
    this.onRestart = onRestart;
    this.f = false;
    this.isS = false;
    const l = CFG.LAYOUT.DUEL;

    // Title (High-DPI resolution: 2)
    const tt = new PIXI.Text('MINIT DUELS!', UI_STYLE.H1);
    tt.resolution = 2;
    tt.anchor.set(0.5, 0);
    tt.position.set(l.title.x, l.title.y);
    this.addChild(tt);

    // Arena Container
    const aG = new PIXI.Container();
    aG.pivot.set((CFG.GRID.COLS * CFG.GRID.TS) / 2, (CFG.GRID.ROWS * CFG.GRID.TS) / 2);
    aG.position.set(l.arena.x, l.arena.y);
    aG.scale.set(l.arena.scale);

    this.arena = new Arena(selectedMinits, Textures);
    aG.addChild(this.arena);
    this.addChild(aG);

    // Player UI cards
    this.uC = [];
    selectedMinits.forEach((id, idx) => {
      const md = MinitEngine.Registry.minits[id];
      const cP = idx === 0 ? l.p1_card : l.p2_card;
      const c = new PIXI.Container();
      c.position.set(Math.round(cP.x), Math.round(cP.y));

      const L = CFG.UI.CARD_LAYOUT;
      c.pivot.set(L.BASE_W / 2, L.BASE_H / 2);

      const bg = new PIXI.Graphics()
        .beginFill(PALETTE.CARD_BG)
        .lineStyle(2, PALETTE.BORDER, 1)
        .drawRoundedRect(0, 0, L.BASE_W, L.BASE_H, 4)
        .endFill();
      c.addChild(bg);
      c.addChild(new PIXI.Graphics().beginFill(md.color).drawRect(0, 0, L.BASE_W, 3).endFill());

      const ic = new PIXI.Sprite(Textures[`minit_${md.id}_base`] || PIXI.Texture.WHITE);
      ic.anchor.set(0.5);
      ic.scale.set(L.ICON.SCALE);
      ic.position.set(Math.round(L.ICON.X), Math.round(L.ICON.Y));
      c.addChild(ic);

      const nm = new PIXI.Text(`${md.name}`, { ...UI_STYLE.H3, fill: md.color });
      nm.resolution = 2;
      nm.position.set(Math.round(L.NAME.X), Math.round(L.NAME.Y));
      c.addChild(nm);

      // Status container
      const stC = new PIXI.Container();
      stC.position.set(Math.round(L.NAME.X + nm.width + L.STATUS.OFFSET_X), Math.round(L.NAME.Y + L.STATUS.OFFSET_Y));
      c.addChild(stC);

      for (let i = 0; i < 5; i++) {
        const sic = new PIXI.Sprite();
        sic.width = L.STATUS.SIZE;
        sic.height = L.STATUS.SIZE;
        sic.visible = false;
        stC.addChild(sic);
      }

      // HP Bar with crisp segments
      const hpC = new PIXI.Container();
      hpC.position.set(Math.round(L.HP_BAR.X), Math.round(L.HP_BAR.Y));

      const hbB = new PIXI.Graphics()
        .beginFill(PALETTE.HP.BG)
        .lineStyle(1, PALETTE.BORDER, 1)
        .drawRect(0, 0, L.HP_BAR.W, L.HP_BAR.H)
        .endFill();

      hbB.beginFill(PALETTE.HP.EMPTY);
      for (let s = 0; s < L.HP_BAR.SEGMENTS; s++) {
        hbB.drawRect(
          L.HP_BAR.PAD + s * (L.HP_BAR.SEG_W + L.HP_BAR.GAP),
          L.HP_BAR.PAD,
          L.HP_BAR.SEG_W,
          L.HP_BAR.H - L.HP_BAR.PAD * 2
        );
      }
      hbB.endFill();

      const hbF = new PIXI.Graphics();
      hpC.addChild(hbB, hbF);
      c.addChild(hpC);

      const ds = new PIXI.Text(md.desc, UI_STYLE.DESC_LARGE);
      ds.resolution = 2;
      ds.position.set(Math.round(L.DESC.X), Math.round(L.DESC.Y));
      c.addChild(ds);

      this.uC.push({ fg: hbF, max: md.stats.hp, stC: stC });
      this.addChild(c);
    });

    this.arena.fxPool.initTex();
    AudioSys.play('start');

    this.loopBound = this.loop.bind(this);
    this.app.ticker.add(this.loopBound);
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
      const pct = Math.max(0, p.hp / ui.max);

      ui.fg.clear();
      if (pct > 0) {
        const fC = pct > 0.6 ? PALETTE.HP.HIGH : pct > 0.3 ? PALETTE.HP.MID : PALETTE.HP.LOW;
        ui.fg.beginFill(fC);
        const L = CFG.UI.CARD_LAYOUT.HP_BAR;
        const aS = Math.ceil(pct * L.SEGMENTS);
        for (let s = 0; s < aS; s++) {
          ui.fg.drawRect(L.PAD + s * (L.SEG_W + L.GAP), L.PAD, L.SEG_W, L.H - L.PAD * 2);
        }
        ui.fg.endFill();
      }

      ui.stC.children.forEach((c) => (c.visible = false));
      let sIdx = 0;
      p.activeStatuses.forEach((s) => {
        const ic = ui.stC.children[sIdx];
        if (ic && Textures[s]) {
          ic.texture = Textures[s];
          ic.x = sIdx * (CFG.UI.CARD_LAYOUT.STATUS.SIZE + CFG.UI.CARD_LAYOUT.STATUS.GAP);
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

    this.wP = new PIXI.Container();
    this.wP.position.set(CFG.APP.W / 2, CFG.APP.H / 2);
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
