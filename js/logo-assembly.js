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
