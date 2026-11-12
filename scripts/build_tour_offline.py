#!/usr/bin/env python3
"""Generate the offline inventory and, optionally, a self-contained tour ZIP.

Run from any directory:
  python3 scripts/build_tour_offline.py
  python3 scripts/build_tour_offline.py --zip /tmp/school142-tour-offline.zip
Regenerate the inventory after changing tour files. ZIPs belong in Releases,
not in Git or the Pages snapshot.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOUR = ROOT / "tour"
MANIFEST = TOUR / "offline-manifest.json"
VERSION_META = r'(<meta name="tour-offline-version" content=")[^"]+(">)'

LAUNCHER = '''#!/usr/bin/env python3
"""Run the tour locally; no Internet connection or extra packages required."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--port', type=int, default=0)
    args = parser.parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    address = 'http://127.0.0.1:%d/tour/' % server.server_port
    print('Tour: ' + address, flush=True)
    print('Keep this window open. Press Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        webbrowser.open(address)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
'''

INSTRUCTIONS = '''# Виртуальный тур по школе №142 — без интернета

## Перед первым запуском

На компьютере должен быть установлен Python 3 (https://www.python.org/downloads/).
Установите его заранее, пока есть интернет. Дополнительные пакеты не нужны.

1. Полностью распакуйте архив. Не запускайте файлы внутри ZIP.
2. Windows: откройте start-tour.bat.
   macOS: откройте start-tour.command. При необходимости запустите
   `python3 start_tour.py` из папки с распакованным туром.
   Linux: выполните `python3 start_tour.py` в этой папке.
3. Тур откроется в браузере. Если окно не открылось автоматически,
   скопируйте адрес из окна программы в браузер.
4. Оставьте окно программы открытым на время просмотра.
   Для завершения закройте его или нажмите Ctrl+C.

Тур работает без доступа к интернету. Сервер доступен только на этом компьютере.
Не открывайте tour/index.html двойным щелчком: браузер ограничивает загрузку
панорам напрямую из файлов. Запускайте тур через start_tour.py.

Все 51 панорама и шрифты находятся в архиве. Музыка отключена.
Архив можно скопировать на флешку или другой компьютер целиком.
Лицензия шрифта Golos Text находится в tour/fonts/OFL.txt.

Если установка Python не подходит, есть другой вариант: заранее откройте
онлайн-тур в браузере, выберите «Без интернета» → «Сохранить тур» и дождитесь
подтверждения готовности. Затем открывайте тот же адрес в том же браузере:
https://el188el.github.io/brand-142/tour/

Версия файлов: {version}
'''

HOME = '''<!doctype html><html lang="ru"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Виртуальный тур по школе №142</title>
<style>body{margin:0;background:#1e213d;color:#f2f3f7;font:18px/1.6 system-ui,sans-serif}
main{max-width:650px;margin:10vh auto;padding:24px}a{color:#f2c244}</style>
<main><h1>Виртуальный тур по школе №142</h1>
<p>Это локальная версия тура. Интернет не нужен; оставьте окно программы запуска открытым.</p>
<p><a href="tour/">Открыть виртуальный тур →</a></p>
<p><a href="README.txt">Инструкция по запуску</a></p></main></html>'''


def inventory():
    (TOUR / "fonts").mkdir(exist_ok=True)
    shutil.copyfile(ROOT / "fonts/GolosText.woff", TOUR / "fonts/GolosText.woff")
    shutil.copyfile(ROOT / "fonts/golostext-OFL.txt", TOUR / "fonts/OFL.txt")
    paths = sorted(p for p in TOUR.rglob("*") if p.is_file()
                   and p.name not in {"sw.js", "offline-manifest.json", ".DS_Store"}
                   and p.suffix.lower() not in {".mp3", ".exe"})
    # The marker is normalised so rebuilding does not recursively change its hash.
    seed = hashlib.sha256((TOUR / "sw.js").read_bytes())
    for path in paths:
        data = path.read_bytes()
        if path == TOUR / "index.html":
            data = re.sub(VERSION_META, r'\g<1>BUILD_VERSION\2', data.decode()).encode()
        seed.update(path.relative_to(TOUR).as_posix().encode())
        seed.update(hashlib.sha256(data).digest())
    version = seed.hexdigest()[:16]
    page = TOUR / "index.html"
    page.write_text(re.sub(VERSION_META, lambda m: m[1] + version + m[2], page.read_text()), encoding="utf-8")
    assets = []
    for path in paths:
        data = path.read_bytes()
        assets.append({"url": path.relative_to(TOUR).as_posix(), "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    result = {"schema": 1, "version": version, "totalBytes": sum(a["size"] for a in assets), "assets": assets}
    MANIFEST.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return result, paths


def archive(destination, manifest, paths):
    prefix = "school142-tour-offline/"
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for path in paths:
            if path.name == "offline.js":
                continue
            name = path.relative_to(TOUR).as_posix()
            if name == "index.html":
                page = path.read_text()
                page = page.replace('<a href="../#virtual-tour">← На сайт школы</a>', '<a href="../">← Инструкция</a>')
                page = re.sub(r'    <details class="offline-panel".*?</details>', '    <span class="offline-badge">Офлайн-версия</span>', page, flags=re.S)
                page = page.replace('  <script src="offline.js?v=offline-v1"></script>\n', '')
                output.writestr(prefix + "tour/index.html", page)
            else:
                output.write(path, prefix + "tour/" + name)
        output.writestr(prefix + "start_tour.py", LAUNCHER)
        output.writestr(prefix + "start-tour.bat", '@echo off\r\ncd /d "%~dp0"\r\nwhere py >nul 2>nul\r\nif %errorlevel%==0 (py -3 start_tour.py) else (python start_tour.py)\r\npause\r\n')
        command = zipfile.ZipInfo(prefix + "start-tour.command")
        command.external_attr = 0o100755 << 16
        output.writestr(command, '#!/bin/sh\ncd -- "$(dirname -- "$0")"\nexec python3 start_tour.py\n')
        output.writestr(prefix + "README.txt", INSTRUCTIONS.format(version=manifest["version"]))
        output.writestr(prefix + "index.html", HOME)
    print(f"ZIP: {destination} ({destination.stat().st_size / 1048576:.1f} MiB)")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=Path)
    args = parser.parse_args()
    manifest, paths = inventory()
    print(f"Offline version: {manifest['version']}; {len(paths)} files; {manifest['totalBytes'] / 1048576:.1f} MiB")
    if args.zip:
        archive(args.zip, manifest, paths)


if __name__ == "__main__":
    main()
