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


;
/* Linked labels, photo-space object contours and a masked spotlight on selection. */
(() => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const ns = 'http://www.w3.org/2000/svg';
  const resetters = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let maskCount = 0;
  const node = (name, attrs = {}) => {
    const el = document.createElementNS(ns, name);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  };
  const xy = point => point.map(v => Number(v.toFixed(3))).join(' ');
  const outlinePath = (points, shape) => {
    const count = points.length;
    if (shape === 'cup' || shape === 'badge') {
      // Short cubic tangents keep the handle and rim curved without ballooning the outline.
      let path = `M ${xy(points[0])}`;
      for (let i = 0; i < count; i++) {
        const a=points[(i+count-1)%count],b=points[i],c=points[(i+1)%count],d=points[(i+2)%count];
        const c1=[b[0]+(c[0]-a[0])*.105,b[1]+(c[1]-a[1])*.105];
        const c2=[c[0]-(d[0]-b[0])*.105,c[1]-(d[1]-b[1])*.105];
        path+=` C ${xy(c1)} ${xy(c2)} ${xy(c)}`;
      }
      return path+' Z';
    }
    // Paper keeps its straight edges; only the very corners are softened.
    const radius = shape === 'paper' ? 1.3 : shape === 'pen' ? 0.8 : 3;
    const corners=points.map((p,i)=>{
      const prev=points[(i+count-1)%count],next=points[(i+1)%count];
      const before=Math.hypot(prev[0]-p[0],prev[1]-p[1]),after=Math.hypot(next[0]-p[0],next[1]-p[1]);
      const r=Math.min(radius,before*.2,after*.2);
      return {point:p,in:[p[0]+(prev[0]-p[0])*r/(before||1),p[1]+(prev[1]-p[1])*r/(before||1)],out:[p[0]+(next[0]-p[0])*r/(after||1),p[1]+(next[1]-p[1])*r/(after||1)]};
    });
    let path=`M ${xy(corners[0].out)}`;
    for(let i=1;i<=count;i++){
      const corner=corners[i%count];
      path+=` L ${xy(corner.in)} Q ${xy(corner.point)} ${xy(corner.out)}`;
    }
    return path+' Z';
  };
  const connectionEnd = (path, start, top) => {
    const length=path.getTotalLength();
    const score=p=>top?p.y:(p.x-start[0])**2+(p.y-start[1])**2;
    let best=0,bestScore=Infinity;
    for(let i=0;i<=32;i++){
      const at=length*i/32,value=score(path.getPointAtLength(at));
      if(value<bestScore){bestScore=value;best=at;}
    }
    const center=best;
    for(let i=-8;i<=8;i++){
      const at=clamp(center+length*i/256,0,length),value=score(path.getPointAtLength(at));
      if(value<bestScore){bestScore=value;best=at;}
    }
    const point=path.getPointAtLength(best);
    return [point.x,point.y,length ? best / length : 0];
  };
  const runSequence = group => {
    group.animations?.forEach(animation => animation.cancel());
    group.animations = [];
    const stagger = 30, lineDuration = 360, outlineDuration = 420, pause = 45;
    const lastDelay = (group.parts.length - 1) * stagger;
    const outlineStart = group.reverse ? 0 : lineDuration + lastDelay + pause;
    const lineStart = group.reverse ? outlineDuration + lastDelay + pause : 0;
    group.parts.forEach(({contour,reveal},index) => {
      contour.style.strokeDasharray = reduceMotion ? '1 0' : '0 1';
      reveal.style.strokeDashoffset = reduceMotion ? '0' : '1';
      if (reduceMotion) return;
      const options = {fill:'both',easing:'cubic-bezier(.4,0,.2,1)'};
      group.animations.push(
        reveal.animate([{strokeDashoffset:1},{strokeDashoffset:0}],{
          ...options,duration:lineDuration,delay:lineStart + index * stagger
        }),
        contour.animate([{strokeDasharray:'0 1'},{strokeDasharray:'1 0'}],{
          ...options,duration:outlineDuration,delay:outlineStart + index * stagger
        })
      );
    });
    group.playDirection = !!group.reverse;
    group.playing = true;
  };
  document.querySelectorAll('.shot').forEach(shot => {
    const frame = shot.querySelector('.ph'), image = frame?.querySelector('img');
    if (!image) return;
    const spots = [...shot.querySelectorAll('.hotspot')];
    const groups = new Map();
    let selected = null;
    spots.forEach(spot => {
      const fallback = {x:Number(spot.dataset.photoX),y:Number(spot.dataset.photoY),w:Number(spot.dataset.boxW),h:Number(spot.dataset.boxH)};
      const targets = spot.dataset.targets ? JSON.parse(spot.dataset.targets) : [fallback];
      const maskId = `merch-mask-${++maskCount}`;
      const shade = node('svg', {class:'hotspot__spotlight', 'aria-hidden':'true'});
      const svg = node('svg', {class:'hotspot__connections', 'aria-hidden':'true'});
      const lineDefs = node('defs');
      svg.appendChild(lineDefs);
      const defs = node('defs');
      const mask = node('mask', {id:maskId,maskUnits:'userSpaceOnUse','mask-type':'luminance'});
      const base = node('rect', {class:'spotlight-base',x:0,y:0,width:'100%',height:'100%'});
      mask.appendChild(base);defs.appendChild(mask);
      shade.append(defs,node('rect',{class:'spotlight-dim',x:0,y:0,width:'100%',height:'100%',mask:`url(#${maskId})`}));
      const parts = targets.map((target, index) => {
        const lineMaskId = `${maskId}-line-${index}`;
        const lineMask = node('mask',{id:lineMaskId,maskUnits:'userSpaceOnUse','mask-type':'luminance',x:0,y:0,width:'100%',height:'100%'});
        const reveal = node('path',{class:'connection-reveal',pathLength:1});
        lineMask.appendChild(reveal);lineDefs.appendChild(lineMask);
        const line = node('path',{class:'connection-line'});
        line.setAttribute('mask',`url(#${lineMaskId})`);
        const contour = node('path',{class:'object-contour',pathLength:1});
        [reveal,line,contour].forEach(el=>el.style.setProperty('--target-order',index));
        const cutout = node('path',{class:'spotlight-cutout'});
        svg.append(line,contour);mask.appendChild(cutout);
        return {target,line,contour,cutout,reveal};
      });
      frame.append(shade,svg);groups.set(spot,{shade,svg,parts});
    });
    const position = () => {
      const width=frame.clientWidth,height=frame.clientHeight;
      if (!image.naturalWidth || !width || !height) return;
      const fr=frame.getBoundingClientRect(),ir=image.getBoundingClientRect();
      const scale=Math.max(ir.width/image.naturalWidth,ir.height/image.naturalHeight);
      const dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
      const op=getComputedStyle(image).objectPosition.split(' ').map(v=>parseFloat(v)/100);
      const project=([x,y])=>[ir.left-fr.left+x*dw-(dw-ir.width)*op[0],ir.top-fr.top+y*dh-(dh-ir.height)*op[1]];
      spots.forEach(spot=>{
        const [x,y]=project([Number(spot.dataset.photoX),Number(spot.dataset.photoY)]);
        spot.style.setProperty('--x',x+'px');spot.style.setProperty('--y',y+'px');
        const tw=Math.min(180,innerWidth-64);
        spot.style.setProperty('--tip-left',(clamp(x-tw/2,8,width-tw-8)-x+22)+'px');
        const group=groups.get(spot),tag=shot.querySelector(`[data-pin="${spot.id}"]`);
        [group.shade,group.svg].forEach(svg=>svg.setAttribute('viewBox',`0 0 ${width} ${height}`));
        const tr=tag?.getBoundingClientRect();
        const start=tr?[tr.left+tr.width/2-fr.left,tr.top-fr.top]:[x,y];
        group.parts.forEach(({target,line,contour,cutout,reveal})=>{
          const outline=target.outline || Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return [target.x+Math.cos(a)*target.w/2,target.y+Math.sin(a)*target.h/2]});
          const points=outline.map(project);
          const d=outlinePath(points,target.shape||'rounded');
          contour.setAttribute('d',d);cutout.setAttribute('d',d);
          const end=connectionEnd(contour,start,target.route==='arch');
          // Start the outline exactly where the connection meets the object.
          contour.style.strokeDashoffset = String(-end[2]);
          let connection=group.reverse
            ? `M ${end[0]} ${end[1]} L ${start[0]} ${start[1]}`
            : `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`;
          if(target.route==='arch'){
            const dx=end[0]-start[0];
            const rise=clamp(Math.abs(dx)*.45,48,140);
            const c1=[start[0]+dx*.12,Math.max(12,start[1]-rise)];
            const c2=[end[0]-dx*.2,Math.max(12,end[1]-rise)];
            connection=group.reverse
              ? `M ${end[0]} ${end[1]} C ${c2[0]} ${c2[1]} ${c1[0]} ${c1[1]} ${start[0]} ${start[1]}`
              : `M ${start[0]} ${start[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${end[0]} ${end[1]}`;
          }
          line.setAttribute('d',connection);reveal.setAttribute('d',connection);
        });
      });
    };
    const paint = () => {
      if (!selected?.classList.contains('is-linked')) selected=spots.find(s=>s.classList.contains('is-linked'))||null;
      shot.querySelector('.shot__visual')?.classList.toggle('is-inspecting',!!selected);
      if(selected)position();
      groups.forEach((group,spot)=>{
        const active = spot === selected;
        [group.svg,group.shade].forEach(el=>el.classList.toggle('is-linked',active));
        if(active && (!group.playing || group.playDirection !== !!group.reverse))runSequence(group);
        if(!active)group.playing = false;
      });
    };
    image.addEventListener('load',position);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(position).observe(frame);
    window.addEventListener('resize',position);document.fonts?.ready.then(position);position();
    spots.forEach(spot=>{
      const tag=shot.querySelector(`[data-pin="${spot.id}"]`);
      let hovered=false,focused=false,pinned=false;
      const sync=()=>{
        const active=pinned||hovered||focused;
        spot.classList.toggle('is-linked',active);tag?.classList.toggle('is-linked',active);
        spot.classList.toggle('is-active',pinned);spot.setAttribute('aria-expanded',String(active));
        if(active)selected=spot;paint();
      };
      resetters.push(()=>{pinned=false;sync();});
      const group=groups.get(spot);
      const setDirection=control=>{
        const reverse=control!==tag;
        group.reverse=reverse;
        group.svg.dataset.direction=reverse?'to-label':'to-object';
      };
      [spot,tag,...group.parts.map(part=>part.contour)].filter(Boolean).forEach(control=>{
        control.addEventListener('mouseenter',()=>{setDirection(control);hovered=true;sync();});
        control.addEventListener('mouseleave',()=>{hovered=false;sync();});
        control.addEventListener('focus',()=>{setDirection(control);focused=true;sync();});
        control.addEventListener('blur',()=>{focused=false;sync();});
        control.addEventListener('click',event=>{event.stopPropagation();setDirection(control);const next=!pinned;resetters.forEach(reset=>reset());pinned=next;sync();});
      });
    });
  });
  document.addEventListener('click',()=>resetters.forEach(reset=>reset()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')resetters.forEach(reset=>reset());});
})();

