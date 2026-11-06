// ============================================================
// MODULAR MULTI-LAYER CONNECTED VFX & COMBAT JUICE POOL (ES Module)
// Supports both:
//  - Classic Sprite VFX Mode (for bespoke Minit textures like Absorb's singularity,
//    or when Connected Layered FX is toggled OFF in Settings)
//  - Smooth Connected 3-Layer VFX Mode (for Shockwaves, Scorch Craters, and
//    opt-in Multi-Ring Zones like Schrodinger's Probability Clouds)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { DebugConfig } from './DebugConfig.js';

// Opt-in ring/cloud textures that are designed to merge into connected 3-layer fields
// when `vfxConnectedLayers` is enabled. (Note: Bespoke Minit art like `fx_absorb_ring`
// and `fx_absorb_core` is intentionally NOT overridden here so Absorb keeps its
// authentic singularity artwork!)
const CONNECTED_RING_PRESETS = {
  fx_schro_cloud_ring: {
    radius: 30,
    width: 2.2,
    color: 0x00ffcc,
    secondaryColor: 0xff00aa,
    fillAlpha: 0.22,
    dedupeDist: 28
  }
};

// Stationary floor/containment textures that should render on the under-unit sprite layer
// (`underParticleLayer`) so they never obscure Minit fighter sprites.
const UNDER_UNIT_SPRITE_TEXTURES = new Set([
  'fx_absorb_ring',
  'fx_absorb_core',
  'fx_waves_aura_ring',
  'fx_pulsar_drone_halo',
  'fx_moth_wing_aura',
  'fx_saitama_pressure_ring',
  'fx_schro_box',
  'fx_schro_cloud_ring'
]);

/**
 * Computes uncovered exterior angular intervals [startAngle, endAngle] AND intersection
 * junction points for circle `i` when overlapped by other circles.
 * Ignores nearly faded-out circles (`norm <= 0.2`) so expiring rings never cause hard pops.
 */
function computeSmoothExteriorArcs(circle, allCircles, selfIdx, junctionsOut = null) {
  const r1 = circle.r;
  if (r1 <= 0.5) return [];

  const blocked = [];

  for (let j = 0; j < allCircles.length; j++) {
    if (j === selfIdx) continue;
    const other = allCircles[j];
    const r2 = other.r;
    if (r2 <= 0.5 || (other.renderNorm !== undefined && other.renderNorm <= 0.2)) continue;

    const dx = other.x - circle.x;
    const dy = other.y - circle.y;
    const dSq = dx * dx + dy * dy;
    const d = Math.sqrt(dSq);

    // Nearly concentric circles: keep the larger circle's outer boundary
    if (d < 0.001) {
      if (r2 > r1 || (r2 === r1 && j < selfIdx)) {
        return [];
      }
      continue;
    }

    // Disjoint circles
    if (d >= r1 + r2) continue;

    // Circle i is completely enclosed inside circle j
    if (d + r1 <= r2) {
      return [];
    }

    // Circle j is completely enclosed inside circle i
    if (d + r2 <= r1) {
      continue;
    }

    // Partial overlap: calculate angular span on circle i covered by circle j
    const cosHalf = FastMath.clamp((r1 * r1 + dSq - r2 * r2) / (2 * r1 * d), -1, 1);
    const halfSpan = Math.acos(cosHalf);
    if (halfSpan <= 0.002) continue;

    let mid = Math.atan2(dy, dx);
    if (mid < 0) mid += FastMath.TWO_PI;

    const a1 = mid - halfSpan;
    const a2 = mid + halfSpan;

    // Record intersection junction points once (for selfIdx < j) to draw smooth bridge fillets
    if (junctionsOut && selfIdx < j) {
      const jAlpha = Math.min(circle.renderNorm ?? 1, other.renderNorm ?? 1);
      junctionsOut.push(
        {
          x: circle.x + Math.cos(a1) * r1,
          y: circle.y + Math.sin(a1) * r1,
          color: circle.color,
          alpha: jAlpha
        },
        {
          x: circle.x + Math.cos(a2) * r1,
          y: circle.y + Math.sin(a2) * r1,
          color: other.color,
          alpha: jAlpha
        }
      );
    }

    if (a1 < 0) {
      blocked.push([a1 + FastMath.TWO_PI, FastMath.TWO_PI]);
      blocked.push([0, a2]);
    } else if (a2 > FastMath.TWO_PI) {
      blocked.push([a1, FastMath.TWO_PI]);
      blocked.push([0, a2 - FastMath.TWO_PI]);
    } else {
      blocked.push([a1, a2]);
    }
  }

  if (blocked.length === 0) {
    return [[0, FastMath.TWO_PI]];
  }

  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [blocked[0]];
  for (let k = 1; k < blocked.length; k++) {
    const cur = blocked[k];
    const last = merged[merged.length - 1];
    if (cur[0] <= last[1] + 0.006) {
      if (cur[1] > last[1]) last[1] = cur[1];
    } else {
      merged.push(cur);
    }
  }

  const visible = [];
  let cursor = 0;
  for (let k = 0; k < merged.length; k++) {
    const [bStart, bEnd] = merged[k];
    if (bStart > cursor + 0.01) {
      visible.push([cursor, bStart]);
    }
    cursor = Math.max(cursor, bEnd);
  }
  if (cursor < FastMath.TWO_PI - 0.01) {
    visible.push([cursor, FastMath.TWO_PI]);
  }

  return visible;
}

