// ============================================================
// DEBUG CONFIGURATION & PERSISTENT STATE (ES Module)
// ============================================================
const DEBUG_STORAGE_KEY = 'minit_duels_debug_config_v1';

const DEFAULT_DEBUG_STATE = {
  enabled: false,
  showHitboxes: true,
  showVectors: true,
  showCooldowns: true,
  showTelemetry: true,
  vfxQuality: 'auto', // 'auto' | 'high' | 'low'
  timeScale: 1.0,
  paused: false,
  stepRequested: false
};

class DebugConfigManager {
  constructor() {
    this.state = { ...DEFAULT_DEBUG_STATE };
    this.listeners = new Set();
    this.load();
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

  update(patch) {
    this.state = { ...this.state, ...patch };
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
