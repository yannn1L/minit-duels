// ============================================================
// CUSTOM MINIT LOADER & LOCAL STORAGE MANAGER (ES Module)
// Dynamic JS Evaluation + Automatic Filename Asset Sync + Persistence
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG, PALETTE, UI_STYLE } from '../config.js';
import { FastMath } from './FastMath.js';
import { AudioSys } from './AudioSys.js';
import { MinitEngine } from './Registry.js';
import { AssetBaker, Textures } from './AssetBaker.js';
import { validateAndSanitizeMinit } from './MinitContract.js';
import { MinitSDK } from './MinitSDK.js';

const STORAGE_KEY = 'minit_duels_custom_minits_v1';
const PENDING_ASSETS_KEY = 'minit_duels_pending_assets_v1';

const KNOWN_BUILTIN_ICONS = new Set([
  './assets/minit_icon/absorb.png',
  './assets/minit_icon/egg-stage-moth.png',
  './assets/minit_icon/hatch-stage-moth.png',
  './assets/minit_icon/ironmen.png',
  './assets/minit_icon/laser.png',
  './assets/minit_icon/murasaki.png',
  './assets/minit_icon/pulsar.png',
  './assets/minit_icon/saitama.png',
  './assets/minit_icon/waves.png'
]);

function getFileStem(filename = '') {
  const base = filename.split(/[\\/]/).pop() || '';
  return base.replace(/\.[^.]+$/, '').trim().toLowerCase();
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read text file: ${file.name}`));
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read image file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a crisp fallback 16x16 procedural pixel icon if no PNG is provided yet.
 */
function createProceduralFallbackIcon(color = 0x00e5ff) {
  return (g) => {
    g.beginFill(0x10101a, 0.95).drawRoundedRect(-7, -7, 14, 14, 2).endFill();
    g.lineStyle(1.5, color, 1).drawRoundedRect(-7, -7, 14, 14, 2);
    g.lineStyle(0).beginFill(color, 0.9).drawRect(-4, -4, 8, 8).endFill();
    g.beginFill(0xffffff, 0.95).drawRect(-3, -2, 2, 2).drawRect(1, -2, 2, 2).endFill();
  };
}

/**
 * Evaluates a user-provided Minit .js source string into a Minit config object.
 * Supports:
 * - ES modules (`import ...; export const MINIT_X = { ... };` or `export default { ... }`)
 * - CommonJS (`module.exports = { ... }`)
 * - Direct calls (`MinitEngine.Registry.addMinit({ ... })`)
 * - Plain object literals (`{ id: '...', ... }`)
 */
export function evaluateMinitJsSource(jsSource, fallbackStem = 'custom_minit') {
  if (!jsSource || typeof jsSource !== 'string') {
    throw new Error('Empty or invalid JavaScript source.');
  }

  let transformed = jsSource.trim();

  // 1. Strip static ES import declarations safely without greedy multi-statement matching
  transformed = transformed.replace(
    /^\s*import\s+(?:[\w*\s{},$]+from\s+)?['"][^'"]+['"]\s*;?/gm,
    '// [import injected by CustomMinitManager]'
  );

  let capturedVarName = null;

  // 2. Transform `export default` into `const __exportedDefault =`
  if (/export\s+default\s+/.test(transformed)) {
    transformed = transformed.replace(/export\s+default\s+/, 'const __exportedDefault = ');
    capturedVarName = '__exportedDefault';
  }

  // 3. Transform `export const/let/var NAME =` and capture the variable name
  transformed = transformed.replace(
    /export\s+(const|let|var)\s+([A-Za-z0-9_$]+)\s*=/g,
    (_, declType, varName) => {
      if (!capturedVarName) capturedVarName = varName;
      return `${declType} ${varName} =`;
    }
  );

  // 4. Transform `export { NAME }`
  const namedExportMatch = transformed.match(/export\s*\{\s*([A-Za-z0-9_$]+)/);
  if (namedExportMatch) {
    if (!capturedVarName) capturedVarName = namedExportMatch[1];
    transformed = transformed.replace(/export\s*\{[^}]*\}\s*;?/g, '');
  }

  // 5. If the user wrote a bare object literal `{ id: ... }`, wrap it in `return (...)`
  const isBareObject = /^\s*\{[\s\S]*\}\s*;?\s*$/.test(transformed) && !capturedVarName;

  const body = isBareObject
    ? `"use strict";\nreturn (${transformed.replace(/;\s*$/, '')});`
    : `"use strict";
const module = { exports: null };
const exports = {};
let __minitResult = null;
const registerCustomMinit = (def) => { __minitResult = def; return def; };
${transformed}
if (__minitResult) return __minitResult;
${capturedVarName ? `if (typeof ${capturedVarName} !== 'undefined') return ${capturedVarName};` : ''}
if (module.exports && typeof module.exports === 'object') return module.exports;
return null;`;

  let directAddedMinit = null;
  const proxyMinitEngine = {
    ...MinitEngine,
    Registry: {
      ...MinitEngine.Registry,
      addMinit(def) {
        directAddedMinit = def;
        return def;
      }
    }
  };

  const factory = new Function(
    'CFG',
    'PALETTE',
    'UI_STYLE',
    'FastMath',
    'AudioSys',
    'MinitEngine',
    'Textures',
    'PIXI',
    'MinitSDK',
    'SDK',
    body
  );

  const rawDef =
    factory(
      CFG,
      PALETTE,
      UI_STYLE,
      FastMath,
      AudioSys,
      proxyMinitEngine,
      Textures,
      PIXI,
      MinitSDK,
      MinitSDK
    ) || directAddedMinit;

  if (!rawDef || typeof rawDef !== 'object') {
    throw new Error(
      'Could not extract a Minit object from the JS file. Use `export const MINIT_NAME = { ... }` or `export default { ... }`.'
    );
  }

  if (!rawDef.id && fallbackStem) {
    rawDef.id = fallbackStem.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  }
  if (!rawDef.name && rawDef.id) {
    rawDef.name = rawDef.id.toUpperCase();
  }

  return rawDef;
}

export class CustomMinitManager {
  static getStoredRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[CustomMinitManager] Failed to read localStorage:', e);
      return [];
    }
  }

  static saveStoredRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      console.error('[CustomMinitManager] Failed to write localStorage (quota or access error):', e);
      return false;
    }
  }

  static getPendingAssets() {
    try {
      const raw = localStorage.getItem(PENDING_ASSETS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  static savePendingAssets(map) {
    try {
      localStorage.setItem(PENDING_ASSETS_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  /**
   * Resolves a safe non-colliding ID for an imported custom Minit so it never overwrites built-in Minits.
   */
  static resolveCustomId(rawId, stem) {
    const cleanRaw = (rawId || '').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const cleanStem = (stem || 'custom_minit').replace(/[^a-z0-9_]/gi, '_').toLowerCase();

    if (cleanRaw && !MinitEngine.Registry.isBuiltInMinit(cleanRaw)) {
      return cleanRaw;
    }
    if (cleanStem && !MinitEngine.Registry.isBuiltInMinit(cleanStem)) {
      return cleanStem;
    }
    return `${cleanStem || cleanRaw || 'custom'}_mod`;
  }

  /**
   * Upgrades Schrodinger's ring/box VFX so overlapping probability clouds merge
   * and render via the smooth 3-layer Connected Ring system underneath fighters.
   */
  static applySmoothSchrodingerVfxPatch(rawDef) {
    if (!rawDef || typeof rawDef !== 'object') return rawDef;
    const isSchrodinger =
      (rawDef.id || '').toLowerCase().includes('schrodinger') ||
      Boolean(rawDef.customTraits?.schroProbabilityCloud);
    if (!isSchrodinger) return rawDef;

    // 1. Upgrade Double-Slit Wave onHit to merge nearby clouds instead of stacking 3x rings
    if (Array.isArray(rawDef.actions)) {
      const waveAct = rawDef.actions.find((a) => a && a.id === 'double_slit_wave');
      if (waveAct) {
        waveAct.onExecute = (self, target, arena) => {
          if (!target) return;
          const pay = self.def.payload || {};
          self.state.spinState = (self.state.spinState || 1) * -1;
          const isAliveSpin = self.state.spinState > 0;
          const waveColor = isAliveSpin ? 0x00ffcc : 0xff00aa;

          const oPX = self.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
          const oPY = self.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

          arena.fxPool.spawnGlow(oPX, oPY, waveColor, 1.2, 12, 0.65);
          arena.spawnGridRipple(oPX, oPY, 55, 4.0, waveColor);

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
        };
      }

      const boxAct = rawDef.actions.find((a) => a && a.id === 'schrodingers_box');
      if (boxAct) {
        boxAct.onExecute = (self, target, arena) => {
          if (!target) return;
          const pay = self.def.payload || {};
          const tPX = target.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
          const tPY = target.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

          arena.fxPool.spawnShockwave(tPX, tPY, 0x00ffcc, 66, 3.0);
          arena.spawnGridRipple(tPX, tPY, 68, 4.2, 0x00ffcc);

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
        };
      }
    }

    // 2. Clean up customTextures so fallback sprites are sleek and unobtrusive
    rawDef.customTextures = rawDef.customTextures || {};
    rawDef.customTextures.fx_schro_cloud_ring = (g) => {
      g.beginFill(0x00ffcc, 0.05).drawCircle(0, 0, 28).endFill();
      g.lineStyle(1.8, 0x00ffcc, 0.55).drawCircle(0, 0, 28);
      g.lineStyle(1.2, 0xff00aa, 0.38).arc(0, 0, 20, -Math.PI * 0.65, Math.PI * 0.35);
      g.lineStyle(1.2, 0xff00aa, 0.38).arc(0, 0, 20, Math.PI * 0.55, Math.PI * 1.15);
    };
    rawDef.customTextures.fx_schro_box = (g) => {
      g.beginFill(0x100820, 0.1).drawRect(-24, -24, 48, 48).endFill();
      g.lineStyle(1.8, 0x00ffcc, 0.72).drawRect(-24, -24, 48, 48);
      g.lineStyle(1.4, 0xff00aa, 0.68).drawRect(-16, -16, 32, 32);
      g.lineStyle(1.0, 0xffffff, 0.55)
        .moveTo(-24, -24).lineTo(-16, -16)
        .moveTo(24, -24).lineTo(16, -16)
        .moveTo(24, 24).lineTo(16, 16)
        .moveTo(-24, 24).lineTo(-16, 16);
    };

    // 3. Upgrade customTraits to use smooth Connected 3-Layer Rings under fighters
    rawDef.customTraits = rawDef.customTraits || {};
    rawDef.customTraits.schroParadoxBox = (e, a) => {
      const owner = a.getActorById
        ? a.getActorById(e.p.sourceActorId || e.p.ownerId)
        : a.playerMap?.[e.p.ownerId];
      const tgt = a.getActorById ? a.getActorById(e.p.targetId) : null;

      if (!owner || owner.hp <= 0 || !tgt || tgt.hp <= 0) {
        e.dead = true;
        return;
      }

      const pay = e.p.payload || {};
      const dMult = owner.dmgMult || 1.0;

      e.x = FastMath.lerp(e.x, tgt.x, 0.25);
      e.y = FastMath.lerp(e.y, tgt.y, 0.25);
      tgt.x -= tgt.dx * 0.55;
      tgt.y -= tgt.dy * 0.55;

      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;

      if (!a.isHeadless) {
        const pulseScale = 0.92 + Math.sin(e.l * 0.35) * 0.08;
        a.fxPool.spawnPhysics('fx_schro_box', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff, 0.52, {
          additive: false,
          underUnit: true,
          grav: 0,
          scale: pulseScale,
          rotation: Math.sin(e.l * 0.2) * 0.06
        });

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

      if (e.l <= 1) {
        const isAliveOutcome = FastMath.rand() < 0.5;
        AudioSys.play('schro_collapse_boom');

        if (isAliveOutcome) {
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
    };

    rawDef.customTraits.schroProbabilityCloud = (e, a) => {
      const owner = a.getActorById
        ? a.getActorById(e.p.sourceActorId || e.p.ownerId)
        : a.playerMap?.[e.p.ownerId];
      if (!owner || owner.hp <= 0) {
        e.dead = true;
        return;
      }

      const pay = e.p.payload || {};
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
    };

    return rawDef;
  }

  /**
   * Builds and registers a single stored record into MinitEngine.Registry.
   */
  static instantiateRecord(record) {
    const rawDef = evaluateMinitJsSource(record.jsSource, record.fileStem || record.id);
    const id = this.resolveCustomId(record.id || rawDef.id, record.fileStem || record.id);

    // If the user copied a built-in minit file and renamed it, update its display name to match their filename
    if (MinitEngine.Registry.isBuiltInMinit((rawDef.id || '').toLowerCase()) && record.fileStem) {
      const builtIn = MinitEngine.Registry.getMinit((rawDef.id || '').toLowerCase());
      if (builtIn && rawDef.name === builtIn.name) {
        rawDef.name = record.fileStem.toUpperCase();
      }
    }

    rawDef.id = id;
    rawDef.isCustom = true;
    rawDef.fileStem = record.fileStem || id;

    // Automatically apply smooth connected-ring VFX optimization to Schrodinger
    this.applySmoothSchrodingerVfxPatch(rawDef);

    // Bind auto-synced DataURL assets
    rawDef.textures =
      rawDef.textures && typeof rawDef.textures === 'object' ? { ...rawDef.textures } : {};

    const assets = record.assets || {};
    if (assets.base) {
      rawDef.textures.base = assets.base;
    } else if (typeof rawDef.textures.base !== 'function') {
      const baseStr = String(rawDef.textures.base || '');
      if (!baseStr.startsWith('data:') && !KNOWN_BUILTIN_ICONS.has(baseStr)) {
        // Provide crisp procedural icon until a matching PNG is synced
        rawDef.textures.base = createProceduralFallbackIcon(rawDef.color || 0x00e5ff);
      }
    }

    // Bind any auxiliary matched assets (e.g., <stem>_turret.png or customTextures)
    Object.entries(assets).forEach(([key, dataUrl]) => {
      if (key === 'base' || !dataUrl) return;
      if (rawDef.customTextures && key in rawDef.customTextures) {
        rawDef.customTextures[key] = dataUrl;
      } else {
        rawDef.textures[key] = dataUrl;
      }
    });

    const validation = validateAndSanitizeMinit(rawDef);
    const registered = MinitEngine.Registry.addMinit(rawDef, { isCustom: true });
    return {
      registered,
      validation
    };
  }

  /**
   * Called at game startup before AssetBaker.bake(app) to restore all custom minits.
   */
  static hydrateFromStorage() {
    const records = this.getStoredRecords();
    const hydrated = [];
    for (const rec of records) {
      try {
        const { registered } = this.instantiateRecord(rec);
        if (registered) hydrated.push(registered);
      } catch (err) {
        console.warn(`[CustomMinitManager] Skipping corrupted custom minit "${rec?.id}":`, err);
      }
    }

    // Auto-load the user's attached schrodinger.js if not yet in localStorage
    if (!records.some((r) => r.id === 'schrodinger' || r.fileStem === 'schrodinger')) {
      fetch('./assets/aistudio/schrodinger_d96797f5.js')
        .then((res) => (res.ok ? res.text() : null))
        .then(async (jsSource) => {
          if (!jsSource) return;
          const currentRecords = this.getStoredRecords();
          if (currentRecords.some((r) => r.id === 'schrodinger' || r.fileStem === 'schrodinger')) return;
          const newRec = {
            id: 'schrodinger',
            name: 'SCHRODINGER',
            fileStem: 'schrodinger',
            fileName: 'schrodinger.js',
            jsSource,
            assets: {},
            updatedAt: Date.now()
          };
          const { registered } = this.instantiateRecord(newRec);
          if (registered) {
            currentRecords.push(newRec);
            this.saveStoredRecords(currentRecords);
            if (window.__PIXI_APP__) {
              await AssetBaker.bakeSingleMinit(window.__PIXI_APP__, registered);
            }
          }
        })
        .catch(() => {});
    }

    return hydrated;
  }

  /**
   * Imports a batch of user-selected or dropped files (.js and .png/.webp/.svg).
   * Automatically pairs .js and image files that share the same filename stem
   * regardless of whether they are uploaded together or in separate steps.
   */
  static async importFiles(fileList, app) {
    const files = Array.from(fileList || []);
    const jsFiles = [];
    const imgFiles = [];

    for (const f of files) {
      const nameLower = f.name.toLowerCase();
      if (nameLower.endsWith('.js') || nameLower.endsWith('.mjs')) {
        jsFiles.push(f);
      } else if (
        nameLower.endsWith('.png') ||
        nameLower.endsWith('.webp') ||
        nameLower.endsWith('.gif') ||
        nameLower.endsWith('.svg') ||
        nameLower.endsWith('.jpg') ||
        nameLower.endsWith('.jpeg')
      ) {
        imgFiles.push(f);
      }
    }

    // Read all newly uploaded image files into DataURLs indexed by their normalized stem
    const pendingAssets = this.getPendingAssets();
    const imageMap = {};

    for (const imgFile of imgFiles) {
      const stem = getFileStem(imgFile.name);
      const dataUrl = await readFileAsDataURL(imgFile);
      imageMap[stem] = {
        fileName: imgFile.name,
        stem,
        dataUrl
      };
      pendingAssets[stem] = {
        fileName: imgFile.name,
        stem,
        dataUrl
      };
    }

    const records = this.getStoredRecords();
    const importedMinits = [];
    const syncedAssets = [];
    const errors = [];
    const warnings = [];
    const usedImageStems = new Set();

    // Combine current batch imageMap with any previously staged pendingAssets
    const combinedAssetsPool = { ...pendingAssets, ...imageMap };

    // Step 1: Process all uploaded .js files
    for (const jsFile of jsFiles) {
      const stem = getFileStem(jsFile.name);
      try {
        const jsSource = await readFileAsText(jsFile);
        const rawPreview = evaluateMinitJsSource(jsSource, stem);
        const minitId = this.resolveCustomId(rawPreview.id, stem);

        // Check existing record so we preserve previously uploaded PNG if not overwritten
        const existingIdx = records.findIndex(
          (r) => r.id === minitId || r.fileStem === stem
        );
        const existingAssets = existingIdx >= 0 ? { ...(records[existingIdx].assets || {}) } : {};

        // Automatic Filename Sync:
        // Match PNG if its filename stem equals the .js filename stem OR equals the minitId
        if (combinedAssetsPool[stem]) {
          existingAssets.base = combinedAssetsPool[stem].dataUrl;
          usedImageStems.add(stem);
          delete pendingAssets[stem];
          syncedAssets.push(`${combinedAssetsPool[stem].fileName} → ${minitId} (base)`);
        } else if (combinedAssetsPool[minitId]) {
          existingAssets.base = combinedAssetsPool[minitId].dataUrl;
          usedImageStems.add(minitId);
          delete pendingAssets[minitId];
          syncedAssets.push(`${combinedAssetsPool[minitId].fileName} → ${minitId} (base)`);
        }

        // Also match auxiliary textures like `<stem>_<key>.png` or `<minitId>_<key>.png`
        Object.values(combinedAssetsPool).forEach((imgEntry) => {
          if (!imgEntry || usedImageStems.has(imgEntry.stem)) return;
          if (imgEntry.stem.startsWith(stem + '_')) {
            const subKey = imgEntry.stem.slice(stem.length + 1);
            if (subKey) {
              existingAssets[subKey] = imgEntry.dataUrl;
              usedImageStems.add(imgEntry.stem);
              delete pendingAssets[imgEntry.stem];
              syncedAssets.push(`${imgEntry.fileName} → ${minitId} (${subKey})`);
            }
          } else if (imgEntry.stem.startsWith(minitId + '_')) {
            const subKey = imgEntry.stem.slice(minitId.length + 1);
            if (subKey) {
              existingAssets[subKey] = imgEntry.dataUrl;
              usedImageStems.add(imgEntry.stem);
              delete pendingAssets[imgEntry.stem];
              syncedAssets.push(`${imgEntry.fileName} → ${minitId} (${subKey})`);
            }
          }
        });

        const newRecord = {
          id: minitId,
          name: rawPreview.name || minitId.toUpperCase(),
          fileStem: stem,
          fileName: jsFile.name,
          jsSource,
          assets: existingAssets,
          updatedAt: Date.now()
        };

        const { registered, validation } = this.instantiateRecord(newRecord);
        newRecord.id = registered.id;
        newRecord.name = registered.name;

        if (!validation.valid && validation.errors.length > 0) {
          warnings.push(`${jsFile.name}: ${validation.errors.join(', ')}`);
        }

        if (app && registered) {
          await AssetBaker.bakeSingleMinit(app, registered);
        }

        if (existingIdx >= 0) {
          records[existingIdx] = newRecord;
        } else {
          records.push(newRecord);
        }

        importedMinits.push({
          id: registered.id,
          name: registered.name,
          hasSyncedPng: Boolean(existingAssets.base)
        });
      } catch (err) {
        errors.push(`${jsFile.name}: ${err.message || String(err)}`);
      }
    }

    // Step 2: Process any standalone PNG files dropped to sync with already-saved custom Minits
    for (const imgEntry of Object.values(imageMap)) {
      if (usedImageStems.has(imgEntry.stem)) continue;

      const targetRecord = records.find(
        (r) =>
          r.fileStem === imgEntry.stem ||
          r.id === imgEntry.stem ||
          imgEntry.stem.startsWith(r.fileStem + '_') ||
          imgEntry.stem.startsWith(r.id + '_')
      );

      if (targetRecord) {
        targetRecord.assets = targetRecord.assets || {};
        if (imgEntry.stem === targetRecord.fileStem || imgEntry.stem === targetRecord.id) {
          targetRecord.assets.base = imgEntry.dataUrl;
          syncedAssets.push(`${imgEntry.fileName} → ${targetRecord.id} (base)`);
        } else {
          const prefix = imgEntry.stem.startsWith(targetRecord.fileStem + '_')
            ? targetRecord.fileStem + '_'
            : targetRecord.id + '_';
          const subKey = imgEntry.stem.slice(prefix.length);
          targetRecord.assets[subKey] = imgEntry.dataUrl;
          syncedAssets.push(`${imgEntry.fileName} → ${targetRecord.id} (${subKey})`);
        }
        targetRecord.updatedAt = Date.now();
        delete pendingAssets[imgEntry.stem];

        try {
          const { registered } = this.instantiateRecord(targetRecord);
          if (app && registered) {
            await AssetBaker.bakeSingleMinit(app, registered);
          }
          if (!importedMinits.some((m) => m.id === targetRecord.id)) {
            importedMinits.push({
              id: targetRecord.id,
              name: targetRecord.name,
              hasSyncedPng: Boolean(targetRecord.assets.base)
            });
          }
        } catch (err) {
          errors.push(`${imgEntry.fileName}: ${err.message}`);
        }
      } else {
        warnings.push(
          `Asset "${imgEntry.fileName}" staged and ready — import "${imgEntry.stem}.js" to automatically sync and create the Minit!`
        );
      }
    }

    this.savePendingAssets(pendingAssets);
    this.saveStoredRecords(records);

    return {
      importedMinits,
      syncedAssets,
      warnings,
      errors
    };
  }

  /**
   * Deletes a custom Minit from localStorage, Registry, and AssetBaker.
   */
  static deleteCustomMinit(id) {
    if (MinitEngine.Registry.isBuiltInMinit(id)) {
      return false;
    }
    const records = this.getStoredRecords();
    const target = records.find((r) => r.id === id);
    const filtered = records.filter((r) => r.id !== id);
    this.saveStoredRecords(filtered);

    const existingConfig = MinitEngine.Registry.getMinit(id);
    MinitEngine.Registry.removeMinit(id);
    AssetBaker.removeMinitTextures(id, existingConfig);
    return Boolean(target || existingConfig);
  }

  /**
   * Generates a comprehensive Universal Minit Builder starter template for creators.
   */
  static getStarterTemplateSource(stem = 'nova') {
    const cleanId = stem.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'nova';
    const constName = `MINIT_${cleanId.toUpperCase()}`;
    return `// ============================================================
// UNIVERSAL MINIT BUILDER TEMPLATE: ${cleanId.toUpperCase()}
// Save as "${cleanId}.js" + optional "${cleanId}.png" (auto-synced!)
// Demonstrates: Movement AI, Multi-Slot Abilities, Shields,
// Summons/Clones, Projectile-Blocking Barriers & Lifecycle Hooks
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';
import { MinitSDK } from '../engine/MinitSDK.js';

export const ${constName} = {
  id: '${cleanId}',
  name: '${cleanId.toUpperCase()}',
  color: 0x00ffcc,
  desc: 'Kiting plasma caster with reflective barrier, clone summon & phoenix revive.',

  // 1. STATS (Supports hp, speed, shield, maxShield, shieldRegen, armor, scale)
  stats: {
    hp: 1150,
    speed: 0.14,
    shield: 120,
    maxShield: 200,
    shieldRegen: 0.15,
    armor: 2
  },

  // 2. TARGETING ('closest_enemy' | 'farthest_enemy' | 'lowest_hp' | 'highest_hp' | 'random_enemy')
  targeting: { type: 'closest_enemy' },

  // 3. MOVEMENT AI ('wander' | 'chase' | 'kite' | 'orbit' | 'strafe' | 'stationary' | 'teleport_step' | 'custom')
  movement: {
    type: 'kite',
    minDist: 3.0,
    maxDist: 5.5
  },

  // 4. INITIAL CUSTOM STATE (Cloned into self.state at match start)
  initialState: {
    hasRevived: false,
    comboCount: 0
  },

  // 5. MULTI-SLOT ABILITIES (Each slot runs on its own independent cooldown & conditions!)
  actions: [
    // Slot 1: Twin Homing Plasma Bolts (every 75 ticks / 1.25s)
    {
      id: 'plasma_bolts',
      name: 'Plasma Bolts',
      cd: 75,
      onExecute: (self, target, arena) => {
        arena.shootProjectile(self, {
          target,
          count: 2,
          spread: 0.22,
          speed: 0.4,
          life: 55,
          dmg: 32,
          homing: true,
          turnRate: 0.05,
          bounce: true,
          tex: 'fx_${cleanId}_orb',
          trailTex: 'fx_${cleanId}_spark',
          sound: '${cleanId}_fire'
        });
      }
    },

    // Slot 2: Reflective Energy Barrier (every 240 ticks / 4.0s)
    {
      id: 'energy_barrier',
      name: 'Reflect Barrier',
      cd: 240,
      initialCd: 120,
      onExecute: (self, target, arena) => {
        arena.spawnBarrier(self, {
          radius: 1.45,
          hp: 180,
          life: 140,
          followOwner: true,
          reflectProjectiles: true,
          pushEnemies: true,
          contactDmg: 10
        });
      }
    },

    // Slot 3: Summon Holo-Clone when below 75% HP (every 320 ticks)
    {
      id: 'holo_clone',
      name: 'Holo Clone',
      cd: 320,
      maxHpPct: 0.75,
      onExecute: (self, target, arena) => {
        arena.spawnClone(self, {
          hpPct: 0.25,
          dmgMult: 0.45,
          life: 300,
          movement: { type: 'chase' }
        });
      }
    }
  ],

  // 6. FULL LIFECYCLE HOOKS (Optional - customize any moment in combat!)
  hooks: {
    onInit: (self, arena) => {
      // Called when the duel starts
    },

    onTick: (self, arena) => {
      // Called every frame (60Hz)
    },

    onDealDamage: (self, target, dmg, arena) => {
      // Every 4th hit grants a small shield boost
      self.state.comboCount = (self.state.comboCount || 0) + 1;
      if (self.state.comboCount % 4 === 0) {
        arena.addShield(self, 25, 200);
      }
    },

    onBeforeDamaged: (self, dmgCtx, arena) => {
      // Example: 10% chance to phase-dodge an incoming hit and blink away
      if (FastMath.rand() < 0.1) {
        dmgCtx.cancel = true;
        arena.teleport(
          self,
          FastMath.randRange(1.5, 8.5),
          FastMath.randRange(1.5, 8.5),
          { color: self.def.color }
        );
      }
    },

    onBeforeDeath: (self, arena) => {
      // One-time Phoenix Overdrive Revive at 25% HP!
      if (!self.state.hasRevived) {
        self.state.hasRevived = true;
        arena.heal(self, Math.round(self.maxHp * 0.25));
        arena.addShield(self, 150, 250);
        arena.dealAreaDamage(self, self.x, self.y, 2.5, 55, {
          knockbackForce: 1.1,
          sound: 'explosion'
        });
      }
    }
  },

  // 7. BASE SPRITE (Auto-synced with "${cleanId}.png" when imported!)
  textures: {
    base: './assets/minit_icon/${cleanId}.png'
  },

  // 8. PROCEDURAL VFX TEXTURES
  customTextures: {
    fx_${cleanId}_orb: (g) => {
      g.beginFill(0x00ffcc, 0.4).drawCircle(0, 0, 7);
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 3.5).endFill();
    },
    fx_${cleanId}_spark: (g) => {
      g.beginFill(0x00ffcc, 1.0).drawRect(-2, -2, 4, 4).endFill();
    }
  },

  // 9. SYNTHESIZED RETRO AUDIO
  customAudio: {
    ${cleanId}_fire: {
      t: 'sawtooth',
      f0: 880,
      f1: 180,
      v: 0.14,
      d: 0.14,
      ramp: 'exp',
      throttle: 0.04
    }
  }
};
`;
  }
}
