/* The exported player and skin use these globals for panorama navigation. */
var pano;
var skin;

(async function () {
  const container = document.getElementById('container');
  try {
    if (typeof pano2vrPlayer !== 'function' || typeof pano2vrSkin !== 'function') {
      throw new Error('Panorama player is unavailable');
    }
    const response = await fetch('pano.xml', { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Panorama configuration: ' + response.status);
    const config = await response.text();
    if (!config.trimStart().startsWith('<?xml')) throw new Error('Invalid panorama configuration');
    document.getElementById('tour-status').remove();
    pano = new pano2vrPlayer('container');
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
    hint.textContent = 'Проверьте подключение к интернету и попробуйте ещё раз.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Попробовать снова';
    retry.addEventListener('click', () => location.reload());
    status.append(title, hint, retry);
    container.append(status);
  }
})();