;
/* Scroll and pointer motion settles to rest; there is no perpetual render loop. */
(() => {
  // Start entrances just before the viewport; tall panels need no visible-area threshold.
  // The main observer remains responsible for the first edition of the landing page.
  if (document.body.classList.contains('graphic-edition')) {
    const entrances = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        entrances.unobserve(entry.target);
      }
    }, {rootMargin:'240px 0px', threshold:0});
    document.querySelectorAll('.reveal, .mask, .kinetic').forEach(element => entrances.observe(element));
  }
  const panels = [...document.querySelectorAll('[data-graphic-motion]')];
  if (!panels.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bound = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const states = panels.map(panel => ({
    panel, frame: panel.querySelector('.graphic-panel__frame'), visible: false,
    progress: .5, aim: .5, x: 0, y: 0, aimX: 0, aimY: 0,
    roofs: [...panel.querySelectorAll('[data-roof-level]')],
    windows: panel.querySelector('[data-window-drift]'),
    routes: [...panel.querySelectorAll('[data-route-path]')].map(path => ({
      path, length: path.getTotalLength(), value: 0, target: 0, boostStart: null, boostFrom: 0,
      head: panel.querySelector(`[data-route-head="${path.dataset.routePath}"]`),
      runner: panel.querySelector(`[data-route-runner="${path.dataset.routePath}"]`),
    })),
    runners: [...panel.querySelectorAll('[data-route-runner]')],
    copy: [...panel.querySelectorAll('[data-scroll-line]')],
    facade: Object.fromEntries([...panel.querySelectorAll('[data-facade-cell]')].map(rect => [rect.dataset.facadeCell, rect])),
    facadeGrid: panel.querySelector('[data-facade-grid]'),
    travel: Math.max(320, panel.clientWidth * .9),
  }));
  let request = 0, previousTime = 0;
  states.forEach(state => { if (state.copy.length) state.progress = state.aim = 0; });
  const paint = state => {
    const p = reduced.matches ? .5 : state.progress;
    const x = reduced.matches ? 0 : state.x;
    const y = reduced.matches ? 0 : state.y;
    if (state.roofs.length) {
      const apex = 800 + (p - .5) * 280 + x * 120;
      state.roofs.forEach(path => {
        const level = Number(path.dataset.roofLevel);
        const peak = level * 35 - 360 + y * 30;
        path.setAttribute('d', `M-400 ${peak + (apex + 400) * .5045}L${apex} ${peak}L2000 ${peak + (2000 - apex) * .5045}`);
      });
    }
    state.windows?.setAttribute('transform', `translate(${(p - .5) * 110 + x * 26} ${(p - .5) * -55 + y * 20})`);
    if (state.facadeGrid) {
      const left = 620 + (p - .5) * 220 + x * 24;
      const right = 980 + (p - .5) * 160 + x * 24;
      const top = 290 + (p - .5) * 120 + y * 22;
      const bottom = 490 - (p - .5) * 100 + y * 22;
      const cells = {
        leftTop: [0,0,left,top], leftBottom: [0,top,left,720-top],
        middle: [left,0,right-left,720], rightTop: [right,0,1600-right,bottom],
        rightBottom: [right,bottom,1600-right,720-bottom],
      };
      Object.entries(cells).forEach(([name, values]) => values.forEach((value,i) => state.facade[name].setAttribute(['x','y','width','height'][i],value)));
      state.facadeGrid.setAttribute('d',`M${left} 0V720M${right} 0V720M0 ${top}H${right}M${left} ${bottom}H1600`);
    }
    state.copy.forEach((line, i) => {
      const phase = reduced.matches ? 1 : bound((p - .12 - i * .045) / .33, 0, 1);
      const ease = 1 - (1 - phase) ** 3;
      line.style.transform = `translate3d(${((1 - ease) * state.travel).toFixed(2)}px,0,0)`;
      line.style.opacity = Math.min(1, phase * 2).toFixed(3);
    });
    state.routes.forEach(route => {
      const progress = reduced.matches ? 1 : route.value;
      const point = route.path.getPointAtLength(progress * route.length);
      route.runner?.setAttribute('cx', point.x);
      route.runner?.setAttribute('cy', point.y);
      route.head?.classList.toggle('is-lit', progress >= .9999);
      route.runner?.classList.toggle('is-absorbed', progress >= .9999);
    });
  };
  const tick = time => {
    request = 0;
    if (document.hidden || reduced.matches) return;
    const elapsed = previousTime ? Math.min(40, time - previousTime) : 16;
    previousTime = time;
    let moving = false;
    for (const state of states) {
      if (!state.visible) continue;
      for (const [value, target] of [['progress','aim'],['x','aimX'],['y','aimY']]) {
        const delta = state[target] - state[value];
        if (Math.abs(delta) > .0004) { state[value] += delta * .24; moving = true; }
        else state[value] = state[target];
      }
      state.routes.forEach(route => {
        if (route.boostStart !== null) {
          const burst = bound((time - route.boostStart) / 260, 0, 1);
          route.value = route.boostFrom + (1 - route.boostFrom) * burst ** 2.5;
          if (burst < 1) moving = true;
        } else {
          const delta = route.target - route.value;
          if (Math.abs(delta) < .00015) route.value = route.target;
          else { route.value += delta * (1 - Math.exp(-elapsed / 140)); moving = true; }
        }
      });
      paint(state);
    }
    if (moving) request = requestAnimationFrame(tick);
    else previousTime = 0;
  };
  const wake = () => { if (!request && !reduced.matches && !document.hidden) request = requestAnimationFrame(tick); };
  const measure = () => {
    for (const state of states) {
      if (!state.visible) continue;
      const rect = state.frame.getBoundingClientRect();
      state.travel = Math.max(320, rect.width * .9);
      state.aim = bound((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
      if (state.routes.length) {
        state.progress = state.aim;
        const header = document.getElementById('nav');
        const trigger = Math.max(0, header?.getBoundingClientRect().bottom || 0) + 15;
        state.routes.forEach(route => {
          if (!route.head) return;
          const headTop = route.head.getBoundingClientRect().top;
          route.target = .62 * bound(1 - (headTop - trigger) / Math.max(1, innerHeight - trigger), 0, 1);
          if (headTop <= trigger && route.boostStart === null) {
            route.boostStart = performance.now();
            route.boostFrom = route.value;
          } else if (headTop > trigger + 8) {
            route.boostStart = null;
          }
        });
        paint(state);
        continue;
      }
      // Large jumps should immediately show the composition at the new scroll position.
      if (Math.abs(state.aim - state.progress) > .15) {
        state.progress = state.aim;
        paint(state);
      }
    }
    wake();
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.find(item => item.panel === entry.target);
      if (entry.isIntersecting && !state.visible) {
        const rect = state.frame.getBoundingClientRect();
        state.progress = state.aim = bound((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
        paint(state);
      }
      state.visible = entry.isIntersecting;
    }
    measure();
  }, {rootMargin:'100px 0px'});
  states.forEach(state => {
    paint(state);
    observer.observe(state.panel);
    state.frame.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reduced.matches) return;
      const rect = state.frame.getBoundingClientRect();
      state.aimX = bound((event.clientX - rect.left) / rect.width - .5, -.5, .5);
      state.aimY = bound((event.clientY - rect.top) / rect.height - .5, -.5, .5);
      wake();
    }, {passive:true});
    state.frame.addEventListener('pointerleave', () => { state.aimX = state.aimY = 0; wake(); });
  });
  addEventListener('scroll', measure, {passive:true});
  addEventListener('resize', measure, {passive:true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) measure(); });
  reduced.addEventListener('change', () => { states.forEach(paint); measure(); });
})();

