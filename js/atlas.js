'use strict';
// ============================================================
// Sprite atlas: every sprite canvas is copied into a few big pages and
// drawImage() is redirected to them. On phone GPUs this turns ~100
// texture switches per frame into a handful of batched draws.
// Pixel output is identical (all blits are 1:1, no filtering).
// ============================================================

const Atlas = {
  PAGE: 1024, pages: [], cur: null, installed: false, packed: 0,

  // collect every sprite canvas reachable from SPR (and its flash/shadow variants)
  collect(root, out, seen) {
    if (!root || typeof root !== 'object' || seen.has(root)) return;
    seen.add(root);
    if (root instanceof HTMLCanvasElement) {
      if (root._at === undefined && root.width <= 512 && root.height <= 512) out.push(root);
      for (const k of ['flash', 'shadow', 'shadowS', 'shadowB']) if (root[k]) this.collect(root[k], out, seen);
      return;
    }
    if (Array.isArray(root)) { for (let i = 0; i < root.length; i++) this.collect(root[i], out, seen); return; }
    for (const k in root) { if (k === 'deco' || k === 'm7') continue; this.collect(root[k], out, seen); }
  },

  packAll() {
    const list = [];
    this.collect(SPR, list, new Set());
    if (!list.length) return 0;
    this.install();
    list.sort((a, b) => b.height - a.height || b.width - a.width);
    const P = this.PAGE, orig = this.origDraw;
    for (const c of list) {
      const w = c.width + 1, h = c.height + 1;
      let pg = this.cur;
      if (!pg || !this.place(pg, w, h)) {
        pg = this.cur = { cv: makeCanvas(P, P), x: 0, y: 0, rowH: 0 };
        this.pages.push(pg);
        this.place(pg, w, h);
      }
      orig.call(pg.cv.ctx, c, pg.px, pg.py);
      c._at = { cv: pg.cv, x: pg.px, y: pg.py };
    }
    this.packed += list.length;
    return list.length;
  },
  // simple shelf packer
  place(pg, w, h) {
    const P = this.PAGE;
    if (w > P || h > P) return false;
    if (pg.x + w > P) { pg.x = 0; pg.y += pg.rowH; pg.rowH = 0; }
    if (pg.y + h > P) return false;
    pg.px = pg.x; pg.py = pg.y;
    pg.x += w; if (h > pg.rowH) pg.rowH = h;
    return true;
  },

  install() {
    if (this.installed) return;
    this.installed = true;
    const proto = CanvasRenderingContext2D.prototype, orig = this.origDraw = proto.drawImage;
    proto.drawImage = function (img, a, b, c, d, e, f, g, h) {
      const at = img._at;
      if (at !== undefined) {
        const n = arguments.length;
        if (n === 3) return orig.call(this, at.cv, at.x, at.y, img.width, img.height, a, b, img.width, img.height);
        if (n === 5) return orig.call(this, at.cv, at.x, at.y, img.width, img.height, a, b, c, d);
        if (n === 9) return orig.call(this, at.cv, at.x + a, at.y + b, c, d, e, f, g, h);
      }
      return orig.apply(this, arguments);
    };
  },
};
