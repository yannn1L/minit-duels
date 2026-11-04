// ============================================================
// HIGH PERFORMANCE VFX & COMBAT JUICE POOL (ES Module)
// Zero-Allocation Object Pooling with Additive Bloom, Velocity-Aligned
// Sparks, Afterimages, Scorch Decals, Multi-Ring Shockwaves & Auto-FPS Budget
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';
import { DebugConfig } from './DebugConfig.js';

export class VFXPool {
  constructor(cU, cO, texturesRef) {
    this.cU = cU; // Under-unit container (scorch marks, floor decals, afterimages)
    this.cO = cO; // Over-unit container (sparks, additive bloom, shockwaves, damage text)
    this.textures = texturesRef;
    this.rollingFps = 60;

    // Dedicated sub-layers for clean depth sorting
    this.decalLayer = new PIXI.Container();
    this.cU.addChild(this.decalLayer);

    this.underParticleLayer = new PIXI.Container();
    this.cU.addChild(this.underParticleLayer);

    this.shockwaveLayer = new PIXI.Container();
    this.cO.addChild(this.shockwaveLayer);

    this.overParticleLayer = new PIXI.Container();
    this.cO.addChild(this.overParticleLayer);

    this.textLayer = new PIXI.Container();
    this.cO.addChild(this.textLayer);

    this.pool = { phys: [], sws: [], txts: [], decals: [] };
    this.act = { phys: [], sws: [], txts: [], decals: [] };

    // 1. Physics & Spark Sprites Pool (supports NORMAL and ADDITIVE blend modes)
    const physLimit = CFG.VFX.PHYSICS_LIMIT || 600;
    for (let i = 0; i < physLimit; i++) {
      const s = new PIXI.Sprite();
      s.visible = false;
      s.anchor.set(0.5);
      this.overParticleLayer.addChild(s);
      this.pool.phys.push(s);
    }

    // 2. Under-Unit Decals & Afterimage Ghosts Pool
    const decalLimit = CFG.VFX.DECAL_LIMIT || 140;
    for (let i = 0; i < decalLimit; i++) {
      const d = new PIXI.Sprite();
      d.visible = false;
      d.anchor.set(0.5);
      this.decalLayer.addChild(d);
      this.pool.decals.push(d);
    }

    // 3. Shockwave Rings Pool
    const swLimit = CFG.VFX.SHOCKWAVE_LIMIT || 36;
    for (let i = 0; i < swLimit; i++) {
      const sw = new PIXI.Sprite();
      sw.anchor.set(0.5);
      sw.visible = false;
      sw.blendMode = PIXI.BLEND_MODES.ADD;
      this.shockwaveLayer.addChild(sw);
      this.pool.sws.push(sw);
    }

    // 4. Damage / Critical / Heal Text Containers Pool (7 glyphs: sign + up to 5 digits + '!')
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
      this.pool.sws.forEach((sw) => {
        sw.texture = ringTex;
      });
    }
  }

  /**
   * Computes current particle emission budget multiplier (0.35 to 1.0)
   * based on user's VFX Quality setting ('auto' | 'high' | 'low') and live FPS.
   */
  getBudgetMult() {
    const mode = DebugConfig.state.vfxQuality || 'auto';
    if (mode === 'high') return 1.0;
    if (mode === 'low') return 0.38;

    // Auto-adaptive budget based on rolling FPS and active pool pressure
    const poolLoad = this.act.phys.length / (CFG.VFX.PHYSICS_LIMIT || 600);
    let mult = 1.0;
    if (this.rollingFps < 54) {
      mult = Math.max(0.38, (this.rollingFps - 30) / 24);
    }
    if (poolLoad > 0.72) {
      mult *= 0.65;
    }
    return mult;
  }

  /**
   * Spawns a versatile physics particle (supports velocity alignment, anisotropic spark stretch, additive glow, and custom gravity).
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
    if (this.pool.phys.length === 0) return null;

    // In LOW mode or under heavy load, probabilistically skip minor decorative particles
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

    // Smart defaults based on texture key + optional extra overrides
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
    s.vRot = extra?.vRot !== undefined ? extra.vRot : s.alignToVel ? 0 : FastMath.randRange(-0.14, 0.14);

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
   * Emits a juicy directional cone of high-velocity sparks, glowing embers, and an additive core flash.
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

    // 1. Instant additive core flash halo
    this.spawnGlow(x, y, color, 0.85, 10, 0.65);

    // 2. High-velocity directional spark streaks + white-hot core sparks
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
  spawnGlow(x, y, color = 0x00e5ff, scale = 1.0, life = 14, alpha = 0.65) {
    return this.spawnPhysics('fx_glow', x, y, 0, 0, life, 1, 1, true, color, alpha, {
      additive: true,
      alignToVel: false,
      scale,
      grav: 0,
      vRot: 0
    });
  }

  /**
   * Spawns a ghost afterimage trail for dashing fighters or fast projectiles on the under-unit layer.
   */
  spawnAfterimage(
    textureOrKey,
    x,
    y,
    scaleX = 1.0,
    scaleY = 1.0,
    rotation = 0,
    tint = 0x00e5ff,
    alpha = 0.48,
    life = 12,
    additive = true
  ) {
    if (this.pool.decals.length === 0) return null;
    if ((DebugConfig.state.vfxQuality || 'auto') === 'low' && FastMath.rand() > 0.5) return null;

    const tex =
      typeof textureOrKey === 'string' ? this.textures[textureOrKey] : textureOrKey;
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
   * Stamps a persistent, slowly fading floor scorch mark under units on explosions or KOs.
   */
  spawnScorch(x, y, color = 0x00e5ff, scale = 1.1, life = 220) {
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
    d.baseAlpha = 0.65;
    d.alpha = 0.65;
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

  /**
   * Spawns a primary expanding shockwave ring + concentric secondary ring + additive flash.
   */
  spawnShockwave(x, y, color = 0x00e5ff, maxRadius = 80, width = 4, isSecondary = false) {
    if (this.pool.sws.length === 0) return;
    const sw = this.pool.sws.pop();
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
    sw.life = isSecondary ? 16 : 22;
    sw.maxL = sw.life;
    sw.visible = true;
    sw.alpha = isSecondary ? 0.85 : 1.0;
    sw.scale.set(sw.r);
    this.act.sws.push(sw);

    // Automatically pair major shockwaves with a crisp inner white-tinted secondary ring & center bloom
    if (!isSecondary && maxRadius >= 42 && (DebugConfig.state.vfxQuality || 'auto') !== 'low') {
      this.spawnGlow(x, y, color, Math.min(2.2, maxRadius / 42), 14, 0.55);
      if (this.pool.sws.length > 0) {
        this.spawnShockwave(x, y, 0xffffff, maxRadius * 0.72, 2, true);
      }
    }
  }

  /**
   * Spawns floating damage, critical hit ('!'), or heal ('+') popup numbers with bounce physics.
   */
  spawnDmgText(x, y, dmg, color = 0xff0000, scale = 1.0, options = null) {
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
    t.customScale = scale * critScaleBoost;
    t.isCrit = isCrit;

    // Glyph 0: Sign ('+' for heal, '-' for damage)
    const signTex = this.textures[isHeal ? 'digit_plus' : 'digit_minus'];
    const mainTint = isCrit && color === 0xff0000 ? 0xffdd00 : color;

    let glyphIdx = 0;
    if (signTex) {
      const g0 = t.children[glyphIdx++];
      g0.texture = signTex;
      g0.tint = mainTint;
      g0.visible = true;
    }

    // Digits
    const maxDigits = Math.min(str.length, 5);
    for (let i = 0; i < maxDigits; i++) {
      const dTex = this.textures['digit_' + str[i]];
      if (dTex && glyphIdx < t.children.length) {
        const g = t.children[glyphIdx++];
        g.texture = dTex;
        // Subtle 2-tone highlight on critical hits: leading digits bright gold/white
        g.tint = isCrit && i === 0 ? 0xffffff : mainTint;
        g.visible = true;
      }
    }

    // Optional '!' suffix for Critical / Heavy Hits
    if (isCrit && glyphIdx < t.children.length && this.textures['digit_bang']) {
      const gBang = t.children[glyphIdx++];
      gBang.texture = this.textures['digit_bang'];
      gBang.tint = 0xffdd00;
      gBang.visible = true;
    }

    // Hide unused glyph slots and center the active string horizontally
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
    this._updatePhysics(tS);
    this._updateDecals(tS);
    this._updateShockwaves(tS);
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
      s.alpha = (normLife < 0.08 ? 0.08 : normLife) * (s.baseAlpha !== undefined ? s.baseAlpha : 1.0);

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

  _updateShockwaves(tS) {
    for (let i = this.act.sws.length - 1; i >= 0; i--) {
      const s = this.act.sws[i];
      s.life -= tS;
      if (s.life <= 0) {
        s.visible = false;
        this.act.sws[i] = this.act.sws[this.act.sws.length - 1];
        this.act.sws.pop();
        this.pool.sws.push(s);
        continue;
      }
      const ease = s.ease || 0.22;
      s.r += (s.mR - s.r) * ease * tS;
      s.scale.set(s.r);
      s.alpha = Math.pow(Math.max(0, s.life / s.maxL), 0.85);
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
      t.vy += 0.16 * tS; // Crisp arcade arc gravity
      t.vx *= pTxtDrag;
      t.x += t.vx * tS;
      t.y += t.vy * tS;

      // Subtle bounce when landing near initial floor height
      if (t.floorY !== undefined && t.y > t.floorY && t.vy > 0) {
        t.y = t.floorY;
        t.vy = -t.vy * 0.42;
      }

      const fT = t.maxL * 0.32;
      t.alpha = t.life < fT ? t.life / fT : 1;

      const progress = 1.0 - t.life / t.maxL;
      const popPhase = Math.min(1.0, progress * 6.0);
      const elasticBounce = 0.52 + Math.sin(popPhase * Math.PI) * (t.isCrit ? 0.42 : 0.28);
      t.scale.set(elasticBounce * (t.customScale || 1.0));
    }
  }
}
