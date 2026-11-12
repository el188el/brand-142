/* ════════════════════════════════════════════
   ШКОЛА · ИНТЕРАКТИВНЫЙ МАНИФЕСТ — V2
   Кинетический скролл: пословные раскрытия, параллакс,
   горизонтальный пин корпусов, инерционный тикер,
   магнитные кнопки, кастомный курсор.
   Без зависимостей.
   ════════════════════════════════════════════ */

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = () => window.innerWidth >= 900;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

/* Hand off readiness; the brand intro never waits for lazy media or video. */
function initPreloader() {
  document.documentElement.dataset.siteReady = 'true';
  document.dispatchEvent(new Event('school:ready'));
}

/* ─────────── Разбивка текста на слова (.kinetic) ─────────── */

document.querySelectorAll('.kinetic').forEach(el => {
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const i = document.createElement('i');
          i.textContent = part;
          w.appendChild(i);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.classList.contains('w')) {
        walk(child);
      }
    });
  };
  walk(el);
  el.querySelectorAll('.w > i').forEach((i, idx) => i.style.setProperty('--i', idx));
});

/* ─────────── Появление блоков ─────────── */

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  });
}, document.body.classList.contains('graphic-edition')
  ? { threshold: 0.01, rootMargin: '120px 0px' }
  : { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.reveal, .mask, .kinetic').forEach(el => io.observe(el));

/* ─────────── Прогресс скролла ─────────── */

const bar = document.getElementById('progressBar');
const nav = document.getElementById('nav');

function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (bar) bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 60);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ─────────── Заливка фона фирменными цветами ─────────── */

const LIGHT_TONES = ['paper'];

const bgObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const tone = e.target.dataset.bg;
    [...document.body.classList].filter(c => c.startsWith('bg-')).forEach(c => document.body.classList.remove(c));
    document.body.classList.add('bg-' + tone);
    nav?.classList.toggle('on-light', LIGHT_TONES.includes(tone));
  });
}, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });

document.querySelectorAll('[data-bg]').forEach(s => { if (s !== document.body) bgObserver.observe(s); });

/* Mobile navigation: hidden links, Escape, focus loop and scroll restoration. */
const burger = document.getElementById('burger');
const menu = document.getElementById('mobileMenu');
if (burger && menu) {
  const links = [...menu.querySelectorAll('a')];
  const main = document.querySelector('main');
  let previousOverflow = '';
  const setOpen = (open, returnFocus = true) => {
    if (open === (burger.getAttribute('aria-expanded') === 'true')) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    burger.classList.toggle('is-open', open);
    menu.hidden = !open;
    menu.inert = !open;
    menu.classList.toggle('is-open', open);
    if (main) main.inert = open;
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      links[0]?.focus();
    } else {
      document.body.style.overflow = previousOverflow;
      if (returnFocus) burger.focus();
    }
  };
  burger.addEventListener('click', () => setOpen(menu.hidden));
  links.forEach(link => link.addEventListener('click', () => {
    setOpen(false, false);
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      target.focus({ preventScroll: true });
    } else burger.focus();
  }));
  document.addEventListener('keydown', e => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    if (e.key === 'Tab') {
      const focusables = [burger, ...links];
      const current = focusables.indexOf(document.activeElement);
      e.preventDefault();
      focusables[(current + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length].focus();
    }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => {
    if (e.matches && !menu.hidden) {
      setOpen(false, false);
      document.querySelector('.nav__logo')?.focus();
    }
  });
}

/* ─────────── Счётчики ─────────── */

function scramble(el) {
  const target = el.dataset.count;
  if (RM) { el.textContent = target; return; }
  const dur = 1500, start = performance.now();
  const frame = now => {
    const p = clamp((now - start) / dur, 0, 1);
    let out = '';
    for (let i = 0; i < target.length; i++) {
      out += p >= (i + 1) / target.length ? target[i] : Math.floor(Math.random() * 10);
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

const statsIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('[data-count]').forEach(scramble);
    statsIo.unobserve(e.target);
  });
}, { threshold: 0.35 });
const stats = document.querySelector('.hero__stats');
if (stats) statsIo.observe(stats);

