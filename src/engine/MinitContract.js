// ============================================================
// MINIT CONTRACT & SCHEMA VALIDATOR (ES Module)
// Guarantees robustness, type safety & backwards compatibility
// ============================================================

/**
 * Validates and sanitizes a Minit definition against the standard contract.
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
  const id = typeof minit.id === 'string' && minit.id.trim().length > 0
    ? minit.id.trim()
    : null;
  if (!id) errors.push('Minit must have a valid non-empty string "id".');

  const name = typeof minit.name === 'string' && minit.name.trim().length > 0
    ? minit.name.trim()
    : (id ? id.toUpperCase() : 'UNKNOWN');

  const color = typeof minit.color === 'number' && Number.isFinite(minit.color)
    ? minit.color
    : 0x00e5ff;

  const desc = typeof minit.desc === 'string' ? minit.desc : 'Combat minit.';

  // 2. Combat Stats
  const rawStats = minit.stats || {};
  const stats = {
    hp: Number.isFinite(rawStats.hp) && rawStats.hp > 0 ? rawStats.hp : 1000,
    speed: Number.isFinite(rawStats.speed) && rawStats.speed >= 0 ? rawStats.speed : 0.12
  };

  // 3. Targeting
  const rawTargeting = minit.targeting || {};
  const targeting = {
    type: typeof rawTargeting.type === 'string' ? rawTargeting.type : 'closest_enemy',
    ...rawTargeting
  };

  // 4. Action & Attack Cycle
  const rawAction = minit.action || {};
  const action = {
    cd: Number.isFinite(rawAction.cd) && rawAction.cd > 0 ? rawAction.cd : 180,
    count: Number.isFinite(rawAction.count) && rawAction.count > 0 ? rawAction.count : 1,
    speed: Number.isFinite(rawAction.speed) ? rawAction.speed : 0,
    life: Number.isFinite(rawAction.life) ? rawAction.life : 60,
    scatterSpread: rawAction.scatterSpread || 0,
    traitList: Array.isArray(rawAction.traitList) ? [...rawAction.traitList] : [],
    sound: rawAction.sound || null,
    vfx: rawAction.vfx || {}
  };

  // 5. Payload
  const payload = minit.payload && typeof minit.payload === 'object'
    ? { ...minit.payload }
    : {};

  // 6. Death VFX
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

  // 7. Visual Textures & Custom Traits
  const textures = minit.textures && typeof minit.textures === 'object'
    ? { ...minit.textures }
    : { base: `./assets/minit_icon/${id || 'default'}.png` };

  const customTextures = minit.customTextures && typeof minit.customTextures === 'object'
    ? { ...minit.customTextures }
    : {};

  const customTraits = minit.customTraits && typeof minit.customTraits === 'object'
    ? { ...minit.customTraits }
    : {};

  const customAudio = minit.customAudio && typeof minit.customAudio === 'object'
    ? { ...minit.customAudio }
    : {};

  const sanitized = {
    ...minit,
    id: id || 'fallback',
    name,
    color,
    desc,
    stats,
    targeting,
    action,
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
