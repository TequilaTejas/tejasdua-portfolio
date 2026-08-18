/* Deck Theatre - a full-screen slide viewer driven by scroll, keys or taps.

   The deck is a set of pre-exported 16:9 images. Only the current slide and
   its immediate neighbours are ever in the DOM as loaded images, so a 30-slide
   deck costs about three image decodes instead of thirty. */
(function (global) {
  'use strict';

  function Deck(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.count = this.opts.count || 0;
    this.index = 0;
    this.reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.stage = root.querySelector('.deck-stage');
    this.counter = root.querySelector('.js-deck-counter');
    this.rail = root.querySelector('.js-deck-rail');
    this.prevBtn = root.querySelector('.js-deck-prev');
    this.nextBtn = root.querySelector('.js-deck-next');

    if (!this.stage || !this.count) return;

    this.slides = [];
    this.build();
    this.bind();

    this.go(this.fromHash(), true);
  }

  Deck.prototype.src = function (i) {
    var n = i + 1;
    return this.opts.dir + (n < 10 ? '0' + n : n) + '.' + (this.opts.ext || 'webp');
  };

  Deck.prototype.build = function () {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < this.count; i++) {
      var fig = document.createElement('figure');
      fig.className = 'deck-slide';
      fig.setAttribute('aria-hidden', 'true');

      var img = document.createElement('img');
      img.width = this.opts.width || 2560;
      img.height = this.opts.height || 1440;
      img.alt = '';
      img.decoding = 'async';
      fig.appendChild(img);

      frag.appendChild(fig);
      this.slides.push({ fig: fig, img: img, loaded: false });
    }
    this.stage.appendChild(frag);

    if (this.rail) {
      var rfrag = document.createDocumentFragment();
      for (var j = 0; j < this.count; j++) {
        var tick = document.createElement('button');
        tick.className = 'deck-tick';
        tick.type = 'button';
        tick.dataset.index = j;
        tick.setAttribute('aria-label', 'Slide ' + (j + 1));
        rfrag.appendChild(tick);
      }
      this.rail.appendChild(rfrag);
    }
  };

  /* Load the target slide plus one either side. Anything further out is left
     unset so the browser never fetches it. */
  Deck.prototype.hydrate = function (center) {
    for (var i = Math.max(0, center - 1); i <= Math.min(this.count - 1, center + 1); i++) {
      var s = this.slides[i];
      if (!s.loaded) {
        s.img.src = this.src(i);
        s.loaded = true;
      }
    }
  };

  Deck.prototype.go = function (next, immediate) {
    next = Math.max(0, Math.min(this.count - 1, next));
    var prev = this.index;
    this.index = next;

    this.hydrate(next);

    for (var i = 0; i < this.count; i++) {
      var s = this.slides[i];
      var on = i === next;
      s.fig.classList.toggle('is-current', on);
      s.fig.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (immediate) s.fig.classList.add('is-instant');
    }

    if (immediate) {
      var self = this;
      /* Drop the no-transition flag on the next frame so the first paint does
         not animate in from nothing, but every later move does. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          self.slides.forEach(function (s) { s.fig.classList.remove('is-instant'); });
        });
      });
    }

    if (this.counter) this.counter.textContent = (next + 1) + ' / ' + this.count;
    if (this.rail) {
      var ticks = this.rail.children;
      for (var t = 0; t < ticks.length; t++) {
        ticks[t].classList.toggle('is-on', t === next);
        ticks[t].classList.toggle('is-seen', t < next);
      }
    }
    if (this.prevBtn) this.prevBtn.disabled = next === 0;
    if (this.nextBtn) this.nextBtn.disabled = next === this.count - 1;

    if (next !== prev || immediate) {
      var hash = '#' + (next + 1);
      if (global.location.hash !== hash) {
        history.replaceState(null, '', hash);
      }
    }

    /* Once someone has moved, they know how to move. */
    if (prev !== next) this.root.classList.add('has-moved');
  };

  Deck.prototype.next = function () { this.go(this.index + 1); };
  Deck.prototype.prev = function () { this.go(this.index - 1); };

  Deck.prototype.fromHash = function () {
    var n = parseInt((global.location.hash || '').replace('#', ''), 10);
    return isNaN(n) ? 0 : n - 1;
  };

  /* The chrome answers to the mouse only. Someone paging through on the
     keyboard has already found the controls and does not need them sitting on
     top of the slide, so keys put it away and the next mouse move brings it
     back. */
  Deck.prototype.wake = function () {
    var self = this;
    this.root.classList.remove('is-idle');
    clearTimeout(this._idle);
    this._idle = setTimeout(function () {
      self.root.classList.add('is-idle');
    }, 2000);
  };

  Deck.prototype.sleep = function () {
    clearTimeout(this._idle);
    this.root.classList.add('is-idle');
  };

  Deck.prototype.bind = function () {
    var self = this;

    /* One gesture should equal one slide. Trackpads emit a long tail of
       decaying deltas after a flick, so ignore everything until the wheel has
       been quiet, and require a real push rather than drift. */
    var locked = false, quiet = null;
    this.root.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.wake();

      var d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

      clearTimeout(quiet);
      quiet = setTimeout(function () { locked = false; }, 140);

      if (locked || Math.abs(d) < 12) return;
      locked = true;
      if (d > 0) self.next(); else self.prev();
    }, { passive: false });

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var handled = true;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': self.next(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': self.prev(); break;
        case 'Home': self.go(0); break;
        case 'End': self.go(self.count - 1); break;
        case 'Escape': global.location.href = self.opts.exit || 'index.html'; break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); self.sleep(); }
    });

    if (this.prevBtn) this.prevBtn.addEventListener('click', function () { self.prev(); });
    if (this.nextBtn) this.nextBtn.addEventListener('click', function () { self.next(); });

    if (this.rail) {
      this.rail.addEventListener('click', function (e) {
        var tick = e.target.closest('.deck-tick');
        if (tick) self.go(parseInt(tick.dataset.index, 10));
      });
    }

    /* Swipe on touch, and a plain tap on either half of the screen. */
    var startX = 0, startY = 0, startT = 0;
    this.stage.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = e.timeStamp;
      self.wake();
    }, { passive: true });

    this.stage.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      var quick = e.timeStamp - startT < 500;

      if (quick && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) self.next(); else self.prev();
        return;
      }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (e.changedTouches[0].clientX > global.innerWidth / 2) self.next();
        else self.prev();
      }
    }, { passive: true });

    global.addEventListener('hashchange', function () {
      var n = self.fromHash();
      if (n !== self.index) self.go(n);
    });

    /* pointermove fires only on genuine movement, so this will not fight the
       keyboard: the chrome stays hidden until the mouse actually moves. */
    ['pointermove', 'pointerdown'].forEach(function (evt) {
      global.addEventListener(evt, function (e) {
        if (e.pointerType === 'touch') return;
        self.wake();
      }, { passive: true });
    });
  };

  global.Deck = Deck;
})(window);