/* ─────────── Кастомный курсор + магнитные элементы ─────────── */

(() => {
  const cur = document.getElementById('cursor');
  if (!cur || RM || !window.matchMedia('(hover: hover)').matches) return;

  document.documentElement.classList.add('custom-cursor');
  const label = cur.querySelector('.cursor__label');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  let pointerFrame = 0;

  window.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    cur.classList.add('is-on');
    if (!pointerFrame && !document.hidden) pointerFrame = requestAnimationFrame(loop);
  }, { passive: true });

  const loop = () => {
    pointerFrame = 0;
    if (document.hidden) return;
    x = lerp(x, tx, 0.2); y = lerp(y, ty, 0.2);
    const moving = Math.abs(x-tx) + Math.abs(y-ty) > .1;
    if (!moving) { x = tx; y = ty; }
    cur.style.transform = `translate(${x}px, ${y}px)`;
    if (moving) pointerFrame = requestAnimationFrame(loop);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
  });

  /* делегирование, а не подписка на каждый элемент:
     часть data-cursor проставляется скриптами позже (например, фото
     получают его от просмотрщика) и не попала бы в разовый querySelectorAll */
  let hovered = null;
  document.addEventListener('mouseover', e => {
    /* пин приоритетнее карточки: на нём курсор схлопывается в точку,
       а не раздувается в кляксу с иконкой увеличения от родительской .ph */
    const pin = e.target.closest?.('.hotspot, .object-contour');
    if (pin) {
      if (pin === hovered) return;
      hovered = pin;
      cur.classList.remove('is-big');
      cur.classList.add('is-dot');
      if (label) label.textContent = '';
      return;
    }
    const el = e.target.closest?.('[data-cursor]');
    if (!el || el === hovered) return;
    hovered = el;
    cur.classList.remove('is-dot');
    cur.classList.add('is-big');
    if (label) label.textContent = el.dataset.cursor;
  }, { passive: true });
  document.addEventListener('mouseout', e => {
    if (!hovered) return;
    const to = e.relatedTarget;
    if (to && hovered.contains(to)) return;
    hovered = null;
    cur.classList.remove('is-big', 'is-dot');
    if (label) label.textContent = '';
  }, { passive: true });

  /* магнит */
  document.querySelectorAll('.magnetic').forEach(el => {
    const strength = 0.32;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .5s cubic-bezier(.34,1.4,.64,1)';
      el.style.transform = '';
      setTimeout(() => (el.style.transition = ''), 500);
    });
  });
})();

/* ─────────── Кинетический тикер (скорость от скролла) ─────────── */

(() => {
  const track = document.getElementById('tickerTrack');
  if (!track || RM) return;

  let offset = 0, base = 0.55, vel = 0, lastY = window.scrollY;
  let visible = false, tickerFrame = 0, lastTime = 0, trackWidth = 0;
  const measureWidth = () => { trackWidth = track.scrollWidth / 3; };
  measureWidth();
  addEventListener('resize', measureWidth, {passive:true});
  document.fonts?.ready.then(measureWidth);

  window.addEventListener('scroll', () => {
    vel = visible ? (window.scrollY - lastY) * 0.35 : 0;
    lastY = window.scrollY;
  }, { passive: true });

  const loop = time => {
    tickerFrame = 0;
    if (!visible || document.hidden) { lastTime = 0; return; }
    const elapsed = lastTime ? Math.min((time-lastTime)/16.667, 2) : 1;
    lastTime = time;
    vel = lerp(vel, 0, 0.06);
    offset -= (base + vel)*elapsed;
    const w = trackWidth;
    if (w) {
      if (offset <= -w) offset += w;
      if (offset > 0) offset -= w;
    }
    track.style.transform = `translate3d(${offset}px,0,0)`;
    tickerFrame = requestAnimationFrame(loop);
  };
  const resume = () => {
    if (visible && !document.hidden && !tickerFrame) tickerFrame = requestAnimationFrame(loop);
    else if ((!visible || document.hidden) && tickerFrame) {
      cancelAnimationFrame(tickerFrame); tickerFrame = 0; lastTime = 0;
    }
  };
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    resume();
  }, {rootMargin:'100px'}).observe(track.closest('.ticker') || track);
  document.addEventListener('visibilitychange', resume);
})();

