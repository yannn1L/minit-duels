// ============================================================
// AUDIO SYSTEM (ES Module - Zero-Allocation Noise Cache)
// ============================================================
import { CFG } from '../config.js';
import { MinitEngine } from './Registry.js';
import { DebugConfig } from './DebugConfig.js';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.lastPlay = {};
    this.masterGain = null;
    this.compressor = null;
    this.cachedNoiseBuffer = null;
    this.muted = false;
  }

  ensureContext() {
    if (this.muted || DebugConfig.state.sfxMuted) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = DebugConfig.state.sfxMasterVolume ?? CFG.AUDIO.MASTER_GAIN;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = CFG.AUDIO.COMPRESSOR.THRESHOLD;
      this.compressor.ratio.value = CFG.AUDIO.COMPRESSOR.RATIO;
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // Pre-bake 2 seconds of high-quality white noise once into a shared buffer
      const sampleRate = this.ctx.sampleRate || 44100;
      const numSamples = sampleRate * 2;
      this.cachedNoiseBuffer = this.ctx.createBuffer(1, numSamples, sampleRate);
      const data = this.cachedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.masterGain) {
      this.masterGain.gain.value = DebugConfig.state.sfxMasterVolume ?? CFG.AUDIO.MASTER_GAIN;
    }
  }

  init() {
    this.ensureContext();
  }

  play(type, volumeMultiplier = 1) {
    const st = DebugConfig.state;
    if (this.muted || st.sfxMuted || (st.sfxMasterVolume ?? 0.7) <= 0.001) return;
    this.ensureContext();
    if (!this.ctx || this.ctx.state === 'suspended' || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const def = MinitEngine.Registry.audio[type];
    const baseThrottle = def?.throttle ?? CFG.AUDIO.THROTTLE[type] ?? CFG.AUDIO.THROTTLE.DEFAULT;
    const throttle = baseThrottle * (st.sfxThrottleScale ?? 1.0);

    if (this.lastPlay[type] && now - this.lastPlay[type] < throttle) return;
    this.lastPlay[type] = now;
    if (!def) return;

    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);
    const targetVolume = (typeof def.v === 'function' ? def.v() : def.v) * volumeMultiplier;
    const pitchScale = st.sfxPitchScale ?? 1.0;

    if (def.noise) {
      this._playNoise(def, gain, targetVolume, now, pitchScale);
    } else {
      this._playOscillator(def, gain, targetVolume, now, pitchScale);
    }
  }

  _playNoise(def, gain, volume, time, pitchScale = 1.0) {
    if (!this.cachedNoiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.cachedNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = def.fType || 'lowpass';
    const f0 = (typeof def.f0 === 'function' ? def.f0() : def.f0) * pitchScale;
    filter.frequency.setValueAtTime(Math.max(20, f0), time);
    if (def.f1) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, def.f1 * pitchScale), time + def.d);
    }

    noiseSource.connect(filter);
    filter.connect(gain);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + def.d);

    if (def.oF0) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(Math.max(15, def.oF0 * pitchScale), time);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(10, (def.oF1 || 10) * pitchScale),
        time + Math.min(0.4, def.d)
      );
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + Math.min(0.4, def.d));
    }

    const offset = Math.random() * 0.8;
    noiseSource.start(time, offset, def.d);

    noiseSource.onended = () => {
      try {
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    };
  }

  _playOscillator(def, gain, volume, time, pitchScale = 1.0) {
    const osc = this.ctx.createOscillator();
    osc.connect(gain);
    osc.type = def.t || 'sine';
    const rawStart = typeof def.f0 === 'function' ? def.f0() : def.f0;
    const startFreq = Math.max(20, rawStart * pitchScale);
    osc.frequency.setValueAtTime(startFreq, time);

    if (def.seq) {
      def.seq.forEach((freq, idx) => {
        const f = (typeof freq === 'function' ? freq() : freq) * pitchScale;
        osc.frequency.setValueAtTime(Math.max(20, f), time + (idx + 1) * 0.05);
      });
    } else if (def.ramp === 'lin_exp' && def.f1 && def.f2) {
      const midFreq = (typeof def.f1 === 'function' ? def.f1(rawStart) : def.f1) * pitchScale;
      osc.frequency.linearRampToValueAtTime(Math.max(20, midFreq), time + 0.1);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, def.f2 * pitchScale), time + def.d);
    } else if (def.f1) {
      const endFreq = Math.max(20, def.f1 * pitchScale);
      if (def.ramp === 'lin') {
        osc.frequency.linearRampToValueAtTime(endFreq, time + def.d);
      } else {
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + def.d);
      }
    }

    gain.gain.setValueAtTime(def.ramp === 'lin_exp' || def.t === 'start' ? 0 : volume, time);
    if (def.ramp === 'lin_exp') gain.gain.linearRampToValueAtTime(volume, time + 0.05);
    if (def.t === 'start') gain.gain.linearRampToValueAtTime(volume, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, time + def.d);

    osc.start(time);
    osc.stop(time + def.d);
    osc.onended = () => {
      try {
        gain.disconnect();
      } catch (e) {}
    };
  }
}

export const AudioSys = new AudioSystem();