;
/* One colour wave crosses all three type specimens, then reverses on the next click. */
(() => {
  document.querySelectorAll('.type-poster--medium').forEach(poster => {
    const button = poster.querySelector('.type-poster__toggle');
    if (!button) return;
    const grid = poster.closest('.type-editorial__grid');
    const display = grid?.querySelector('.type-poster--display');
    const reading = grid?.querySelector('.type-poster--reading');
    const cards = [display, poster, reading].filter(Boolean);
    const header = document.getElementById('nav');
    const syncStickyTop = () => grid?.style.setProperty('--type-header-height', `${Math.ceil(header?.getBoundingClientRect().height || 68)}px`);
    syncStickyTop();
    addEventListener('resize', syncStickyTop, {passive:true});
    document.fonts?.ready.then(syncStickyTop);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let overlays = [], animations = [], wave = 0;

    const clearWave = () => {
      wave++;
      animations.forEach(animation => animation.cancel());
      overlays.forEach(overlay => overlay.remove());
      cards.forEach(card => card.classList.remove('is-colour-wiping'));
      overlays = [];
      animations = [];
    };

    const render = dark => {
      poster.classList.toggle('is-dark', dark);
      display?.classList.toggle('is-light', dark);
      reading?.classList.toggle('is-dark', dark);
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Вернуть исходные цвета карточек' : 'Переключить цвета карточек');
    };

    const changeColours = dark => {
      clearWave();
      if (reduced.matches || !cards.every(card => typeof card.animate === 'function')) {
        render(dark);
        return;
      }
      const snapshots = cards.map(card => {
        const rect = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        const overlay = card.cloneNode(true);
        overlay.classList.add('type-poster__colour-overlay');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', '');
        overlay.removeAttribute('id');
        overlay.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        overlay.querySelectorAll('button,a,[tabindex]').forEach(element => element.setAttribute('tabindex', '-1'));
        overlay.style.backgroundColor = ['transparent', 'rgba(0, 0, 0, 0)'].includes(style.backgroundColor)
          ? 'var(--paper)' : style.backgroundColor;
        overlay.style.color = style.color;
        overlay.style.borderColor = style.borderColor;
        overlay.style.boxShadow = style.boxShadow;

        // Freeze colours and arrow position so the old copy survives the parent's new theme.
        const originals = [...card.querySelectorAll('*')];
        [...overlay.querySelectorAll('*')].forEach((element, index) => {
          const before = getComputedStyle(originals[index]);
          element.style.color = before.color;
          element.style.borderColor = before.borderColor;
          if (element.classList.contains('type-poster__toggle')) element.style.left = before.left;
          if (element.tagName.toLowerCase() === 'svg') element.style.transform = before.transform;
        });
        return {card, rect, overlay};
      });
      const left = Math.min(...snapshots.map(item => item.rect.left));
      const right = Math.max(...snapshots.map(item => item.rect.right));
      const width = Math.max(1, right - left);
      const duration = 240;
      snapshots.forEach(({card, overlay}) => {
        card.classList.add('is-colour-wiping');
        card.appendChild(overlay);
        overlays.push(overlay);
      });
      render(dark);
      const currentWave = wave;
      snapshots.forEach(({rect, overlay}) => {
        const delay = (dark ? rect.left - left : right - rect.right) / width * duration;
        animations.push(overlay.animate([
          {clipPath:'inset(0 0 0 0)'},
          {clipPath:dark ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)'}
        ], {duration:Math.max(70, rect.width / width * duration), delay, easing:'linear', fill:'both'}));
      });
      Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
        if (currentWave === wave) clearWave();
      });
    };

    render(poster.classList.contains('is-dark'));
    button.addEventListener('click', () => changeColours(!poster.classList.contains('is-dark')));
  });
})();

