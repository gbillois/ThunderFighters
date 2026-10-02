/*
 * THUNDER FIGHTERS - audio engine.
 * Everything is synthesized at runtime with the Web Audio API (no samples):
 *   - instruments: pulse/saw leads, brass, strings, pads, plucks, FM bass/bells/marimba,
 *     organ, choir (formant insert), distorted guitar (waveshaper insert), drum machine
 *   - lookahead sequencer driving the compiled songs from music.js (global MUSIC)
 *   - SFX with per-name throttling and voice limits
 *   - music reverb (generated impulse response) + ping-pong echo, SFX reverb,
 *     master compressor, limiter and a final soft clipper (never above 0.99)
 * Load after music.js. Exposes the global `Sound`.
 * Every public method is a safe no-op until init() has created an AudioContext.
 */
var Sound = (function () {
  'use strict';

  // ================================================================== utils
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function ftom(f) { return 69 + 12 * Math.log(f / 440) / Math.LN2; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function mkGain(c, v) { var g = c.createGain(); g.gain.value = v; return g; }
  function mkFilter(c, type, f, q) {
    var b = c.createBiquadFilter();
    b.type = type; b.frequency.value = f;
    if (q != null) b.Q.value = q;
    return b;
  }
  function mkPan(c, p) {
    if (c.createStereoPanner) { var s = c.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; }
    return c.createGain();
  }
  var BUILTIN = { sine: 1, square: 1, sawtooth: 1, triangle: 1 };
  function mkOsc(E, type, f, t) {
    var o = E.ctx.createOscillator();
    if (BUILTIN[type]) o.type = type; else o.setPeriodicWave(E.waves[type] || E.waves.p50);
    o.frequency.setValueAtTime(f, t);
    return o;
  }
  function disc(node) { return function () { try { node.disconnect(); } catch (e) { /* ignore */ } }; }

  // ADSR on an AudioParam, click free. Returns the time the voice is silent.
  function adsr(p, t, dur, a, d, s, r, peak) {
    a = Math.max(a, 0.002); r = Math.max(r, 0.01); d = Math.max(d, 0.005);
    peak = Math.max(peak, 1e-4);
    var sl = Math.max(peak * s, peak * 0.001);
    p.setValueAtTime(0, t);
    if (dur <= a) {
      p.linearRampToValueAtTime(peak * Math.max(dur, 0.002) / a, t + Math.max(dur, 0.002));
      dur = Math.max(dur, 0.002);
    } else {
      p.linearRampToValueAtTime(peak, t + a);
      if (dur < a + d) p.exponentialRampToValueAtTime(peak * Math.pow(sl / peak, (dur - a) / d), t + dur);
      else { p.exponentialRampToValueAtTime(sl, t + a + d); p.setValueAtTime(sl, t + dur); }
    }
    p.linearRampToValueAtTime(0, t + dur + r);
    return t + dur + r;
  }
  // percussive envelope: attack then exponential decay to -60 dB at t+dur
  function perc(p, t, a, peak, dur) {
    peak = Math.max(peak, 1e-4);
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.exponentialRampToValueAtTime(peak * 0.001, t + Math.max(dur, a + 0.005));
    p.linearRampToValueAtTime(0, t + Math.max(dur, a + 0.005) + 0.01);
    return t + Math.max(dur, a + 0.005) + 0.01;
  }

  // ================================================================== tables
  function makeWaves(c) {
    function pulse(duty) {
      var n = 64, re = new Float32Array(n), im = new Float32Array(n);
      for (var i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      return c.createPeriodicWave(re, im);
    }
    return { p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5) };
  }
  function makeNoise(c, ch, sec, brown) {
    var len = Math.floor(c.sampleRate * sec), b = c.createBuffer(ch, len, c.sampleRate);
    for (var k = 0; k < ch; k++) {
      var d = b.getChannelData(k), last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
      }
    }
    return b;
  }
  function makeIR(c, dur, damp) {
    var sr = c.sampleRate, len = Math.floor(sr * dur), b = c.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), lp = 0;
      for (var i = 0; i < len; i++) {
        var t = i / sr, env = Math.exp(-t * 6.9 / dur);
        var k = clamp(0.9 - damp * (t / dur), 0.08, 0.95);
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = t < 0.012 ? 0 : lp * env;
      }
      // a few early reflections, slightly different per side
      [0.013, 0.021, 0.029, 0.041, 0.053].forEach(function (er, j) {
        var idx = Math.floor((er + ch * 0.003) * sr);
        if (idx < len) d[idx] += (j % 2 ? -1 : 1) * 0.5 * Math.pow(0.75, j);
      });
    }
    return b;
  }
  function softClipCurve() {
    // the clipper is fed at half level: input x in [-1,1] means signal 2x
    var n = 4096, cv = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1, a = x * 2, s = a < 0 ? -1 : 1, m = Math.abs(a);
      cv[i] = s * (m < 0.8 ? m : 0.8 + 0.19 * Math.tanh((m - 0.8) / 0.19));
    }
    return cv;
  }
  function distCurve(k) {
    var n = 2048, cv = new Float32Array(n), norm = Math.tanh(k);
    for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; cv[i] = Math.tanh(k * x) / norm; }
    return cv;
  }

  // ================================================================== presets
  // oscs: [wave, detuneCents, level, semitoneOffset]
  // flt: [type, baseHz, keyTrackMult, Q]; fenv: [amount, attack, decayTau]; amp: [a, d, s, r]
  // vib: [rateHz, depthCents, delaySec]
  var PRESETS = {
    lead:    { oscs: [['p25', -6, 0.55], ['sawtooth', 6, 0.4]], flt: ['lowpass', 400, 5, 1.2], fenv: [1.2, 0.015, 0.2],
               amp: [0.006, 0.3, 0.75, 0.1], vib: [5.6, 16, 0.22], glide: 0.045, lvl: 0.58 },
    lead2:   { oscs: [['p50', 0, 0.6], ['p25', 8, 0.3]], flt: ['lowpass', 300, 4, 0.8],
               amp: [0.006, 0.25, 0.7, 0.09], vib: [5.4, 12, 0.25], lvl: 0.4 },
    leadsaw: { oscs: [['sawtooth', -9, 0.45], ['sawtooth', 9, 0.45], ['p25', 0, 0.2]], flt: ['lowpass', 600, 6, 2], fenv: [0.8, 0.01, 0.15],
               amp: [0.004, 0.3, 0.8, 0.1], vib: [6, 20, 0.18], glide: 0.05, lvl: 0.62 },
    reed:    { oscs: [['p12', 0, 0.7], ['sawtooth', 3, 0.3]], flt: ['lowpass', 300, 4, 5],
               amp: [0.012, 0.2, 0.8, 0.08], vib: [6.2, 28, 0.12], glide: 0.06, lvl: 0.55 },
    flute:   { oscs: [['triangle', 0, 0.8], ['sine', 0, 0.35, 12]],
               amp: [0.035, 0.2, 0.8, 0.12], vib: [5.2, 14, 0.2], glide: 0.03, lvl: 0.5 },
    brass:   { oscs: [['sawtooth', -7, 0.5], ['sawtooth', 7, 0.5]], flt: ['lowpass', 250, 1.2, 2.5], velF: 600, fenv: [3.5, 0.06, 0.25],
               amp: [0.025, 0.3, 0.75, 0.14], lvl: 0.2 },
    strings: { oscs: [['sawtooth', -11, 0.4], ['sawtooth', 0, 0.35], ['sawtooth', 11, 0.4]], flt: ['lowpass', 1500, 1, 0.6],
               amp: [0.28, 0.6, 0.85, 0.5], lvl: 0.14 },
    pad:     { oscs: [['sawtooth', -8, 0.5], ['p50', 8, 0.4]], flt: ['lowpass', 900, 1, 1],
               amp: [0.2, 0.8, 0.7, 0.5], lvl: 0.11 },
    pluck:   { oscs: [['p25', 0, 1]], flt: ['lowpass', 400, 2, 4], fenv: [6, 0.003, 0.06],
               amp: [0.002, 0.18, 0, 0.05], lvl: 0.4 },
    organ:   { oscs: [['sine', 0, 0.6], ['sine', 0, 0.35, 12], ['sine', 0, 0.2, 19], ['sine', 0, 0.2, 24]],
               amp: [0.008, 0.1, 1, 0.08], lvl: 0.14 },
    choir:   { oscs: [['sawtooth', -9, 0.5], ['sawtooth', 9, 0.5]], flt: ['lowpass', 2400, 0, 0.5],
               amp: [0.35, 0.6, 0.9, 0.7], vib: [4.8, 10, 0.3], lvl: 0.18, insert: 'formant' },
    // guitar: one voice plays a whole power chord (stack = semitones), straight into the track's amp/cab insert
    guitar:  { oscs: [['sawtooth', 12, 0.55]], stack: [0, 7, 12], amp: [0.003, 0.5, 0.6, 0.05], lvl: 0.27, insert: 'dist' },
    bass:    { oscs: [['sawtooth', 0, 0.7], ['p50', 0, 0.45]], flt: ['lowpass', 90, 1.5, 6], fenv: [9, 0.004, 0.07],
               amp: [0.003, 0.25, 0.6, 0.05], lvl: 0.34 },
    fmbass:  { kind: 'fm', ratio: 1, index: 3.5, index1: 0.6, idec: 0.15, amp: [0.002, 0.2, 0.6, 0.05], lvl: 0.42 },
    bell:    { kind: 'fm', ratio: 3.5, index: 2.5, index1: 0.3, idec: 0.8, tau: 0.55, ring: 0.5, rel: 0.25, lvl: 0.32 },
    glock:   { kind: 'fm', ratio: 5, index: 1.2, index1: 0.1, idec: 0.3, tau: 0.3, ring: 0.25, rel: 0.15, lvl: 0.2 },
    marimba: { kind: 'fm', ratio: 4, index: 1.6, index1: 0.05, idec: 0.06, tau: 0.16, ring: 0.15, rel: 0.08, lvl: 0.36 },
    drums:   { kind: 'drums', lvl: 0.68 }
  };
  function resolvePreset(spec) {
    var base = PRESETS[spec.inst] || PRESETS.lead;
    if (!spec.p) return base;
    var o = {}, k;
    for (k in base) o[k] = base[k];
    for (k in spec.p) o[k] = spec.p[k];
    return o;
  }

  // ================================================================== voices
  function synthVoice(E, dest, t, m, dur, vel, P, tr) {
    var c = E.ctx, f = mtof(m), amp = P.amp;
    var g = c.createGain(); g.gain.value = 0;
    var end = adsr(g.gain, t, dur, amp[0], amp[1], amp[2], amp[3], P.lvl * vel);
    var into = g;
    if (P.flt) {
      var fl = c.createBiquadFilter();
      fl.type = P.flt[0]; fl.Q.value = P.flt[3];
      var fc = clamp(P.flt[1] + P.flt[2] * f + (P.velF || 0) * vel, 30, 16000);
      if (P.fenv) {
        var pk = clamp(fc * (1 + P.fenv[0] * vel), 30, 18000);
        fl.frequency.setValueAtTime(fc, t);
        fl.frequency.exponentialRampToValueAtTime(pk, t + P.fenv[1]);
        fl.frequency.setTargetAtTime(fc, t + P.fenv[1], P.fenv[2]);
      } else fl.frequency.value = fc;
      fl.connect(g); into = fl;
    }
    var from = f;
    if (P.glide && tr && tr.lastM && tr.lastM !== m) {
      var gap = t - tr.lastEnd;
      if (gap > -0.02 && gap < 0.05 && tr.lastStart < t - 0.01) from = mtof(tr.lastM);
    }
    var lfoG = null;
    if (P.vib && dur > P.vib[2] + 0.12) {
      var lfo = c.createOscillator();
      lfo.frequency.value = P.vib[0];
      lfoG = c.createGain();
      lfoG.gain.setValueAtTime(0, t);
      lfoG.gain.setValueAtTime(0, t + P.vib[2]);
      lfoG.gain.linearRampToValueAtTime(P.vib[1], t + P.vib[2] + 0.3);
      lfo.connect(lfoG); lfo.start(t); lfo.stop(end + 0.02);
    }
    var first = null, stack = P.stack || [0];
    for (var i = 0; i < P.oscs.length * stack.length; i++) {
      var si = i % P.oscs.length, k = (i - si) / P.oscs.length, s = P.oscs[si];
      var mul = Math.pow(2, ((s[3] || 0) + stack[k]) / 12);
      var o = mkOsc(E, s[0], from * mul, t);
      if (from !== f) o.frequency.exponentialRampToValueAtTime(f * mul, t + P.glide);
      if (s[1]) o.detune.value = (k % 2) ? -s[1] : s[1];
      if (lfoG) lfoG.connect(o.detune);
      if (s[2] !== 1) { var og = mkGain(c, s[2]); o.connect(og); og.connect(into); } else o.connect(into);
      o.start(t); o.stop(end + 0.02);
      if (!first) first = o;
    }
    g.connect(dest);
    if (first) first.onended = disc(g);
    return end;
  }

  function fmVoice(E, dest, t, m, dur, vel, P) {
    var c = E.ctx, f = mtof(m), fmod = f * P.ratio;
    var car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = fmod;
    var i0 = Math.max(P.index * fmod * (0.6 + 0.4 * vel), 0.01), i1 = Math.max(P.index1 * fmod, 0.01);
    mg.gain.setValueAtTime(i0, t);
    mg.gain.exponentialRampToValueAtTime(i1, t + P.idec);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    g.gain.value = 0;
    var peak = Math.max(P.lvl * vel, 1e-4), end;
    if (P.tau) {
      var hold = Math.max(dur, P.ring || 0, 0.02);
      var lv = Math.max(peak * Math.exp(-hold / P.tau), 1e-5);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.002);
      g.gain.exponentialRampToValueAtTime(lv, t + hold);
      g.gain.linearRampToValueAtTime(0, t + hold + P.rel);
      end = t + hold + P.rel;
    } else {
      end = adsr(g.gain, t, dur, P.amp[0], P.amp[1], P.amp[2], P.amp[3], peak);
    }
    g.connect(dest);
    car.start(t); mod.start(t); car.stop(end + 0.02); mod.stop(end + 0.02);
    car.onended = disc(g);
    return end;
  }

  // ================================================================== drums
  function noiseSrc(E, buf, t, end) {
    var s = E.ctx.createBufferSource(), len = buf.duration, span = end - t;
    s.buffer = buf;
    if (span > len - 0.05) { s.loop = true; s.start(t, 0); }
    else s.start(t, Math.random() * (len - span));
    s.stop(end);
    return s;
  }
  // noise burst through a filter with a percussive envelope (optional filter sweep)
  function noiseHit(E, dest, t, dur, type, f0, q, level, opt) {
    opt = opt || {};
    var c = E.ctx, end = t + dur + 0.02;
    var src = noiseSrc(E, opt.buf || (opt.stereo ? E.noiseS : E.noiseM), t, end);
    var fl = mkFilter(c, type, f0, q);
    if (opt.f1) { fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(opt.f1, t + (opt.sweep || dur)); }
    var g = c.createGain(); g.gain.value = 0;
    perc(g.gain, t, opt.a || 0.001, level, dur);
    src.connect(fl); fl.connect(g); g.connect(dest);
    src.onended = disc(g);
    return end;
  }
  // pitched sweep with percussive envelope
  function toneHit(E, dest, type, f0, f1, sweep, t, a, dur, level) {
    var c = E.ctx, o = mkOsc(E, type, f0, t), g = c.createGain();
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    g.gain.value = 0;
    var end = perc(g.gain, t, a, level, dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(end + 0.01);
    o.onended = disc(g);
    return o;
  }

  var DRUMS = {
    k: function (E, d, t, v) {
      toneHit(E, d, 'sine', 170, 44, 0.09, t, 0.002, 0.38, v * 1.0);
      noiseHit(E, d, t, 0.012, 'highpass', 3000, 0.7, v * 0.3);
    },
    s: function (E, d, t, v) {
      toneHit(E, d, 'triangle', 215, 160, 0.05, t, 0.001, 0.13, v * 0.5);
      noiseHit(E, d, t, 0.2, 'highpass', 1400, 0.7, v * 0.55, { stereo: true });
    },
    cl: function (E, d, t, v) {
      var c = E.ctx, src = noiseSrc(E, E.noiseM, t, t + 0.25), fl = mkFilter(c, 'bandpass', 1200, 1.5), g = c.createGain();
      g.gain.value = 0;
      var p = g.gain, pk = v * 0.8;
      p.setValueAtTime(0, t); p.linearRampToValueAtTime(pk, t + 0.001); p.linearRampToValueAtTime(pk * 0.2, t + 0.01);
      p.linearRampToValueAtTime(pk, t + 0.011); p.linearRampToValueAtTime(pk * 0.2, t + 0.02);
      p.linearRampToValueAtTime(pk, t + 0.021); p.exponentialRampToValueAtTime(pk * 0.001, t + 0.2); p.linearRampToValueAtTime(0, t + 0.21);
      src.connect(fl); fl.connect(g); g.connect(d); src.onended = disc(g);
    },
    h: function (E, d, t, v) { noiseHit(E, d, t, 0.045, 'highpass', 7500, 0.9, v * 0.26); },
    oh: function (E, d, t, v) { noiseHit(E, d, t, 0.3, 'highpass', 7000, 0.9, v * 0.22, { stereo: true }); },
    c: function (E, d, t, v) { noiseHit(E, d, t, 1.8, 'highpass', 3800, 0.5, v * 0.3, { stereo: true, a: 0.003 }); },
    t1: function (E, d, t, v) { DRUMS._tom(E, d, t, v, 210); },
    t2: function (E, d, t, v) { DRUMS._tom(E, d, t, v, 150); },
    t3: function (E, d, t, v) { DRUMS._tom(E, d, t, v, 105); },
    _tom: function (E, d, t, v, f) {
      toneHit(E, d, 'sine', f * 1.7, f, 0.12, t, 0.002, 0.42, v * 0.75);
      noiseHit(E, d, t, 0.03, 'lowpass', 1800, 0.7, v * 0.15);
    },
    tb: function (E, d, t, v) {
      toneHit(E, d, 'sine', 125, 60, 0.18, t, 0.002, 0.65, v * 0.95);
      noiseHit(E, d, t, 0.07, 'lowpass', 600, 0.7, v * 0.35);
    },
    cg: function (E, d, t, v) { toneHit(E, d, 'sine', 430, 330, 0.03, t, 0.001, 0.17, v * 0.45); noiseHit(E, d, t, 0.015, 'bandpass', 3000, 1, v * 0.12); },
    cgl: function (E, d, t, v) { toneHit(E, d, 'sine', 300, 225, 0.04, t, 0.001, 0.22, v * 0.5); },
    sh: function (E, d, t, v) { noiseHit(E, d, t, 0.07, 'highpass', 6500, 0.8, v * 0.16, { a: 0.018 }); },
    rim: function (E, d, t, v) { toneHit(E, d, 'triangle', 1700, 1500, 0.02, t, 0.001, 0.045, v * 0.3); toneHit(E, d, 'sine', 820, 0, 0, t, 0.001, 0.06, v * 0.2); },
    ti: function (E, d, t, v) { DRUMS._timp(E, d, t, v, 73.4); },
    tih: function (E, d, t, v) { DRUMS._timp(E, d, t, v, 110); },
    _timp: function (E, d, t, v, f) {
      toneHit(E, d, 'sine', f * 1.08, f, 0.12, t, 0.003, 1.2, v * 0.75);
      toneHit(E, d, 'sine', f * 1.52, f * 1.5, 0.12, t, 0.003, 0.6, v * 0.25);
      noiseHit(E, d, t, 0.06, 'lowpass', 500, 0.7, v * 0.3);
    }
  };
  var DRUM_PAN = { h: 0.25, oh: 0.25, t1: -0.35, t2: 0, t3: 0.35, cg: 0.4, cgl: 0.3, sh: -0.4, rim: -0.25, c: -0.1, cl: 0.1 };

  // ================================================================== engine
  var MUSIC_TRIM = 0.8; // internal balance music vs sfx at equal user volumes
  function Engine(ctx, offline) {
    var c = this.ctx = ctx;
    this.offline = !!offline;
    this.waves = makeWaves(c);
    this.noiseM = makeNoise(c, 1, 2, false);
    this.noiseS = makeNoise(c, 2, 2, false);
    this.brown = makeNoise(c, 2, 3, true);

    // master chain: master -> compressor -> limiter -> soft clip -> out
    this.master = mkGain(c, 1);
    var comp = this.comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 3;
    comp.attack.value = 0.006; comp.release.value = 0.25;
    var lim = this.lim = c.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20;
    lim.attack.value = 0.001; lim.release.value = 0.1;
    var pre = mkGain(c, 0.5), clip = c.createWaveShaper();
    clip.curve = softClipCurve();
    if (offline === 'bypass') this.master.connect(c.destination); // test hook: measure the raw mix
    else { this.master.connect(comp); comp.connect(lim); lim.connect(pre); pre.connect(clip); clip.connect(c.destination); }

    // music bus: per-song outputs -> musicIn; sends -> reverb / echo; all -> musicVol -> lowpass -> master
    this.musicVol = mkGain(c, 0.6);
    this.musicLP = mkFilter(c, 'lowpass', 20000, 0.7);
    this.musicVol.connect(this.musicLP); this.musicLP.connect(this.master);
    this.musicIn = mkGain(c, 1); this.musicIn.connect(this.musicVol);

    this.revIn = mkGain(c, 1);
    var rev = c.createConvolver(); rev.buffer = makeIR(c, 2.6, 0.75);
    var revOut = mkGain(c, 0.9);
    this.revIn.connect(rev); rev.connect(revOut); revOut.connect(this.musicVol);

    this.dlyIn = mkGain(c, 1);
    var dhp = mkFilter(c, 'highpass', 280, 0.7), dlp = mkFilter(c, 'lowpass', 3600, 0.7);
    var dL = this.dL = c.createDelay(2), dR = this.dR = c.createDelay(2);
    var fb1 = mkGain(c, 0.38), fb2 = mkGain(c, 0.38), merger = c.createChannelMerger(2), dOut = mkGain(c, 0.75);
    this.dlyIn.connect(dhp); dhp.connect(dlp); dlp.connect(dL);
    dL.connect(fb1); fb1.connect(dR); dR.connect(fb2); fb2.connect(dL);
    dL.connect(merger, 0, 0); dR.connect(merger, 0, 1);
    merger.connect(dOut); dOut.connect(this.musicVol);
    var d2r = mkGain(c, 0.25); dOut.connect(d2r); d2r.connect(this.revIn);
    dL.delayTime.value = 0.36; dR.delayTime.value = 0.36;

    // sfx bus
    this.sfxVol = mkGain(c, 0.8);
    this.sfxVol.connect(this.master);
    this.sfxIn = mkGain(c, 1); this.sfxIn.connect(this.sfxVol);
    this.sfxRevIn = mkGain(c, 1);
    var srev = c.createConvolver(); srev.buffer = makeIR(c, 1.7, 0.6);
    this.sfxRevIn.connect(srev); srev.connect(this.sfxVol);

    this.players = [];
    this.player = null;
    this.sfxState = {};
  }

  Engine.prototype.mix = function (musicVol, sfxVol, muted, paused, instant) {
    var c = this.ctx, now = c.currentTime, tc = instant ? 0.001 : 0.04;
    this.musicVol.gain.setTargetAtTime(musicVol * MUSIC_TRIM * (paused ? 0.25 : 1), now, tc);
    this.musicLP.frequency.setTargetAtTime(paused ? 750 : 20000, now, paused ? 0.06 : 0.12);
    this.sfxVol.gain.setTargetAtTime(sfxVol, now, tc);
    this.master.gain.setTargetAtTime(muted ? 0 : 1, now, tc);
  };

  Engine.prototype.setDelay = function (sec, t) {
    sec = clamp(sec, 0.05, 1.9);
    this.dL.delayTime.setValueAtTime(sec, t);
    this.dR.delayTime.setValueAtTime(sec, t);
  };

  // ================================================================== player
  function flatten(song) {
    if (song._flat) return song._flat;
    var a = [];
    song.tracks.forEach(function (t, ti) {
      t.ev.forEach(function (e) { a.push({ s: e[0], ti: ti, n: e[1], l: e[2], v: e[3] }); });
    });
    a.sort(function (x, y) { return x.s - y.s || x.ti - y.ti; });
    var li = a.length;
    for (var i = 0; i < a.length; i++) if (a[i].s >= song.loopStart) { li = i; break; }
    song._loopIdx = li;
    song._flat = a;
    return a;
  }

  function makeChannel(E, P, spec) {
    var c = E.ctx, preset = resolvePreset(spec);
    var ch = { spec: spec, preset: preset, lastEnd: -1, lastStart: -1, lastM: 0, sub: {}, nodes: [] };
    var g = mkGain(c, spec.vol), pan = mkPan(c, spec.pan || 0);
    g.connect(pan); pan.connect(P.out);
    ch.nodes.push(g, pan);
    if (spec.rev) { var rs = mkGain(c, spec.rev); pan.connect(rs); rs.connect(P.revS); ch.nodes.push(rs); }
    if (spec.dly) { var ds = mkGain(c, spec.dly); pan.connect(ds); ds.connect(P.dlyS); ch.nodes.push(ds); }
    ch.input = g;
    if (preset.insert === 'dist') {
      var drive = mkGain(c, 5), ws = c.createWaveShaper(), hp = mkFilter(c, 'highpass', 90, 0.7);
      var cab = mkFilter(c, 'lowpass', 3300, 0.9), mid = mkFilter(c, 'peaking', 1600, 1), post = mkGain(c, 0.2);
      ws.curve = distCurve(2.6); ws.oversample = preset.oversample || 'none';
      mid.gain.value = 4;
      drive.connect(ws); ws.connect(hp); hp.connect(mid); mid.connect(cab); cab.connect(post); post.connect(g);
      ch.input = drive; ch.nodes.push(drive, ws, hp, cab, mid, post);
    } else if (preset.insert === 'formant') {
      var fin = mkGain(c, 1), fpost = mkGain(c, 1.6);
      [[700, 5, 1], [1150, 6, 0.6], [2600, 7, 0.25], [400, 1, 0.35]].forEach(function (fdef) {
        var bp = mkFilter(c, 'bandpass', fdef[0], fdef[1]), lv = mkGain(c, fdef[2]);
        fin.connect(bp); bp.connect(lv); lv.connect(fpost); ch.nodes.push(bp, lv);
      });
      fpost.connect(g);
      ch.input = fin; ch.nodes.push(fin, fpost);
    }
    return ch;
  }

  function drumDest(E, ch, name) {
    var p = DRUM_PAN[name];
    if (!p) return ch.input;
    if (!ch.sub[name]) {
      var pn = mkPan(E.ctx, p);
      pn.connect(ch.input);
      ch.sub[name] = pn; ch.nodes.push(pn);
    }
    return ch.sub[name];
  }

  function Player(E, song, name, when) {
    var c = E.ctx;
    this.E = E; this.song = song; this.name = name;
    this.sps = 60 / song.bpm / 4;
    this.out = mkGain(c, 1); this.out.connect(E.musicIn);
    this.revS = mkGain(c, 1); this.revS.connect(E.revIn);
    this.dlyS = mkGain(c, 1); this.dlyS.connect(E.dlyIn);
    var self = this;
    this.tracks = song.tracks.map(function (t) { return makeChannel(E, self, t); });
    this.flat = flatten(song);
    this.idx = 0;
    this.base = when;
    this.stopped = false;
    this.ended = false;
    this.endTime = Infinity;
    E.setDelay(song.delay * 60 / song.bpm, when);
  }

  Player.prototype.schedule = function (until) {
    if (this.stopped || this.ended) return;
    var f = this.flat, song = this.song, sps = this.sps, E = this.E, now = E.ctx.currentTime, guard = 0;
    while (guard++ < 20000) {
      if (this.idx >= f.length) {
        if (song.loop && f.length && song.length > song.loopStart) {
          this.base += (song.length - song.loopStart) * sps;
          this.idx = song._loopIdx;
          if (this.base + song.length * sps < now) continue;
          if (this.idx >= f.length) break;
          continue;
        }
        this.ended = true;
        this.endTime = this.base + song.length * sps + (song.tail || 2);
        return;
      }
      var e = f[this.idx], t = this.base + e.s * sps;
      if (t >= until) break;
      this.idx++;
      if (t < now - 0.04) continue; // too late (tab stalled): skip rather than burst
      this.play(e, t);
    }
  };

  Player.prototype.play = function (e, t) {
    var ch = this.tracks[e.ti], P = ch.preset, E = this.E, dur = e.l * this.sps;
    try {
      if (P.kind === 'drums') {
        var fn = DRUMS[e.n];
        if (fn && e.n.charAt(0) !== '_') fn(E, drumDest(E, ch, e.n), t, e.v * (P.lvl || 1));
        return;
      }
      if (P.kind === 'fm') fmVoice(E, ch.input, t, e.n, dur, e.v, P);
      else synthVoice(E, ch.input, t, e.n, dur, e.v, P, ch);
      ch.lastStart = t; ch.lastEnd = t + dur; ch.lastM = e.n;
    } catch (err) { /* never let a single note kill the scheduler */ }
  };

  Player.prototype.stop = function (fade) {
    if (this.stopped) return;
    this.stopped = true;
    var c = this.E.ctx, now = c.currentTime, self = this;
    fade = Math.max(0.02, num(fade, 0.5));
    [this.out, this.revS, this.dlyS].forEach(function (g) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + fade);
    });
    if (!this.E.offline) setTimeout(function () { self.dispose(); }, (fade + 0.4) * 1000);
  };

  Player.prototype.dispose = function () {
    if (this.disposed) return;
    this.disposed = true;
    this.stopped = true;
    try {
      this.out.disconnect(); this.revS.disconnect(); this.dlyS.disconnect();
      this.tracks.forEach(function (ch) { ch.nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* ignore */ } }); });
    } catch (e) { /* ignore */ }
    var i = this.E.players.indexOf(this);
    if (i >= 0) this.E.players.splice(i, 1);
  };

  Engine.prototype.startSong = function (song, name, when) {
    var p = new Player(this, song, name, when);
    this.players.push(p);
    return p;
  };

  // ================================================================== sfx
  // per sfx name: [minInterval seconds, max simultaneous voices]
  var LIMITS = {
    shot: [0.05, 3], laser: [0.06, 3], missile: [0.08, 3], hit: [0.035, 4], enemy_shot: [0.09, 2],
    explode_s: [0.035, 6], explode_m: [0.06, 5], explode_l: [0.12, 3], explode_boss: [0.6, 1],
    powerup: [0.1, 2], medal: [0.03, 4], bomb_item: [0.1, 2], oneup: [0.3, 1],
    bomb: [0.25, 2], super: [0.25, 2], charge_ready: [0.3, 1], player_die: [0.4, 1], warning: [2.5, 1],
    select: [0.03, 2], confirm: [0.05, 2], cancel: [0.05, 2], pause: [0.1, 2], tally: [0.03, 3], stage_start: [0.6, 1]
  };
  var UI_SFX = { select: 1, confirm: 1, cancel: 1, pause: 1 };
  var LOW_PRIO = { hit: 1, enemy_shot: 1, missile: 1 }; // dropped first when the mix is crowded

  function sfxBus(E, t, o, level, rev, dur) {
    var c = E.ctx, g = mkGain(c, level * o.vol), p = null, s = null;
    if (o.pan) { p = mkPan(c, o.pan); g.connect(p); p.connect(E.sfxIn); } else g.connect(E.sfxIn);
    if (rev > 0) { s = mkGain(c, rev); g.connect(s); s.connect(E.sfxRevIn); }
    if (!E.offline) {
      setTimeout(function () {
        try { g.disconnect(); if (p) p.disconnect(); if (s) s.disconnect(); } catch (e) { /* ignore */ }
      }, (dur + Math.max(0, t - c.currentTime) + 0.6) * 1000);
    }
    return g;
  }
  // one oscillator stepping through frequencies (arpeggio jingles), with envelope
  function stepTone(E, dest, type, freqs, t, step, total, peak, detune) {
    var c = E.ctx, o = mkOsc(E, type, freqs[0], t), g = c.createGain();
    for (var i = 1; i < freqs.length; i++) o.frequency.setValueAtTime(freqs[i], t + i * step);
    if (detune) o.detune.value = detune;
    g.gain.value = 0;
    var p = g.gain, hold = t + Math.min(freqs.length * step, total * 0.7);
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + 0.004);
    p.setValueAtTime(peak, hold);
    p.exponentialRampToValueAtTime(peak * 0.001, t + total);
    p.linearRampToValueAtTime(0, t + total + 0.01);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + total + 0.03);
    o.onended = disc(g);
    return o;
  }
  function fmPing(E, dest, t, f, vel, P) { return fmVoice(E, dest, t, ftom(f), 0.05, vel, P); }
  var PING = { kind: 'fm', ratio: 3.01, index: 1.4, index1: 0.1, idec: 0.25, tau: 0.16, ring: 0.3, rel: 0.1, lvl: 0.9 };

  function crackle(E, dest, t, span, n, lvl) {
    var c = E.ctx, end = t + span + 0.08, src = noiseSrc(E, E.noiseS, t, end);
    var bp = mkFilter(c, 'bandpass', 2300, 0.9), g = c.createGain(), p = g.gain, tt = t;
    g.gain.value = 0;
    p.setValueAtTime(0, t);
    for (var i = 0; i < n; i++) {
      tt += (span / n) * rnd(0.5, 1.4);
      if (tt > t + span) break;
      var pk = lvl * rnd(0.4, 1) * (1 - 0.6 * (tt - t) / span);
      p.setValueAtTime(0, tt);
      p.linearRampToValueAtTime(pk, tt + 0.002);
      p.exponentialRampToValueAtTime(pk * 0.01, tt + rnd(0.012, 0.03));
      p.linearRampToValueAtTime(0, tt + 0.035);
      tt += 0.036;
    }
    src.connect(bp); bp.connect(g); g.connect(dest);
    src.onended = disc(g);
  }

  var BOOM = {
    s:  { lvl: 0.4, rev: 0.08, dur: 0.42, f0: 5000, f1: 300, t0: 160, t1: 45, tdur: 0.18, tpk: 0.8, rumble: 0, crk: 0 },
    m:  { lvl: 0.55, rev: 0.15, dur: 0.85, f0: 3500, f1: 180, t0: 120, t1: 35, tdur: 0.35, tpk: 1.0, rumble: 0.5, crk: 4, crkLvl: 0.35 },
    l:  { lvl: 0.7, rev: 0.25, dur: 1.6, f0: 2600, f1: 110, t0: 95, t1: 26, tdur: 0.7, tpk: 1.2, rumble: 0.9, crk: 9, crkLvl: 0.4 },
    xl: { lvl: 0.85, rev: 0.35, dur: 2.4, f0: 2000, f1: 70, t0: 80, t1: 22, tdur: 1.0, tpk: 1.3, rumble: 1.0, crk: 12, crkLvl: 0.45 }
  };
  function boom(E, t, o, S) {
    var p = o.pitch * rnd(0.92, 1.08);
    var out = sfxBus(E, t, o, S.lvl, S.rev, S.dur + 0.4);
    noiseHit(E, out, t, S.dur, 'lowpass', S.f0 * p, 0.8, 1.0, { stereo: true, a: 0.003, f1: S.f1 * p, sweep: S.dur * 0.8 });
    toneHit(E, out, 'sine', S.t0 * p, S.t1 * p, S.tdur * 0.8, t, 0.002, S.tdur, S.tpk);
    if (S.rumble) noiseHit(E, out, t, S.dur * 1.2, 'lowpass', 420 * p, 0.7, S.rumble, { buf: E.brown, a: 0.01, f1: 110 * p });
    if (S.crk) crackle(E, out, t + 0.04, S.dur * 0.7, S.crk, S.crkLvl);
    return S.dur + 0.1;
  }

  var SFX = {
    shot: function (E, t, o) {
      var p = o.pitch * rnd(0.93, 1.07), d = 0.07, c = E.ctx;
      var out = sfxBus(E, t, o, 0.34, 0, d);
      var lp = mkFilter(c, 'lowpass', 4200, 0.8); lp.connect(out);
      toneHit(E, lp, 'p25', 1150 * p, 420 * p, 0.05, t, 0.002, d, 0.7);
      noiseHit(E, lp, t, 0.03, 'highpass', 2500, 0.7, 0.45);
      return d;
    },
    laser: function (E, t, o) {
      var p = o.pitch * rnd(0.97, 1.03), d = 0.11, c = E.ctx;
      var out = sfxBus(E, t, o, 0.24, 0.05, d);
      var lp = mkFilter(c, 'lowpass', 5000, 1); lp.connect(out);
      toneHit(E, lp, 'sawtooth', 2400 * p, 700 * p, d, t, 0.002, d, 0.7);
      toneHit(E, lp, 'p25', 1200 * p, 350 * p, d, t, 0.002, d, 0.5);
      return d;
    },
    missile: function (E, t, o) {
      var p = o.pitch * rnd(0.95, 1.05), d = 0.42;
      var out = sfxBus(E, t, o, 0.4, 0.05, d);
      noiseHit(E, out, t, d, 'bandpass', 500 * p, 2.5, 1, { a: 0.04, f1: 2600 * p, sweep: 0.35 });
      toneHit(E, out, 'triangle', 180 * p, 90 * p, 0.2, t, 0.01, 0.2, 0.35);
      return d;
    },
    hit: function (E, t, o) {
      var p = o.pitch * rnd(0.9, 1.1), d = 0.04;
      var out = sfxBus(E, t, o, 0.13, 0, d);
      toneHit(E, out, 'square', 2000 * p, 1400 * p, 0.03, t, 0.001, 0.03, 0.6);
      noiseHit(E, out, t, 0.025, 'highpass', 5000, 0.7, 0.5);
      return d;
    },
    enemy_shot: function (E, t, o) {
      var p = o.pitch * rnd(0.95, 1.05), d = 0.075;
      var out = sfxBus(E, t, o, 0.09, 0, d);
      toneHit(E, out, 'triangle', 1000 * p, 640 * p, 0.06, t, 0.002, d, 0.9);
      toneHit(E, out, 'p25', 500 * p, 320 * p, 0.06, t, 0.002, d * 0.8, 0.25);
      return d;
    },
    explode_s: function (E, t, o) { return boom(E, t, o, BOOM.s); },
    explode_m: function (E, t, o) { return boom(E, t, o, BOOM.m); },
    explode_l: function (E, t, o) { return boom(E, t, o, BOOM.l); },
    explode_boss: function (E, t, o) {
      var offs = [0, 0.28, 0.6, 0.95, 1.3, 1.75, 2.3];
      offs.forEach(function (dt, i) {
        var last = i === offs.length - 1;
        boom(E, t + dt, { vol: o.vol * (last ? 1 : 0.7), pitch: o.pitch * rnd(0.8, 1.15), pan: last ? o.pan : clamp(o.pan + rnd(-0.6, 0.6), -1, 1) },
          last ? BOOM.xl : (i % 2 ? BOOM.m : BOOM.l));
      });
      var out = sfxBus(E, t, o, 0.55, 0.3, 4.2), c = E.ctx;
      var src = noiseSrc(E, E.brown, t, t + 4.1), lp = mkFilter(c, 'lowpass', 320 * o.pitch, 0.7), g = c.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.3);
      g.gain.linearRampToValueAtTime(0.75, t + 2.5); g.gain.exponentialRampToValueAtTime(0.001, t + 4);
      g.gain.linearRampToValueAtTime(0, t + 4.05);
      lp.frequency.setValueAtTime(320 * o.pitch, t); lp.frequency.exponentialRampToValueAtTime(70, t + 4);
      src.connect(lp); lp.connect(g); g.connect(out); src.onended = disc(g);
      return 4.2;
    },
    powerup: function (E, t, o) {
      var p = o.pitch, d = 0.6, base = 523.25 * p;
      var out = sfxBus(E, t, o, 0.28, 0.15, d);
      var fr = [0, 4, 7, 12, 16, 19, 24].map(function (s) { return base * Math.pow(2, s / 12); });
      stepTone(E, out, 'p25', fr, t, 0.045, d, 0.8);
      stepTone(E, out, 'square', fr.map(function (f) { return f * 2; }), t + 0.02, 0.045, d - 0.02, 0.18, 7);
      return d;
    },
    medal: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.32, 0.12, 0.45);
      fmPing(E, out, t, 1760 * p, 1, PING);
      toneHit(E, out, 'sine', 3520 * p, 0, 0, t, 0.001, 0.12, 0.25);
      return 0.45;
    },
    bomb_item: function (E, t, o) {
      var p = o.pitch, d = 0.65, c = E.ctx;
      var out = sfxBus(E, t, o, 0.3, 0.15, d);
      var lp = mkFilter(c, 'lowpass', 3200, 1); lp.connect(out);
      var fr = [392, 523.25, 783.99, 1046.5].map(function (f) { return f * p; });
      stepTone(E, lp, 'sawtooth', fr, t, 0.06, d, 0.6, -6);
      stepTone(E, lp, 'p50', fr.map(function (f) { return f / 2; }), t, 0.06, d, 0.5, 6);
      return d;
    },
    oneup: function (E, t, o) {
      var p = o.pitch, d = 0.95;
      var out = sfxBus(E, t, o, 0.32, 0.2, d);
      var semis = [7, 12, 16, 19, 16, 19, 24];
      var fr = semis.map(function (s) { return 523.25 * p * Math.pow(2, (s - 12) / 12); });
      stepTone(E, out, 'p25', fr, t, 0.075, d, 0.7);
      stepTone(E, out, 'p50', fr.map(function (f) { return f * 0.75; }), t, 0.075, d, 0.3);
      return d;
    },
    bomb: function (E, t, o) {
      var p = o.pitch, d = 2.9, c = E.ctx;
      var out = sfxBus(E, t, o, 0.75, 0.45, d);
      // whoosh
      var src = noiseSrc(E, E.noiseS, t, t + 0.9), bp = mkFilter(c, 'bandpass', 180, 1.6), g = c.createGain();
      bp.frequency.setValueAtTime(180 * p, t); bp.frequency.exponentialRampToValueAtTime(3200 * p, t + 0.5);
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.42);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.85); g.gain.linearRampToValueAtTime(0, t + 0.88);
      src.connect(bp); bp.connect(g); g.connect(out); src.onended = disc(g);
      // deep boom
      var tb = t + 0.4;
      toneHit(E, out, 'sine', 75 * p, 20 * p, 1.2, tb, 0.003, 1.4, 1.3);
      noiseHit(E, out, tb, 2.2, 'lowpass', 1800 * p, 0.7, 1.0, { stereo: true, a: 0.004, f1: 60, sweep: 2 });
      noiseHit(E, out, tb, 2.4, 'lowpass', 300 * p, 0.7, 1.0, { buf: E.brown, a: 0.02, f1: 60 });
      crackle(E, out, tb + 0.05, 1.2, 10, 0.4);
      return d;
    },
    super: function (E, t, o) {
      var p = o.pitch, d = 1.5, c = E.ctx;
      var out = sfxBus(E, t, o, 0.5, 0.35, d);
      var lp = mkFilter(c, 'lowpass', 600, 6), g = c.createGain(), tr = t + 0.38;
      lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(7000, tr);
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55, tr);
      g.gain.linearRampToValueAtTime(0, tr + 0.06);
      [-12, 12].forEach(function (dt, i) {
        var os = mkOsc(E, 'sawtooth', 180 * p, t);
        os.frequency.exponentialRampToValueAtTime(1400 * p, tr);
        os.detune.value = dt; os.connect(lp); os.start(t); os.stop(tr + 0.08);
        if (!i) os.onended = disc(g);
      });
      lp.connect(g); g.connect(out);
      noiseHit(E, out, tr, 0.8, 'highpass', 1200, 0.7, 0.8, { stereo: true, a: 0.002 });
      toneHit(E, out, 'sine', 140 * p, 35 * p, 0.4, tr, 0.002, 0.5, 1.0);
      stepTone(E, out, 'p25', [1046.5, 1568, 2093, 2637, 3136].map(function (f) { return f * p; }), tr, 0.04, 0.7, 0.25);
      return d;
    },
    charge_ready: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.3, 0.25, 0.6);
      fmPing(E, out, t, 987.77 * p, 0.9, PING);
      fmPing(E, out, t + 0.075, 1318.5 * p, 1, PING);
      noiseHit(E, out, t + 0.075, 0.12, 'highpass', 8000, 0.7, 0.25);
      return 0.6;
    },
    player_die: function (E, t, o) {
      var p = o.pitch, d = 1.7, c = E.ctx;
      var out = sfxBus(E, t, o, 0.5, 0.3, d);
      var os = mkOsc(E, 'square', 880 * p, t), lfo = c.createOscillator(), lg = mkGain(c, 60 * p);
      os.frequency.exponentialRampToValueAtTime(55 * p, t + 0.9);
      lfo.frequency.value = 22; lfo.connect(lg); lg.connect(os.frequency);
      var lp = mkFilter(c, 'lowpass', 2500, 1), g = c.createGain();
      g.gain.value = 0;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01);
      g.gain.setValueAtTime(0.5, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 0.95);
      os.connect(lp); lp.connect(g); g.connect(out);
      os.start(t); lfo.start(t); os.stop(t + 1); lfo.stop(t + 1);
      os.onended = disc(g);
      boom(E, t + 0.02, { vol: o.vol, pitch: p * 0.9, pan: o.pan }, BOOM.l);
      return d;
    },
    warning: function (E, t, o) {
      var p = o.pitch, half = 0.25, n = 12, d = half * n + 0.1, c = E.ctx;
      var out = sfxBus(E, t, o, 0.2, 0.2, d);
      var hi = 784 * p, lo = 587.33 * p;
      var o1 = mkOsc(E, 'sawtooth', hi, t), o2 = mkOsc(E, 'square', hi, t), sub = mkOsc(E, 'triangle', hi / 2, t);
      o2.detune.value = 8;
      var lp = mkFilter(c, 'lowpass', 2400, 2), g = c.createGain(), sg = mkGain(c, 0.6);
      g.gain.value = 0;
      for (var i = 0; i < n; i++) {
        var ti = t + i * half, f = i % 2 ? lo : hi;
        [o1, o2].forEach(function (os) { os.frequency.setValueAtTime(f, ti); });
        sub.frequency.setValueAtTime(f / 2, ti);
        g.gain.setValueAtTime(0, ti);
        g.gain.linearRampToValueAtTime(1, ti + 0.025);
        g.gain.linearRampToValueAtTime(0.7, ti + half - 0.04);
        g.gain.linearRampToValueAtTime(0, ti + half - 0.005);
      }
      o1.connect(lp); o2.connect(lp); sub.connect(sg); sg.connect(lp); lp.connect(g); g.connect(out);
      [o1, o2, sub].forEach(function (os) { os.start(t); os.stop(t + d); });
      o1.onended = disc(g);
      return d;
    },
    select: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.18, 0, 0.08);
      stepTone(E, out, 'p25', [1318.5 * p, 1760 * p], t, 0.025, 0.07, 0.8);
      return 0.08;
    },
    confirm: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.2, 0.12, 0.32);
      var fr = [1046.5, 1568, 2093].map(function (f) { return f * p; });
      stepTone(E, out, 'p25', fr, t, 0.05, 0.3, 0.8);
      stepTone(E, out, 'square', fr.map(function (f) { return f / 2; }), t, 0.05, 0.3, 0.25);
      return 0.32;
    },
    cancel: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.2, 0.05, 0.2);
      stepTone(E, out, 'p25', [784 * p, 523.25 * p], t, 0.06, 0.18, 0.8);
      return 0.2;
    },
    pause: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.2, 0.1, 0.25);
      stepTone(E, out, 'p50', [987.77 * p, 1318.5 * p, 987.77 * p, 1318.5 * p], t, 0.05, 0.24, 0.7);
      return 0.25;
    },
    tally: function (E, t, o) {
      var p = o.pitch, out = sfxBus(E, t, o, 0.2, 0, 0.04);
      toneHit(E, out, 'p25', 1900 * p, 0, 0, t, 0.001, 0.03, 0.8);
      return 0.04;
    },
    stage_start: function (E, t, o) {
      var p = o.pitch, d = 1.7;
      var out = sfxBus(E, t, o, 0.75, 0.3, d);
      var tr = Math.round(12 * Math.log(p) / Math.LN2);
      synthVoice(E, out, t, 67 + tr, 0.1, 1, PRESETS.brass, null);
      synthVoice(E, out, t + 0.12, 72 + tr, 0.1, 1, PRESETS.brass, null);
      [72, 76, 79, 84].forEach(function (m) { synthVoice(E, out, t + 0.26, m + tr, 0.75, 1, PRESETS.brass, null); });
      synthVoice(E, out, t + 0.26, 48 + tr, 0.75, 0.9, PRESETS.bass, null);
      DRUMS.s(E, out, t, 0.6); DRUMS.s(E, out, t + 0.12, 0.8);
      DRUMS.c(E, out, t + 0.26, 0.8); DRUMS.ti(E, out, t + 0.26, 1); DRUMS.k(E, out, t + 0.26, 0.9);
      return d;
    }
  };

  Engine.prototype.sfx = function (name, opts, when, paused) {
    var fn = SFX[name];
    if (!fn) return false;
    if (paused && !UI_SFX[name]) return false;
    opts = opts || {};
    var c = this.ctx, now = (when != null) ? when : c.currentTime;
    var lim = LIMITS[name] || [0.03, 4];
    var st = this.sfxState[name] || (this.sfxState[name] = { last: -1e9, ends: [] });
    if (now - st.last < lim[0]) return false;
    st.ends = st.ends.filter(function (e) { return e > now; });
    if (st.ends.length >= lim[1]) return false;
    if (LOW_PRIO[name]) {
      var total = 0, k;
      for (k in this.sfxState) total += this.sfxState[k].ends.length;
      if (total > 36) return false;
    }
    var o = {
      vol: clamp(num(opts.vol, 1), 0, 2) / (1 + 0.35 * st.ends.length),
      pitch: clamp(num(opts.pitch, 1), 0.25, 4),
      pan: clamp(num(opts.pan, 0), -1, 1)
    };
    if (o.vol <= 0) return false;
    var t = now + 0.005;
    var d = 0.5;
    try { d = fn(this, t, o) || 0.5; } catch (e) { return false; }
    st.last = now;
    st.ends.push(t + d);
    return true;
  };

  // ================================================================== public API
  var E = null, pending = null, timer = null, unlockBound = false;

  function getSong(name) {
    try { return (typeof MUSIC !== 'undefined' && MUSIC && MUSIC[name]) || null; } catch (e) { return null; }
  }

  function tick() {
    if (!E) return;
    try {
      var c = E.ctx;
      if (c.state !== 'running') return;
      var hidden = (typeof document !== 'undefined' && document.hidden);
      var now = c.currentTime, ahead = now + (hidden ? 1.5 : 0.15);
      var ps = E.players.slice();
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (!p.stopped) p.schedule(ahead);
        if (p.ended && now > p.endTime) {
          if (E.player === p) { E.player = null; if (api.currentMusic === p.name) api.currentMusic = null; }
          p.dispose();
        } else if (p.ended && E.player === p && now > p.base + p.song.length * p.sps + 0.3) {
          // the jingle has finished playing; its reverb tail still rings
          if (api.currentMusic === p.name) api.currentMusic = null;
        }
      }
    } catch (e) { /* keep ticking */ }
  }

  function bindUnlock() {
    if (unlockBound || typeof window === 'undefined' || !window.addEventListener) return;
    unlockBound = true;
    var evs = ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'keydown'];
    var h = function () {
      if (!E) return;
      if (E.ctx.state !== 'running') { try { E.ctx.resume(); } catch (e) { /* ignore */ } }
      if (E.ctx.state === 'running') evs.forEach(function (n) { window.removeEventListener(n, h, true); });
    };
    evs.forEach(function (n) { window.addEventListener(n, h, true); });
  }

  function init() {
    try {
      if (E) {
        if (E.ctx.state !== 'running') { var pr = E.ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); }
        return true;
      }
      if (typeof window === 'undefined') return false;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      var ctx;
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
      E = new Engine(ctx, false);
      api.ready = true;
      E.mix(api.musicVolume, api.sfxVolume, api.muted, api.paused, true);
      if (ctx.state !== 'running') { var r = ctx.resume(); if (r && r.catch) r.catch(function () {}); }
      try { // iOS unlock: play one silent sample inside the gesture
        var b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
      } catch (e) { /* ignore */ }
      bindUnlock();
      if (!timer) timer = setInterval(tick, 25);
      if (pending) { var n = pending; pending = null; api.currentMusic = null; playMusic(n); }
      return true;
    } catch (e) {
      E = null; api.ready = false;
      return false;
    }
  }

  function playMusic(name) {
    try {
      var song = getSong(name);
      if (!song) return;
      if (!E) { pending = name; api.currentMusic = name; return; }
      var cur = E.player;
      if (cur && cur.name === name && !cur.stopped && api.currentMusic === name) return;
      var had = false;
      if (cur) { cur.stop(0.35); had = true; }
      var now = E.ctx.currentTime;
      E.player = E.startSong(song, name, now + (had ? 0.1 : 0.06));
      api.currentMusic = name;
      E.player.schedule(now + 0.2);
    } catch (e) { /* never throw */ }
  }

  function stopMusic(fadeSec) {
    try {
      pending = null;
      api.currentMusic = null;
      if (!E || !E.player) return;
      E.player.stop(num(fadeSec, 0.5));
      E.player = null;
    } catch (e) { /* ignore */ }
  }

  function sfx(name, opts) {
    try {
      if (!E || api.muted) return false;
      if (E.ctx.state !== 'running') return false;
      return E.sfx(name, opts, null, api.paused);
    } catch (e) { return false; }
  }

  function applyMix() { try { if (E) E.mix(api.musicVolume, api.sfxVolume, api.muted, api.paused); } catch (e) { /* ignore */ } }

  function setMusicVolume(v) { api.musicVolume = clamp(num(v, 0.6), 0, 1); applyMix(); return api.musicVolume; }
  function setSfxVolume(v) { api.sfxVolume = clamp(num(v, 0.8), 0, 1); applyMix(); return api.sfxVolume; }
  function setMuted(b) { api.muted = !!b; applyMix(); return api.muted; }
  function toggleMute() { return setMuted(!api.muted); }
  function setPaused(b) { api.paused = !!b; applyMix(); return api.paused; }

  // Offline render for tests: kind 'music' | 'sfx' | 'stress'. Returns Promise<AudioBuffer>.
  function render(kind, name, seconds, opts) {
    opts = opts || {};
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var sr = opts.sampleRate || 44100;
    var ctx = new OAC(2, Math.ceil(sr * seconds), sr);
    var e = new Engine(ctx, opts.bypass ? 'bypass' : true);
    e.mix(num(opts.musicVolume, api.musicVolume), num(opts.sfxVolume, api.sfxVolume), false, !!opts.paused, true);
    if (kind === 'music' || kind === 'stress') {
      var song = getSong(name);
      if (song && opts.only) { // test hook: render a subset of tracks (others get no events)
        song = { name: song.name, bpm: song.bpm, loop: song.loop, loopStart: song.loopStart, length: song.length, delay: song.delay, tail: song.tail,
          tracks: song.tracks.map(function (t) { return opts.only.indexOf(t.name) >= 0 ? t : { name: t.name, inst: t.inst, vol: t.vol, pan: t.pan, rev: t.rev, dly: t.dly, p: t.p, ev: [] }; }) };
      }
      if (song) {
        var pl = e.startSong(song, name, 0.05);
        if (opts.solo) pl.tracks.forEach(function (ch) { if (ch.spec.name !== opts.solo) ch.nodes[0].gain.value = 0; });
        if (opts.chunked && ctx.suspend) {
          // emulate the realtime lookahead scheduler: wake every 25 ms, schedule 0.15 s ahead
          pl.schedule(0.15);
          var wake = function (tt) {
            ctx.suspend(tt).then(function () { pl.schedule(tt + 0.15); ctx.resume(); });
          };
          for (var tt = 0.025; tt < seconds - 0.03; tt += 0.025) wake(Math.round(tt * 1000) / 1000);
        } else pl.schedule(seconds);
      }
    }
    if (kind === 'sfx') e.sfx(name, opts.sfxOpts || {}, 0.02);
    if (kind === 'stress') {
      // a wall of effects on top of the music: every name, repeatedly, every 1/60 s
      var names = opts.sfxNames || Object.keys(SFX);
      for (var f = 0; f * (1 / 60) < seconds - 0.5; f++) {
        var tt = 0.1 + f / 60;
        for (var i = 0; i < names.length; i++) {
          if (Math.random() < (opts.density || 0.5)) e.sfx(names[i], { pan: rnd(-1, 1), pitch: rnd(0.8, 1.2) }, tt);
        }
      }
    }
    return ctx.startRendering();
  }

  var api = {
    currentMusic: null,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
    paused: false,
    ready: false,
    init: init,
    playMusic: playMusic,
    stopMusic: stopMusic,
    sfx: sfx,
    setMusicVolume: setMusicVolume,
    setSfxVolume: setSfxVolume,
    toggleMute: toggleMute,
    setMuted: setMuted,
    setPaused: setPaused,
    songNames: function () { try { return Object.keys(MUSIC); } catch (e) { return []; } },
    sfxNames: function () { return Object.keys(SFX); },
    _render: render,
    _presets: PRESETS,
    _engine: function () { return E; }
  };
  return api;
})();
