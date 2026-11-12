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
