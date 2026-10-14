
/* ====================================================================================
   DAILY RED · one team a day for every trainer (six level 100 Gen 1–3 Pokémon with Gen 3
   sets), one official battle a day against Red on Mt. Silver, unlimited practice runs.
   The day is the trainer's own date, so the team changes at their midnight. Battles run
   in the server's Showdown simulator and use Showdown's connection (sd.js); the battle is
   one big FireRed/LeafGreen-style window with the log beside it.
   ==================================================================================== */
const DR={on:false,view:false,screen:'home',data:null,date:'',loading:false,battle:null,joinBuf:null,lead:0,showMatch:false,showRedSets:false,starting:false};
const DR_FMT=f=>f==='dailyred'?'OFFICIAL BATTLE':'PRACTICE RUN';
const drDate=()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const drClock=()=>{ const n=new Date(), m=new Date(n); m.setHours(24,0,0,0); const s=Math.max(0,Math.floor((m-n)/1000)); return [s/3600|0,(s/60|0)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':'); };
const drTy=t=>`<span class="dly-ty" style="background:${TYC[t]||'#888'}">${esc(String(t||'???').toUpperCase())}</span>`;
const drImg=(species,back,cls)=>`<img class="dly-px${cls?' '+cls:''}" alt="${esc(species)}" ${chainAttr(battleChain({species,shiny:false,gender:''},!!back,3))}>`;
const drHpCls=p=>p<=20?'r':p<=50?'y':'';
const drSpeedMul=()=>st.drFast===false?1:.55;
const drWait=(B,ms)=>B.fast?Promise.resolve():sdWait(ms*drSpeedMul());

