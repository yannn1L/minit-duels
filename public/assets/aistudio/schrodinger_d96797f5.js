// ============================================================
// CUSTOM MINIT: SCHRODINGER (Quantum Superposition & Wave Collapse)
// Physics: |Ψ⟩ = (|Alive⟩ + |Dead⟩)/√2, Quantum Tunneling & Entanglement
// Built for the Universal Minit Builder (MinitSDK) & High-Juice VFX Engine
// Save as "schrodinger.js" (and optionally pair with "schrodinger.png"!)
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

const SCHRODINGER_BASE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAQFJREFUOE+lk6EOwjAQhq9IBgKBrwGFg6CrCCS8ASQoFArkFFheBwFBTRNwOB4BCUMyes1u69oDQjjTrun/3d3fm4A/Q3D6RId7LnRwd71DFAdB3bsbx1fgIAUAiaVsgpTSQJRSZl0uQ+AgGYAT22UgiIMYACferOcgankrw2loqnEhLADFnokahpAo2hda+QiodgdwO2wNC/f3yxEqjY4PsNtQqmeyYKBp9CLunl7EM3E1G8NiMsqy/lyBDSAfSi0Bz3MCuAblPsSPnXa+beaCnQMXYgNQCOLEA2wvEEKBLSEkizQ7fr/9F9xxRhPtzARjAVSJPwx56V8BnjidWNe3FwkwnxHJ9RA+AAAAAElFTkSuQmCC';

