/* CBIT Venture Builder, v4 design (30 September 2026). Commented source: CBIT OneDrive, collaterals/Web/Site/assets/. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var KEY_NOTES = 'cbit-mockup-notes';

  var BAR_FULL = 1280;

  function readPref(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function savePref(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) {  }
  }
  function one(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function expanded(btn) { return !!btn && btn.getAttribute('aria-expanded') === 'true'; }
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduceMotion() { return !!(motionQuery && motionQuery.matches); }
  function onChange(query, fn) {
    if (!query) { return; }
    if (query.addEventListener) { query.addEventListener('change', fn); } else if (query.addListener) { query.addListener(fn); }
  }

  var searchBox = one('[data-ntu-search]');
  var searchBtn = searchBox ? one('summary', searchBox) : null;
  var searchInput = doc.getElementById('ntu-search-input');

  function searchOpen() { return !!searchBox && searchBox.open; }
  function setSearch(open, returnFocus) {
    if (!searchBox) { return; }
    searchBox.open = open;
    if (!open && returnFocus && searchBtn) { searchBtn.focus(); }
  }
  if (searchBox && searchBtn) {
    searchBox.addEventListener('toggle', function () {
      searchBtn.setAttribute('aria-label', searchBox.open ? 'Hide search' : 'Show search');
      if (searchBox.open && searchInput) { searchInput.focus(); }
    });
  }

  var vbBar = one('.vb-bar');
  var menu = one('[data-vb-menu]');
  var menuBtn = menu ? one('summary', menu) : null;
  var pointerInBar = false;

  function menuOpen() { return !!menu && menu.open; }
  function setMenu(open, returnFocus) {
    if (!menu) { return; }
    menu.open = open;
    if (!open && returnFocus && menuBtn) { menuBtn.focus(); }
  }
  if (vbBar && menu) {
    doc.addEventListener('pointerdown', function (e) {
      pointerInBar = vbBar.contains(e.target);
      if (menuOpen() && !pointerInBar) { setMenu(false); }
    }, true);
    vbBar.addEventListener('focusout', function (e) {
      if (!menuOpen()) { return; }
      var to = e.relatedTarget;
      if (to) {
        if (!vbBar.contains(to)) { setMenu(false); }
      } else if (!pointerInBar && doc.hasFocus()) {
        setMenu(false);                  
      }
    });
  }

  function updateShadow() {
    if (!vbBar) { return; }
    var stuck = window.pageYOffset > 0 && vbBar.getBoundingClientRect().top <= 0;
    if (stuck !== vbBar.classList.contains('is-scrolled')) { vbBar.classList.toggle('is-scrolled', stuck); }
  }
  if (vbBar) {
    window.addEventListener('scroll', updateShadow, { passive: true });
    window.addEventListener('load', updateShadow);      
    updateShadow();
  }

  var menus = [];
  var lastPointer = null;

  function setPanel(entry, open, returnFocus) {
    if (open) {
      menus.forEach(function (other) { if (other !== entry && expanded(other.btn)) { setPanel(other, false); } });
    }
    entry.btn.setAttribute('aria-expanded', String(open));
    entry.panel.hidden = !open;
    if (!open && returnFocus) { entry.btn.focus(); }
  }
  function openEntry() {
    for (var i = 0; i < menus.length; i += 1) { if (expanded(menus[i].btn)) { return menus[i]; } }
    return null;
  }
  function closePanels() {
    menus.forEach(function (entry) { if (expanded(entry.btn)) { setPanel(entry, false); } });
  }

  all('[data-menu]').forEach(function (item) {
    var link = one('[data-menu-link]', item);
    var panel = one('.vb-menu', item);
    if (!link || !panel || !panel.id) { return; }
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'vb-bar__link vb-bar__btn';

    while (link.firstChild) { btn.appendChild(link.firstChild); }
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', panel.id);
    if (link.hasAttribute('aria-current')) { btn.setAttribute('aria-current', 'true'); }
    item.replaceChild(btn, link);
    panel.hidden = true;
    var entry = { item: item, btn: btn, panel: panel };
    menus.push(entry);
    btn.addEventListener('click', function () { setPanel(entry, !expanded(btn)); });
    item.addEventListener('focusout', function (e) {
      if (!expanded(btn)) { return; }
      var to = e.relatedTarget;
      if (to) {
        if (!item.contains(to)) { setPanel(entry, false); }
      } else if (!(lastPointer && item.contains(lastPointer)) && doc.hasFocus()) {
        setPanel(entry, false);          
      }
    });
  });
  if (menus.length) {
    doc.addEventListener('pointerdown', function (e) {
      lastPointer = e.target;
      var entry = openEntry();
      if (entry && !entry.item.contains(e.target)) { setPanel(entry, false); }
    }, true);
    if (menu) {                          
      menu.addEventListener('toggle', function () { if (!menu.open) { closePanels(); } });
    }
  }

  var phoneQuery = window.matchMedia ? window.matchMedia('(max-width: 599px)') : null;
  var phoneFolds = [];
  all('[data-disclosure]').forEach(function (heading, i) {
    var panel = heading.nextElementSibling;
    if (!panel) { return; }
    if (!panel.id) { panel.id = 'disclosure-panel-' + (i + 1); }
    var phoneOnly = heading.hasAttribute('data-disclosure-below');
    var open = heading.hasAttribute('data-open');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'disclosure__btn';
    btn.setAttribute('aria-controls', panel.id);
    btn.setAttribute('aria-expanded', String(open));
    if (phoneOnly) {
      var label = doc.createElement('span');
      label.className = 'disclosure__label';
      while (heading.firstChild) { label.appendChild(heading.firstChild); }
      for (var n = label.firstChild; n; n = n.nextSibling) { btn.appendChild(n.cloneNode(true)); }
      heading.appendChild(label);
    } else {
      while (heading.firstChild) { btn.appendChild(heading.firstChild); }
    }
    var icon = doc.createElement('span');
    icon.className = 'disclosure__icon';
    icon.setAttribute('aria-hidden', 'true');
    btn.appendChild(icon);
    heading.appendChild(btn);
    function fold() {
      var folds = !phoneOnly || !!(phoneQuery && phoneQuery.matches);
      panel.hidden = folds ? !expanded(btn) : false;
    }
    fold();
    btn.addEventListener('click', function () {
      btn.setAttribute('aria-expanded', String(!expanded(btn)));
      fold();
    });
    if (phoneOnly) { phoneFolds.push(fold); }
  });
  if (phoneFolds.length) {
    onChange(phoneQuery, function () { phoneFolds.forEach(function (fn) { fn(); }); });
  }

  function openTarget() {
    var id = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : '';
    var target = id ? doc.getElementById(id) : null;
    if (!target || !target.classList || !target.classList.contains('story--index')) { return; }
    var toggle = one('.story__toggle .disclosure__btn', target);
    if (toggle && !expanded(toggle)) { toggle.click(); }
  }
  openTarget();
  window.addEventListener('hashchange', openTarget);

  all('form[data-filter]').forEach(function (form) {
    var name = form.getAttribute('data-filter');
    var list = one('[data-filter-list="' + name + '"]');
    if (!list) { return; }
    var count = one('[data-filter-count="' + name + '"]');
    var empty = one('[data-filter-empty="' + name + '"]');
    var noun = form.getAttribute('data-filter-noun') || 'items';
    var items = Array.prototype.slice.call(list.children);

    function chosen() {
      var values = {};
      all('input:checked, select', form).forEach(function (el) {
        if (el.name) { values[el.name] = el.value; }
      });
      return values;
    }
    function apply() {
      var values = chosen();
      var shown = 0;
      items.forEach(function (item) {
        var ok = Object.keys(values).every(function (key) {
          var want = values[key];
          if (!want || want === 'all') { return true; }
          var have = (item.getAttribute('data-' + key) || '').split(/\s+/);
          return have.indexOf(want) !== -1;
        });
        item.hidden = !ok;
        if (ok) { shown += 1; }
      });
      if (count) { count.textContent = 'Showing ' + shown + ' of ' + items.length + ' ' + noun; }
      if (empty) { empty.hidden = shown !== 0; }
    }
    form.addEventListener('change', apply);
    form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    all('[data-filter-reset="' + name + '"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        form.reset();
        apply();
        var first = one('input, select', form);
        if (first) { first.focus(); }
      });
    });
    apply();
  });

  all('[data-anim-toggle]').forEach(function (btn) {
    var figure = doc.getElementById(btn.getAttribute('aria-controls'));
    if (!figure) { return; }
    function set(paused) {
      figure.classList.toggle('is-paused', paused);
      btn.classList.toggle('is-paused', paused);
      btn.textContent = paused ? 'Play animation' : 'Pause animation';
    }
    set(reduceMotion());
    btn.addEventListener('click', function () { set(!figure.classList.contains('is-paused')); });
    onChange(motionQuery, function () { set(reduceMotion()); });
  });

  var bar = one('.review-bar');
  var barToggle = one('[data-review-bar]');
  var notesBtn = one('[data-review-notes]');
  var listBtn = one('[data-review-list]');
  var drawer = doc.getElementById('review-drawer');
  var notes = all('[data-review]');
  var layer = null;
  var tip = null;
  var queued = false;

  notes.forEach(function (el, i) { el.setAttribute('data-review-n', String(i + 1)); });
  all('[data-review-count]').forEach(function (el) { el.textContent = String(notes.length); });

  function isShown(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }
  function hideTip() {
    if (tip) { tip.hidden = true; tip.forBadge = null; }
  }
  function showTip(badge, el) {
    if (!tip) { return; }
    tip.textContent = el.getAttribute('data-review');
    tip.hidden = false;
    tip.forBadge = badge;
    var r = badge.getBoundingClientRect();
    var vw = root.clientWidth;
    var left = Math.min(Math.max(r.left, 8), Math.max(8, vw - tip.offsetWidth - 8));
    var top = r.bottom + 6;
    if (top + tip.offsetHeight > window.innerHeight - 8) { top = Math.max(8, r.top - tip.offsetHeight - 6); }
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function buildLayer() {
    if (layer) { return; }
    layer = doc.createElement('div');
    layer.className = 'review-layer';
    layer.setAttribute('aria-hidden', 'true');
    notes.forEach(function (el, i) {
      var badge = doc.createElement('span');
      badge.className = 'review-badge';
      badge.textContent = String(i + 1);
      badge.addEventListener('mouseenter', function () { showTip(badge, el); });
      badge.addEventListener('mouseleave', hideTip);
      badge.addEventListener('click', function (e) {
        e.stopPropagation();
        if (tip && !tip.hidden && tip.forBadge === badge) { hideTip(); } else { showTip(badge, el); }
      });
      layer.appendChild(badge);
      el.reviewBadge = badge;
    });
    doc.body.appendChild(layer);
    tip = doc.createElement('div');
    tip.className = 'review-tip';
    tip.hidden = true;
    doc.body.appendChild(tip);
  }
  function placeBadges() {
    queued = false;
    if (!layer || !root.classList.contains('review-on')) { return; }
    var maxLeft = root.clientWidth - 26;
    notes.forEach(function (el) {
      var badge = el.reviewBadge;
      if (!badge) { return; }
      if (!isShown(el)) { badge.hidden = true; return; }
      var r = el.getBoundingClientRect();
      badge.hidden = false;
      badge.style.left = Math.min(Math.max(r.left + window.pageXOffset - 11, 2), maxLeft) + 'px';
      badge.style.top = Math.max(r.top + window.pageYOffset - 11, 2) + 'px';
    });
  }
  function queuePlace() {
    if (queued) { return; }
    queued = true;
    window.requestAnimationFrame(placeBadges);
  }
  function setNotes(on, save) {
    root.classList.toggle('review-on', on);
    if (notesBtn) {
      notesBtn.setAttribute('aria-pressed', String(on));
      var state = one('.review-bar__state', notesBtn);
      if (state) { state.textContent = on ? 'On' : 'Off'; }
    }
    if (on) {
      buildLayer();
      layer.hidden = false;
      placeBadges();
    } else if (layer) {
      layer.hidden = true;
      hideTip();
    }
    if (save) { savePref(KEY_NOTES, on ? 'on' : 'off'); }
  }

  var listEl = drawer ? one('.review-drawer__list', drawer) : null;
  if (listEl) {
    if (!notes.length) {
      var none = doc.createElement('li');
      none.className = 'review-drawer__empty';
      none.textContent = 'There are no review notes on this page.';
      listEl.appendChild(none);
    }
    notes.forEach(function (el, i) {
      var li = doc.createElement('li');
      li.className = 'review-drawer__item';
      var go = doc.createElement('button');
      go.type = 'button';
      go.className = 'review-drawer__go';
      var num = doc.createElement('span');
      num.className = 'review-drawer__num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(i + 1);
      var text = doc.createElement('span');
      text.className = 'review-drawer__text';
      var label = doc.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = 'Note ' + (i + 1) + ': ';
      text.appendChild(label);
      text.appendChild(doc.createTextNode(el.getAttribute('data-review')));
      var where = doc.createElement('span');
      where.className = 'review-drawer__where';
      text.appendChild(where);
      go.appendChild(num);
      go.appendChild(text);
      go.addEventListener('click', function () {
        if (!isShown(el)) { return; }
        el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
        el.classList.add('review-flash');
        window.setTimeout(function () { el.classList.remove('review-flash'); }, 1600);
      });
      li.appendChild(go);
      listEl.appendChild(li);
      el.reviewWhere = where;
    });
  }
  function refreshWhere() {
    notes.forEach(function (el) {
      if (el.reviewWhere) {
        el.reviewWhere.textContent = isShown(el) ? 'Show on the page' : 'Not shown at this window width';
      }
    });
  }
  function setBar(open, returnFocus) {
    if (!barToggle || !bar) { return; }
    barToggle.setAttribute('aria-expanded', String(open));
    bar.classList.toggle('is-open', open);
    if (!open && returnFocus) { barToggle.focus(); }
  }
  function setDrawer(open, returnFocus) {
    if (!drawer || !listBtn) { return; }
    drawer.hidden = !open;
    listBtn.setAttribute('aria-expanded', String(open));
    if (open) {

      if (barToggle && isShown(barToggle)) { setBar(false); }
      refreshWhere();
      var title = one('.review-drawer__title', drawer);
      if (title) { title.focus(); }
    } else if (returnFocus) {
      if (isShown(listBtn)) { listBtn.focus(); } else if (barToggle) { barToggle.focus(); }
    }
  }

  if (notesBtn) {
    notesBtn.addEventListener('click', function () { setNotes(!root.classList.contains('review-on'), true); });
  }
  if (listBtn) {
    listBtn.addEventListener('click', function () { setDrawer(drawer.hidden); });
  }
  var closeBtn = drawer ? one('[data-review-close]', drawer) : null;
  if (closeBtn) {
    closeBtn.addEventListener('click', function () { setDrawer(false, true); });
  }
  if (barToggle) {
    barToggle.addEventListener('click', function () { setBar(!expanded(barToggle)); });
  }

  setNotes(root.classList.contains('review-on') || readPref(KEY_NOTES) === 'on', false);

  window.addEventListener('resize', queuePlace);
  window.addEventListener('load', queuePlace);
  window.addEventListener('scroll', hideTip, { passive: true });
  doc.addEventListener('click', function () { hideTip(); queuePlace(); });
  if ('ResizeObserver' in window) { new window.ResizeObserver(queuePlace).observe(doc.body); }

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') { return; }
    if (tip && !tip.hidden) { hideTip(); return; }
    if (drawer && !drawer.hidden) { setDrawer(false, true); return; }
    var panelOpen = openEntry();
    if (panelOpen) { setPanel(panelOpen, false, true); return; }
    if (menuOpen()) { setMenu(false, !!vbBar && vbBar.contains(doc.activeElement)); return; }
    if (searchOpen()) { setSearch(false, !!searchBox && searchBox.parentNode.contains(doc.activeElement)); return; }
    if (expanded(barToggle)) { setBar(false, true); }
  });
  if (window.matchMedia) {
    var fullBar = window.matchMedia('(min-width: ' + BAR_FULL + 'px)');   
    var fullStrip = window.matchMedia('(min-width: 1024px)');    
    onChange(fullBar, function () { if (fullBar.matches) { setMenu(false); } closePanels(); });
    onChange(fullStrip, function () { if (fullStrip.matches) { setSearch(false); } });
  }
})();
