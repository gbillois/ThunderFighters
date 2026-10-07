'use strict';
// ============================================================
// Bitmap font 5x7 (hand drawn) with outline / gradient rendering
// ============================================================

const FONT_SRC = {
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  'J': ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  'x': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.####'],
  '^': ['..#..', '.###.', '#####', '..#..', '..#..', '..#..', '.....'],   // up arrow
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '~': ['.....', '.#.#.', '#####', '#####', '.###.', '..#..', '.....'],   // heart
  '$': ['..#..', '.###.', '#####', '.###.', '..#..', '.....', '.....'],   // diamond (star)
};
const FONT_W = 5, FONT_H = 7, FONT_ADV = 6;

const Font = {
  cache: new Map(),
  // returns a canvas atlas of all glyphs in given color (string) or per-row gradient (array of 7)
  atlas(color) {
    const key = Array.isArray(color) ? color.join(',') : color;
    let a = this.cache.get(key);
    if (a) return a;
    const chars = Object.keys(FONT_SRC);
    a = makeCanvas(chars.length * FONT_W, FONT_H);
    a.index = {};
    chars.forEach((ch, i) => {
      a.index[ch] = i;
      const g = FONT_SRC[ch];
      for (let y = 0; y < FONT_H; y++) {
        a.ctx.fillStyle = Array.isArray(color) ? color[y] : color;
        for (let x = 0; x < FONT_W; x++) if (g[y][x] === '#') a.ctx.fillRect(i * FONT_W + x, y, 1, 1);
      }
    });
    this.cache.set(key, a);
    return a;
  },
  width(str, scale = 1) { return (str.length * FONT_ADV - 1) * scale; },
  norm: new Map(),
  normalize(str) {
    let r = this.norm.get(str);
    if (r === undefined) {
      r = String(str).toUpperCase().replace(/X(?=\d)/g, 'x');
      if (this.norm.size > 600) this.norm.clear();
      this.norm.set(str, r);
    }
    return r;
  },
  // Pre-baked glyph atlas with the outline / shadow already included: one blit per
  // character instead of a dozen (the HUD used to cost ~350 drawImage calls a frame).
  baked: new Map(),
  bake(color, outline, shadow) {
    const key = (Array.isArray(color) ? color.join(',') : color) + '|' + (outline || '') + '|' + (shadow || '');
    let a = this.baked.get(key);
    if (a) return a;
    const chars = Object.keys(FONT_SRC);
    const ox = outline ? 1 : 0, oy = outline ? 1 : 0;
    const cw = FONT_W + (outline ? 2 : shadow ? 1 : 0), ch = FONT_H + (outline ? 3 : shadow ? 1 : 0);
    const c = makeCanvas(chars.length * cw, ch);
    const stamp = (cell, atlas, dx, dy) => c.ctx.drawImage(atlas, cell * FONT_W, 0, FONT_W, FONT_H, cell * cw + ox + dx, oy + dy, FONT_W, FONT_H);
    const main = this.atlas(color);
    chars.forEach((chr, i) => {
      if (outline) {
        const o = this.atlas(outline);
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [1, 2], [0, 2], [-1, 2]]) stamp(i, o, dx, dy);
      } else if (shadow) stamp(i, this.atlas(shadow), 1, 1);
      stamp(i, main, 0, 0);
    });
    a = { c, cw, ch, ox, oy, index: main.index };
    this.baked.set(key, a);
    return a;
  },
  // Larger text (scale > 1) is rendered once per distinct string and cached as a sprite.
  strings: new Map(),
  // opts: color, scale, align ('left'|'center'|'right'), outline (color|null), shadow (color|null)
  draw(ctx, str, x, y, opts = {}) {
    str = this.normalize(str);
    const scale = opts.scale || 1;
    const color = opts.color || '#ffffff';
    const w = this.width(str, scale);
    if (opts.align === 'center') x -= Math.floor(w / 2);
    else if (opts.align === 'right') x -= w;
    x = Math.round(x); y = Math.round(y);
    if (scale === 1) {
      const a = this.bake(color, opts.outline, opts.shadow), idx = a.index;
      for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        if (chr === 32) continue;
        let gi = idx[str[i]];
        if (gi === undefined) gi = idx['?'];
        ctx.drawImage(a.c, gi * a.cw, 0, a.cw, a.ch, x + i * FONT_ADV - a.ox, y - a.oy, a.cw, a.ch);
      }
      return w;
    }
    const key = str + '|' + scale + '|' + (Array.isArray(color) ? color.join(',') : color) + '|' + (opts.outline || '') + '|' + (opts.shadow || '');
    let sp = this.strings.get(key);
    if (!sp) {
      const pad = 4 * scale;
      const c = makeCanvas(w + pad * 2, FONT_H * scale + pad * 2);
      this._render(c.ctx, str, pad, pad, scale, color, opts.outline, opts.shadow);
      sp = { c, pad };
      if (this.strings.size > 300) this.strings.clear();
      this.strings.set(key, sp);
    }
    ctx.drawImage(sp.c, x - sp.pad, y - sp.pad);
    return w;
  },
  _render(ctx, str, x, y, scale, color, outline, shadow) {
    if (outline) {
      const o = this.atlas(outline);
      const s = scale;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [1, 2], [0, 2], [-1, 2]]) this._run(ctx, o, str, x + dx * (s > 2 ? 2 : 1), y + dy * (s > 2 ? 2 : 1), scale);
    } else if (shadow) {
      this._run(ctx, this.atlas(shadow), str, x + scale, y + scale, scale);
    }
    this._run(ctx, this.atlas(color), str, x, y, scale);
  },
  _run(ctx, atlas, str, x, y, scale) {
    for (let i = 0; i < str.length; i++) {
      let ch = str[i];
      let gi = atlas.index[ch];
      if (gi === undefined) gi = atlas.index['?'];
      if (ch !== ' ') ctx.drawImage(atlas, gi * FONT_W, 0, FONT_W, FONT_H, x + i * FONT_ADV * scale, y, FONT_W * scale, FONT_H * scale);
    }
  }
};

// Gradient presets (7 rows)
const GRAD = {
  gold: ['#fff8c0', '#ffe878', '#ffd040', '#f8a820', '#e07818', '#c05010', '#902808'],
  fire: ['#ffffff', '#fff0a0', '#ffc840', '#ff8820', '#f04818', '#c02010', '#801008'],
  ice: ['#ffffff', '#d8f8ff', '#a8e8ff', '#70c8f8', '#4098e0', '#2868b8', '#183c80'],
  steel: ['#ffffff', '#e8eef8', '#c8d4e8', '#a0b0c8', '#8090b0', '#5c6888', '#3c4460'],
  green: ['#f0ffe0', '#c8f8a0', '#90e870', '#58c848', '#30a038', '#187828', '#0c5020'],
  red: ['#ffe0e0', '#ffa0a0', '#ff6060', '#f03838', '#c82020', '#981010', '#600808'],
  pink: ['#ffffff', '#ffd0f0', '#ffa0e0', '#f070c8', '#d048a8', '#a02880', '#701858'],
};
