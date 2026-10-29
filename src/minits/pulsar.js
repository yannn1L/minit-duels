// ============================================================
// MINIT: PULSAR (ES Module)
// ============================================================
import { CFG } from '../config.js';
import { AudioSys } from '../engine/AudioSys.js';

export const MINIT_PULSAR = {
  id: 'pulsar',
  name: 'PULSAR',
  color: 0xff00aa,
  desc: 'Constant 360° rapid fire drone.',
  stats: { hp: 1100, speed: 0.1 },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 0,
    flash: 0.05,
    particleCount: 20,
    shockRad: 100,
    sound: 'explosion',
    hitStop: 10
  },

  payload: {
    droneOffset: 1,
    fireRate: 2,
    angleStep: 0.22,
    bulletDmg: 12,
    bulletLife: 35,
    bulletSpeed: 0.55,
    hitVfx: { shake: 0, flash: 0.05, particleCount: 2, playSound: true, sound: 'hit', hitStop: 0 }
  },

  action: {
    cd: 180,
    count: 1,
    speed: 0,
    life: 1,
    sound: 'start',
    traitList: ['pulsarDeployDrone']
  },

  textures: {
    base: './assets/minit_icon/pulsar.png',
    turret: (g, c) => {
      g.lineStyle(2, 0xffffff, 1).drawRect(-6, -6, 8, 8);
      g.lineStyle(1, c, 1).drawRect(-6, -6, 9, 9);
      g.beginFill(c).drawRect(-2, -10, 4, 4).endFill();
    }
  },

  customTextures: {
    fx_pulsar_bullet: (g) => {
      g.beginFill(0xffffff).moveTo(0, -4).lineTo(2, 0).lineTo(0, 4).lineTo(-2, 0).endFill();
      g.beginFill(0xff00aa, 0.4).drawCircle(0, 0, 5).endFill();
    }
  },

  customAudio: {
    pulsar_mg: {
      t: 'square',
      f0: () => 1000 + Math.random() * 500,
      f1: 50,
      v: 0.03,
      d: 0.05,
      ramp: 'exp',
      throttle: 0.08
    }
  },

  customTraits: {
    pulsarDeployDrone: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) return;
      a.spawnEnt({
        x: owner.x,
        y: owner.y - e.p.payload.droneOffset,
        l: 120,
        traits: ['pulsarDroneLogic'],
        p: {
          ownerId: owner.id,
          color: 0xff00aa,
          payload: e.p.payload,
          currentAngle: 0,
          shotTimer: 0
        }
      });
      e.dead = true;
    },

    pulsarDroneLogic: (e, a) => {
      const owner = a.players.find((p) => p.id === e.p.ownerId);
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      e.x += (owner.x - e.x) * 0.25;
      e.y += (owner.y - e.p.payload.droneOffset - e.y) * 0.25;
      owner.spr.rotation += 0.05;
      e.rotation = (e.rotation || 0) + 0.15;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      a.fxPool.spawnPhysics('minit_pulsar_turret', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);

      if (++e.p.shotTimer >= e.p.payload.fireRate) {
        e.p.shotTimer = 0;
        e.p.currentAngle += e.p.payload.angleStep;

        const vx = Math.cos(e.p.currentAngle) * e.p.payload.bulletSpeed;
        const vy = Math.sin(e.p.currentAngle) * e.p.payload.bulletSpeed;
        a.spawnEnt({
          x: e.x,
          y: e.y,
          dx: vx,
          dy: vy,
          l: e.p.payload.bulletLife,
          traits: ['moveAndBounce', 'ageLife', 'damageRadiusOnHit', 'trailParticles'],
          p: {
            ownerId: e.p.ownerId,
            color: 0xff00aa,
            payload: { dmg: e.p.payload.bulletDmg, hitVfx: e.p.payload.hitVfx },
            vfx: { trailTex: 'fx_pulsar_bullet', radius: 0.8 }
          }
        });
        AudioSys.play('pulsar_mg');
        owner.aS.tX = 1.15;
        owner.aS.tY = 0.85;
      }

      if (--e.l <= 0) e.dead = true;
    }
  }
};