/* Mt. Silver at night: the field drawn once as an SVG background (in script, so the theme picker leaves its colours alone). */
const DR_BG=(()=>{
  let s=7; const rnd=()=>(s=(s*16807)%2147483647)/2147483647; let stars='';
  for(let i=0;i<40;i++) stars+=`<circle cx="${(rnd()*240).toFixed(1)}" cy="${(rnd()*40).toFixed(1)}" r="${(.3+rnd()*.3).toFixed(2)}" fill="#fff" opacity="${(.4+rnd()*.5).toFixed(2)}"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 108" preserveAspectRatio="none"><defs><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1630"/><stop offset=".7" stop-color="#2a3a6a"/><stop offset="1" stop-color="#55679a"/></linearGradient><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe8f4"/><stop offset="1" stop-color="#b8c6dc"/></linearGradient></defs>`
    +`<rect width="240" height="108" fill="url(#k)"/>${stars}`
    +`<path d="M0 58 L22 38 L34 46 L58 22 L74 36 L92 28 L118 48 L140 30 L162 42 L186 18 L206 34 L224 28 L240 40 V70 H0Z" fill="#3c4c7c"/>`
    +`<path d="M58 22 L66 30 L62 32 L56 28 L50 30Z M186 18 L194 26 L190 28 L184 24 L178 27Z M140 30 L146 36 L136 36Z" fill="#e8eef8"/>`
    +`<path d="M0 66 L30 52 L52 60 L80 46 L108 58 L136 50 L170 60 L200 48 L240 58 V80 H0Z" fill="#6878a8"/>`
    +`<rect y="68" width="240" height="40" fill="url(#n)"/><path d="M0 74 Q60 70 120 74 T240 72" stroke="#fff" stroke-width=".6" fill="none" opacity=".7"/>`
    +`<ellipse cx="170" cy="62" rx="44" ry="8" fill="#a8b8d0"/><ellipse cx="170" cy="61" rx="40" ry="6" fill="#c8d4e6"/>`
    +`<ellipse cx="62" cy="102" rx="56" ry="9" fill="#a8b8d0"/><ellipse cx="62" cy="101" rx="52" ry="7" fill="#c8d4e6"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

/* ---------------- start / stop (called by sd.js once Showdown is available) ---------------- */
function drInit(){
  if(DR.on) return; DR.on=true; drSync(); drLoad();
  if(location.hash==='#dailyred') drOpen();
}
function drStop(){ DR.on=false; DR.battle=null; DR.data=null; if(DR.view) drClose(true); drSync(); }
async function drLoad(){
  if(!DR.on||DR.loading) return; DR.loading=true;
  const date=drDate();
  try{ const r=await api('GET','/api/dailyred?date='+date); if(r.ok){ DR.data=await r.json(); DR.date=date; } }catch(_){}
  DR.loading=false;
  const d=DR.data; if(!d) return;
  const saved=st.drLead&&st.drLead.date===d.date?st.drLead.i:0; DR.lead=Math.max(0,Math.min(5,saved|0));
  drSync();
  if(DR.view&&DR.screen==='home'){ drRenderHome();
    if(d.runningBattleId&&!(DR.battle&&DR.battle.id===d.runningBattleId)&&SD.conn) drJoin(d.runningBattleId); }
  if(DR.view&&DR.screen==='result') drResultStats();
}
function drSync(){
  const b=$('drBtn'); if(!b) return;
  b.hidden=!DR.on||SD.view||DR.view;
  const d=DR.data, live=!!(DR.battle&&!DR.battle.result)||!!(d&&d.runningBattleId), todo=!!(d&&d.team&&d.official.status==='none');
  $('drDot').hidden=!(live||todo); b.classList.toggle('dly-live',live);
  const t=live?'Daily Red · battle in progress':todo?'Daily Red · not played today':'Daily Red';
  b.title=t; b.setAttribute('aria-label',t);
}
function drSub(){
  if(!DR.view) return;
  const d=DR.data, day=d?new Date(d.date+'T12:00:00'):new Date();
  const when=day.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase();
  $('brandSub').textContent=(d?`NO. ${d.no} · `:'')+`${when} · NEXT TEAM ${drClock()}`;
}
setInterval(()=>{
  if(!DR.on) return;
  if(DR.date&&drDate()!==DR.date&&!DR.loading) drLoad();   // past the trainer's midnight: a new team
  if(DR.view){ drSub(); const c=document.getElementById('drNext'); if(c) c.textContent=drClock(); }
},1000);

/* ---------------- view switching ---------------- */
function drOpen(){
  if(!DR.on) return;
  if(SD.view) sdClose(true);
  DR.view=true; document.body.classList.add('drmode'); setAcctPop(false);
  $('dexView').hidden=true; $('drView').hidden=false; $('sdBack').hidden=false; $('sdBtn').hidden=true;
  $('brandTitle').textContent='DAILY RED'; drSub(); document.title='Daily Red';
  if(location.hash!=='#dailyred') history.replaceState(null,'','#dailyred');
  if(st.battleMode!=='daily'){ st.battleMode='daily'; save(); }
  const B=DR.battle;
  if(B&&!B.result){ drShow('battle'); drPlayMusic(B); }
  else if(B&&B.result&&DR.screen==='result') drShow('result');
  else { DR.battle=null; drShow('home'); drRenderHome(); }
  drLoad(); drSync(); window.scrollTo(0,0);
}
function drClose(quiet){
  DR.view=false; document.body.classList.remove('drmode','dly-fight','dly-center'); SDM.stop();
  $('drView').hidden=true; $('dexView').hidden=false; $('sdBack').hidden=true; $('sdBtn').hidden=!SD.on;
  $('brandTitle').textContent='HOME LIVING DEX'; $('brandSub').textContent='BOX TRACKER · B2 STYLE'; document.title='HOME Living Dex';
  if(location.hash==='#dailyred') history.replaceState(null,'',location.pathname+location.search);
  if(DR.battle&&DR.battle.result) DR.battle=null;
  drSync(); if(!quiet) sdChalPopup();
}
function drShow(screen){
  DR.screen=screen;
  $('drHome').hidden=screen!=='home'; $('drBattle').hidden=screen!=='battle'; $('drResult').hidden=screen!=='result';
  document.body.classList.toggle('dly-fight',DR.view&&screen==='battle');
  document.body.classList.toggle('dly-center',DR.view&&screen!=='home');
  if(typeof mobSync==='function') mobSync();
}
function drHome(){ SFX.tab(); SDM.stop(); if(DR.battle&&DR.battle.result) DR.battle=null; drShow('home'); drRenderHome(); drLoad(); window.scrollTo(0,0); }
$('drBtn').onclick=()=>{ SFX.tab(); drOpen(); };
{ const back=$('sdBack').onclick; $('sdBack').onclick=()=>{ if(DR.view){ SFX.tab(); drClose(); } else back(); }; }
window.addEventListener('hashchange',()=>{ if(location.hash==='#dailyred'&&!DR.view) drOpen(); else if(location.hash!=='#dailyred'&&DR.view) drClose(); });

/* ---------------- home page ---------------- */
const DR_SNOW='<div class="dly-snow" aria-hidden="true"></div>';
const drRedOf=n=>`<b class="dly-redn">RED's</b> ${esc(n)}`;
function drField(foe,me,meName,meHp){
  return `<div class="dly-field" style='background-image:${DR_BG}'>
    <div class="dly-mon dly-foe">${drImg(foe,false)}</div><div class="dly-mon dly-me" data-pmon>${drImg(me,true)}</div>${DR_SNOW}
    <div class="dly-hp dly-foe"><div class="dly-r1"><span class="dly-nm"><span>${drRedOf(foe)}</span></span><span>Lv100</span></div><div class="dly-hpbar"><span>HP</span><div><i style="width:100%"></i></div></div><div class="dly-party">${'<i></i>'.repeat(6)}</div></div>
    <div class="dly-hp dly-me"><div class="dly-r1"><span class="dly-nm"><span>${esc(meName)}</span></span><span>Lv100</span></div><div class="dly-hpbar"><span>HP</span><div><i style="width:100%"></i></div></div><div class="dly-nums"><div class="dly-party">${'<i></i>'.repeat(6)}</div><span>${meHp}/ ${meHp}</span></div></div></div>
    <div class="dly-pmsg"><div data-pmsg>RED wants to battle! Go, ${esc(meName)}!</div></div>`;
}
/* Picking another lead on the home page: the old one is called back, the new one comes out. */
async function drLeadSwap(oldImg,oldName,newName){
  const box=document.querySelector('#drHome [data-pmon]'), msg=document.querySelector('#drHome [data-pmsg]');
  if(!box||!oldImg||oldName===newName||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const im=box.querySelector('img'); if(!im) return;
  const ghost=oldImg.cloneNode(true); ghost.classList.add('dly-ghost'); box.appendChild(ghost);
  im.style.visibility='hidden'; if(msg) msg.textContent=`${oldName}, come back!`;
  await ghost.animate([{transform:'scale(1)',filter:'none'},{transform:'scale(0)',filter:'brightness(.9) sepia(1) saturate(6) hue-rotate(-30deg)'}],{duration:380,easing:'steps(8)',fill:'forwards'}).finished;
  ghost.remove(); if(!im.isConnected) return;
  await new Promise(r=>{ if(im.complete) r(); else { im.addEventListener('load',r,{once:true}); im.addEventListener('error',r,{once:true}); setTimeout(r,800); } });
  if(msg) msg.textContent=`RED wants to battle! Go, ${newName}!`;
  im.style.visibility='';
  await im.animate([{transform:'scale(.15)',filter:'brightness(4)'},{transform:'scale(1)',filter:'brightness(4)',offset:.6},{transform:'scale(1)',filter:'brightness(1)'}],{duration:420,easing:'steps(8)'}).finished;
}
function drShareText(no,won,turns,grid){ return `Daily Red No. ${no} · ${won?'WIN':'LOSS'} ${turns}T\n${[...String(grid||'')].map(c=>c==='1'?'🟩':'🟥').join('')}\nHOME Living Dex`; }
async function drCopy(text){ try{ await navigator.clipboard.writeText(text); SFX.mark(); flash('Result copied'); }catch(_){ SFX.err(); flash('Could not copy the result'); } }
function drRenderHome(){
  const el=$('drHome'), d=DR.data;
  if(!d){ el.innerHTML='<div class="dly-page"><p class="dly-sub">Loading today\'s team…</p></div>'; return; }
  const team=d.team||[], red=d.red||[], L=team[DR.lead]||team[0], o=d.official, run=d.runningBattleId, ready=d.available&&!!SD.conn&&!!team.length;
  const done=o.status==='won'||o.status==='lost';
  let cta;
  if(run) cta=`<div class="dly-ctas"><button class="dly-bigred" type="button" data-a="resume">${d.runningOfficial?'CONTINUE BATTLE':'CONTINUE PRACTICE'}</button></div><p class="dly-note">${d.runningOfficial?'Your official battle is waiting where you left it.':'A practice run is in progress.'}</p>`;
  else if(done) cta=`<div class="dly-done"><b class="${o.status==='won'?'w':'l'}">${o.status==='won'?'YOU BEAT RED TODAY!':'RED WON TODAY.'}</b><small>${o.status==='won'?`${o.left} left`:`Red had ${o.redLeft} left`} · ${o.turns} turns · next team in <span id="drNext">${drClock()}</span></small>
      <div class="dly-ctas" style="margin-top:4px"><button class="dly-bigred" type="button" data-a="practice" ${ready?'':'disabled'}>PRACTICE RUN</button><button class="dly-link" type="button" data-a="copy">COPY RESULT</button></div></div>`;
  else cta=`<div class="dly-ctas"><button class="dly-bigred" type="button" data-a="battle" ${ready?'':'disabled'}>BATTLE RED</button><button class="dly-link" type="button" data-a="practice" ${ready?'':'disabled'}>PRACTICE RUN</button></div>`;
  const problem=!d.available?'<p class="dly-off">Battles are unavailable right now: the battle simulator is not running.</p>':!SD.conn?'<p class="dly-note">Connecting to the battle server…</p>':'';
  const hero=`<div class="dly-hero"><div>
      <div class="dly-eyebrow">DAILY RED · <b>NO. ${d.no}</b></div>
      <div class="dly-big">BEAT <i>RED</i> WITH TODAY'S SIX.</div>
      <p class="dly-lede">The same six level 100 Pokémon for every trainer today. <b>One official battle a day</b>, the rest are practice. Runs on the <b>Showdown</b> simulator with <b>Gen 3 rules</b>.</p>
      ${L&&!run&&o.status==='none'?`<div class="dly-leadpill"><div class="dly-who">${drImg('Pikachu')}<div><small>RED LEADS WITH</small>Pikachu</div></div><div class="dly-who">${drImg(L.species)}<div><small>YOUR LEAD</small>${esc(L.species)}</div></div><button class="dly-chg" type="button" data-a="lead">CHANGE LEAD</button></div>`:''}
      ${cta}${problem}
    </div>${L?`<div class="dly-prev">${drField('Pikachu',L.species,L.species,L.stats.hp)}</div>`:''}</div>`;
  const lead=L?`<div class="dly-card dly-leadc"><span class="dly-badge">LEAD</span>
      <div class="dly-lh"><div class="dly-spr">${drImg(L.species)}</div><div><b>${esc(L.species)}</b>${L.types.map(drTy).join('')}</div></div>
      <div class="dly-kv"><span>Item</span><div>${esc(L.item||'—')}</div><span>Ability</span><div><u title="${esc(L.abilityDesc||'')}">${esc(L.ability||'—')}</u></div><span>Base stat total</span><div>${L.bst}</div></div>
      <div class="dly-stats">${[['HP','hp'],['Atk','atk'],['Def','def'],['SpA','spa'],['SpD','spd'],['Spe','spe']].map(([k,s])=>`<div><small>${k}</small><b>${L.stats[s]}</b></div>`).join('')}</div>
      <div class="dly-moves">${L.moves.map(m=>`<div title="${esc(`${m.type} · ${m.category}${m.power?' '+m.power:''}${m.accuracy?' · '+m.accuracy+'%':''} · ${m.desc}`)}"><i style="background:${TYC[m.type]||'#888'}"></i>${esc(m.name)}</div>`).join('')}</div></div>`:'';
  const rows=team.map((m,i)=>i===DR.lead?'':`<div class="dly-mrow" ${run?'aria-disabled="true"':`role="button" tabindex="0" data-lead="${i}" aria-label="Set ${esc(m.species)} as your lead"`}>${drImg(m.species)}<div><b>${esc(m.species)}</b>${m.types.map(drTy).join('')}</div><div class="dly-ia">${esc(m.item||'—')}<br>${esc(m.ability||'')}</div><div class="dly-bst">${m.bst}</div><span class="dly-setl">SET AS LEAD</span></div>`).join('');
  const mu=d.matchups||[];
  const mtab=DR.showMatch&&mu.length?`<div class="dly-mtab"><table><thead><tr><th>YOURS</th>${mu.map(c=>`<th>${drImg(c.species)}<br>${esc(c.species.toUpperCase())}</th>`).join('')}</tr></thead><tbody>
      ${team.map((m,i)=>`<tr><td>${drImg(m.species)} ${esc(m.species)}</td>${mu.map(c=>{ const x=c.rows[i]||{}; return `<td title="${esc(`${m.species}'s ${x.dealMove||'—'}: ${x.deal}% · ${c.species}'s ${x.takeMove||'—'}: ${x.take}% · ${x.faster>0?'you are faster':x.faster<0?'Red is faster':'same speed'}`)}"><span class="dly-dl${x.deal>=100?' dly-ko':''}">${x.deal}%</span> / <span class="dly-tk${x.take>=100?' dly-ko':''}">${x.take}%</span><small>${x.faster>0?'faster':x.faster<0?'slower':'tie'}</small></td>`; }).join('')}</tr>`).join('')}
      </tbody></table><p class="dly-note"><span class="dly-dl">Green</span>: your best hit on that Pokémon of Red's. <span class="dly-tk">Red</span>: its best hit back. Average roll, full HP, no boosts; 100% is a knockout.</p></div>`:'';
  const s=d.stats;
  el.innerHTML=`<div class="dly-page">${hero}
    ${team.length?`<h2 class="dly-h2" id="drTeam">TODAY'S TEAM</h2><p class="dly-sub">Six random fully evolved Gen 1–3 Pokémon with Gen 3 sets, all level 100. Pick who goes first.</p>
    <div class="dly-tgrid">${lead}<div class="dly-rows">${rows}</div></div>
    <div class="dly-card dly-matchups"><div><b>Today's matchups</b><p>Who hits each of Red's Pokémon hardest, and how hard Red hits back.</p></div><button class="dly-ghost" type="button" data-a="match">${DR.showMatch?'HIDE MATCHUPS':'SHOW MATCHUPS'}</button>${mtab}</div>`:''}
    <div class="dly-rgrid">
      <div class="dly-card dly-redc">
        <div class="dly-redl"><h3 class="dly-redt">Red's team on Mt. Silver</h3>
          <p>Red's team never changes: Pikachu, Espeon, Snorlax, Venusaur, Charizard and Blastoise, all at level 100 with perfect IVs and held items. He always leads with Pikachu. He has nothing to say.</p>
          <div class="dly-rstats"><div><b>${s.played}</b><small>Played</small></div><div><b>${s.winPct}</b><small>Win %</small></div><div><b>${s.streak}</b><small>Win streak</small></div><div><b>${s.dayStreak}</b><small>Day streak</small></div></div>
          <button class="dly-redmore" type="button" data-a="redsets" aria-expanded="${DR.showRedSets?'true':'false'}">${DR.showRedSets?"Hide Red's moves and items":"Show Red's moves and items"}</button></div>
        <div class="dly-rteam">${red.map(m=>`<div>${drImg(m.species)}<b>${esc(m.species)}</b><span class="dly-rty">${m.types.map(drTy).join('')}</span></div>`).join('')}</div>
        ${DR.showRedSets?`<div class="dly-rsets">${red.map(m=>`<div class="dly-rset"><div class="dly-rsh"><b>${esc(m.species)}</b><span class="dly-rty">${m.types.map(drTy).join('')}</span></div>
          <dl><dt>Item</dt><dd>${esc(m.item||'—')}</dd><dt>Ability</dt><dd>${esc(m.ability||'—')}</dd></dl>
          <ul>${m.moves.map(x=>`<li title="${esc(`${x.type} · ${x.category}${x.power?' '+x.power:''}${x.accuracy?' · '+x.accuracy+'%':''}`)}"><i style="background:${TYC[x.type]||'#888'}"></i>${esc(x.name)}</li>`).join('')}</ul></div>`).join('')}</div>`:''}
      </div>
    </div></div>`;
  wireChains(el);
  // the whole row picks the lead (mouse, tap, Enter or Space)
  const setLead=i=>{ SFX.move(); const old=el.querySelector('[data-pmon] img'), was=(team[DR.lead]||{}).species; DR.lead=i; st.drLead={date:d.date,i}; save(); drRenderHome(); drLeadSwap(old,was,(team[i]||{}).species); };
  el.querySelectorAll('[data-lead]').forEach(r=>{ r.onclick=()=>setLead(+r.dataset.lead); r.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); setLead(+r.dataset.lead); } }; });
  el.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.a;
    if(a==='battle') drStart(false,b); else if(a==='practice') drStart(true,b); else if(a==='resume') drJoin(run);
    else if(a==='match'){ SFX.tab(); DR.showMatch=!DR.showMatch; drRenderHome(); }
    else if(a==='lead'){ SFX.tab(); $('drTeam')?.scrollIntoView({behavior:'smooth',block:'start'}); }
    else if(a==='redsets'){ SFX.tab(); DR.showRedSets=!DR.showRedSets; drRenderHome(); }
    else if(a==='copy') drCopy(drShareText(d.no,o.status==='won',o.turns,o.grid));
  });
}
async function drStart(practice,btn){
  if(DR.starting) return;
  if(!SD.conn){ SFX.err(); flash('Not connected to the battle server'); return; }
  DR.starting=true; if(btn) btn.disabled=true; SFX.tab();
  let r=null; try{ r=await SD.conn.invoke('DailyRedStart',drDate(),!!practice,DR.lead); }catch(_){}
  DR.starting=false; if(btn) btn.disabled=false;
  if(!r||r.error){ SFX.err(); flash(r&&r.error||'The battle server did not answer'); drLoad(); return; }
  await drJoin(r.battleId); drLoad();
}