/* ─────────── Параллакс карточек ─────────── */

(() => {
  if (document.body.classList.contains('graphic-edition')) return;
  const items = [...document.querySelectorAll('[data-par]')];
  if (!items.length || RM) return;

  const offsets = new WeakMap();
  const graphicEdition = document.body.classList.contains('graphic-edition');
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    items.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const center = r.top + r.height / 2 - (offsets.get(el) || 0);
      const p = (center - vh / 2) / vh;
      const travel = graphicEdition ? 220 : 160;
      const limit = graphicEdition ? Math.min(84, vh * .11) : Infinity;
      const offset = clamp(p * parseFloat(el.dataset.par) * travel, -limit, limit);
      offsets.set(el, offset);
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
    ticking = false;
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  update();
})();

/* ─────────── Горизонтальный пин корпусов ─────────── */

(() => {
  const sec = document.getElementById('corp');
  const track = document.getElementById('corpTrack');
  const barIn = document.getElementById('corpBar');
  if (!sec || !track) return;

  let cur = 0, aim = 0, running = false;

  /* поля в начале и в конце: первая и последняя панель успевают «постоять» */
  const HEAD = 0.06, TAIL = 0.14;
  const compute = () => {
    const r = sec.getBoundingClientRect();
    const total = sec.offsetHeight - window.innerHeight;
    const raw = clamp(-r.top / (total || 1), 0, 1);
    return clamp((raw - HEAD) / (1 - HEAD - TAIL), 0, 1);
  };

  const render = () => {
    cur = lerp(cur, aim, 0.12);
    if (Math.abs(cur - aim) < 0.0004) cur = aim;
    track.style.transform = `translate3d(${(-cur * 66.6667).toFixed(3)}%,0,0)`;
    if (barIn) barIn.style.transform = `translateX(${(cur * 200).toFixed(2)}%)`;
    if (Math.abs(cur - aim) > 0.0004) requestAnimationFrame(render);
    else running = false;
  };

  /* цвет навигации по активной панели корпуса */
  const panels = [...track.querySelectorAll('[data-nav]')];

  const syncNav = () => {
    if (!nav || !panels.length) return;
    const r = sec.getBoundingClientRect();
    if (r.top > window.innerHeight - 80) return;
    /* секция ушла вверх — дальше светлая «палитра» */
    if (r.bottom < window.innerHeight * 0.5) { nav.classList.add('on-light'); return; }

    let active;
    if (isDesktop() && !RM) {
      active = panels[clamp(Math.round(aim * (panels.length - 1)), 0, panels.length - 1)];
    } else {
      const mid = window.innerHeight / 2;
      let best = Infinity;
      panels.forEach(el => {
        const b = el.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - mid);
        if (d < best) { best = d; active = el; }
      });
    }
    if (active) nav.classList.toggle('on-light', active.dataset.nav === 'light');
  };

  const onMove = () => {
    if (!isDesktop() || RM) { track.style.transform = ''; syncNav(); return; }
    aim = compute();
    syncNav();
    if (!running) { running = true; requestAnimationFrame(render); }
  };

  window.addEventListener('scroll', onMove, { passive: true });
  window.addEventListener('resize', () => { cur = aim = compute(); onMove(); });
  onMove();
})();

/* ─────────── Сборка логотипа из пикселей ─────────── */

const logoCanvas = document.getElementById('logoAssembly') ? null : document.getElementById('logoCanvas');
const logoSection = document.getElementById('logo');

/* ─────────── Сетка знака ───────────
   Растр логотипа просчитан заранее и зашит сюда строками:
   «.» — пусто, «w» — бордо, «c» — графит.
   Так знак собирается и при открытии файла напрямую (file://),
   где Chrome считает каждый локальный файл отдельным origin:
   <object> с SVG не читается, а canvas.getImageData падает
   с SecurityError — из-за этого сборка раньше не запускалась. */
