// ============================================================
// MINIT CONTRACT & SCHEMA VALIDATOR (ES Module)
// Supports Declarative Configs, Multi-Slot Actions, Movement AI & Lifecycle Hooks
// ============================================================

const LIFECYCLE_HOOK_NAMES = [
  'onInit',
  'onTick',
  'onMove',
  'onAction',
  'onWallBounce',
  'onBeforeDealDamage',
  'onDealDamage',
  'onBeforeDamaged',
  'onDamaged',
  'onBeforeDeath',
  'onDeath',
  'onKill'
];

export function normalizeActionSlot(rawSlot, idx = 0) {
  if (!rawSlot || typeof rawSlot !== 'object') return null;
  return {
    id: rawSlot.id || `slot_${idx}`,
    name: rawSlot.name || `Ability ${idx + 1}`,
    cd: Number.isFinite(rawSlot.cd) && rawSlot.cd > 0 ? rawSlot.cd : 120,
    initialCd: Number.isFinite(rawSlot.initialCd) && rawSlot.initialCd >= 0 ? rawSlot.initialCd : 0,
    energyCost: Number.isFinite(rawSlot.energyCost) && rawSlot.energyCost >= 0 ? rawSlot.energyCost : 0,
    minHpPct: Number.isFinite(rawSlot.minHpPct) ? rawSlot.minHpPct : 0,
    maxHpPct: Number.isFinite(rawSlot.maxHpPct) ? rawSlot.maxHpPct : 1,
    count: Number.isFinite(rawSlot.count) && rawSlot.count > 0 ? rawSlot.count : 1,
    speed: Number.isFinite(rawSlot.speed) ? rawSlot.speed : 0,
    life: Number.isFinite(rawSlot.life) ? rawSlot.life : 60,
    scatterSpread: rawSlot.scatterSpread || 0,
    traitList: Array.isArray(rawSlot.traitList) ? [...rawSlot.traitList] : [],
    sound: rawSlot.sound || null,
    vfx: rawSlot.vfx || {},
    payload: rawSlot.payload || null,
    condition: typeof rawSlot.condition === 'function' ? rawSlot.condition : null,
    onExecute: typeof rawSlot.onExecute === 'function' ? rawSlot.onExecute : null
  };
}

/**
 * Validates and sanitizes a Minit definition against the universal contract.
 * Injects safe fallback defaults for any omitted properties.
 *
 * @param {object} minit - Raw minit definition
 * @returns {{ valid: boolean, errors: string[], sanitized: object }}
 */