/* ---------------- battle: state and connection ---------------- */
function drOwns(id){ return !!id&&(!!(DR.battle&&DR.battle.id===id)||!!(DR.joinBuf&&DR.joinBuf.id===id)); }
function drChunk(id,data){ const B=DR.battle; if(B&&B.id===id){ B.queue.push(...data.split('\n')); drPump(); } else if(DR.joinBuf&&DR.joinBuf.id===id) DR.joinBuf.chunks.push(data); }
function drRequest(m){
  const B=DR.battle;
  if(DR.joinBuf&&DR.joinBuf.id===m.battleId&&(!B||B.id!==m.battleId)){ DR.joinBuf.request=m; return; }
  if(!B||B.id!==m.battleId) return;
  B.request=m.request; B.pending=m.pending; B.chosen=false; B.cursor=0; B.pop=null; if(B.active[B.me]&&!B.busy) drHp(B,B.me); setTimeout(drTryRequest,150);
}
function drAck(m){ const B=DR.battle; if(!B||B.id!==m.battleId) return; if(!m.ok){ SFX.err(); flash(m.error||'That move can’t be used'); B.chosen=false; drCmd(); } else B.pending=false; }
function drEnd(res){ const B=DR.battle; if(B&&B.id===res.battleId){ B.result=res; drPump(); } drLoad(); }
function drReconnected(){ const B=DR.battle; if(B&&!B.result) drJoin(B.id); else drLoad(); }

