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
