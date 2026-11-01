// ============================================================
// LIVE COMBAT DEBUG OVERLAY & TELEMETRY HUD (ES Module)
// Renders Hitboxes, Zone Radii, Targeting Vectors, Cooldowns & Speed Controls
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { DebugConfig } from './DebugConfig.js';
import { AudioSys } from './AudioSys.js';

export class DebugOverlay extends PIXI.Container {
  constructor(arena, scene) {
    super();
    this.arena = arena;
    this.scene = scene;

    // 1. World-space graphics attached inside arena.layer so it scales & shakes with arena
    this.worldGfx = new PIXI.Graphics();
    this.arena.layer.addChild(this.worldGfx);

    // 2. Per-player floating debug labels inside arena.layer
    this.playerLabels = this.arena.players.map(() => {
      const t = new PIXI.Text('', {
        fontFamily: 'monospace',
        fontSize: 6,
        fill: 0x00ffcc,
        stroke: 0x000000,
        strokeThickness: 2
      });
      t.resolution = 3;
      t.anchor.set(0.5, 1);
      this.arena.layer.addChild(t);
      return t;
    });

    // 3. Screen-space Telemetry Panel & Time-Scale Controller
    this.hudContainer = new PIXI.Container();
    this.addChild(this.hudContainer);

    this.telemetryBg = new PIXI.Graphics();
    this.hudContainer.addChild(this.telemetryBg);

    this.telemetryText = new PIXI.Text('', {
      fontFamily: 'monospace',
      fontSize: 10,
      fill: 0x00ffcc,
      stroke: 0x000000,
      strokeThickness: 2,
      lineHeight: 14
    });
    this.telemetryText.resolution = 2;
    this.telemetryText.position.set(14, 54);
    this.hudContainer.addChild(this.telemetryText);

    // Speed Control Bar
    this.ctrlBar = new PIXI.Container();
    this.hudContainer.addChild(this.ctrlBar);
    this._buildSpeedControls();
  }

  _buildSpeedControls() {
    this.ctrlBar.removeChildren();
    const specs = [
      { label: () => (DebugConfig.state.paused ? 'RESUME' : 'PAUSE'), action: () => DebugConfig.update({ paused: !DebugConfig.state.paused }) },
      { label: () => 'STEP +1', action: () => DebugConfig.update({ paused: true, stepRequested: true }) },
      { label: () => '0.25x', scale: 0.25, action: () => DebugConfig.update({ paused: false, timeScale: 0.25 }) },
      { label: () => '0.5x', scale: 0.5, action: () => DebugConfig.update({ paused: false, timeScale: 0.5 }) },
      { label: () => '1x', scale: 1.0, action: () => DebugConfig.update({ paused: false, timeScale: 1.0 }) },
      { label: () => '2x', scale: 2.0, action: () => DebugConfig.update({ paused: false, timeScale: 2.0 }) },
      { label: () => '4x', scale: 4.0, action: () => DebugConfig.update({ paused: false, timeScale: 4.0 }) }
    ];

    this.speedButtons = [];
    let curX = 14;
    const y = 16;

    specs.forEach((sp) => {
      const btn = new PIXI.Container();
      btn.position.set(curX, y);
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      const txt = new PIXI.Text(sp.label(), {
        ...UI_STYLE.STATS_LARGE,
        fontSize: 7,
        fill: 0xffffff
      });
      txt.resolution = 2;
      txt.anchor.set(0.5);

      const w = Math.max(44, txt.width + 14);
      const h = 22;
      txt.position.set(w / 2, h / 2);

      const bg = new PIXI.Graphics();
      btn.addChild(bg, txt);

      btn.on('pointerdown', (e) => {
        e.stopPropagation();
        AudioSys.play('click');
        sp.action();
        this._refreshSpeedButtonStyles();
      });

      this.ctrlBar.addChild(btn);
      this.speedButtons.push({ btn, bg, txt, w, h, spec: sp });
      curX += w + 6;
    });

    this._refreshSpeedButtonStyles();
  }

  _refreshSpeedButtonStyles() {
    const st = DebugConfig.state;
    this.speedButtons.forEach(({ bg, txt, w, h, spec }) => {
      txt.text = spec.label();
      const isActive =
        (spec.scale !== undefined && !st.paused && Math.abs(st.timeScale - spec.scale) < 0.01) ||
        (spec.scale === undefined && spec.label().includes('RESUME') && st.paused);

      bg.clear();
      bg.beginFill(isActive ? 0x004455 : PALETTE.CARD_BG, 0.92)
        .lineStyle(1.5, isActive ? PALETTE.NEON : PALETTE.BORDER, 1)
        .drawRoundedRect(0, 0, w, h, 3)
        .endFill();
      txt.style.fill = isActive ? PALETTE.NEON : 0xffffff;
    });
  }

