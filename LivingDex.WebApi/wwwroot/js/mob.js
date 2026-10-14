/* ====================================================================================
   PHONE LAYOUT · only on screens up to 700 px wide. The PC layout is untouched: every
   element below is hidden there, and the bits of the page that move into sheets go back
   to their place when the screen gets wider again.
   ==================================================================================== */
const MOBQ=matchMedia('(max-width:700px)');
const isMob=()=>MOBQ.matches;
const MOBS={tab:'dex',sheet:null,lowerEl:null,lowerHome:null,lowerWas:false,backupHome:null,pagerKey:'',monKey:''};
const MSV=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MI={
  dex:MSV('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  battle:MSV('<path d="M4 4l11 11M20 4L9 15M13 17l4-4M7 13l4 4M17 17l2.5 2.5M7 17l-2.5 2.5"/>'),
  card:MSV('<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.4"/><path d="M5.5 16.5c.8-1.8 2.1-2.6 3.5-2.6s2.7.8 3.5 2.6M15 10h3M15 13.5h3"/>'),
  more:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  search:MSV('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.5-4.5"/>'),
  eye:MSV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  miss:MSV('<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 2.5"/><path d="M12 9v6M9 12h6"/>'),
  tap:MSV('<path d="M9 12V4.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v3.5c0 3.5-2.4 6.5-6 6.5h-1c-2.3 0-3.5-1.2-4.7-3L4 15a1.5 1.5 0 0 1 2.4-1.8L9 15"/>'),
  x:MSV('<path d="M6 6l12 12M18 6 6 18"/>'),
  theme:MSV('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 3.5a8.5 8.5 0 0 1 0 17" fill="currentColor"/>'),
  sound:MSV('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  music:MSV('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  lock:MSV('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  out:MSV('<path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M11 12h9M17 8.5l3.5 3.5-3.5 3.5"/>'),
  trash:MSV('<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l1 12.5h9l1-12.5"/>'),
  users:MSV('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.8-3.2 3-4.8 5.5-4.8s4.7 1.6 5.5 4.8"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.6.6 2.6 2 3 4.4"/>'),
  down:MSV('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'),
  hist:MSV('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3h3M12 8v4.2l2.8 1.8"/>'),
};

function mobBuild(){
  if($('mobNav')) return;
  const mk=(tag,id,cls,html)=>{ const e=document.createElement(tag); if(id) e.id=id; e.className='mobonly '+cls; if(html!=null) e.innerHTML=html; return e; };
  // bottom tab bar
  const nav=mk('nav','mobNav','mob-nav',[['dex','DEX'],['battle','BATTLE'],['card','TRAINER'],['more','MORE']].map(([k,l])=>`<button type="button" data-mt="${k}" aria-selected="false"><span class="mob-ti">${MI[k]}</span>${l}</button>`).join(''));
  nav.setAttribute('aria-label','Sections'); document.body.appendChild(nav);
  nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{ SFX.tab(); mobTab(b.dataset.mt); });
  // header: search button next to the account
  const sb=mk('button','mobSearchBtn','mob-hbtn',MI.search); sb.type='button'; sb.setAttribute('aria-label','Search'); sb.onclick=mobSearch; $('acct').before(sb);
  // the game you're tracking, as one card
  const gc=mk('button','mobGame','mob-game'); gc.type='button'; gc.onclick=()=>{ SFX.tab(); mobSheet('games'); }; document.querySelector('.gbar').before(gc);
  // box pager and the four tools under the box
  const pg=mk('div','mobPager','mob-pager'); $('box').after(pg);
  const tl=mk('div','mobTools','mob-tools',`<button type="button" data-tool="ov">${MI.eye}OVERVIEW</button><button type="button" data-tool="hl">${MI.miss}MISSING</button><button type="button" data-tool="tap">${MI.tap}TAP TO MARK</button><button type="button" data-tool="search">${MI.search}SEARCH</button>`);
  pg.after(tl);
  tl.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const t=b.dataset.tool; if(t==='ov') $('ovw').click(); else if(t==='hl') $('hl').click(); else if(t==='tap') $('quickBtn').click(); else mobSearch(); mobSync(); });
  // TRAINER and MORE
  const card=mk('section','mobCard','mob-view'), more=mk('section','mobMore','mob-view'); card.hidden=more.hidden=true; $('sdView').after(card,more);
  // one sheet, reused
  const sh=document.createElement('div'); sh.id='mobSheet'; sh.className='mob-sheetwrap'; sh.hidden=true;
  sh.innerHTML='<div class="mob-scrim"></div><div class="mob-sheet" role="dialog" aria-modal="true"><div class="mob-handle"></div><div class="mob-sbody"></div></div>';
  document.body.appendChild(sh); sh.querySelector('.mob-scrim').onclick=mobDismissSheet;
  // pull the sheet down with a finger: it follows, then closes (past a third, or with a quick flick) or springs back
  const shEl=sh.querySelector('.mob-sheet'), scrim=sh.querySelector('.mob-scrim');
  let d=null;
  shEl.addEventListener('touchstart',e=>{ const t=e.touches[0]; d=shEl.scrollTop<=0?{x:t.clientX,y:t.clientY,t:Date.now(),dy:0,on:false}:null; },{passive:true});
  shEl.addEventListener('touchmove',e=>{
    if(!d) return; const t=e.touches[0], dx=t.clientX-d.x, dy=t.clientY-d.y;
    if(!d.on){ if(dy<6||Math.abs(dx)>dy||shEl.scrollTop>0){ if(dy<0||Math.abs(dx)>Math.abs(dy)) d=null; return; } d.on=true; d.y=t.clientY; d.t=Date.now(); shEl.classList.add('drag'); }
    e.preventDefault(); d.dy=Math.max(0,t.clientY-d.y);
    shEl.style.transform=`translateY(${d.dy}px)`; scrim.style.opacity=String(Math.max(0,1-d.dy/shEl.offsetHeight));
  },{passive:false});
  const release=()=>{ if(!d||!d.on){ d=null; return; }
    const v=d.dy/Math.max(1,Date.now()-d.t), far=d.dy>shEl.offsetHeight*.3; shEl.classList.remove('drag');
    if(far||(v>.5&&d.dy>40)) mobDismissSheet(); else { shEl.style.transform=''; scrim.style.opacity=''; }
    d=null; };
  shEl.addEventListener('touchend',release,{passive:true}); shEl.addEventListener('touchcancel',release,{passive:true});
  // swipe the box sideways to change boxes
  let sx=0,sy=0; const box=$('box');
  box.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
  box.addEventListener('touchend',e=>{ if(!isMob()) return; const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){ const btn=dx<0?$('nextBox'):$('prevBox'); if(!btn.disabled) btn.click(); } },{passive:true});
  // tapping a Pokémon opens its sheet (unless "tap to mark" is on)
  $('slots').addEventListener('click',e=>{ if(!isMob()||st.quick) return; const b=e.target.closest('.slot'); if(!b||b.disabled) return; setTimeout(()=>mobSheet('mon'),0); });
  // the Pokédex menu becomes a sheet
  $('dexBtn').addEventListener('click',e=>{ if(!isMob()) return; e.stopImmediatePropagation(); e.preventDefault(); if(!$('dexBtn').disabled) mobSheet('dex'); },true);
  // a search that finds something opens that Pokémon
  $('searchForm').addEventListener('submit',()=>{ MOBS.searchBefore=current().i; },true);
  $('searchForm').addEventListener('submit',()=>{ if(!isMob()) return; const before=MOBS.searchBefore; setTimeout(()=>{ if(current().i!==before){ document.body.classList.remove('mob-searching'); $('q').blur(); mobSheet('mon'); } },0); });
  // Battle tab: Showdown or Daily Red (remembers the last one)
  const seg=mk('div','mobSeg','mob-seg','<button type="button" data-bm="showdown">SHOWDOWN</button><button type="button" data-bm="daily">DAILY RED<i aria-hidden="true"></i></button>');
  seg.setAttribute('role','group'); seg.setAttribute('aria-label','Battle mode'); $('sdView').before(seg);
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{ SFX.tab(); if(b.dataset.bm==='daily') drOpen(); else sdOpen(); mobSync(); window.scrollTo(0,0); });
  // battles: a slim bar on top instead of the page header
  const bt=mk('div','mobBtop','mob-btop',`<button type="button" aria-label="Back to the lobby">${MI.x}</button><span id="mobBinfo"></span><span id="mobBtn2"></span>`);
  $('sdBattle').prepend(bt);
  bt.querySelector('button').onclick=()=>{ SFX.tab(); const B=SD.battle; if(B&&(B.replay||B.result)) SD.battle=null; sdShow('lobby'); sdLoadLobbyData(); mobSync(); };
  new MutationObserver(()=>mobSync()).observe($('boxname'),{childList:true,subtree:true,characterData:true});
  new MutationObserver(()=>{ if(isMob()&&!$('app').hidden){ MOBS.tab='dex'; window.scrollTo(0,0); mobSync(); } }).observe($('app'),{attributes:true,attributeFilter:['hidden']});
  setInterval(mobSync,500);
}

