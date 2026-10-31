// ============================================================
// MODULAR BEAM RENDERER (ES Module - Multi-Layer Vector FX)
// ============================================================
import * as PIXI from 'pixi.js';
import { FastMath } from './FastMath.js';
import { CFG } from '../config.js';

export class BeamRenderer {
  constructor(container, fxPool, texturesRef) {
    this.container = container;
    this.fxPool = fxPool;
    this.textures = texturesRef || {};

    // Graphics pool for beam rendering (outer glow, sheath, core, lightning)
    this.beamContainer = new PIXI.Container();
    this.container.addChild(this.beamContainer);

    this.pool = [];
    this.activeBeams = new Map();

    // Pre-allocate graphics instances in pool
    for (let i = 0; i < 12; i++) {
      const g = new PIXI.Graphics();
      g.visible = false;
      this.beamContainer.addChild(g);
      this.pool.push(g);
    }
  }

  getGraphics() {
    let g = this.pool.pop();
    if (!g) {
      g = new PIXI.Graphics();
      this.beamContainer.addChild(g);
    }
    g.visible = true;
    g.alpha = 1;
    return g;
  }

  releaseGraphics(g) {
    g.clear();
    g.visible = false;
    this.pool.push(g);
  }

  /**
   * Render or update an active beam instance
   * @param {string|number} beamId - Unique beam identifier
   * @param {Object} beamData - Beam geometry & styling configuration
   */
  renderBeam(beamId, beamData) {
    let g = this.activeBeams.get(beamId);
    if (!g) {
      g = this.getGraphics();
      this.activeBeams.set(beamId, g);
    }

    g.clear();

    const {
      startX,
      startY,
      endX,
      endY,
      coreColor = 0xffffff,
      glowColor = 0x00e5ff,
      sheathColor = null,
      coreWidth = 4,
      sheathWidth = 12,
      glowWidth = 24,
      glowAlpha = 0.35,
      sheathAlpha = 0.85,
      hasLightning = false,
      lightningColor = 0xffffff,
      lightningBranches = 3,
      jitter = 0,
      taper = true
    } = beamData;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 1) return;

    const normalX = -dy / length;
    const normalY = dx / length;

    // Optional dynamic jitter based on beam energy
    const jX = jitter ? FastMath.randRange(-jitter, jitter) * normalX : 0;
    const jY = jitter ? FastMath.randRange(-jitter, jitter) * normalY : 0;
    const midX = (startX + endX) * 0.5 + jX;
    const midY = (startY + endY) * 0.5 + jY;

    // --------------------------------------------------------
    // LAYER 1: OUTER AURA GLOW (Wide, soft energetic dispersion)
    // --------------------------------------------------------
    g.lineStyle({
      width: glowWidth,
      color: glowColor,
      alpha: glowAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    g.moveTo(startX, startY);
    g.lineTo(midX, midY);
    g.lineTo(endX, endY);

    // --------------------------------------------------------
    // LAYER 2: INNER SHEATH (Vibrant, high-density energy flow)
    // --------------------------------------------------------
    const resolvedSheathColor = sheathColor !== null ? sheathColor : glowColor;
    g.lineStyle({
      width: sheathWidth,
      color: resolvedSheathColor,
      alpha: sheathAlpha,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    g.moveTo(startX, startY);
    g.lineTo(midX, midY);
    g.lineTo(endX, endY);

    // --------------------------------------------------------
    // LAYER 3: SUPER-HEATED CORE (Pure blinding focus line)
    // --------------------------------------------------------
    g.lineStyle({
      width: coreWidth,
      color: coreColor,
      alpha: 1.0,
      cap: PIXI.LINE_CAP.ROUND,
      join: PIXI.LINE_JOIN.ROUND
    });
    g.moveTo(startX, startY);
    g.lineTo(midX, midY);
    g.lineTo(endX, endY);

    // --------------------------------------------------------
    // LAYER 4: PROCEDURAL CRACKLING LIGHTNING ARCS
    // --------------------------------------------------------
    if (hasLightning && length > 20) {
      g.lineStyle({
        width: Math.max(1.5, coreWidth * 0.35),
        color: lightningColor,
        alpha: 0.9,
        cap: PIXI.LINE_CAP.ROUND
      });

      const segments = Math.max(4, Math.min(16, Math.floor(length / 28)));
      const segLength = length / segments;

      for (let b = 0; b < lightningBranches; b++) {
        let prevX = startX;
        let prevY = startY;
        g.moveTo(prevX, prevY);

        for (let i = 1; i <= segments; i++) {
          const ratio = i / segments;
          const baseX = startX + dx * ratio;
          const baseY = startY + dy * ratio;

          // Higher lightning deviation in middle, pinned at ends
          const envelope = Math.sin(ratio * Math.PI);
          const maxDisplace = (sheathWidth * 0.9 + 6) * envelope;
          const arcDisplace = FastMath.randRange(-maxDisplace, maxDisplace);

          const curX = i === segments ? endX : baseX + normalX * arcDisplace;
          const curY = i === segments ? endY : baseY + normalY * arcDisplace;

          g.lineTo(curX, curY);
          prevX = curX;
          prevY = curY;
        }
      }
    }

    // --------------------------------------------------------
    // LAYER 5: MUZZLE CORONA & EMITTER CHARGE RING
    // --------------------------------------------------------
    g.lineStyle({
      width: 2,
      color: resolvedSheathColor,
      alpha: 0.8
    });
    g.beginFill(glowColor, 0.45);
    g.drawCircle(startX, startY, sheathWidth * 0.9 + 2);
    g.endFill();

    g.beginFill(coreColor, 0.95);
    g.drawCircle(startX, startY, coreWidth * 1.2);
    g.endFill();

    // --------------------------------------------------------
    // LAYER 6: IMPACT HALO & BURST AT TARGET ENDPOINT
    // --------------------------------------------------------
    g.lineStyle({
      width: 2,
      color: resolvedSheathColor,
      alpha: 0.85
    });
    g.beginFill(glowColor, 0.5);
    g.drawCircle(endX, endY, sheathWidth * 1.1 + 3);
    g.endFill();

    g.beginFill(coreColor, 1.0);
    g.drawCircle(endX, endY, coreWidth * 1.4);
    g.endFill();
  }

  /**
   * Remove a beam from active rendering
   * @param {string|number} beamId
   */
  removeBeam(beamId) {
    const g = this.activeBeams.get(beamId);
    if (g) {
      this.releaseGraphics(g);
      this.activeBeams.delete(beamId);
    }
  }

  /**
   * Clear all active beams (e.g. on arena reset or match end)
   */
  clear() {
    this.activeBeams.forEach((g) => {
      this.releaseGraphics(g);
    });
    this.activeBeams.clear();
  }

  update(tS) {
    // Retain graphics state; dynamic frame updates are driven by entities
  }
}
