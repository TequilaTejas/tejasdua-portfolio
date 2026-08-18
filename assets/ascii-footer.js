// Footer: big text rendered as ASCII characters on canvas, tilting in 3D toward the cursor.
(() => {
  const canvas = document.getElementById('footer-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;

  const TEXT = 'Bye!!!';
  const CELL = 6;              // ascii sampling size (css px)
  const CHARS = ' .\'`^",:;Il!i~+_-?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
  const PERSPECTIVE = 900;

  let W = 0, H = 0, dpr = 1;
  let cells = [];              // {x, y, ch, r} sampled once per resize
  let mx = 0, my = 0;          // eased mouse in [-1, 1]
  let tx = 0, ty = 0;

  // radial gradient stops: #ff6188 -> #fc9867 -> #ffd866
  function color(r) {
    const stops = [[255, 97, 136], [252, 152, 103], [255, 216, 102]];
    const t = Math.min(1, r) * 2;
    const a = stops[Math.min(1, Math.floor(t))];
    const b = stops[Math.min(2, Math.floor(t) + 1)];
    const f = t - Math.floor(t);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }

  function sample() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d', { willReadFrequently: true });
    const fontSize = Math.min(180, W / (TEXT.length * 0.62));
    octx.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';
    octx.fillText(TEXT, W / 2, H / 2);
    const data = octx.getImageData(0, 0, W, H).data;

    cells = [];
    const maxR = Math.hypot(W / 2, H / 2);
    for (let y = 0; y < H; y += CELL) {
      for (let x = 0; x < W; x += CELL) {
        // average alpha over the cell
        let sum = 0, n = 0;
        for (let sy = 0; sy < CELL; sy += 2) {
          for (let sx = 0; sx < CELL; sx += 2) {
            const px = x + sx, py = y + sy;
            if (px >= W || py >= H) continue;
            sum += data[(py * W + px) * 4 + 3];
            n++;
          }
        }
        const a = n ? sum / (n * 255) : 0;
        if (a < 0.12) continue;
        const ch = CHARS[Math.min(CHARS.length - 1, Math.floor(a * (CHARS.length - 1)))];
        cells.push({ x: x - W / 2, y: y - H / 2, ch, r: Math.hypot(x - W / 2, y - H / 2) / maxR });
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = container.clientWidth;
    H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sample();
  }

  container.addEventListener('pointermove', (e) => {
    const b = container.getBoundingClientRect();
    tx = ((e.clientX - b.left) / b.width) * 2 - 1;
    ty = ((e.clientY - b.top) / b.height) * 2 - 1;
  });
  container.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  let t = 0;
  function frame() {
    t += 0.016;
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;

    const ry = mx * 0.45;   // yaw toward cursor
    const rx = -my * 0.35;  // pitch toward cursor
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosX = Math.cos(rx), sinX = Math.sin(rx);

    ctx.clearRect(0, 0, W, H);
    ctx.font = `500 ${CELL + 2}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const c of cells) {
      const wave = Math.sin(t * 1.4 + c.x * 0.012) * 3;
      // rotate (x, y, 0) around Y then X, project with perspective
      let x = c.x, y = c.y + wave, z = 0;
      let x1 = x * cosY, z1 = -x * sinY;
      let y1 = y * cosX - z1 * sinX;
      let z2 = y * sinX + z1 * cosX;
      const s = PERSPECTIVE / (PERSPECTIVE - z2);
      ctx.fillStyle = color(c.r);
      ctx.fillText(c.ch, W / 2 + x1 * s, H / 2 + y1 * s);
    }
    requestAnimationFrame(frame);
  }

  // re-sample once the mono font is actually loaded
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