export const MINIT_SCHRODINGER = {
  id: 'schrodinger',
  name: 'SCHRODINGER',
  color: 0xff00cc,
  desc: 'Exists in |Alive⟩ & |Dead⟩ superposition.',

  // 1. MULTI-LAYERED STATS (HP, Speed, Regenerating Quantum Shield & Armor)
  stats: {
    hp: 1160,
    speed: 0.15,
    shield: 150,
    maxShield: 240,
    shieldRegen: 0.18,
    armor: 2,
    scale: 1.0
  },

  // 2. TARGETING & PLUGGABLE MOVEMENT AI
  targeting: { type: 'closest_enemy' },
  movement: {
    type: 'strafe',
    idealDist: 3.6
  },

  // 3. INITIAL QUANTUM STATE (Cloned into `self.state` at match start)
  initialState: {
    spinState: 1,            // Alternates +1 (|Alive⟩ Cyan) and -1 (|Dead⟩ Magenta)
    hasCollapsedDeath: false,
    tunnelCount: 0,
    entangledCloneId: null
  },

  // 4. DEATH VFX
  deathVfx: {
    shake: 18,
    flash: 0.9,
    particleCount: 48,
    shockRad: 180,
    sound: 'schro_decoherence_boom',
    hitStop: 15
  },

  // 5. PAYLOAD PARAMETERS
  payload: {
    waveDmg: 24,
    waveSpeed: 0.41,
    cloudDuration: 90,
    cloudRadius: 1.9,
    cloudTickDmg: 7.5,
    collapseDmg: 64,
    collapseRadius: 2.6,
    boxAliveDmg: 42,
    boxAliveHeal: 95,
    boxDeadDmg: 78,
    zoneRadius: 1.1,
    destroyOnHit: true,
    hitVfx: {
      shake: 4,
      flash: 0.14,
      particleCount: 7,
      particleTex: 'fx_schro_qubit',
      sound: 'schro_phase_hit',
      playSound: true,
      hitStop: 2
    }
  },

  // ============================================================
  // 6. MULTI-SLOT QUANTUM ABILITIES (`actions`)
  // ============================================================
  actions: [
    // ----------------------------------------------------------
    // SLOT 1: DOUBLE-SLIT INTERFERENCE WAVE
    // Fires 3 phase-shifted wave packets that spawn Interference Clouds
    // ----------------------------------------------------------
    {
      id: 'double_slit_wave',
      name: 'Double-Slit Wave',
      cd: 85,
      sound: 'schro_wave_cast',
      onExecute: (self, target, arena) => {
        if (!target) return;
        const pay = self.def.payload;

        // Flip quantum spin polarity (+1 Cyan |Alive⟩ <-> -1 Magenta |Dead⟩)
        self.state.spinState = (self.state.spinState || 1) * -1;
        const isAliveSpin = self.state.spinState > 0;
        const waveColor = isAliveSpin ? 0x00ffcc : 0xff00aa;

        const oPX = self.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const oPY = self.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

        arena.fxPool.spawnGlow(oPX, oPY, waveColor, 1.2, 12, 0.65);
        arena.spawnGridRipple(oPX, oPY, 55, 4.0, waveColor);

        // Shoot 3 Double-Slit Interference Wave Packets using MinitSDK!
        arena.shootProjectile(self, {
          target,
          count: 3,
          spread: 0.34,
          speed: pay.waveSpeed || 0.41,
          life: 52,
          dmg: pay.waveDmg || 24,
          radius: 1.1,
          homing: true,
          turnRate: 0.045,
          bounce: true,
          knockbackForce: 0.55,
          tex: 'fx_schro_wave_crest',
          trailTex: 'fx_schro_qubit',
          tint: waveColor,
          onTick: (e, a) => {
            // Sinusoidal wave oscillation visual along flight path
            if (!a.isHeadless && e.l % 3 === 0) {
              const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
              const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
              a.fxPool.spawnAfterimage(
                'fx_schro_wave_crest',
                pX,
                pY,
                0.85,
                0.85,
                Math.atan2(e.dy, e.dx),
                e.l % 6 === 0 ? 0x00ffcc : 0xff00aa,
                0.45,
                8,
                true
              );
            }
          },
          onHit: (e, tgt, a) => {
            // Merge into a nearby Probability Cloud if one already exists so 3 wave hits don't stack 3x rings
            const mergeDistSq = 2.1 * 2.1;
            const ownerKey = self.team || self.id;
            let merged = null;
            if (a.actE) {
              for (let i = 0; i < a.actE.length; i++) {
                const ent = a.actE[i];
                if (
                  ent &&
                  !ent.dead &&
                  ent.traits &&
                  ent.traits.includes('schroProbabilityCloud') &&
                  ent.p?.ownerId === ownerKey &&
                  FastMath.distSq(ent.x, ent.y, e.x, e.y) <= mergeDistSq
                ) {
                  merged = ent;
                  break;
                }
              }
            }

            if (merged) {
              merged.x = FastMath.lerp(merged.x, e.x, 0.35);
              merged.y = FastMath.lerp(merged.y, e.y, 0.35);
              merged.l = Math.min((pay.cloudDuration || 90) + 25, merged.l + 28);
              merged.p.radius = Math.min(2.35, (merged.p.radius || pay.cloudRadius || 1.9) + 0.14);
              merged.p.color = waveColor;
              return;
            }

            // Deploy a lingering Probability Interference Cloud at impact
            a.spawnEnt({
              x: e.x,
              y: e.y,
              l: pay.cloudDuration || 90,
              traits: ['schroProbabilityCloud', 'ageLife'],
              p: {
                ownerId: ownerKey,
                sourceActorId: self.id,
                color: waveColor,
                radius: pay.cloudRadius || 1.9,
                payload: pay
              }
            });
          }
        });
      }
    },

    // ----------------------------------------------------------
    // SLOT 2: QUANTUM SUPERPOSITION SPLIT & ENTANGLEMENT
    // Splits into |Alive⟩ (Cyan) & |Dead⟩ (Magenta) entangled states,
    // linked by a live Quantum Entanglement Beam that collapses!
    // ----------------------------------------------------------
    {
      id: 'quantum_superposition',
      name: 'Superposition Split',
      cd: 185,
      initialCd: 65,
      sound: 'schro_superpose',
      onExecute: (self, target, arena) => {
        if (!target) return;
        const pay = self.def.payload;

        // Calculate symmetrical superposition coordinates flanking the target
        const baseAng = FastMath.angle(target.x, target.y, self.x, self.y);
        const dist = 2.8;
        const aliveX = FastMath.clamp(
          target.x + Math.cos(baseAng + 0.75) * dist,
          CFG.ARENA_BOUNDS.MIN_X + 0.8,
          CFG.ARENA_BOUNDS.MAX_X - 0.8
        );
        const aliveY = FastMath.clamp(
          target.y + Math.sin(baseAng + 0.75) * dist,
          CFG.ARENA_BOUNDS.MIN_Y + 0.8,
          CFG.ARENA_BOUNDS.MAX_Y - 0.8
        );
        const deadX = FastMath.clamp(
          target.x + Math.cos(baseAng - 0.75) * dist,
          CFG.ARENA_BOUNDS.MIN_X + 0.8,
          CFG.ARENA_BOUNDS.MAX_X - 0.8
        );
        const deadY = FastMath.clamp(
          target.y + Math.sin(baseAng - 0.75) * dist,
          CFG.ARENA_BOUNDS.MIN_Y + 0.8,
          CFG.ARENA_BOUNDS.MAX_Y - 0.8
        );

        // 1. Teleport Schrodinger (|Alive⟩ state) to the first quantum locus
        arena.teleport(self, aliveX, aliveY, {
          color: 0x00ffcc,
          sound: 'schro_tunnel'
        });
        arena.applyStatus(self, self, { invulnTicks: 22 });

        // 2. Spawn the Entangled |Dead⟩ Antimatter State Clone at the opposite locus!
        const clone = arena.spawnClone(self, {
          name: '|Ψ_Dead⟩',
          x: deadX,
          y: deadY,
          hpPct: 0.3,
          dmgMult: 0.55,
          scale: 0.9,
          life: 135,
          color: 0xff00aa,
          movement: { type: 'orbit', idealDist: 2.3, orbitDir: -1 }
        });

        // 3. Spawn Quantum Entanglement & Wave-Function Collapse Controller
        if (clone) {
          self.state.entangledCloneId = clone.id;
          arena.spawnEnt({
            x: self.x,
            y: self.y,
            l: 120,
            maxL: 120,
            traits: ['schroEntanglementLink', 'ageLife'],
            p: {
              ownerId: self.team || self.id,
              sourceActorId: self.id,
              cloneId: clone.id,
              color: 0xff00aa,
              payload: pay
            }
          });
        }
      }
    },

    // ----------------------------------------------------------
    // SLOT 3: SCHRODINGER'S BOX PARADOX (50/50 Alive or Dead Verdict!)
    // Encapsulates enemy in a Quantum Box that collapses after 45 ticks!
    // ----------------------------------------------------------
    {
      id: 'schrodingers_box',
      name: "Schrodinger's Box",
      cd: 255,
      initialCd: 115,
      sound: 'schro_box_lock',
      onExecute: (self, target, arena) => {
        if (!target) return;
        const pay = self.def.payload;

        const tPX = target.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const tPY = target.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

        arena.fxPool.spawnShockwave(tPX, tPY, 0x00ffcc, 66, 3.0);
        arena.spawnGridRipple(tPX, tPY, 68, 4.2, 0x00ffcc);

        // Spawn the Quantum Paradox Box around the enemy for 48 ticks (0.8s)
        arena.spawnEnt({
          x: target.x,
          y: target.y,
          l: 48,
          maxL: 48,
          traits: ['schroParadoxBox', 'ageLife'],
          p: {
            ownerId: self.team || self.id,
            sourceActorId: self.id,
            targetId: target.id,
            color: 0x00ffcc,
            payload: pay
          }
        });
      }
    }
  ],

  // ============================================================
  // 7. FULL LIFECYCLE HOOKS (`hooks`)
  // ============================================================
  hooks: {
    // Ambient Dual-Spin Superposition Aura (Alternating Cyan |Alive⟩ & Magenta |Dead⟩ motes)
    onTick: (self, arena) => {
      if (arena.isHeadless || arena.totalTicks % 5 !== 0) return;
      const pX = self.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = self.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const ang = arena.totalTicks * 0.22;
      const isCyan = (arena.totalTicks % 10) < 5;

      arena.fxPool.spawnPhysics(
        'fx_schro_qubit',
        pX + Math.cos(ang) * 10,
        pY + Math.sin(ang) * 10,
        -Math.sin(ang) * 0.5,
        Math.cos(ang) * 0.5,
        11,
        0.92,
        0.92,
        true,
        isCyan ? 0x00ffcc : 0xff00aa,
        0.85,
        { additive: true, grav: 0, scale: 0.75 }
      );
    },

    // QUANTUM TUNNELING DODGE: 18% probability to phase straight through an attack!
    onBeforeDamaged: (self, dmgCtx, arena) => {
      if (FastMath.rand() < 0.18) {
        dmgCtx.cancel = true;
        self.state.tunnelCount = (self.state.tunnelCount || 0) + 1;

        const pX = self.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const pY = self.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

        if (!arena.isHeadless && self.spr?.texture) {
          // Leave BOTH a Cyan |Alive⟩ and Magenta |Dead⟩ split afterimage!
          arena.fxPool.spawnAfterimage(
            self.spr.texture,
            pX - 5,
            pY,
            self.spr.scale.x * 1.15,
            self.spr.scale.y * 1.15,
            -0.15,
            0x00ffcc,
            0.75,
            15,
            true
          );
          arena.fxPool.spawnAfterimage(
            self.spr.texture,
            pX + 5,
            pY,
            self.spr.scale.x * 1.15,
            self.spr.scale.y * 1.15,
            0.15,
            0xff00aa,
            0.75,
            15,
            true
          );
          arena.fxPool.spawnSparkBurst(pX, pY, null, 0x00ffcc, 8, 3.6, Math.PI, 16);
        }

        // Tunnel through space to flank the attacker
        const attacker = dmgCtx.attacker;
        const destX = attacker
          ? FastMath.clamp(attacker.x + FastMath.randRange(-2.5, 2.5), CFG.ARENA_BOUNDS.MIN_X + 0.8, CFG.ARENA_BOUNDS.MAX_X - 0.8)
          : FastMath.randRange(1.5, CFG.GRID.COLS - 2.5);
        const destY = attacker
          ? FastMath.clamp(attacker.y + FastMath.randRange(-2.5, 2.5), CFG.ARENA_BOUNDS.MIN_Y + 0.8, CFG.ARENA_BOUNDS.MAX_Y - 0.8)
          : FastMath.randRange(1.5, CFG.GRID.ROWS - 2.5);

        arena.teleport(self, destX, destY, {
          color: 0xff00aa,
          sound: 'schro_tunnel'
        });
      }
    },

    // OBSERVER PARADOX REVIVAL: Collapses into Pure |Alive⟩ Eigenstate on first fatal hit!
    onBeforeDeath: (self, arena) => {
      if (self.isSummon || self.state.hasCollapsedDeath) return;
      self.state.hasCollapsedDeath = true;

      const pX = self.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = self.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      AudioSys.play('schro_decoherence_boom');
      arena.triggerFlash(0.9);
      arena.shake = Math.max(arena.shake, 16);
      arena.hitStop = Math.max(arena.hitStop, 8);

      // Collapse into |Alive⟩ Eigenstate: Restore 35% HP + 180 Quantum Shield!
      arena.heal(self, Math.round(self.maxHp * 0.35));
      arena.addShield(self, 180, 260);
      arena.applyStatus(self, self, { invulnTicks: 35 });

      // Shift into Pure Coherent Eigenstate Phase (+Speed, +Damage)
      arena.setPhase(self, {
        color: 0x00ffcc,
        scale: 1.15,
        dmgMult: (self.dmgMult || 1.0) * 1.22,
        stats: { speed: 0.18, shieldRegen: 0.28 }
      });

      if (!arena.isHeadless) {
        arena.fxPool.spawnScorch(pX, pY, 0xff00aa, 1.45, 280);
        arena.spawnGridRipple(pX, pY, 135, 9.5, 0x00ffcc);
        arena.fxPool.spawnSparkBurst(pX, pY, null, 0x00ffcc, 18, 5.5, Math.PI, 24);
      }

      arena.dealAreaDamage(self, self.x, self.y, 2.8, 62, {
        color: 0xff00aa,
        knockbackForce: 1.25,
        sound: 'schro_collapse_boom'
      });
    }
  },

  // ============================================================
  // 8. BASE SPRITE ICON (Half-Cyan |Alive⟩ / Half-Magenta |Dead⟩ Cat-Box)
  // ============================================================
  textures: {
    base: SCHRODINGER_BASE
  },

  // ============================================================
  // 9. HIGH-JUICE PROCEDURAL VFX TEXTURES
  // ============================================================
  customTextures: {
    // 1. Sinusoidal Quantum Wave Crest Projectile
    fx_schro_wave_crest: (g) => {
      g.beginFill(0x00ffcc, 0.32).drawCircle(0, 0, 8.5).endFill();
      g.lineStyle(2, 0x00ffcc, 0.95)
        .arc(0, 0, 6.5, -Math.PI * 0.42, Math.PI * 0.42);
      g.lineStyle(1.5, 0xff00aa, 0.9)
        .arc(-2, 0, 4.5, -Math.PI * 0.35, Math.PI * 0.35);
      g.lineStyle(0).beginFill(0xffffff, 1.0).drawCircle(2, 0, 2.2).endFill();
    },

    // 2. Superposition Qubit Particle (Dual-Spin Diamond)
    fx_schro_qubit: (g) => {
      g.beginFill(0x00ffcc, 0.95).drawPolygon([0, -4, 3.5, 0, 0, 0, -3.5, 0]).endFill();
      g.beginFill(0xff00aa, 0.95).drawPolygon([0, 4, 3.5, 0, 0, 0, -3.5, 0]).endFill();
      g.beginFill(0xffffff, 1.0).drawRect(-1, -1, 2, 2).endFill();
    },

    // 3. Double-Slit Interference Fringe Ring (Clean fallback sprite when Connected Layers are off)
    fx_schro_cloud_ring: (g) => {
      g.beginFill(0x00ffcc, 0.05).drawCircle(0, 0, 28).endFill();
      g.lineStyle(1.8, 0x00ffcc, 0.55).drawCircle(0, 0, 28);
      g.lineStyle(1.2, 0xff00aa, 0.38).arc(0, 0, 20, -Math.PI * 0.65, Math.PI * 0.35);
      g.lineStyle(1.2, 0xff00aa, 0.38).arc(0, 0, 20, Math.PI * 0.55, Math.PI * 1.15);
    },

    // 4. Schrodinger's Quantum Containment Box (Isometric Hypercube)
    fx_schro_box: (g) => {
      g.beginFill(0x100820, 0.1).drawRect(-24, -24, 48, 48).endFill();
      // Outer Cyan |Alive⟩ Cube Frame
      g.lineStyle(1.8, 0x00ffcc, 0.72).drawRect(-24, -24, 48, 48);
      // Inner Magenta |Dead⟩ Hypercube Frame + Corner Tethers
      g.lineStyle(1.4, 0xff00aa, 0.68).drawRect(-16, -16, 32, 32);
      g.lineStyle(1.0, 0xffffff, 0.55)
        .moveTo(-24, -24).lineTo(-16, -16)
        .moveTo(24, -24).lineTo(16, -16)
        .moveTo(24, 24).lineTo(16, 16)
        .moveTo(-24, 24).lineTo(-16, 16);
    }
  },

  // ============================================================
  // 10. PROCEDURAL WEB AUDIO SYNTHESIZER PATCHES
  // ============================================================
  customAudio: {
    schro_wave_cast: {
      t: 'sine',
      f0: 587.33,
      f1: 1174.66,
      f2: 440,
      v: 0.18,
      d: 0.22,
      ramp: 'lin_exp',
      throttle: 0.05
    },
    schro_superpose: {
      t: 'triangle',
      f0: 330,
      seq: [440, 659.25, 880, 1318.51],
      v: 0.2,
      d: 0.28,
      ramp: 'exp',
      throttle: 0.08
    },
    schro_tunnel: {
      t: 'sine',
      f0: 1480,
      f1: 320,
      v: 0.16,
      d: 0.12,
      ramp: 'exp',
      throttle: 0.04
    },
    schro_box_lock: {
      t: 'square',
      f0: 220,
      seq: [440, 330, 660],
      v: 0.18,
      d: 0.24,
      ramp: 'exp',
      throttle: 0.08
    },
    schro_phase_hit: {
      t: 'triangle',
      f0: () => 900 + Math.random() * 600,
      f1: 240,
      v: 0.14,
      d: 0.08,
      ramp: 'exp',
      throttle: 0.03
    },
    schro_collapse_boom: {
      noise: true,
      fType: 'bandpass',
      f0: 2100,
      f1: 75,
      oF0: 260,
      oF1: 36,
      v: 0.4,
      d: 0.38,
      throttle: 0.06
    },
    schro_decoherence_boom: {
      noise: true,
      fType: 'lowpass',
      f0: 2400,
      f1: 32,
      oF0: 300,
      oF1: 20,
      v: 0.48,
      d: 0.56,
      throttle: 0.1
    }
  },

  // ============================================================
  // 11. CUSTOM ECS TRAITS: ENTANGLEMENT, WAVE COLLAPSE & PARADOX BOX
  // ============================================================
  customTraits: {
    // ------------------------------------------------------------
    // 1. QUANTUM ENTANGLEMENT LINK & WAVE FUNCTION COLLAPSE
    // Tethers Schrodinger (|Alive⟩) and his Clone (|Dead⟩) with an
    // Entanglement Beam. Damages enemies crossing the beam & collapses
    // when an enemy gets close to the clone or when time expires!
    // ------------------------------------------------------------
    schroEntanglementLink: (e, a) => {
      const owner = a.getActorById
        ? a.getActorById(e.p.sourceActorId || e.p.ownerId)
        : a.playerMap?.[e.p.ownerId];
      const clone = a.getActorById ? a.getActorById(e.p.cloneId) : null;

      if (!owner || owner.hp <= 0) {
        if (e.p.entangleBeamId && a.beamRenderer) a.beamRenderer.removeBeam(e.p.entangleBeamId);
        e.dead = true;
        return;
      }

      const pay = e.p.payload;
      const dMult = owner.dmgMult || 1.0;

      // Track clone position if still alive
      if (clone && clone.hp > 0) {
        e.x = clone.x;
        e.y = clone.y;
      }

      const oPX = owner.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const oPY = owner.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const cPX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const cPY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      // Render Quantum Entanglement Beam between |Alive⟩ and |Dead⟩ states
      if (!a.isHeadless && clone && clone.hp > 0) {
        if (!e.p.entangleBeamId) {
          e.p.entangleBeamId = 'schro_entangle_' + Math.random().toString(36).slice(2, 8);
        }
        if (a.beamRenderer) {
          const isPulseCyan = e.l % 6 < 3;
          a.beamRenderer.renderBeam(e.p.entangleBeamId, {
            startX: oPX,
            startY: oPY,
            endX: cPX,
            endY: cPY,
            coreColor: 0xffffff,
            sheathColor: isPulseCyan ? 0x00ffcc : 0xff00aa,
            glowColor: isPulseCyan ? 0xff00aa : 0x00ffcc,
            coreWidth: 1.6,
            sheathWidth: 4.5,
            glowWidth: 10,
            glowAlpha: 0.3,
            sheathAlpha: 0.78,
            hasLightning: true,
            lightningColor: 0xffffff,
            lightningBranches: 2,
            jitter: 2.5
          });
        }
      }

      // Check if an enemy observes (approaches within 1.45 grid units of) the |Dead⟩ Clone!
      const enemies = a.getOpposingActors ? a.getOpposingActors(e.p.ownerId) : a.players;
      let observedByEnemy = false;

      for (let i = 0; i < enemies.length; i++) {
        const tgt = enemies[i];
        if (tgt.hp > 0 && FastMath.distSq(e.x, e.y, tgt.x, tgt.y) <= 1.45 * 1.45) {
          observedByEnemy = true;
          break;
        }
      }

      // ==========================================================
      // WAVE FUNCTION COLLAPSE TRIGGER:
      // Collapses if an enemy observes the clone, clone dies, or timer ends!
      // ==========================================================
      if (observedByEnemy || !clone || clone.hp <= 0 || e.l <= 1) {
        if (e.p.entangleBeamId && a.beamRenderer) {
          a.beamRenderer.removeBeam(e.p.entangleBeamId);
        }

        // 50/50 Quantum Collapse Position: Midpoint or Clone Locus if observed!
        const collapseX = observedByEnemy ? e.x : (owner.x + e.x) * 0.5;
        const collapseY = observedByEnemy ? e.y : (owner.y + e.y) * 0.5;
        const colPX = collapseX * CFG.GRID.TS + CFG.GRID.HALF_TS;
        const colPY = collapseY * CFG.GRID.TS + CFG.GRID.HALF_TS;

        AudioSys.play('schro_collapse_boom');
        if (!a.isHeadless) {
          a.fxPool.spawnScorch(colPX, colPY, 0xff00aa, 1.15, 210);
          if (a.spawnGridRipple) a.spawnGridRipple(colPX, colPY, 92, 6.5, 0xff00aa);
          a.fxPool.spawnSparkBurst(colPX, colPY, null, 0x00ffcc, 14, 4.8, Math.PI, 20);
        }

        // Despawn the temporary |Dead⟩ clone upon wave collapse
        if (clone && clone.hp > 0) {
          clone.hp = 0;
        }

        // Detonate Eigenstate Wave-Collapse AOE Burst!
        a.dealAreaDamage(owner, collapseX, collapseY, pay.collapseRadius || 2.6, (pay.collapseDmg || 64) * dMult, {
          color: 0xff00aa,
          knockbackForce: 1.05,
          shake: 11,
          flash: 0.35
        });

        e.dead = true;
      }
    },

    // ------------------------------------------------------------
    // 2. SCHRODINGER'S PARADOX BOX (ISOMETRIC CONTAINMENT CUBE)
    // Follows & slows the enemy for 48 ticks, then opens the box
    // for a 50/50 |Alive⟩ (Heal + Shield + Zap) or |Dead⟩ (Crit Boom + Stun)!
    // ------------------------------------------------------------
    schroParadoxBox: (e, a) => {
      const owner = a.getActorById
        ? a.getActorById(e.p.sourceActorId || e.p.ownerId)
        : a.playerMap?.[e.p.ownerId];
      const tgt = a.getActorById ? a.getActorById(e.p.targetId) : null;

      if (!owner || owner.hp <= 0 || !tgt || tgt.hp <= 0) {
        e.dead = true;
        return;
      }

      const pay = e.p.payload;
      const dMult = owner.dmgMult || 1.0;

      // Gently pull and confine the enemy toward the center of the Quantum Box
      e.x = FastMath.lerp(e.x, tgt.x, 0.25);
      e.y = FastMath.lerp(e.y, tgt.y, 0.25);
      tgt.x -= tgt.dx * 0.55;
      tgt.y -= tgt.dy * 0.55;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      if (!a.isHeadless) {
        const pulseScale = 0.92 + Math.sin(e.l * 0.35) * 0.08;
        // Render the Isometric Hypercube under the fighters so it never blocks visibility
        a.fxPool.spawnPhysics('fx_schro_box', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff, 0.52, {
          additive: false,
          underUnit: true,
          grav: 0,
          scale: pulseScale,
          rotation: Math.sin(e.l * 0.2) * 0.06
        });

        // Smoothly connect the containment field into the layered ring system
        if (a.fxPool.spawnZoneRing) {
          a.fxPool.spawnZoneRing(pX, pY, 27 * pulseScale, 0x00ffcc, {
            secondaryColor: 0xff00aa,
            width: 1.8,
            fillAlpha: 0.14,
            life: 3,
            dedupeDist: 24
          });
        }

        if (e.l % 6 === 0) {
          a.fxPool.spawnPhysics(
            'fx_schro_qubit',
            pX + FastMath.randRange(-16, 16),
            pY + FastMath.randRange(-16, 16),
            FastMath.randRange(-0.8, 0.8),
            FastMath.randRange(-0.8, 0.8),
            10,
            0.9,
            0.9,
            true,
            e.l % 12 === 0 ? 0x00ffcc : 0xff00aa,
            0.78,
            { additive: true, grav: 0, scale: 0.85 }
          );
        }
      }

      // ==========================================================
      // OPEN THE BOX ON FINAL FRAME (`e.l <= 1`):
      // 50% |Alive⟩ State Verdict vs. 50% |Dead⟩ State Verdict!
      // ==========================================================
      if (e.l <= 1) {
        const isAliveOutcome = FastMath.rand() < 0.5;
        AudioSys.play('schro_collapse_boom');

        if (isAliveOutcome) {
          // |ALIVE⟩ VERDICT: Coherent Constructive Burst -> Heals & Shields Schrodinger + Zaps Target!
          a.heal(owner, pay.boxAliveHeal || 95);
          a.addShield(owner, 95, 250);
          a.dealAreaDamage(owner, e.x, e.y, 2.2, (pay.boxAliveDmg || 42) * dMult, {
            color: 0x00ffcc,
            knockbackForce: 0.85,
            shake: 9,
            flash: 0.28
          });
          if (!a.isHeadless) {
            a.fxPool.spawnSparkBurst(pX, pY, null, 0x00ffcc, 12, 4.2, Math.PI, 18);
            if (a.spawnGridRipple) a.spawnGridRipple(pX, pY, 76, 4.8, 0x00ffcc);
          }
        } else {
          // |DEAD⟩ VERDICT: Antimatter Collapse -> Massive Critical Damage + Stun + Scorch!
          a.applyStatus(owner, tgt, { stunTicks: 24 });
          a.dealAreaDamage(owner, e.x, e.y, 2.4, (pay.boxDeadDmg || 78) * dMult, {
            color: 0xff00aa,
            knockbackForce: 1.25,
            shake: 15,
            flash: 0.5
          });
          if (!a.isHeadless) {
            a.fxPool.spawnScorch(pX, pY, 0xff00aa, 1.2, 220);
            a.fxPool.spawnSparkBurst(pX, pY, null, 0xff00aa, 14, 5.0, Math.PI, 20);
            if (a.spawnGridRipple) a.spawnGridRipple(pX, pY, 96, 6.2, 0xff00aa);
          }
        }
      }
    },

    // ------------------------------------------------------------
    // 3. DOUBLE-SLIT PROBABILITY INTERFERENCE CLOUD
    // Uses the smooth 3-layer Connected Ring system underneath fighters
    // so overlapping clouds fuse into one clean quantum zone!
    // ------------------------------------------------------------
    schroProbabilityCloud: (e, a) => {
      const owner = a.getActorById
        ? a.getActorById(e.p.sourceActorId || e.p.ownerId)
        : a.playerMap?.[e.p.ownerId];
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const pay = e.p.payload;
      const cloudRadGrid = e.p.radius || pay.cloudRadius || 1.9;
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      if (!a.isHeadless) {
        const primaryCol = e.p.color || 0x00ffcc;
        const secondaryCol = primaryCol === 0x00ffcc ? 0xff00aa : 0x00ffcc;
        const radPx = cloudRadGrid * CFG.GRID.TS * 0.82;
        const fadeOut = e.l < 18 ? e.l / 18 : 1.0;

        if (a.fxPool.spawnZoneRing) {
          a.fxPool.spawnZoneRing(pX, pY, radPx, primaryCol, {
            secondaryColor: secondaryCol,
            width: 2.1,
            fillAlpha: 0.18 * fadeOut,
            life: 4,
            dedupeDist: 28
          });
        } else {
          a.fxPool.spawnPhysics('fx_schro_cloud_ring', pX, pY, 0, 0, 2, 1, 1, false, primaryCol, 0.42 * fadeOut, {
            additive: false,
            underUnit: true,
            grav: 0,
            rotation: e.l * 0.03
          });
        }

        // Subtle orbiting qubit mote on top particle layer
        if (e.l % 8 === 0) {
          const ang = e.l * 0.28;
          const orbitR = radPx * 0.72;
          a.fxPool.spawnPhysics(
            'fx_schro_qubit',
            pX + Math.cos(ang) * orbitR,
            pY + Math.sin(ang) * orbitR,
            -Math.sin(ang) * 0.45,
            Math.cos(ang) * 0.45,
            12,
            0.92,
            0.92,
            true,
            e.l % 16 === 0 ? primaryCol : secondaryCol,
            0.7 * fadeOut,
            { additive: true, grav: 0, scale: 0.72 }
          );
        }
      }

      if (e.l % 12 === 0) {
        const radSq = cloudRadGrid ** 2;
        const dMult = owner.dmgMult || 1.0;
        const enemies = a.getOpposingActors ? a.getOpposingActors(e.p.ownerId) : a.players;

        for (let i = 0; i < enemies.length; i++) {
          const tgt = enemies[i];
          if (
            (tgt.team || tgt.id) !== e.p.ownerId &&
            tgt.hp > 0 &&
            FastMath.distSq(e.x, e.y, tgt.x, tgt.y) <= radSq
          ) {
            a.applyStatus(owner, tgt, { slowTicks: 15, slowMult: 0.68 });
            a.damageActor(
              tgt,
              {
                dmg: (pay.cloudTickDmg || 7.5) * dMult,
                hitVfx: {
                  shake: 2,
                  flash: 0.05,
                  particleCount: 3,
                  particleTex: 'fx_schro_qubit',
                  playSound: false
                }
              },
              e.p.color || 0x00ffcc,
              owner
            );
          }
        }
      }
    }
  }
};