  update(fps = 60) {
    const st = DebugConfig.state;
    this.visible = Boolean(st.enabled);
    this.worldGfx.visible = Boolean(st.enabled);

    if (!st.enabled) {
      this.playerLabels.forEach((lbl) => (lbl.visible = false));
      return;
    }

    this._refreshSpeedButtonStyles();
    this.worldGfx.clear();

    // 1. Render Hitboxes, Zone Radii, Targeting & Velocity Vectors
    for (let i = 0; i < this.arena.players.length; i++) {
      const p = this.arena.players[i];
      const lbl = this.playerLabels[i];
      if (p.hp <= 0) {
        if (lbl) lbl.visible = false;
        continue;
      }

      const pX = p.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = p.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      if (st.showHitboxes) {
        // Player collision circle
        this.worldGfx
          .lineStyle(1, p.def.color || 0x00e5ff, 0.85)
          .beginFill(p.def.color || 0x00e5ff, 0.12)
          .drawCircle(pX, pY, 8 * (p.baseScale || 1.0))
          .endFill();
      }

      if (st.showVectors) {
        // Velocity vector arrow
        this.worldGfx
          .lineStyle(1.2, 0x00ff66, 0.9)
          .moveTo(pX, pY)
          .lineTo(pX + p.dx * 65, pY + p.dy * 65);

        // Targeting lock line to closest enemy
        const tgt = this.arena.getValidTarget(p.id, p.def.targeting);
        if (tgt && tgt.hp > 0) {
          const tX = tgt.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
          const tY = tgt.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
          this.worldGfx
            .lineStyle(0.8, p.def.color || 0xffffff, 0.35)
            .moveTo(pX, pY)
            .lineTo(tX, tY);
        }
      }

      if (st.showCooldowns) {
        // Cooldown bar under player
        const maxCd = p.def.action?.cd || 100;
        const cdPct = Math.min(1.0, Math.max(0, p.t / maxCd));
        const barW = 16;
        const barH = 2.5;
        this.worldGfx
          .lineStyle(0.5, 0x000000, 0.9)
          .beginFill(0x111118, 0.85)
          .drawRect(pX - barW / 2, pY + 10, barW, barH)
          .beginFill(0x00e5ff, 0.95)
          .drawRect(pX - barW / 2, pY + 10, barW * cdPct, barH)
          .endFill();

        if (lbl) {
          lbl.visible = true;
          const dMult = (p.dmgMult || 1.0).toFixed(2);
          lbl.text = `${Math.ceil(p.hp)}HP | x${dMult}`;
          lbl.position.set(pX, pY - 10);
        }
      } else if (lbl) {
        lbl.visible = false;
      }
    }

    // Active entity hitboxes & zones
    if (st.showHitboxes) {
      for (let i = 0; i < this.arena.actE.length; i++) {
        const e = this.arena.actE[i];
        const eX = (e.curX ?? e.x) * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const eY = (e.curY ?? e.y) * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const radGrid = e.p?.vfx?.radius || e.p?.payload?.zoneRadius || e.p?.payload?.maxRadius || 0.5;
        const radPx = radGrid * CFG.GRID.TS;

        this.worldGfx
          .lineStyle(0.8, e.p?.color || 0xff0055, 0.7)
          .beginFill(e.p?.color || 0xff0055, 0.08)
          .drawCircle(eX, eY, Math.max(3, radPx))
          .endFill();
      }
    }

    // 2. Render Screen-space Telemetry HUD
    this.telemetryBg.visible = Boolean(st.showTelemetry);
    this.telemetryText.visible = Boolean(st.showTelemetry);

    if (st.showTelemetry) {
      const p1 = this.arena.players[0];
      const p2 = this.arena.players[1];
      const lines = [
        `DEBUG TELEMETRY | FPS: ${Math.round(fps)} | TICKS: ${this.arena.totalTicks} (${(this.arena.totalTicks / 60).toFixed(1)}s)`,
        `ENTITIES: ${this.arena.actE.length} active / ${this.arena.deadE.length} pooled | VFX: ${this.arena.fxPool.act.phys.length} phys`,
        p1
          ? `P1 [${p1.def.name}]: HP ${Math.ceil(p1.hp)}/${p1.maxHp} | DMG Dealt: ${Math.round(p1.telemetry.dmgDealt)} | CD: ${p1.t}/${p1.def.action?.cd || 0}`
          : '',
        p2
          ? `P2 [${p2.def.name}]: HP ${Math.ceil(p2.hp)}/${p2.maxHp} | DMG Dealt: ${Math.round(p2.telemetry.dmgDealt)} | CD: ${p2.t}/${p2.def.action?.cd || 0}`
          : ''
      ];

      if (this.arena.combatLog.length > 0) {
        const recent = this.arena.combatLog.slice(-3).map((c) => `[${c.tick}] ${c.msg}`).join('  ·  ');
        lines.push(`LOG: ${recent}`);
      }

      this.telemetryText.text = lines.filter(Boolean).join('\n');
      this.telemetryBg
        .clear()
        .beginFill(0x07070c, 0.82)
        .lineStyle(1, 0x00e5ff, 0.6)
        .drawRoundedRect(10, 48, this.telemetryText.width + 12, this.telemetryText.height + 10, 4)
        .endFill();
    }
  }

  destroy(options) {
    if (this.worldGfx && !this.worldGfx.destroyed) {
      this.worldGfx.destroy();
    }
    this.worldGfx = null;
    if (this.playerLabels) {
      this.playerLabels.forEach((l) => {
        if (l && !l.destroyed) {
          l.destroy();
        }
      });
      this.playerLabels = [];
    }
    super.destroy(options);
  }
}