;
/* The original SVG shapes settle into their exact positions as the section scrolls. */
(() => {
  const section = document.getElementById('logo');
  const canvas = document.getElementById('logoCanvas');
  const svg = document.getElementById('logoAssembly');
  const sticky = section?.querySelector('.build__sticky');
  if (!section || !canvas || !svg || !sticky) return;

  const elements = [...svg.querySelectorAll('[data-logo-piece]')];
  if (!elements.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);
  // Roof and supports arrive first; figures, numerals and lettering follow.
  const stages = {
    roof:     {start:0,    end:.34, x:0,   y:-76, angle:-16, scale:.65},
    pillars:  {start:.04,  end:.48, x:85,  y:24,  angle:24,  scale:.30},
    people:   {start:.12,  end:.66, x:60,  y:64,  angle:35,  scale:.15},
    digits:   {start:.36,  end:.80, x:55,  y:55,  angle:-28, scale:.30},
    wordmark: {start:.55,  end:.94, x:0,   y:55,  angle:-8,  scale:.55},
    city:     {start:.70,  end:1,   x:0,   y:36,  angle:0,   scale:.70},
  };
  let pieces;
  try {
    pieces = elements.map((element, index) => {
      const stage = stages[element.dataset.logoPiece] || stages.people;
      const box = element.getBBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const side = cx < 60 ? -1 : 1;
      const order = Number(element.dataset.logoIndex) || index;
      const stagger = ['people', 'digits'].includes(element.dataset.logoPiece) ? (order % 3) * .025 : 0;
      const strokes = [...element.querySelectorAll('path[stroke]')];
      strokes.forEach(path => path.setAttribute('pathLength', '1'));
      return {element, cx, cy, stage, stagger, side, strokes};
    });
  } catch {
    // Keep the original image visible if SVG geometry is unavailable.
    return;
  }

  let current = 0, target = 0, request = 0, previousTime = 0;
  let visible = false, lastPaint = -1;

  const paint = progress => {
    if (Math.abs(progress - lastPaint) < .00005) return;
    lastPaint = progress;
    for (const {element, cx, cy, stage, stagger, side, strokes} of pieces) {
      const local = clamp((progress - stage.start - stagger) / (stage.end - stage.start));
      const settled = smooth(local);
      const remaining = 1 - settled;
      if (local === 1) {
        // No crossfade or raster replacement: these are the original vector paths.
        element.removeAttribute('transform');
        element.style.opacity = '1';
        strokes.forEach(path => {
          path.style.removeProperty('stroke-dasharray');
          path.style.removeProperty('stroke-dashoffset');
        });
      } else {
        const arc = Math.sin(local * Math.PI);
        const x = stage.x * side * remaining + (stage.x ? side * arc * 18 : 0);
        const y = stage.y * remaining - arc * 12;
        const scale = stage.scale + (1 - stage.scale) * settled;
        const angle = stage.angle * side * remaining;
        element.setAttribute('transform',
          `translate(${x.toFixed(4)} ${y.toFixed(4)}) ` +
          `translate(${cx.toFixed(4)} ${cy.toFixed(4)}) rotate(${angle.toFixed(4)}) ` +
          `scale(${scale.toFixed(5)}) translate(${-cx.toFixed(4)} ${-cy.toFixed(4)})`);
        element.style.opacity = smooth(clamp(local / .24)).toFixed(4);
        strokes.forEach(path => {
          path.style.strokeDasharray = '1';
          path.style.strokeDashoffset = (1 - smooth(clamp((local - .06) / .84))).toFixed(4);
        });
      }
    }
    canvas.dataset.assemblyProgress = progress.toFixed(4);
    section.dataset.assemblyProgress = progress.toFixed(4);
    canvas.classList.toggle('is-assembled', progress >= .9999);
  };

  const stop = () => {
    if (request) cancelAnimationFrame(request);
    request = 0;
    previousTime = 0;
  };
  const tick = timestamp => {
    request = 0;
    if (!visible || document.hidden || reduced.matches) return;
    const elapsed = previousTime ? Math.min(32, timestamp - previousTime) : 16;
    previousTime = timestamp;
    current += (target - current) * (1 - Math.exp(-elapsed / 65));
    if (Math.abs(target - current) < .00015) current = target;
    paint(current);
    if (current !== target) request = requestAnimationFrame(tick);
    else previousTime = 0;
  };
  const measure = (snap = false) => {
    const rect = section.getBoundingClientRect();
    const travel = section.offsetHeight - sticky.offsetHeight;
    visible = rect.bottom > 0 && rect.top < innerHeight;
    const staticLayout = getComputedStyle(sticky).position !== 'sticky' || travel <= 1;
    // The final 22% of the scroll holds the complete, sharp logo.
    target = reduced.matches || staticLayout ? 1 : clamp((-rect.top / travel - .035) / .745);
    if (snap || !visible || reduced.matches || document.hidden || Math.abs(target - current) > .14) {
      stop();
      current = target;
      paint(current);
      return;
    }
    // Keep quick gestures closely coupled to the wheel/trackpad position.
    current = Math.max(target - .06, Math.min(target + .06, current));
    if (!request && current !== target) request = requestAnimationFrame(tick);
  };

  measure(true);
  canvas.classList.add('is-assembly-ready');
  addEventListener('scroll', () => measure(), {passive:true});
  addEventListener('resize', () => measure(true), {passive:true});
  addEventListener('pageshow', () => measure(true));
  addEventListener('load', () => measure(true), {once:true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else measure(true);
  });
  reduced.addEventListener('change', () => measure(true));
  document.fonts?.ready.then(() => measure(true));
})();

