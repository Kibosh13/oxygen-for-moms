/* oxygen for moms — interactions (vanilla JS, без зависимостей кроме Lenis на десктопе) */
(function () {
  'use strict';

  var doc = document, body = doc.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- 1. Прелоадер → старт анимаций ---------- */
  var started = false;
  function start() {
    if (started) return; started = true;
    body.classList.remove('is-loading');
    setTimeout(function () { body.classList.add('is-ready'); }, reduce ? 0 : 350);
  }
  if (reduce) start();
  else {
    var t0 = Date.now();
    var go = function () { setTimeout(start, Math.max(0, 1300 - (Date.now() - t0))); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go);
    setTimeout(start, 3000); // страховка на медленном интернете
  }

  /* ---------- 2. Плавный скролл (только десктоп с мышью) ---------- */
  var lenis = null;
  function initLenis() {
    if (reduce || !fine || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.08, wheelMultiplier: 0.95 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    lenis.on('scroll', onScroll);
  }
  if (doc.readyState === 'complete') initLenis(); else window.addEventListener('load', initLenis);

  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.8 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id.length > 1 ? $(id) : $('#top');
      if (!el) return;
      e.preventDefault();
      if (body.classList.contains('menu-open')) toggleMenu(false);
      scrollToEl(el);
    });
  });

  /* ---------- 3. Мобильное меню ---------- */
  var burger = $('[data-burger]'), menu = $('[data-menu]');
  function toggleMenu(open) {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  if (burger) burger.addEventListener('click', function () { toggleMenu(!body.classList.contains('menu-open')); });

  /* ---------- 4. Появление при скролле ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    // небольшая лесенка для соседних элементов
    $$('[data-reveal]').forEach(function (el) {
      var sib = el.parentNode ? $$(':scope > [data-reveal]', el.parentNode) : [];
      var i = sib.indexOf(el);
      if (i > 0 && !el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
      io.observe(el);
    });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 5. Текст «проявляется» по мере чтения ---------- */
  var scrub = $('[data-scrub]'), words = [];
  if (scrub && !reduce) {
    var html = scrub.innerHTML.replace(/&nbsp;/g, ' ');
    var tmp = doc.createElement('div'); tmp.innerHTML = html;
    var text = tmp.textContent;
    scrub.setAttribute('aria-label', text);
    scrub.innerHTML = text.split(' ').map(function (w) { return '<span class="w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    words = $$('.w', scrub);
  } else if (scrub) { scrub.classList.add('no-scrub'); }

  /* ---------- 6. Скролл: шапка, параллакс, липкая кнопка ---------- */
  var nav = $('[data-nav]'), hero = $('.hero'), sticky = $('.sticky-cta'), waitlist = $('#waitlist');
  var speeds = $$('[data-speed]');
  var lastY = 0, ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset, vh = window.innerHeight;
    var heroH = hero ? hero.offsetHeight : vh;

    // шапка
    nav.classList.toggle('is-solid', y > heroH - 80);
    nav.classList.toggle('is-hidden', y > heroH && y > lastY + 4 && !body.classList.contains('menu-open'));
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;

    if (!reduce) {
      // параллакс: только элементы в кадре
      var k = desktop.matches ? 1 : 0.5;
      for (var i = 0; i < speeds.length; i++) {
        var el = speeds[i], r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) continue;
        var center = r.top + r.height / 2 - vh / 2;
        el.style.setProperty('--sy', (-center * parseFloat(el.dataset.speed) * k).toFixed(1) + 'px');
      }
      // проявление текста
      if (words.length) {
        var sr = scrub.getBoundingClientRect();
        if (sr.top < vh && sr.bottom > 0) {
          var p = (vh * 0.85 - sr.top) / (sr.height + vh * 0.35);
          var n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
          for (var j = 0; j < words.length; j++) words[j].classList.toggle('on', j < n);
        }
      }
    }

    // липкая кнопка (мобайл)
    if (sticky && waitlist) {
      var past = y > heroH * 0.8, atForm = waitlist.getBoundingClientRect().top < vh * 0.9;
      sticky.classList.toggle('is-visible', past && !atForm);
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  /* ---------- 7. Направления: аккордеон + превью ---------- */
  var dirs = $$('.dir'), previews = $$('.dirs__preview img');
  function setPreview(i) { previews.forEach(function (img, k) { img.classList.toggle('is-active', k === i); }); }
  function openDir(i, toggle) {
    dirs.forEach(function (d, k) {
      var open = k === i ? (toggle ? !d.classList.contains('is-open') : true) : false;
      d.classList.toggle('is-open', open);
      $('.dir__head', d).setAttribute('aria-expanded', open);
    });
    setPreview(i);
  }
  dirs.forEach(function (d, i) {
    $('.dir__head', d).addEventListener('click', function () { openDir(i, !desktop.matches); });
    d.addEventListener('mouseenter', function () { if (desktop.matches && fine) openDir(i, false); });
  });

  /* ---------- 8. Бейдж «вдох / выдох» в первом экране ---------- */
  var bt = $('[data-breath-text]');
  if (bt && !reduce) {
    var ph = 0;
    (function loop() {
      bt.style.opacity = 0;
      setTimeout(function () { bt.textContent = ph ? 'выдох' : 'вдох'; bt.style.opacity = 1; }, 300);
      setTimeout(loop, ph ? 6000 : 4000); ph = 1 - ph;
    })();
  }

  /* ---------- 9. Дыхательная пауза: 3 круга 4/6 ---------- */
  var circle = $('[data-breath-start]'), label = $('[data-breath-label]'), hint = $('[data-breath-hint]');
  var running = false;
  if (circle) circle.addEventListener('click', function () {
    if (running) return; running = true;
    circle.classList.add('is-active');
    var cycle = 0;
    function inhale() {
      cycle++; label.textContent = 'вдох';
      hint.textContent = 'Круг ' + cycle + ' из 3 · медленно вдохни носом';
      circle.classList.remove('is-out-phase'); circle.classList.add('is-in-phase');
      setTimeout(exhale, 4000);
    }
    function exhale() {
      label.textContent = 'выдох';
      hint.textContent = 'Круг ' + cycle + ' из 3 · долгий выдох, плечи опускаются';
      circle.classList.remove('is-in-phase'); circle.classList.add('is-out-phase');
      setTimeout(cycle < 3 ? inhale : finish, 6000);
    }
    function finish() {
      circle.classList.remove('is-out-phase', 'is-active');
      label.textContent = 'ещё раз';
      hint.textContent = 'Вот так ощущается воздух. В клубе таких практик — десятки.';
      running = false;
    }
    inhale();
  });

  /* ---------- 10. Курсор ---------- */
  var cur = $('.cursor');
  if (cur && fine && !reduce) {
    window.addEventListener('mousemove', function (e) {
      cur.style.setProperty('--cx', e.clientX + 'px'); cur.style.setProperty('--cy', e.clientY + 'px');
    }, { passive: true });
    $$('a, button, input, label').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cur.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('is-hover'); });
    });
  }

  /* ---------- 11. Форма (демо, без сервера) ---------- */
  var form = $('#waitlist-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name, contact = form.elements.contact, agree = form.elements.agree;
      var v = contact.value.trim();
      var contactOk = /^\S+@\S+\.\S+$/.test(v) || v.replace(/\D/g, '').length >= 10;
      name.classList.toggle('is-invalid', !name.value.trim());
      contact.classList.toggle('is-invalid', !contactOk);
      agree.closest('.check').classList.toggle('is-invalid', !agree.checked);
      if (!name.value.trim() || !contactOk || !agree.checked) {
        var first = $('input.is-invalid', form) || (!agree.checked && agree);
        if (first) first.focus();
        return;
      }
      // TODO: отправка в CRM / Тильду
      form.classList.add('is-sent');
    });
    form.addEventListener('input', function (e) {
      e.target.classList.remove('is-invalid');
      var c = e.target.closest('.check'); if (c) c.classList.remove('is-invalid');
    });
  }
})();
