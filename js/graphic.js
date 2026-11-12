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
