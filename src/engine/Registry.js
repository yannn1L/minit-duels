// ============================================================
// MINIT ENGINE REGISTRY (ES Module)
// ============================================================

export const MinitEngine = {
  Registry: {
    textures: {},
    audio: {},
    traits: {},
    targeting: {},
    minits: {},

    addTexture(id, fnOrUrl) {
      this.textures[id] = fnOrUrl;
    },

    addAudio(id, config) {
      this.audio[id] = config;
    },

    addTrait(id, fn) {
      this.traits[id] = fn;
    },

    addTargeting(id, fn) {
      this.targeting[id] = fn;
    },

    addMinit(config) {
      if (config.customTraits) {
        Object.entries(config.customTraits).forEach(([k, v]) => this.addTrait(k, v));
      }
      if (config.customTextures) {
        Object.entries(config.customTextures).forEach(([k, v]) => this.addTexture(k, v));
      }
      if (config.customAudio) {
        Object.entries(config.customAudio).forEach(([k, v]) => this.addAudio(k, v));
      }
      if (config.textures) {
        Object.entries(config.textures).forEach(([k, v]) => {
          if (typeof v === 'string') {
            this.addTexture(`minit_${config.id}_${k}`, v);
          } else {
            this.addTexture(`minit_${config.id}_${k}`, (g) => {
              g.lineStyle(0, 0, 0, 0);
              v(g, config.color);
              g.lineStyle(0).beginFill(0, 0).drawRect(-12, -12, 24, 24).endFill();
            });
          }
        });
      }
      this.minits[config.id] = config;
    }
  }
};