export function validateAndSanitizeMinit(minit) {
  const errors = [];

  if (!minit || typeof minit !== 'object') {
    return {
      valid: false,
      errors: ['Minit definition must be a non-null object.'],
      sanitized: null
    };
  }

  // 1. Core Identity
  const id =
    typeof minit.id === 'string' && minit.id.trim().length > 0 ? minit.id.trim() : null;
  if (!id) errors.push('Minit must have a valid non-empty string "id".');

  const name =
    typeof minit.name === 'string' && minit.name.trim().length > 0
      ? minit.name.trim()
      : id
        ? id.toUpperCase()
        : 'UNKNOWN';

  const color =
    typeof minit.color === 'number' && Number.isFinite(minit.color) ? minit.color : 0x00e5ff;

  const desc = typeof minit.desc === 'string' ? minit.desc : 'Combat minit.';

  // 2. Combat Stats (including shield, armor, energy & scale)
  const rawStats = minit.stats || {};
  const stats = {
    hp: Number.isFinite(rawStats.hp) && rawStats.hp > 0 ? rawStats.hp : 1000,
    speed: Number.isFinite(rawStats.speed) && rawStats.speed >= 0 ? rawStats.speed : 0.12,
    shield: Number.isFinite(rawStats.shield) && rawStats.shield >= 0 ? rawStats.shield : 0,
    maxShield:
      Number.isFinite(rawStats.maxShield) && rawStats.maxShield >= 0
        ? rawStats.maxShield
        : Number.isFinite(rawStats.shield) && rawStats.shield > 0
          ? rawStats.shield
          : 0,
    shieldRegen: Number.isFinite(rawStats.shieldRegen) ? rawStats.shieldRegen : 0,
    armor: Number.isFinite(rawStats.armor) ? rawStats.armor : 0,
    energy: Number.isFinite(rawStats.energy) ? rawStats.energy : 0,
    maxEnergy: Number.isFinite(rawStats.maxEnergy) ? rawStats.maxEnergy : 100,
    energyRegen: Number.isFinite(rawStats.energyRegen) ? rawStats.energyRegen : 0,
    scale: Number.isFinite(rawStats.scale) && rawStats.scale > 0 ? rawStats.scale : 1.0
  };

  // 3. Targeting & Movement AI
  const rawTargeting = minit.targeting || {};
  const targeting = {
    type: typeof rawTargeting.type === 'string' ? rawTargeting.type : 'closest_enemy',
    ...rawTargeting
  };

  const rawMovement = minit.movement || rawStats.movement || { type: 'wander' };
  const movement =
    typeof rawMovement === 'string'
      ? { type: rawMovement }
      : { type: rawMovement.type || 'wander', ...rawMovement };

  // 4. Primary Action & Multi-Slot Actions Array
  const rawAction = minit.action || (Array.isArray(minit.actions) && minit.actions[0]) || {};
  const action = normalizeActionSlot(rawAction, 0) || {
    id: 'slot_0',
    name: 'Primary',
    cd: 180,
    initialCd: 0,
    energyCost: 0,
    minHpPct: 0,
    maxHpPct: 1,
    count: 1,
    speed: 0,
    life: 60,
    scatterSpread: 0,
    traitList: [],
    sound: null,
    vfx: {},
    payload: null,
    condition: null,
    onExecute: null
  };

  const actions =
    Array.isArray(minit.actions) && minit.actions.length > 0
      ? minit.actions.map((s, idx) => normalizeActionSlot(s, idx)).filter(Boolean)
      : minit.action
        ? [action]
        : [];

  // 5. Passive & Initial State
  const passive = minit.passive && typeof minit.passive === 'object' ? { ...minit.passive } : null;
  const initialState =
    minit.initialState && typeof minit.initialState === 'object' ? { ...minit.initialState } : {};

  // 6. Lifecycle Hooks (merge top-level hook functions with `minit.hooks`)
  const hooks = { ...(minit.hooks && typeof minit.hooks === 'object' ? minit.hooks : {}) };
  LIFECYCLE_HOOK_NAMES.forEach((hName) => {
    if (typeof minit[hName] === 'function' && !hooks[hName]) {
      hooks[hName] = minit[hName];
    }
  });

  // 7. Payload
  const payload =
    minit.payload && typeof minit.payload === 'object' ? { ...minit.payload } : {};

  // 8. Death VFX
  const rawDeath = minit.deathVfx || {};
  const deathVfx = {
    shake: rawDeath.shake ?? 10,
    flash: rawDeath.flash ?? 0.6,
    particleCount: rawDeath.particleCount ?? 20,
    shockRad: rawDeath.shockRad ?? 120,
    sound: rawDeath.sound ?? 'crush',
    hitStop: rawDeath.hitStop ?? 10,
    ...rawDeath
  };

  // 9. Visual Textures, Custom Traits & Audio
  const textures =
    minit.textures && typeof minit.textures === 'object'
      ? { ...minit.textures }
      : { base: `./assets/minit_icon/${id || 'default'}.png` };

  const customTextures =
    minit.customTextures && typeof minit.customTextures === 'object'
      ? { ...minit.customTextures }
      : {};

  const customTraits =
    minit.customTraits && typeof minit.customTraits === 'object'
      ? { ...minit.customTraits }
      : {};

  const customAudio =
    minit.customAudio && typeof minit.customAudio === 'object' ? { ...minit.customAudio } : {};

  const sanitized = {
    ...minit,
    id: id || 'fallback',
    name,
    color,
    desc,
    stats,
    targeting,
    movement,
    action,
    actions,
    passive,
    initialState,
    hooks,
    payload,
    deathVfx,
    textures,
    customTextures,
    customTraits,
    customAudio
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}