;
/* Continuous floating photographs, with inertia independent of their entrance animation. */
(() => {
  if (!document.body.classList.contains('graphic-edition')) return;
  const states = [...document.querySelectorAll('.mgrid>.mcard, .shots>.shot, .photo-graphic')]
    .map((element, index) => ({
      element,
      speed: Number(element.dataset.par) || (index % 2 ? -.22 : .26),
      decorative: element.classList.contains('photo-graphic'),
      current: 0, target: 0, visible: false,
    }));
  if (!states.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
  let frame = 0, previousTime = 0;

  const paint = state => {
    state.element.style.setProperty('--photo-drift-y', `${state.current.toFixed(2)}px`);
  };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  };
  const tick = time => {
    frame = 0;
    if (document.hidden || reduced.matches) return;
    const elapsed = previousTime ? Math.min(40, time - previousTime) : 16;
    previousTime = time;
    const easing = 1 - Math.exp(-elapsed / 125);
    let moving = false;
    for (const state of states) {
      if (!state.visible) continue;
      const distance = state.target - state.current;
      if (Math.abs(distance) < .06) state.current = state.target;
      else {
        state.current += distance * easing;
        moving = true;
      }
      paint(state);
    }
    if (moving) frame = requestAnimationFrame(tick);
    else previousTime = 0;
  };
  const measure = (snap = false) => {
    const height = innerHeight;
    const responsive = innerWidth < 700 ? .65 : innerWidth < 1000 ? .82 : 1;
    for (const state of states) {
      const rect = state.element.getBoundingClientRect();
      // Remove our own displacement when measuring the underlying composition.
      const top = rect.top - state.current;
      state.visible = top < height + 260 && top + rect.height > -260;
      const phase = clamp((top + rect.height / 2 - height / 2) / ((height + rect.height) / 2), -1.2, 1.2);
      const amplitude = state.decorative ? 38 : clamp(Math.abs(state.speed) * 460, 70, 150);
      state.target = reduced.matches ? 0 : phase * Math.sign(state.speed) * amplitude * responsive;
      if (snap || !state.visible || reduced.matches) {
        state.current = state.target;
        paint(state);
      }
    }
    if (!frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick);
  };

  states.forEach(state => state.element.classList.add('is-scroll-floating'));
  measure(true);
  addEventListener('scroll', () => measure(), {passive:true});
  addEventListener('resize', () => { stop(); measure(true); }, {passive:true});
  addEventListener('pageshow', () => measure(true));
  document.fonts?.ready.then(() => measure(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else measure(true);
  });
  reduced.addEventListener('change', () => { stop(); measure(true); });
})();

