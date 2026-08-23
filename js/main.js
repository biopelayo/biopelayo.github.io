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
    docEl.setAttribute('lang', lang);
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
    if (typer) typer.setPhrases(TYPING_PHRASES[lang] || TYPING_PHRASES.en);
    else if (typingEl) typingEl.textContent = STATIC_LINE[lang] || STATIC_LINE.en;
    syncThemeBtn();
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
      if (navToggle) navToggle.checked = false;
    });
  });
  var toggleLabel = document.getElementById('nav-toggle-label');
  if (navToggle && toggleLabel) {
    navToggle.addEventListener('change', function () {
      toggleLabel.setAttribute('aria-expanded', navToggle.checked ? 'true' : 'false');
    });
    toggleLabel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navToggle.checked = !navToggle.checked;
        navToggle.dispatchEvent(new Event('change'));
      }
    });
  }

  /* ===== FOOTER YEAR ===== */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ===== GITHUB REPOS (live, with static fallback) ===== */
  var reposGrid = document.getElementById('repos-grid');
  var FALLBACK_REPOS = [
    { name: 'epiprofile-plants', html_url: 'https://github.com/biopelayo/epiprofile-plants', description: 'EpiProfile 2.0 extension for plant histone PTM quantification (MATLAB).', language: 'MATLAB' },
    { name: 'K-CHOPORE', html_url: 'https://github.com/biopelayo/K-CHOPORE', description: '9-stage Snakemake + Docker pipeline for nanopore direct RNA-seq.', language: 'Python' },
    { name: 'epiprofile-plants-workflow', html_url: 'https://github.com/biopelayo/epiprofile-plants-workflow', description: 'Snakemake + Docker workflow: PRIDE FTP, msconvert, MS1/MS2 extraction.', language: 'Python' },
    { name: 'epiprofile-dashboard', html_url: 'https://github.com/biopelayo/epiprofile-dashboard', description: 'Dash/Plotly dashboard with 7 analysis tabs for EpiProfile outputs.', language: 'Python' }
  ];
  function repoCard(r) {
    var a = document.createElement('a');
    a.className = 'repo-card';
    a.href = r.html_url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    var name = document.createElement('p');
    name.className = 'repo-name';
    name.textContent = r.name;
    var desc = document.createElement('p');
    desc.className = 'repo-desc';
    desc.textContent = r.description || '';
    var meta = document.createElement('p');
    meta.className = 'repo-meta';
    var parts = [];
    if (r.language) parts.push(r.language);
    if (typeof r.stargazers_count === 'number' && r.stargazers_count > 0) parts.push('★ ' + r.stargazers_count);
    meta.textContent = parts.join('   ');
    a.appendChild(name); a.appendChild(desc); a.appendChild(meta);
    return a;
  }
  function renderRepos(list) {
    if (!reposGrid) return;
    reposGrid.innerHTML = '';
    list.forEach(function (r) { reposGrid.appendChild(repoCard(r)); });
  }
  if (reposGrid) {
    fetch('https://api.github.com/users/biopelayo/repos?per_page=100&sort=pushed')
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (repos) {
        var own = repos.filter(function (r) { return !r.fork && !r.archived; });
        own.sort(function (a, b) {
          return (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at));
        });
        renderRepos(own.slice(0, 4));
      })
      .catch(function () { renderRepos(FALLBACK_REPOS); });
  }
})();
