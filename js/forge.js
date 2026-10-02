'use strict';
// ============================================================
// Sprite Forge: procedural pixel-art renderer.
// Shapes are written into a height field + material map, then
// lit with a top-left light, quantized to hand-picked color ramps,
// given cast shadows, specular glints and a dark selective outline.
// ============================================================

// Color ramps (dark -> light), hue shifted shadows for a 16-bit look
const MAT = {
  steel: ['#151a2a', '#262f47', '#3b4a66', '#5a6e8e', '#8296b4', '#b4c6dc', '#e6f0f8'],
  silver: ['#1e2030', '#3a3e54', '#5e647c', '#8a92a8', '#b4bccc', '#dce2ea', '#ffffff'],
  navy: ['#0b1028', '#16224c', '#22387a', '#2f54a8', '#4a7ed2', '#80b0f0', '#c8e4ff'],
  sky: ['#0e2038', '#1a3c64', '#28609a', '#3c88c8', '#64b0e8', '#a0d8ff', '#e0f6ff'],
  red: ['#22060e', '#4c0c18', '#801620', '#b82a26', '#e4502e', '#ff8a4c', '#ffc890'],
  crimson: ['#1a0410', '#3a0a1c', '#640e26', '#96182e', '#c8303a', '#f06058', '#ffa090'],
  olive: ['#141a0e', '#242e16', '#3a4822', '#56662e', '#768a3c', '#a2b25a', '#d2da90'],
  green: ['#0a1a12', '#123020', '#1c4c2c', '#2a6c38', '#3e9046', '#6ab858', '#b0e080'],
  jade: ['#081a1c', '#0e3034', '#164c4c', '#226c66', '#36907e', '#5cb89a', '#a0e0c4'],
  sand: ['#241a12', '#46321e', '#6e502e', '#9a7442', '#c49c5c', '#e2c482', '#f8e8b8'],
  khaki: ['#1c1a10', '#36321c', '#56502c', '#7a723e', '#a09856', '#c8c07c', '#ece6b4'],
  rust: ['#180c0a', '#341812', '#58281a', '#803c22', '#a8582e', '#cc8044', '#ecb070'],
  dark: ['#08080e', '#12121c', '#1e1e2c', '#2c2e40', '#404458', '#5c6276', '#8890a4'],
  gun: ['#0c0e14', '#181c26', '#262c3a', '#384052', '#4e586e', '#6e7a90', '#a0acc0'],
  yellow: ['#2a1a06', '#5a380c', '#8e5c12', '#c88a1c', '#ecb630', '#ffdc5c', '#fff6b0'],
  orange: ['#2a0e04', '#5a2008', '#90380c', '#c85814', '#f08020', '#ffb048', '#ffe090'],
  purple: ['#120a20', '#24123e', '#3a1c62', '#56288a', '#7a3eb2', '#a868d8', '#dcaaf6'],
  white: ['#262838', '#4a5066', '#7a8296', '#a6aebe', '#cad0dc', '#e8ecf2', '#ffffff'],
  bone: ['#221c18', '#443a30', '#6a5e4e', '#928672', '#b8ae96', '#dad2ba', '#f6f0e0'],
  glass: ['#06121e', '#0c2a40', '#145068', '#1e7c94', '#38b0c4', '#8ae2ec', '#ffffff'],
  glassR: ['#1a0610', '#3c0c1c', '#6a1428', '#a02838', '#d85050', '#ff9a8a', '#ffffff'],
  ice: ['#102030', '#1c3c58', '#2c6084', '#4888b0', '#78b4d6', '#b4dcf0', '#f0fcff'],
  rock: ['#1c1618', '#2e2428', '#463a3a', '#605250', '#7c6c66', '#9c8c82', '#c0b0a2'],
  black: ['#050507', '#0c0c12', '#16161e', '#22222c', '#30303c', '#44444f', '#5c5c68'],
  // emissive ramps (not lit)
  glowR: ['#600808', '#a01808', '#e03010', '#ff6020', '#ffa040', '#ffe080', '#ffffff'],
  glowB: ['#081860', '#1030a0', '#2060e0', '#40a0ff', '#80d0ff', '#c0f0ff', '#ffffff'],
  glowG: ['#0c4010', '#187018', '#28a828', '#50e040', '#a0ff70', '#e0ffb0', '#ffffff'],
  glowY: ['#603000', '#a06000', '#e0a000', '#ffd020', '#ffec60', '#fff8b0', '#ffffff'],
  glowP: ['#300848', '#601080', '#a020c0', '#e040f0', '#ff80ff', '#ffc0ff', '#ffffff'],
};
const MAT_IDS = Object.keys(MAT);
const MAT_RGB = MAT_IDS.map(k => MAT[k].map(hexToRgb));
const MAT_INDEX = {}; MAT_IDS.forEach((k, i) => MAT_INDEX[k] = i);
const OUTLINE_RGB = hexToRgb('#0a0612');

