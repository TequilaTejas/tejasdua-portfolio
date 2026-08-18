/* Mesh gradient renderer.
   Takes a zoxilsi-studio doc (rows x cols of colored nodes with jittered
   positions) and paints it into a canvas, blending in Oklab so the ramp
   between mint and navy stays clean instead of going muddy through sRGB. */
(function (global) {
  'use strict';

  function srgbToLinear(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb(c) {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }

  function hexToOklab(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = srgbToLinear(((n >> 16) & 255) / 255);
    var g = srgbToLinear(((n >> 8) & 255) / 255);
    var b = srgbToLinear((n & 255) / 255);

    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
  }

  function oklabToRgb(L, A, B, out, i) {
    var l_ = L + 0.3963377774 * A + 0.2158037573 * B;
    var m_ = L - 0.1055613458 * A - 0.0638541728 * B;
    var s_ = L - 0.0894841775 * A - 1.2914855480 * B;

    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

    var r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    var b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    out[i] = Math.max(0, Math.min(255, linearToSrgb(r) * 255 + 0.5)) | 0;
    out[i + 1] = Math.max(0, Math.min(255, linearToSrgb(g) * 255 + 0.5)) | 0;
    out[i + 2] = Math.max(0, Math.min(255, linearToSrgb(b) * 255 + 0.5)) | 0;
    out[i + 3] = 255;
  }

  function MeshGradient(canvas, doc, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.doc = doc;
    this.opts = opts || {};
    /* Nodes sit on a rough grid, so a gaussian falloff a little wider than the
       column spacing gives smooth blending without blobbing at each node. */
    this.sigma = this.opts.sigma || 0.13;
    this.res = this.opts.res || 200;
    this.glow = (doc.effects && doc.effects.glow) || 0;

    this.nodes = doc.nodes.map(function (n) {
      var lab = hexToOklab(n.color);
      return { x: n.position.x, y: n.position.y, L: lab[0], a: lab[1], b: lab[2] };
    });

    this.buffer = document.createElement('canvas');
    this.bctx = this.buffer.getContext('2d');
  }

  MeshGradient.prototype.render = function () {
    var canvas = this.canvas;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    /* Paint the mesh small, then upscale. The field is smooth enough that the
       interpolation on the way up is free anti-aliasing. */
    var w = this.res;
    var h = Math.max(2, Math.round(this.res * (rect.height / rect.width)));
    this.buffer.width = w;
    this.buffer.height = h;

    var img = this.bctx.createImageData(w, h);
    var data = img.data;
    var nodes = this.nodes;
    var count = nodes.length;
    var denom = 2 * this.sigma * this.sigma;
    var glow = this.glow;

    for (var py = 0; py < h; py++) {
      var v = (py + 0.5) / h;
      for (var px = 0; px < w; px++) {
        var u = (px + 0.5) / w;
        var wsum = 0, L = 0, A = 0, B = 0;

        for (var i = 0; i < count; i++) {
          var n = nodes[i];
          var dx = u - n.x, dy = v - n.y;
          var wt = Math.exp(-(dx * dx + dy * dy) / denom);
          wsum += wt;
          L += n.L * wt;
          A += n.a * wt;
          B += n.b * wt;
        }

        if (wsum > 0) { L /= wsum; A /= wsum; B /= wsum; }
        if (glow) L += glow * 0.1 * L * L;

        oklabToRgb(L, A, B, data, (py * w + px) * 4);
      }
    }

    this.bctx.putImageData(img, 0, 0);

    var ctx = this.ctx;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.buffer, 0, 0, canvas.width, canvas.height);
  };

  MeshGradient.prototype.observeResize = function () {
    var self = this, frame = null, lastW = 0, lastH = 0;

    var repaint = function () {
      var r = self.canvas.getBoundingClientRect();
      /* Mobile browsers fire resize on every URL-bar nudge, and a webfont
         swap can reflow a content-sized host by a fraction of a pixel.
         Only repaint when the box actually moves. */
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
      lastW = r.width;
      lastH = r.height;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () { self.render(); });
    };

    /* ResizeObserver fires once on observe, which also covers the case where
       the host had no height yet when render() was first called. */
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(repaint).observe(this.canvas);
    } else {
      global.addEventListener('resize', repaint);
      global.addEventListener('load', repaint);
    }
  };

  global.MeshGradient = MeshGradient;
})(window);
