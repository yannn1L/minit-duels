// ============================================================
// MINIT ENGINE REGISTRY (ES Module - Robust, Modular & Dynamic)
// Supports Built-In & External User-Imported Minits
// ============================================================
import { validateAndSanitizeMinit } from './MinitContract.js';

export const MinitEngine = {
  Registry: {
    textures: {},
    audio: {},
    traits: {},
    targeting: {},
    minits: {},
    builtInMinitIds: new Set(),
    customMinitIds: new Set(),

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

    addMinit(rawConfig, options = {}) {
      const { valid, errors, sanitized } = validateAndSanitizeMinit(rawConfig);
      if (!valid) {
        console.warn(`[MinitRegistry] Minit "${rawConfig?.id || 'unknown'}" had validation issues:`, errors);
      }
      if (!sanitized) return null;

      const isCustom = Boolean(options.isCustom || rawConfig?.isCustom);
      const config = {
        ...sanitized,
        isCustom
      };

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
      if (isCustom) {
        this.customMinitIds.add(config.id);
      } else {
        this.builtInMinitIds.add(config.id);
      }
      return config;
    },

    removeMinit(id) {
      // Never delete built-in core Minits
      if (this.builtInMinitIds.has(id)) {
        return false;
      }

      const existing = this.minits[id];
      if (!existing) return false;

      if (existing.textures) {
        Object.keys(existing.textures).forEach((k) => {
          delete this.textures[`minit_${id}_${k}`];
        });
      }
      if (existing.customTextures) {
        Object.keys(existing.customTextures).forEach((k) => {
          delete this.textures[k];
        });
      }
      if (existing.customTraits) {
        Object.keys(existing.customTraits).forEach((k) => {
          delete this.traits[k];
        });
      }
      if (existing.customAudio) {
        Object.keys(existing.customAudio).forEach((k) => {
          delete this.audio[k];
        });
      }

      delete this.minits[id];
      this.customMinitIds.delete(id);
      return true;
    },

    isBuiltInMinit(id) {
      return this.builtInMinitIds.has(id);
    },

    isCustomMinit(id) {
      return !this.builtInMinitIds.has(id) && (this.customMinitIds.has(id) || Boolean(this.minits[id]?.isCustom));
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
