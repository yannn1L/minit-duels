// ============================================================
// HIGH PERFORMANCE VFX POOL (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';
import { FastMath } from './FastMath.js';

export class VFXPool {
  constructor(cU, cO, texturesRef) {
    this.cU = cU;
    this.cO = cO;
    this.textures = texturesRef;
    this.pool = { phys: [], sws: [], txts: [] };
    this.act = { phys: [], sws: [], txts: [] };

    // Physics sprites pool
    const physLimit = CFG.VFX.PHYSICS_LIMIT;
    for (let i = 0; i < physLimit; i++) {
      const s = new PIXI.Sprite();
      s.visible = false;
      s.anchor.set(0.5);
      this.cU.addChild(s);
      this.pool.phys.push(s);
    }

    // Text containers pool
    const textLimit = CFG.VFX.TEXT_LIMIT;
    for (let i = 0; i < textLimit; i++) {
      const ct = new PIXI.Container();
      ct.visible = false;
      for (let j = 0; j < 6; j++) {
        const d = new PIXI.Sprite();
        d.x = j * CFG.VFX.DMG_TEXT.CHAR_SPACING;
        ct.addChild(d);
      }
      this.cO.addChild(ct);
      this.pool.txts.push(ct);
    }

    // Shockwaves pool
    for (let i = 0; i < 20; i++) {
      const sw = new PIXI.Sprite();
      sw.anchor.set(0.5);
      sw.visible = false;
      this.cU.addChild(sw);
      this.pool.sws.push(sw);
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
    tint = 0xffffff
  ) {
    if (this.pool.phys.length === 0) return;
    const tex = this.textures[texKey];
    if (!tex) return;

    const s = this.pool.phys.pop();
    s.texture = tex;
    s.x = x;
    s.y = y;
    s.vx = vx;
    s.vy = vy;
    s.life = life;
    s.maxL = life;
    s.dragX = dragX;
    s.dragY = dragY;
    s.sD = scaleDown;
    s.tint = tint;
    s.visible = true;
    s.alpha = 1;
    s.scale.set(1);
    s.rotation = FastMath.rand() * 6.28;
    this.act.phys.push(s);
  }

  spawnShockwave(x, y, color, maxRadius = 80, width = 4) {
    if (this.pool.sws.length === 0) return;
    const sw = this.pool.sws.pop();
    sw.x = x;
    sw.y = y;
    sw.tint = color;
    sw.r = 0.1;
    sw.mR = maxRadius / 60;
    sw.life = 20;
    sw.maxL = 20;
    sw.visible = true;
    sw.alpha = 1;
    sw.scale.set(0.1);
    this.act.sws.push(sw);
  }

  spawnDmgText(x, y, dmg, color = 0xff0000) {
    if (this.pool.txts.length === 0) return;
    const t = this.pool.txts.pop();
    const str = Math.floor(dmg).toString();

    const minusTex = this.textures['digit_minus'];
    if (minusTex) {
      t.children[0].texture = minusTex;
      t.children[0].tint = color;
      t.children[0].visible = true;
    }

    for (let j = 1; j < 6; j++) {
      if (j - 1 < str.length) {
        const dTex = this.textures['digit_' + str[j - 1]];
        if (dTex) {
          t.children[j].texture = dTex;
          t.children[j].tint = color;
          t.children[j].visible = true;
        } else {
          t.children[j].visible = false;
        }
      } else {
        t.children[j].visible = false;
      }
    }

    t.x = x + FastMath.randRange(-8, 8);
    t.y = y + FastMath.randRange(-2, 2);
    t.vx = FastMath.randRange(-CFG.VFX.DMG_TEXT.VX_SPREAD, CFG.VFX.DMG_TEXT.VX_SPREAD);
    t.vy = CFG.VFX.DMG_TEXT.VY;
    t.life = CFG.VFX.DMG_TEXT.LIFE;
    t.maxL = CFG.VFX.DMG_TEXT.LIFE;
    t.visible = true;
    t.alpha = 1;
    t.scale.set(0.1);
    this.act.txts.push(t);
  }

  update(tS) {
    this._updatePhysics(tS);
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

      s.vy += 0.5 * tS;
      s.vx *= s.dragX === CFG.PHYSICS.DRAG_X ? pDX : Math.pow(s.dragX, tS);
      s.vy *= s.dragY === CFG.PHYSICS.DRAG_Y ? pDY : Math.pow(s.dragY, tS);
      s.x += s.vx * tS;
      s.y += s.vy * tS;

      const normLife = s.life / s.maxL;
      s.alpha = normLife < 0.1 ? 0.1 : normLife;
      if (s.sD) s.scale.set(normLife);
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
      s.r += (s.mR - s.r) * 0.2 * tS;
      s.scale.set(s.r);
      s.alpha = s.life / s.maxL;
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
      t.vx *= pTxtDrag;
      t.vy *= pTxtDrag;
      t.x += t.vx * tS;
      t.y += t.vy * tS;

      const fT = t.maxL * 0.33;
      t.alpha = t.life < fT ? t.life / fT : 1;

      const progress = 1.0 - t.life / t.maxL;
      const st = Math.min(1.0, progress * 5.0);
      const sA = 0.5 + Math.sin(st * Math.PI) * 0.3;
      t.scale.set(sA);
    }
  }
}