function mobTab(t){
  MOBS.tab=t; mobCloseSheet(); document.body.classList.remove('mob-searching');
  if(t==='battle'&&st.battleMode==='daily'&&DR.on){ if(!DR.view) drOpen(); else if(DR.screen==='result') drHome(); }
  else if(t==='battle'){ if(!SD.view) sdOpen(); else if(SD.screen!=='lobby'&&!(SD.battle&&!SD.battle.result)) { SD.battle=null; sdShow('lobby'); sdLoadLobbyData(); } }
  else { if(SD.view) sdClose(true); if(DR.view) drClose(true); $('dexView').hidden=t!=='dex'; }
  if(t==='card') mobTrainer();
  if(t==='more') mobMore();
  mobSync(); window.scrollTo(0,0);
}

function mobSync(){
  if(!isMob()||!$('mobNav')) return;
  if(SD.view||DR.view) MOBS.tab='battle'; else if(MOBS.tab==='battle') MOBS.tab='dex';
  const nav=$('mobNav');
  nav.querySelectorAll('button').forEach(b=>{ b.setAttribute('aria-selected',String(b.dataset.mt===MOBS.tab)); if(b.dataset.mt==='battle'||b.dataset.mt==='card') b.hidden=!SD.on; });
  nav.querySelector('[data-mt="battle"]').classList.toggle('mob-dot',!$('sdDot').hidden||!$('drDot').hidden);
  const seg=$('mobSeg'), fight=(SD.view&&SD.screen==='battle')||(DR.view&&DR.screen==='battle');
  seg.hidden=MOBS.tab!=='battle'||fight||!DR.on;
  seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bm==='daily'?DR.view:SD.view)));
  seg.querySelector('i').hidden=$('drDot').hidden;
  nav.style.gridTemplateColumns=`repeat(${SD.on?4:2},1fr)`;
  document.body.classList.toggle('mob-fight',!!(SD.view&&SD.screen==='battle'));
  if(MOBS.tab==='card'||MOBS.tab==='more') $('dexView').hidden=true;
  $('mobCard').hidden=MOBS.tab!=='card'; $('mobMore').hidden=MOBS.tab!=='more';
  // game card
  const g=game(), v=variantOf(g), s=scopeOf(g), list=entries(g,s,v), n=countDone(g,v,list), {i}=current();
  const vn=(VARIANTS.find(o=>o.k===v)||{n:v}).n, sn=$('dexLbl').textContent||'';
  const gk=`${g.k}|${s}|${v}|${n}|${list.length}|${sn}`;
  if($('mobGame').dataset.k!==gk){ $('mobGame').dataset.k=gk; $('mobGame').style.setProperty('--gc',g.c);
    $('mobGame').innerHTML=`<span class="ab">${esc(g.s)}</span><span class="t">${esc(g.n)}</span><span class="n">${n}<small>/ ${list.length} · ${pct(n,list.length)}%</small></span><span class="s">${esc(sn.toUpperCase())} · ${esc(vn.toUpperCase())}</span><span class="pg"><i style="width:${pct(n,list.length)}%"></i></span><span class="chev">▾</span>`; }
  // pager
  const nb=Math.max(1,Math.ceil(list.length/30)), b=Math.floor(i/30), pk=`${gk}|${b}`;
  if(MOBS.pagerKey!==pk){ MOBS.pagerKey=pk; const c=cset(g,v); let dots='';
    for(let k=0;k<nb;k++){ let m=0; const f=k*30,t=Math.min(list.length,f+30); for(let x=f;x<t;x++) if(isDone(g,v,list[x],c)) m++; dots+=`<button type="button" data-b="${k}" class="${k===b?'cur':m===t-f?'full':m?'part':''}" aria-label="Box ${k+1}: ${m}/${t-f}"></button>`; }
    $('mobPager').innerHTML=`<span>BOX ${b+1} / ${nb}</span><div class="mob-dots">${dots}</div><span>SWIPE ⇄</span>`;
    $('mobPager').querySelectorAll('[data-b]').forEach(d=>d.onclick=()=>{ SFX.box(); setSel(+d.dataset.b*30,true); }); }
  // tools
  const T=$('mobTools'); T.querySelector('[data-tool="ov"]').setAttribute('aria-pressed',String(st.view==='over'));
  T.querySelector('[data-tool="hl"]').setAttribute('aria-pressed',String(!!st.hl)); T.querySelector('[data-tool="tap"]').setAttribute('aria-pressed',String(!!st.quick));
  T.querySelector('[data-tool="search"]').setAttribute('aria-pressed',String(document.body.classList.contains('mob-searching')));
  // open Pokémon sheet follows changes made inside it (DETAILS tab, mark, next)
  if(MOBS.sheet==='mon'){ const e=list[i], c=cset(g,v), d=e&&c.has(e.key)?detOf(g,v,e):{}; const mk=e?`${g.k}|${v}|${i}|${c.has(e.key)}|${d.ball||''}|${d.game||''}`:''; if(mk!==MOBS.monKey) mobMonSheet(); }
  // battle bar
  const B=SD.battle;
  if(B&&document.body.classList.contains('mob-fight')){ $('mobBinfo').textContent=`${sdShortFmt(B.format).toUpperCase()} · ${B.replay?'REPLAY':B.role==='spectator'?'WATCHING':'VS '+String(B.names[B.foe]||'').toUpperCase()}${B.turn?' · TURN '+B.turn:''}`;
    const tm=$('sdTmr'); $('mobBtn2').textContent=tm?tm.textContent:''; }
}