async function drJoin(id){
  if(!SD.conn){ SFX.err(); flash('Not connected to the battle server'); return; }
  DR.joinBuf={id,chunks:[],request:null};
  let r=null; try{ r=await SD.conn.invoke('JoinBattle',id); }catch(_){}
  const buf=DR.joinBuf; DR.joinBuf=null;
  if(!r||r.error){ if(r&&r.error) flash(r.ended?'That battle has finished':r.error); DR.battle=null; if(DR.view){ drShow('home'); drRenderHome(); } drLoad(); return; }
  const B={id:r.battleId,format:r.format,official:r.format==='dailyred',me:'p1',foe:'p2',names:{p1:r.players[0].name,p2:r.players[1].name},queue:[],busy:false,fast:false,
    request:null,pending:false,chosen:false,cursor:0,pop:null,active:{p1:null,p2:null},seen:{p1:new Map(),p2:new Map()},size:{p1:6,p2:6},turn:0,weather:'',log:[],result:null,shown:false,armRun:0,el:null,logOpen:false};
  DR.battle=B; if(!DR.view) drOpen(); drShow('battle'); drSetup(B); window.scrollTo(0,0);
  B.fast=true; (r.log||[]).concat(buf&&buf.chunks||[]).forEach(c=>B.queue.push(...c.split('\n'))); await drPump(); B.fast=false;
  drDrawAll(B);
  const rq=buf&&buf.request?buf.request:r.request?{request:r.request,pending:r.pending}:null;
  if(rq){ B.request=rq.request; B.pending=rq.pending; }
  drSync();
  if(r.ended&&r.result){ B.result=r.result; drPump(); return; }
  drPlayMusic(B); drTryRequest();
}
function drPlayMusic(B){ SDM.play({id:B.id,gen:1,result:B.result}); }

/* ---------------- battle: drawing ---------------- */
function drSetup(B){
  const el=$('drBattle');
  el.innerHTML=`<div class="dly-bwin">
    <div class="dly-bbar"><span class="dly-pill${B.official?'':' dly-dash'}">${B.official?`DAILY RED NO. ${DR.data?DR.data.no:''} · OFFICIAL BATTLE`:'PRACTICE RUN, NOT RECORDED'}</span><span class="dly-bright"><span class="dly-turn" data-turn></span><button class="dly-mus" type="button" data-music aria-label="Music" aria-pressed="${SDM.on()}">♪ ${SDM.on()?'ON':'OFF'}</button></span></div>
    <div class="dly-bgrid">
      <div class="dly-stage">
        <div class="dly-field" data-field><div class="dly-mon dly-foe" data-mon="foe"></div><div class="dly-mon dly-me" data-mon="me"></div>
          <div class="dly-hp dly-foe" data-hp="foe" hidden></div><div class="dly-hp dly-me" data-hp="me" hidden></div>${DR_SNOW}<div class="dly-flash" data-flash></div><span class="dly-wx" data-wx hidden></span></div>
        <div class="dly-cmd dly-talk" data-cmd><div class="dly-dialog"><span data-msg>RED wants to battle!</span></div></div>
      </div>
      <div class="dly-log" data-log><button class="dly-lh2" type="button" data-logbtn aria-expanded="false"><b>Battle log</b><small data-count></small></button><ol data-lines aria-live="off"></ol>
        <div class="dly-lf"><span>Text speed</span><span class="dly-speed" role="group" aria-label="Text speed"><button type="button" data-speed="normal">NORMAL</button><button type="button" data-speed="fast">FAST</button></span></div></div>
    </div>
    <div class="dly-keys">Arrow keys move the cursor, Enter attacks. POKéMON switches, RUN gives up.</div>
  </div>`;
  const q=s=>el.querySelector(s);
  B.el={win:q('.dly-bwin'),field:q('[data-field]'),foeMon:q('[data-mon=foe]'),meMon:q('[data-mon=me]'),foeHp:q('[data-hp=foe]'),meHp:q('[data-hp=me]'),flash:q('[data-flash]'),wx:q('[data-wx]'),
    cmd:q('[data-cmd]'),turn:q('[data-turn]'),log:q('[data-log]'),lines:q('[data-lines]'),count:q('[data-count]')};
  B.el.field.style.backgroundImage=DR_BG;
  el.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{ SFX.tab(); st.drFast=b.dataset.speed==='fast'; save(); drSpeedBtns(B); });
  q('[data-music]').onclick=e=>{ st.sdMusic=!SDM.on(); save(); SFX.tab(); if(SDM.on()) drPlayMusic(B); else SDM.stop(); e.currentTarget.setAttribute('aria-pressed',String(SDM.on())); e.currentTarget.textContent='♪ '+(SDM.on()?'ON':'OFF'); };
  q('[data-logbtn]').onclick=()=>{ B.logOpen=!B.logOpen; B.el.log.classList.toggle('open',B.logOpen); q('[data-logbtn]').setAttribute('aria-expanded',String(B.logOpen)); drLogDraw(B); };
  drSpeedBtns(B); drDrawAll(B);
}
function drSpeedBtns(B){ B.el.log.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.speed==='fast')===(st.drFast!==false)))); }
function drDrawAll(B){ if(!B.el) return; drHp(B,'p1'); drHp(B,'p2'); drMon(B,'p1'); drMon(B,'p2'); drTurn(B); drLogDraw(B); drWeather(B); }
function drTurn(B){ if(B.el) B.el.turn.textContent=B.turn?`TURN ${B.turn}`:''; }
function drLeft(B,side){
  if(side===B.me&&B.request&&B.request.side) return B.request.side.pokemon.filter(p=>!/ fnt$/.test(p.condition)&&p.condition!=='0 fnt').length;
  const fainted=[...B.seen[side].values()].filter(m=>m.status==='fnt').length; return B.size[side]-fainted;
}
function drHp(B,side){
  const m=B.active[side], box=side===B.me?B.el.meHp:B.el.foeHp;
  if(!m){ box.hidden=true; return; }
  const p=hpPct(m), stt=m.status&&m.status!=='fnt'?`<span class="dly-stt ${m.status}">${m.status.toUpperCase()}</span>`:'';
  const g=m.gender==='M'?' ♂':m.gender==='F'?' ♀':'';
  let extra;
  if(side===B.me){
    // your team as squares too: red still standing, grey fainted (from the request, which knows the whole team)
    const mons=B.request&&B.request.side?B.request.side.pokemon:null, size=mons?mons.length:B.size[side];
    const out=mons?mons.filter(p=>/ fnt$/.test(p.condition)||p.condition==='0 fnt').length:[...B.seen[side].values()].filter(x=>x.status==='fnt').length;
    extra=`<div class="dly-nums"><div class="dly-party" aria-label="You have ${size-out} of ${size} left">${'<i></i>'.repeat(Math.max(0,size-out))}${'<i class="out"></i>'.repeat(out)}</div><span>${Math.max(0,m.hp)}/ ${m.max}</span></div>`;
  }
  else { const seen=[...B.seen[side].values()]; const out=seen.filter(x=>x.status==='fnt').length; extra=`<div class="dly-party" aria-label="Red has ${B.size[side]-out} of ${B.size[side]} left">${'<i></i>'.repeat(Math.max(0,B.size[side]-out))}${'<i class="out"></i>'.repeat(out)}</div>`; }
  const name=side===B.foe?drRedOf(m.name):esc(m.name);
  const bar=box.querySelector('.dly-hpbar i');
  if(bar&&box.dataset.who===m.name+'|'+m.side){
    // same Pokémon: let the bar slide
    box.querySelector('.dly-r1').innerHTML=`<span class="dly-nm"><span>${name}${g}</span>${stt}</span><span>Lv${m.level}</span>`;
    bar.className=drHpCls(p); bar.style.width=p+'%';
    const tail=box.querySelector('.dly-nums,.dly-party'); if(tail) tail.outerHTML=extra;
  } else {
    box.dataset.who=m.name+'|'+m.side;
    box.innerHTML=`<div class="dly-r1"><span class="dly-nm"><span>${name}${g}</span>${stt}</span><span>Lv${m.level}</span></div><div class="dly-hpbar"><span>HP</span><div><i class="${drHpCls(p)}" style="width:${p}%"></i></div></div>${extra}`;
  }
  box.hidden=false;
  drCount(B);
}
function drCount(B){ if(B.el) B.el.count.textContent=`YOU ${drLeft(B,B.me)} · RED ${drLeft(B,B.foe)}${isMob()?(B.logOpen?' ▴':' ▾'):''}`; }
function drMon(B,side){
  const m=B.active[side], box=side===B.me?B.el.meMon:B.el.foeMon;
  if(!m||m.status==='fnt'){ box.innerHTML=''; return null; }
  if(box.dataset.who===m.name&&box.firstChild) return box.firstChild;
  box.dataset.who=m.name; box.innerHTML='';
  const im=chainImg(battleChain({species:m.species,shiny:false,gender:m.gender},side===B.me,3),side===B.me?m.name:`RED's ${m.name}`,'dly-px');
  im.style.setProperty('--nw',64); box.appendChild(im); return im;
}
function drWeather(B){ const w=B.el&&B.el.wx; if(!w) return; const t={RainDance:'RAIN',SunnyDay:'HARSH SUN',Sandstorm:'SANDSTORM',Hail:'HAIL'}[B.weather]; w.hidden=!t; w.textContent=t||''; }
function drLog(B,text,cls){ if(!text) return; B.log.push({c:cls||'',t:text}); if(!B.fast) drLogDraw(B); }
function drLogDraw(B){
  if(!B.el) return; drCount(B);
  if(isMob()&&!B.logOpen) return;
  const ol=B.el.lines; ol.innerHTML=B.log.slice(-400).map(x=>`<li class="${x.c}">${esc(x.t)}</li>`).join('')||'<li>RED wants to battle!</li>'; ol.scrollTop=ol.scrollHeight;
}
/* FireRed/LeafGreen wording: "Foe PIKACHU", names in capitals. */
function drText(B,t){
  t=String(t||'').replace(/The opposing /g,'Foe ').replace(/the opposing /g,'foe ');
  const names=[...new Set([...B.seen.p1.values(),...B.seen.p2.values()].map(m=>m.name).filter(n=>n&&n.length>1))].sort((a,b)=>b.length-a.length);
  names.forEach(n=>{ t=t.split(n).join(n.toUpperCase()); });
  return t;
}
function drSay(B,text,cls){
  const t=drText(B,text); drLog(B,t,cls);
  if(B.fast||!B.el) return;
  B.el.cmd.className='dly-cmd dly-talk'; B.el.cmd.innerHTML=`<div class="dly-dialog"><span>${esc(t)}</span></div>`;
}
async function drTalk(B,text,ms=950,cls){ drSay(B,text,cls); await drWait(B,ms); }
const drWho=(B,m,cap)=>m.side===B.foe?(cap?'Foe ':'foe ')+m.name:m.name;

