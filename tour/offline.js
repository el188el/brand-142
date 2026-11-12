(() => {
  const panel = document.getElementById('offline-panel');
  const summary = document.getElementById('offline-summary');
  const status = document.getElementById('offline-status');
  const progress = document.getElementById('offline-progress');
  const save = document.getElementById('offline-save');
  const cancel = document.getElementById('offline-cancel');
  const pageVersion = document.querySelector('meta[name="tour-offline-version"]').content;
  let worker;
  const mb = bytes => Math.round(bytes / 1048576).toLocaleString('ru-RU');

  function render(state) {
    const complete = state.complete && state.version === pageVersion;
    save.disabled = !!state.saving;
    cancel.hidden = !state.saving;
    progress.hidden = !state.saving;
    summary.textContent = complete ? 'Офлайн: готово' : 'Без интернета';
    if (state.saving) {
      progress.max = state.totalFiles;
      progress.value = state.downloaded;
      status.textContent = `Сохраняем: ${state.downloaded} из ${state.totalFiles} файлов · ${mb(state.downloadedBytes)} из ${mb(state.totalBytes)} МБ`;
    } else if (complete) {
      status.textContent = 'Тур сохранён целиком. Можно отключать интернет.';
      save.textContent = 'Проверить обновления';
    } else if (state.complete) {
      status.textContent = 'Предыдущая версия сохранена. Обновите её, когда будет интернет.';
      save.textContent = 'Обновить сохранение';
    } else if (state.downloaded) {
      status.textContent = `Сохранено ${mb(state.downloadedBytes)} из ${mb(state.totalBytes)} МБ. Можно продолжить загрузку.`;
      save.textContent = 'Продолжить сохранение';
    } else {
      status.textContent = 'Тур ещё не сохранён для работы без интернета.';
      save.textContent = 'Сохранить тур';
    }
  }

  function send(type) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('timeout')); }, 15000);
      channel.port1.onmessage = ({data}) => {
        clearTimeout(timer);
        channel.port1.close();
        if (data.error) reject(new Error(data.error));
        else resolve(data);
      };
      worker.postMessage({type}, [channel.port2]);
    });
  }

  navigator.serviceWorker?.addEventListener('message', ({data}) => {
    if (data?.source !== 'school142-tour-offline') return;
    render(data.state);
    if (data.type === 'ERROR') {
      const messages = {
        quota: 'Не хватает свободного места. Освободите место на устройстве и продолжите сохранение.',
        integrity: 'Файлы тура обновились во время загрузки. Попробуйте сохранить тур ещё раз.',
        network: 'Не удалось загрузить все файлы. Проверьте интернет и продолжите сохранение.'
      };
      status.textContent = messages[data.error] || messages.network;
    }
  });

  save.addEventListener('click', async () => {
    save.disabled = true;
    status.textContent = 'Подготавливаем сохранение…';
    try {
      // Ask the browser to retain this user-requested download where supported.
      await navigator.storage?.persist?.().catch(() => false);
      await send('SAVE');
    } catch {
      save.disabled = false;
      status.textContent = 'Для сохранения нужен интернет. Подключитесь и попробуйте ещё раз.';
    }
  });
  cancel.addEventListener('click', async () => {
    cancel.disabled = true;
    try { await send('CANCEL'); }
    finally { cancel.disabled = false; }
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { panel.open = false; summary.focus(); }
  });
  document.addEventListener('pointerdown', event => {
    if (panel.open && !panel.contains(event.target)) panel.open = false;
  });

  (async () => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      status.textContent = 'Этот браузер не поддерживает офлайн-сохранение. Используйте ZIP-версию для компьютера.';
      return;
    }
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing?.active) {
        worker = existing.active;
        navigator.serviceWorker.register('sw.js').catch(() => {});
      } else {
        await navigator.serviceWorker.register('sw.js');
        worker = (await navigator.serviceWorker.ready).active;
      }
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        worker = navigator.serviceWorker.controller || worker;
      });
      render(await send('STATUS'));
    } catch {
      status.textContent = 'Не удалось подготовить сохранение. Обновите страницу с интернетом или скачайте ZIP-версию.';
    }
  })();
})();