function mobSearch(){
  const on=!document.body.classList.contains('mob-searching');
  if(on&&MOBS.tab!=='dex') mobTab('dex');
  document.body.classList.toggle('mob-searching',on);
  if(on){ $('q').value=''; setTimeout(()=>$('q').focus(),30); } else $('q').blur();
  mobSync();
}

/* ---------- sheets ---------- */
function mobSheet(kind){
  const w=$('mobSheet'), body=w.querySelector('.mob-sbody');
  if(MOBS.sheet==='mon'&&kind!=='mon') mobLowerHome();
  MOBS.sheet=kind; w.hidden=false; document.body.classList.add('mob-locked');
  w.querySelector('.mob-sheet').scrollTop=0;
  if(kind==='mon') mobMonSheet(); else if(kind==='games') mobGamesSheet(body); else if(kind==='dex') mobDexSheet(body); else if(kind==='badge') mobBadgeSheet(body); else if(kind==='bbadge') mobBattleBadgeSheet(body); else if(kind==='where') mobWhereSheet(body);
}
// closes the sheet by sliding it down (tap outside, pull down, Esc); mobCloseSheet closes it at once
function mobDismissSheet(){
  const w=$('mobSheet'); if(!w||w.hidden||w.classList.contains('closing')) return;
  const sheet=w.querySelector('.mob-sheet'), done=()=>{ clearTimeout(timer); sheet.removeEventListener('transitionend',done); mobCloseSheet(); };
  w.classList.add('closing'); sheet.style.transform='translateY(100%)'; w.querySelector('.mob-scrim').style.opacity='0';
  sheet.addEventListener('transitionend',done); const timer=setTimeout(done,320);
}
function mobCloseSheet(){
  const w=$('mobSheet'); if(!w||w.hidden) return;
  w.classList.remove('closing'); const sheet=w.querySelector('.mob-sheet'); sheet.style.transform=''; sheet.classList.remove('drag'); w.querySelector('.mob-scrim').style.opacity='';
  if(MOBS.sheet==='mon') mobLowerHome();
  w.hidden=true; MOBS.sheet=null; MOBS.monKey=''; document.body.classList.remove('mob-locked');
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&MOBS.sheet) mobDismissSheet(); });