/* ---------------- battle: effects ---------------- */
function drFx(B){ if(!window.PSFX||!window.PSAnims||!B.el) return null; if(!B.fx||B.fx.root!==B.el.field) B.fx=new PSFX.FXScene(B.el.field,f=>'/assets/battle/fx/'+f); return B.fx; }
function drImgOf(B,side){ return (side===B.me?B.el.meMon:B.el.foeMon).querySelector('img'); }
function drFlash(B,color,peak=.5,ms=300){ const f=B.el.flash; f.style.background=color; return f.animate([{opacity:0},{opacity:peak,offset:.3},{opacity:0}],{duration:ms,easing:'steps(6)'}).finished; }
function drBlink(img,times=2){ return img?img.animate([{opacity:1},{opacity:.1},{opacity:1}],{duration:160,iterations:times,easing:'steps(2)'}).finished:Promise.resolve(); }
function drShake(B){ return B.el.field.animate([{transform:'translate(0,0)'},{transform:'translate(-1.5%,.5%)'},{transform:'translate(1.5%,-.5%)'},{transform:'translate(-1%,0)'},{transform:'translate(0,0)'}],{duration:360,easing:'steps(5)'}).finished; }
async function drSendOut(B,side,img){
  if(!img) return; const mine=side===B.me, box=mine?B.el.meMon:B.el.foeMon;
  img.style.visibility='hidden';
  const ball=document.createElement('span'); ball.className='dly-ball'; B.el.field.appendChild(ball);
  const r=box.getBoundingClientRect(), f=B.el.field.getBoundingClientRect(), tx=(r.left-f.left+r.width/2)/f.width*100-3, ty=(r.top-f.top+r.height*.6)/f.height*100;
  await ball.animate([{left:mine?'-6%':'104%',top:mine?'40%':'5%',transform:'rotate(0)'},{left:tx+'%',top:(ty-20)+'%',transform:'rotate(360deg)',offset:.6},{left:tx+'%',top:ty+'%',transform:'rotate(720deg)'}],{duration:480,easing:'steps(12)',fill:'forwards'}).finished;
  ball.remove(); drFlash(B,'#fff',.5,180); img.style.visibility='';
  await img.animate([{transform:'scale(.15)',filter:'brightness(4)'},{transform:'scale(1)',filter:'brightness(4)',offset:.6},{transform:'scale(1)',filter:'brightness(1)'}],{duration:420,easing:'steps(8)'}).finished;
}
async function drRecall(img){ if(!img) return; await img.animate([{transform:'scale(1)',filter:'none'},{transform:'scale(0)',filter:'brightness(.9) sepia(1) saturate(6) hue-rotate(-30deg)'}],{duration:450,easing:'steps(8)',fill:'forwards'}).finished; }
async function drFaint(img){ if(!img) return; await img.animate([{transform:'translateY(0)',clipPath:'inset(0 0 0 0)'},{transform:'translateY(70%)',clipPath:'inset(0 0 70% 0)'}],{duration:600,easing:'steps(10)',fill:'forwards'}).finished; }

