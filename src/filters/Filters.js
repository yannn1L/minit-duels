// ============================================================
// OUTLINE & SHADER FILTERS (ES Module)
// ============================================================
import * as PIXI from 'pixi.js';
import { CFG } from '../config.js';

export class OutlineFilter extends PIXI.Filter {
  constructor(thickness = 1, color = 0) {
    const fragmentSrc = `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform vec2 uStep;
      uniform vec3 uColor;
      uniform float uFlash;

      void main(void) {
        vec4 cur = texture2D(uSampler, vTextureCoord);
        float a = max(
          max(texture2D(uSampler, vTextureCoord + vec2(uStep.x, 0.0)).a,
              texture2D(uSampler, vTextureCoord + vec2(-uStep.x, 0.0)).a),
          max(texture2D(uSampler, vTextureCoord + vec2(0.0, uStep.y)).a,
              texture2D(uSampler, vTextureCoord + vec2(0.0, -uStep.y)).a)
        );
        a = max(a, max(
          max(texture2D(uSampler, vTextureCoord + vec2(uStep.x, uStep.y)).a,
              texture2D(uSampler, vTextureCoord + vec2(-uStep.x, -uStep.y)).a),
          max(texture2D(uSampler, vTextureCoord + vec2(-uStep.x, uStep.y)).a,
              texture2D(uSampler, vTextureCoord + vec2(uStep.x, -uStep.y)).a)
        ));

        float isS = step(0.1, cur.a);
        float isO = step(0.1, a) * (1.0 - isS);
        vec4 sC = mix(cur, vec4(1.0, 1.0, 1.0, cur.a), uFlash);
        gl_FragColor = mix(mix(vec4(0.0), vec4(uColor, 1.0), isO), sC, isS);
      }
    `;

    super(null, fragmentSrc);
    this.padding = Math.ceil(thickness) + 4;
    this.uniforms.uColor = new Float32Array([
      ((color >> 16) & 255) / 255,
      ((color >> 8) & 255) / 255,
      (color & 255) / 255
    ]);
    this.uniforms.uFlash = 0;
    this.uniforms.uStep = new Float32Array([0, 0]);
    this._th = thickness;
  }

  apply(filterManager, input, output, clearMode) {
    const frame = input.filterFrame || input;
    this.uniforms.uStep[0] = this._th / (frame.width || 1);
    this.uniforms.uStep[1] = this._th / (frame.height || 1);
    filterManager.applyFilter(this, input, output, clearMode);
  }
}

export class CRTFilter extends PIXI.Filter {
  constructor() {
    const fragmentSrc = `
      precision mediump float;
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float time;
      uniform float uAberration;
      uniform float uScanline;
      uniform float uVignette;
      uniform float uBrightness;

      void main() {
        vec2 uv = vTextureCoord;
        float r = texture2D(uSampler, vec2(uv.x + uAberration, uv.y)).r;
        float g = texture2D(uSampler, uv).g;
        float b = texture2D(uSampler, vec2(uv.x - uAberration, uv.y)).b;
        vec3 c = vec3(r, g, b);

        c -= sin(uv.y * 1000.0 + time * 10.0) * uScanline;
        vec2 crv = uv - 0.5;
        float rsq = crv.x * crv.x + crv.y * crv.y;
        gl_FragColor = vec4(c * (1.0 - (rsq * uVignette)) * uBrightness, 1.0);
      }
    `;

    super(null, fragmentSrc, {
      time: 0,
      uAberration: CFG.SHADER.aberration,
      uScanline: CFG.SHADER.scanline,
      uVignette: CFG.SHADER.vignette,
      uBrightness: CFG.SHADER.brightness
    });
  }

  update(delta) {
    this.uniforms.time += 0.01 * delta;
  }
}

export const Shaders = {
  text: null,
  ui: null,
  init() {
    this.text = new OutlineFilter(CFG.OUTLINE.TEXT.thickness, CFG.OUTLINE.TEXT.color);
    this.ui = new OutlineFilter(CFG.OUTLINE.UI.thickness, CFG.OUTLINE.UI.color);
  },
  getUnit(scale = 1) {
    return new OutlineFilter(CFG.OUTLINE.UNIT.thickness * scale, CFG.OUTLINE.UNIT.color);
  }
};
