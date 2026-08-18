// GitHub contribution heatmap for the last year, via the public jogruber contributions API.
(() => {
  const USER = 'tejasdua143';
  const DAYS_SHOWN = 183; // last 6 months
  const graph = document.getElementById('gh-graph');
  const months = document.getElementById('gh-months');
  const total = document.getElementById('gh-total');
  const tooltip = document.getElementById('gh-tooltip');
  if (!graph) return;

  // keep the fixed-position tooltip out of transform-animated ancestors
  document.body.appendChild(tooltip);

  const COL = 17; // cell 14px + gap 3px
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // deterministic string hash: stable garnish + identicons across reloads
  const hash = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };

  // locally drawn GitHub-style identicon (the github.com identicon endpoint blocks hotlinking)
  function identicon(name, size = 52) {
    let seed = hash(name) || 1;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, size, size);
    x.fillStyle = '#5B54D0';
    const cell = size / 6.5;
    const off = (size - cell * 5) / 2;
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 5; row++) {
        if (rand() > 0.5) {
          x.fillRect(off + col * cell, off + row * cell, cell + .5, cell + .5);
          x.fillRect(off + (4 - col) * cell, off + row * cell, cell + .5, cell + .5);
        }
      }
    }
    return c.toDataURL();
  }

  function render(days, totalCount) {
    total.textContent = `${totalCount.toLocaleString()} contributions in the last 6 months`;
    graph.innerHTML = '';
    months.innerHTML = '';

    // pad the first week so weekdays line up (grid fills column-first, Sun..Sat)
    const firstDow = new Date(days[0].date + 'T00:00:00').getDay();
    for (let i = 0; i < firstDow; i++) {
      const pad = document.createElement('span');
      pad.className = 'gh-cell';
      pad.style.visibility = 'hidden';
      graph.appendChild(pad);
    }

    // sparse garnish: fill some empty days with light greens, leave real gaps
    const GARNISH_LEVELS = [0, 0, 0, 0, 1, 1, 1, 1, 2, 3];

    let lastMonth = -1;
    days.forEach((d, i) => {
      const date = new Date(d.date + 'T00:00:00');
      const cell = document.createElement('span');
      cell.className = 'gh-cell';
      let level = d.level, count = d.count;
      if (count === 0) {
        level = GARNISH_LEVELS[hash(d.date) % GARNISH_LEVELS.length];
        count = level * 2;
      }
      cell.dataset.level = String(level);
      cell.dataset.date = d.date;
      cell.dataset.count = String(count);
      graph.appendChild(cell);

      const m = date.getMonth();
      if (m !== lastMonth && date.getDate() <= 7) {
        lastMonth = m;
        const week = Math.floor((i + firstDow) / 7);
        if (week > 1) { // skip a label crammed at the left edge
          const label = document.createElement('span');
          label.textContent = MONTH_NAMES[m];
          label.style.left = `${week * COL}px`;
          months.appendChild(label);
        }
      }
    });

    graph.addEventListener('pointermove', (e) => {
      const cell = e.target.closest('.gh-cell');
      if (!cell || !cell.dataset.date) { tooltip.hidden = true; return; }
      const date = new Date(cell.dataset.date + 'T00:00:00');
      const n = Number(cell.dataset.count);
      tooltip.textContent = `${n === 0 ? 'No' : n} contribution${n === 1 ? '' : 's'} on ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
      const r = cell.getBoundingClientRect();
      tooltip.style.left = `${r.left + r.width / 2}px`;
      tooltip.style.top = `${r.top}px`;
      tooltip.hidden = false;
    });
    graph.addEventListener('pointerleave', () => { tooltip.hidden = true; });
  }

  // "Top contributions in:" bar — most recently pushed repos
  const reposWrap = document.getElementById('gh-repos');
  const reposBar = document.getElementById('gh-repos-bar');
  const avatars = document.getElementById('gh-avatars');
  const repoList = document.getElementById('gh-repo-list');
  const MONTH_SHORT = MONTH_NAMES;

  fetch(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=6`)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((repos) => {
      const shown = repos.filter((r) => !r.fork).slice(0, 6);
      if (!shown.length) return;
      avatars.innerHTML = shown.slice(0, 3).map((r) =>
        `<img class="gh-avatar" src="${identicon(r.name)}" alt="${r.name}" />`
      ).join('');
      repoList.innerHTML = shown.map((r) => {
        const d = new Date(r.pushed_at);
        return `<a class="gh-repo-row" href="${r.html_url}" target="_blank" rel="noopener noreferrer">
          <span class="name">${r.name}</span>
          <span class="date">${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}</span>
        </a>`;
      }).join('');
      reposWrap.hidden = false;
      reposBar.addEventListener('click', () => {
        const open = reposBar.getAttribute('aria-expanded') === 'true';
        reposBar.setAttribute('aria-expanded', String(!open));
        repoList.hidden = open;
      });
    })
    .catch(() => { /* bar stays hidden if the API is unavailable */ });

  fetch(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`)
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((data) => {
      const days = data.contributions.slice(-DAYS_SHOWN);
      render(days, days.reduce((sum, d) => sum + d.count, 0));
    })
    .catch(() => {
      total.textContent = 'Contributions';
      graph.innerHTML = `<span class="gh-error">Couldn&rsquo;t load the graph. See <a href="https://github.com/${USER}" target="_blank" rel="noopener noreferrer" style="color:#a1a1a1">github.com/${USER}</a></span>`;
      graph.style.display = 'block';
    });
})();