function mobMonSheet(){
  const body=$('mobSheet').querySelector('.mob-sbody');
  const {g,s,v,list,i}=current(), e=list[i]; if(!e){ mobCloseSheet(); return; }
  const sp=SP.get(e.sid), c=cset(g,v), have=c.has(e.key), d=have?detOf(g,v,e):{}, done=isDone(g,v,e,c);
  MOBS.monKey=`${g.k}|${v}|${i}|${have}|${d.ball||''}|${d.game||''}`;
  const lower=MOBS.lowerEl||(MOBS.lowerEl=$('lower'));
  if(!MOBS.lowerHome){ MOBS.lowerHome=[lower.parentElement,lower.nextSibling]; MOBS.lowerWas=!!st.lowerOpen; }
  lower.remove();
  const no=regionalNo(g,s,e.sid), bx=Math.floor(i/30)+1, r=Math.floor((i%30)/6)+1, col=i%6+1;
  const status=done?'<span class="mob-st ok"><i></i>CAUGHT</span>':have?'<span class="mob-st warn">NEEDS ORIGIN GAME</span>':'<span class="mob-st no">MISSING</span>';
  const date=d.ts?new Date(d.ts).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'—';
  body.innerHTML=`<div class="mob-hero${have?'':' missing'}"><div class="mob-np"><span class="mob-no">No. ${pad(no)} · B${bx} ${r}-${col}</span>${status}</div><div class="mob-stage"></div></div>
    <div class="mob-who"><b>${esc(sp.en)}${e.shiny?' <span class="mob-shiny">★</span>':''}</b><small>${esc(sp.ja)}</small></div>
    ${e.label?`<div class="mob-form">${esc(e.label)}</div>`:''}
    <div class="mob-types">${e.t.map(t=>`<span style="background:${typeColor(t)}">${esc(TYPES[t][0].toUpperCase())}</span>`).join('')}<em>${esc(REG[sp.gen]||'')} · GEN ${ROMAN[sp.gen]}</em></div>
    <div class="mob-facts"><div><span>OT GAME</span><b>${d.game&&ORIG[d.game]?esc(ORIG[d.game].n):'—'}</b></div><div><span>BALL</span><b>${d.ball&&BALL[d.ball]?esc(BALL[d.ball].n):'—'}</b></div><div><span>MARKED</span><b>${esc(date)}</b></div></div>
    <div class="mob-acts"><button type="button" class="mob-btn ${have?'ok':'red'}" id="mobMark">${have?'✓ MARKED':'MARK AS CAUGHT'}</button><button type="button" class="mob-btn" id="mobNext">NEXT MISSING ▸</button></div>
    <div class="mob-lowerslot"></div>`;
  const stage=body.querySelector('.mob-stage'), fit=el=>el.style.width=Math.min(230,Math.round((el.naturalWidth||el.width||64)*2.1))+'px';
  if(spriteMode==='on'){ const im=imgEl(spriteChain(e,true),sp.en,()=>{ im.remove(); stage.insertAdjacentHTML('beforeend','<span class="mob-ph"></span>'); },x=>{ if(isStatic(x)){ const cv=trimSprite(x); if(cv){ cv.style.width=Math.min(230,cv.width*2.4)+'px'; x.replaceWith(cv); return; } } fit(x); }); im.loading='eager'; stage.appendChild(im); }
  else stage.innerHTML='<span class="mob-ph"></span>';
  $('mobMark').onclick=()=>{ toggle(i); mobMonSheet(); };
  $('mobNext').onclick=()=>{ const j=nextMissing(i); if(j<0){ SFX.err(); flash('Nothing missing here'); return; } setSel(j); mobMonSheet(); };
  body.querySelector('.mob-lowerslot').appendChild(lower); st.lowerOpen=true; renderLower();
}
function mobLowerHome(){
  if(!MOBS.lowerHome) return; const [p,n]=MOBS.lowerHome, lower=MOBS.lowerEl;
  if(n&&n.parentNode===p) p.insertBefore(lower,n); else p.appendChild(lower);
  MOBS.lowerHome=null; st.lowerOpen=MOBS.lowerWas; renderLower();
}
function mobGamesSheet(body){
  let html='<h2 class="mob-sh"><span>CHOOSE A GAME</span><span>'+PLAY.length+' GAMES</span></h2><div class="mob-gens">', last='';
  GAMES.forEach(g=>{
    if(g.grp!==last){ if(last) html+='</div></div>'; last=g.grp; html+=`<div class="mob-gen"><span>${esc(g.grp)}</span><div>`; }
    if(g.soon){ html+=`<button class="mob-cart soon" type="button" style="--c:${g.c}" data-soon="${esc(g.n)}"><b>${esc(g.s)}</b><small>${esc(g.n)}</small><em>COMING SOON</em></button>`; return; }
    const v=variantOf(g), list=entries(g,scopeOf(g),v), n=countDone(g,v,list);
    html+=`<button class="mob-cart" type="button" style="--c:${g.c}" data-g="${g.k}" aria-pressed="${g.k===st.game}"><b>${esc(g.s)}</b><small>${esc(g.n)}</small><i><u style="width:${pct(n,list.length)}%"></u></i></button>`;
  });
  body.innerHTML=html+'</div></div></div>';
  body.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ st.game=b.dataset.g; st.gamesOpen=false; save(); SFX.box(); mobCloseSheet(); render(); mobSync(); window.scrollTo(0,0); });
  body.querySelectorAll('[data-soon]').forEach(b=>b.onclick=()=>{ SFX.err(); flash(`${b.dataset.soon} is coming soon`); });
}
function mobDexSheet(body){
  body.innerHTML='<h2 class="mob-sh"><span>POKÉDEX</span><span></span></h2><div class="mob-list"></div>'; const l=body.querySelector('.mob-list');
  $('dexPop').querySelectorAll('.tb-opt').forEach(o=>{ const b=document.createElement('button'); b.type='button'; b.className='mob-row'+(o.getAttribute('aria-checked')==='true'?' on':'');
    b.innerHTML=`<span>${esc(o.querySelector('span').textContent)}</span><small>${esc((o.querySelector('b')||{}).textContent||'')}</small>`; b.onclick=()=>{ o.click(); mobCloseSheet(); mobSync(); }; l.appendChild(b); });
}

