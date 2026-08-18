// Entrance animations, Design Engineer toggle, tab-title easter egg, iframe scaling.
(() => {
  requestAnimationFrame(() => document.body.classList.add('loaded'));

  // tab-title easter egg
  let prevTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { prevTitle = document.title; document.title = 'miss me already?'; }
    else document.title = prevTitle;
  });

  // scale 1280x800 iframes down to their card width
  function scaleIframes() {
    document.querySelectorAll('.demo-card iframe, .screen-frame iframe').forEach((f) => {
      const w = f.parentElement.clientWidth;
      if (w > 0) f.style.transform = `scale(${w / 1280})`;
    });
  }
  addEventListener('resize', scaleIframes);

  // Design Engineer mode
  const sw = document.getElementById('engineer-switch');
  const designer = document.getElementById('designer-view');
  const engineer = document.getElementById('engineer-view');
  if (!sw) return;

  // deep link: /#engineer opens in Design Engineer mode
  if (location.hash === '#engineer') {
    sw.setAttribute('aria-checked', 'true');
    designer.hidden = true;
    engineer.hidden = false;
    requestAnimationFrame(scaleIframes);
  }

  let swapping = false;
  sw.addEventListener('click', () => {
    if (swapping) return;
    swapping = true;
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    const from = on ? designer : engineer;
    const to = on ? engineer : designer;

    from.classList.remove('view-enter');
    from.classList.add('view-exit');
    setTimeout(() => {
      from.hidden = true;
      from.classList.remove('view-exit');
      to.hidden = false;
      to.classList.add('view-enter');
      scaleIframes();
      setTimeout(() => { to.classList.remove('view-enter'); swapping = false; }, 450);
    }, 250);
  });
})();
