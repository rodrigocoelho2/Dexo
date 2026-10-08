/* ---------- WHERE TO GET → MAP: where a Pokémon is found, on a schematic map of the region ----------
   Data: RAW.enc (built from PokeAPI's encounters by data-build/encounters.py) for the games listed in ENC.g.
   Maps: original, simplified drawings of Johto, Kanto and the Sevii Islands (not the games' town maps); each PokeAPI location
   is placed by hand: towns and spots at a point, routes along a line (the pin sits halfway). */
const ENC=RAW.enc||{L:[],A:[''],N:[''],M:[],v:{},g:{}};
const WM={open:false,game:null,sid:0,region:null,sel:-1};
const WM_METHOD={grass:['GRASS','#ffd23f'],surf:['SURF','#4fb4ff'],'old-rod':['OLD ROD','#36c6a8'],'good-rod':['GOOD ROD','#36c6a8'],'super-rod':['SUPER ROD','#36c6a8'],
  headbutt:['HEADBUTT','#d0915a'],'rock-smash':['ROCK SMASH','#a0a0c0'],gift:['GIFT','#5fd38a'],egg:['EGG','#5fd38a'],trade:['TRADE','#f08030'],
  static:['ONE-TIME','#ef3d4f'],roaming:['ROAMING','#a78bfa'],special:['SPECIAL','#f85888'],
  wild:['WILD','#ffd23f'],water:['ON WATER','#4fb4ff'],flying:['FLYING','#9fc3ff'],rare:['RARE SPAWN','#f85888'],'rare-flying':['RARE · FLYING','#f85888']};
const WM_GAME={rby:'Red · Green · Blue · Yellow',gsc:'Gold · Silver · Crystal',frlg:'FireRed · LeafGreen',hgss:'HeartGold · SoulSilver',lgpe:"Let's Go Pikachu · Let's Go Eevee"};
// the maps each game can show (tabs), in order
const WM_REGIONS={rby:['kanto'],gsc:['johto','kanto'],frlg:['kanto','sevii'],hgss:['johto','kanto'],lgpe:['kanto']};
const wmRegions=g=>WM_REGIONS[g]||Object.keys(WM_MAPS);

