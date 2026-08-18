// Full-page ASCII fluid background: characters bloom and swirl along the cursor trail.
(() => {
  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CELL = 14;
  const CHARS = ' ·:;+=xX#@';
  const DECAY = 0.955;
  const DIFFUSE = 0.09;

  let cols = 0, rows = 0, dpr = 1;
  let field = new Float32Array(0);
  let next = new Float32Array(0);
  let vx = new Float32Array(0);
  let vy = new Float32Array(0);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cols = Math.ceil(innerWidth / CELL);
    rows = Math.ceil(innerHeight / CELL);
    field = new Float32Array(cols * rows);
    next = new Float32Array(cols * rows);
    vx = new Float32Array(cols * rows);
    vy = new Float32Array(cols * rows);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${CELL - 2}px "Geist Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  let lastX = -1, lastY = -1;
  function inject(x, y, mx, my) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
        const d2 = dx * dx + dy * dy;
        const i = gy * cols + gx;
        field[i] = Math.min(1, field[i] + Math.exp(-d2 * 0.55) * 0.9);
        vx[i] += mx * 0.02;
        vy[i] += my * 0.02;
      }
    }
  }

  addEventListener('pointermove', (e) => {
    const mx = lastX < 0 ? 0 : e.clientX - lastX;
    const my = lastY < 0 ? 0 : e.clientY - lastY;
    // interpolate along fast strokes so the trail stays continuous
    const steps = Math.max(1, Math.floor(Math.hypot(mx, my) / (CELL * 0.7)));
    for (let s = 0; s < steps; s++) {
      const t = (s + 1) / steps;
      inject(lastX + mx * t, lastY + my * t, mx / steps, my / steps);
    }
    lastX = e.clientX; lastY = e.clientY;
  }, { passive: true });

  let t = 0;
  function frame() {
    t += 0.016;
    // diffuse + advect-ish smear along stored velocity, then decay
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const l = x > 0 ? field[i - 1] : 0;
        const r = x < cols - 1 ? field[i + 1] : 0;
        const u = y > 0 ? field[i - cols] : 0;
        const d = y < rows - 1 ? field[i + cols] : 0;
        let v = field[i] + (l + r + u + d - 4 * field[i]) * DIFFUSE;
        // push value downstream
        const sx = x - Math.round(vx[i]), sy = y - Math.round(vy[i]);
        if (sx >= 0 && sy >= 0 && sx < cols && sy < rows && (sx !== x || sy !== y)) {
          v = Math.max(v, field[sy * cols + sx] * 0.92);
        }
        next[i] = v * DECAY;
        vx[i] *= 0.9; vy[i] *= 0.9;
      }
    }
    [field, next] = [next, field];

    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = field[y * cols + x];
        if (v < 0.03) continue;
        const wobble = Math.sin(t * 2 + x * 0.7 + y * 1.3) * 0.5 + 0.5;
        const idx = Math.min(CHARS.length - 1, Math.floor((v * 0.85 + wobble * v * 0.15) * (CHARS.length - 1)));
        if (idx === 0) continue;
        ctx.fillStyle = `rgba(120,120,120,${Math.min(0.45, v * 0.5)})`;
        ctx.fillText(CHARS[idx], x * CELL + CELL / 2, y * CELL + CELL / 2);
      }
    }
    requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