/* ---------- TRAINER ---------- */
async function mobTrainer(){
  const el=$('mobCard');
  if(!SD.on){ el.innerHTML='<p class="mob-empty">Battles are turned off on this server.</p>'; return; }
  if(!el.childElementCount) el.innerHTML='<p class="mob-empty">Loading…</p>';
  await Promise.all([sdLoadLobbyData(),api('GET','/api/showdown/me/stats').then(r=>r.ok?r.json():null).then(j=>{ if(j) MOBS.bstats=j; }).catch(()=>{})]);
  if(MOBS.tab!=='card') return;
  const dx=dexbUpdate();
  const t=meCard(), played=t.played!=null?t.played:(t.wins||0)+(t.losses||0), wl=(t.wins||0)+(t.losses||0), have=new Set(t.badges||[]);
  el.innerHTML=`<div class="mob-cardslot"></div>
    <div class="mob-stats"><div><b>${played}</b><span>BATTLES</span></div><div><b>${wl?Math.round((t.wins||0)*100/wl)+'%':'—'}</b><span>WIN RATE</span></div><div><b>${t.streak||0}</b><span>STREAK</span></div></div>
    <div class="mob-lbl"><span>BADGES</span><span>${BADGES.filter(b=>have.has(b[0])).length} / ${BADGES.length}</span></div>
    <div class="mob-badges mob-dexb">${BADGES.map(b=>`<button type="button" class="mob-bdg${have.has(b[0])?'':' off'}" style="--c:${b[3]}" data-bb="${b[0]}" aria-label="${esc(b[1])}"><i></i><span>${esc(b[1].toUpperCase())}</span></button>`).join('')}</div>
    <div class="mob-lbl"><span>DEX BADGES</span><span>${dexbCount()} / ${DEXB.length}</span></div>
    <div class="mob-badges mob-dexb">${DEXB.map(b=>{ const on=!!(st.dexb&&st.dexb[b.id]); return `<button type="button" class="mob-bdg${on?'':' off'}" style="--c:${b.c}" data-db="${b.id}" aria-label="${esc(b.name)}">${dexbGem(b,on,30)}<span>${esc(b.name.toUpperCase())}</span></button>`; }).join('')}</div>
`;
  el.querySelector('.mob-cardslot').appendChild(cardEl(t,{label:'TRAINER CARD',editable:true}));
  el.querySelectorAll('[data-db]').forEach(b=>b.onclick=()=>{ SFX.tab(); MOBS.badge=b.dataset.db; mobSheet('badge'); });
  el.querySelectorAll('[data-bb]').forEach(b=>b.onclick=()=>{ SFX.tab(); MOBS.bbadge=b.dataset.bb; mobSheet('bbadge'); });
  if(dx.first&&dx.count) flash(`You already have ${dx.count} dex badge${dx.count>1?'s':''}`);
}

