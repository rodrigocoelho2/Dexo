"""Signs in to a running LivingDex (the account the smoke test created) and screenshots the main screens on PC and phone."""
import os, sys
from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
errors = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, options in [('pc', {'viewport': {'width': 1300, 'height': 1000}}), ('phone', p.devices['iPhone 13'])]:
        page = browser.new_context(**options).new_page()
        page.on('pageerror', lambda e: errors.append(f'{name}: {e}'))
        page.goto(base + '/')
        page.wait_for_selector('#login:not([hidden])')
        page.wait_for_timeout(1500)
        page.screenshot(path=f'{out}/{name}-1-login.png')
        page.fill('#lgUser', 'Rodas')
        page.fill('#lgPass', 'pikachu123')
        page.click('#lgGo')
        page.wait_for_selector('#app:not([hidden])')
        page.wait_for_timeout(3000)
        page.screenshot(path=f'{out}/{name}-2-dex.png', full_page=(name == 'pc'))
        if name == 'pc':
            page.click('#sdBtn')
        else:
            page.click('#mobNav [data-mt="battle"]')
        page.wait_for_timeout(3000)
        page.screenshot(path=f'{out}/{name}-3-showdown.png', full_page=(name == 'pc'))
    browser.close()

print('page errors:', errors)
sys.exit(1 if errors else 0)