export class VFXPool {
  constructor(cU, cO, texturesRef) {
    this.cU = cU; // Under-unit container (scorch marks, connected rings, under-unit sprites, afterimages)
    this.cO = cO; // Over-unit container (crisp hit sparks, projectiles, damage popups)
    this.textures = texturesRef;
    this.rollingFps = 60;
    this.customRingPresets = { ...CONNECTED_RING_PRESETS };

    // ============================================================
    // UNDER-FIGHTER LAYER HIERARCHY (Never covers Minit fighters)
    // ============================================================
    // 1. Connected Floor Scorch Vector Layer (when Connected Layers ON)
    this.scorchGfx = new PIXI.Graphics();
    this.cU.addChild(this.scorchGfx);

    // 2. Under-Unit Decals & Afterimage Ghosts (also hosts classic scorch sprites when Connected Layers OFF)
    this.decalLayer = new PIXI.Container();
    this.cU.addChild(this.decalLayer);

    // 3. Connected Ring / Zone Layer — PART 2: Middle Core Fill (translucent, non-stacking)
    this.ringMiddleGfx = new PIXI.Graphics();
    this.cU.addChild(this.ringMiddleGfx);

    // 4. Connected Ring / Zone Layer — PART 1: Smooth Feathered Outer Perimeter Outline
    this.ringOutlineGfx = new PIXI.Graphics();
    this.cU.addChild(this.ringOutlineGfx);

    // 5. Classic Sprite Shockwave Layer (placed under fighters so even classic mode never blinds combat)
    this.shockwaveLayer = new PIXI.Container();
    this.cU.addChild(this.shockwaveLayer);

    // 6. Under-Unit Bespoke Sprites (e.g., Absorb Singularity Core/Ring, Schrodinger Box, Auras)
    this.underParticleLayer = new PIXI.Container();
    this.cU.addChild(this.underParticleLayer);

    // ============================================================
    // OVER-FIGHTER LAYER HIERARCHY (Crisp accents & combat popups)
    // ============================================================
    // 7. Connected Ring / Combat Layer — PART 3: Crisp Particles & Projectiles
    this.overParticleLayer = new PIXI.Container();
    this.cO.addChild(this.overParticleLayer);

    // 8. Floating Damage / Crit / Heal Popups
    this.textLayer = new PIXI.Container();
    this.cO.addChild(this.textLayer);

    this.pool = { phys: [], sws: [], swSprites: [], txts: [], decals: [], scorches: [] };
    this.act = { phys: [], sws: [], swSprites: [], txts: [], decals: [], scorches: [] };

    // 1. Physics & Spark Sprites Pool
    const physLimit = CFG.VFX.PHYSICS_LIMIT || 600;
    for (let i = 0; i < physLimit; i++) {
      const s = new PIXI.Sprite();
      s.visible = false;
      s.anchor.set(0.5);
      s.currentLayer = 'over';
      this.overParticleLayer.addChild(s);
      this.pool.phys.push(s);
    }

    // 2. Under-Unit Afterimage Ghosts & Classic Scorch Decals Pool
    const decalLimit = CFG.VFX.DECAL_LIMIT || 140;
    for (let i = 0; i < decalLimit; i++) {
      const d = new PIXI.Sprite();
      d.visible = false;
      d.anchor.set(0.5);
      this.decalLayer.addChild(d);
      this.pool.decals.push(d);
    }

    // 3A. Connected Ring / Zone State Pool (used when vfxConnectedLayers === true)
    const swLimit = (CFG.VFX.SHOCKWAVE_LIMIT || 36) + 20;
    for (let i = 0; i < swLimit; i++) {
      this.pool.sws.push({
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        r: 4,
        mR: 40,
        width: 3,
        color: 0x00e5ff,
        secondaryColor: 0xffffff,
        fillAlpha: 0.26,
        ease: 0.24,
        life: 0,
        maxL: 20,
        age: 0,
        isZone: false,
        isDarkCore: false,
        renderNorm: 1
      });
    }

    // 3B. Classic Sprite Shockwaves Pool (used when vfxConnectedLayers === false)
    for (let i = 0; i < 36; i++) {
      const swSpr = new PIXI.Sprite();
      swSpr.anchor.set(0.5);
      swSpr.visible = false;
      swSpr.blendMode = PIXI.BLEND_MODES.ADD;
      this.shockwaveLayer.addChild(swSpr);
      this.pool.swSprites.push(swSpr);
    }

    // 4. Connected Scorch Crater State Pool (used when vfxConnectedLayers === true)
    for (let i = 0; i < 32; i++) {
      this.pool.scorches.push({
        x: 0,
        y: 0,
        r: 14,
        targetR: 14,
        color: 0x00e5ff,
        life: 0,
        maxL: 200,
        renderNorm: 1
      });
    }

    // 5. Damage / Critical / Heal Text Containers Pool (7 glyphs)
    const textLimit = CFG.VFX.TEXT_LIMIT || 48;
    for (let i = 0; i < textLimit; i++) {
      const ct = new PIXI.Container();
      ct.visible = false;
      for (let j = 0; j < 7; j++) {
        const d = new PIXI.Sprite();
        d.anchor.set(0.5);
        d.x = j * CFG.VFX.DMG_TEXT.CHAR_SPACING;
        ct.addChild(d);
      }
      this.textLayer.addChild(ct);
      this.pool.txts.push(ct);
    }
  }

  initTex() {
    const ringTex = this.textures['fx_ring'];
    if (ringTex) {
      this.pool.swSprites.forEach((sw) => {
        sw.texture = ringTex;
      });
    }
  }

  /**
   * Allows any custom Minit to register a texture key to use the Connected 3-Layer Ring system.
   */
  registerConnectedRingTexture(texKey, presetConfig = {}) {
    if (!texKey) return;
    this.customRingPresets[texKey] = {
      radius: presetConfig.radius ?? 28,
      width: presetConfig.width ?? 2.2,
      color: presetConfig.color ?? 0x00e5ff,
      secondaryColor: presetConfig.secondaryColor ?? 0xffffff,
      fillAlpha: presetConfig.fillAlpha ?? 0.24,
      dedupeDist: presetConfig.dedupeDist ?? 24
    };
  }

  getBudgetMult() {
    const mode = DebugConfig.state.vfxQuality || 'auto';
    const userMult = DebugConfig.state.vfxParticleMult ?? 1.0;
    if (mode === 'high') return 1.0 * userMult;
    if (mode === 'low') return 0.38 * userMult;

    const poolLoad = this.act.phys.length / (CFG.VFX.PHYSICS_LIMIT || 600);
    let mult = 1.0;
    if (this.rollingFps < 54) {
      mult = Math.max(0.38, (this.rollingFps - 30) / 24);
    }
    if (poolLoad > 0.72) {
      mult *= 0.65;
    }
    return mult * userMult;
  }