/* ---------- dex badges (Trainer tab) ---------- */
function mobBadgeSheet(body){
  const p=dexbProgress().find(x=>x.b.id===MOBS.badge); if(!p){ mobCloseSheet(); return; }
  const on=!!(st.dexb&&st.dexb[p.b.id]), pct=Math.round(p.have*100/p.b.need);
  body.innerHTML=`<div class="mob-dsheet" style="--c:${p.b.c}">${dexbGem(p.b,on,72)}<h3>${esc(p.b.name)}</h3><p>${esc(p.b.how)}.</p>
    ${on?`<small>EARNED ${dexbDate(st.dexb[p.b.id])} · ${esc(p.b.basis.toUpperCase())}</small>`:`<span class="br"><i style="width:${pct}%"></i></span><small>${p.have} / ${p.b.need} · ${p.b.need-p.have} TO GO · ${esc(p.b.basis.toUpperCase())}</small>`}</div>`;
}

/* ---------- where to find it (map, from the Pokémon sheet) ---------- */
function mobWhereSheet(body){
  const sp=SP.get(WM.sid);
  body.innerHTML=`<div><button type="button" class="wm-back">◂ ${esc((sp?sp.en:'BACK').toUpperCase())}</button><div class="wm-sheet"></div></div>`;
  body.querySelector('.wm-back').onclick=()=>{ SFX.tab(); mobSheet('mon'); };
  wmRender(body.querySelector('.wm-sheet'),true);
}