;
/* A short brand signature. Below-fold media never delays the first screen. */
(() => {
  const root = document.documentElement;
  const preloader = document.getElementById('preloader');
  if (!preloader || !root.classList.contains('is-loading')) return;
  const boot = window.__schoolPreload || {started:performance.now(), returning:false};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const minimum = reduced ? 0 : boot.returning ? 120 : 620;
  let finished = false;
  let queued = false;
  let minimumTimer;
  const revealHero = () => document.querySelectorAll('.hero .mask,.hero .kinetic')
    .forEach(element => element.classList.add('is-in'));
  const finish = (immediate = false) => {
    if (finished) {
      if (immediate) preloader.remove();
      return;
    }
    finished = true;
    clearTimeout(deadline);
    clearTimeout(minimumTimer);
    clearTimeout(boot.fallback);
    root.classList.remove('is-loading');
    preloader.setAttribute('aria-hidden', 'true');
    preloader.classList.add('is-leaving');
    revealHero();
    try { sessionStorage.setItem('school142-ready', '1'); } catch {}
    document.dispatchEvent(new Event('school:intro-complete'));
    window.dispatchEvent(new CustomEvent('school:ready'));
    if (immediate || reduced) preloader.remove();
    else setTimeout(() => preloader.remove(), 460);
  };
  const deadline = setTimeout(() => finish(), Math.max(0, 1800-(performance.now()-boot.started)));
  const ready = () => {
    if (queued || finished) return;
    queued = true;
    const fontGrace = document.fonts ? Promise.race([
      document.fonts.ready.catch(() => {}), new Promise(resolve => setTimeout(resolve, 150))
    ]) : Promise.resolve();
    fontGrace.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      if (finished) return;
      const delay = Math.max(0, minimum-(performance.now()-boot.started));
      minimumTimer = setTimeout(() => finish(), delay);
    })));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true});
  else ready();
  addEventListener('pageshow', event => { if (event.persisted) finish(true); });
  addEventListener('pagehide', () => finish(true), {once:true});
})();