  getCrowdDamping(activeCount, threshold = 4, maxCount = 16) {
    if (DebugConfig.state.vfxCrowdAutoFade === false) return 1.0;
    if (activeCount <= threshold) return 1.0;
    const excess = Math.min(1.0, (activeCount - threshold) / (maxCount - threshold));
    return 1.0 - excess * 0.62;
  }

  /**
   * Spawns a physics sprite or routes opt-in ring presets to the Connected 3-Layer Ring compositor.
   * Bespoke Minit textures (such as Absorb's `fx_absorb_core` and `fx_absorb_ring`) are preserved
   * as authentic sprites on the under-unit layer unless explicitly opted into `connectedRing`.
   */
  spawnPhysics(
    texKey,
    x,
    y,
    vx,
    vy,
    life,
    dragX = CFG.PHYSICS.DRAG_X,
    dragY = CFG.PHYSICS.DRAG_Y,
    scaleDown = false,
    tint = 0xffffff,
    baseAlpha = 1.0,
    extra = null
  ) {
    const useConnected = DebugConfig.state.vfxConnectedLayers !== false;
    const optInPreset =
      extra?.connectedRing === false
        ? null
        : extra?.connectedRing
          ? {
              radius: extra.radius ?? 28,
              width: extra.width ?? 2.2,
              color: tint !== 0xffffff ? tint : (extra.color ?? 0x00e5ff),
              secondaryColor: extra.secondaryColor ?? 0xffffff,
              fillAlpha: extra.fillAlpha ?? 0.24,
              dedupeDist: extra.dedupeDist ?? 24
            }
          : this.customRingPresets[texKey];

    // Route opt-in multi-ring clouds (like Schrodinger's `fx_schro_cloud_ring`) to the Connected Ring Layer
    // when Connected Layered FX is enabled in Settings!
    if (useConnected && optInPreset && vx === 0 && vy === 0) {
      const col = tint !== 0xffffff ? tint : optInPreset.color;
      this.spawnZoneRing(x, y, optInPreset.radius * (extra?.scale ?? 1.0), col, {
        width: optInPreset.width,
        secondaryColor: optInPreset.secondaryColor,
        life: Math.max(3, life + 1),
        fillAlpha: optInPreset.fillAlpha * baseAlpha,
        dedupeDist: optInPreset.dedupeDist
      });
      return null;
    }

    if (this.pool.phys.length === 0) return null;

    const budget = this.getBudgetMult();
    if (budget < 0.95 && (!extra || !extra.forceSpawn)) {
      if (FastMath.rand() > budget) return null;
    }

    const tex = this.textures[texKey] || this.textures['fx_spark'] || this.textures['fx_dust'];
    if (!tex) return null;

    // Place stationary floor/aura/containment sprites (like Absorb's vortex or Schrodinger's box)
    // on `underParticleLayer` so they never cover Minit fighter sprites.
    const placeUnder =
      extra?.underUnit !== undefined
        ? Boolean(extra.underUnit)
        : vx === 0 && vy === 0 && UNDER_UNIT_SPRITE_TEXTURES.has(texKey);

    // Deduplicate stationary per-frame sprites (e.g., when a trait spawns a `life: 2` sprite every frame
    // at the same spot) so they don't double-stack alpha or flicker!
    if (placeUnder && vx === 0 && vy === 0 && life <= 4) {
      for (let i = this.act.phys.length - 1; i >= 0; i--) {
        const activeSpr = this.act.phys[i];
        if (
          activeSpr.texKey === texKey &&
          Math.abs(activeSpr.x - x) < 18 &&
          Math.abs(activeSpr.y - y) < 18
        ) {
          activeSpr.x = FastMath.lerp(activeSpr.x, x, 0.45);
          activeSpr.y = FastMath.lerp(activeSpr.y, y, 0.45);
          activeSpr.life = Math.max(activeSpr.life, life);
          activeSpr.maxL = Math.max(activeSpr.maxL, life);
          activeSpr.tint = tint;
          if (extra?.scale !== undefined) activeSpr.scale.set(extra.scale);
          if (extra?.rotation !== undefined) activeSpr.rotation = extra.rotation;
          return activeSpr;
        }
      }
    }

    const s = this.pool.phys.pop();
    const targetLayerName = placeUnder ? 'under' : 'over';
    if (s.currentLayer !== targetLayerName) {
      s.currentLayer = targetLayerName;
      if (placeUnder) {
        this.underParticleLayer.addChild(s);
      } else {
        this.overParticleLayer.addChild(s);
      }
    }

    s.texKey = texKey;
    s.texture = tex;
    s.x = x;
    s.y = y;
    s.vx = vx;
    s.vy = vy;
    s.life = life;
    s.maxL = Math.max(1, life);
    s.dragX = dragX;
    s.dragY = dragY;
    s.sD = scaleDown;
    s.tint = tint;
    s.baseAlpha = placeUnder && texKey === 'fx_schro_cloud_ring' ? Math.min(0.38, baseAlpha) : baseAlpha;
    s.visible = true;
    s.alpha = s.baseAlpha;

    const isLightTex =
      texKey === 'fx_spark' ||
      texKey === 'fx_glow' ||
      texKey === 'fx_ember' ||
      texKey === 'fx_star';

    const useAdditive =
      placeUnder && (texKey === 'fx_schro_box' || texKey === 'fx_schro_cloud_ring')
        ? false
        : extra?.additive !== undefined
          ? extra.additive
          : isLightTex;
    s.blendMode = useAdditive ? PIXI.BLEND_MODES.ADD : PIXI.BLEND_MODES.NORMAL;

    const speed = Math.hypot(vx, vy);
    s.alignToVel =
      extra?.alignToVel !== undefined ? extra.alignToVel : texKey === 'fx_spark' && speed > 0.35;
    s.stretchFactor = extra?.stretchFactor ?? (texKey === 'fx_spark' ? 0.32 : 0);
    s.baseScale = extra?.scale ?? 1.0;
    s.grav = extra?.grav !== undefined ? extra.grav : texKey === 'fx_glow' || placeUnder ? 0 : 0.22;
    s.vRot =
      extra?.vRot !== undefined
        ? extra.vRot
        : s.alignToVel || placeUnder
          ? 0
          : FastMath.randRange(-0.14, 0.14);

    if (s.alignToVel) {
      s.rotation = Math.atan2(vy, vx);
      const stretch = Math.min(2.8, 1.0 + speed * s.stretchFactor);
      s.scale.set(s.baseScale * stretch, s.baseScale * Math.max(0.55, 1.0 - speed * 0.05));
    } else {
      s.rotation = extra?.rotation !== undefined ? extra.rotation : FastMath.rand() * 6.28;
      s.scale.set(s.baseScale);
    }

    this.act.phys.push(s);
    return s;
  }