/* ---------------- battle: the simulator's messages ---------------- */
async function drPump(){
  const B=DR.battle; if(!B||B.busy) return; B.busy=true;
  try{ while(DR.battle===B&&B.queue.length){ const line=B.queue.shift(); try{ await drLine(B,line); }catch(e){ console.warn('battle line failed',line,e); } } }
  finally{ B.busy=false; }
  if(DR.battle!==B) return;
  if(B.result&&!B.shown){ B.shown=true; if(!B.fast) await sdWait(1200); drShowResult(B); return; }
  if(!B.fast) drTryRequest();
}
async function drLine(B,line){
  if(!line||line[0]!=='|') return;
  const a=line.slice(1).split('|'), cmd=a[0], cls=/^p[12]/.test(a[1]||'')?(sideOf(a[1])===B.me?'':'foe'):'';
  switch(cmd){
    case 'player': if(a[1]&&a[2]) B.names[a[1]]=a[2]; return;
    case 'teamsize': B.size[a[1]]=+a[2]; return;
    case 'start': drLog(B,'RED wants to battle!'); return;
    case 'turn': B.turn=+a[1]; drTurn(B); drLog(B,'TURN '+a[1],'t'); return;
    case 'switch': case 'drag': case 'replace': {
      const side=sideOf(a[1]), m=monOf(B,a[1]), d=parseDetails(a[2]), hp=parseHP(a[3]);
      Object.assign(m,d); if(hp){ m.hp=hp.hp; m.max=hp.max; m.status=hp.status; }
      const prev=B.active[side];
      if(prev&&prev!==m&&cmd!=='replace'&&prev.status!=='fnt'&&!B.fast){
        drSay(B,side===B.me?`${prev.name}, come back!`:`RED withdrew ${prev.name}!`,cls); await drRecall(drImgOf(B,side));
      }
      B.active[side]=m; drMon(B,side); drHp(B,side);
      const txt=cmd==='drag'?`${drWho(B,m,true)} was dragged out!`:side===B.me?`Go! ${m.name}!`:`RED sent out ${m.name}!`;
      if(B.fast){ drLog(B,drText(B,txt),cls); return; }
      drSay(B,txt,cls);
      const im=drImgOf(B,side);
      if(im){ await new Promise(r=>{ if(im.complete) r(); else { im.addEventListener('load',r,{once:true}); im.addEventListener('error',r,{once:true}); setTimeout(r,1200); } }); await drSendOut(B,side,im); }
      cry(monKey(m.species).sid); await drWait(B,400); return;
    }
    case 'detailschange': case '-formechange': { const m=monOf(B,a[1]); m.species=a[2].split(', ')[0]; if(B.active[m.side]===m){ (m.side===B.me?B.el.meMon:B.el.foeMon).dataset.who=''; drMon(B,m.side); } return; }
    case '-transform': { const m=monOf(B,a[1]), t=monOf(B,a[2]); m.species=t.species; if(B.active[m.side]===m){ (m.side===B.me?B.el.meMon:B.el.foeMon).dataset.who=''; drMon(B,m.side); } return drTalk(B,`${drWho(B,m,true)} transformed into ${t.name}!`,950,cls); }
    case 'move': {
      const m=monOf(B,a[1]), id=toID(a[2]); B.lastMoveType=(window.PSAnims&&PSAnims.MoveTypes[id])||null;
      drSay(B,`${drWho(B,m,true)} used ${a[2]}!`,cls);
      if(B.fast) return;
      const sc=drFx(B), still=a.includes('[still]')||a.some(x=>x.startsWith('[notarget]')), tgt=a[3]&&/^p[12]/.test(a[3])?sideOf(a[3]):null;
      if(sc&&!still){ await drWait(B,250); await sc.run(id,{meImg:drImgOf(B,B.me),foeImg:drImgOf(B,B.foe),attacker:m.side===B.me?'me':'foe',self:!tgt||tgt===m.side}); await drWait(B,120); }
      else await drWait(B,700);
      return;
    }
    case '-damage': case '-heal': case '-sethp': {
      const m=monOf(B,a[1]), hp=parseHP(a[2]), before=m.hp;
      if(hp){ m.hp=hp.hp; if(hp.max) m.max=hp.max; if(hp.status) m.status=hp.status==='fnt'?m.status:hp.status; }
      if(B.active[m.side]===m) drHp(B,m.side);
      const from=fromOf(a);
      if(cmd==='-damage'&&!B.fast&&hp&&hp.hp<before){ const im=drImgOf(B,m.side); if(!from&&B.lastMoveType) drFlash(B,TYC[B.lastMoveType]||'#fff',.3,280); drBlink(im,2); if(st.sound) blip(150,.08,0,'square',.05); }
      if(cmd==='-damage'){
        if(!from){ await drWait(B,550); return; }
        const t={Spikes:`${drWho(B,m,true)} was hurt by spikes!`,psn:`${drWho(B,m,true)} is hurt by poison!`,tox:`${drWho(B,m,true)} is hurt by poison!`,brn:`${drWho(B,m,true)} is hurt by its burn!`,
          Sandstorm:`${drWho(B,m,true)} is buffeted by the sandstorm!`,Hail:`${drWho(B,m,true)} is pelted by hail!`,Recoil:`${drWho(B,m,true)} is hit with recoil!`,confusion:'It hurt itself in its confusion!','Leech Seed':`${drWho(B,m,true)}'s health is sapped by Leech Seed!`,Curse:`${drWho(B,m,true)} is afflicted by the curse!`,Nightmare:`${drWho(B,m,true)} is locked in a nightmare!`}[from];
        return drTalk(B,t||`${drWho(B,m,true)} was hurt by ${from}!`,950,cls);
      }
      if(cmd==='-heal'&&from){ const t={Leftovers:`${drWho(B,m,true)} restored a little HP using its Leftovers!`,drain:`${drWho(B,m,true)} had its energy drained!`}[from];
        return drTalk(B,t||`${drWho(B,m,true)} restored HP using its ${from}!`,950,cls); }
      if(cmd==='-heal') return drTalk(B,`${drWho(B,m,true)} regained health!`,800,cls);
      return;
    }
    case 'faint': {
      const m=monOf(B,a[1]); m.hp=0; m.status='fnt'; if(B.active[m.side]===m) drHp(B,m.side);
      const im=drImgOf(B,m.side);
      if(B.fast){ (m.side===B.me?B.el.meMon:B.el.foeMon).innerHTML=''; drLog(B,drText(B,`${drWho(B,m,true)} fainted!`),cls); return; }
      if(im){ cry(monKey(m.species).sid); drFaint(im).then(()=>{ if(im.isConnected) im.style.visibility='hidden'; }); }
      return drTalk(B,`${drWho(B,m,true)} fainted!`,1100,cls);
    }
    case '-supereffective': if(!B.fast){ drShake(B); drBlink(drImgOf(B,sideOf(a[1]||'p1')),4); } return drTalk(B,"It's super effective!",850);
    case '-resisted': return drTalk(B,"It's not very effective…",850);
    case '-immune': return drTalk(B,`It doesn't affect ${drWho(B,monOf(B,a[1]))}…`);
    case '-crit': if(!B.fast){ await drFlash(B,'#fff',.9,160); } return drTalk(B,'A critical hit!',800);
    case '-miss': return drTalk(B,a[2]?`${drWho(B,monOf(B,a[2]),true)} avoided the attack!`:`${drWho(B,monOf(B,a[1]),true)}'s attack missed!`);
    case '-fail': return drTalk(B,'But it failed!');
    case '-notarget': return drTalk(B,'But there was no target…');
    case '-ohko': return drTalk(B,"It's a one-hit KO!");
    case '-hitcount': return drTalk(B,`Hit ${a[2]} time${a[2]==='1'?'':'s'}!`);
    case '-status': { const m=monOf(B,a[1]); m.status=a[2]; if(B.active[m.side]===m) drHp(B,m.side); if(!B.fast) drFlash(B,{par:'#f8d030',brn:'#f07030',psn:'#b050c0',tox:'#b050c0',slp:'#cfd8ff',frz:'#9ae0ff'}[a[2]]||'#fff',.35,400);
      return drTalk(B,`${drWho(B,m,true)} ${STATUS_TXT[a[2]]||'was afflicted!'}`,950,cls); }
    case '-curestatus': { const m=monOf(B,a[1]), s=a[2]; m.status=''; if(B.active[m.side]===m) drHp(B,m.side); if(B.fast) return;
      return drTalk(B,`${drWho(B,m,true)} ${s==='slp'?'woke up!':s==='frz'?'thawed out!':'was cured of its '+({par:'paralysis',brn:'burn',psn:'poison',tox:'poison'}[s]||'status')+'!'}`,950,cls); }
    case '-cureteam': return drTalk(B,'A bell chimed! The team was cured of its status problems!');
    case 'cant': { const m=monOf(B,a[1]), r=effName(a[2]);
      return drTalk(B,`${drWho(B,m,true)} ${{par:"is paralyzed! It can't move!",slp:'is fast asleep.',frz:'is frozen solid!',recharge:'must recharge!',flinch:"flinched!",Truant:'is loafing around!',Taunt:`can't use ${a[3]||'that move'} after the taunt!`,Disable:`can't use ${a[3]||'that move'}!`,'Focus Punch':'lost its focus and couldn\'t move!'}[r]||"can't move!"}`,950,cls); }
    case '-boost': case '-unboost': { const m=monOf(B,a[1]), n=+a[3], up=cmd==='-boost';
      if(n===0) return drTalk(B,`${drWho(B,m,true)}'s ${STAT[a[2]]||a[2]} won't go ${up?'higher':'lower'}!`,950,cls);
      return drTalk(B,`${drWho(B,m,true)}'s ${STAT[a[2]]||a[2]} ${up?(n>=2?'sharply rose':'rose'):(n>=2?'harshly fell':'fell')}!`,950,cls); }
    case '-clearallboost': return drTalk(B,'All stat changes were eliminated!');
    case '-weather': {
      const w=a[1];
      if(a.includes('[upkeep]')){ if(B.weather!==w){ B.weather=w; drWeather(B); } return B.fast?undefined:drTalk(B,WEATHER_UP[w]||'',650); }
      if(w==='none'){ const was=B.weather; B.weather=''; drWeather(B); return was?drTalk(B,{RainDance:'The rain stopped.',SunnyDay:'The sunlight faded.',Sandstorm:'The sandstorm subsided.',Hail:'The hail stopped.'}[was]||'The weather cleared up.'):undefined; }
      B.weather=w; drWeather(B); return drTalk(B,WEATHER[w]||`${w} started!`);
    }
    case '-sidestart': case '-sideend': {
      const side=a[1].slice(0,2), e=effName(a[2]), team=side===B.foe?"the foe's team":'your team';
      if(cmd==='-sidestart') return drTalk(B,{Spikes:`Spikes were scattered all around ${team}'s feet!`,Reflect:`Reflect raised ${team}'s Defense!`,'Light Screen':`Light Screen raised ${team}'s Sp. Def!`,Safeguard:`${team[0].toUpperCase()+team.slice(1)} became cloaked in a mystical veil!`,Mist:`${team[0].toUpperCase()+team.slice(1)} became shrouded in mist!`}[e]||`${e} started on ${team}'s side!`);
      return drTalk(B,{Spikes:`The spikes disappeared from around ${team}!`}[e]||`${team[0].toUpperCase()+team.slice(1)}'s ${e} wore off!`);
    }
    case '-ability': { const m=monOf(B,a[1]); if(B.fast) return; return drTalk(B,`[${drWho(B,m,true)}'s ${a[2]}]`,800,cls); }
    case '-item': { const m=monOf(B,a[1]), from=fromOf(a); return drTalk(B,from?`${drWho(B,m,true)} obtained ${a[2]}!`:`${drWho(B,m,true)}'s ${a[2]} was revealed!`,950,cls); }
    case '-enditem': { const m=monOf(B,a[1]); if(a.includes('[eat]')) return drTalk(B,`${drWho(B,m,true)} ate its ${a[2]}!`,950,cls); return drTalk(B,`${drWho(B,m,true)}'s ${a[2]} was used up…`,950,cls); }
    case '-start': { const m=monOf(B,a[1]), e=effName(a[2]); if(a.includes('[silent]')) return;
      const t={confusion:'became confused!',Substitute:'made a substitute!','Leech Seed':'was seeded!',Taunt:'fell for the taunt!',Encore:'got an encore!',Disable:'had a move disabled!',Yawn:'grew drowsy!','Focus Energy':'is getting pumped!',Attract:'fell in love!',Curse:'was cursed!',Nightmare:'began having a nightmare!',perish3:'will faint in three turns!'}[e];
      if(/^perish\d/.test(e)&&e!=='perish3') return drTalk(B,`${drWho(B,m,true)}'s perish count fell to ${e.slice(6)}.`,950,cls);
      return t?drTalk(B,`${drWho(B,m,true)} ${t}`,950,cls):undefined; }
    case '-end': { const m=monOf(B,a[1]), e=effName(a[2]); if(a.includes('[silent]')) return;
      const t={confusion:' snapped out of confusion!',Substitute:"'s substitute faded!",Taunt:"'s taunt wore off!",Encore:"'s encore ended!",Disable:' is no longer disabled!'}[e];
      return t?drTalk(B,`${drWho(B,m,true)}${t}`,950,cls):undefined; }
    case '-activate': { const m=a[1]?monOf(B,a[1]):null, e=effName(a[2]);
      if(e==='confusion') return drTalk(B,`${drWho(B,m,true)} is confused!`,800,cls);
      if(e==='Protect'||e==='Detect') return drTalk(B,`${drWho(B,m,true)} protected itself!`,950,cls);
      if(e==='Substitute') return drTalk(B,`The substitute took damage for ${drWho(B,m)}!`,950,cls);
      if(e==='Endure') return drTalk(B,`${drWho(B,m,true)} endured the hit!`,950,cls);
      return; }
    case '-singleturn': { const m=monOf(B,a[1]), e=effName(a[2]); if(e==='Protect'||e==='Detect') return drTalk(B,`${drWho(B,m,true)} protected itself!`,950,cls); if(e==='Endure') return drTalk(B,`${drWho(B,m,true)} braced itself!`,950,cls); if(e==='Focus Punch') return drTalk(B,`${drWho(B,m,true)} is tightening its focus!`,950,cls); return; }
    case '-prepare': return drTalk(B,`${drWho(B,monOf(B,a[1]),true)} is getting ready to use ${a[2]}!`,800,cls);
    case '-message': case 'message': return drTalk(B,a[1]);
    case 'win': return drTalk(B,a[1]==='RED'?'RED won the battle!':`You defeated RED!`,1300);
    case 'tie': return drTalk(B,'The battle ended in a tie!',1300);
    case 'error': if(!B.fast){ const t=a[1]||''; if(/Invalid choice|Can't/.test(t)) flash(t.replace(/^\[[^\]]*\]\s*/,'')); } return;
    default: return;
  }
}

/* ---------------- battle: what will you do? ---------------- */
function drTryRequest(){
  const B=DR.battle; if(!B||B.busy||B.queue.length||B.result||!B.el) return;
  drCount(B);
  if(!B.request) return;
  if(!B.pending||B.chosen){ drWaitMsg(B); return; }
  drCmd();
}
function drWaitMsg(B){ if(!B.el||B.result) return; B.el.cmd.className='dly-cmd dly-talk'; B.el.cmd.innerHTML='<div class="dly-dialog"><span>…</span><span class="dly-more">▼</span></div>'; }
function drEffTag(m){
  if(m.category==='Status') return `<span class="dly-eff">${esc((m.desc||'Status move').replace(/\.$/,''))}</span>`;
  if(m.eff===undefined) return '';
  return m.eff===0?'<span class="dly-eff no">No effect</span>':m.eff>1?'<span class="dly-eff se">Super effective</span>':m.eff<1?'<span class="dly-eff nv">Not very effective</span>':'<span class="dly-eff">Effective</span>';
}
function drCmd(){
  const B=DR.battle; if(!B||!B.request||!B.pending||B.chosen||!B.el) return;
  const R=B.request, act=R.active&&R.active[0], cur=R.side.pokemon.find(p=>p.active);
  if(R.forceSwitch){ drSay(B,'Choose a Pokémon to send in.'); drPop(true); return; }
  if(!act){ drWaitMsg(B); return; }
  const name=(cur?cur.ident.replace(/^p\d: /,''):'your Pokémon').toUpperCase();
  const moves=act.moves; B.cursor=Math.min(B.cursor||0,moves.length-1);
  const ok=m=>!m.disabled&&!(m.pp!==undefined&&m.maxpp&&m.pp<=0&&moves.length>1);
  B.el.cmd.className='dly-cmd';
  B.el.cmd.innerHTML=`<div class="dly-gbp"><div class="dly-q"><span>What will ${esc(name)} do?</span><span>${esc(String(cur&&(cur.abilityName||cur.baseAbility)||'').toUpperCase())}</span></div>
      <div class="dly-mv" role="group" aria-label="Moves">${moves.map((m,i)=>`<button type="button" data-i="${i}" ${ok(m)?'':'disabled'}><i style="background:${TYC[m.type]||'#888'}"></i><span>${esc(m.move)}</span></button>`).join('')}</div></div>
    <div class="dly-gbp dly-info" data-info></div>`;
  const mv=B.el.cmd.querySelector('.dly-mv');
  const info=()=>{ const m=moves[B.cursor]; mv.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===B.cursor));
    B.el.cmd.querySelector('[data-info]').innerHTML=`<div class="dly-l"><span>PP</span><span>${m.maxpp?`${m.pp}/${m.maxpp}`:'—'}</span></div><div class="dly-l"><span>TYPE/</span><span>${esc(String(m.type||'???').toUpperCase())}</span></div>
      <small><span>${esc(m.category||'')}${m.basePower?' '+m.basePower:''}</span><span>${m.accuracy?'Accuracy '+m.accuracy:'Never misses'}</span></small>${drEffTag(m)}
      <div class="dly-two"><button type="button" data-a="party" ${act.trapped?'disabled':''}>POKéMON</button><button type="button" data-a="run" class="${B.armRun&&Date.now()-B.armRun<3000?'dly-arm':''}">${B.armRun&&Date.now()-B.armRun<3000?'SURE?':'RUN'}</button></div>`;
    B.el.cmd.querySelector('[data-a=party]').onclick=()=>{ SFX.tab(); drPop(false); };
    B.el.cmd.querySelector('[data-a=run]').onclick=()=>drRun(B); };
  mv.querySelectorAll('button').forEach(b=>{
    b.onmouseenter=b.onfocus=()=>{ const i=+b.dataset.i; if(i!==B.cursor){ B.cursor=i; info(); } };
    b.onclick=()=>{ const i=+b.dataset.i; B.cursor=i; drChoose('move '+(i+1)); };
  });
  info();
}
function drRun(B){
  if(B.armRun&&Date.now()-B.armRun<3000){ B.armRun=0; SD.conn&&SD.conn.invoke('Forfeit',B.id).catch(()=>{}); B.chosen=true; drSay(B,B.official?'You gave up. It counts as a loss.':'You gave up.'); return; }
  B.armRun=Date.now(); SFX.err(); drCmd();
  setTimeout(()=>{ if(DR.battle===B&&B.pending&&!B.chosen&&!B.pop) drCmd(); },3100);
}
function drPop(forced){
  const B=DR.battle; if(!B||!B.request) return;
  B.pop=forced?'forced':'switch';
  const mons=B.request.side.pokemon;
  const scrim=document.createElement('div'); scrim.className='dly-scrim';
  scrim.innerHTML=`<div class="dly-pop" role="dialog" aria-modal="true" aria-label="Choose a Pokémon">${mons.map((p,i)=>{
      const d=parseDetails(p.details), hp=parseHP(p.condition), dead=hp.status==='fnt', cur=p.active&&!forced, P=dead?0:Math.round(hp.hp/hp.max*100);
      return `<button class="dly-pm${cur?' cur':''}${dead?' fnt':''}" type="button" data-i="${i}" ${dead||cur?'disabled':''} aria-label="${esc(d.species)}, ${dead?'fainted':P+'% HP'}${cur?', in battle':''}">
        ${drImg(d.species)}<div><b>${esc(p.ident.replace(/^p\d: /,''))}</b><small>Lv${d.level}${cur?', in battle':dead?', fainted':''}${hp.status&&!dead?' · '+hp.status.toUpperCase():''}</small></div>
        <div><div class="dly-hpbar"><span>HP</span><div><i class="${drHpCls(P)}" style="width:${P}%"></i></div></div><div class="dly-n">${dead?0:hp.hp}/ ${hp.max}</div></div></button>`; }).join('')}
      <div class="dly-popf"><span>${forced?'Choose who comes in next.':'Switch? It uses your turn.'}</span>${forced?'':'<button type="button" data-x>CANCEL</button>'}</div></div>`;
  B.el.win.querySelector('.dly-scrim')?.remove(); B.el.win.appendChild(scrim); wireChains(scrim);
  const close=()=>{ scrim.remove(); B.pop=null; };
  scrim.querySelectorAll('.dly-pm:not([disabled])').forEach(b=>b.onclick=()=>{ close(); drChoose('switch '+(+b.dataset.i+1)); });
  const x=scrim.querySelector('[data-x]'); if(x){ x.onclick=()=>{ SFX.tab(); close(); drCmd(); }; scrim.addEventListener('click',e=>{ if(e.target===scrim){ close(); drCmd(); } }); }
  (scrim.querySelector('.dly-pm:not([disabled])')||x)?.focus();
}
async function drChoose(choice){
  const B=DR.battle; if(!B||!B.pending||B.chosen) return;
  B.chosen=true; B.armRun=0; SFX.tab(); B.el.win.querySelector('.dly-scrim')?.remove(); B.pop=null; drWaitMsg(B);
  let err=null; try{ err=await SD.conn.invoke('Choose',B.id,choice); }catch(_){ err='The battle server did not answer'; }
  if(err&&typeof err==='string'){ SFX.err(); flash(err); B.chosen=false; drCmd(); }
}
document.addEventListener('keydown',e=>{
  const B=DR.battle; if(!DR.view||DR.screen!=='battle'||!B||!B.el||e.target.closest('input,textarea,select')) return;
  if(B.pop){ if(e.key==='Escape'&&B.pop==='switch'){ B.el.win.querySelector('.dly-scrim')?.remove(); B.pop=null; drCmd(); } return; }
  const mv=B.el.cmd.querySelector('.dly-mv'); if(!mv||!B.pending||B.chosen) return;
  const n=mv.children.length, k={ArrowRight:1,ArrowLeft:-1,ArrowDown:2,ArrowUp:-2}[e.key];
  if(k!=null){ e.preventDefault(); const next=B.cursor+k; if(next>=0&&next<n){ B.cursor=next; SFX.move(); mv.children[next].focus(); } return; }
  if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){ e.preventDefault(); const b=mv.children[B.cursor]; if(b&&!b.disabled) b.click(); }
});

