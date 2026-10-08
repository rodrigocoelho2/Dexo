#!/usr/bin/env python3
"""Renders the iPhone launch images (src/LivingDex/wwwroot/splash/*.png) from the phone boot screen of
the built page, so the launch image and the in-page loading screen match exactly.
Needs Playwright with Chromium (pip install playwright && playwright install chromium).
Run after assemble.py:  python3 client/splash.py"""
import os, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
WWW = os.path.normpath(os.path.join(HERE, '..', 'src', 'LivingDex', 'wwwroot'))
src = open(os.path.join(HERE, 'assemble.py'), encoding='utf-8').read()
SPLASH = eval(re.search(r'^SPLASH=(\[.*\])$', src, re.M).group(1))
os.makedirs(os.path.join(WWW, 'splash'), exist_ok=True)
hook = os.environ.get('LD_FONT_HOOK')          # optional module with install(page), for machines without Google Fonts
install = __import__(hook).install if hook else (lambda pg: None)
SHOW_BOOT = """() => { for (const id of ['app', 'login']) document.getElementById(id).hidden = true;
  document.getElementById('boot').hidden = false;
  const s = document.createElement('style'); s.textContent = '.boot-bar,.boot-m,.mob-hint,.mob-nav{visibility:hidden!important}';
  document.head.appendChild(s); }"""
with sync_playwright() as p:
    br = p.chromium.launch()
    for w, h, r in SPLASH:
        pg = br.new_page(viewport={'width': w, 'height': h}, device_scale_factor=r, is_mobile=True, has_touch=True)
        install(pg)
        pg.goto('file://' + os.path.join(WWW, 'index.html'))
        pg.wait_for_timeout(600)
        pg.evaluate(SHOW_BOOT)
        pg.evaluate('document.fonts.ready')
        pg.wait_for_timeout(300)
        out = os.path.join(WWW, 'splash', f'{w*r}x{h*r}.png')
        pg.screenshot(path=out)
        pg.close()
        print('wrote', os.path.relpath(out, WWW))
    br.close()
