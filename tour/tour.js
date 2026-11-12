/* The exported player and skin use these globals for panorama navigation. */
var pano;
var skin;

(function () {
  const container = document.getElementById('container');
  try {
    if (typeof pano2vrPlayer !== 'function' || typeof pano2vrSkin !== 'function') {
      throw new Error('Panorama player is unavailable');
    }
    // A classic script works from file:// too; fetch/XHR of XML does not.
    const config = window.school142TourConfig;
    if (typeof config !== 'string' || !config.trimStart().startsWith('<?xml')) {
      throw new Error('Panorama configuration is unavailable');
    }
    document.getElementById('tour-status').remove();
    pano = new pano2vrPlayer('container');
    if (location.protocol === 'file:') {
      // File images can be displayed by CSS 3D but cannot be uploaded as
      // cross-origin WebGL textures. Use the player's built-in CSS 3D renderer.
      const CSS3D = 4096;
      const WEBGL = 8192;
      pano.setRenderFlags((pano.getRenderFlags() | CSS3D) & ~WEBGL);
      pano.setCrossOrigin(null);
    }
    skin = new pano2vrSkin(pano);
    pano.readConfigString(config);
  } catch (error) {
    console.error('Virtual tour could not start:', error);
    container.replaceChildren();
    const status = document.createElement('div');
    status.className = 'tour-status';
    status.setAttribute('role', 'alert');
    const title = document.createElement('p');
    title.textContent = 'Не удалось открыть тур';
    const hint = document.createElement('p');
    hint.textContent = 'Убедитесь, что папка tour скопирована целиком и все файлы остались на своих местах.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Попробовать снова';
    retry.addEventListener('click', () => location.reload());
    status.append(title, hint, retry);
    container.append(status);
  }
})();

// Retire the browser-save feature from earlier hosted versions. Local files
// never use service workers or browser storage to start the tour.
if (/^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  (async () => {
    const scope = new URL('./', location.href).href;
    const registration = await navigator.serviceWorker.getRegistration(scope);
    if (registration?.scope === scope) await registration.unregister();
    if ('caches' in window) {
      const prefix = `school142-tour-v1:${new URL(scope).pathname}:`;
      for (const name of await caches.keys()) {
        if (name.startsWith(prefix)) await caches.delete(name);
      }
    }
  })().catch(() => {});
}
