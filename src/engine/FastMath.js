// ============================================================
// FAST MATH UTILITIES (ES Module)
// Optimized lookup tables & high-throughput spatial vector helpers
// ============================================================

export const FastMath = {
  seed: 123456789,
  sinLUT: new Float32Array(1024),
  cosLUT: new Float32Array(1024),
  PI: Math.PI,
  TWO_PI: Math.PI * 2,

  init() {
    for (let i = 0; i < 1024; i++) {
      const r = (i * Math.PI * 2) / 1024;
      this.sinLUT[i] = Math.sin(r);
      this.cosLUT[i] = Math.cos(r);
    }
    this.seed = (Date.now() ^ (Math.random() * 4294967296)) | 0;
  },

  rand() {
    this.seed = (this.seed * 1664525 + 1013904223) | 0;
    return (this.seed & 2147483647) / 2147483647;
  },

  randRange(min, max) {
    return min + this.rand() * (max - min);
  },

  dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Zero-sqrt squared distance for high-performance radius & collision queries
  distSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },

  clamp(val, min, max) {
    return val < min ? min : val > max ? max : val;
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  normalize(dx, dy) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 0, len: 0 };
    return { x: dx / len, y: dy / len, len };
  },

  fastSin(rad) {
    const idx = ((rad * 162.97466) & 1023) | 0; // 1024 / (2*PI) = 162.97466
    return this.sinLUT[idx];
  },

  fastCos(rad) {
    const idx = ((rad * 162.97466) & 1023) | 0;
    return this.cosLUT[idx];
  }
};

FastMath.init();
