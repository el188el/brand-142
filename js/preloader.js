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