// ---- the maps (viewBox 640×380) ----
const WM_MAPS={
  johto:{name:'JOHTO',
    land:['M100 0H640V346L560 328 470 350 360 364 250 354 170 362 150 282 112 198 100 110Z','M12 130H112V262H12Z'],
    water:[['ellipse',446,34,30,16],['ellipse',126,212,14,10]],
    towns:{'new-bark-town':[566,262,'New Bark'],'cherrygrove-city':[452,282,'Cherrygrove'],'violet-city':[382,152,'Violet'],'azalea-town':[322,318,'Azalea'],
      'goldenrod-city':[240,206,'Goldenrod'],'ecruteak-city':[296,92,'Ecruteak'],'olivine-city':[156,128,'Olivine'],'cianwood-city':[84,236,'Cianwood'],
      'mahogany-town':[446,92,'Mahogany'],'blackthorn-city':[594,92,'Blackthorn']},
    spots:{'national-park':[240,150],'ruins-of-alph':[318,176],'union-cave':[382,272],'slowpoke-well':[304,338],'ilex-forest':[222,318],'sprout-tower':[398,138],
      'bell-tower':[312,70],'burned-tower':[280,108],'mt-mortar':[372,92],'lake-of-rage':[446,34],'team-rocket-hq':[462,106],'ice-path':[524,92],'dragons-den':[614,72],
      'dark-cave':[480,170],'whirl-islands':[126,212],'tohjo-falls':[610,262],'johto-safari-zone':[34,150],'safari-zone-gate':[34,186],'embedded-tower':[54,236]},
    routes:{'johto-route-29':[[566,262],[510,262],[510,282],[452,282]],'johto-route-30':[[452,282],[452,172]],'johto-route-31':[[452,172],[382,172],[382,152]],
      'johto-route-32':[[382,152],[382,272]],'johto-route-33':[[382,272],[382,318],[322,318]],'johto-route-34':[[222,318],[222,206],[240,206]],
      'johto-route-35':[[240,206],[240,160]],'johto-route-36':[[240,138],[382,138],[382,152]],'johto-route-37':[[296,138],[296,92]],
      'johto-route-38':[[296,92],[196,92]],'johto-route-39':[[196,92],[196,128],[156,128]],'johto-sea-route-40':[[156,128],[120,170]],
      'johto-sea-route-41':[[120,170],[84,236]],'johto-route-42':[[296,92],[446,92]],'johto-route-43':[[446,92],[446,48]],'johto-route-44':[[446,92],[594,92]],
      'johto-route-45':[[594,92],[594,226]],'johto-route-46':[[594,226],[536,262]],'johto-route-47':[[84,236],[34,236]],'johto-route-48':[[34,236],[34,160]],
      'kanto-route-27':[[566,262],[630,262]],'kanto-route-26':[[630,262],[630,178]]},
    sea:['johto-sea-route-40','johto-sea-route-41'], edge:[[632,170,'end','KANTO ▸','kanto']]},
  kanto:{name:'KANTO',
    land:['M0 0H640V300L600 320 560 340 470 352 380 346 300 348 220 332 196 318 140 322 110 302 60 292 0 282Z'],
    water:[],
    islands:[[170,356,20,13],[252,356,16,10]],
    towns:{'pallet-town':[170,300,'Pallet'],'viridian-city':[170,210,'Viridian'],'pewter-city':[170,86,'Pewter'],'cerulean-city':[420,72,'Cerulean'],
      'saffron-city':[420,176,'Saffron'],'celadon-city':[300,176,'Celadon'],'vermilion-city':[420,272,'Vermilion'],'lavender-town':[548,176,'Lavender'],
      'fuchsia-city':[330,326,'Fuchsia'],'cinnabar-island':[170,356,'Cinnabar'],'indigo-plateau':[76,70,'Indigo Plateau']},
    spots:{'viridian-forest':[170,146],'mt-moon':[284,74],'cerulean-cave':[394,40],'rock-tunnel':[548,104],'kanto-power-plant':[574,72],'digletts-cave':[456,290],
      'seafoam-islands':[252,356],'kanto-victory-road-1':[76,118],'kanto-victory-road-2':[76,118],'mt-silver':[24,150],
      'pokemon-tower':[578,154],'pokemon-mansion':[186,364],'kanto-safari-zone':[330,288],'kanto-underground-path':[446,148],'ss-anne':[384,302]},
    routes:{'kanto-route-1':[[170,300],[170,210]],'kanto-route-2':[[170,210],[170,86]],'kanto-route-3':[[170,86],[272,86],[272,74]],'kanto-route-4':[[296,74],[420,72]],
      'kanto-route-24':[[420,72],[420,30]],'kanto-route-25':[[420,30],[520,30]],'kanto-route-5':[[420,72],[420,176]],'kanto-route-6':[[420,176],[420,272]],
      'kanto-route-7':[[420,176],[300,176]],'kanto-route-8':[[420,176],[548,176]],'kanto-route-9':[[420,72],[548,72]],'kanto-route-10':[[548,72],[548,176]],
      'kanto-route-11':[[420,272],[518,272]],'kanto-route-12':[[548,176],[548,290]],'kanto-route-13':[[548,290],[500,316]],'kanto-route-14':[[500,316],[440,334]],
      'kanto-route-15':[[440,334],[330,326]],'kanto-route-16':[[300,176],[236,176]],'kanto-route-17':[[236,176],[236,300]],'kanto-route-18':[[236,300],[330,326]],
      'kanto-sea-route-19':[[330,326],[330,362]],'kanto-sea-route-20':[[330,362],[176,358]],'kanto-sea-route-21':[[170,356],[170,300]],
      'kanto-route-22':[[170,210],[76,210]],'kanto-route-23':[[76,210],[76,70]],'kanto-route-28':[[76,210],[24,210],[24,160]]},
    sea:['kanto-sea-route-19','kanto-sea-route-20','kanto-sea-route-21'], edge:[[8,240,'start','◂ JOHTO','johto'],[8,372,'start','◂ SEVII ISLANDS','sevii']]},
  // FireRed / LeafGreen only: the seven islands south-west of Kanto (three groups, drawn side by side)
  sevii:{name:'SEVII',
    land:['M150 50L214 46 232 84 222 130 230 200 214 300 160 312 136 270 150 200 136 130 140 84Z','M40 96L104 90 112 150 104 214 46 222 34 160Z',
      'M56 322L120 316 134 344 120 372 60 372 48 346Z','M290 30L380 26 392 70 372 106 300 108 284 70Z','M420 70L520 62 540 100 510 150 430 150 410 110Z',
      'M300 186L360 176 400 200 404 300 360 330 304 318 290 260Z','M430 190L560 180 590 220 580 300 548 372 430 372 420 300Z'],
    water:[],
    islands:[[24,300,16,12],[248,236,24,20],[584,62,22,14],[604,150,14,10],[612,250,12,9],[612,316,12,9]],
    towns:{'one-island':[184,262,'One Island'],'two-island':[74,196,'Two Island'],'three-island':[100,338,'Three Island'],'four-island':[330,78,'Four Island'],
      'five-island':[462,118,'Five Island'],'six-island':[372,236,'Six Island'],'seven-island':[516,214,'Seven Island']},
    spots:{'mt-ember':[188,72],'treasure-beach':[180,300],'cape-brink':[74,112],'berry-forest':[24,300],'three-isle-port':[120,358],'icefall-cave':[362,44],
      'water-labyrinth':[440,88],'five-isle-meadow':[510,96],'resort-gorgeous':[584,62],'lost-cave':[600,40],'memorial-pillar':[604,150],
      'outcast-island':[248,240],'kanto-altering-cave':[248,222],'pattern-bush':[326,226],'ruin-valley':[372,296],'trainer-tower':[560,198],
      'canyon-entrance':[516,258],'tanoby-ruins':[448,336],'monean-chamber':[446,360],'liptoo-chamber':[464,360],'weepth-chamber':[482,360],
      'dilford-chamber':[500,360],'scufib-chamber':[518,360],'rixy-chamber':[536,360],'viapos-chamber':[554,360],'birth-island':[612,250],'navel-rock':[612,316]},
    routes:{'kindle-road':[[184,262],[204,200],[204,124],[188,84]],'bond-bridge':[[86,338],[40,326],[24,310]],'water-path':[[372,236],[372,190]],
      'green-path':[[372,236],[272,236]],'sevault-canyon':[[516,258],[516,320]]},
    sea:['bond-bridge'], edge:[[632,16,'end','KANTO ▸','kanto']]},
};
// location id → {region, x, y}
const WM_POS=(()=>{ const pos={};
  const mid=pts=>{ let len=0; const seg=[]; for(let i=1;i<pts.length;i++){ const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); seg.push(d); len+=d; }
    let h=len/2; for(let i=0;i<seg.length;i++){ if(h<=seg[i]){ const t=seg[i]?h/seg[i]:0; return [pts[i][0]+(pts[i+1][0]-pts[i][0])*t,pts[i][1]+(pts[i+1][1]-pts[i][1])*t]; } h-=seg[i]; } return pts[0]; };
  Object.entries(WM_MAPS).forEach(([r,m])=>{
    Object.entries(m.towns).forEach(([k,[x,y]])=>pos[k]={r,x,y});
    Object.entries(m.spots).forEach(([k,[x,y]])=>pos[k]={r,x,y});
    Object.entries(m.routes).forEach(([k,p])=>{ const [x,y]=mid(p); pos[k]={r,x,y}; });
  });
  return pos; })();

