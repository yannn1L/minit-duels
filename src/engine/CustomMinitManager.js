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
    body
  );

  const rawDef =
    factory(CFG, PALETTE, UI_STYLE, FastMath, AudioSys, proxyMinitEngine, Textures, PIXI) ||
    directAddedMinit;

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
   * Generates a starter Minit .js template file for creators.
   */
  static getStarterTemplateSource(stem = 'nova') {
    const cleanId = stem.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'nova';
    const constName = `MINIT_${cleanId.toUpperCase()}`;
    return `// ============================================================
// CUSTOM MINIT: ${cleanId.toUpperCase()}
// Save this file as "${cleanId}.js" and pair it with "${cleanId}.png"
// Both files will automatically sync when imported in Workshop!
// ============================================================
import { CFG } from '../config.js';
import { FastMath } from '../engine/FastMath.js';
import { AudioSys } from '../engine/AudioSys.js';

export const ${constName} = {
  id: '${cleanId}',
  name: '${cleanId.toUpperCase()}',
  color: 0x00ffcc,
  desc: 'Fires twin plasma bolts & shockwave nova.',
  stats: {
    hp: 1200,
    speed: 0.14
  },
  targeting: { type: 'closest_enemy' },

  deathVfx: {
    shake: 12,
    flash: 0.65,
    particleCount: 28,
    shockRad: 140,
    sound: 'explosion',
    hitStop: 12
  },

  payload: {
    dmg: 42,
    zoneRadius: 1.2,
    destroyOnHit: true,
    hitVfx: {
      shake: 4,
      flash: 0.15,
      particleCount: 6,
      particleTex: 'fx_${cleanId}_spark',
      sound: '${cleanId}_hit',
      playSound: true,
      hitStop: 2
    }
  },

  action: {
    cd: 85,
    count: 2,
    speed: 0.42,
    life: 50,
    scatterSpread: 0.18,
    sound: '${cleanId}_fire',
    traitList: ['moveAndBounce', 'damageRadiusOnHit', '${cleanId}BoltTrail', 'ageLife']
  },

  // Automatically synced with "${cleanId}.png" when imported!
  textures: {
    base: './assets/minit_icon/${cleanId}.png'
  },

  customTextures: {
    fx_${cleanId}_orb: (g) => {
      g.beginFill(0x00ffcc, 0.4).drawCircle(0, 0, 7);
      g.beginFill(0xffffff, 1.0).drawCircle(0, 0, 3.5).endFill();
    },
    fx_${cleanId}_spark: (g) => {
      g.beginFill(0x00ffcc, 1.0).drawRect(-2, -2, 4, 4).endFill();
    }
  },

  customAudio: {
    ${cleanId}_fire: {
      t: 'sawtooth',
      f0: 880,
      f1: 180,
      v: 0.14,
      d: 0.14,
      ramp: 'exp',
      throttle: 0.04
    },
    ${cleanId}_hit: {
      t: 'square',
      f0: 520,
      f1: 90,
      v: 0.16,
      d: 0.1,
      ramp: 'exp',
      throttle: 0.04
    }
  },

  customTraits: {
    ${cleanId}BoltTrail: (e, a) => {
      const pX = e.x * CFG.GRID.TS + CFG.GRID.HALF_TS;
      const pY = e.y * CFG.GRID.TS + CFG.GRID.HALF_TS;
      a.fxPool.spawnPhysics('fx_${cleanId}_orb', pX, pY, 0, 0, 2, 1, 1, false, 0xffffff);
      if (e.l % 2 === 0) {
        a.fxPool.spawnPhysics(
          'fx_${cleanId}_spark',
          pX,
          pY,
          -e.dx * 1.2,
          -e.dy * 1.2,
          8,
          0.88,
          0.88,
          true,
          0x00ffcc
        );
      }
    }
  }
};
`;
  }
}
