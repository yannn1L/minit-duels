// ============================================================
// DEBUG & ENGINE SETTINGS CONFIGURATION (ES Module)
// Persists Debug Mode, SFX, VFX & Arena Layout Tweaks in Real Time
// ============================================================
import { CFG } from '../config.js';

const DEBUG_STORAGE_KEY = 'minit_duels_debug_config_v2';

export const DEFAULT_DEBUG_STATE = {
  // Debug Tab
  enabled: false,
  showHitboxes: true,
  showVectors: true,
  showCooldowns: true,
  showTelemetry: true,
  timeScale: 1.0,
  paused: false,
  stepRequested: false,

  // Setting Tab — SFX
  sfxMuted: false,
  sfxMasterVolume: 0.7,
  sfxPitchScale: 1.0,
  sfxThrottleScale: 1.0,

  // Setting Tab — VFX & Combat Juice
  vfxQuality: 'auto', // 'auto' | 'high' | 'low'
  vfxParticleMult: 1.0,
  vfxOutlineAlpha: 0.75,
  vfxMiddleAlpha: 0.26,
  vfxScorchAlpha: 0.45,
  vfxParticleAlpha: 0.95,
  vfxCrowdAutoFade: true,
  vfxShakeScale: 1.0,
  vfxHitStopScale: 1.0,
  vfxFlashScale: 1.0,
  vfxDmgTextScale: 1.0,
  vfxCritThreshold: 24,
  vfxShowGridRipples: true,
  vfxShowScorch: true,
  vfxShowAfterimages: true,
  vfxShowDmgText: true,

  // Setting Tab — Arena & Layout
  arenaCols: 10,
  arenaRows: 10,
  arenaLandscapeScale: 2.7,
  arenaPortraitScale: 2.7,
  arenaWallPadding: 0.2,
  arenaGridAlpha: 0.8,
  arenaBgColor: 0x12121e,
  arenaGridColor: 0x1c1c2e,
  arenaGuardColor: 0x2a2a40
};

class DebugConfigManager {
  constructor() {
    this.state = { ...DEFAULT_DEBUG_STATE };
    this.listeners = new Set();
    this.load();
    this.syncToCFG();
  }

  load() {
    try {
      const raw = localStorage.getItem(DEBUG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = {
          ...DEFAULT_DEBUG_STATE,
          ...parsed,
          paused: false,
          stepRequested: false
        };
      }
    } catch (e) {}
  }

  save() {
    try {
      const { paused, stepRequested, ...persisted } = this.state;
      localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(persisted));
    } catch (e) {}
  }

  /**
   * Synchronizes live settings into CFG and CFG.ARENA_BOUNDS so Arena, AudioSys, and Scenes
   * immediately reflect slider/color adjustments.
   */
  syncToCFG() {
    const s = this.state;

    // Audio
    CFG.AUDIO.MASTER_GAIN = Number(s.sfxMasterVolume ?? 0.7);

    // VFX
    CFG.VFX.CRIT_DMG_THRESHOLD = Number(s.vfxCritThreshold ?? 24);

    // Arena Grid & Bounds
    CFG.GRID.COLS = Math.max(6, Math.min(20, Math.round(Number(s.arenaCols) || 10)));
    CFG.GRID.ROWS = Math.max(6, Math.min(20, Math.round(Number(s.arenaRows) || 10)));
    CFG.ARENA.PADDING = Math.max(0.05, Math.min(1.5, Number(s.arenaWallPadding ?? 0.2)));
    CFG.ARENA.GRID_ALPHA = Math.max(0, Math.min(1, Number(s.arenaGridAlpha ?? 0.8)));
    CFG.ARENA.BG_COLOR = Number(s.arenaBgColor ?? 0x12121e);
    CFG.ARENA.GRID_COLOR = Number(s.arenaGridColor ?? 0x1c1c2e);
    CFG.ARENA.GUARD_COLOR = Number(s.arenaGuardColor ?? 0x2a2a40);

    CFG.ARENA_BOUNDS.MIN_X = CFG.ARENA.PADDING;
    CFG.ARENA_BOUNDS.MAX_X = CFG.GRID.COLS - 1 - CFG.ARENA.PADDING;
    CFG.ARENA_BOUNDS.MIN_Y = CFG.ARENA.PADDING;
    CFG.ARENA_BOUNDS.MAX_Y = CFG.GRID.ROWS - 1 - CFG.ARENA.PADDING;

    // Duel Layout Scales
    CFG.LAYOUT.DUEL.LANDSCAPE.arena.scale = Number(s.arenaLandscapeScale ?? 2.7);
    CFG.LAYOUT.DUEL.PORTRAIT.arena.scale = Number(s.arenaPortraitScale ?? 2.7);
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
    this.syncToCFG();
    this.save();
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (e) {}
    });
  }

  resetSettingsToDefault() {
    const { enabled, showHitboxes, showVectors, showCooldowns, showTelemetry, timeScale, paused } =
      this.state;
    this.state = {
      ...DEFAULT_DEBUG_STATE,
      enabled,
      showHitboxes,
      showVectors,
      showCooldowns,
      showTelemetry,
      timeScale,
      paused,
      stepRequested: false
    };
    this.syncToCFG();
    this.save();
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (e) {}
    });
  }

  cycleVfxQuality() {
    const order = ['auto', 'high', 'low'];
    const cur = this.state.vfxQuality || 'auto';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    this.update({ vfxQuality: next });
    return next;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const DebugConfig = new DebugConfigManager();