  /**
   * Emits a directional cone of high-velocity sparks, glowing embers, and a soft core flash.
   */
  spawnSparkBurst(
    x,
    y,
    angle = null,
    color = 0x00e5ff,
    count = 8,
    speed = 4.2,
    spread = 1.15,
    life = 20
  ) {
    const budget = this.getBudgetMult();
    const scaledCount = Math.max(2, Math.round(count * budget));

    this.spawnGlow(x, y, color, 0.72, 9, 0.5);

    for (let i = 0; i < scaledCount; i++) {
      const a =
        angle !== null && angle !== undefined
          ? angle + FastMath.randRange(-spread, spread)
          : FastMath.randRange(0, FastMath.TWO_PI);
      const spd = FastMath.randRange(speed * 0.35, speed * 1.25);
      const isCoreWhite = i % 3 === 0;
      const pTex = i % 4 === 3 ? 'fx_ember' : 'fx_spark';

      this.spawnPhysics(
        pTex,
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        FastMath.randRange(life * 0.65, life * 1.2),
        0.88,
        0.88,
        true,
        isCoreWhite ? 0xffffff : color,
        1.0,
        {
          additive: true,
          alignToVel: pTex === 'fx_spark',
          stretchFactor: 0.36,
          scale: isCoreWhite ? 0.85 : 1.05,
          grav: pTex === 'fx_ember' ? -0.06 : 0.14,
          forceSpawn: true
        }
      );
    }
  }

  spawnGlow(x, y, color = 0x00e5ff, scale = 1.0, life = 14, alpha = 0.55) {
    return this.spawnPhysics('fx_glow', x, y, 0, 0, life, 1, 1, true, color, alpha, {
      additive: true,
      alignToVel: false,
      scale,
      grav: 0,
      vRot: 0
    });
  }

  spawnAfterimage(
    textureOrKey,
    x,
    y,
    scaleX = 1.0,
    scaleY = 1.0,
    rotation = 0,
    tint = 0x00e5ff,
    alpha = 0.45,
    life = 12,
    additive = true
  ) {
    if (DebugConfig.state.vfxShowAfterimages === false) return null;
    if (this.pool.decals.length === 0) return null;
    if ((DebugConfig.state.vfxQuality || 'auto') === 'low' && FastMath.rand() > 0.5) return null;

    const tex = typeof textureOrKey === 'string' ? this.textures[textureOrKey] : textureOrKey;
    if (!tex) return null;

    const d = this.pool.decals.pop();
    d.texture = tex;
    d.x = x;
    d.y = y;
    d.scale.set(scaleX, scaleY);
    d.rotation = rotation;
    d.tint = tint;
    d.baseAlpha = alpha;
    d.alpha = alpha;
    d.life = life;
    d.maxL = Math.max(1, life);
    d.shrink = true;
    d.startScaleX = scaleX;
    d.startScaleY = scaleY;
    d.blendMode = additive ? PIXI.BLEND_MODES.ADD : PIXI.BLEND_MODES.NORMAL;
    d.visible = true;
    this.act.decals.push(d);
    return d;
  }

  /**
   * Stamps a floor scorch mark under units.
   * - When `vfxConnectedLayers` is ON: merges nearby scorches into smooth connected craters.
   * - When `vfxConnectedLayers` is OFF: stamps classic `fx_scorch` decal sprites.
   */
  spawnScorch(x, y, color = 0x00e5ff, scale = 1.1, life = 200) {
    if (DebugConfig.state.vfxShowScorch === false) return null;

    // Classic sprite scorch mode when Connected Layered FX is toggled OFF
    if (DebugConfig.state.vfxConnectedLayers === false) {
      if (this.pool.decals.length === 0) return null;
      const tex = this.textures['fx_scorch'];
      if (!tex) return null;
      const d = this.pool.decals.pop();
      d.texture = tex;
      d.x = x;
      d.y = y;
      d.scale.set(scale);
      d.rotation = FastMath.rand() * 6.28;
      d.tint = color;
      d.baseAlpha = 0.55 * (DebugConfig.state.vfxScorchAlpha ?? 0.45);
      d.alpha = d.baseAlpha;
      d.life = life;
      d.maxL = Math.max(1, life);
      d.shrink = false;
      d.startScaleX = scale;
      d.startScaleY = scale;
      d.blendMode = PIXI.BLEND_MODES.NORMAL;
      d.visible = true;
      this.act.decals.push(d);
      return d;
    }

    const targetR = FastMath.clamp(scale * 16, 8, 34);

    // Spatial Merge: if a scorch crater already exists nearby, smoothly fuse into it
    for (let i = 0; i < this.act.scorches.length; i++) {
      const ex = this.act.scorches[i];
      const dSq = FastMath.distSq(x, y, ex.x, ex.y);
      if (dSq < 22 * 22) {
        ex.x = ex.x * 0.7 + x * 0.3;
        ex.y = ex.y * 0.7 + y * 0.3;
        ex.targetR = Math.min(36, Math.max(ex.targetR, targetR) + 2.0);
        ex.color = color;
        ex.life = Math.max(ex.life, life);
        ex.maxL = Math.max(ex.maxL, life);
        return ex;
      }
    }

    let sc;
    if (this.pool.scorches.length > 0) {
      sc = this.pool.scorches.pop();
    } else if (this.act.scorches.length > 0) {
      sc = this.act.scorches.shift();
    } else {
      return null;
    }

    sc.x = x;
    sc.y = y;
    sc.r = targetR * 0.55;
    sc.targetR = targetR;
    sc.color = color;
    sc.life = life;
    sc.maxL = Math.max(1, life);
    sc.renderNorm = 1;
    this.act.scorches.push(sc);
    return sc;
  }

