// ============================================================
// HIGH PERFORMANCE MULTI-LAYER CONNECTED VFX & COMBAT JUICE POOL
// Separates FX into 3+ Coordinated Layers:
//  1) Connected Outer Ring / Outline Layer (Under Fighters)
//  2) Connected Middle Core / Fill Layer   (Under Fighters)
//  3) Crisp Directional Particle Layer     (Over Fighters)
// Overlapping rings, zones & scorch marks merge into unified
// silhouettes without internal intersecting line clutter.
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { DebugConfig } from './DebugConfig.js';

// Built-in & Minit custom ring/zone textures that should automatically
// route into the under-fighter connected ring compositor instead of
// covering fighters on the over-unit particle layer.
const RING_ZONE_TEXTURES = {
  fx_absorb_ring: { radius: 36, width: 2.5, color: 0xff4422, fillAlpha: 0.35 },
  fx_absorb_core: { radius: 13, width: 2.0, color: 0xffaa00, fillAlpha: 0.65, isDarkCore: true },
  fx_waves_aura_ring: { radius: 16, width: 2.0, color: 0x00e5ff, fillAlpha: 0.35 },
  fx_saitama_pressure_ring: { radius: 28, width: 2.8, color: 0xff0033, fillAlpha: 0.38 },
  fx_moth_wing_aura: { radius: 18, width: 2.0, color: 0x88ffcc, fillAlpha: 0.32 },
  fx_pulsar_drone_halo: { radius: 11, width: 1.5, color: 0xff00aa, fillAlpha: 0.25 }
};

/**
 * Computes the uncovered exterior angular intervals [startAngle, endAngle] for circle `i`
 * when overlapped by a list of other circles. Used to draw true boolean-union connected
 * outlines where overlapping rings/scorch marks fuse into one continuous outer perimeter.
 */