/* ---------- battle badges (Trainer tab) ---------- */
function mobBattleBadgeSheet(body){
  const b=BADGES.find(x=>x[0]===MOBS.bbadge); if(!b){ mobCloseSheet(); return; }
  const t=meCard(), on=(t.badges||[]).includes(b[0]), p=bbProgress(b[0],t,MOBS.bstats);
  const gens=p&&p.gens?`<span class="mob-bgens">${p.gens.map(x=>`<i class="${x.on?'on':''}">GEN ${x.g}</i>`).join('')}</span>`:'';
  body.innerHTML=`<div class="mob-dsheet" style="--c:${b[3]}"><span class="dexb-gem${on?'':' off'}" style="--c:${b[3]};--s:72px"></span><h3>${esc(b[1])}</h3><p>${esc(b[2])}.</p>
    ${on?`<small class="got">EARNED · BATTLE BADGE</small>`
      :p?`<span class="br"><i style="width:${Math.round(p.have*100/p.need)}%"></i></span>${gens}<small>${p.have} / ${p.need} ${esc(p.unit)} · ${p.need-p.have} TO GO</small>`
      :`<small>NOT EARNED YET</small>`}
    <small>ONLY BATTLES AGAINST OTHER TRAINERS COUNT</small></div>`;
}

/* ---------- MORE ---------- */
function mobMore(){
  const el=$('mobMore'), u=SYNC.user||{username:'?'}, admin=!!u.isAdmin;
  const row=(id,icon,label,sub,cls)=>`<button class="mob-li${cls?' '+cls:''}" type="button" data-act="${id}"><span class="gi">${icon}</span><span class="gx">${label}${sub?`<small>${sub}</small>`:''}</span><span class="go">›</span></button>`;
  el.innerHTML=`<div class="mob-grp"><div class="mob-me"><span class="mob-av">${esc(initials(u.username))}</span><span class="gx"><b>${esc(u.username)}${admin?'<span class="mob-adm">ADMIN</span>':''}</b><small>Signed in on this device</small></span></div></div>
    <div class="mob-lbl"><span>APPEARANCE &amp; SOUND</span></div>
    <div class="mob-grp"><div class="mob-li static"><span class="gi">${MI.theme}</span><span class="gx">Theme<small>Colour of the boxes and panels</small></span></div><div class="mob-sw"></div>
      <button class="mob-li" type="button" id="mobSnd"><span class="gi">${MI.sound}</span><span class="gx">Sound<small>Cries and menu sounds</small></span><span class="mob-tg${st.sound?' on':''}"></span></button>
      ${SD.on?`<button class="mob-li" type="button" id="mobMus"><span class="gi">${MI.music}</span><span class="gx">Battle music<small>One track per generation</small></span><span class="mob-tg${SDM.on()?' on':''}"></span></button>`:''}</div>
    <div class="mob-lbl"><span>ACCOUNT</span></div>
    <div class="mob-grp">${row('acctPass',MI.lock,'Change password')}${row('acctOut',MI.out,'Sign out')}${row('acctDelete',MI.trash,'Delete account','','danger')}</div>
    ${admin?`<div class="mob-lbl"><span>SERVER · ADMIN</span></div><div class="mob-grp">${row('acctUsers',MI.users,'Manage users','Accounts, passwords, sign-ups')}${row('acctAssets',MI.down,'Download all assets','Sprites, cries, backgrounds and music')}</div>`:''}
    <div class="mob-lbl"><span>BACKUP &amp; HISTORY</span></div><div class="mob-backup"></div>
    <p class="mob-foot">HOME LIVING DEX · SELF-HOSTED</p>`;
  buildSwatches(el.querySelector('.mob-sw')); syncSwatches();
  $('mobSnd').onclick=()=>{ $('sndBtn').click(); mobMore(); };
  if($('mobMus')) $('mobMus').onclick=()=>{ SDM.toggle(); mobMore(); };
  el.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>$(b.dataset.act).click());
  const bk=document.querySelector('details.backup');
  if(!MOBS.backupHome) MOBS.backupHome=[bk.parentElement,bk.nextSibling];
  el.querySelector('.mob-backup').appendChild(bk);
}
function mobBackupHome(){ if(!MOBS.backupHome) return; const [p,n]=MOBS.backupHome, bk=document.querySelector('details.backup'); if(n&&n.parentNode===p) p.insertBefore(bk,n); else p.appendChild(bk); MOBS.backupHome=null; }

