/* =========================================================
   Обжарка — скрипты сайта
   Всё обёрнуто в функцию, чтобы не засорять глобальную область.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  /* ---------- Время по Москве ----------
     Посетитель может быть в любом часовом поясе, а кофейня работает по Москве.
     Intl.DateTimeFormat умеет переводить текущее время в нужный пояс. */
  var mskFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function nowMsk() {
    var p = {};
    mskFormatter.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    var y = +p.year, m = +p.month, d = +p.day;
    return {
      y: y, m: m, d: d,
      minutes: (+p.hour % 24) * 60 + (+p.minute),
      dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
      iso: p.year + '-' + p.month + '-' + p.day
    };
  }

  // Часы работы: пн–пт 8–22, сб–вс 9–23 (в часах)
  function hoursFor(dow) {
    return (dow === 0 || dow === 6) ? { open: 9, close: 23 } : { open: 8, close: 22 };
  }

  function isoToParts(iso) {
    var a = iso.split('-');
    return { y: +a[0], m: +a[1], d: +a[2] };
  }
  function addDaysIso(iso, n) {
    var p = isoToParts(iso);
    var dt = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
    return dt.toISOString().slice(0, 10);
  }
  function dowOfIso(iso) {
    var p = isoToParts(iso);
    return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  }
  function humanDate(iso) {
    var p = isoToParts(iso);
    return p.d + ' ' + MONTHS[p.m - 1];
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function timeStr(min) { return Math.floor(min / 60) + ':' + pad(min % 60); }
  function plural(n, one, few, many) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }
  function rub(n) { return n.toLocaleString('ru-RU') + ' ₽'; }

  /* ---------- Статус «Открыто / Закрыто» ---------- */
  function updateStatus() {
    var now = nowMsk();
    var h = hoursFor(now.dow);
    var open = now.minutes >= h.open * 60 && now.minutes < h.close * 60;
    var text;
    if (open) {
      text = 'Открыто до ' + h.close + ':00';
    } else if (now.minutes < h.open * 60) {
      text = 'Закрыто, откроемся в ' + h.open + ':00';
    } else {
      text = 'Закрыто, откроемся завтра в ' + hoursFor((now.dow + 1) % 7).open + ':00';
    }
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', open);
      $('.status__text', el).textContent = text;
    });
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Шапка: тень при прокрутке ---------- */
  var header = $('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Бургер-меню ---------- */
  var burger = $('.burger');
  var nav = $('#nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) {
    if (e.matches) setMenu(false);
  });

  /* ---------- Вкладки меню ----------
     Разметка по стандарту WAI-ARIA: стрелки влево/вправо переключают вкладки. */
  var tabs = $$('[role="tab"]');
  var sizeSwitch = $('#size-switch');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    sizeSwitch.hidden = tab.id !== 'tab-coffee';
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });
  selectTab(tabs[0]);

  /* ---------- Переключатель 250 / 350 мл ---------- */
  $$('input[name="size"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var size = radio.value;
      $$('[data-sized]').forEach(function (item) {
        $('[data-price]', item).textContent = rub(+item.getAttribute('data-price-' + size));
        $('[data-volume]', item).textContent = size + ' мл';
      });
    });
  });

  /* ---------- Дата обжарки: ближайший прошедший четверг ---------- */
  (function () {
    var el = $('[data-roast-date]');
    if (!el) return;
    var now = nowMsk();
    var back = (now.dow - 4 + 7) % 7;
    el.textContent = back === 0
      ? 'Обжарили сегодня, ' + humanDate(now.iso)
      : 'Обжарили в четверг, ' + humanDate(addDaysIso(now.iso, -back));
  })();

  /* ---------- Появление блоков при прокрутке ---------- */
  var reveals = $$('.reveal');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduceMotion) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Лайтбокс галереи ---------- */
  (function () {
    var links = $$('[data-lightbox]');
    var box = $('#lightbox');
    if (!links.length || !box) return;
    var img = $('[data-lb-img]', box);
    var caption = $('[data-lb-caption]', box);
    var counter = $('[data-lb-counter]', box);
    var current = 0;
    var lastFocus = null;

    function show(i) {
      current = (i + links.length) % links.length;
      var a = links[current];
      var alt = $('img', a).alt;
      img.src = a.href;
      img.alt = alt;
      caption.textContent = alt;
      counter.textContent = (current + 1) + ' / ' + links.length;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.classList.add('is-locked');
      $('[data-lb-close]', box).focus();
    }
    function close() {
      box.hidden = true;
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    }

    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    $('[data-lb-close]', box).addEventListener('click', close);
    $('[data-lb-prev]', box).addEventListener('click', function () { show(current - 1); });
    $('[data-lb-next]', box).addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') {
        // Держим фокус внутри лайтбокса
        var btns = $$('button', box).filter(function (b) { return b.offsetParent !== null; });
        var first = btns[0], last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Свайп на телефоне: запоминаем, где палец коснулся, и сравниваем с местом, где отпустил
    var startX = null, startY = null;
    box.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  })();

  /* ---------- Маска телефона +7 (XXX) XXX-XX-XX ---------- */
  // Возвращает 10 цифр номера без кода страны
  function phoneDigits(value) {
    var s = value.trim();
    var d;
    if (s.indexOf('+7') === 0) {
      d = s.slice(2).replace(/\D/g, '');
    } else {
      d = s.replace(/\D/g, '');
      if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    }
    // Вставили «89161234567» в поле с «+7 (» — лишняя восьмёрка
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    return d.slice(0, 10);
  }
  function formatPhone(d) {
    if (!d) return '';
    var s = '+7 (' + d.slice(0, 3);
    // Разделитель ставим, только когда после него уже есть цифра, — так Backspace стирает ровно одну цифру
    if (d.length > 3) s += ') ' + d.slice(3, 6);
    if (d.length > 6) s += '-' + d.slice(6, 8);
    if (d.length > 8) s += '-' + d.slice(8, 10);
    return s;
  }
  $$('[data-phone]').forEach(function (input) {
    input.addEventListener('focus', function () { if (!input.value) input.value = '+7 ('; });
    input.addEventListener('blur', function () { if (input.value === '+7 (') input.value = ''; });
    input.addEventListener('input', function () {
      var d = phoneDigits(input.value);
      // Первую набранную 8 или 7 считаем кодом страны: «8 916…» → +7 (916…
      if (d === '8' || d === '7') d = '';
      input.value = formatPhone(d) || (document.activeElement === input ? '+7 (' : '');
    });
  });

  /* ---------- Проверка форм ----------
     Каждое правило возвращает текст ошибки или пустую строку. */
  var rules = {
    name: function (v) {
      v = v.trim();
      if (!v) return 'Напишите, как к вам обращаться';
      if (v.length < 2) return 'Имя слишком короткое';
      if (!/^[A-Za-zА-Яа-яЁё\s-]+$/.test(v)) return 'Только буквы, пробел и дефис';
      return '';
    },
    phone: function (v) {
      var d = phoneDigits(v);
      if (!d.length) return 'Введите телефон — позвоним, чтобы подтвердить';
      if (d.length < 10) return 'Введите телефон полностью';
      return '';
    },
    consent: function (v, el) {
      return el.checked ? '' : 'Без согласия мы не можем принять заявку';
    },
    date: function (v) {
      if (!v) return 'Выберите дату';
      var today = nowMsk().iso;
      if (v < today) return 'Эта дата уже прошла — выберите сегодня или позже';
      if (v > addDaysIso(today, 30)) return 'Бронируем не дальше чем на 30 дней вперёд';
      return '';
    },
    time: function (v) { return v ? '' : 'Выберите время'; }
  };

  function validateField(el) {
    var rule = rules[el.name];
    if (!rule) return true;
    var msg = rule(el.value, el);
    var field = el.closest('.field');
    var err = document.getElementById(el.id + '-error');
    field.classList.toggle('has-error', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) {
      err.textContent = msg;
      el.setAttribute('aria-describedby', err.id);
    }
    return !msg;
  }

  function setupForm(form, onSuccess) {
    form.noValidate = true; // отключаем стандартные всплывашки браузера, показываем свои
    var fields = $$('input, select, textarea', form).filter(function (el) { return rules[el.name]; });

    fields.forEach(function (el) {
      // Сначала проверяем при уходе с поля, а если ошибка уже показана — на лету при вводе
      el.addEventListener('blur', function () { if (el.value || el.type === 'checkbox') validateField(el); });
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('has-error')) validateField(el); });
      el.addEventListener('change', function () { validateField(el); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (el) {
        if (!validateField(el) && !firstBad) firstBad = el;
      });
      if (firstBad) { firstBad.focus(); return; }

      // Демо: данные никуда не уходят. Для Netlify Forms см. README.
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      var success = $('[data-success="' + form.getAttribute('data-form') + '"]');
      $('[data-success-text]', success).textContent = onSuccess(data);
      form.hidden = true;
      success.hidden = false;
      success.focus();
    });
  }

  function resetForm(form) {
    form.reset();
    $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
    $$('.field__error', form).forEach(function (e) { e.textContent = ''; });
    $$('[aria-invalid]', form).forEach(function (e) { e.removeAttribute('aria-invalid'); });
    form.hidden = false;
    $('[data-success="' + form.getAttribute('data-form') + '"]').hidden = true;
  }

  /* ---------- Бронь: дата и слоты времени ---------- */
  (function () {
    var form = $('#booking-form');
    if (!form) return;
    var dateEl = $('#bk-date', form);
    var timeEl = $('#bk-time', form);

    function slotsFor(iso) {
      var h = hoursFor(dowOfIso(iso));
      var list = [];
      // Последняя бронь — за час до закрытия
      for (var m = h.open * 60; m <= (h.close - 1) * 60; m += 30) list.push(m);
      var now = nowMsk();
      if (iso === now.iso) list = list.filter(function (m) { return m >= now.minutes + 30; });
      return list;
    }

    function fillSlots() {
      var prev = timeEl.value;
      var iso = dateEl.value;
      timeEl.innerHTML = '';
      var slots = iso ? slotsFor(iso) : [];
      var first = document.createElement('option');
      first.value = '';
      first.textContent = !iso ? 'Сначала дата' : (slots.length ? 'Выберите' : 'На этот день мест нет');
      timeEl.appendChild(first);
      slots.forEach(function (m) {
        var o = document.createElement('option');
        o.value = o.textContent = timeStr(m);
        timeEl.appendChild(o);
      });
      if (prev && slots.some(function (m) { return timeStr(m) === prev; })) timeEl.value = prev;
    }

    function initDate() {
      var today = nowMsk().iso;
      dateEl.min = today;
      dateEl.max = addDaysIso(today, 30);
      // Если сегодня забронировать уже нельзя, по умолчанию предлагаем завтра
      dateEl.value = slotsFor(today).length ? today : addDaysIso(today, 1);
      fillSlots();
    }

    dateEl.addEventListener('change', fillSlots);
    initDate();

    setupForm(form, function (d) {
      var g = +d.guests;
      return 'Стол на ' + g + ' ' + plural(g, 'гостя', 'гостей', 'гостей') +
        ' забронирован на ' + humanDate(d.date) + ', ' + d.time + '.';
    });

    $('[data-reset-form="booking"]').addEventListener('click', function () {
      resetForm(form);
      initDate();
      $('#bk-name', form).focus();
    });
  })();

  /* ---------- Заказ зерна: модальное окно ---------- */
  (function () {
    var modal = $('#bean-modal');
    var form = $('#bean-form');
    if (!modal || !form) return;

    $$('[data-open-modal="bean-modal"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        resetForm(form);
        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
        $('#bean-name', form).focus();
      });
    });
    function close() {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    }
    $$('[data-close-modal]', modal).forEach(function (b) { b.addEventListener('click', close); });
    // Клик по затемнённому фону закрывает окно
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

    setupForm(form, function (d) {
      var q = +d.qty;
      var until = addDaysIso(nowMsk().iso, 3);
      return d.name.trim() + ', отложили ' + q + ' ' + plural(q, 'пачку', 'пачки', 'пачек') +
        ' (' + d.grind.toLowerCase() + '). Заберите до ' + humanDate(until) + ' (' + WEEKDAYS[dowOfIso(until)] + '), ' +
        'к оплате ' + rub(q * 890) + '. Пришлём SMS, когда пачка будет готова.';
    });
  })();

  /* ---------- Cookie-баннер ---------- */
  (function () {
    var banner = $('#cookie');
    if (!banner) return;
    var KEY = 'obzharka-cookie-ok';
    var accepted = false;
    try { accepted = localStorage.getItem(KEY) === '1'; } catch (e) { /* приватный режим */ }
    if (accepted) return;
    banner.hidden = false;
    $('[data-cookie-ok]', banner).addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* ничего страшного */ }
      banner.hidden = true;
    });
  })();

  /* ---------- Год в футере ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = nowMsk().y; });
})();