class Forge {
  constructor(w, h) {
    this.w = w; this.h = h;
    const n = w * h;
    this.mat = new Int16Array(n).fill(-1);
    this.hgt = new Float32Array(n);
    this.prof = new Float32Array(n);      // raw shape profile (used by emissive materials)
    this.part = new Int16Array(n).fill(-1);
    this.emit = new Uint8Array(n);
    this.sofs = new Int8Array(n);        // shade offsets (panel lines, decals)
    this.over = new Int32Array(n).fill(-1); // forced colors 0xRRGGBB
    this.partCount = 0;
    // transform
    this.ox = w / 2; this.oy = h / 2; this.sx = 1; this.sy = 1;
    this.tilt = 0;                        // roll tilt for lighting (-1..1)
    this.light = [-0.55, -0.75, 0.9];
    this.outline = true;
    this.specular = true;
  }
  X(x) { return this.ox + x * this.sx; }
  Y(y) { return this.oy + y * this.sy; }
  // rotation of the whole model around (ox, oy): shapes are rasterized natively
  // at the new angle so rotated sprites stay clean pixel art (no bitmap rotation)
  setRot(a) { this.rot = a; this.rc = Math.cos(a); this.rs = Math.sin(a); }
  fwd(px, py) {
    if (!this.rot) return [px, py];
    const dx = px - this.ox, dy = py - this.oy;
    return [this.ox + dx * this.rc - dy * this.rs, this.oy + dx * this.rs + dy * this.rc];
  }