const LOGO_GRID = [
  '...............cccc...............',
  '.............cccccccc.............',
  '...........cccccccccccc...........',
  '.........ccccccc..ccccccc.........',
  '.......ccccccc......ccccccc.......',
  '.....ccccccc....ww....ccccccc.....',
  '...ccccccc.....wwww.....ccccccc...',
  '.ccccccc.......wwww.......ccccccc.',
  'cccccc....wwww..ww..wwww....cccccc',
  'cccc..cc..wwww..ww..wwww..cc..cccc',
  '.....ccc...www..ww...ww...ccc.....',
  '.....ccc........ww........ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '.....ccc...ww...ww...ww...ccc.....',
  '......c...www...ww...www...c......',
  '.........www....ww....www.........',
  '.........ww.....ww.....ww.........',
  '................ww................',
  '..................................',
  '..................................',
  '........ww......ww......www.......',
  '......wwww.....www.....wwwww......',
  '......wwww.....www.....w..ww......',
  '........ww....wwww.......ww.......',
  '........ww...wwwwww....www........',
  '........ww....wwwww....wwwww......',
  '........ww.......w.....wwwww......',
  '..................................',
  '..............................c...',
  'cc.cc.cc.cc.cc..cccc..ccccc.ccccc.',
  'cc.cc.cc.ccccc.cc.ccc.cc.cc.cc.cc.',
  'cc.cc.cc.cccc..cc.ccc.cc.cc.ccccc.',
  'cccccccc.ccccc.cc.ccc.cc.cc.cc.cc.',
  'cccccccc.cc.ccc.cccc.ccc.cc.ccccc.',
  '..................................',
  '..................................',
  'ww.wwwwwwwww..wwww.wwwwwwwwwwwwww.',
  'wwwwwwwwwwww..wwww.w.www.wwww.w.w.',
  '..................................'
];
const PX_WARM = '#813630';   /* бордо — как в самом логотипе */
const PX_COOL = '#474A51';   /* графит — как в самом логотипе */

let logoPixels = [];

const easeOutBack = t => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function makePixel(l, t, w, h, color, order) {
  const px = document.createElement('span');
  px.className = 'build__px';
  px.style.cssText = `width:calc(${w}% - var(--px-gap));height:calc(${h}% - var(--px-gap));left:${l}%;top:${t}%;background:${color}`;
  const a = Math.random() * Math.PI * 2;
  const d = 55 + Math.random() * 65;
  px.dataset.sx = (Math.cos(a) * d).toFixed(1);
  px.dataset.sy = (Math.sin(a) * d).toFixed(1);
  px.dataset.sr = ((Math.random() - .5) * 720).toFixed(0);
  px.dataset.order = order.toFixed(4);
  return px;
}

function applyLogoProgress(progress) {
  for (const px of logoPixels) {
    const order = parseFloat(px.dataset.order);
    const local = clamp((progress - order * .62) / .38, 0, 1);
    const p = easeOutBack(local);
    px.style.opacity = String(.55 + p * .45);
    px.style.transform =
      `translate(${parseFloat(px.dataset.sx) * (1 - p)}vw, ${parseFloat(px.dataset.sy) * (1 - p)}vh)` +
      ` rotate(${parseFloat(px.dataset.sr) * (1 - p)}deg) scale(${.05 + p * .95})`;
  }
}

/* ─── сборка знака привязана к прокрутке внутри залипающей секции ─── */
const logoBar = document.getElementById('logoBar');
const logoGrid = document.getElementById('logoGrid');
const logoReal = document.getElementById('logoReal');
let logoCur = 0, logoAim = 0, logoRunning = false;

const LOGO_HEAD = 0.08, LOGO_TAIL = 0.24;   /* поля: старт не сразу, финал держится */
const MERGE_AT = 0.74;                       /* с этого момента сетка срастается в знак */

/* последняя четверть сборки: зазоры между пикселями схлопываются,
   сетка становится сплошной и уступает место оригинальному SVG */