  /**
   * Spawns or updates a smooth connected zone ring (e.g. Schrodinger's Probability Cloud or custom zone)
   * on the under-fighter Connected Ring Layer (Outline + Middle Fill).
   */
  spawnZoneRing(x, y, radius = 30, color = 0x00e5ff, options = null) {
    // If Connected Layered FX is toggled OFF, render using a single clean under-unit ring sprite
    if (DebugConfig.state.vfxConnectedLayers === false) {
      return this.spawnPhysics('fx_ring', x, y, 0, 0, options?.life ?? 3, 1, 1, false, color, 0.42, {
        underUnit: true,
        additive: false,
        scale: radius / 60,
        forceSpawn: true
      });
    }

    const dedupeDist = options?.dedupeDist ?? 26;
    const dedupeSq = dedupeDist * dedupeDist;

    // Smoothly merge/update in-place if an active zone ring already exists nearby
    for (let i = 0; i < this.act.sws.length; i++) {
      const ex = this.act.sws[i];
      if (ex.isZone && FastMath.distSq(x, y, ex.targetX, ex.targetY) <= dedupeSq) {
        ex.targetX = FastMath.lerp(ex.targetX, x, 0.35);
        ex.targetY = FastMath.lerp(ex.targetY, y, 0.35);
        ex.mR = Math.min(46, Math.max(ex.mR, radius));
        ex.color = color;
        if (options?.secondaryColor !== undefined) ex.secondaryColor = options.secondaryColor;
        ex.life = Math.max(ex.life, options?.life ?? 4);
        ex.maxL = Math.max(ex.maxL, ex.life);
        return ex;
      }
    }

    if (this.pool.sws.length === 0) return null;
    const sw = this.pool.sws.pop();
    sw.x = x;
    sw.y = y;
    sw.targetX = x;
    sw.targetY = y;
    sw.r = radius * 0.78;
    sw.mR = radius;
    sw.width = options?.width ?? 2.2;
    sw.color = color;
    sw.secondaryColor = options?.secondaryColor ?? 0xffffff;
    sw.fillAlpha = options?.fillAlpha ?? 0.24;
    sw.ease = 0.25;
    sw.life = options?.life ?? 4;
    sw.maxL = Math.max(1, sw.life);
    sw.age = 0;
    sw.isZone = true;
    sw.isDarkCore = Boolean(options?.isDarkCore);
    sw.renderNorm = 1;
    this.act.sws.push(sw);
    return sw;
  }

  /**
   * Spawns a Shockwave Ring:
   * - When `vfxConnectedLayers` is ON: uses the smooth 3-Layer Connected Ring Compositor
   *   (Feathered Outer Outline + Non-Stacking Middle Core + Rim Sparks).
   * - When `vfxConnectedLayers` is OFF: uses classic sprite shockwaves (`this.shockwaveLayer`).
   */
  spawnShockwave(x, y, color = 0x00e5ff, maxRadius = 80, width = 4, isSecondary = false) {
    // Classic Sprite Shockwave Mode when Connected Layered FX is OFF
    if (DebugConfig.state.vfxConnectedLayers === false) {
      if (this.pool.swSprites.length === 0) return;
      const sw = this.pool.swSprites.pop();
      sw.texture =
        isSecondary && this.textures['fx_ring_thin']
          ? this.textures['fx_ring_thin']
          : this.textures['fx_ring'] || sw.texture;
      sw.x = x;
      sw.y = y;
      sw.tint = color;
      sw.r = isSecondary ? 0.05 : 0.1;
      sw.mR = maxRadius / 60;
      sw.ease = isSecondary ? 0.28 : 0.2;
      sw.life = isSecondary ? 15 : 21;
      sw.maxL = sw.life;
      sw.visible = true;
      sw.alpha = (isSecondary ? 0.65 : 0.85) * (DebugConfig.state.vfxOutlineAlpha ?? 0.75);
      sw.scale.set(sw.r);
      this.act.swSprites.push(sw);
      return;
    }

    // Deduplicate near-simultaneous shockwaves spawned at the same spot so multi-shockwave calls
    // combine into a single dual-toned connected ring instead of cluttering the screen
    for (let i = 0; i < this.act.sws.length; i++) {
      const ex = this.act.sws[i];
      if (!ex.isZone && ex.age <= 2 && FastMath.distSq(x, y, ex.x, ex.y) < 196) {
        ex.mR = Math.max(ex.mR, maxRadius);
        ex.width = Math.max(ex.width, width);
        if (color !== ex.color) {
          ex.secondaryColor = color;
        }
        return;
      }
    }

    let sw;
    if (this.pool.sws.length > 0) {
      sw = this.pool.sws.pop();
    } else if (this.act.sws.length > 0) {
      sw = this.act.sws.shift();
    } else {
      return;
    }

    sw.x = x;
    sw.y = y;
    sw.targetX = x;
    sw.targetY = y;
    sw.color = color;
    sw.secondaryColor = 0xffffff;
    sw.r = isSecondary ? Math.max(4, maxRadius * 0.12) : Math.max(6, maxRadius * 0.16);
    sw.mR = Math.max(10, maxRadius);
    sw.width = FastMath.clamp(width, 1.5, 5.5);
    sw.fillAlpha = isSecondary ? 0.14 : 0.28;
    sw.ease = isSecondary ? 0.26 : 0.2;
    sw.life = isSecondary ? 16 : 22;
    sw.maxL = sw.life;
    sw.age = 0;
    sw.isZone = false;
    sw.isDarkCore = false;
    sw.renderNorm = 1;
    this.act.sws.push(sw);

    // Layer 3 Connection: Emit crisp tangential/radial rim sparks so the ring connects to the particle layer
    if (!isSecondary && maxRadius >= 42 && (DebugConfig.state.vfxQuality || 'auto') !== 'low') {
      const sparkCount = maxRadius >= 95 ? 4 : 2;
      for (let i = 0; i < sparkCount; i++) {
        const ang = FastMath.randRange(0, FastMath.TWO_PI);
        const rimR = sw.r;
        const spd = FastMath.randRange(1.8, 3.6);
        this.spawnPhysics(
          'fx_spark',
          x + Math.cos(ang) * rimR,
          y + Math.sin(ang) * rimR,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          11,
          0.88,
          0.88,
          true,
          i === 0 ? 0xffffff : color,
          0.82,
          { additive: true, alignToVel: true, stretchFactor: 0.3, scale: 0.78 }
        );
      }
    }
  }

