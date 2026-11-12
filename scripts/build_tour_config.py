#!/usr/bin/env python3
"""Generate the classic-script panorama config for local file:// startup.

Run after editing tour/pano.xml:
    python3 scripts/build_tour_config.py
Check without changing generated files:
    python3 scripts/build_tour_config.py --check

Python is a development tool only; viewing the website does not require it.
"""
import argparse
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    xml = (ROOT / 'tour/pano.xml').read_text(encoding='utf-8')
    document = ET.fromstring(xml)
    assert document.tag == 'tour' and document.findall('panorama'), 'Invalid panorama configuration'
    data = json.dumps(xml, ensure_ascii=False).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    source = '// Generated from pano.xml by scripts/build_tour_config.py.\nwindow.school142TourConfig = ' + data + ';\n'
    target = ROOT / 'tour/pano-config.js'
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8') != source:
            raise SystemExit('pano-config.js is stale; run scripts/build_tour_config.py')
    else:
        target.write_text(source, encoding='utf-8')
    print('Panorama configuration verified:', len(document.findall('panorama')), 'scenes')


if __name__ == '__main__':
    main()
