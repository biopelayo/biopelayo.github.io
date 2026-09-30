/* biopelayo.github.io v2 — interactions.
   Theme toggle, EN/ES i18n, typing line, scroll behaviors, lightbox, GitHub repos. */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var docEl = document.documentElement;

  /* ===== THEME ===== */
  var themeBtn = document.getElementById('theme-btn');
  var themeLabels = {
    en: { toLight: 'Switch to light theme', toDark: 'Switch to dark theme' },
    es: { toLight: 'Cambiar a tema claro', toDark: 'Cambiar a tema oscuro' }
  };
  function currentLang() { return docEl.getAttribute('lang') === 'es' ? 'es' : 'en'; }
  var liRefresh = null; /* set by the LinkedIn module; re-labels cards on language switch */
  function syncThemeBtn() {
    if (!themeBtn) return;
    var dark = docEl.getAttribute('data-theme') !== 'light';
    var l = themeLabels[currentLang()];
    themeBtn.setAttribute('aria-label', dark ? l.toLight : l.toDark);
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = docEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      docEl.setAttribute('data-theme', next);
      try { localStorage.setItem('pela-theme', next); } catch (e) {}
      syncThemeBtn();
    });
  }

  /* ===== TYPING LINE ===== */
  var TYPING_PHRASES = {
    en: [
      'PhD Candidate at UNIOVI',
      'Computational Biologist',
      'Plant Epigenomics Researcher',
      'Building Reproducible Pipelines'
    ],
    es: [
      'Doctorando en la UNIOVI',
      'Biólogo computacional',
      'Investigador en epigenómica vegetal',
      'Construyendo pipelines reproducibles'
    ]
  };
  var STATIC_LINE = {
    en: 'PhD Candidate · Computational Biologist · Plant Epigenomics',
    es: 'Doctorando · Biólogo computacional · Epigenómica vegetal'
  };

  function TypeWriter(el) {
    this.el = el;
    this.phrases = TYPING_PHRASES.en;
    this.typeSpeed = 70;
    this.deleteSpeed = 35;
    this.pauseTime = 2200;
    this.phraseIdx = 0;
    this.charIdx = 0;
    this.isDeleting = false;
    this.timer = null;
    this.tick();
  }
  TypeWriter.prototype.setPhrases = function (phrases) {
    this.phrases = phrases;
    this.phraseIdx = 0;
    this.charIdx = 0;
    this.isDeleting = false;
  };
  TypeWriter.prototype.tick = function () {
    var current = this.phrases[this.phraseIdx];
    this.charIdx += this.isDeleting ? -1 : 1;
    this.el.textContent = current.substring(0, this.charIdx);
    var delay = this.isDeleting ? this.deleteSpeed : this.typeSpeed;
    if (!this.isDeleting && this.charIdx === current.length) {
      delay = this.pauseTime;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIdx <= 0) {
      this.isDeleting = false;
      this.phraseIdx = (this.phraseIdx + 1) % this.phrases.length;
      delay = 400;
    }
    var self = this;
    this.timer = setTimeout(function () { self.tick(); }, delay);
  };

  var typingEl = document.getElementById('typing-target');
  var typer = null;
  if (typingEl) {
    if (prefersReducedMotion) {
      typingEl.textContent = STATIC_LINE[currentLang()];
    } else {
      typer = new TypeWriter(typingEl);
    }
  }

  /* ===== I18N (EN base in HTML, ES via dictionary) ===== */
  var enCache = new Map();
  function cacheEnglish() {
    document.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(function (el) {
      if (enCache.has(el)) return;
      var isHtml = el.hasAttribute('data-i18n-html');
      enCache.set(el, isHtml ? el.innerHTML : el.textContent);
    });
  }
  function applyLang(lang, persist) {
    cacheEnglish();
    var dict = (lang === 'es' && window.I18N_ES) ? window.I18N_ES : null;
    document.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(function (el) {
      var isHtml = el.hasAttribute('data-i18n-html');
      var key = el.getAttribute(isHtml ? 'data-i18n-html' : 'data-i18n');
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
        if (isHtml) el.innerHTML = dict[key]; else el.textContent = dict[key];
      } else {
        var original = enCache.get(el);
        if (original !== undefined) {
          if (isHtml) el.innerHTML = original; else el.textContent = original;
        }
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (!enCache.has(el)) enCache.set(el, el.getAttribute('aria-label') || '');
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) el.setAttribute('aria-label', dict[key]);
      else el.setAttribute('aria-label', enCache.get(el));
    });
    docEl.setAttribute('lang', lang);
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    if (typer) typer.setPhrases(TYPING_PHRASES[lang] || TYPING_PHRASES.en);
    else if (typingEl) typingEl.textContent = STATIC_LINE[lang] || STATIC_LINE.en;
    syncThemeBtn();
    if (liRefresh) liRefresh(lang);
    if (persist) { try { localStorage.setItem('pela-lang', lang); } catch (e) {} }
  }
  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyLang(btn.getAttribute('data-lang'), true); });
  });
  if (currentLang() === 'es') applyLang('es', false); else syncThemeBtn();

  /* ===== SCROLL FADE-IN (hero + section titles only) ===== */
  var fadeEls = [];
  var heroInner = document.querySelector('.hero-inner');
  if (heroInner) fadeEls.push(heroInner);
  document.querySelectorAll('.section-title').forEach(function (el) { fadeEls.push(el); });
  fadeEls.forEach(function (el) { el.classList.add('fade-in'); });
  if (prefersReducedMotion) {
    fadeEls.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });
    fadeEls.forEach(function (el) { fadeObserver.observe(el); });
  }

  /* ===== NAV ACTIVE HIGHLIGHT ===== */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.sidenav-links a');
  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0, rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(function (s) { navObserver.observe(s); });

  /* ===== SMOOTH SCROLL + CLOSE MOBILE DRAWER ===== */
  var navToggle = document.getElementById('nav-toggle');
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      if (history.pushState) history.pushState(null, '', targetId);
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (navToggle) { navToggle.checked = false; syncToggle(); }
    });
  });
  var toggleLabel = document.getElementById('nav-toggle-label');
  function syncToggle() {
    if (toggleLabel && navToggle) toggleLabel.setAttribute('aria-expanded', navToggle.checked ? 'true' : 'false');
  }
  if (navToggle && toggleLabel) {
    toggleLabel.addEventListener('click', function () {
      navToggle.checked = !navToggle.checked;
      syncToggle();
      if (navToggle.checked) {
        var first = document.querySelector('.sidenav-links a');
        if (first) first.focus();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.checked) {
        navToggle.checked = false;
        syncToggle();
        toggleLabel.focus();
      }
    });
  }

  /* ===== FOOTER YEAR ===== */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ===== MANUSCRIPTS Y REPORTS (data/*.json, curados a mano) =====
     Misma mecanica que el carrusel: si el JSON no trae entradas, la seccion se
     queda oculta y no aparece un hueco vacio en la pagina. */
  var TARJETA_LABELS = {
    en: {preprint: 'Preprint', review: 'Under review', published: 'Published',
         audit: 'Audit', benchmark: 'Benchmark', validation: 'Validation',
         technical: 'Technical report', doi: 'DOI', open: 'Open'},
    es: {preprint: 'Preprint', review: 'En revisión', published: 'Publicado',
         audit: 'Auditoría', benchmark: 'Benchmark', validation: 'Validación',
         technical: 'Informe técnico', doi: 'DOI', open: 'Abrir'}
  };
  function etiqueta(clave, lang) {
    var l = TARJETA_LABELS[lang] || TARJETA_LABELS.en;
    return l[clave] || clave;
  }

  function tarjeta(item) {
    var lang = currentLang();
    var art = document.createElement('article');
    art.className = 'info-card';

    var head = document.createElement('div');
    head.className = 'info-card-head';
    var tipo = item.status || item.kind;
    if (tipo) {
      var badge = document.createElement('span');
      badge.className = 'info-badge';
      badge.setAttribute('data-kind', tipo);
      badge.textContent = etiqueta(tipo, lang);
      head.appendChild(badge);
    }
    if (item.date || item.year) {
      var d = document.createElement('span');
      d.className = 'info-date mono';
      d.textContent = item.date || item.year;
      head.appendChild(d);
    }
    art.appendChild(head);

    var h3 = document.createElement('h3');
    h3.className = 'info-title';
    h3.textContent = item.title || '';
    art.appendChild(h3);

    if (item.authors || item.venue) {
      var meta = document.createElement('p');
      meta.className = 'info-meta';
      meta.textContent = [item.authors, item.venue].filter(Boolean).join(' · ');
      art.appendChild(meta);
    }
    if (item.summary) {
      var s = document.createElement('p');
      s.className = 'info-summary';
      s.textContent = item.summary;
      art.appendChild(s);
    }

    var enlaces = document.createElement('p');
    enlaces.className = 'link-row';
    if (item.doi) {
      var a = document.createElement('a');
      a.href = item.doi.indexOf('http') === 0 ? item.doi : 'https://doi.org/' + item.doi;
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = etiqueta('doi', lang) + ' ' + item.doi.replace(/^https?:\/\/doi\.org\//, '');
      enlaces.appendChild(a);
    }
    if (item.url) {
      var b2 = document.createElement('a');
      b2.href = item.url; b2.target = '_blank'; b2.rel = 'noopener noreferrer';
      b2.textContent = item.linkText || etiqueta('open', lang);
      enlaces.appendChild(b2);
    }
    if (enlaces.childNodes.length) art.appendChild(enlaces);
    return art;
  }

  function cargaTarjetas(fichero, idSeccion, idGrid) {
    var sec = document.getElementById(idSeccion);
    var grid = document.getElementById(idGrid);
    if (!sec || !grid) return;
    fetch(fichero)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var items = (data && data.items) || [];
        if (!items.length) return;          /* sin datos, sigue oculta */
        grid.innerHTML = '';
        items.forEach(function (it) { grid.appendChild(tarjeta(it)); });
        sec.hidden = false;
      })
      .catch(function () { /* sin fichero: la seccion se queda oculta */ });
  }
  cargaTarjetas('data/manuscripts.json', 'manuscripts', 'ms-grid');
  cargaTarjetas('data/reports.json', 'reports', 'rp-grid');

  /* ===== LINKEDIN CAROUSEL (data/linkedin.json, curated by hand) ===== */
  var LI_LABELS = {
    en: { post: 'Post', repost: 'Repost', comment: 'Comment', like: 'Like', follow: 'Follow', view: 'View on LinkedIn', source: 'Read the source' },
    es: { post: 'Publicación', repost: 'Compartido', comment: 'Comentario', like: 'Me gusta', follow: 'Seguimiento', view: 'Ver en LinkedIn', source: 'Ver la fuente' }
  };
  function liLabel(type, lang) {
    var l = LI_LABELS[lang] || LI_LABELS.en;
    return l[type] || l.post;
  }
  var liSection = document.getElementById('linkedin');
  var liTrack = document.getElementById('li-track');
  if (liSection && liTrack) {
    fetch('data/linkedin.json')
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) {
        var items = (data && data.items) || [];
        if (!items.length) return;
        renderLinkedIn(items);
      })
      .catch(function () { /* no data yet: section stays hidden */ });
  }
  function renderLinkedIn(items) {
    liTrack.innerHTML = '';
    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'li-card';

      var head = document.createElement('div');
      head.className = 'li-card-head';
      var badge = document.createElement('span');
      badge.className = 'li-badge';
      badge.setAttribute('data-li-type', item.type || 'post');
      badge.textContent = liLabel(item.type, currentLang());
      var date = document.createElement('span');
      date.className = 'li-date';
      date.textContent = item.date || '';
      head.appendChild(badge); head.appendChild(date);
      card.appendChild(head);

      if (item.text) {
        var text = document.createElement('p');
        text.className = 'li-text';
        text.textContent = item.text;
        card.appendChild(text);
      }
      if (item.author) {
        var author = document.createElement('p');
        author.className = 'li-author';
        author.textContent = item.author;
        card.appendChild(author);
      }
      var link = document.createElement('a');
      link.className = 'li-link';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      var linkKey = item.url.indexOf('linkedin.com') !== -1 ? 'view' : 'source';
      link.setAttribute('data-li-view', linkKey);
      link.textContent = liLabel(linkKey, currentLang()) + ' →';
      card.appendChild(link);

      liTrack.appendChild(card);
    });

    liSection.hidden = false;
    var navLi = document.getElementById('nav-linkedin');
    if (navLi) navLi.hidden = false;

    /* Hero teaser: newest item */
    var teaser = document.getElementById('hero-linkedin');
    var teaserText = document.getElementById('hero-linkedin-text');
    if (teaser && teaserText && items[0] && items[0].text) {
      var t = items[0].text;
      teaserText.textContent = '“' + (t.length > 90 ? t.slice(0, 90).trimEnd() + '…' : t) + '”';
      teaser.hidden = false;
    }

    /* Arrows + counter */
    var prev = document.getElementById('li-prev');
    var next = document.getElementById('li-next');
    var count = document.getElementById('li-count');
    function cardStep() {
      var card = liTrack.querySelector('.li-card');
      return card ? card.getBoundingClientRect().width + 16 : 320;
    }
    function updateCount() {
      if (!count) return;
      var idx = Math.min(items.length, Math.round(liTrack.scrollLeft / cardStep()) + 1);
      count.textContent = idx + ' / ' + items.length;
    }
    var many = items.length > 1;
    if (prev) { prev.hidden = !many; prev.addEventListener('click', function () { liTrack.scrollBy({ left: -cardStep(), behavior: 'smooth' }); }); }
    if (next) { next.hidden = !many; next.addEventListener('click', function () { liTrack.scrollBy({ left: cardStep(), behavior: 'smooth' }); }); }
    if (count) count.hidden = !many;
    liTrack.addEventListener('scroll', updateCount, { passive: true });
    updateCount();

    /* Gentle auto-advance, paused on interaction, off under reduced motion */
    if (!prefersReducedMotion && items.length > 1) {
      var liPaused = false;
      liSection.addEventListener('mouseenter', function () { liPaused = true; });
      liSection.addEventListener('mouseleave', function () { liPaused = false; });
      liSection.addEventListener('focusin', function () { liPaused = true; });
      liSection.addEventListener('focusout', function () { liPaused = false; });
      setInterval(function () {
        if (liPaused || document.hidden) return;
        var atEnd = liTrack.scrollLeft + liTrack.clientWidth >= liTrack.scrollWidth - 8;
        if (atEnd) liTrack.scrollTo({ left: 0, behavior: 'smooth' });
        else liTrack.scrollBy({ left: cardStep(), behavior: 'smooth' });
      }, 6000);
    }

    liRefresh = function (lang) {
      liTrack.querySelectorAll('.li-badge').forEach(function (b) {
        b.textContent = liLabel(b.getAttribute('data-li-type'), lang);
      });
      liTrack.querySelectorAll('[data-li-view]').forEach(function (a) {
        a.textContent = liLabel(a.getAttribute('data-li-view'), lang) + ' →';
      });
    };
  }
})();
