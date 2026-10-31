// ============================================================
// MINIT ENGINE REGISTRY (ES Module - Robust & Modular)
// ============================================================
import { validateAndSanitizeMinit } from './MinitContract.js';

export const MinitEngine = {
  Registry: {
    textures: {},
    audio: {},
    traits: {},
    targeting: {},
    minits: {},

    addTexture(id, fnOrUrl) {
      if (id) this.textures[id] = fnOrUrl;
    },

    addAudio(id, config) {
      if (id) this.audio[id] = config;
    },

    addTrait(id, fn) {
      if (id && typeof fn === 'function') {
        this.traits[id] = fn;
      }
    },

    addTargeting(id, fn) {
      if (id && typeof fn === 'function') {
        this.targeting[id] = fn;
      }
    },

    addMinit(rawConfig) {
      const { valid, errors, sanitized } = validateAndSanitizeMinit(rawConfig);
      if (!valid) {
        console.warn(`[MinitRegistry] Minit "${rawConfig?.id || 'unknown'}" had validation issues:`, errors);
      }

      const config = sanitized;

      // Register custom traits
      if (config.customTraits) {
        Object.entries(config.customTraits).forEach(([k, v]) => this.addTrait(k, v));
      }

      // Register custom textures
      if (config.customTextures) {
        Object.entries(config.customTextures).forEach(([k, v]) => this.addTexture(k, v));
      }

      // Register custom audio
      if (config.customAudio) {
        Object.entries(config.customAudio).forEach(([k, v]) => this.addAudio(k, v));
      }

      // Register standard textures
      if (config.textures) {
        Object.entries(config.textures).forEach(([k, v]) => {
          if (typeof v === 'string') {
            this.addTexture(`minit_${config.id}_${k}`, v);
          } else if (typeof v === 'function') {
            this.addTexture(`minit_${config.id}_${k}`, (g) => {
              g.lineStyle(0, 0, 0, 0);
              v(g, config.color);
              g.lineStyle(0).beginFill(0, 0).drawRect(-12, -12, 24, 24).endFill();
            });
          }
        });
      }

      this.minits[config.id] = config;
      return config;
    },

    getMinit(id) {
      return this.minits[id] || null;
    },

    hasMinit(id) {
      return Boolean(this.minits[id]);
    },

    getAllMinits() {
      return Object.values(this.minits);
    },

    getMinitIds() {
      return Object.keys(this.minits);
    }
  }
};