  spawnDmgText(x, y, dmg, color = 0xff0000, scale = 1.0, options = null) {
    if (DebugConfig.state.vfxShowDmgText === false) return;
    if (this.pool.txts.length === 0) return;
    const val = Math.max(1, Math.floor(dmg));
    const str = val.toString();

    const isHeal = Boolean(options?.isHeal || color === 0x00ff55 || color === 0x00ff66);
    const isCrit =
      options?.isCrit !== undefined
        ? Boolean(options.isCrit)
        : !isHeal && val >= (CFG.VFX.CRIT_DMG_THRESHOLD || 24);

    const t = this.pool.txts.pop();
    const critScaleBoost = isCrit ? 1.24 : 1.0;
    const userTxtScale = DebugConfig.state.vfxDmgTextScale ?? 1.0;
    t.customScale = scale * critScaleBoost * userTxtScale;
    t.isCrit = isCrit;

    const signTex = this.textures[isHeal ? 'digit_plus' : 'digit_minus'];
    const mainTint = isCrit && color === 0xff0000 ? 0xffdd00 : color;

    let glyphIdx = 0;
    if (signTex) {
      const g0 = t.children[glyphIdx++];
      g0.texture = signTex;
      g0.tint = mainTint;
      g0.visible = true;
    }

    const maxDigits = Math.min(str.length, 5);
    for (let i = 0; i < maxDigits; i++) {
      const dTex = this.textures['digit_' + str[i]];
      if (dTex && glyphIdx < t.children.length) {
        const g = t.children[glyphIdx++];
        g.texture = dTex;
        g.tint = isCrit && i === 0 ? 0xffffff : mainTint;
        g.visible = true;
      }
    }

    if (isCrit && glyphIdx < t.children.length && this.textures['digit_bang']) {
      const gBang = t.children[glyphIdx++];
      gBang.texture = this.textures['digit_bang'];
      gBang.tint = 0xffdd00;
      gBang.visible = true;
    }

    const spacing = CFG.VFX.DMG_TEXT.CHAR_SPACING;
    const totalW = (glyphIdx - 1) * spacing;
    for (let j = 0; j < t.children.length; j++) {
      if (j < glyphIdx) {
        t.children[j].x = j * spacing - totalW * 0.5;
      } else {
        t.children[j].visible = false;
      }
    }

    t.x = x + FastMath.randRange(-9, 9);
    t.y = y + FastMath.randRange(-4, 2);
    t.floorY = t.y + 8;
    t.vx = FastMath.randRange(-CFG.VFX.DMG_TEXT.VX_SPREAD, CFG.VFX.DMG_TEXT.VX_SPREAD);
    t.vy = isCrit ? CFG.VFX.DMG_TEXT.VY * 1.22 : CFG.VFX.DMG_TEXT.VY;
    t.life = isCrit ? CFG.VFX.DMG_TEXT.LIFE + 8 : CFG.VFX.DMG_TEXT.LIFE;
    t.maxL = t.life;
    t.visible = true;
    t.alpha = 1;
    t.scale.set(0.15 * t.customScale);
    this.act.txts.push(t);
  }

  update(tS, currentFps = 60) {
    if (currentFps > 5 && currentFps < 240) {
      this.rollingFps = this.rollingFps * 0.92 + currentFps * 0.08;
    }

    const dbg = DebugConfig.state;
    const swCrowd = this.getCrowdDamping(this.act.sws.length + this.act.swSprites.length, 4, 15);
    const scorchCrowd = this.getCrowdDamping(this.act.scorches.length, 4, 14);

    this.ringOutlineGfx.alpha = (dbg.vfxOutlineAlpha ?? 0.75) * swCrowd;
    this.ringMiddleGfx.alpha = (dbg.vfxMiddleAlpha ?? 0.26) * swCrowd;
    this.scorchGfx.alpha = (dbg.vfxScorchAlpha ?? 0.45) * scorchCrowd;
    this.overParticleLayer.alpha = dbg.vfxParticleAlpha ?? 0.95;

    this._updatePhysics(tS);
    this._updateDecals(tS);
    this._updateScorches(tS);
    this._updateConnectedRings(tS);
    this._updateClassicShockwaveSprites(tS);
    this._updateDamageTexts(tS);
  }

  _updatePhysics(tS) {
    const pDX = Math.pow(CFG.PHYSICS.DRAG_X, tS);
    const pDY = Math.pow(CFG.PHYSICS.DRAG_Y, tS);

    for (let i = this.act.phys.length - 1; i >= 0; i--) {
      const s = this.act.phys[i];
      s.life -= tS;
      if (s.life <= 0) {
        s.visible = false;
        this.act.phys[i] = this.act.phys[this.act.phys.length - 1];
        this.act.phys.pop();
        this.pool.phys.push(s);
        continue;
      }

      if (s.grav) {
        s.vy += s.grav * tS;
      }
      s.vx *= s.dragX === CFG.PHYSICS.DRAG_X ? pDX : Math.pow(s.dragX, tS);
      s.vy *= s.dragY === CFG.PHYSICS.DRAG_Y ? pDY : Math.pow(s.dragY, tS);
      s.x += s.vx * tS;
      s.y += s.vy * tS;

      const normLife = Math.max(0, s.life / s.maxL);
      s.alpha =
        (normLife < 0.08 ? 0.08 : normLife) * (s.baseAlpha !== undefined ? s.baseAlpha : 1.0);

      if (s.alignToVel) {
        const spd = Math.hypot(s.vx, s.vy);
        if (spd > 0.05) {
          s.rotation = Math.atan2(s.vy, s.vx);
        }
        const scaleEnv = s.sD ? normLife : 1.0;
        const stretch = Math.min(2.8, 1.0 + spd * (s.stretchFactor || 0.3));
        s.scale.set(
          (s.baseScale || 1) * stretch * scaleEnv,
          (s.baseScale || 1) * Math.max(0.45, scaleEnv * 0.85)
        );
      } else {
        if (s.vRot) s.rotation += s.vRot * tS;
        if (s.sD) s.scale.set((s.baseScale || 1) * normLife);
      }
    }
  }