// ---- data ----
const wmHas=(game,sid)=>!!(ENC.g[game]&&ENC.g[game][sid]);
const wmGames=()=>Object.keys(ENC.g);
// Where to look in a game: the Pokémon itself, else the nearest pre-evolution that is found, else a later evolution to breed from.
function wmFind(game,sid){
  const G=ENC.g[game]; if(!G) return null;
  if(G[sid]) return {sid,list:G[sid]};
  const chain=[]; let p=sid;
  while(EVO[p]){ const [prev,how,trade]=EVO[p]; chain.push({from:prev,to:p,how,trade}); p=prev; if(G[p]) return {sid:p,list:G[p],evolve:chain.reverse()}; }
  const kids=Object.keys(EVO).filter(k=>EVO[k][0]===sid);
  for(const k of kids){ if(G[k]) return {sid:+k,list:G[k],breed:+k}; for(const k2 of Object.keys(EVO).filter(x=>EVO[x][0]===+k)) if(G[k2]) return {sid:+k2,list:G[k2],breed:+k2}; }
  return null;
}
// group the encounters by location, best first
function wmPlaces(list){
  const by=new Map();
  list.forEach(e=>{ const li=e[0]; if(!by.has(li)) by.set(li,{li,id:ENC.L[li][0],name:ENC.L[li][1],rows:[]}); by.get(li).rows.push(e); });
  const best=p=>Math.max(...p.rows.map(r=>r[5]));
  return [...by.values()].sort((a,b)=>(WM_POS[a.id]?0:1)-(WM_POS[b.id]?0:1)||best(b)-best(a));
}
const wmMeth=i=>WM_METHOD[ENC.M[i]]||['?','#888'];
const wmChance=m=>!['gift','egg','trade','static','roaming','special'].includes(ENC.M[m]);