/* ---------------- result ---------------- */
function drShowResult(B){
  SDM.stop();
  const R=B.result, won=R.winner===1, official=!!(R.daily&&R.daily.official), aborted=R.reason==='aborted', d=DR.data, no=d?d.no:'';
  const left=R.left?R.left[0]:0, redLeft=R.left?R.left[1]:0, grid=(R.daily&&R.daily.grid)||'';
  if(won) SFX.mark(); else SFX.unmark();
  let h, p;
  if(aborted){ h='<h3>BATTLE STOPPED</h3>'; p=official?"The battle server restarted, so this battle didn't count. You can battle Red again.":'The battle server restarted.'; }
  else if(won){ h='<h3 class="w">YOU BEAT RED!</h3>'; p=`You won with ${left} Pokémon left, in ${R.turns} turns.`; }
  else { h='<h3 class="l">RED WINS</h3>'; p=`${R.reason==='forfeit'?'You gave up. ':R.reason==='timeout'?'The battle was left too long. ':''}Red had ${redLeft} Pokémon left, after ${R.turns} turns.`; }
  const share=official&&!aborted?drShareText(no,won,R.turns,grid):'';
  $('drResult').innerHTML=`<div class="dly-result">
    <div class="dly-e">${official?`DAILY RED NO. ${no} · OFFICIAL BATTLE`:'<span class="dly-pill dly-dash">PRACTICE RUN, NOT RECORDED</span>'}</div>
    ${h}<p>${esc(p)}</p>
    ${share?`<div class="dly-share">${esc(share)}</div>`:''}
    <div class="dly-btns">${share?'<button class="dly-copy" type="button" data-a="copy">COPY RESULT</button>':''}${!official||aborted?`<button class="dly-copy" type="button" data-a="${official&&aborted?'battle':'practice'}">${official&&aborted?'BATTLE RED':'PRACTICE AGAIN'}</button>`:''}<button class="dly-ghost" type="button" data-a="log">VIEW LOG</button><button class="dly-ghost" type="button" data-a="home">◀ DAILY RED</button></div>
    <div class="dly-rs4" data-stats></div><ol class="dly-rlog" data-rlog hidden></ol></div>`;
  const el=$('drResult');
  el.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.a;
    if(a==='copy') drCopy(share);
    else if(a==='log'){ SFX.tab(); const ol=el.querySelector('[data-rlog]'); ol.hidden=!ol.hidden; if(!ol.hidden){ ol.innerHTML=B.log.map(x=>`<li class="${x.c}">${esc(x.t)}</li>`).join(''); ol.scrollTop=ol.scrollHeight; } b.textContent=ol.hidden?'VIEW LOG':'HIDE LOG'; }
    else if(a==='home') drHome();
    else if(a==='practice'||a==='battle'){ DR.battle=null; drStart(a==='practice',b); }
  });
  drShow('result'); drResultStats(); drSync(); window.scrollTo(0,0);
}
function drResultStats(){
  const box=$('drResult').querySelector('[data-stats]'), s=DR.data&&DR.data.stats; if(!box||!s) return;
  box.innerHTML=`<div><b>${s.played}</b><small>PLAYED</small></div><div><b>${s.winPct}%</b><small>WIN %</small></div><div><b>${s.streak}</b><small>WIN STREAK</small></div><div><b>${s.dayStreak}</b><small>DAY STREAK</small></div>`;
}