;
/* Paint the first screen before streaming its background film. */
(() => {
  const video = document.querySelector('.hero__video');
  if (!video) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let ready = !document.documentElement.classList.contains('is-loading');
  let visible = false, attached = false, pending = false;
  const allowed = () => !reduced.matches && !connection?.saveData && !document.hidden;
  const play = () => {
    if (!ready || !visible || !allowed()) { video.pause(); return; }
    if (attached) { video.play().catch(() => {}); return; }
    if (pending) return;
    pending = true;
    const attach = () => {
      pending = false;
      if (!ready || !visible || !allowed()) return;
      const mobile = matchMedia('(max-width: 699px)').matches;
      video.querySelectorAll('source[data-src]').forEach(source => {
        if (source.dataset.variant === (mobile ? 'mobile' : 'desktop')) source.src = source.dataset.src;
        else source.remove();
      });
      attached = true;
      video.preload = 'metadata';
      video.load();
      video.play().catch(() => {});
    };
    if ('requestIdleCallback' in window) requestIdleCallback(attach, {timeout:700});
    else setTimeout(attach, 80);
  };
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    play();
  }, {threshold:.04}).observe(video.closest('.hero'));
  addEventListener('school:ready', () => { ready = true; play(); }, {once:true});
  addEventListener('pageshow', play);
  addEventListener('pagehide', () => video.pause());
  document.addEventListener('visibilitychange', play);
  reduced.addEventListener('change', play);
})();