// ---- drawing ----
function wmSVG(region,places,sel){
  const m=WM_MAPS[region], pl=p=>p.map(q=>q.join(',')).join(' ');
  let s=`<svg viewBox="0 0 640 380" role="img" aria-label="Map of ${esc(m.name)}"><rect width="640" height="380" fill="#0f1a36"/>`;
  m.land.forEach(d=>{ s+=`<path d="${d}" fill="#1d2b52" stroke="#33508f" stroke-width="2"/>`; });
  (m.islands||[]).forEach(([x,y,rx,ry])=>{ s+=`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#1d2b52" stroke="#33508f" stroke-width="2"/>`; });
  m.water.forEach(([_,x,y,rx,ry])=>{ s+=`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#173a6e" stroke="#2f5d9f" stroke-width="1.5"/>`; });
  Object.entries(m.routes).forEach(([k,p])=>{ const sea=m.sea.includes(k);
    s+=`<polyline points="${pl(p)}" fill="none" stroke="${sea?'#3c6fb8':'#6f84bd'}" stroke-width="${sea?3:4}" stroke-linecap="round" stroke-linejoin="round"${sea?' stroke-dasharray="2 7"':''}/>`; });
  Object.values(m.spots).forEach(([x,y])=>{ s+=`<rect x="${x-4}" y="${y-4}" width="8" height="8" rx="2" fill="#4a5f9a"/>`; });
  Object.values(m.towns).forEach(([x,y,n])=>{ s+=`<rect x="${x-8}" y="${y-8}" width="16" height="16" rx="3" fill="#e9edf6" stroke="#0b1226" stroke-width="2"/>`;
    s+=`<text x="${x}" y="${y>300?y-13:y+21}" text-anchor="middle" class="wm-tl">${esc(n.toUpperCase())}</text>`; });
  m.edge.forEach(([x,y,a,t,to])=>{ if(to&&!wmRegions(WM.game).includes(to)) return; s+=`<text x="${x}" y="${y}" text-anchor="${a}" class="wm-tl dim">${t}</text>`; });
  places.forEach((p,i)=>{ const q=WM_POS[p.id]; if(!q||q.r!==region) return; const c=wmMeth(p.rows[0][2])[1];
    s+=`<g class="wm-pin${i===sel?' sel':''}" data-p="${i}" style="--pc:${c}"><circle class="halo" cx="${q.x}" cy="${q.y}" r="9"/><circle class="hit" cx="${q.x}" cy="${q.y}" r="14"/><circle class="dot" cx="${q.x}" cy="${q.y}" r="7"/></g>`; });
  const sp=places[sel], q=sp&&WM_POS[sp.id];
  if(q&&q.r===region){ const t=sp.name.toUpperCase(), w=t.length*7.2+18, lx=Math.min(Math.max(q.x-w/2,6),634-w), ly=q.y-36<4||(q.x<260&&q.y-36<48)?q.y+16:q.y-36;
    s+=`<g pointer-events="none"><rect x="${lx}" y="${ly}" width="${w}" height="21" rx="5" fill="#ffd23f"/><text x="${lx+w/2}" y="${ly+14.5}" text-anchor="middle" class="wm-tl tag">${esc(t)}</text></g>`; }
  return s+'</svg>';
}
function wmRow(e,game){
  const [m,c]=wmMeth(e[2]), vers=ENC.v[game]||[], all=(1<<vers.length)-1;
  const lv=e[3]===e[4]?`LV ${e[3]}`:`LV ${e[3]}–${e[4]}`;
  const tod=e[6]===7?'':['MORN','DAY','NITE'].map((t,i)=>`<i class="${e[6]>>i&1?'on':''}">${t}</i>`).join('');
  const ver=e[7]===all?'':vers.map((v,i)=>`<i class="v${e[7]>>i&1?' on':''}">${v}</i>`).join('');
  const area=ENC.A[e[1]], note=ENC.N[e[8]];
  return `<div class="wm-r"><span class="wm-m" style="--c:${c}">${m}</span><span class="wm-lv">${lv}${wmChance(e[2])&&e[5]?` · ${e[5]}%`:''}</span>${area?`<span class="wm-a">${esc(area)}</span>`:''}
    ${tod||ver?`<span class="wm-ch">${tod}${ver}</span>`:''}${note?`<span class="wm-n">${esc(note)}</span>`:''}</div>`;
}
function wmRender(el,compact){
  const sp=SP.get(WM.sid), f=wmFind(WM.game,WM.sid), name=sp?sp.en:'?';
  const games=wmGames().filter(g=>GAMES.some(x=>x.k===g));
  const tabs=`<div class="wm-games">${games.map(g=>{ const x=GAMES.find(y=>y.k===g); return `<button type="button" data-g="${g}" class="${g===WM.game?'on':''}">${esc(x.s)}</button>`; }).join('')}</div>`;
  let banner='', places=[];
  if(!f) banner=`<b>Not found in ${esc(GAMES.find(x=>x.k===WM.game).s)}.</b> Trade it in from another game, or check its event distributions.`;
  else {
    places=wmPlaces(f.list);
    const src=SP.get(f.sid);
    if(f.evolve){ const steps=f.evolve.map(s=>`${esc(SP.get(s.from).en)} → ${esc(SP.get(s.to).en)} (${esc(s.how)}${s.trade?', trade':''})`).join(', then ');
      banner=`<b>Not found in the wild.</b> Get ${esc(src.en)} and evolve it: ${steps}.`; }
    else if(f.breed) banner=`<b>Not found in the wild.</b> Catch ${esc(src.en)}, leave it at the Day Care and hatch the Egg.`;
  }
  if(WM.sel>=places.length) WM.sel=0;
  const regions=[...new Set(places.map(p=>WM_POS[p.id]&&WM_POS[p.id].r).filter(Boolean))];
  const gameRegions=wmRegions(WM.game);
  if(!WM.region||!gameRegions.includes(WM.region)) WM.region=regions[0]||gameRegions[0];
  const regTabs=gameRegions.map(r=>{ const n=places.filter(p=>WM_POS[p.id]&&WM_POS[p.id].r===r).length;
    return `<button type="button" data-r="${r}" class="${r===WM.region?'on':''}${n?'':' none'}">${WM_MAPS[r].name}${n?` · ${n}`:''}</button>`; }).join('');
  const map=f?`<div class="wm-map">${wmSVG(WM.region,places,WM.sel)}<div class="wm-regs">${regTabs}</div></div>`:'';
  const list=`<div class="wm-list">${banner?`<div class="wm-banner">${banner}</div>`:''}${places.map((p,i)=>`<div class="wm-place${i===WM.sel?' sel':''}" data-p="${i}">
      <div class="wm-ph"><b>${esc(p.name)}</b>${WM_POS[p.id]?`<span class="wm-reg">${WM_MAPS[WM_POS[p.id].r].name}</span>`:'<span class="wm-reg">NOT ON THE MAP</span>'}</div>${p.rows.map(r=>wmRow(r,WM.game)).join('')}</div>`).join('')}</div>`;
  const head=`<div class="wm-h">${compact?'':'<span class="wm-spr"></span>'}<div><b>Where to find ${esc(name)}</b><small>${esc((WM_GAME[WM.game]||'').toUpperCase())}${f&&f.sid!==WM.sid?' · VIA '+esc(SP.get(f.sid).en.toUpperCase()):''}</small></div>${compact?'':'<button type="button" class="wm-x" aria-label="Close">✕</button>'}</div>`;
  el.innerHTML=compact?`${head}${tabs}${map}${list}`:`${head}<div class="wm-b"><div class="wm-left">${tabs}${map}</div>${list}</div><div class="wm-f"><span>SCHEMATIC MAP · DATA: POKEAPI</span><span>ESC TO CLOSE</span></div>`;
  const spr=el.querySelector('.wm-spr'); if(spr) spr.appendChild(imgEl(spriteChain({sid:WM.sid,sk:String(WM.sid)},false),name,()=>{}));
  el.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ SFX.tab(); WM.game=b.dataset.g; WM.sel=0; WM.region=null; wmRender(el,compact); });
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ SFX.tab(); WM.region=b.dataset.r; const i=places.findIndex(p=>WM_POS[p.id]&&WM_POS[p.id].r===WM.region); if(i>=0) WM.sel=i; wmRender(el,compact); });
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.p, q=WM_POS[places[i].id]; WM.sel=i; if(q) WM.region=q.r; SFX.tab(); wmRender(el,compact);
    if(b.classList.contains('wm-pin')){ const row=el.querySelector(`.wm-place[data-p="${i}"]`); if(row) row.scrollIntoView({block:'nearest',behavior:'smooth'}); } });
  const x=el.querySelector('.wm-x'); if(x) x.onclick=wmClose;
}

