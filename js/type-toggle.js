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