/* switching between phone and PC layouts (rotating a tablet, resizing a window) */
function mobMode(){
  if(isMob()){ mobBuild(); mobSync(); return; }
  mobCloseSheet(); mobBackupHome();
  document.body.classList.remove('mob-fight','mob-searching','mob-locked');
  if($('mobCard')){ $('mobCard').hidden=true; $('mobMore').hidden=true; }
  if(!SD.view&&!DR.view) $('dexView').hidden=false;
  if(MOBS.tab==='card'||MOBS.tab==='more') MOBS.tab='dex';
}
/* ---------- installed as an app (home screen): status-bar strip, offline page, install hint ---------- */
const MOB_STANDALONE=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const MOB_IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function mobApp(){
  if(!$('mobSbar')){ const sb=document.createElement('div'); sb.id='mobSbar'; sb.className='mob-sbar mobonly'; sb.setAttribute('aria-hidden','true'); document.body.appendChild(sb); }
  // the service worker only shows the offline page when the server can't be reached; it needs HTTPS (or localhost)
  if('serviceWorker' in navigator && window.isSecureContext && (isMob()||MOB_STANDALONE)) navigator.serviceWorker.register('/sw.js').catch(()=>{});
  if(MOB_IOS && !MOB_STANDALONE && isMob()) setTimeout(mobInstallHint,1500);
}
function mobInstallHint(){
  let seen=false; try{ seen=localStorage.getItem('ld.installHint')==='1'; }catch(_){}
  if(seen||$('mobHint')||!isMob()) return;
  const share=`<svg width="15" height="17" viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 11V1M4.5 4.5 8 1l3.5 3.5"/><path d="M5 7H2.5v9.5h11V7H11"/></svg>`;
  const el=document.createElement('div'); el.id='mobHint'; el.className='mob-hint mobonly'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Install Living Dex');
  el.innerHTML=`<div class="mh-hd"><img src="/apple-touch-icon.png" alt="" width="38" height="38"><div><b>Install Living Dex</b><small>OPENS FULL SCREEN, LIKE AN APP</small></div><button type="button" class="mh-x" aria-label="Close">✕</button></div>
    <ol><li><em>1</em> Tap <span class="mh-sh">${share} Share</span> in Safari <span class="mh-or">(under ⋯ on newer iPhones)</span></li><li><em>2</em> Choose <b>Add to Home Screen</b></li></ol>`;
  document.body.appendChild(el);
  el.querySelector('.mh-x').onclick=()=>{ try{ localStorage.setItem('ld.installHint','1'); }catch(_){} el.remove(); };
}
mobApp();
MOBQ.addEventListener('change',mobMode);
mobBuild(); mobMode();