// ---- open / close (PC window; on a phone mob.js shows it in the sheet) ----
function wmOpen(game,sid){
  WM.game=game; WM.sid=sid; WM.sel=0; WM.region=null;
  if(window.matchMedia('(max-width:700px)').matches&&typeof mobSheet==='function'){ mobSheet('where'); return; }
  let w=$('wmWrap');
  if(!w){ w=document.createElement('div'); w.id='wmWrap'; w.className='wm-wrap';
    w.innerHTML='<div class="wm-scrim"></div><div class="wm-win" role="dialog" aria-modal="true" tabindex="-1"></div>'; document.body.appendChild(w);
    w.querySelector('.wm-scrim').onclick=wmClose; }
  w.hidden=false; WM.open=true; wmRender(w.querySelector('.wm-win')); w.querySelector('.wm-win').focus();
}
function wmClose(){ const w=$('wmWrap'); if(w) w.hidden=true; WM.open=false; }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&WM.open){ e.stopPropagation(); wmClose(); } },true);
// the "Catch in" numbers that have a map
const WM_PIN='<svg class="wm-pinic" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 11.5S1.5 7.2 1.5 4.6a4.5 4.5 0 0 1 9 0C10.5 7.2 6 11.5 6 11.5z"/><circle cx="6" cy="4.6" r="1.7" fill="#fff"/></svg>';
function wmWire(body,e){ body.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{ SFX.tab(); wmOpen(b.dataset.map,e.sid); }); }