function applyMerge(p) {
  const m = clamp((p - MERGE_AT) / (1 - MERGE_AT), 0, 1);
  const e = m * m * (3 - 2 * m);            /* smoothstep */
  if (logoCanvas) {
    logoCanvas.style.setProperty('--px-gap', (2 - 2 * e).toFixed(2) + 'px');
    logoCanvas.style.setProperty('--px-r', (2 - 2 * e).toFixed(2) + 'px');
  }
  if (logoGrid) logoGrid.style.opacity = (1 - e).toFixed(3);
  if (logoReal) logoReal.style.opacity = e.toFixed(3);
}

function logoScrollProgress() {
  if (!logoSection) return 1;
  const r = logoSection.getBoundingClientRect();
  const total = logoSection.offsetHeight - window.innerHeight;
  if (total <= 0) return clamp(1 - r.bottom / (window.innerHeight * 1.4), 0, 1);
  const raw = clamp(-r.top / total, 0, 1);
  return clamp((raw - LOGO_HEAD) / (1 - LOGO_HEAD - LOGO_TAIL), 0, 1);
}

function logoRender() {
  logoCur = lerp(logoCur, logoAim, 0.16);
  if (Math.abs(logoCur - logoAim) < 0.0015) logoCur = logoAim;
  applyLogoProgress(logoCur);
  applyMerge(logoCur);
  if (logoBar) logoBar.style.width = (logoCur * 100).toFixed(1) + '%';
  logoCanvas?.classList.toggle('is-assembled', logoCur > 0.98);
  if (Math.abs(logoCur - logoAim) > 0.0015) requestAnimationFrame(logoRender);
  else logoRunning = false;
}

function onLogoScroll() {
  if (!logoPixels.length) return;
  logoAim = logoScrollProgress();
  if (!logoRunning) { logoRunning = true; requestAnimationFrame(logoRender); }
}

function buildLogo() {
  if (!logoCanvas) return;
  const gh = LOGO_GRID.length;
  const gw = LOGO_GRID[0].length;
  const cw = 100 / gw, ch = 100 / gh;
  const maxD = Math.hypot(50, 50);
  const cells = [];

  for (let y = 0; y < gh; y++) {
    const row = LOGO_GRID[y];
    for (let x = 0; x < gw; x++) {
      const ch0 = row[x];
      if (ch0 === '.') continue;
      const order = Math.hypot(x * cw + cw / 2 - 50, y * ch + ch / 2 - 50) / maxD;
      cells.push({ x, y, color: ch0 === 'w' ? PX_WARM : PX_COOL, order });
    }
  }
  if (!cells.length) { applyMerge(1); return; }   /* остаётся оригинальный SVG */

  cells.sort((a, b) => a.order - b.order);
  const frag = document.createDocumentFragment();
  cells.forEach(c => frag.appendChild(makePixel(c.x * cw, c.y * ch, cw, ch, c.color, c.order)));
  const host = logoGrid || logoCanvas;
  host.innerHTML = '';
  host.appendChild(frag);
  logoPixels = [...host.querySelectorAll('.build__px')];

  if (RM) {
    applyLogoProgress(1); applyMerge(1);
    if (logoBar) logoBar.style.width = '100%';
    return;
  }
  applyLogoProgress(0);
  applyMerge(0);
  window.addEventListener('scroll', onLogoScroll, { passive: true });
  window.addEventListener('resize', onLogoScroll);
  onLogoScroll();
}
buildLogo();

/* ─────────── Хотспоты ─────────── */