  // generic rasterizer: fn(px,py) returns height (>=0) or -1 if outside
  _fill(x0, y0, x1, y1, fn, mat, o = {}) {
    const m = typeof mat === 'number' ? mat : MAT_INDEX[mat];
    const part = o.part !== undefined ? o.part : this.partCount++;
    const z = o.z || 0, amp = o.amp !== undefined ? o.amp : 1;
    const paint = !!o.paint, emit = mat && mat.startsWith && mat.startsWith('glow');
    const rot = !!this.rot && !o.raw;
    if (rot) {
      const cs = [this.fwd(x0, y0), this.fwd(x1, y0), this.fwd(x0, y1), this.fwd(x1, y1)];
      x0 = Math.min(...cs.map(c => c[0])); x1 = Math.max(...cs.map(c => c[0]));
      y0 = Math.min(...cs.map(c => c[1])); y1 = Math.max(...cs.map(c => c[1]));
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(this.w - 1, Math.ceil(x1)); y1 = Math.min(this.h - 1, Math.ceil(y1));
    const ox = this.ox, oy = this.oy, rc = this.rc, rs = this.rs;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        let ux = x + 0.5, uy = y + 0.5;
        if (rot) { const dx = ux - ox, dy = uy - oy; ux = ox + dx * rc + dy * rs; uy = oy - dx * rs + dy * rc; }
        const hv = fn(ux, uy);
        if (hv < 0) continue;
        const i = y * this.w + x;
        if (paint) {
          if (this.mat[i] < 0) continue;
          if (o.over !== undefined) { this.over[i] = o.over; continue; }
          this.mat[i] = m; this.emit[i] = emit ? 1 : 0;
          if (o.shade) this.sofs[i] += o.shade;
          continue;
        }
        this.mat[i] = m;
        this.hgt[i] = z + hv * amp;
        this.prof[i] = hv;
        this.part[i] = part;
        this.emit[i] = emit ? 1 : 0;
        this.sofs[i] = o.shade || 0;
        this.over[i] = -1;
      }
    }
    return part;
  }
  // ellipse; prof: dome | cylY | cylX | flat
  ellipse(cx, cy, rx, ry, mat, o = {}) {
    const X = this.X(cx), Y = this.Y(cy), RX = Math.max(0.5, rx * Math.abs(this.sx)), RY = Math.max(0.5, ry * Math.abs(this.sy));
    const prof = o.prof || 'dome', bevel = o.bevel || 2;
    return this._fill(X - RX - 1, Y - RY - 1, X + RX + 1, Y + RY + 1, (px, py) => {
      const u = (px - X) / RX, v = (py - Y) / RY, d = u * u + v * v;
      if (d > 1) return -1;
      if (prof === 'dome') return Math.sqrt(1 - d);
      if (prof === 'cylY') return Math.sqrt(Math.max(0, 1 - u * u)) * Math.min(1, (1 - d) * 4);
      if (prof === 'cylX') return Math.sqrt(Math.max(0, 1 - v * v)) * Math.min(1, (1 - d) * 4);
      const e = (1 - Math.sqrt(d)) * Math.min(RX, RY) / bevel;
      return Math.min(1, e);
    }, mat, o);
  }
  circle(cx, cy, r, mat, o) { return this.ellipse(cx, cy, r, r, mat, o); }
  // polygon with bevel profile
  poly(pts, mat, o = {}) {
    const P = pts.map(([x, y]) => [this.X(x), this.Y(y)]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const bevel = o.bevel || 1.6, n = P.length;
    const flat = o.prof === 'flat';
    return this._fill(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (px, py) => {
      let inside = false, md = 1e9;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
        const dx = xj - xi, dy = yj - yi, l2 = dx * dx + dy * dy || 1;
        let t = ((px - xi) * dx + (py - yi) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = xi + t * dx - px, ey = yi + t * dy - py;
        md = Math.min(md, ex * ex + ey * ey);
      }
      if (!inside) return -1;
      if (flat) return 1;
      return Math.min(1, Math.sqrt(md) / bevel);
    }, mat, o);
  }
  rect(x, y, w, h, mat, o) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], mat, o); }
  // capsule / cylinder between two points (round cross-section)
  capsule(x1, y1, x2, y2, r, mat, o = {}) {
    const A = [this.X(x1), this.Y(y1)], B = [this.X(x2), this.Y(y2)];
    const R = Math.max(0.5, r * (Math.abs(this.sx) * 0.5 + 0.5));
    const r2 = o.r2 !== undefined ? Math.max(0.5, o.r2 * (Math.abs(this.sx) * 0.5 + 0.5)) : R;
    const x0 = Math.min(A[0], B[0]) - Math.max(R, r2) - 1, x1b = Math.max(A[0], B[0]) + Math.max(R, r2) + 1;
    const y0 = Math.min(A[1], B[1]) - Math.max(R, r2) - 1, y1b = Math.max(A[1], B[1]) + Math.max(R, r2) + 1;
    const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1;
    return this._fill(x0, y0, x1b, y1b, (px, py) => {
      let t = ((px - A[0]) * dx + (py - A[1]) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const rr = R + (r2 - R) * t;
      const ex = A[0] + t * dx - px, ey = A[1] + t * dy - py;
      const d = Math.sqrt(ex * ex + ey * ey) / rr;
      if (d > 1) return -1;
      return Math.sqrt(1 - d * d);
    }, mat, o);
  }
  // shade offset along a line (panel lines), only on filled pixels
  line(x1, y1, x2, y2, shade = -1, o = {}) {
    const A = this.fwd(this.X(x1), this.Y(y1)), B = this.fwd(this.X(x2), this.Y(y2));
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1]))));
    for (let s = 0; s <= steps; s++) {
      const x = Math.floor(lerp(A[0], B[0], s / steps)), y = Math.floor(lerp(A[1], B[1], s / steps));
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      const i = y * this.w + x;
      if (this.mat[i] < 0) continue;
      if (o.color) this.over[i] = parseInt(o.color.slice(1), 16);
      else this.sofs[i] += shade;
    }
  }
  // force a color at a pixel (after transform)
  px(x, y, color) {
    const R = this.fwd(this.X(x), this.Y(y));
    const X = Math.floor(R[0]), Y = Math.floor(R[1]);
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    const i = Y * this.w + X;
    if (this.mat[i] < 0) { this.mat[i] = MAT_INDEX.dark; this.part[i] = this.partCount++; }
    this.over[i] = parseInt(color.slice(1), 16);
  }
  // roundel / insignia painted flat (color rings)
  roundel(cx, cy, rings) {
    // rings: [[r,color],...] largest first, painted flat but lit
    const X = this.X(cx), Y = this.Y(cy);
    for (const [r, color] of rings) {
      const RX = Math.max(0.5, r * Math.abs(this.sx)), RY = r;
      const col = parseInt(color.slice(1), 16) | 0x1000000;
      this._fill(X - RX - 1, Y - RY - 1, X + RX + 1, Y + RY + 1, (px, py) => {
        const u = (px - X) / RX, v = (py - Y) / RY;
        return u * u + v * v > 1 ? -1 : 1;
      }, 'dark', { paint: true, over: col });
    }
  }

  render() {
    const { w, h } = this;
    const c = makeCanvas(w, h);
    const img = c.ctx.createImageData(w, h);
    const d = img.data;
    const L = this.light, ll = Math.hypot(L[0], L[1], L[2]);
    const lx = L[0] / ll, ly = L[1] / ll, lz = L[2] / ll;
    const H = (x, y) => (x < 0 || y < 0 || x >= w || y >= h || this.mat[y * w + x] < 0) ? -0.15 : this.hgt[y * w + x];
    const k = 2.2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const m = this.mat[i];
        if (m < 0) continue;
        const ramp = MAT_RGB[m], n = ramp.length;
        let col;
        if (this.emit[i]) {
          const hh = clamp(this.prof[i], 0, 1);
          let idx = Math.round(Math.pow(hh, 2.6) * (n - 1)) + this.sofs[i];
          col = ramp[clamp(idx, 0, n - 1)];
        } else {
          let nx = (H(x - 1, y) - H(x + 1, y)) * k + this.tilt * 0.9;
          let ny = (H(x, y - 1) - H(x, y + 1)) * k;
          let nz = 1;
          const nl = Math.hypot(nx, ny, nz);
          nx /= nl; ny /= nl; nz /= nl;
          let dot = nx * lx + ny * ly + nz * lz;
          // cast shadow from taller parts toward bottom-right
          const sx = x - 1, sy = y - 1;
          if (sx >= 0 && sy >= 0) {
            const j = sy * w + sx;
            if (this.mat[j] >= 0 && this.part[j] !== this.part[i] && this.hgt[j] > this.hgt[i] + 0.35) dot -= 0.3;
          }
          let t = clamp((dot - 0.05) / 0.95, 0, 1);
          let idx = Math.round(t * (n - 2)) + this.sofs[i];
          if (this.specular && dot > 0.985 && this.sofs[i] >= 0) idx = n - 1;
          idx = clamp(idx, 0, n - 1);
          col = ramp[idx];
          const ov = this.over[i];
          if (ov >= 0) {
            const base = [(ov >> 16) & 255, (ov >> 8) & 255, ov & 255];
            if (ov & 0x1000000) {
              const f = 0.55 + t * 0.6;
              col = [base[0] * f, base[1] * f, base[2] * f];
            } else col = base;
          }
        }
        if (!this.emit[i] && this.over[i] >= 0 && !(this.over[i] & 0x1000000)) {
          const ov = this.over[i]; col = [(ov >> 16) & 255, (ov >> 8) & 255, ov & 255];
        }
        d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
      }
    }
    if (this.outline) {
      const filled = i => d[i * 4 + 3] === 255;
      const out = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (filled(i)) continue;
        if ((x > 0 && filled(i - 1)) || (x < w - 1 && filled(i + 1)) || (y > 0 && filled(i - w)) || (y < h - 1 && filled(i + w))) out.push(i);
      }
      for (const i of out) {
        d[i * 4] = OUTLINE_RGB[0]; d[i * 4 + 1] = OUTLINE_RGB[1]; d[i * 4 + 2] = OUTLINE_RGB[2]; d[i * 4 + 3] = 255;
      }
    }
    c.ctx.putImageData(img, 0, 0);
    return c;
  }
}