  _updateDecals(tS) {
    for (let i = this.act.decals.length - 1; i >= 0; i--) {
      const d = this.act.decals[i];
      d.life -= tS;
      if (d.life <= 0) {
        d.visible = false;
        this.act.decals[i] = this.act.decals[this.act.decals.length - 1];
        this.act.decals.pop();
        this.pool.decals.push(d);
        continue;
      }
      const norm = Math.max(0, d.life / d.maxL);
      d.alpha = d.baseAlpha * norm;
      if (d.shrink) {
        const sFactor = 0.65 + 0.35 * norm;
        d.scale.set(d.startScaleX * sFactor, d.startScaleY * sFactor);
      }
    }
  }

  _updateClassicShockwaveSprites(tS) {
    for (let i = this.act.swSprites.length - 1; i >= 0; i--) {
      const s = this.act.swSprites[i];
      s.life -= tS;
      if (s.life <= 0) {
        s.visible = false;
        this.act.swSprites[i] = this.act.swSprites[this.act.swSprites.length - 1];
        this.act.swSprites.pop();
        this.pool.swSprites.push(s);
        continue;
      }
      const ease = s.ease || 0.22;
      s.r += (s.mR - s.r) * ease * tS;
      s.scale.set(s.r);
      s.alpha =
        Math.pow(Math.max(0, s.life / s.maxL), 0.85) * (DebugConfig.state.vfxOutlineAlpha ?? 0.75);
    }
  }

  /**
   * Renders Smooth Connected Floor Scorch Craters (`this.scorchGfx`).
   */
  _updateScorches(tS) {
    this.scorchGfx.clear();
    if (
      DebugConfig.state.vfxShowScorch === false ||
      DebugConfig.state.vfxConnectedLayers === false ||
      this.act.scorches.length === 0
    ) {
      return;
    }

    const crowdDecayBoost =
      DebugConfig.state.vfxCrowdAutoFade !== false && this.act.scorches.length > 6
        ? 1.0 + (this.act.scorches.length - 6) * 0.25
        : 1.0;

    for (let i = this.act.scorches.length - 1; i >= 0; i--) {
      const sc = this.act.scorches[i];
      sc.life -= tS * crowdDecayBoost;
      if (sc.life <= 0) {
        this.act.scorches[i] = this.act.scorches[this.act.scorches.length - 1];
        this.act.scorches.pop();
        this.pool.scorches.push(sc);
        continue;
      }
      sc.r += ((sc.targetR || sc.r) - sc.r) * 0.22 * tS;
      sc.renderNorm = Math.min(1, sc.life / (sc.maxL * 0.35));
    }

    const list = this.act.scorches;
    if (list.length === 0) return;

    // Pass 1: Soft dark crater interior fill
    for (let i = 0; i < list.length; i++) {
      const sc = list[i];
      this.scorchGfx
        .lineStyle(0)
        .beginFill(0x06060c, 0.52 * sc.renderNorm)
        .drawCircle(sc.x, sc.y, Math.max(2, sc.r - 1.2))
        .endFill();
    }

    // Pass 2: Feathered connected exterior char rim
    for (let i = 0; i < list.length; i++) {
      const sc = list[i];
      const norm = sc.renderNorm;
      const arcs = computeSmoothExteriorArcs(sc, list, i, null);
      for (let a = 0; a < arcs.length; a++) {
        const [startAng, endAng] = arcs[a];
        if (endAng - startAng >= FastMath.TWO_PI - 0.02) {
          this.scorchGfx.lineStyle(3.2, sc.color, 0.16 * norm).drawCircle(sc.x, sc.y, sc.r);
          this.scorchGfx.lineStyle(1.4, sc.color, 0.55 * norm).drawCircle(sc.x, sc.y, sc.r);
        } else {
          const sx = sc.x + Math.cos(startAng) * sc.r;
          const sy = sc.y + Math.sin(startAng) * sc.r;
          this.scorchGfx
            .lineStyle(3.2, sc.color, 0.16 * norm)
            .moveTo(sx, sy)
            .arc(sc.x, sc.y, sc.r, startAng, endAng);
          this.scorchGfx
            .lineStyle(1.4, sc.color, 0.55 * norm)
            .moveTo(sx, sy)
            .arc(sc.x, sc.y, sc.r, startAng, endAng);
        }
      }
    }
  }