(() => {
  const sc = document.getElementById('spaceScroller');
  if (!sc) return;
  const prev = document.getElementById('spacePrev');
  const next = document.getElementById('spaceNext');
  let down = false, sx = 0, sl = 0, moved = 0;

  const maxLeft = () => sc.scrollWidth - sc.clientWidth;
  const cards = [...sc.querySelectorAll('.space__card')];
  const categoryTitle = document.getElementById('spaceCategoryTitle');
  const categoryDescription = document.getElementById('spaceCategoryDescription');
  const categoryNumber = document.getElementById('spaceCategoryNumber');
  const categoryCopy = categoryTitle?.closest('.space__category-copy');
  let categoryGhost = null, categoryAnimations = [];
  let activeCategory = '', scheduled = false;
  const padding = () => parseFloat(getComputedStyle(sc).paddingLeft) || 0;
  const cardLeft = card => sc.scrollLeft + card.getBoundingClientRect().left - sc.getBoundingClientRect().left - padding();
  const syncCategory = () => {
    if (!categoryTitle || !cards.length) return;
    const probe = sc.getBoundingClientRect().left + padding() + Math.min(120, sc.clientWidth * .2);
    let current = cards[0];
    for (const card of cards) {
      if (card.getBoundingClientRect().left <= probe) current = card;
    }
    if (sc.scrollLeft >= maxLeft() - 2) current = cards[cards.length - 1];
    if (current.dataset.category === activeCategory) return;
    const firstCategory = !activeCategory;
    const direction = Number(current.dataset.categoryNumber) >= Number(categoryNumber.textContent) ? 1 : -1;
    categoryAnimations.forEach(animation => animation.cancel());
    categoryAnimations = [];
    categoryGhost?.remove();
    categoryGhost = null;
    if (!firstCategory && !RM && categoryCopy) {
      categoryGhost = categoryCopy.cloneNode(true);
      categoryGhost.classList.add('space__category-ghost');
      categoryGhost.setAttribute('aria-hidden', 'true');
      categoryGhost.setAttribute('aria-live', 'off');
      categoryGhost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      categoryCopy.appendChild(categoryGhost);
    }
    activeCategory = current.dataset.category;
    categoryTitle.textContent = current.dataset.categoryTitle;
    categoryDescription.textContent = current.dataset.categoryDescription;
    categoryNumber.textContent = current.dataset.categoryNumber;
    sc.dataset.activeCategory = activeCategory;
    if (categoryGhost) {
      const outgoing = categoryGhost;
      const exit = outgoing.animate([
        {opacity:1,transform:'translateY(0)'},
        {opacity:0,transform:`translateY(${-18 * direction}px)`}
      ], {duration:240,easing:'cubic-bezier(.4,0,1,1)',fill:'both'});
      categoryAnimations.push(exit);
      exit.finished.then(() => outgoing.remove()).catch(() => {});
      [categoryTitle, categoryDescription].forEach((el,index) => {
        categoryAnimations.push(el.animate([
          {opacity:0,transform:`translateY(${30 * direction}px)`},
          {opacity:1,transform:'translateY(0)'}
        ], {duration:540,delay:90 + index * 65,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
      });
      categoryAnimations.push(categoryNumber.animate([
        {opacity:0,transform:`translateY(${8 * direction}px)`},
        {opacity:1,transform:'translateY(0)'}
      ], {duration:360,easing:'ease-out',fill:'both'}));
    }
  };
  const move = direction => {
    const positions = cards.map(cardLeft);
    const target = direction > 0
      ? positions.find(left => left > sc.scrollLeft + 3) ?? maxLeft()
      : positions.reverse().find(left => left < sc.scrollLeft - 3) ?? 0;
    sc.scrollTo({ left: clamp(target, 0, maxLeft()), behavior: RM ? 'auto' : 'smooth' });
  };

  const syncButtons = () => {
    if (prev) prev.disabled = sc.scrollLeft <= 2;
    if (next) next.disabled = sc.scrollLeft >= maxLeft() - 2;
    syncCategory();
  };
  sc.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; syncButtons(); });
  }, { passive: true });
  window.addEventListener('resize', syncButtons);
  syncButtons();

  prev?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));

  /* перетаскивание мышью.
     Без setPointerCapture: с захватом браузер адресует последующий click
     самому скроллеру, и клик по карточке не доходит до просмотрщика фото.
     Поэтому move/up слушаем на document — тянуть можно и за пределами блока. */
  sc.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = 0;
    sx = e.clientX; sl = sc.scrollLeft;
    sc.classList.add('is-dragging');
  });
  document.addEventListener('pointermove', e => {
    if (!down) return;
    const d = e.clientX - sx;
    moved = Math.abs(d);
    if (moved > 3) e.preventDefault();
    sc.scrollLeft = sl - d;
  });
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => {
    if (!down) return;
    down = false;
    sc.classList.remove('is-dragging');
    syncButtons();
  }));
  sc.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  /* колесо мыши: вертикальный жест листает по горизонтали,
     на краях управление отдаётся странице */
  sc.addEventListener('wheel', e => {
    if (RM) return;
    const dy = e.deltaY, dx = e.deltaX;
    if (Math.abs(dx) > Math.abs(dy)) return;          /* горизонтальный жест — нативно */
    const atStart = sc.scrollLeft <= 1;
    const atEnd = sc.scrollLeft >= maxLeft() - 1;
    if ((atStart && dy < 0) || (atEnd && dy > 0)) return;
    e.preventDefault();
    sc.scrollLeft += dy;
    syncButtons();
  }, { passive: false });

  /* стрелки с клавиатуры, когда фокус внутри блока */
  sc.setAttribute('tabindex', '0');
  sc.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    move(e.key === 'ArrowRight' ? 1 : -1);
  });
})();