// helper: build a sprite with a model function. Returns canvas with .flash and .shadow
function forgeSprite(w, h, model, opts = {}) {
  const f = new Forge(w, h);
  if (opts.sx !== undefined) f.sx = opts.sx;
  if (opts.tilt !== undefined) f.tilt = opts.tilt;
  if (opts.outline === false) f.outline = false;
  if (opts.ox !== undefined) f.ox = opts.ox;
  if (opts.oy !== undefined) f.oy = opts.oy;
  if (opts.rot) f.setRot(opts.rot);
  model(f, opts);
  const c = f.render();
  finishSprite(c);
  return c;
}
// Pixel-exact downscaled silhouette (no mixels): a k-scaled shadow drawn 1:1
function scaledShadow(src, k) {
  const w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k));
  const d = src.ctx.getImageData(0, 0, src.width, src.height).data;
  const c = makeCanvas(w, h);
  const img = c.ctx.createImageData(w, h), o = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(src.width - 1, Math.floor((x + 0.5) / k)), sy = Math.min(src.height - 1, Math.floor((y + 0.5) / k));
    if (d[(sy * src.width + sx) * 4 + 3] > 0) o[(y * w + x) * 4 + 3] = 255;
  }
  c.ctx.putImageData(img, 0, 0);
  return c;
}
function finishSprite(c) {
  c.flash = silhouette(c, '#ffffff');
  c.shadow = silhouette(c, '#000000');
  c.shadowS = scaledShadow(c, 0.5);
  c.hw = c.width / 2; c.hh = c.height / 2;
  return c;
}
// N natively rotated renders of a model. size: square canvas; frame k is rotated by k*TAU/N
const ROT_N = 16;
function rotSet(size, model, opts = {}) {
  const out = [];
  for (let k = 0; k < ROT_N; k++) out.push(forgeSprite(size, size, model, Object.assign({}, opts, { rot: k * TAU / ROT_N })));
  return out;
}
// pick the frame for a direction; base = direction the unrotated model faces
function rotFrame(set, ang, base) {
  const k = Math.round((ang - base) / (TAU / ROT_N));
  return set[((k % ROT_N) + ROT_N) % ROT_N];
}