  /**
   * Renders Smooth Connected Multi-Layer Rings & Area Zones (`ringOutlineGfx` + `ringMiddleGfx`).
   * Features:
   *  - Smooth 60Hz position & radius interpolation
   *  - 3-pass feathered exterior outline stroke (outer glow halo + main rim + inner core highlight)
   *  - Smooth intersection junction fillets where two overlapping rings meet
   *  - Translucent non-stacking middle fill underneath fighters
   */
  _updateConnectedRings(tS) {
    this.ringOutlineGfx.clear();
    this.ringMiddleGfx.clear();

    if (DebugConfig.state.vfxConnectedLayers === false || this.act.sws.length === 0) return;

    const crowdAccel =
      DebugConfig.state.vfxCrowdAutoFade !== false && this.act.sws.length > 6
        ? 1.0 + (this.act.sws.length - 6) * 0.22
        : 1.0;

    for (let i = this.act.sws.length - 1; i >= 0; i--) {
      const s = this.act.sws[i];
      s.age = (s.age || 0) + tS;
      s.life -= s.isZone ? tS : tS * crowdAccel;
      if (s.life <= 0) {
        this.act.sws[i] = this.act.sws[this.act.sws.length - 1];
        this.act.sws.pop();
        this.pool.sws.push(s);
        continue;
      }

      // Smoothly interpolate position & radius for butter-smooth expansion and zone tracking
      s.x += ((s.targetX ?? s.x) - s.x) * 0.35 * tS;
      s.y += ((s.targetY ?? s.y) - s.y) * 0.35 * tS;
      const ease = s.ease || 0.22;
      s.r += (s.mR - s.r) * ease * tS;

      const fadeOut = Math.pow(Math.max(0, s.life / s.maxL), 0.75);
      const fadeIn = Math.min(1.0, (s.age || 1) / 2.5);
      s.renderNorm = (s.isZone ? Math.min(1.0, s.life / 2.5) * 0.9 : fadeOut) * fadeIn;
    }

    const rings = this.act.sws;
    if (rings.length === 0) return;

    // ------------------------------------------------------------
    // LAYER 2: SMOOTH MIDDLE PART / CORE FILL (`ringMiddleGfx`)
    // ------------------------------------------------------------
    for (let i = 0; i < rings.length; i++) {
      const s = rings[i];
      const norm = s.renderNorm;
      const innerR = Math.max(2, s.r - s.width * 0.4);

      // Soft outer middle wash
      this.ringMiddleGfx
        .lineStyle(0)
        .beginFill(s.isDarkCore ? 0x090005 : s.color, norm * (s.isDarkCore ? 0.85 : 0.55))
        .drawCircle(s.x, s.y, innerR)
        .endFill();

      // Concentric inner harmonic ring inside the middle fill for depth
      if (innerR > 14) {
        this.ringMiddleGfx
          .lineStyle(1.0, s.secondaryColor || 0xffffff, norm * 0.35)
          .drawCircle(s.x, s.y, innerR * 0.62);
      }

      // Subtle center core node
      if (s.r > 16) {
        const coreR = Math.min(6.5, s.r * 0.14);
        this.ringMiddleGfx
          .lineStyle(0)
          .beginFill(s.secondaryColor || 0xffffff, norm * 0.42)
          .drawCircle(s.x, s.y, coreR)
          .endFill();
      }
    }

    // ------------------------------------------------------------
    // LAYER 1: SMOOTH FEATHERED CONNECTED OUTER OUTLINE (`ringOutlineGfx`)
    // ------------------------------------------------------------
    const junctions = [];

    for (let i = 0; i < rings.length; i++) {
      const s = rings[i];
      const norm = s.renderNorm;
      if (norm <= 0.02) continue;

      const strokeW = Math.max(1.3, s.width * (s.isZone ? 1.0 : 0.45 + 0.55 * norm));
      const exteriorArcs = computeSmoothExteriorArcs(s, rings, i, junctions);

      for (let a = 0; a < exteriorArcs.length; a++) {
        const [startAng, endAng] = exteriorArcs[a];
        const isFullCircle = endAng - startAng >= FastMath.TWO_PI - 0.02;

        // Pass 1A: Wide soft feathered outer glow halo for anti-aliased smoothness
        if (isFullCircle) {
          this.ringOutlineGfx
            .lineStyle(strokeW * 2.5, s.color, norm * 0.22)
            .drawCircle(s.x, s.y, s.r);
        } else {
          const sx = s.x + Math.cos(startAng) * s.r;
          const sy = s.y + Math.sin(startAng) * s.r;
          this.ringOutlineGfx
            .lineStyle(strokeW * 2.5, s.color, norm * 0.22)
            .moveTo(sx, sy)
            .arc(s.x, s.y, s.r, startAng, endAng);
        }

        // Pass 1B: Crisp primary colored outer perimeter arc
        if (isFullCircle) {
          this.ringOutlineGfx.lineStyle(strokeW, s.color, norm * 0.92).drawCircle(s.x, s.y, s.r);
        } else {
          const sx = s.x + Math.cos(startAng) * s.r;
          const sy = s.y + Math.sin(startAng) * s.r;
          this.ringOutlineGfx
            .lineStyle(strokeW, s.color, norm * 0.92)
            .moveTo(sx, sy)
            .arc(s.x, s.y, s.r, startAng, endAng);
        }

        // Pass 1C: Inner secondary/white core highlight arc
        const innerRimR = Math.max(2, s.r - strokeW * 0.6);
        if (innerRimR > 4) {
          const innerCol = s.secondaryColor || 0xffffff;
          if (isFullCircle) {
            this.ringOutlineGfx
              .lineStyle(Math.max(0.9, strokeW * 0.42), innerCol, norm * 0.7)
              .drawCircle(s.x, s.y, innerRimR);
          } else {
            const isx = s.x + Math.cos(startAng) * innerRimR;
            const isy = s.y + Math.sin(startAng) * innerRimR;
            this.ringOutlineGfx
              .lineStyle(Math.max(0.9, strokeW * 0.42), innerCol, norm * 0.7)
              .moveTo(isx, isy)
              .arc(s.x, s.y, innerRimR, startAng, endAng);
          }
        }
      }
    }

    // Pass 1D: Smooth Metaball Junction Nodes where overlapping rings fuse together
    for (let j = 0; j < junctions.length; j++) {
      const pt = junctions[j];
      this.ringOutlineGfx
        .lineStyle(0)
        .beginFill(pt.color, pt.alpha * 0.35)
        .drawCircle(pt.x, pt.y, 4.2)
        .beginFill(0xffffff, pt.alpha * 0.75)
        .drawCircle(pt.x, pt.y, 1.8)
        .endFill();
    }
  }

  _updateDamageTexts(tS) {
    const pTxtDrag = Math.pow(CFG.VFX.DMG_TEXT.FLOAT_DRAG, tS);
    for (let i = this.act.txts.length - 1; i >= 0; i--) {
      const t = this.act.txts[i];
      t.life -= tS;
      if (t.life <= 0) {
        t.visible = false;
        this.act.txts[i] = this.act.txts[this.act.txts.length - 1];
        this.act.txts.pop();
        this.pool.txts.push(t);
        continue;
      }
      t.vy += 0.16 * tS;
      t.vx *= pTxtDrag;
      t.x += t.vx * tS;
      t.y += t.vy * tS;

      if (t.floorY !== undefined && t.y > t.floorY && t.vy > 0) {
        t.y = t.floorY;
        t.vy = -t.vy * 0.42;
      }

      const fT = t.maxL * 0.32;
      t.alpha = t.life < fT ? t.life / fT : 1;

      const progress = 1.0 - t.life / t.maxL;
      const popPhase = Math.min(1.0, progress * 6.0);
      const elasticBounce = 0.52 + Math.sin(popPhase * Math.PI) * (t.isCrit ? 0.42 : 0.28);
      const baseScale = t.customScale || 1.0;
      t.scale.set(elasticBounce * baseScale);
    }
  }
}
