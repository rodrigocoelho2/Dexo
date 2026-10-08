/* ---------- TRAINER PROFILE (PC): account menu → View profile ---------- */
const PF={open:false,stats:null,pop:null,sel:null};
const PF_REGIONS=DEXB.filter(b=>b.grp==='REGIONS');
const pfFormKey=(()=>{ const m=new Map(); FORMS.forEach(L=>L.forEach(f=>m.set(f.key,f))); return m; })();
function pfAgo(ts){
  const m=Math.round((Date.now()-ts)/60000);
  if(m<1) return 'NOW'; if(m<60) return m+' MIN AGO'; const h=Math.round(m/60); if(h<24) return h+' H AGO';
  const d=Math.round(h/24); return d===1?'YESTERDAY':d<30?d+' D AGO':new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'}).toUpperCase();
}
// a catch-log entry → what to draw
function pfCatch(l){
  const parts=String(l.k||'').split('|'), gk=parts[0], v=parts[1]; let key=parts.slice(2).join('|'); let shiny=v==='shiny';
  if(key.startsWith('x:')){ shiny=true; key=key.slice(2); }
  let e=null;
  if(key.startsWith('s:')){ const sid=+key.slice(2); e={sid,sk:String(sid)}; }
  else if(key.startsWith('g:')){ const sid=+key.slice(2); e={sid,sk:String(sid),gfemale:true}; }
  else if(key.startsWith('f:')){ const f=pfFormKey.get(key.slice(2)); if(f) e={sid:f.sid,sk:f.sk}; }
  if(!e||!SP.has(e.sid)) return null;
  e.shiny=shiny; const g=GAMES.find(x=>x.k===gk);
  return {e,name:String(l.n||SP.get(e.sid).en).replace(/^★\s*/,''),game:g?g.s:gk.toUpperCase(),ts:l.ts};
}
function pfKeptLog(){
  const sets=new Map(), seen=new Set();
  const marked=k=>{ const p=String(k||'').split('|'), slot=p[0]+'|'+p[1];
    if(!sets.has(slot)) sets.set(slot,new Set((st.caught||{})[slot]||[])); return sets.get(slot).has(p.slice(2).join('|')); };
  return (st.log||[]).filter(l=>{ if(seen.has(l.k)||!marked(l.k)) return false; seen.add(l.k); return true; });
}
function pfDexStats(){
  const H=DEXB_HOME(), n=cset(H,'normal'), pct=(v)=>{ const L=entries(H,'all',v), c=cset(H,v); return L.length?Math.round(L.filter(e=>c.has(e.key)).length*100/L.length):0; };
  const total=ALL_IDS.filter(id=>n.has('s:'+id)).length;
  const games=PLAY.filter(g=>g.k!=='home'), done=games.filter(g=>{ const c=cset(g,'normal'), L=entries(g,'all','normal'); return L.length&&L.every(e=>c.has(e.key)); }).length;
  const origin=DEXB.find(b=>b.id==='roots').got().length;
  return {total,shiny:cset(H,'shiny').size,forms:pct('forms'),gender:pct('gender'),origin,done,games:games.length};
}
function pfClosePop(){ if(PF.pop){ PF.pop.remove(); PF.pop=null; } if(PF.sel){ PF.sel.classList.remove('sel'); PF.sel=null; } }
// a small pop-up under a badge with what it is for and how far you are
function pfPop(btn,color,label,html){
  if(PF.sel===btn){ pfClosePop(); return; } pfClosePop();
  const box=btn.closest('.pf-box');
  const pop=document.createElement('div'); pop.className='pf-pop'; pop.style.setProperty('--c',color); pop.setAttribute('role','dialog'); pop.setAttribute('aria-label',label);
  pop.innerHTML=html;
  box.style.position='relative'; box.appendChild(pop);
  const br=btn.getBoundingClientRect(), xr=box.getBoundingClientRect(), w=250;
  let left=br.left-xr.left+br.width/2-w/2; left=Math.max(8,Math.min(left,xr.width-w-8));
  pop.style.left=left+'px'; pop.style.top=(br.bottom-xr.top+12)+'px'; pop.style.setProperty('--ax',(br.left-xr.left+br.width/2-left)+'px');
  btn.classList.add('sel'); PF.sel=btn; PF.pop=pop;
}
function pfBadgePop(btn){
  const p=dexbProgress().find(x=>x.b.id===btn.dataset.db); if(!p) return;
  const on=!!(st.dexb&&st.dexb[p.b.id]), pct=Math.round(p.have*100/p.b.need);
  pfPop(btn,p.b.c,p.b.name,`${dexbGem(p.b,on,52)}<h4>${esc(p.b.name)}</h4><p>${esc(p.b.how)}.</p>`+
    (on?`<small class="got">EARNED ${dexbDate(st.dexb[p.b.id])} · ${esc(p.b.basis.toUpperCase())}</small>`
       :`<span class="pf-bar"><i style="width:${pct}%"></i></span><small>${p.have} / ${p.b.need} · ${p.b.need-p.have} TO GO · ${esc(p.b.basis.toUpperCase())}</small>`));
}
function pfBattlePop(btn){
  const b=BADGES.find(x=>x[0]===btn.dataset.bb); if(!b) return;
  const t=meCard(), on=(t.badges||[]).includes(b[0]), p=bbProgress(b[0],t,PF.stats);
  pfPop(btn,b[3],b[1],`<span class="dexb-gem${on?'':' off'}" style="--c:${b[3]};--s:52px"></span><h4>${esc(b[1])}</h4><p>${esc(b[2])}.</p>`+
    (on?`<small class="got">EARNED · BATTLE BADGE</small>`
       :p?`<span class="pf-bar"><i style="width:${Math.round(p.have*100/p.need)}%"></i></span>${p.gens?`<span class="pf-bgens">${p.gens.map(x=>`<i class="${x.on?'on':''}">GEN ${x.g}</i>`).join('')}</span>`:''}<small>${p.have} / ${p.need} ${esc(p.unit)} · ${p.need-p.have} TO GO</small>`
       :`<small>NOT EARNED YET · VS TRAINERS ONLY</small>`));
}
function pfRender(){
  const u=SYNC.user||{username:'?'}, L=$('pfLeft'), R=$('pfRight');
  $('pfSub').textContent=`${String(u.username).toUpperCase()}${u.isAdmin?' · ADMIN':''} · ${dexbCount()} / ${DEXB.length} DEX BADGES`;
  // left: trainer card + battle record
  L.innerHTML='';
  $('pfPartner').hidden=!SD.on;
  if(SD.on){
    const t=meCard(), wrap=document.createElement('div'); wrap.className='pf-card';
    wrap.appendChild(cardEl(t,{label:'TRAINER CARD · YOU',editable:true,foot:'YOUR PROFILE',acts:[]})); L.appendChild(wrap);
    const wl=(t.wins||0)+(t.losses||0), gens=[1,2,3,4,5].map(g=>({g,w:0,l:0}));
    (PF.stats||[]).forEach(r=>{ const g=sdGenOf(r.format); const x=gens[g-1]; if(x){ x.w+=r.wins; x.l+=r.losses; } });
    const last=(SD.hist||[])[0];
    const box=document.createElement('div'); box.className='pf-box';
    box.innerHTML=`<div class="pf-bh"><span>BATTLE RECORD</span><b>${t.played!=null?t.played:wl} BATTLES</b></div>
      <div class="pf-st4"><div>${t.wins||0}<small>WINS</small></div><div>${t.losses||0}<small>LOSSES</small></div><div>${wl?Math.round((t.wins||0)*100/wl)+'%':'—'}<small>WIN RATE</small></div><div>${t.streak||0}<small>STREAK</small></div></div>
      <div class="pf-gens">${gens.map(x=>{ const n=x.w+x.l; return `<div class="pf-gl"><span>GEN ${x.g}</span><span class="pf-wl">${n?`<i class="w" style="width:${x.w*100/n}%"></i><i class="l" style="width:${x.l*100/n}%"></i>`:''}</span><em>${x.w} W · ${x.l} L</em></div>`; }).join('')}</div>
      ${last?`<div class="pf-last"><span class="pf-res ${esc(last.result)}">${esc(String(last.result).toUpperCase())}</span><span>Last: ${esc(sdShortFmt(last.format))} vs ${esc(last.opponent)} · ${esc(pfAgo(Date.parse(last.endedAt)).toLowerCase())}</span><button type="button" class="pf-rp" data-rp="${esc(last.id)}">REPLAY ▸</button></div>`:'<div class="pf-last pf-empty">No battles yet.</div>'}`;
    L.appendChild(box);
    const rp=box.querySelector('[data-rp]'); if(rp) rp.onclick=()=>{ SFX.tab(); pfClose(); sdReplay(rp.dataset.rp); };
  } else {
    L.innerHTML='<div class="pf-box"><div class="pf-bh"><span>TRAINER</span></div><p class="pf-empty">Battles are turned off on this server, so there is no trainer card.</p></div>';
  }
  // right: living dex, dex badges, recent catches
  const d=pfDexStats(), H=DEXB_HOME(), n=cset(H,'normal'), p=Math.round(d.total*100/1025);
  const regs=PF_REGIONS.map(b=>{ const have=b.got().length; return `<div class="pf-rg${have>=b.need?' done':''}"><span>${esc(b.name.replace(' Complete','').toUpperCase())}</span><span class="pf-bar" style="--c:${b.c}"><i style="width:${Math.round(have*100/b.need)}%"></i></span><em>${have} / ${b.need}</em></div>`; }).join('');
  let gems='', grp='';
  DEXB.forEach(b=>{ if(grp&&b.grp!==grp) gems+='<span class="pf-gsep" aria-hidden="true"></span>'; grp=b.grp;
    const on=!!(st.dexb&&st.dexb[b.id]); gems+=`<button type="button" class="dexb-gem${on?'':' off'}" style="--c:${b.c};--s:32px" data-db="${b.id}" aria-label="${esc(b.name)}${on?', earned':''}"><b class="${b.gl.length>3?'sm':''}">${esc(b.gl)}</b></button>`; });
  // only catches still in the boxes (unmarking keeps the log entry), newest first, each Pokémon once
  const kept=pfKeptLog(), log=kept.map(pfCatch).filter(Boolean), week=kept.filter(l=>Date.now()-l.ts<7*864e5).length;
  R.innerHTML=`<div class="pf-box"><div class="pf-bh"><span>LIVING DEX · POKÉMON HOME</span><b>NATIONAL · NORMAL</b></div>
      <div class="pf-dexhead"><div class="pf-ring" style="--p:${p}"><div>${p}%<small>DONE</small></div></div>
        <div><div class="pf-big">${d.total} <small>/ 1025</small></div>
        <div class="pf-chips"><span class="pf-chip">Shiny <b>${d.shiny}</b></span><span class="pf-chip">Forms <b>${d.forms}%</b></span><span class="pf-chip">Genders <b>${d.gender}%</b></span><span class="pf-chip">Origin <b>${d.origin}</b></span><span class="pf-chip">Games done <b>${d.done} / ${d.games}</b></span></div></div></div>
      <div class="pf-regions">${regs}</div></div>
    ${SD.on?(()=>{ const have=new Set(meCard().badges||[]);
      return `<div class="pf-box"><div class="pf-bh"><span>BATTLE BADGES</span><b>${BADGES.filter(b=>have.has(b[0])).length} / ${BADGES.length}</b></div>
      <div class="pf-bbs">${BADGES.map(b=>`<button type="button" class="pf-bb${have.has(b[0])?'':' off'}" data-bb="${b[0]}" aria-label="${esc(b[1])}${have.has(b[0])?', earned':''}"><span class="dexb-gem${have.has(b[0])?'':' off'}" style="--c:${b[3]};--s:32px"></span><small>${esc(b[1].toUpperCase())}</small></button>`).join('')}</div></div>`; })():''}
    <div class="pf-box"><div class="pf-bh"><span>DEX BADGES</span><b>${dexbCount()} / ${DEXB.length}</b></div><div class="pf-gems">${gems}</div><div class="pf-tip">Click a badge to see what it's for.</div></div>
    <div class="pf-box"><div class="pf-bh"><span>RECENT CATCHES</span><b>LAST 7 DAYS · ${week}</b></div>
      ${log.length?`<div class="pf-catches">${log.slice(0,6).map((c,i)=>`<div class="pf-ct${c.e.shiny?' sh':''}"><span class="pf-spr" data-i="${i}"></span><b>${esc(c.name)}</b><small>${esc(c.game)} · ${pfAgo(c.ts)}</small></div>`).join('')}</div>`:'<p class="pf-empty">Mark a Pokémon in your boxes and it shows up here.</p>'}</div>`;
  log.slice(0,6).forEach((c,i)=>{ const slot=R.querySelector(`.pf-spr[data-i="${i}"]`); if(slot) slot.appendChild(imgEl(spriteChain(c.e,false),c.name)); });
  R.querySelectorAll('.pf-gems [data-db]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); SFX.tab(); pfBadgePop(b); });
  R.querySelectorAll('.pf-bbs [data-bb]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); SFX.tab(); pfBattlePop(b); });
}
async function pfOpen(){
  closeAccount(); dexbUpdate();
  PF.open=true; $('pfWrap').hidden=false; pfRender(); $('pfWin').focus();
  if(SD.on){
    try{ const [r]=await Promise.all([api('GET','/api/showdown/me/stats'),sdLoadLobbyData()]); if(r.ok) PF.stats=await r.json(); }catch(_){}
    if(PF.open) pfRender();
  }
}
function pfClose(){ pfClosePop(); PF.open=false; $('pfWrap').hidden=true; }
$('acctProfile').onclick=()=>{ SFX.tab(); pfOpen(); };
$('pfX').onclick=pfClose; $('pfClose').onclick=pfClose; $('pfScrim').onclick=pfClose;
$('pfPartner').onclick=()=>{ const b=$('pfLeft').querySelector('.s-partner button'); if(b) b.click(); };
$('pfWin').addEventListener('click',e=>{ if(PF.pop&&!PF.pop.contains(e.target)&&!e.target.closest('[data-db],[data-bb]')) pfClosePop(); });
document.addEventListener('keydown',e=>{ if(e.key!=='Escape'||!PF.open) return; if(PF.pop) pfClosePop(); else pfClose(); });
