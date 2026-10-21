/* oxygen for moms — interactions
   Лёгкий vanilla JS. На мобильных: нативный скролл, только transform/opacity. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var isDesktop = window.matchMedia('(min-width: 1024px)').matches;

  /* ---------- 1. Разбивка H1 на слова для мягкого появления ---------- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="word" aria-hidden="true"><span style="--i:' + i + '">' + w + '</span></span>';
    }).join(' ');
  });
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
  });

  /* ---------- 2. Появление блоков при скролле ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 3. Плавный скролл (только десктоп с мышью) ---------- */
  var lenis = null;
  function initLenis() {
    if (reduce || !finePointer || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.075, wheelMultiplier: 0.9 });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on('scroll', onScroll);
  }

  // якорные ссылки
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href');
      var target = id.length > 1 ? document.querySelector(id) : document.body;
      if (!target) return;
      ev.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.8 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- 4. Параллакс форм и движение типографики ---------- */
  var blobs = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var imgs = Array.prototype.slice.call(document.querySelectorAll('[data-parallax-img]'));
  var flows = Array.prototype.slice.call(document.querySelectorAll('[data-flow]'));
  var flowSection = document.querySelector('.flow');
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    if (!reduce) {
      var k = isDesktop ? 1 : 0.5; // на телефоне — спокойнее
      for (var i = 0; i < blobs.length; i++) {
        blobs[i].style.setProperty('--py', (-y * parseFloat(blobs[i].dataset.parallax) * k).toFixed(1) + 'px');
      }
      if (y < vh * 1.5) {
        for (var m = 0; m < imgs.length; m++) {
          imgs[m].style.setProperty('--iy', (y * parseFloat(imgs[m].dataset.parallaxImg) * k).toFixed(1) + 'px');
        }
      }
      if (flowSection) {
        var r = flowSection.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) {
          var p = (vh - r.top) / (vh + r.height); // 0..1 пока секция в кадре
          for (var j = 0; j < flows.length; j++) {
            var dir = parseFloat(flows[j].dataset.flow);
            flows[j].style.setProperty('--fx', (dir * (p - 0.5) * 30).toFixed(2) + '%');
          }
        }
      }
    }
    updateSticky();
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    onScroll();
  }, { passive: true });

  /* ---------- 5. Липкая кнопка на мобильном ---------- */
  var sticky = document.querySelector('.sticky-cta');
  var heroAction = document.querySelector('.hero__action');
  var waitlist = document.getElementById('waitlist');
  function updateSticky() {
    if (!sticky || !heroAction || !waitlist) return;
    var vh = window.innerHeight;
    var pastHero = heroAction.getBoundingClientRect().bottom < 0;
    var atForm = waitlist.getBoundingClientRect().top < vh * 0.85;
    sticky.classList.toggle('is-visible', pastHero && !atForm);
  }

  /* ---------- 6. Дыхательный бейдж: 4 с вдох / 6 с выдох ---------- */
  var breathText = document.querySelector('[data-breath-text]');
  if (breathText && !reduce) {
    var phase = 0;
    var swap = function (word) {
      breathText.style.opacity = 0;
      setTimeout(function () { breathText.textContent = word; breathText.style.opacity = 1; }, 350);
    };
    (function loop() {
      if (phase === 0) { swap('вдох'); phase = 1; setTimeout(loop, 4000); }
      else { swap('выдох'); phase = 0; setTimeout(loop, 6000); }
    })();
  }

  /* ---------- 7. Форма листа ожидания (демо, без сервера) ---------- */
  var form = document.getElementById('waitlist-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true;
      var name = form.elements.name, contact = form.elements.contact, agree = form.elements.agree;
      var contactOk = /^\S+@\S+\.\S+$/.test(contact.value.trim()) || contact.value.replace(/\D/g, '').length >= 10;

      name.classList.toggle('is-invalid', !name.value.trim());
      contact.classList.toggle('is-invalid', !contactOk);
      agree.closest('.check').classList.toggle('is-invalid', !agree.checked);
      ok = name.value.trim() && contactOk && agree.checked;

      if (!ok) {
        var first = form.querySelector('.is-invalid input, input.is-invalid');
        if (first) first.focus();
        return;
      }
      // TODO: отправка в CRM / Тильду. Сейчас — только визуальное подтверждение.
      form.classList.add('is-sent');
    });
    form.addEventListener('input', function (e) {
      e.target.classList.remove('is-invalid');
      var c = e.target.closest('.check'); if (c) c.classList.remove('is-invalid');
    });
  }

  /* старт */
  if (document.readyState === 'complete') initLenis();
  else window.addEventListener('load', initLenis);
  update();
})();
