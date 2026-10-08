#!/usr/bin/env python3
"""Builds the single-file web client.

Concatenates client/src/* (base CSS + feature stylesheets, body markup, Pokédex
data, app.js + sd.js + mob.js) into src/LivingDex/wwwroot/index.html, which the
.NET server serves as-is.  Usage:  python3 client/assemble.py
"""
import os, re
HERE=os.path.dirname(os.path.abspath(__file__)); SRC=os.path.join(HERE,'src')
OUT=os.path.join(HERE,'..','src','LivingDex','wwwroot','index.html')
def rd(n): return open(os.path.join(SRC,n),encoding='utf-8').read()
t2=rd('base.html'); css_end=t2.index('</style>')
css=rd('extra.css')+'\n'+rd('sd_base.css')+'\n'+rd('sd_extra.css')+'\n'+rd('sd_b2.css')+'\n'+rd('sd_fx.css')+'\n'+rd('sd_gen.css')+'\n'+rd('sd_draft.css')+'\n'+rd('tb.css')+'\n'+rd('profile.css')+'\n'+rd('mob.css'); a=css.index('/* stats */'); b=css.index('/* game groups */'); css=css[:a]+'.tg.dlc{background:#d6e8ff}\n'+css[b:]
css=css.replace('.stagecol{display:grid;gap:.35em;align-content:center}','.stagecol{display:grid;gap:.35em;align-content:start}').replace('.arrowcol{display:grid;place-items:center;','.arrowcol{display:grid;place-items:start center;padding-top:1.4em;').replace('.cart .n{white-space:normal;line-height:1.15;min-height:2.3em}','.cart{display:flex;flex-direction:column}\n.cart .n{white-space:normal;line-height:1.15;min-height:3.45em;flex:1}')
import colorsys
def _hsl(r,g,b,a=None):
    h,l,sat=colorsys.rgb_to_hls(r/255,g/255,b/255); H=h*360
    if sat*100<=8 or not (195<=H<=245): return None
    dh=round(H-222); hue=f"calc(var(--h) {'+' if dh>=0 else '-'} {abs(dh)})"
    return f"hsl({hue} calc({round(sat*100)}% * var(--sat)) {round(l*100)}%{'' if a is None else ' / '+a})"
def _hex(m):
    c=m.group(0)[1:]; c=''.join(ch*2 for ch in c) if len(c)==3 else c
    return _hsl(*(int(c[i:i+2],16) for i in (0,2,4))) or m.group(0)
def _rgba(m):
    p=[x.strip() for x in m.group(1).split(',')]
    return _hsl(int(p[0]),int(p[1]),int(p[2]),p[3] if len(p)>3 else None) or m.group(0)
def themeify(c):
    c=re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',_hex,c)
    c=re.sub(r'rgba?\(([^)]*)\)',_rgba,c)
    return c.replace(':root{',':root{\n  --h:222; --sat:1;',1)
d=rd('data2.json').replace('</','<\\/')
exec(rd('icons.py'))
headpart=themeify(t2[:css_end]+css)+'</style>\n'
headpart=headpart.replace('<title>HOME Living Dex</title>','<title>HOME Living Dex</title>\n'+FAV_LINK,1)
bodypart=rd('body.html')+'\n<script id="pkdata" type="application/json">'+d+'</script>\n<script>\n'+rd('app.js').replace('\nrender();\nsyncInit();\n})();','\n'+rd('sd.js')+'\n'+rd('dexbadges.js')+'\n'+rd('profile.js')+'\n'+rd('mob.js')+'\nrender();\nsyncInit();\n})();')+'</script>\n'
# Installed as an app on a phone: manifest, iOS web-app tags and launch images (wwwroot/splash, made by client/splash.py).
SPLASH=[(430,932,3),(440,956,3),(393,852,3),(402,874,3),(390,844,3),(428,926,3),(375,812,3),(414,896,3),(414,896,2),(375,667,2),(320,568,2)]
APP_HEAD=('<link rel="manifest" href="/manifest.json">\n'
  '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Living Dex">\n'
  +''.join(f'<link rel="apple-touch-startup-image" media="(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait)" href="/splash/{w*r}x{h*r}.png">\n' for w,h,r in SPLASH))
doc=('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#0c1222">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
     +APP_HEAD+
     '<style>html{color-scheme:dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
     +headpart+'</head>\n<body>\n'+bodypart+'</body>\n</html>\n')
os.makedirs(os.path.dirname(OUT),exist_ok=True)
open(OUT,'w',encoding='utf-8').write(doc)
print(f'wrote {os.path.normpath(OUT)} ({len(doc):,} chars)')
