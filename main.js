/* oxygen for moms — interactions (vanilla JS) */
(function () {
  'use strict';

  var doc = document, body = doc.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 1024px)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- 1. Прелоадер ---------- */
  var started = false;
  function start() {
    if (started) return; started = true;
    body.classList.remove('is-loading');
    setTimeout(function () { body.classList.add('is-ready'); startSlider(); }, reduce ? 0 : 300);
  }
  if (reduce) start();
  else {
    var t0 = Date.now();
    var go = function () { setTimeout(start, Math.max(0, 1200 - (Date.now() - t0))); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go);
    setTimeout(start, 3000);
  }

  /* ---------- 2. Плавный скролл (десктоп) ---------- */
  var lenis = null;
  function initLenis() {
    if (reduce || !fine || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.08, wheelMultiplier: 0.95 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    lenis.on('scroll', onScroll);
  }
  if (doc.readyState === 'complete') initLenis(); else window.addEventListener('load', initLenis);
  function lock(on) { body.classList.toggle('no-scroll', on); if (lenis) on ? lenis.stop() : lenis.start(); }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'), el = id.length > 1 ? $(id) : $('#top');
      if (!el) return;
      e.preventDefault();
      if (body.classList.contains('menu-open')) toggleMenu(false);
      if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.8 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- 3. Меню ---------- */
  var burger = $('[data-burger]'), menu = $('[data-menu]');
  function toggleMenu(open) {
    body.classList.toggle('menu-open', open); lock(open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.setAttribute('aria-hidden', !open);
  }
  burger.addEventListener('click', function () { toggleMenu(!body.classList.contains('menu-open')); });

  /* ---------- 4. Появление при скролле ---------- */
  var io = null;
  if ('IntersectionObserver' in window && !reduce) {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach(function (el) {
      var sib = $$(':scope > [data-reveal]', el.parentNode), i = sib.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 0.07 + 's');
      io.observe(el);
    });
  } else $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });

  /* ---------- 5. Слайдер первого экрана ---------- */
  var hero = $('.hero'), slides = $$('.slide'), cur = 0, timer = null, DUR = 8000;
  var countEl = $('[data-count]'), prog = $('[data-progress]');
  function silk() { return window.OxygenSilk && window.OxygenSilk.instances[0]; }
  function show(i) {
    i = (i + slides.length) % slides.length;
    if (i === cur) return;
    var old = slides[cur], nxt = slides[i];
    old.classList.add('is-leaving');
    setTimeout(function () { old.classList.remove('is-leaving', 'is-active'); old.setAttribute('aria-hidden', 'true'); $$('a', old).forEach(function (a) { a.tabIndex = -1; }); }, reduce ? 0 : 450);
    setTimeout(function () {
      nxt.classList.add('is-active'); nxt.removeAttribute('aria-hidden'); $$('a', nxt).forEach(function (a) { a.removeAttribute('tabindex'); });
    }, reduce ? 0 : 380);
    if (silk()) silk().setPalette(nxt.dataset.palette);
    cur = i; countEl.textContent = '0' + (i + 1);
    restart();
  }
  function restart() {
    clearTimeout(timer);
    prog.classList.remove('run'); void prog.offsetWidth;
    if (reduce || paused) return;
    prog.style.setProperty('--dur', DUR + 'ms'); prog.classList.add('run');
    timer = setTimeout(function () { show(cur + 1); }, DUR);
  }
  var paused = false;
  function startSlider() { restart(); }
  $('[data-next]').addEventListener('click', function () { show(cur + 1); });
  $('[data-prev]').addEventListener('click', function () { show(cur - 1); });
  hero.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
  // пауза, пока мама читает (наведение / фокус)
  var slidesBox = $('[data-slides]');
  ['mouseenter', 'focusin'].forEach(function (ev) { slidesBox.addEventListener(ev, function () { paused = true; clearTimeout(timer); prog.classList.remove('run'); }); });
  ['mouseleave', 'focusout'].forEach(function (ev) { slidesBox.addEventListener(ev, function () { paused = false; restart(); }); });
  // свайп
  var sx = 0, sy = 0;
  hero.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
  // не крутить слайды, когда первый экран не видно
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
    if (es[0].isIntersecting) { paused = false; restart(); } else { paused = true; clearTimeout(timer); }
  }).observe(hero);

  /* ---------- 6. Скролл: шапка, липкая кнопка ---------- */
  var nav = $('[data-nav]'), sticky = $('.sticky-cta'), waitlist = $('#waitlist'), lastY = 0, ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset, vh = window.innerHeight, hh = hero.offsetHeight;
    if (y > hh && y > lastY + 4 && !body.classList.contains('menu-open')) nav.classList.add('is-hidden');
    if (y < lastY - 4 || y < hh) nav.classList.remove('is-hidden');
    nav.classList.toggle('is-solid', y > 40 && !body.classList.contains('menu-open'));
    lastY = y;
    var past = y > hh * 0.8, atForm = waitlist.getBoundingClientRect().top < vh * 0.9;
    sticky.classList.toggle('is-visible', past && !atForm);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  /* ---------- 7. Пять опор: аккордеон + превью ---------- */
  var pillars = $$('.pillar'), previews = $$('.pillars__preview img'), tag = $('[data-pillar-tag]');
  function openPillar(i, toggle) {
    pillars.forEach(function (p, k) {
      var open = k === i ? (toggle ? !p.classList.contains('is-open') : true) : false;
      p.classList.toggle('is-open', open);
      $('.pillar__head', p).setAttribute('aria-expanded', open);
    });
    previews.forEach(function (img, k) { img.classList.toggle('is-active', k === i); });
    var t = $('.pillar__title', pillars[i]).firstChild.textContent.trim();
    tag.textContent = $('.pillar__num', pillars[i]).textContent + ' · ' + t;
  }
  pillars.forEach(function (p, i) {
    $('.pillar__head', p).addEventListener('click', function () { openPillar(i, true); });
    p.addEventListener('mouseenter', function () { if (desktop.matches && fine) openPillar(i, false); });
  });

  /* ---------- 8. Чат «Вы больше не одна» ---------- */
  var CHATS = [
    { who: 'Взрослый психолог', time: '02:47',
      q: 'Я так устала, что срываюсь на ребёнка, а потом ненавижу себя. Со мной что-то не так?',
      a: ['С вами всё в порядке. Злость на фоне хронического недосыпа — очень частая реакция, и она не делает вас плохой мамой.',
          'Давайте начнём с малого: что могло бы дать вам хотя бы 20 минут отдыха завтра? А вечером загляните в лекцию о чувстве вины — там есть короткая практика на 5 минут.'] },
    { who: 'Детский психолог', time: '21:15',
      q: 'Малыш плачет каждый вечер, и я не понимаю, что делаю не так.',
      a: ['Вечерний плач в первые месяцы встречается очень часто: так малыш «разгружает» впечатления дня. Это не значит, что вы делаете что-то не так.',
          'Попробуйте приглушить свет и звуки за час до сна. Подробно разбираем это в цикле «Природа плача», а ваш случай можем обсудить прямо здесь.'] },
    { who: 'Доказательный педиатр', time: '23:40',
      q: 'Собираю аптечку для новорождённого. Что действительно нужно, а что лишнее?',
      a: ['Базовый набор короче, чем кажется: термометр, солевой раствор, назальный аспиратор и жаропонижающее, разрешённое по возрасту.',
          'Полный список и то, что покупать не стоит, — в видеоуроке «Первая аптечка». Если появятся симптомы, опишите их: подскажем, когда нужен очный осмотр врача.'] }
  ];
  var chatBody = $('[data-chat-body]'), chatStatus = $('[data-chat-status]'), chatToken = 0, chatStarted = false;
  function el(cls, html) { var d = doc.createElement('div'); d.className = cls; d.innerHTML = html; return d; }
  function playChat(i) {
    var token = ++chatToken, c = CHATS[i];
    chatBody.innerHTML = '';
    chatStatus.textContent = c.who.toLowerCase() + ' · онлайн';
    var steps = [
      [300, function () { chatBody.appendChild(el('msg msg--me', c.q + '<small>' + c.time + '</small>')); }],
      [900, function () { chatBody.appendChild(el('typing', '<i></i><i></i><i></i>')); }],
      [1500, function () { var t = $('.typing', chatBody); if (t) t.remove(); chatBody.appendChild(el('msg msg--them', '<span class="msg__who">' + c.who + '</span>' + c.a[0])); }],
      [900, function () { chatBody.appendChild(el('typing', '<i></i><i></i><i></i>')); }],
      [1700, function () { var t = $('.typing', chatBody); if (t) t.remove(); chatBody.appendChild(el('msg msg--them', c.a[1] + '<small>ответ через 6 минут</small>')); }]
    ];
    if (reduce) { steps.forEach(function (s) { s[1](); }); $$('.typing', chatBody).forEach(function (t) { t.remove(); }); return; }
    var acc = 0;
    steps.forEach(function (s) { acc += s[0]; setTimeout(function () { if (token === chatToken) s[1](); }, acc); });
  }
  var experts = $$('[data-chat]');
  experts.forEach(function (b) {
    b.addEventListener('click', function () {
      experts.forEach(function (x) { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', x === b); });
      playChat(+b.dataset.chat);
    });
  });
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting && !chatStarted) { chatStarted = true; playChat(0); cio.disconnect(); } }, { threshold: 0.35 });
    cio.observe($('.chat'));
  } else playChat(0);

  /* ---------- 9. «вдох / выдох» в первом экране ---------- */
  var bt = $('[data-breath-text]');
  if (bt && !reduce) {
    var ph = 0;
    (function loop() {
      bt.style.opacity = 0;
      setTimeout(function () { bt.textContent = ph ? 'выдох' : 'вдох'; bt.style.opacity = 1; }, 300);
      setTimeout(loop, ph ? 6000 : 4000); ph = 1 - ph;
    })();
  }

  /* ---------- 10. Дыхательная пауза ---------- */
  var circle = $('[data-breath-start]'), label = $('[data-breath-label]'), hint = $('[data-breath-hint]'), running = false;
  circle.addEventListener('click', function () {
    if (running) return; running = true; circle.classList.add('is-active');
    var cycle = 0;
    function inhale() { cycle++; label.textContent = 'вдох'; hint.textContent = 'Круг ' + cycle + ' из 3 · медленно вдохните носом'; circle.classList.remove('is-out-phase'); circle.classList.add('is-in-phase'); setTimeout(exhale, 4000); }
    function exhale() { label.textContent = 'выдох'; hint.textContent = 'Круг ' + cycle + ' из 3 · долгий выдох, плечи опускаются'; circle.classList.remove('is-in-phase'); circle.classList.add('is-out-phase'); setTimeout(cycle < 3 ? inhale : finish, 6000); }
    function finish() { circle.classList.remove('is-out-phase', 'is-active'); label.textContent = 'ещё раз'; hint.textContent = 'Вот так ощущается воздух. В клубе таких практик — десятки.'; running = false; }
    inhale();
  });

  /* ---------- 11. Курсор ---------- */
  var cursor = $('.cursor');
  if (cursor && fine && !reduce) {
    window.addEventListener('mousemove', function (e) { cursor.style.setProperty('--cx', e.clientX + 'px'); cursor.style.setProperty('--cy', e.clientY + 'px'); }, { passive: true });
    doc.addEventListener('mouseover', function (e) { cursor.classList.toggle('is-hover', !!e.target.closest('a, button, input, label')); });
  }

  /* ---------- 12. Формы (демо, без сервера) ---------- */
  function setupForm(form, fields) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      fields.forEach(function (f) {
        var inp = form.elements[f.name], v = inp.value.trim(), good = f.test ? f.test(v) : !!v;
        inp.classList.toggle('is-invalid', !good); if (!good) ok = false;
      });
      var agree = form.elements.agree;
      agree.closest('.check').classList.toggle('is-invalid', !agree.checked);
      if (!agree.checked) ok = false;
      if (!ok) { var first = $('input.is-invalid', form) || agree; first.focus(); return; }
      form.classList.add('is-sent'); // TODO: отправка в CRM / Тильду
    });
    form.addEventListener('input', function (e) { e.target.classList.remove('is-invalid'); var c = e.target.closest('.check'); if (c) c.classList.remove('is-invalid'); });
  }
  var contactTest = function (v) { return /^\S+@\S+\.\S+$/.test(v) || v.replace(/\D/g, '').length >= 10 || /^@\w{4,}$/.test(v); };
  setupForm($('#waitlist-form'), [{ name: 'name' }, { name: 'contact', test: contactTest }]);
  setupForm($('#expert-form'), [{ name: 'name' }, { name: 'spec' }, { name: 'contact', test: contactTest }]);

  /* ---------- 13. Модальное окно специалиста ---------- */
  var modal = $('[data-modal]'), lastFocus = null;
  function modalToggle(open) {
    modal.classList.toggle('is-open', open); modal.setAttribute('aria-hidden', !open); lock(open);
    if (open) { lastFocus = doc.activeElement; setTimeout(function () { $('input', modal).focus(); }, 400); }
    else if (lastFocus) lastFocus.focus();
  }
  $('[data-modal-open]').addEventListener('click', function () { modalToggle(true); });
  $$('[data-modal-close]', modal).forEach(function (b) { b.addEventListener('click', function () { modalToggle(false); }); });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('is-open')) modalToggle(false);
    else if (body.classList.contains('menu-open')) toggleMenu(false);
  });
})();