/* ─────────── Параллакс фона hero ─────────── */

(() => {
  const bands = document.querySelector('.hero__bands');
  if (!bands || RM) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) bands.style.translate = `0 ${(y * 0.22).toFixed(1)}px`;
  }, { passive: true });
})();

/* ─────────── Просмотр фотографий ───────────
   Клик по кадру открывает полный, некадрированный снимок.
   Полные версии лежат в img/photo/full/ и грузятся только по требованию. */

(() => {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  const img   = document.getElementById('lbImg');
  const title = document.getElementById('lbTitle');
  const count = document.getElementById('lbCount');
  const btnPrev = document.getElementById('lbPrev');
  const btnNext = document.getElementById('lbNext');
  const btnClose = document.getElementById('lbClose');

  const items = [...document.querySelectorAll('[data-full]')];
  if (!items.length) return;

  let index = -1, lastFocus = null;

  const captionOf = el => {
    const fig = el.closest('figure');
    if (fig?.querySelector('.concept-label')) return el.querySelector('img')?.alt || 'Концепт';
    const b = fig?.querySelector('figcaption b') || fig?.querySelector('figcaption');
    return (b?.textContent || el.querySelector('img')?.alt || '').trim();
  };

  function show(i) {
    index = (i + items.length) % items.length;
    const el = items[index];
    img.src = el.dataset.full;
    img.alt = el.querySelector('img')?.alt || captionOf(el);
    title.textContent = captionOf(el);
    count.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    btnClose.focus({ preventScroll: true });
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    /* removeAttribute, а не src='': пустой src резолвится в адрес самой
       страницы и браузер считает картинку битой */
    setTimeout(() => { lb.hidden = true; img.removeAttribute('src'); }, RM ? 0 : 320);
    lastFocus?.focus?.({ preventScroll: true });
  }

  /* открытие: мышь, Enter и пробел */
  items.forEach((el, i) => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Открыть фото: ' + captionOf(el));
    el.setAttribute('data-cursor', '⤢');
    el.addEventListener('click', () => open(i));
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault(); open(i);
    });
  });

  btnPrev.addEventListener('click', () => show(index - 1));
  btnNext.addEventListener('click', () => show(index + 1));
  btnClose.addEventListener('click', close);
  lb.querySelector('[data-lb-close]').addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    if (e.key === 'Tab') {         /* фокус не уходит из окна просмотра */
      const f = [btnClose, btnPrev, btnNext];
      const cur = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(cur + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* свайп на тач-устройствах */
  let tx = 0;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const d = e.changedTouches[0].clientX - tx;
    if (Math.abs(d) > 60) show(index + (d < 0 ? 1 : -1));
  }, { passive: true });
})();

// Enable enhanced presentation only after initialization has succeeded.
document.documentElement.classList.remove('no-js');
initPreloader();