function computeExteriorArcs(circle, allCircles, selfIdx, radiusPad = 0) {
  const r1 = circle.r + radiusPad;
  if (r1 <= 0.5) return [];

  const blocked = [];

  for (let j = 0; j < allCircles.length; j++) {
    if (j === selfIdx) continue;
    const other = allCircles[j];
    const r2 = other.r + radiusPad;
    if (r2 <= 0.5) continue;

    const dx = other.x - circle.x;
    const dy = other.y - circle.y;
    const dSq = dx * dx + dy * dy;
    const d = Math.sqrt(dSq);

    // Identical center: keep only the larger circle (or lower index on tie)
    if (d < 0.001) {
      if (r2 > r1 || (r2 === r1 && j < selfIdx)) {
        return [];
      }
      continue;
    }

    // Completely separated
    if (d >= r1 + r2) continue;

    // Circle i is completely inside circle j -> no exterior outline
    if (d + r1 <= r2) {
      return [];
    }

    // Circle j is completely inside circle i -> circle i's outer boundary is unaffected
    if (d + r2 <= r1) {
      continue;
    }

    // Partial intersection: find angular span on circle i covered by circle j
    const cosHalf = FastMath.clamp((r1 * r1 + dSq - r2 * r2) / (2 * r1 * d), -1, 1);
    const halfSpan = Math.acos(cosHalf);
    if (halfSpan <= 0.002) continue;

    let mid = Math.atan2(dy, dx);
    if (mid < 0) mid += FastMath.TWO_PI;

    let start = mid - halfSpan;
    let end = mid + halfSpan;

    if (start < 0) {
      blocked.push([start + FastMath.TWO_PI, FastMath.TWO_PI]);
      blocked.push([0, end]);
    } else if (end > FastMath.TWO_PI) {
      blocked.push([start, FastMath.TWO_PI]);
      blocked.push([0, end - FastMath.TWO_PI]);
    } else {
      blocked.push([start, end]);
    }
  }

  if (blocked.length === 0) {
    return [[0, FastMath.TWO_PI]];
  }

  // Sort & merge blocked angular intervals
  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [blocked[0]];
  for (let k = 1; k < blocked.length; k++) {
    const cur = blocked[k];
    const last = merged[merged.length - 1];
    if (cur[0] <= last[1] + 0.005) {
      if (cur[1] > last[1]) last[1] = cur[1];
    } else {
      merged.push(cur);
    }
  }

  // Invert blocked intervals over [0, 2*PI] to obtain visible exterior arcs
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
    this.cU = cU; // Under-unit container (scorch craters, connected ring middle & outlines, afterimages)
    this.cO = cO; // Over-unit container (crisp directional sparks, projectiles, damage popups)
    this.textures = texturesRef;
    this.rollingFps = 60;

    // ============================================================
    // UNDER-FIGHTER LAYER HIERARCHY (Never covers Minit fighters)
    // ============================================================
    // 1. Connected Floor Scorch Layer (merged craters + outer char rim)
    this.scorchGfx = new PIXI.Graphics();
    this.cU.addChild(this.scorchGfx);

    // 2. Under-Unit Afterimage Ghosts & Decals
    this.decalLayer = new PIXI.Container();
    this.cU.addChild(this.decalLayer);

    // 3. Connected Ring / Zone Layer — PART 2: Middle Core Fill (translucent, non-stacking)
    this.ringMiddleGfx = new PIXI.Graphics();
    this.cU.addChild(this.ringMiddleGfx);

    // 4. Connected Ring / Zone Layer — PART 1: Unified Outer Perimeter Outline
    this.ringOutlineGfx = new PIXI.Graphics();
    this.cU.addChild(this.ringOutlineGfx);

    // 5. Under-Unit Ambient Particles
    this.underParticleLayer = new PIXI.Container();
    this.cU.addChild(this.underParticleLayer);

    // ============================================================
    // OVER-FIGHTER LAYER HIERARCHY (Crisp accents & combat popups)
    // ============================================================
    // 6. Connected Ring / Combat Layer — PART 3: Crisp Particles & Projectiles
    this.overParticleLayer = new PIXI.Container();
    this.cO.addChild(this.overParticleLayer);

    // 7. Legacy sprite shockwave fallback container (kept empty for API compatibility)
    this.shockwaveLayer = new PIXI.Container();
    this.cO.addChild(this.shockwaveLayer);

    // 8. Floating Damage / Crit / Heal Popups
    this.textLayer = new PIXI.Container();
    this.cO.addChild(this.textLayer);

    this.pool = { phys: [], sws: [], txts: [], decals: [], scorches: [] };
    this.act = { phys: [], sws: [], txts: [], decals: [], scorches: [] };

    // 1. Physics & Spark Sprites Pool
    const physLimit = CFG.VFX.PHYSICS_LIMIT || 600;
    for (let i = 0; i < physLimit; i++) {
      const s = new PIXI.Sprite();
      s.visible = false;
      s.anchor.set(0.5);
      this.overParticleLayer.addChild(s);
      this.pool.phys.push(s);
    }

    // 2. Under-Unit Afterimage Ghosts Pool
    const decalLimit = CFG.VFX.DECAL_LIMIT || 140;
    for (let i = 0; i < decalLimit; i++) {
      const d = new PIXI.Sprite();
      d.visible = false;
      d.anchor.set(0.5);
      this.decalLayer.addChild(d);
      this.pool.decals.push(d);
    }

    // 3. Connected Ring / Zone State Pool (rendered via ringOutlineGfx + ringMiddleGfx)
    const swLimit = (CFG.VFX.SHOCKWAVE_LIMIT || 36) + 16;
    for (let i = 0; i < swLimit; i++) {
      this.pool.sws.push({
        x: 0,
        y: 0,
        r: 4,
        mR: 40,
        width: 3,
        color: 0x00e5ff,
        fillAlpha: 0.28,
        ease: 0.22,
        life: 0,
        maxL: 20,
        isZone: false,
        isDarkCore: false
      });
    }

    // 4. Connected Scorch Crater State Pool (rendered via scorchGfx)
    for (let i = 0; i < 32; i++) {
      this.pool.scorches.push({
        x: 0,
        y: 0,
        r: 14,
        color: 0x00e5ff,
        life: 0,
        maxL: 200
      });
    }

    // 5. Damage / Critical / Heal Text Containers Pool (7 glyphs: sign + up to 5 digits + '!')
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
    // Textures are ready; connected rings use vector arc union + middle core compositing
  }

  /**
   * Computes current particle emission budget multiplier (0.2 to 2.5)
   * based on user's VFX Quality setting ('auto' | 'high' | 'low'), slider, and live FPS.
   */
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

  /**
   * Computes anti-clutter crowd damping multiplier (0.35 to 1.0) when many rings/scorches overlap.
   */
  getCrowdDamping(activeCount, threshold = 4, maxCount = 16) {
    if (DebugConfig.state.vfxCrowdAutoFade === false) return 1.0;
    if (activeCount <= threshold) return 1.0;
    const excess = Math.min(1.0, (activeCount - threshold) / (maxCount - threshold));
    return 1.0 - excess * 0.62;
  }

  /**
   * Spawns a versatile physics particle (or routes ring/zone textures to the under-unit connected ring layer).
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
    // Automatically intercept persistent zone/aura rings so they render on the under-unit connected ring layer
    const ringPreset = RING_ZONE_TEXTURES[texKey];
    if (ringPreset && vx === 0 && vy === 0) {
      const col = tint !== 0xffffff ? tint : ringPreset.color;
      this.spawnZoneRing(x, y, ringPreset.radius, col, {
        width: ringPreset.width,
        life: Math.max(2, life),
        fillAlpha: ringPreset.fillAlpha * baseAlpha,
        isDarkCore: ringPreset.isDarkCore
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

    const s = this.pool.phys.pop();
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
    s.baseAlpha = baseAlpha;
    s.visible = true;
    s.alpha = baseAlpha;

    const isLightTex =
      texKey === 'fx_spark' ||
      texKey === 'fx_glow' ||
      texKey === 'fx_ember' ||
      texKey === 'fx_star';

    const useAdditive = extra?.additive !== undefined ? extra.additive : isLightTex;
    s.blendMode = useAdditive ? PIXI.BLEND_MODES.ADD : PIXI.BLEND_MODES.NORMAL;

    const speed = Math.hypot(vx, vy);
    s.alignToVel =
      extra?.alignToVel !== undefined ? extra.alignToVel : texKey === 'fx_spark' && speed > 0.35;
    s.stretchFactor = extra?.stretchFactor ?? (texKey === 'fx_spark' ? 0.32 : 0);
    s.baseScale = extra?.scale ?? 1.0;
    s.grav = extra?.grav !== undefined ? extra.grav : texKey === 'fx_glow' ? 0 : 0.22;
    s.vRot =
      extra?.vRot !== undefined ? extra.vRot : s.alignToVel ? 0 : FastMath.randRange(-0.14, 0.14);

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

  /**
   * Spawns a soft additive radial bloom flare at (x, y).
   */
  spawnGlow(x, y, color = 0x00e5ff, scale = 1.0, life = 14, alpha = 0.55) {
    return this.spawnPhysics('fx_glow', x, y, 0, 0, life, 1, 1, true, color, alpha, {
      additive: true,
      alignToVel: false,
      scale,
      grav: 0,
      vRot: 0
    });
  }

  /**
   * Spawns a ghost afterimage trail for dashing fighters on the under-unit layer.
   */
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
   * Stamps a connected floor scorch crater under units.
   * Nearby scorches automatically fuse into a single connected crater instead of stacking!
   */
  spawnScorch(x, y, color = 0x00e5ff, scale = 1.1, life = 200) {
    if (DebugConfig.state.vfxShowScorch === false) return null;

    const targetR = FastMath.clamp(scale * 16, 8, 34);

    // Spatial Merge: if a scorch crater already exists nearby, fuse into it instead of piling up
    for (let i = 0; i < this.act.scorches.length; i++) {
      const ex = this.act.scorches[i];
      const dSq = FastMath.distSq(x, y, ex.x, ex.y);
      if (dSq < 20 * 20) {
        ex.x = ex.x * 0.65 + x * 0.35;
        ex.y = ex.y * 0.65 + y * 0.35;
        ex.r = Math.min(36, Math.max(ex.r, targetR) + 2.2);
        ex.color = color;
        ex.life = Math.max(ex.life, life);
        ex.maxL = Math.max(ex.maxL, life);
        return ex;
      }
    }

    // Recycle oldest scorch if pool is full
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
    sc.r = targetR;
    sc.color = color;
    sc.life = life;
    sc.maxL = Math.max(1, life);
    this.act.scorches.push(sc);
    return sc;
  }

  /**
   * Spawns a persistent or frame-refreshed zone ring (e.g. Absorb vortex, Waves aura, Saitama pressure ring)
   * on the under-fighter Connected Ring Layer (Outline + Middle Fill).
   */
  spawnZoneRing(x, y, radius = 32, color = 0x00e5ff, options = null) {
    // Check if an active zone ring already exists at nearly the same spot & radius to update in-place
    for (let i = 0; i < this.act.sws.length; i++) {
      const ex = this.act.sws[i];
      if (
        ex.isZone &&
        Math.abs(ex.x - x) < 6 &&
        Math.abs(ex.y - y) < 6 &&
        Math.abs(ex.mR - radius) < 6
      ) {
        ex.x = x;
        ex.y = y;
        ex.r = radius;
        ex.mR = radius;
        ex.color = color;
        ex.life = options?.life ?? 3;
        ex.maxL = Math.max(ex.maxL, ex.life);
        return ex;
      }
    }

    if (this.pool.sws.length === 0) return null;
    const sw = this.pool.sws.pop();
    sw.x = x;
    sw.y = y;
    sw.r = radius;
    sw.mR = radius;
    sw.width = options?.width ?? 2.2;
    sw.color = color;
    sw.fillAlpha = options?.fillAlpha ?? 0.3;
    sw.ease = 1.0;
    sw.life = options?.life ?? 3;
    sw.maxL = Math.max(1, sw.life);
    sw.isZone = true;
    sw.isDarkCore = Boolean(options?.isDarkCore);
    this.act.sws.push(sw);
    return sw;
  }

  /**
   * Spawns a 3-Layer Connected Shockwave:
   *  - Layer 1 (Under Fighters): Connected Outer Perimeter Ring that merges with nearby rings
   *  - Layer 2 (Under Fighters): Soft Middle Core Fill that bridges overlapping rings without stacking opacity
   *  - Layer 3 (Over Fighters):  Crisp perimeter accent sparks that connect the ring to the particle layer
   */
  spawnShockwave(x, y, color = 0x00e5ff, maxRadius = 80, width = 4, isSecondary = false) {
    // Merge or skip if an almost identical shockwave was just spawned at the exact same spot this tick
    for (let i = 0; i < this.act.sws.length; i++) {
      const ex = this.act.sws[i];
      if (
        !ex.isZone &&
        ex.maxL - ex.life <= 2 &&
        FastMath.distSq(x, y, ex.x, ex.y) < 100 &&
        Math.abs(ex.mR - maxRadius) < 18
      ) {
        ex.mR = Math.max(ex.mR, maxRadius);
        ex.width = Math.max(ex.width, width);
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
    sw.color = color;
    sw.r = isSecondary ? Math.max(4, maxRadius * 0.12) : Math.max(6, maxRadius * 0.18);
    sw.mR = Math.max(10, maxRadius);
    sw.width = FastMath.clamp(width, 1.5, 6);
    sw.fillAlpha = isSecondary ? 0.15 : 0.32;
    sw.ease = isSecondary ? 0.28 : 0.22;
    sw.life = isSecondary ? 15 : 21;
    sw.maxL = sw.life;
    sw.isZone = false;
    sw.isDarkCore = false;
    this.act.sws.push(sw);

    // Layer 3 Connection: Emit a few crisp tangential/radial rim sparks so the ring connects with the particle layer
    if (!isSecondary && maxRadius >= 38 && (DebugConfig.state.vfxQuality || 'auto') !== 'low') {
      const sparkCount = maxRadius >= 90 ? 4 : 2;
      for (let i = 0; i < sparkCount; i++) {
        const ang = FastMath.randRange(0, FastMath.TWO_PI);
        const rimR = sw.r;
        const spd = FastMath.randRange(1.8, 3.8);
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
          0.85,
          { additive: true, alignToVel: true, stretchFactor: 0.3, scale: 0.8 }
        );
      }
    }
  }

  /**
   * Spawns floating damage, critical hit ('!'), or heal ('+') popup numbers with bounce physics.
   */
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

    // Apply live per-layer opacity sliders from DebugConfig
    const dbg = DebugConfig.state;
    const swCrowd = this.getCrowdDamping(this.act.sws.length, 4, 15);
    const scorchCrowd = this.getCrowdDamping(this.act.scorches.length, 4, 14);

    this.ringOutlineGfx.alpha = (dbg.vfxOutlineAlpha ?? 0.75) * swCrowd;
    this.ringMiddleGfx.alpha = (dbg.vfxMiddleAlpha ?? 0.26) * swCrowd;
    this.scorchGfx.alpha = (dbg.vfxScorchAlpha ?? 0.45) * scorchCrowd;
    this.overParticleLayer.alpha = dbg.vfxParticleAlpha ?? 0.95;

    this._updatePhysics(tS);
    this._updateDecals(tS);
    this._updateScorches(tS);
    this._updateConnectedRings(tS);
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

  /**
   * Renders Connected Floor Scorch Craters (`this.scorchGfx`).
   * Overlapping scorches fuse their outer char outlines into a single silhouette
   * and share a subtle dark-tinted crater interior.
   */
  _updateScorches(tS) {
    this.scorchGfx.clear();
    if (DebugConfig.state.vfxShowScorch === false || this.act.scorches.length === 0) return;

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
      }
    }

    const list = this.act.scorches;
    if (list.length === 0) return;

    // Pass 1: Subtle dark crater interior fill (non-stacking because scorchGfx container alpha is capped)
    for (let i = 0; i < list.length; i++) {
      const sc = list[i];
      const norm = Math.min(1, sc.life / (sc.maxL * 0.35));
      this.scorchGfx
        .lineStyle(0)
        .beginFill(0x06060c, 0.55 * norm)
        .drawCircle(sc.x, sc.y, Math.max(2, sc.r - 1.5))
        .endFill();
    }

    // Pass 2: Connected exterior char rim + colored ember ring only on the outer union boundary
    for (let i = 0; i < list.length; i++) {
      const sc = list[i];
      const norm = Math.min(1, sc.life / (sc.maxL * 0.4));
      const arcs = computeExteriorArcs(sc, list, i, 0);
      for (let a = 0; a < arcs.length; a++) {
        const [startAng, endAng] = arcs[a];
        if (endAng - startAng >= FastMath.TWO_PI - 0.02) {
          this.scorchGfx.lineStyle(1.6, sc.color, 0.55 * norm).drawCircle(sc.x, sc.y, sc.r);
        } else {
          const sx = sc.x + Math.cos(startAng) * sc.r;
          const sy = sc.y + Math.sin(startAng) * sc.r;
          this.scorchGfx
            .lineStyle(1.6, sc.color, 0.55 * norm)
            .moveTo(sx, sy)
            .arc(sc.x, sc.y, sc.r, startAng, endAng);
        }
      }
    }
  }

  /**
   * Renders Connected Multi-Layer Rings & Area Zones (`ringOutlineGfx` + `ringMiddleGfx`).
   *  - Layer 1 (`ringOutlineGfx`): True boolean-union exterior perimeter arcs so overlapping rings
   *    connect into one continuous shape without internal intersecting lines.
   *  - Layer 2 (`ringMiddleGfx`): Soft translucent middle fill + center core node underneath fighters.
   */
  _updateConnectedRings(tS) {
    this.ringOutlineGfx.clear();
    this.ringMiddleGfx.clear();

    if (this.act.sws.length === 0) return;

    // Accelerate decay on older shockwaves when many rings overlap
    const crowdAccel =
      DebugConfig.state.vfxCrowdAutoFade !== false && this.act.sws.length > 6
        ? 1.0 + (this.act.sws.length - 6) * 0.22
        : 1.0;

    for (let i = this.act.sws.length - 1; i >= 0; i--) {
      const s = this.act.sws[i];
      s.life -= s.isZone ? tS : tS * crowdAccel;
      if (s.life <= 0) {
        this.act.sws[i] = this.act.sws[this.act.sws.length - 1];
        this.act.sws.pop();
        this.pool.sws.push(s);
        continue;
      }
      if (!s.isZone) {
        const ease = s.ease || 0.22;
        s.r += (s.mR - s.r) * ease * tS;
      }
    }

    const rings = this.act.sws;
    if (rings.length === 0) return;

    const bgCol = CFG.ARENA?.BG_COLOR ?? 0x12121e;

    // ------------------------------------------------------------
    // LAYER 2: MIDDLE PART / CORE FILL (`ringMiddleGfx`)
    // Pass 2A: Erase/unify overlapping interior seams with arena floor base
    // Pass 2B: Draw soft translucent colored middle fill + center pulse node
    // ------------------------------------------------------------
    for (let i = 0; i < rings.length; i++) {
      const s = rings[i];
      const norm = s.isZone ? 0.85 : Math.pow(Math.max(0, s.life / s.maxL), 0.8);
      const innerR = Math.max(2, s.r - s.width * 0.5);

      this.ringMiddleGfx
        .lineStyle(0)
        .beginFill(s.isDarkCore ? 0x090005 : s.color, norm * (s.isDarkCore ? 0.9 : 0.65))
        .drawCircle(s.x, s.y, innerR)
        .endFill();

      // Subtle center energy node connecting middle fill to origin
      if (s.r > 16) {
        const coreR = Math.min(8, s.r * 0.16);
        this.ringMiddleGfx
          .beginFill(0xffffff, norm * 0.45)
          .drawCircle(s.x, s.y, coreR)
          .endFill();
      }
    }

    // ------------------------------------------------------------
    // LAYER 1: CONNECTED OUTER RING / OUTLINE (`ringOutlineGfx`)
    // Computes exact uncovered exterior arcs so overlapping rings fuse
    // into one seamless outer outline with zero internal cross-lines!
    // ------------------------------------------------------------
    for (let i = 0; i < rings.length; i++) {
      const s = rings[i];
      const norm = s.isZone ? 0.92 : Math.pow(Math.max(0, s.life / s.maxL), 0.75);
      const strokeW = Math.max(1.2, s.width * (s.isZone ? 1.0 : 0.4 + 0.6 * norm));

      const exteriorArcs = computeExteriorArcs(s, rings, i, 0);
      for (let a = 0; a < exteriorArcs.length; a++) {
        const [startAng, endAng] = exteriorArcs[a];
        const isFullCircle = endAng - startAng >= FastMath.TWO_PI - 0.02;

        // Outer colored perimeter arc
        if (isFullCircle) {
          this.ringOutlineGfx.lineStyle(strokeW, s.color, norm).drawCircle(s.x, s.y, s.r);
        } else {
          const sx = s.x + Math.cos(startAng) * s.r;
          const sy = s.y + Math.sin(startAng) * s.r;
          this.ringOutlineGfx
            .lineStyle(strokeW, s.color, norm)
            .moveTo(sx, sy)
            .arc(s.x, s.y, s.r, startAng, endAng);
        }

        // Crisp inner white-hot rim highlight on the connected exterior boundary
        const innerRimR = Math.max(2, s.r - strokeW * 0.65);
        if (innerRimR > 4) {
          if (isFullCircle) {
            this.ringOutlineGfx
              .lineStyle(Math.max(0.8, strokeW * 0.38), 0xffffff, norm * 0.65)
              .drawCircle(s.x, s.y, innerRimR);
          } else {
            const isx = s.x + Math.cos(startAng) * innerRimR;
            const isy = s.y + Math.sin(startAng) * innerRimR;
            this.ringOutlineGfx
              .lineStyle(Math.max(0.8, strokeW * 0.38), 0xffffff, norm * 0.65)
              .moveTo(isx, isy)
              .arc(s.x, s.y, innerRimR, startAng, endAng);
          }
        }
      }
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
