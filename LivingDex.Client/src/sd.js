
/* ====================================================================================
   SHOWDOWN · random battles against other trainers on this server (or the CPU),
   simulated by Pokémon Showdown on the server. Only available when served by the server.
   ==================================================================================== */
const SD={on:false,status:null,conn:null,connecting:false,view:false,screen:'lobby',trainers:[],presence:new Map(),challenges:new Map(),
  hist:[],battle:null,joinBuf:null,match:null,matchTimer:0,battleId:null,ready:null,lastResult:null,forfeitArm:0,timerInt:0};
const SD_FORMATS={gen5randombattle:'Gen 5',gen4randombattle:'Gen 4',gen3randombattle:'Gen 3',gen2randombattle:'Gen 2',gen1randombattle:'Gen 1'};
const SD_SWORDS=$('sdBtn').querySelector('svg').outerHTML;
const TYC=Object.fromEntries(TYPES.slice(1).map(t=>[t[0],t[1]]));
const toID=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const sdWait=ms=>new Promise(r=>setTimeout(r,ms));
const sdGenOf=f=>+((/^gen(\d)/.exec(f||'')||[])[1]||5);
const sdIsDraft=f=>/draft$/.test(f||'');
const sdShortFmt=f=>'Gen '+sdGenOf(f)+(sdIsDraft(f)?' Draft':'');
const sdFmtName=f=>sdShortFmt(f)+(sdIsDraft(f)?'':' Random Battle');
/* the lobby keeps the generation and the mode apart; together they make the format sent to the server */
const sdFormatSel=()=>'gen'+sdGenOf(st.sdFormat||'gen5randombattle')+(st.sdMode==='draft'?'draft':'randombattle');
function sdSetFormat(f){ st.sdFormat='gen'+sdGenOf(f)+'randombattle'; st.sdMode=sdIsDraft(f)?'draft':'random'; save(); }
const sdTeamFoot=()=>sdIsDraft(SD.match?SD.match.format:sdFormatSel())?'TEAM · DRAFT 6':'TEAM · RANDOM 6';
const sdMe=()=>SYNC.user&&SYNC.user.id;
let SDMAP=null;
function sdMaps(){
  if(SDMAP) return SDMAP;
  const sp=new Map(), fm=new Map();
  RAW.s.forEach(x=>sp.set(toID(x[1]),x[0]));
  sp.set('nidoranf',29); sp.set('nidoranm',32);
  RAW.f.forEach(x=>fm.set(toID(x[0]),{sk:String(x[3]),sid:x[1]}));
  // in-battle formes that aren't separate Pokémon in HOME
  [['darmanitanzen','10017',555],['meloettapirouette','10018',648],['castformsunny','10013',351],['castformrainy','10014',351],['castformsnowy','10015',351],['cherrimsunshine','421-sunshine',421]]
    .forEach(([k,sk,sid])=>fm.set(k,{sk,sid}));
  return SDMAP={sp,fm};
}
function monKey(species,num){
  const {sp,fm}=sdMaps(), id=toID(species);
  if(sp.has(id)){ const n=sp.get(id); return {sk:String(n),sid:n}; }
  if(fm.has(id)) return fm.get(id);
  const n=sp.get(toID(String(species).split('-')[0]))||num||0;
  return {sk:String(n),sid:n};
}
/* Gen 1–4 battles use that generation's own sprites (Red/Blue, Silver, Ruby/Sapphire, Diamond/Pearl), falling back to Black/White. */
const RETRO={1:{dir:'generation-i/red-blue/transparent/',shiny:false,scale:1.5},2:{dir:'generation-ii/silver/transparent/',shiny:true,scale:1.5},
  3:{dir:'generation-iii/ruby-sapphire/',shiny:true,scale:1.3},4:{dir:'generation-iv/diamond-pearl/',shiny:true,scale:1.05}};
function battleChain(m,back,gen){
  const r=RETRO[gen];
  if(r){ const {sk,sid}=monKey(m.species), base=BASE+'versions/'+r.dir+(back?'back/':''), sh=m.shiny&&r.shiny?'shiny/':'';
    const own=sk!==String(sid)&&gen>=2?[base+sh+sk+'.png']:[];
    return [...own,base+sh+sid+'.png',...battleChain(m,back)]; }
  const {sk,sid}=monKey(m.species), bw=BASE+'versions/generation-v/black-white/', sh=m.shiny?'shiny/':'', side=back?'back/':'', c=[];
  const fe=m.gender==='F'&&GDIFF.has(sid)&&/^\d+$/.test(sk)?'female/':'';
  if(sid<=649){ if(fe) c.push(bw+'animated/'+side+sh+fe+sk+'.gif'); c.push(bw+'animated/'+side+sh+sk+'.gif'); }
  c.push(bw+side+sh+sk+'.png'); c.push(BASE+side+sh+sk+'.png');
  if(sk!==String(sid)) c.push(bw+'animated/'+side+sh+sid+'.gif', BASE+side+sh+sid+'.png');
  return c;
}
const staticChain=(species,shiny)=>{ const {sk,sid}=monKey(species), bw=BASE+'versions/generation-v/black-white/', sh=shiny?'shiny/':''; return [bw+sh+sk+'.png',BASE+sh+sk+'.png',bw+sh+sid+'.png']; };
const iconChain=(species,num)=>{ const {sk,sid}=monKey(species,num), v7=BASE+'versions/generation-vii/icons/', v8=BASE+'versions/generation-viii/icons/'; return [v7+sk+'.png',v7+sid+'.png',v8+sid+'.png']; };
function chainImg(chain,alt,cls){
  const im=document.createElement('img'); im.alt=alt||''; im.decoding='async'; if(cls) im.className=cls;
  let i=0; im.onerror=()=>{ i++; if(i<chain.length) im.src=chain[i]; else im.style.visibility='hidden'; }; im.src=chain[0];
  return im;
}
const chainAttr=chain=>`src="${esc(chain[0])}" data-chain="${esc(JSON.stringify(chain.slice(1)))}"`;
function wireChains(root){
  root.querySelectorAll('img[data-chain]').forEach(im=>{ const rest=JSON.parse(im.dataset.chain); im.removeAttribute('data-chain');
    im.onerror=()=>{ if(rest.length) im.src=rest.shift(); else im.style.visibility='hidden'; }; if(im.complete&&!im.naturalWidth&&im.src) im.onerror(); });
}
function partnerSprite(num,shiny,name){
  const e={sid:num,sk:String(num),shiny};
  const im=imgEl(spriteChain(e,true),name||'',()=>{},()=>{
    if(isStatic(im)){ const c=trimSprite(im); if(c){ im.replaceWith(c); return; } }
    im.style.setProperty('--nw',im.naturalWidth||64);
  });
  im.loading='eager'; return im;
}
const spName=n=>{ const s=SP.get(n); return s?s.en:'#'+n; };
const initials=n=>String(n||'?').slice(0,1).toUpperCase();
function ago(iso){ if(!iso) return ''; const s=(Date.now()-new Date(iso))/1000; if(s<90) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; const d=Math.round(s/86400); return d===1?'yesterday':d+' days ago'; }

/* ---------------- start / stop ---------------- */
async function sdInit(){
  if(!SYNC.on||!SYNC.user||SD.connecting) return;
  try{ const r=await api('GET','/api/showdown/status'); if(!r.ok) return; SD.status=await r.json(); }catch(_){ return; }
  SD.on=true; $('sdBtn').hidden=SD.view; sdBadge();
  if(!SD.status.available){ if(location.hash==='#showdown') sdOpen(); return; }
  await sdConnect();
  if(location.hash==='#showdown') sdOpen();
}
function sdScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function sdLoadLib(){
  if(!window.signalR) await sdScript('/lib/signalr.min.js');
  // move animations (Pokémon Showdown's, see psanims.js); the battle still works if these fail to load
  try{
    window.PSFX_ROOT='/assets/battle/';
    if(!window.jQuery) await sdScript('/lib/jquery.min.js');
    if(!window.PSAnims) await sdScript('/lib/psanims.js');
    if(!window.PSFX) await sdScript('/lib/psfx.js');
  }catch(_){}
}
async function sdConnect(){
  if(SD.conn||SD.connecting) return; SD.connecting=true;
  try{ await sdLoadLib(); }catch(_){ SD.connecting=false; return; }
  const c=new signalR.HubConnectionBuilder().withUrl('/hubs/showdown').withAutomaticReconnect([0,2000,5000,10000,20000,30000,30000,60000]).configureLogging(signalR.LogLevel.None).build();
  c.on('presence',list=>{ SD.presence=new Map(list.map(p=>[p.userId,p])); sdRenderLobbyIfOpen(); sdSub(); });
  c.on('challenge',ch=>{ SD.challenges.set(ch.id,{...ch,at:Date.now()}); if(ch.to===sdMe()){ SFX.mark(); sdChalPopup(); } sdBadge(); sdRenderLobbyIfOpen(); });
  c.on('challengeClosed',({id,why})=>{ const ch=SD.challenges.get(id); SD.challenges.delete(id); sdBadge(); sdChalPopup();
    if(ch&&ch.from===sdMe()&&why==='declined') flash(`${ch.toName} declined your challenge`);
    else if(ch&&why==='expired') flash(ch.from===sdMe()?`${ch.toName} didn't answer`:`The challenge from ${ch.fromName} expired`);
    sdRenderLobbyIfOpen(); });
  c.on('battleStart',info=>sdBattleStarted(info));
  c.on('match',m=>sdMatchUpdate(m));
  c.on('matchClosed',({id,why,by})=>{ if(!SD.match||SD.match.id!==id) return; SD.match=null; clearInterval(SD.matchTimer); sdBadge();
    const me=SYNC.user&&SYNC.user.username;
    if(why==='left'&&by&&by!==me){ SFX.err(); flash(`${by} left the room`); } else if(why==='offline'){ SFX.err(); flash(`${by||'Your opponent'} went offline`); } else if(why==='expired') flash('The room closed after 10 minutes'); else if(why==='error'){ SFX.err(); flash('Could not start the battle'); }
    sdRenderLobbyIfOpen(); });
  c.on('chunk',({battleId,data})=>{ const B=SD.battle; if(B&&B.id===battleId&&!B.replay){ B.queue.push(...data.split('\n')); sdPump(); } else if(SD.joinBuf&&SD.joinBuf.id===battleId) SD.joinBuf.chunks.push(data); });
  c.on('request',m=>{ const B=SD.battle; if(SD.joinBuf&&SD.joinBuf.id===m.battleId&&(!B||B.id!==m.battleId)){ SD.joinBuf.request=m; return; } if(!B||B.id!==m.battleId||B.replay) return; B.request=m.request; B.pending=m.pending; B.deadline=m.pending?Date.now()+m.deadlineMs:0; B.reqShown=false; B.chosen=false; setTimeout(sdTryShowRequest,150); });
  c.on('ack',m=>{ const B=SD.battle; if(!B||B.id!==m.battleId) return; if(!m.ok){ SFX.err(); flash(m.error||'That move can’t be used'); B.chosen=false; sdShowControls(); } else { B.pending=false; B.deadline=0; sdTimer(); } });
  c.on('opponent',m=>{ const B=SD.battle; if(B&&B.id===m.battleId){ B.oppChoosing=m.choosing; if(B.chosen&&!B.busy) sdBotWait(); } });
  c.on('timeout',m=>{ const B=SD.battle; if(B&&B.id===m.battleId){ SFX.err(); flash(m.left>0?`Time's up! A move was picked for you (${m.left} more and you forfeit)`:'Time ran out'); } });
  c.on('draft',({battleId,draft})=>{ const B=SD.battle; if(!B||B.id!==battleId||!B.draft) return;
    if(draft.phase==='done'){ B.draft=null; SD.battle=null; sdJoin(battleId); return; }
    const was=B.draft; B.draft={...draft,at:Date.now()};
    if(was.phase!==draft.phase||was.pick!==draft.pick){ if(draft.pick>was.pick&&draft.order[draft.pick-1]!==B.me) SFX.box(); if(draft.phase!==was.phase||B.draft.picks.includes(SD.draftSel)) SD.draftSel=null; }
    sdDraftRender(); });
  c.on('battleEnd',res=>{ const B=SD.battle; SD.battleId=null; sdBadge(); if(B&&B.id===res.battleId&&!B.replay){ B.result=res; sdPump(); } else sdLoadLobbyData(); });
  c.onreconnecting(()=>setSync('reconnecting'));
  c.onreconnected(async()=>{ setSync('synced'); await sdHello(); const B=SD.battle; if(B&&!B.replay&&!B.result) sdJoin(B.id,true); });
  c.onclose(()=>{ SD.conn=null; });
  SD.conn=c;
  try{ await c.start(); await sdHello(); }catch(_){ SD.conn=null; }
  SD.connecting=false;
}
async function sdHello(){
  const snap=await SD.conn.invoke('Hello');
  SD.status={...SD.status,available:snap.available,problem:snap.problem,formats:snap.formats,turnSeconds:snap.turnSeconds};
  SD.presence=new Map(snap.presence.map(p=>[p.userId,p]));
  SD.challenges=new Map(snap.challenges.map(c=>[c.id,{...c,at:Date.now()}]));
  SD.battleId=snap.battleId; if(snap.match) sdMatchUpdate(snap.match,true); else { SD.match=null; clearInterval(SD.matchTimer); } sdBadge(); sdChalPopup(); sdRenderLobbyIfOpen();
  if(SD.battleId&&SD.view&&(!SD.battle||SD.battle.id!==SD.battleId)) sdJoin(SD.battleId);
}
function sdStop(){
  if(SD.conn){ try{ SD.conn.stop(); }catch(_){} SD.conn=null; }
  SD.on=false; SD.battle=null; SD.battleId=null; SD.challenges.clear(); $('sdBtn').hidden=true; $('sdChal').hidden=true; if(SD.view) sdClose(true);
}

/* ---------------- header badge + challenge popup ---------------- */
function incoming(){ return [...SD.challenges.values()].filter(c=>c.to===sdMe()); }
function sdBadge(){
  const n=incoming().length, b=$('sdBtn'), d=$('sdDot');
  d.hidden=!n&&!SD.battleId; d.textContent=n?String(n):'!';
  b.classList.toggle('s-pulse',n>0||!!SD.battleId); b.classList.toggle('s-battle',!!SD.battleId&&!n);
  const t=n?`Showdown · ${n} challenge${n>1?'s':''} waiting`:SD.battleId?'Showdown · battle in progress':'Showdown';
  b.title=t; b.setAttribute('aria-label',t);
}
function sdChalPopup(){
  const box=$('sdChal'), list=incoming();
  if(!list.length||(SD.view&&SD.screen==='lobby')||(SD.view&&SD.screen==='battle'&&SD.battle&&!SD.battle.result)){ box.hidden=true; return; }
  const c=list[list.length-1];
  box.innerHTML=`<div class="s-top">${SD_SWORDS}<div><b>${esc(c.fromName)} challenged you!</b><small>${esc(sdFmtName(c.format))}${list.length>1?` · +${list.length-1} more`:''}</small></div></div>
    <div class="s-row"><button class="s-btn s-red" type="button" data-a="ok">⚔ ACCEPT</button><button class="s-btn" type="button" data-a="no">DECLINE</button><button class="s-btn" type="button" data-a="open">OPEN SHOWDOWN</button></div>`;
  box.querySelector('[data-a=ok]').onclick=()=>sdAccept(c.id);
  box.querySelector('[data-a=no]').onclick=()=>sdDecline(c.id);
  box.querySelector('[data-a=open]').onclick=()=>sdOpen();
  box.hidden=false;
}

/* ---------------- battle music ----------------
   Tracks from the Pokémon Showdown site, cached by the server under /assets/music/. Each battle gets one track
   from its generation (picked from the battle id, so a reconnect keeps the same song) and loops it seamlessly.
   Gen 1 and 2 use the HGSS versions of the Kanto and Johto trainer themes. */
const SDM=(()=>{
  const T={1:[['hgss-kanto-trainer',13003,94656]],2:[['hgss-johto-trainer',23731,125086]],
    3:[['oras-trainer',13579,91548],['oras-rival',14303,69149],['colosseum-miror-b',896,47462],['xd-miror-b',9000,57815]],
    4:[['dpp-trainer',13440,96959],['dpp-rival',13888,66352]],
    5:[['bw-trainer',14629,110109],['bw-rival',19180,57373],['bw-subway-trainer',15503,110984],['bw2-kanto-gym-leader',14626,58986],['bw2-rival',7152,68708],['bw2-homika-dogars',1661,68131]]};
  let a=null, cur=null;
  const on=()=>st.sdMusic!==false;
  const hash=s=>{ let h=0; for(const c of String(s)) h=(h*31+c.charCodeAt(0))>>>0; return h; };
  function stop(){ if(a){ a.pause(); a.removeAttribute('src'); a.load(); } a=null; cur=null; }
  function play(B){
    if(!on()||!B||B.result){ stop(); return; }
    if(a&&cur===B.id){ if(a.paused&&!document.hidden) a.play().catch(()=>{}); return; }
    stop();
    const list=T[B.gen]||T[5], [name,start,end]=list[hash(B.id)%list.length];
    const au=new Audio('/assets/music/'+name+'.mp3'); au.volume=.32; au.preload='auto';
    au.addEventListener('timeupdate',()=>{ if(au.currentTime*1000>=end) au.currentTime=start/1000; });
    au.addEventListener('ended',()=>{ au.currentTime=start/1000; au.play().catch(()=>{}); });
    a=au; cur=B.id; au.play().catch(()=>{ document.addEventListener('pointerdown',()=>{ if(a===au&&on()) au.play().catch(()=>{}); },{once:true}); });
  }
  function toggle(){ st.sdMusic=!on(); save(); SFX.tab(); if(on()) play(SD.battle); else stop(); }
  document.addEventListener('visibilitychange',()=>{ if(!a) return; if(document.hidden) a.pause(); else if(on()) a.play().catch(()=>{}); });
  return {play,stop,toggle,on,tracks:()=>[...new Set(Object.values(T).flat().map(t=>t[0]))]};
})();

/* ---------------- view switching ---------------- */
function sdTab(on){
  document.title=on?'Showdown':'HOME Living Dex';
  const f=document.getElementById('favicon'); if(!f) return;
  if(!f.dataset.home) f.dataset.home=f.getAttribute('href');
  f.setAttribute('href',on?f.dataset.sd:f.dataset.home);
}
function sdOpen(){
  if(!SD.on) return;
  SD.view=true; document.body.classList.add('sdmode'); setAcctPop(false);
  $('dexView').hidden=true; $('sdView').hidden=false; $('sdBtn').hidden=true; $('sdBack').hidden=false;
  $('brandTitle').textContent='SHOWDOWN'; sdSub(); sdTab(true);
  if(location.hash!=='#showdown') history.replaceState(null,'','#showdown');
  if(SD.battle&&!SD.battle.result){ sdShow('battle'); SDM.play(SD.battle); }
  else if(SD.battleId) sdJoin(SD.battleId);
  else sdShow('lobby');
  sdLoadLobbyData(); window.scrollTo(0,0);
}
function sdClose(quiet){
  SD.view=false; document.body.classList.remove('sdmode'); SDM.stop();
  $('dexView').hidden=false; $('sdView').hidden=true; $('sdBtn').hidden=!SD.on; $('sdBack').hidden=true;
  $('brandTitle').textContent='HOME LIVING DEX'; $('brandSub').textContent='BOX TRACKER · B2 STYLE'; sdTab(false);
  if(location.hash==='#showdown') history.replaceState(null,'',location.pathname+location.search);
  const B=SD.battle; if(B&&(B.role==='spectator'||B.replay||B.result)){ if(B.role==='spectator'&&!B.replay&&SD.conn) SD.conn.invoke('LeaveBattle',B.id).catch(()=>{}); SD.battle=null; }
  sdBadge(); if(!quiet) sdChalPopup();
}
function sdShow(screen){
  SD.screen=screen;
  $('sdLobby').hidden=screen!=='lobby'; $('sdBattle').hidden=screen!=='battle'; $('sdResult').hidden=screen!=='result';
  sdChalPopup(); sdSub();
}
function sdSub(){
  if(!SD.view) return;
  const online=[...SD.presence.values()].filter(p=>p.status!=='away').length;
  const B=SD.battle;
  $('brandSub').textContent=sdFmtName(B&&SD.screen==='battle'?B.format:SD.match?SD.match.format:sdFormatSel()).toUpperCase()+` · ${online} TRAINER${online===1?'':'S'} ONLINE`;
}
$('sdBtn').onclick=()=>{ SFX.tab(); sdOpen(); };
$('sdBack').onclick=()=>{ SFX.tab(); sdClose(); };
window.addEventListener('hashchange',()=>{ if(location.hash==='#showdown'&&!SD.view) sdOpen(); else if(location.hash!=='#showdown'&&SD.view) sdClose(); });

/* ---------------- lobby ---------------- */
async function sdLoadLobbyData(){
  try{
    const [t,h]=await Promise.all([api('GET','/api/showdown/trainers'),api('GET','/api/showdown/battles')]);
    if(t.ok) SD.trainers=await t.json(); if(h.ok) SD.hist=await h.json();
  }catch(_){}
  sdRenderLobbyIfOpen();
}
const trainer=id=>SD.trainers.find(t=>t.id===id);
function meCard(){ const t=trainer(sdMe())||{id:sdMe(),name:SYNC.user.username,wins:0,losses:0,streak:0,cpuWins:0,cpuLosses:0,partner:25,partnerShiny:false};
  return {...t,livingDex:(st.caught['home|normal']||[]).length}; }
const CPU_CARD={id:0,name:'CPU',cpu:true,partner:137,partnerShiny:false};
const BADGES=[['first-win','First Win','Win your first battle against another trainer','#f2c40c'],['ten-wins','Ten Wins','Win 10 battles','#5fd38a'],['on-fire','On Fire','Win 5 battles in a row','#f08030'],['last-stand','Last Stand','Win with only 1 Pokémon left','#ef3d4f'],['sweeper','Sweeper','Knock out 3 Pokémon with the same one','#7038f8'],['flawless','Flawless','Win without losing a single Pokémon','#78c8c8'],['veteran','Veteran','Play 50 battles','#a0a0c0'],['time-traveller','Time Traveller','Win in all five generations (Gen 1 to Gen 5)','#f85888']];
function badgeCase(have){ const h=new Set(have);
  return `<div class="s-bcase"><span class="s-lbl">BADGES · ${BADGES.filter(b=>h.has(b[0])).length}/8</span>${BADGES.map(b=>`<span class="s-badge${h.has(b[0])?'':' off'}" style="--c:${b[3]}" title="${esc(b[1])}: ${esc(b[2])}${h.has(b[0])?'':' (not yet)'}" role="img" aria-label="${esc(b[1])}: ${esc(b[2])}, ${h.has(b[0])?'earned':'not earned yet'}"></span>`).join('')}</div>`; }
function cardEl(t,o={}){
  const wrap=document.createElement('div'); wrap.className='s-tcard s-grid-bg'+(o.gray?' s-gray':'');
  const rec=t.cpu?'<span class="s-dr">practice partner</span>':`<span class="s-w">${t.wins} W</span> · <span class="s-l">${t.losses} L</span>`;
  const streak=t.cpu?'—':t.streak>0?`${t.streak} win${t.streak>1?'s':''} ★`:'—';
  const dex=t.cpu?'—':`${t.livingDex} <small>/ 1025</small>`;
  wrap.innerHTML=`<div class="s-thead"><b>${esc(String(t.name).toUpperCase())}</b>${o.crown?'<span class="s-crown">WINNER</span>':`<small>${esc(o.label||'TRAINER CARD')}</small>`}</div>
    <div class="s-tbody"><div class="s-tplates">
      <div class="s-hex"><div class="s-in"><span class="s-chip">RECORD</span><span class="s-vv">${o.recordText||rec}</span></div></div>
      <div class="s-hex"><div class="s-in"><span class="s-chip">STREAK</span><span class="s-vv">${streak}</span></div></div>
      <div class="s-hex"><div class="s-in"><span class="s-chip">LIVING DEX</span><span class="s-vv">${dex}</span></div></div>
      <div class="s-hex"><div class="s-in"><span class="s-chip">FAVOURITE</span><span class="s-vv">${esc(spName(t.partner))}${t.partnerShiny?' <small>★</small>':''}</span></div></div>
    </div><div class="s-partner"><span class="s-lbl">PARTNER</span></div></div>
    ${badgeCase(t.cpu?BADGES.map(b=>b[0]):(t.badges||[]))}
    <div class="s-tfoot"><span class="s-lbl">${o.foot||sdTeamFoot()}</span>${o.acts?'<span class="s-acts"></span>':`<span class="s-balls6">${o.balls?o.balls.map(f=>`<i class="${f?'s-f':''}"></i>`).join(''):'<i class="s-q"></i>'.repeat(6).replace(/ class="s-q"/g,o.lit?'':' class="s-q"')}</span>`}</div>`;
  const pz=wrap.querySelector('.s-partner'), img=partnerSprite(t.partner,t.partnerShiny,spName(t.partner));
  if(o.editable){ const b=document.createElement('button'); b.type='button'; b.title='Choose your partner'; b.setAttribute('aria-label','Choose your partner Pokémon'); b.appendChild(img); b.insertAdjacentHTML('beforeend','<span class="s-edit">CHANGE</span>'); b.onclick=sdPickPartner; pz.appendChild(b); }
  else pz.appendChild(img);
  if(o.acts){ const a=wrap.querySelector('.s-acts'); o.acts.forEach(([label,fn,red])=>{ const b=document.createElement('button'); b.type='button'; b.className='s-btn'+(red?' s-red':''); b.textContent=label; b.onclick=fn; a.appendChild(b); }); }
  return wrap;
}
function waitCard(text,sub){
  const d=document.createElement('div'); d.className='s-tcard s-grid-bg';
  d.innerHTML=`<div class="s-thead"><b>???</b><small>CHALLENGER</small></div><div class="s-wait"><span class="s-ball" aria-hidden="true"></span><span>${text}<span class="s-dots"></span></span><small style="font-size:.75rem">${sub}</small></div><div class="s-tfoot"><span class="s-lbl">${sdTeamFoot()}</span><span class="s-balls6">${'<i class="s-q"></i>'.repeat(6)}</span></div>`;
  return d;
}
function sdRenderLobbyIfOpen(){ if(SD.view&&SD.screen==='lobby') sdRenderLobby(); }
function sdRenderLobby(){
  const me=sdMe(), fmt='gen'+sdGenOf(st.sdFormat)+'randombattle', draft=st.sdMode==='draft', avail=SD.status&&SD.status.available&&SD.conn;
  $('sdProblem').hidden=!!avail; if(!avail) $('sdProblem').textContent=SD.status&&!SD.status.available?`Battles are unavailable: ${SD.status.problem||'the simulator is not running.'}`:'Connecting to the battle server…';
  const M=SD.match, mi=matchMe(), my=$('sdMyCard');
  if(M&&mi>=0){
    const meP=M.players[mi], oppP=M.players[1-mi], starting=!!M.startsAt;
    my.replaceChildren(cardEl(meCard(),{label:'TRAINER CARD · YOU',editable:!meP.ready,lit:meP.ready,
      foot:meP.ready?(starting?'READY ✓ · HERE WE GO':'READY ✓ · WAITING FOR '+esc(String(oppP.name).toUpperCase())):'PRESS READY WHEN YOU ARE SET',
      acts:starting?null:meP.ready?[['✕ NOT READY',()=>sdReady(false)],['LEAVE',sdLeaveMatch]]:[['✔ READY',()=>sdReady(true),true],['LEAVE',sdLeaveMatch]]}));
    const t=trainer(oppP.userId)||{id:oppP.userId,name:oppP.name,wins:0,losses:0,streak:0,livingDex:0,partner:25};
    $('sdOppCard').replaceChildren(cardEl(t,{label:'TRAINER CARD · OPPONENT',lit:oppP.ready,foot:oppP.ready?'READY ✓':`${esc(String(oppP.name).toUpperCase())} IS GETTING READY<span class="s-dots"></span>`}));
    SD.vsText='';
  } else my.replaceChildren(cardEl(meCard(),{label:'TRAINER CARD · YOU',editable:true}));
  const out=[...SD.challenges.values()].find(c=>c.from===me), inc=incoming()[0], opp=$('sdOppCard');
  let vs='WAITING';
  if(M&&mi>=0){ vs=''; }
  else if(inc){
    const t=trainer(inc.from)||{name:inc.fromName,wins:0,losses:0,streak:0,livingDex:0,partner:25};
    opp.replaceChildren(cardEl(t,{label:'CHALLENGES YOU · '+sdShortFmt(inc.format).toUpperCase(),foot:sdIsDraft(inc.format)?'TEAM · DRAFT 6':'TEAM · RANDOM 6',acts:[['⚔ ACCEPT',()=>sdAccept(inc.id),true],['DECLINE',()=>sdDecline(inc.id)]]})); vs='CHALLENGE!';
  } else if(out){
    const t=trainer(out.to)||{name:out.toName,wins:0,losses:0,streak:0,livingDex:0,partner:25};
    opp.replaceChildren(cardEl(t,{label:'CHALLENGED · '+sdShortFmt(out.format).toUpperCase(),acts:[['CANCEL',()=>sdCancel(out.id)]]}));
    opp.querySelector('.s-tfoot .s-lbl').innerHTML=`WAITING FOR ${esc(String(out.toName).toUpperCase())}<span class="s-dots"></span>`; vs='SENT';
  } else opp.replaceChildren(waitCard('Waiting for a challenger','Challenge someone from the list below, or practise against the CPU.'));
  SD.vsText=vs; sdVs();

  $('sdFormats').innerHTML='<span>Format</span>'+Object.entries(SD_FORMATS).map(([k,v])=>`<button type="button" data-f="${k}" aria-pressed="${k===fmt}">${v}</button>`).join('');
  $('sdFormats').querySelectorAll('button').forEach(b=>b.onclick=()=>{ st.sdFormat=b.dataset.f; save(); SFX.tab(); sdRenderLobby(); sdSub(); });
  $('sdModes').innerHTML=`<span>Mode</span><button type="button" data-m="random" aria-pressed="${!draft}">Random</button><button type="button" data-m="draft" aria-pressed="${draft}">Draft</button>`;
  $('sdModes').querySelectorAll('button').forEach(b=>b.onclick=()=>{ st.sdMode=b.dataset.m; save(); SFX.tab(); sdRenderLobby(); sdSub(); });
  $('sdRules').innerHTML=draft
    ?`<span>Draft · pool of 16 · 6 each</span><span>· 30 s per pick</span><span>· ${SD.status?SD.status.turnSeconds:60} s per turn</span>`
    :`<span>Random teams · 6 vs 6</span><span>· ${SD.status?SD.status.turnSeconds:60} s per turn</span><span>· CPU battles don't count for the record</span>`;

  const rows=SD.trainers.filter(t=>t.id!==me).map(t=>{ const p=SD.presence.get(t.id); return {t,p,rank:p?(p.status==='online'?0:1):2}; }).sort((a,b)=>a.rank-b.rank||a.t.name.localeCompare(b.t.name));
  $('sdOnlineCount').textContent=[...SD.presence.values()].filter(p=>p.userId!==me&&p.status!=='away').length+' ONLINE';
  const box=$('sdTrainers'); box.innerHTML='';
  const busy=!!SD.battleId||!!SD.match;
  rows.forEach(({t,p})=>{
    const r=document.createElement('div'); r.className='s-trow';
    const chIn=[...SD.challenges.values()].find(c=>c.from===t.id&&c.to===me), chOut=[...SD.challenges.values()].find(c=>c.from===me&&c.to===t.id);
    const status=chIn?'<span class="s-st s-chal">CHALLENGES YOU</span>':!p?'<span class="s-st s-off">OFFLINE</span>':p.status==='battle'?'<span class="s-st s-bt">IN BATTLE</span>':p.status==='match'?'<span class="s-st s-bt">IN A ROOM</span>':p.status==='away'?'<span class="s-st s-off">AWAY</span>':'<span class="s-st s-on">ONLINE</span>';
    const sub=`${t.wins} W · ${t.losses} L`+(!p&&t.lastSeen?` · seen ${ago(t.lastSeen)}`:'');
    r.innerHTML=`<span class="s-av">${esc(initials(t.name))}</span><div class="s-who"><b>${esc(t.name)}</b><small>${sub}</small></div>${status}<span class="s-btns"></span>`;
    const bt=r.querySelector('.s-btns'), add=(label,fn,cls,dis)=>{ const b=document.createElement('button'); b.type='button'; b.className='s-btn'+(cls?' '+cls:''); b.textContent=label; b.disabled=!!dis; b.onclick=fn; bt.appendChild(b); };
    if(chIn){ add('⚔ ACCEPT',()=>sdAccept(chIn.id),'s-red',!avail); add('✕',()=>sdDecline(chIn.id)); }
    else if(chOut) add('CANCEL',()=>sdCancel(chOut.id));
    else if(p&&p.status==='battle'&&p.battleId) add('▶ WATCH',()=>sdWatch(p.battleId),'',!avail);
    else add('⚔ CHALLENGE',()=>sdChallenge(t.id),'s-red',!avail||!p||p.status!=='online'||busy);
    box.appendChild(r);
  });
  if(!rows.length) box.insertAdjacentHTML('beforeend','<div class="s-trow"><div class="s-who"><small>No other trainers on this server yet. Ask a friend to create an account.</small></div></div>');
  const cpu=document.createElement('div'); cpu.className='s-trow';
  cpu.innerHTML=`<span class="s-av" style="background:var(--gold)">CPU</span><div class="s-who"><b>Practice vs CPU</b><small>${st.sdMode==='draft'?'Drafts its own team':'Random team'}, picks its own moves${meCard().cpuWins+meCard().cpuLosses?` · you: ${meCard().cpuWins} W · ${meCard().cpuLosses} L`:''}</small></div><span class="s-st s-on">ALWAYS</span><span class="s-btns"><button class="s-btn" type="button">${busy?'▶ BACK TO BATTLE':'▶ BATTLE'}</button></span>`;
  const cb=cpu.querySelector('button'); cb.disabled=!avail; cb.onclick=()=>busy?sdJoin(SD.battleId):sdStartCpu();
  box.appendChild(cpu);

  const h=$('sdHist');
  h.innerHTML=SD.hist.length?'':'<div class="s-empty">No battles yet.</div>';
  SD.hist.forEach(b=>{
    const d=document.createElement('div');
    const res=b.result==='win'?`<span class="s-w">WIN · ${b.left} left</span>`:b.result==='loss'?`<span class="s-l">LOSS${b.reason==='forfeit'?' · forfeit':b.reason==='timeout'?' · timeout':''}</span>`:'<span class="s-dr">DRAW</span>';
    d.innerHTML=`<span>vs ${esc(b.opponent)} <small class="s-dr">· ${esc(sdShortFmt(b.format))}</small></span><span>${res} <button type="button" title="Watch replay" aria-label="Watch replay of the battle against ${esc(b.opponent)}">▶</button></span>`;
    d.querySelector('button').onclick=()=>sdReplay(b.id);
    h.appendChild(d);
  });
}

/* ---------------- actions ---------------- */
async function sdCall(method,...args){
  if(!SD.conn){ SFX.err(); flash('Not connected to the battle server'); return {error:'offline'}; }
  try{ return await SD.conn.invoke(method,...args); }catch(_){ SFX.err(); flash('The battle server did not answer'); return {error:'failed'}; }
}
async function sdChallenge(userId){ const err=await sdCall('Challenge',userId,sdFormatSel()); if(err&&typeof err==='string'){ SFX.err(); flash(err); } else SFX.tab(); }
async function sdCancel(id){ const err=await sdCall('CancelChallenge',id); if(typeof err==='string') flash(err); }
async function sdDecline(id){ const err=await sdCall('DeclineChallenge',id); if(typeof err==='string') flash(err); SD.challenges.delete(id); sdBadge(); sdChalPopup(); sdRenderLobbyIfOpen(); }
async function sdAccept(id){ const r=await sdCall('AcceptChallenge',id); if(r&&r.error){ SFX.err(); flash(r.error); } else { SD.challenges.delete(id); sdBadge(); } }
async function sdStartCpu(){ const r=await sdCall('StartCpu',sdFormatSel()); if(r&&r.error){ SFX.err(); flash(r.error); } }
async function sdWatch(id){ await sdJoin(id); }

function sdBattleStarted(info){
  SD.battleId=info.battleId; SD.match=null; clearInterval(SD.matchTimer); sdBadge(); $('sdChal').hidden=true;
  if(!SD.view) sdOpen();
  sdJoin(info.battleId);
}

/* ---------------- battle room (both press READY, then a 3 s countdown) ---------------- */
function sdMatchUpdate(m,quiet){
  const was=SD.match; SD.match={...m,startsAt:m.startsInMs>0?Date.now()+m.startsInMs:0};
  $('sdChal').hidden=true; sdBadge();
  if(!was&&!quiet){ SFX.mark(); }
  if(!SD.view) sdOpen(); else if(SD.screen!=='lobby'&&!(SD.battle&&!SD.battle.result)){ SD.battle=null; sdShow('lobby'); }
  clearInterval(SD.matchTimer);
  if(SD.match.startsAt){ if(!was||!was.startsInMs) SFX.box(); SD.matchTimer=setInterval(sdVs,150); }
  sdRenderLobbyIfOpen();
}
const matchMe=()=>SD.match?SD.match.players.findIndex(p=>p.userId===sdMe()):-1;
function sdVs(){
  const el=document.querySelector('#sdLobby .s-vs'); if(!el) return;
  const M=SD.match;
  if(M&&M.startsAt){ const n=Math.max(1,Math.ceil((M.startsAt-Date.now())/1000)); el.innerHTML=`<span class="s-count">${n}</span><small>STARTING</small>`; return; }
  const ready=M?M.players.filter(p=>p.ready).length:0;
  el.innerHTML=`VS<small id="sdVsState">${M?`READY ${ready}/2`:esc(SD.vsText||'WAITING')}</small>`;
}
async function sdReady(on){ if(!SD.match) return; SFX.tab(); const err=await sdCall('SetReady',SD.match.id,on); if(typeof err==='string'){ SFX.err(); flash(err); } }
async function sdLeaveMatch(){ if(!SD.match) return; const id=SD.match.id; SD.match=null; clearInterval(SD.matchTimer); sdRenderLobbyIfOpen(); await sdCall('LeaveMatch',id); }

/* ---------------- partner picker ---------------- */
function sdPickPartner(){
  const caught=new Set((st.caught['home|normal']||[]).map(k=>+String(k).split(':')[1]).filter(Boolean));
  const mine=meCard(); let sel=mine.partner, shiny=!!mine.partnerShiny;
  const pool=(caught.size?[...caught]:RAW.s.map(x=>x[0])).sort((a,b)=>a-b);
  openModal('Choose your partner',`<div class="s-pick"><p class="s-pnote">${caught.size?`Pick any Pokémon you've marked in Pokémon HOME · Normal (${caught.size}).`:'Mark Pokémon in Pokémon HOME · Normal to pick from your own living dex. For now, every Pokémon is available.'}</p>
    <div class="s-ptools"><input type="search" id="sdPq" placeholder="Name or no." aria-label="Search Pokémon"><label class="toggle"><input type="checkbox" id="sdPshiny" ${shiny?'checked':''}> Shiny</label></div>
    <div class="s-pgrid" id="sdPgrid"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" type="button" id="sdPsave">Save partner</button></div></div>`);
  const grid=$('sdPgrid'), v7=BASE+'versions/generation-vii/icons/', v8=BASE+'versions/generation-viii/icons/';
  const draw=q=>{ q=(q||'').trim().toLowerCase(); grid.innerHTML='';
    pool.filter(n=>!q||String(n)===q.replace(/^#/,'')||spName(n).toLowerCase().includes(q)).slice(0,400).forEach(n=>{
      const b=document.createElement('button'); b.type='button'; b.setAttribute('aria-pressed',String(n===sel)); b.title=spName(n);
      b.innerHTML=`<img loading="lazy" alt="" ${chainAttr([v7+n+'.png',v8+n+'.png'])}><span>${esc(spName(n))}</span>`;
      b.onclick=()=>{ sel=n; grid.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); };
      grid.appendChild(b); });
    wireChains(grid); };
  draw(''); $('sdPq').oninput=e=>draw(e.target.value);
  $('sdPshiny').onchange=e=>{ shiny=e.target.checked; };
  $('sdPsave').onclick=async()=>{
    try{ const r=await api('PUT','/api/showdown/me/partner',{partner:sel,shiny}); if(!r.ok) throw 0;
      const t=trainer(sdMe()); if(t){ t.partner=sel; t.partnerShiny=shiny; } $('modal').hidden=true; SFX.mark(); cry(sel); sdRenderLobbyIfOpen(); if(PF.open) pfRender(); flash(`${spName(sel)} is your partner now`); }
    catch(_){ SFX.err(); flash('Could not save the partner'); }
  };
}

/* ---------------- battle: state ---------------- */
function newBattle(id,role,format,bg,players,replay){
  const me=role==='p2'?'p2':'p1';
  return {id,role,me,foe:me==='p1'?'p2':'p1',format,gen:+((/^gen(\d)/.exec(format||'')||[])[1]||5),bg,players,replay:!!replay,queue:[],busy:false,fast:false,request:null,pending:false,reqShown:false,chosen:false,
    deadline:0,oppChoosing:false,active:{p1:null,p2:null},seen:{p1:new Map(),p2:new Map()},size:{p1:6,p2:6},names:{p1:players[0].name,p2:players[1].name},
    turn:0,weather:'',log:[],lineCls:'sys',lastMoveType:null,result:null,ended:false,winner:null,sel:null,view:'cmd'};
}
async function sdJoin(id,rejoin){
  SD.joinBuf={id,chunks:[],request:null};
  const r=await sdCall('JoinBattle',id); const buf=SD.joinBuf; SD.joinBuf=null; if(!r||r.error&&!r.ended){ if(r&&r.error) flash(r.error); SD.battleId=null; sdBadge(); if(SD.view) sdShow('lobby'); sdLoadLobbyData(); return; }
  if(r.error&&r.ended){ flash('That battle has finished'); SD.battleId=null; sdBadge(); sdShow('lobby'); sdLoadLobbyData(); return; }
  if(rejoin&&SD.battle&&SD.battle.id===id){
    // after a reconnect: rebuild from the full log, silently
    SD.battle=null;
  }
  const B=newBattle(r.battleId,r.role,r.format,r.background,r.players,false); SD.battle=B;
  if(r.role!=='spectator'){ SD.battleId=r.battleId; sdBadge(); B.oppChoosing=!!r.opponentChoosing; }
  if(r.draft&&!r.ended){ B.draft={...r.draft,at:Date.now()}; SD.draftSel=null; sdShow('battle'); sdDraftRender(); SDM.play(B); return; }
  $('sdScr').querySelector('.dr-top')?.remove();
  sdSetupScreen(B); sdShow('battle');
  B.fast=true; (r.log||[]).concat(buf&&buf.id===id?buf.chunks:[]).forEach(c=>B.queue.push(...c.split('\n'))); await sdPump(); B.fast=false;
  if(B.role==='spectator') sdSay(B.turn?`Turn ${B.turn} · waiting for the players…`:'Waiting for the players…');
  const rq=buf&&buf.id===id&&buf.request?buf.request:r.request?{request:r.request,pending:r.pending,deadlineMs:r.deadlineMs}:null;
  if(rq){ B.request=rq.request; B.pending=rq.pending; B.deadline=rq.pending?Date.now()+rq.deadlineMs:0; }
  if(r.ended&&r.result){ B.result=r.result; sdPump(); return; }
  sdTryShowRequest(); if(!B.request) sdBotWait();
}
function sdSetupScreen(B){
  const scr=$('sdScr');
  [1,2,3,4,5].forEach(g=>scr.classList.toggle('sdg'+g,g===B.gen));
  scr.style.setProperty('--bg',B.gen<=2?'none':`url("/assets/battle/fx/bg-${B.gen<=4?eraBg(B.gen,B.bg):(B.bg||'route')}.png")`);
  SDM.play(B);
  sdWeather(B,'');
  ['sdFoeMon','sdMeMon','sdFoeBalls','sdMeBalls'].forEach(i=>$(i).innerHTML='');
  $('sdFoeHp').hidden=true; $('sdMeHp').hidden=true; sdSay(B.replay?'Replay':'The battle is starting…'); sdBot(''); sdTimer();
  clearInterval(SD.timerInt); SD.timerInt=setInterval(sdTimer,500);
}
/* Gen 3–4 have their own fields; pick the one closest to the background the server rolled. */
function eraBg(gen,bg){
  const k=String(bg||'');
  const kind=/cave/.test(k)?'cave':/beach|desert/.test(k)?'sand':/sea|river/.test(k)?'water':/forest/.test(k)?'forest':/city/.test(k)?'city':/mountain|ice/.test(k)?'snow':'';
  const map=gen===3?{cave:'gen3-cave',sand:'gen3-sand',water:'gen3-ocean',forest:'gen3-forest',city:'gen3-arena'}:{cave:'gen4-cave',water:'gen4-water',city:'gen4-indoors',snow:'gen4-snow'};
  return map[kind]||('gen'+gen);
}
const sideOf=id=>id.slice(0,2);
function parseDetails(d){ const p=d.split(', '), m={species:p[0],level:100,gender:'',shiny:false}; p.slice(1).forEach(x=>{ if(/^L\d+$/.test(x)) m.level=+x.slice(1); else if(x==='M'||x==='F') m.gender=x; else if(x==='shiny') m.shiny=true; }); return m; }
function parseHP(s){ if(!s) return null; const [hp,st2]=s.split(' '); if(hp==='0'||st2==='fnt') return {hp:0,max:100,status:'fnt'}; const [a,b]=hp.split('/'); return {hp:+a,max:+(b||100),status:st2||''}; }
function monOf(B,ident){
  const side=/^p[12]/.test(ident)?sideOf(ident):'p1', name=String(ident).replace(/^p\d[a-z]?: /,'').trim();
  let m=B.seen[side].get(name); if(!m){ m={name,species:name,level:100,gender:'',shiny:false,hp:100,max:100,status:'',side}; B.seen[side].set(name,m); }
  return m;
}
const who=(B,m,cap)=>m.side===B.foe&&B.role!=='spectator'?(cap?'The opposing ':'the opposing ')+m.name:B.role==='spectator'?m.name:m.name;
const hpPct=m=>m.max?Math.max(0,Math.min(100,Math.round(m.hp/m.max*100))):0;
const hpCls=p=>p<=20?'s-low':p<=50?'s-mid':'';

/* ---------------- battle: drawing ---------------- */
function sdSay(t){ const x=eraText(SD.battle,t), el=$('sdMsg'); el.textContent=x; el.parentElement.classList.toggle('s-long',String(x||'').length>40); }
const FOE_WORD={1:['Enemy ','enemy '],2:['Enemy ','enemy '],3:['Foe ','foe '],4:["The foe's ","the foe's "]};
function eraText(B,t){
  if(!B||!B.gen||B.gen>4||!t) return t;
  const fw=FOE_WORD[B.gen]; t=String(t).replace(/The opposing /g,fw[0]).replace(/the opposing /g,fw[1]);
  const names=[...new Set([...B.seen.p1.values(),...B.seen.p2.values()].map(m=>m.name).filter(n=>n&&n.length>1))].sort((a,b)=>b.length-a.length);
  names.forEach(n=>{ t=t.split(n).join(n.toUpperCase()); });
  return t;
}
function sdDrawHp(B,side){
  const m=B.active[side], el=$(side===B.me?'sdMeHp':'sdFoeHp');
  if(!m){ el.hidden=true; return; }
  const p=hpPct(m), mine=side===B.me&&B.role!=='spectator';
  const g=m.gender==='M'?'<span class="s-g">♂</span>':m.gender==='F'?'<span class="s-gf">♀</span>':'';
  const stt=m.status&&m.status!=='fnt'?`<span class="s-stt ${m.status}">${m.status.toUpperCase()}</span>`:'';
  const gb=B.gen<=2;
  el.innerHTML=`<div class="s-r1"><span>${esc(m.name)} ${B.gen===1?'':g}${stt}</span><span class="s-lv">${gb?':L':'Lv'}${m.level}</span></div><div class="s-bar"><b class="s-hpl">HP${gb?':':''}</b><span class="s-tr"><i class="${hpCls(p)}" style="width:${p}%"></i></span></div>${mine?`<div class="s-num">${Math.max(0,m.hp)}/ ${m.max}</div>`:''}`;
  el.hidden=false;
}
function sdDrawBalls(B){
  [B.me,B.foe].forEach(side=>{
    const el=$(side===B.me?'sdMeBalls':'sdFoeBalls'); let arr=[];
    if(side===B.me&&B.request&&B.request.side&&B.role!=='spectator') arr=B.request.side.pokemon.map(p=>/ fnt$/.test(p.condition)||p.condition==='0 fnt');
    else { const seen=[...B.seen[side].values()]; arr=seen.map(m=>m.status==='fnt'); while(arr.length<B.size[side]) arr.push(false); }
    el.innerHTML=arr.map(f=>`<i class="${f?'s-f':''}"></i>`).join('');
    el.setAttribute('aria-label',`${B.names[side]}: ${arr.filter(f=>!f).length} of ${arr.length} left`);
  });
}
function sdDrawMon(B,side,anim){
  const m=B.active[side], box=$(side===B.me?'sdMeMon':'sdFoeMon'); box.innerHTML='';
  if(!m||m.status==='fnt'&&!anim) return null;
  const back=side===B.me, r=RETRO[B.gen], im=chainImg(battleChain(m,back,B.gen),`${m.name}${back?'':' (opponent)'}`,side===B.foe&&!r?'s-bob':'');
  im.style.setProperty('--nw',64);
  im.addEventListener('load',()=>{
    const src=im.currentSrc||im.src;
    if(r&&src.includes('/versions/'+r.dir)){
      // Old sprites sit in padded frames: trim them so they stand on the same line, then size them like on the console.
      if(!im.dataset.trim){ im.dataset.trim='1'; const u=trimToUrl(im); if(u){ im.src=u; return; } }
      im.style.setProperty('--nw',Math.round(im.naturalWidth*r.scale)); return;
    }
    if(src.startsWith('data:')){ im.style.setProperty('--nw',Math.round(im.naturalWidth*(r?r.scale:1))); return; }
    im.style.setProperty('--nw',battleWidth(m,back,/\.png/.test(src)?72:im.naturalWidth||64));
  });
  box.appendChild(im); return im;
}
/* Black/White sprites all fit a 96 px box, so a Wailord comes out the size of a Chandelure. Big Pokémon
   (over 2 m) get scaled up with their real height, up to +35%, and nothing grows past the screen. */
function battleWidth(m,back,natural){
  const sid=monKey(m.species).sid, h=((RAW.ht&&RAW.ht[sid-1])||10)/10;
  const mult=h>2?Math.min(1.35,1+0.18*Math.log(h/2)):1;
  return Math.round(Math.min(natural*mult,back?110:112));
}
function trimToUrl(im){
  try{
    const w=im.naturalWidth, h=im.naturalHeight; if(!w||!h) return null;
    const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.drawImage(im,0,0);
    const d=x.getImageData(0,0,w,h).data; let t=h,l=w,rr=-1,b=-1;
    for(let y=0;y<h;y++) for(let i=0;i<w;i++) if(d[(y*w+i)*4+3]>8){ if(i<l)l=i; if(i>rr)rr=i; if(y<t)t=y; if(y>b)b=y; }
    if(rr<0) return null;
    const o=document.createElement('canvas'); o.width=rr-l+1; o.height=b-t+1; o.getContext('2d').drawImage(c,l,t,o.width,o.height,0,0,o.width,o.height);
    return o.toDataURL();
  }catch(_){ return null; }
}
const monImg=(B,side)=>$(side===B.me?'sdMeMon':'sdFoeMon').querySelector('img');
function sdTimer(){
  const B=SD.battle, el=$('sdTmr'); if(!el) return;
  if(!B||B.replay||!B.pending||!B.deadline||B.result||B.busy||B.queue.length||!B.reqShown||B.chosen){ el.textContent=''; return; }
  const s=Math.max(0,Math.ceil((B.deadline-Date.now())/1000));
  el.textContent=`⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; el.classList.toggle('s-low',s<=10);
}

/* ---------------- battle: protocol ---------------- */
const STAT={atk:'Attack',def:'Defense',spa:'Sp. Atk',spd:'Sp. Def',spe:'Speed',accuracy:'accuracy',evasion:'evasiveness'};
const STATUS_TXT={par:'is paralyzed! It may be unable to move!',brn:'was burned!',psn:'was poisoned!',tox:'was badly poisoned!',slp:'fell asleep!',frz:'was frozen solid!'};
const WEATHER={RainDance:'It started to rain!',SunnyDay:'The sunlight turned harsh!',Sandstorm:'A sandstorm kicked up!',Hail:'It started to hail!'};
const WEATHER_UP={RainDance:'Rain continues to fall.',SunnyDay:'The sunlight is strong.',Sandstorm:'The sandstorm rages.',Hail:'The hail is crashing down.'};
const effName=s=>String(s||'').replace(/^(move|ability|item): /,'');
const fromOf=args=>{ const f=args.find(a=>a.startsWith('[from]')); return f?effName(f.slice(6).trim()):''; };
async function sdPump(){
  const B=SD.battle; if(!B||B.busy) return; B.busy=true;
  if(!B.fast&&B.role!=='spectator'&&!B.replay&&B.request&&B.queue.length) sdBotWait();
  try{
    while(SD.battle===B&&B.queue.length){ const line=B.queue.shift(); try{ await sdLine(B,line); }catch(e){ console.warn('battle line failed',line,e); } }
  }finally{ B.busy=false; }
  if(SD.battle!==B) return;
  if(B.result&&!B.shownResult){ B.shownResult=true; if(!B.fast) await sdWait(1400); sdShowResult(B); return; }
  if(!B.fast) sdTryShowRequest();
}
async function say(B,text,ms=950){ sdSay(text); sdLog(B,text); if(!B.fast) await sdWait(ms); }

/* ---------------- battle: effects ---------------- */
function fxScene(){ if(!window.PSFX||!window.PSAnims) return null; const r=$('sdScr'); if(!SD.fx||SD.fx.root!==r) SD.fx=new PSFX.FXScene(r,f=>'/assets/battle/fx/'+f); return SD.fx; }
const scrRect=()=>$('sdScr').getBoundingClientRect();
function rectOf(el){ const s=scrRect(), r=el.getBoundingClientRect(); return {x:r.left-s.left,y:r.top-s.top,w:r.width,h:r.height,cx:r.left-s.left+r.width/2,cy:r.top-s.top+r.height*.55,W:s.width,H:s.height}; }
function fxDot(css){ const i=document.createElement('i'); Object.assign(i.style,css); $('sdFxl').appendChild(i); return i; }
function fxFlash(color,peak=.45,ms=380){ const f=$('sdFlash'); f.style.background=color; return f.animate([{opacity:0},{opacity:peak,offset:.25},{opacity:0}],{duration:ms,easing:'steps(6)'}).finished; }
function fxShake(strength=1){ const d=strength*1.6; return $('sdScr').animate([{transform:'translate(0,0)'},{transform:`translate(${-d}%,${d*.4}%)`},{transform:`translate(${d}%,${-d*.4}%)`},{transform:`translate(${-d*.7}%,0)`},{transform:`translate(${d*.7}%,${d*.3}%)`},{transform:`translate(${-d*.3}%,0)`},{transform:'translate(0,0)'}],{duration:420,easing:'steps(7)'}).finished; }
function fxBlink(img,times=2){ return img?img.animate([{opacity:1},{opacity:.1},{opacity:1}],{duration:160,iterations:times,easing:'steps(2)'}).finished:Promise.resolve(); }
async function fxStat(img,up,stages){
  if(!img) return; const r=rectOf(img), scr=$('sdScr');
  const band=document.createElement('div'); band.className='s-band';
  Object.assign(band.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',WebkitMaskImage:`url("${img.currentSrc||img.src}")`,maskImage:`url("${img.currentSrc||img.src}")`,
    background:up?'repeating-linear-gradient(0deg,hsl(212 100% 68% / 0) 0 6%,hsl(212 100% 68% / .85) 6% 12%)':'repeating-linear-gradient(0deg,hsl(0 100% 66% / 0) 0 6%,hsl(0 100% 66% / .85) 6% 12%)',backgroundSize:'100% 50%'});
  scr.appendChild(band);
  band.animate([{backgroundPosition:'0 0',opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{backgroundPosition:up?'0 -100%':'0 100%',opacity:0}],{duration:1100,easing:'steps(14)'}).finished.then(()=>band.remove());
  const n=up&&stages>1||!up&&stages>1?6:3;
  for(let k=0;k<n;k++){ const a=document.createElement('i'); a.className='s-arrow '+(up?'up':'dn'); Object.assign(a.style,{left:(r.x+r.w*(.2+.6*Math.random()))+'px',top:(r.y+r.h*(up?.85:.1))+'px'}); scr.appendChild(a);
    a.animate([{transform:'translateY(0)',opacity:0},{opacity:1,offset:.2},{transform:`translateY(${up?-r.h*.8:r.h*.8}px)`,opacity:0}],{duration:900,delay:k*120,easing:'steps(10)',fill:'both'}).finished.then(()=>a.remove()); }
  if(st.sound) up?blip(660,.06,0,'square',.04)||blip(990,.08,.07,'square',.04):blip(440,.06,0,'square',.04)||blip(300,.08,.07,'square',.04);
}
const STC={par:'#f8d030',brn:'#f07030',psn:'#b050c0',tox:'#b050c0',slp:'#cfd8ff',frz:'#9ae0ff'};
async function fxStatus(img,stt){
  if(!img||!STC[stt]) return; const r=rectOf(img), u=r.W/100, c=STC[stt], all=[];
  if(stt==='slp'){ for(let k=0;k<3;k++){ const z=document.createElement('span'); z.className='s-zz'; z.textContent='z'; Object.assign(z.style,{left:(r.x+r.w*.7)+'px',top:(r.y+r.h*.25)+'px'}); $('sdFxl').appendChild(z);
      all.push(z.animate([{transform:'translate(0,0) scale(.6)',opacity:0},{opacity:1,offset:.3},{transform:`translate(${4*u}px,${-10*u}px) scale(1.3)`,opacity:0}],{duration:1100,delay:k*300,easing:'steps(10)',fill:'both'}).finished.then(()=>z.remove())); } }
  else for(let k=0;k<12;k++){ const sz=(stt==='psn'||stt==='tox'?2.2:stt==='par'?1:1.6)*u, rot=stt==='frz'?' rotate(45deg)':'';
    const i=fxDot({left:(r.x+r.w*(.15+.7*Math.random()))+'px',top:(r.y+r.h*(.4+.5*Math.random()))+'px',width:sz+'px',height:(stt==='par'?sz*3:sz)+'px',background:c,borderRadius:stt==='psn'||stt==='tox'?'50%':'0',boxShadow:`0 0 ${u}px ${c}`});
    all.push(i.animate([{transform:'translateY(0)'+rot,opacity:0},{opacity:1,offset:.2},{transform:`translateY(${-(stt==='brn'?14:9)*u}px)`+rot,opacity:0}],{duration:700,delay:k*60,easing:'steps(8)',fill:'both'}).finished.then(()=>i.remove())); }
  img.animate([{filter:'none'},{filter:`brightness(1.3) sepia(.6) hue-rotate(${stt==='frz'?'160deg':stt==='psn'||stt==='tox'?'240deg':'0deg'})`},{filter:'none'}],{duration:700,easing:'steps(6)'});
  await Promise.all(all);
}
async function fxRecall(img){ if(!img) return; await img.animate([{filter:'none',transform:'scale(1)',opacity:1},{filter:'brightness(.9) sepia(1) saturate(6) hue-rotate(-30deg)',transform:'scale(1)',opacity:1,offset:.35},{filter:'brightness(.9) sepia(1) saturate(6) hue-rotate(-30deg)',transform:'scale(0)',opacity:.4}],{duration:600,easing:'steps(8)',fill:'forwards'}).finished; img.style.visibility='hidden'; }
async function fxSendOut(B,side,img){
  if(!img) return; img.style.visibility='hidden';
  const box=$(side===B.me?'sdMeMon':'sdFoeMon'), r=rectOf(box), mine=side===B.me;
  const ball=document.createElement('span'); ball.className='s-pball'; $('sdScr').appendChild(ball);
  const tx=r.cx/r.W*100, ty=(r.y+r.h*.7)/r.H*100;
  await ball.animate([{left:mine?'-6%':'106%',top:mine?'45%':'10%',transform:'rotate(0)'},{left:(tx-4)+'%',top:(ty-25)+'%',transform:'rotate(360deg)',offset:.55},{left:(tx-2)+'%',top:ty+'%',transform:'rotate(720deg)'}],{duration:520,easing:'steps(12)',fill:'forwards'}).finished;
  ball.remove(); fxFlash('#fff',.45,200);
  const ring=fxDot({left:r.cx+'px',top:(r.y+r.h*.7)+'px',width:'10cqw',height:'10cqw',border:'.9cqw solid #fff',borderRadius:'50%'});
  ring.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:1},{transform:'translate(-50%,-50%) scale(1.8)',opacity:0}],{duration:340,easing:'steps(6)',fill:'both'}).finished.then(()=>ring.remove());
  img.style.visibility='';
  await img.animate([{transform:'scale(.15)',filter:'brightness(4)'},{transform:'scale(1)',filter:'brightness(4)',offset:.6},{transform:'scale(1)',filter:'brightness(1)'}],{duration:480,easing:'steps(8)'}).finished;
}
async function fxFaint(img){ if(!img) return; await img.animate([{transform:'translateY(0)',clipPath:'inset(0 0 0 0)'},{transform:'translateY(70%)',clipPath:'inset(0 0 70% 0)'}],{duration:650,easing:'steps(10)',fill:'forwards'}).finished; }
const WX_TAG={RainDance:'RAIN',SunnyDay:'HARSH SUN',Sandstorm:'SANDSTORM',Hail:'HAIL'}, WX_CLASS={RainDance:'rain',SunnyDay:'sun',Sandstorm:'sand',Hail:'hail'};
function sdWeather(B,w){ const el=$('sdWx'); if(!el) return; el.className='s-wx'+(WX_CLASS[w]?' '+WX_CLASS[w]+' on':''); $('sdWxTag').hidden=!WX_TAG[w]; $('sdWxTag').textContent=WX_TAG[w]||''; }
function sdLog(B,text,cls){ if(!B||!text) return; B.log.push({c:cls||B.lineCls||'sys',t:cls==='t'?text:eraText(B,text)}); }
async function sdLine(B,line){
  if(!line||line[0]!=='|') return;
  const a=line.slice(1).split('|'), cmd=a[0];
  B.lineCls=/^p[12]/.test(a[1]||'')?(sideOf(a[1])===B.me?'me':'foe'):'sys';
  switch(cmd){
    case 'player': if(a[1]&&a[2]) B.names[a[1]]=a[2]; return;
    case 'teamsize': B.size[a[1]]=+a[2]; sdDrawBalls(B); return;
    case 'turn': B.turn=+a[1]; sdLog(B,'TURN '+a[1],'t'); if(!B.fast&&B.replay) await sdWait(300); return;
    case 'switch': case 'drag': case 'replace': {
      const side=sideOf(a[1]), m=monOf(B,a[1]), d=parseDetails(a[2]), hp=parseHP(a[3]);
      Object.assign(m,d); if(hp){ m.hp=hp.hp; m.max=hp.max; m.status=hp.status; }
      const prev=B.active[side];
      if(prev&&prev!==m&&cmd!=='replace'&&prev.status!=='fnt'&&!B.fast){
        const t=side===B.me&&B.role!=='spectator'?`Come back, ${prev.name}!`:`${B.names[side]} withdrew ${prev.name}!`; sdSay(t); sdLog(B,t);
        await fxRecall(monImg(B,side));
      }
      B.active[side]=m;
      const im=sdDrawMon(B,side,true); sdDrawHp(B,side); sdDrawBalls(B);
      const txt=cmd==='drag'?`${who(B,m,true)} was dragged out!`:side===B.me&&B.role!=='spectator'?`Go! ${m.name}!`:`${B.names[side]} sent out ${m.name}!`;
      if(B.fast){ sdLog(B,txt); return; }
      sdSay(txt); sdLog(B,txt);
      if(im){ await new Promise(r=>{ if(im.complete) r(); else { im.addEventListener('load',r,{once:true}); im.addEventListener('error',r,{once:true}); setTimeout(r,1200); } }); await fxSendOut(B,side,im); }
      cry(monKey(m.species).sid);
      await sdWait(450); return;
    }
    case 'detailschange': case '-formechange': {
      const m=monOf(B,a[1]); m.species=a[2].split(', ')[0]; if(cmd==='detailschange') Object.assign(m,parseDetails(a[2]));
      if(B.active[m.side]===m) sdDrawMon(B,m.side); return;
    }
    case '-transform': { const m=monOf(B,a[1]), t=monOf(B,a[2]); m.species=t.species; if(B.active[m.side]===m) sdDrawMon(B,m.side); return say(B,`${who(B,m,true)} transformed into ${t.name}!`); }
    case 'move': {
      const m=monOf(B,a[1]), id=toID(a[2]);
      B.lastMoveType=(window.PSAnims&&PSAnims.MoveTypes[id])||null;
      const text=`${who(B,m,true)} used ${a[2]}!`; sdSay(text); sdLog(B,text);
      if(B.fast) return;
      const sc=fxScene(), still=a.includes('[still]')||a.some(x=>x.startsWith('[notarget]'));
      const tgt=a[3]&&/^p[12]/.test(a[3])?sideOf(a[3]):null;
      if(B.gen<=2){ await sdWait(still?800:600); return; }
      if(sc&&!still){ await sdWait(250); await sc.run(id,{meImg:monImg(B,B.me),foeImg:monImg(B,B.foe),attacker:m.side===B.me?'me':'foe',self:!tgt||tgt===m.side}); await sdWait(150); }
      else await sdWait(800);
      return;
    }
    case '-damage': case '-heal': case '-sethp': {
      const m=monOf(B,a[1]), hp=parseHP(a[2]); const before=m.hp;
      if(hp){ m.hp=hp.hp; if(hp.max) m.max=hp.max; if(hp.status) m.status=hp.status==='fnt'?m.status:hp.status; }
      if(B.active[m.side]===m) sdDrawHp(B,m.side);
      if(cmd==='-damage'&&!B.fast){ const im=monImg(B,m.side); B.lastHit=im; if(im&&hp&&hp.hp<before){ if(B.gen<=2){ if(!fromOf(a)) fxShake(.5); } else if(!fromOf(a)&&B.lastMoveType) fxFlash(TYC[B.lastMoveType]||'#fff',.3,300); fxBlink(im,2); if(st.sound) blip(150,.08,0,'square',.05); } }
      const from=fromOf(a);
      if(cmd==='-damage'){
        if(!from){ if(!B.fast) await sdWait(500); return; }
        const t={'Stealth Rock':`Pointed stones dug into ${who(B,m)}!`,Spikes:`${who(B,m,true)} was hurt by the spikes!`,psn:`${who(B,m,true)} was hurt by poison!`,tox:`${who(B,m,true)} was hurt by poison!`,brn:`${who(B,m,true)} was hurt by its burn!`,
          Sandstorm:`${who(B,m,true)} is buffeted by the sandstorm!`,Hail:`${who(B,m,true)} is pelted by hail!`,Recoil:`${who(B,m,true)} is damaged by the recoil!`,'Life Orb':`${who(B,m,true)} lost some of its HP!`,confusion:'It hurt itself in its confusion!'}[from];
        return say(B,t||`${who(B,m,true)} was hurt by ${from}!`);
      }
      if(cmd==='-heal'&&from){ const t={Leftovers:`${who(B,m,true)} restored a little HP using its Leftovers!`,'Black Sludge':`${who(B,m,true)} restored a little HP using its Black Sludge!`,drain:`${who(B,m,true)} had its energy drained!`}[from];
        return say(B,t||`${who(B,m,true)} restored HP using its ${from}!`); }
      if(cmd==='-heal') return say(B,`${who(B,m,true)} regained health!`,800);
      return;
    }
    case 'faint': {
      const m=monOf(B,a[1]); m.hp=0; m.status='fnt'; if(B.active[m.side]===m) sdDrawHp(B,m.side);
      const im=monImg(B,m.side);
      sdDrawBalls(B);
      if(B.fast){ $(m.side===B.me?'sdMeMon':'sdFoeMon').innerHTML=''; sdLog(B,`${who(B,m,true)} fainted!`); return; }
      if(im){ cry(monKey(m.species).sid); fxFaint(im).then(()=>{ if(im.isConnected) im.style.visibility='hidden'; }); }
      await say(B,`${who(B,m,true)} fainted!`,1100); return;
    }
    case '-supereffective': if(!B.fast){ fxShake(1.4); fxBlink(monImg(B,sideOf(a[1]||'p1')),4); } return say(B,"It's super effective!",850);
    case '-resisted': return say(B,"It's not very effective…",850);
    case '-immune': return say(B,`It doesn't affect ${who(B,monOf(B,a[1]))}…`);
    case '-crit': if(!B.fast){ await fxFlash('#fff',.9,180); await fxFlash('#fff',.9,180); } return say(B,'A critical hit!',800);
    case '-miss': return say(B,a[2]?`${who(B,monOf(B,a[2]),true)} avoided the attack!`:`${who(B,monOf(B,a[1]),true)}'s attack missed!`);
    case '-fail': return say(B,'But it failed!');
    case '-notarget': return say(B,'But there was no target…');
    case '-ohko': return say(B,"It's a one-hit KO!");
    case '-hitcount': return say(B,`The Pokémon was hit ${a[2]} time${a[2]==='1'?'':'s'}!`);
    case '-status': { const m=monOf(B,a[1]); m.status=a[2]; if(B.active[m.side]===m) sdDrawHp(B,m.side); if(!B.fast) fxStatus(monImg(B,m.side),a[2]); return say(B,`${who(B,m,true)} ${STATUS_TXT[a[2]]||'was afflicted!'}`); }
    case '-curestatus': { const m=monOf(B,a[1]); const s=a[2]; m.status=''; if(B.active[m.side]===m) sdDrawHp(B,m.side);
      if(B.fast) return; return say(B,`${who(B,m,true)} ${s==='slp'?'woke up!':s==='frz'?'thawed out!':'was cured of its '+({par:'paralysis',brn:'burn',psn:'poison',tox:'poison'}[s]||'status')+'!'}`); }
    case '-cureteam': return say(B,'The team was cured of its status problems!');
    case 'cant': { const m=monOf(B,a[1]); const r=effName(a[2]);
      return say(B,`${who(B,m,true)} ${{par:'is paralyzed! It can\'t move!',slp:'is fast asleep.',frz:'is frozen solid!',recharge:'must recharge!',flinch:'flinched and couldn\'t move!',Truant:'is loafing around!',Taunt:`can't use ${a[3]||'that move'} after the taunt!`,Disable:`can't use ${a[3]||'that move'}!`}[r]||'can\'t move!'}`); }
    case '-boost': case '-unboost': { const m=monOf(B,a[1]), n=+a[3], up=cmd==='-boost';
      if(!B.fast&&n>0) fxStat(monImg(B,m.side),up,n);
      if(n===0) return say(B,`${who(B,m,true)}'s ${STAT[a[2]]||a[2]} won't go any ${up?'higher':'lower'}!`);
      return say(B,`${who(B,m,true)}'s ${STAT[a[2]]||a[2]} ${up?(n>=3?'rose drastically':n===2?'rose sharply':'rose'):(n>=3?'severely fell':n===2?'harshly fell':'fell')}!`); }
    case '-clearallboost': return say(B,'All stat changes were eliminated!');
    case '-weather': {
      const w=a[1]; if(a.includes('[upkeep]')){ if(B.weather!==w){ B.weather=w; sdWeather(B,w); } return B.fast?undefined:say(B,WEATHER_UP[w]||'',650); }
      if(w==='none'){ const was=B.weather; B.weather=''; sdWeather(B,''); return was?say(B,{RainDance:'The rain stopped.',SunnyDay:'The harsh sunlight faded.',Sandstorm:'The sandstorm subsided.',Hail:'The hail stopped.'}[was]||'The weather cleared up.'):undefined; }
      B.weather=w; sdWeather(B,w); return say(B,WEATHER[w]||`${w} started!`);
    }
    case '-sidestart': case '-sideend': {
      const side=a[1].slice(0,2), e=effName(a[2]), team=side===B.foe&&B.role!=='spectator'?'the opposing team':side===B.me&&B.role!=='spectator'?'your team':B.names[side]+"'s team";
      if(cmd==='-sidestart') return say(B,{'Stealth Rock':`Pointed stones float in the air around ${team}!`,Spikes:`Spikes were scattered around the feet of ${team}!`,'Toxic Spikes':`Poison spikes were scattered around the feet of ${team}!`,Reflect:`Reflect made ${team} stronger against physical moves!`,'Light Screen':`Light Screen made ${team} stronger against special moves!`,Tailwind:`The Tailwind blew from behind ${team}!`,Safeguard:`${team[0].toUpperCase()+team.slice(1)} cloaked itself in a mystical veil!`}[e]||`${e} started on ${team}'s side!`);
      return say(B,{'Stealth Rock':`The pointed stones disappeared from around ${team}!`,Spikes:`The spikes disappeared from around ${team}!`,'Toxic Spikes':`The poison spikes disappeared from around ${team}!`}[e]||`${team[0].toUpperCase()+team.slice(1)}'s ${e} wore off!`);
    }
    case '-fieldstart': return say(B,effName(a[1])==='Trick Room'?'The dimensions were twisted!':`${effName(a[1])} started!`);
    case '-fieldend': return say(B,effName(a[1])==='Trick Room'?'The twisted dimensions returned to normal!':`${effName(a[1])} ended.`);
    case '-ability': { const m=monOf(B,a[1]); if(B.fast) return; return say(B,`[${who(B,m,true)}'s ${a[2]}]`,800); }
    case '-item': { const m=monOf(B,a[1]); const from=fromOf(a);
      if(a[2]==='Air Balloon') return say(B,`${who(B,m,true)} floats in the air with its Air Balloon!`);
      return say(B,from?`${who(B,m,true)} obtained ${a[2]}! [${from}]`:`${who(B,m,true)}'s ${a[2]} was revealed!`); }
    case '-enditem': { const m=monOf(B,a[1]);
      if(a.includes('[eat]')) return say(B,`${who(B,m,true)} ate its ${a[2]}!`);
      if(a[2]==='Focus Sash') return say(B,`${who(B,m,true)} hung on using its Focus Sash!`);
      if(a[2]==='Air Balloon') return say(B,`${who(B,m,true)}'s Air Balloon popped!`);
      return say(B,`${who(B,m,true)}'s ${a[2]} was used up…`); }
    case '-start': { const m=monOf(B,a[1]), e=effName(a[2]); if(a.includes('[silent]')) return;
      const t={confusion:'became confused!',Substitute:'put in a substitute!','Leech Seed':'was seeded!',Taunt:'fell for the taunt!',Encore:'received an encore!',Disable:'had a move disabled!',Yawn:'grew drowsy!','Focus Energy':'is getting pumped!',Attract:'fell in love!',typechange:'changed its type!',perish3:'will faint in three turns!'}[e];
      if(/^perish\d/.test(e)&&e!=='perish3') return say(B,`${who(B,m,true)}'s perish count fell to ${e.slice(6)}.`);
      return t?say(B,`${who(B,m,true)} ${t}`):undefined; }
    case '-end': { const m=monOf(B,a[1]), e=effName(a[2]); if(a.includes('[silent]')) return;
      const t={confusion:'snapped out of its confusion!',Substitute:"'s substitute faded!",Taunt:"'s taunt wore off!",Encore:"'s encore ended!",Disable:' is no longer disabled!','Leech Seed':' was freed from Leech Seed!'}[e];
      return t?say(B,`${who(B,m,true)}${t.startsWith("'")||t.startsWith(' ')?'':' '}${t}`):undefined; }
    case '-activate': { const m=a[1]?monOf(B,a[1]):null, e=effName(a[2]);
      if(e==='confusion') return say(B,`${who(B,m,true)} is confused!`,800);
      if(e==='Protect'||e==='Detect') return say(B,`${who(B,m,true)} protected itself!`);
      if(e==='Substitute') return say(B,`The substitute took damage for ${who(B,m)}!`);
      if(e==='Endure') return say(B,`${who(B,m,true)} endured the hit!`);
      return; }
    case '-singleturn': { const m=monOf(B,a[1]), e=effName(a[2]); if(e==='Protect'||e==='Detect') return say(B,`${who(B,m,true)} protected itself!`); if(e==='Endure') return say(B,`${who(B,m,true)} braced itself!`); return; }
    case '-prepare': return say(B,`${who(B,monOf(B,a[1]),true)} is getting ready to use ${a[2]}!`,800);
    case '-mustrecharge': return;
    case '-message': return say(B,a[1]);
    case 'message': return say(B,a[1]);
    case 'win': B.winner=a[1]; return say(B,`${a[1]} won the battle!`,1300);
    case 'tie': return say(B,'The battle ended in a tie!',1300);
    case 'error': if(!B.fast&&!B.replay){ const t=a[1]||''; if(/Invalid choice|Can't/.test(t)) flash(t.replace(/^\[[^\]]*\]\s*/,'')); } return;
    default: return;
  }
}

/* ---------------- battle: bottom screen ---------------- */
function sdBot(html){ const b=$('sdBot'); b.innerHTML=html; return b; }
/* ---------------- battle: bottom screen (Black 2 touch menu) ---------------- */
const b2hp=p=>p<=20?'b2-low':p<=50?'b2-mid':'';
const b2ty=t=>`<span class="b2-ty" style="--t:${TYC[t]||'#888'}">${esc(String(t||'???').toUpperCase())}</span>`;
const b2btn=(id,cls,label,dis)=>`<button class="b2-cb b2-hexend ${cls}" type="button" id="${id}" ${dis?'disabled':''}><span class="b2-f"><span class="b2-lbl">${label}</span></span></button>`;
const b2back=id=>`<button class="b2-cb b2-back" type="button" id="${id}" aria-label="Back"><span class="b2-f"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7H15a5 5 0 0 1 0 10H8"/><path d="M12 3 8 7l4 4"/></svg></span></button>`;
function b2balls(B,top){
  let arr;
  if(B.request&&B.request.side&&B.role!=='spectator') arr=B.request.side.pokemon.map(p=>/fnt$/.test(p.condition));
  else { arr=[...B.seen[B.me].values()].map(m=>m.status==='fnt'); while(arr.length<B.size[B.me]) arr.push(false); }
  return `<div class="b2-balls" style="top:${top}" aria-label="${arr.filter(f=>!f).length} of ${arr.length} can battle">${arr.map(f=>`<i class="${f?'b2-f':''}"></i>`).join('')}</div>`;
}
const SD_LOGBTN='<button class="b2-cb b2-tl" type="button" data-log aria-label="Battle log"><span class="b2-f"><span class="b2-lbl">LOG</span></span></button>';
const sdMusicBtn=()=>`<button class="b2-cb b2-tl b2-tr" type="button" data-music aria-pressed="${SDM.on()}" aria-label="Music"><span class="b2-f"><span class="b2-lbl">♪ ${SDM.on()?'ON':'OFF'}</span></span></button>`;
function sdBot2(html,log){ const b=sdBot(`<div class="b2-view">${html}${log?SD_LOGBTN+sdMusicBtn():''}</div>`); const l=b.querySelector('[data-log]'); if(l) l.onclick=()=>{ SFX.tab(); sdOpenLog(); };
  const mu=b.querySelector('[data-music]'); if(mu) mu.onclick=()=>{ SDM.toggle(); mu.setAttribute('aria-pressed',String(SDM.on())); mu.querySelector('.b2-lbl').textContent='♪ '+(SDM.on()?'ON':'OFF'); }; return b; }
function sdOpenLog(){
  const B=SD.battle, view=$('sdBot').querySelector('.b2-view'); if(!B||!view||view.querySelector('.b2-logp')) return;
  const items=B.log.slice(-400).map(x=>`<li class="${x.c}">${esc(x.t)}</li>`).join('')||'<li class="sys">Nothing has happened yet.</li>';
  view.insertAdjacentHTML('beforeend',`<div class="b2-logp" role="dialog" aria-label="Battle log"><header><span>BATTLE LOG</span><span>${B.turn?'TURN '+B.turn:''}</span></header><ol>${items}</ol><footer><button type="button">CLOSE</button></footer></div>`);
  const p=view.querySelector('.b2-logp'), ol=p.querySelector('ol'); ol.scrollTop=ol.scrollHeight;
  const btn=p.querySelector('footer button'); btn.onclick=()=>{ SFX.tab(); p.remove(); }; btn.focus();
}
function sdBotWait(text){
  const B=SD.battle; if(!B) return;
  if(B.replay) return sdBotReplay(B);
  if(B.role==='spectator') return sdBotSpectator(B);
  const opp=B.names[B.foe], waitingOpp=B.chosen&&B.oppChoosing||!B.pending&&!B.chosen&&B.request;
  const ff=B.chosen&&B.oppChoosing&&!B.busy&&!B.result;
  sdBot2(`<div class="b2-cb b2-panel b2-wait${ff?' b2-short':''}"><span class="b2-f"><span class="b2-wball" aria-hidden="true"></span><span>${esc(text||(waitingOpp?`Waiting for ${opp}`:''))}<span class="b2-dots"></span></span>${B.chosen&&B.lastChoice?`<small style="font-size:.6em;color:#aeb4c2">You chose ${esc(B.lastChoice)}</small>`:''}</span></div>
    ${b2balls(B,ff?'69%':'84%')}${ff?b2btn('sdFf2','b2-run b2-low2','FORFEIT'):''}`,true);
  const f=$('sdFf2'); if(f) f.onclick=()=>sdForfeit(f);
}
function sdBotSpectator(B){
  sdBot2(`<div class="b2-cb b2-panel b2-wait b2-short"><span class="b2-f"><span class="b2-lbl" style="color:var(--gold);font-size:1.1em">WATCHING</span><span>${esc(B.names.p1)} vs ${esc(B.names.p2)}</span><small style="font-size:.6em;color:#aeb4c2">${esc(sdFmtName(B.format))}${B.turn?` · turn ${B.turn}`:''}</small></span></div>
    ${b2btn('sdLeave','b2-run b2-low2','◀ LOBBY')}`,true);
  $('sdLeave').onclick=()=>{ if(SD.conn) SD.conn.invoke('LeaveBattle',B.id).catch(()=>{}); SD.battle=null; sdShow('lobby'); sdLoadLobbyData(); };
}
function sdBotReplay(B){
  sdBot2(`<div class="b2-cb b2-panel b2-wait b2-short"><span class="b2-f"><span class="b2-lbl" style="color:var(--gold);font-size:1.1em">REPLAY</span><span>${esc(B.names.p1)} vs ${esc(B.names.p2)}</span><small style="font-size:.6em;color:#aeb4c2">${esc(sdFmtName(B.format))}${B.turn?` · turn ${B.turn}`:''}</small></span></div>
    <button class="b2-cb b2-hexend b2-two b2-a" type="button" id="sdSkip"><span class="b2-f"><span class="b2-lbl">SKIP TO END</span></span></button>
    <button class="b2-cb b2-hexend b2-two b2-b" type="button" id="sdLeave"><span class="b2-f"><span class="b2-lbl">◀ LOBBY</span></span></button>`,true);
  $('sdSkip').onclick=()=>{ B.fast=true; };
  $('sdLeave').onclick=()=>{ SD.battle=null; sdShow('lobby'); sdLoadLobbyData(); };
}
function sdShowControls(){
  const B=SD.battle; if(!B||!B.request||!B.pending) return;
  const R=B.request, act=R.active&&R.active[0], cur=R.side.pokemon.find(p=>p.active);
  if(R.forceSwitch){ sdSay('Choose a Pokémon to send in.'); return sdBotParty(true); }
  sdSay(`What will ${cur?cur.ident.replace(/^p\d: /,''):'your Pokémon'} do?`);
  if(B.view==='moves') return sdBotMoves();
  if(B.view==='party') return sdBotParty(false);
  const trapped=act&&act.trapped;
  sdBot2(`<div class="b2-sub b2-top">TURN ${B.turn||1} · VS ${esc(String(B.names[B.foe]).toUpperCase())}</div>
    <button class="b2-fbadge" type="button" id="sdFight" aria-label="Fight"><span class="b2-f"><i class="b2-l" aria-hidden="true"></i><b>FIGHT!</b><i class="b2-r" aria-hidden="true"></i></span></button>
    ${b2balls(B,'56%')}
    ${b2btn('sdInfo','b2-bag','INFO')}${b2btn('sdFf','b2-run','FORFEIT')}${b2btn('sdParty','b2-pkm','POKÉMON',trapped)}`,true);
  $('sdFight').onclick=()=>{ SFX.tab(); B.view='moves'; sdBotMoves(); };
  $('sdParty').onclick=()=>{ SFX.tab(); B.view='party'; sdBotParty(false); };
  $('sdInfo').onclick=()=>{ SFX.tab(); sdBotInfo(); };
  $('sdFf').onclick=()=>sdForfeit($('sdFf'));
}
function effTag(m){ if(m.category==='Status'||m.eff===undefined||m.eff===1) return ''; return m.eff===0?'<span class="b2-ef b2-no">NO EFFECT</span>':m.eff>1?'<span class="b2-ef b2-se">SUPER EFF.</span>':'<span class="b2-ef b2-nv">NOT VERY</span>'; }
function sdBotMoves(){
  const B=SD.battle, act=B.request.active[0];
  const b=sdBot2(act.moves.map((m,i)=>{ const c=TYC[m.type]||'#888', out=m.pp!==undefined&&m.maxpp&&m.pp<=0;
    return `<button class="b2-cb b2-mv b2-p${i+1}" type="button" style="--t:${c}" data-i="${i+1}" ${m.disabled||out&&act.moves.length>1?'disabled':''} title="${esc((m.category||'')+(m.basePower?' · power '+m.basePower:'')+(m.accuracy?' · acc. '+m.accuracy+'%':'')+(m.desc?' · '+m.desc:''))}"><span class="b2-f"><span class="b2-nm">${esc(m.move)}</span><span class="b2-row">${b2ty(m.type)}${m.maxpp?`<span>PP ${m.pp}/${m.maxpp}</span>`:''}${effTag(m)}</span></span></button>`; }).join('')
    +b2balls(B,'83%')+b2back('sdMvBack'));
  b.querySelectorAll('.b2-mv').forEach(x=>x.onclick=()=>{ B.lastChoice=act.moves[+x.dataset.i-1].move; sdChoose('move '+x.dataset.i); });
  $('sdMvBack').onclick=()=>{ SFX.tab(); B.view='cmd'; sdShowControls(); };
}
function sdBotParty(forced){
  const B=SD.battle, mons=B.request.side.pokemon, act=mons.find(p=>p.active);
  const fainted=forced&&act&&/fnt/.test(act.condition)?act.ident.replace(/^p\d: /,'')+' fainted! ':'';
  const b=sdBot2(mons.map((p,i)=>{ const d=parseDetails(p.details), hp=parseHP(p.condition), dead=hp.status==='fnt', cur=p.active&&!forced, P=dead?0:Math.round(hp.hp/hp.max*100);
      return `<button class="b2-cb b2-pt b2-q${i+1}${cur?' b2-cur':''}${dead?' b2-fnt':''}" type="button" data-i="${i}" ${dead?'disabled':''} aria-label="${esc(d.species)}, ${dead?'fainted':P+'% HP'}${cur?', in battle':''}"><span class="b2-f"><img alt="" ${chainAttr(iconChain(d.species))}><span class="b2-nm">${esc(p.ident.replace(/^p\d: /,''))} <small>Lv${d.level}</small></span><span class="b2-hpr">HP<span class="b2-track"><i class="${b2hp(P)}" style="width:${P}%"></i></span><span>${cur?'<span class="b2-st">IN BATTLE</span>':dead?'FAINTED':hp.hp+'/'+hp.max}</span></span></span></button>`; }).join('')
    +`<div class="b2-title${forced?' b2-forced':''}">${forced?esc(fainted)+'Choose who comes in next.':'Choose a Pokémon.'}</div>`+(forced?'':b2back('sdPBack')));
  wireChains(b);
  b.querySelectorAll('.b2-pt:not([disabled])').forEach(x=>x.onclick=()=>{ SFX.tab(); sdBotSwitch(+x.dataset.i,forced); });
  const bk=$('sdPBack'); if(bk) bk.onclick=()=>{ SFX.tab(); B.view='cmd'; sdShowControls(); };
}
function sdBotSwitch(i,forced){
  const B=SD.battle, p=B.request.side.pokemon[i], d=parseDetails(p.details), hp=parseHP(p.condition), P=Math.round(hp.hp/hp.max*100), inBattle=p.active&&!forced;
  const g=d.gender==='M'?' ♂':d.gender==='F'?' ♀':'';
  const b=sdBot2(`<div class="b2-cb b2-card"><span class="b2-f"><img alt="" ${chainAttr(staticChain(d.species,d.shiny))}><b>${esc(p.ident.replace(/^p\d: /,''))} <span style="font-size:.7em">${g} Lv${d.level}</span></b><span class="b2-types">${(p.types||[]).map(b2ty).join('')}</span><span class="b2-hpr">HP<span class="b2-track"><i class="${b2hp(P)}" style="width:${P}%"></i></span>${hp.hp}/${hp.max}</span><small>${esc([p.abilityName,p.itemName||p.item].filter(Boolean).join(' · '))}<br>${(p.moveNames||p.moves||[]).map(esc).join(' · ')}</small></span></div>
    ${b2btn('sdDoSw','b2-shift',inBattle?'IN BATTLE':'SHIFT',inBattle)}${b2back('sdSwBack')}`);
  wireChains(b);
  $('sdDoSw').onclick=()=>{ B.lastChoice='to switch to '+p.ident.replace(/^p\d: /,''); sdChoose('switch '+(i+1)); };
  $('sdSwBack').onclick=()=>{ SFX.tab(); sdBotParty(forced); };
}
function sdBotInfo(){
  const B=SD.battle, R=B.request, me=R.side.pokemon.find(p=>p.active), foe=B.active[B.foe];
  const row=(k,v)=>`<span class="b2-r"><span class="b2-k">${k}</span>${v}</span>`;
  sdBot2(`<div class="b2-cb b2-panel"><span class="b2-f">
    ${foe?row('FOE',`${esc(foe.name)} <small>Lv${foe.level}</small> ${(R.foe&&R.foe.types||[]).map(b2ty).join('')}`)+row('FOE HP',`<span class="b2-track" style="width:7em;flex:none"><i class="${b2hp(hpPct(foe))}" style="width:${hpPct(foe)}%"></i></span> ${hpPct(foe)}%${foe.status&&foe.status!=='fnt'?' · '+foe.status.toUpperCase():''}`):''}
    ${me?row('YOU',`${esc(me.ident.replace(/^p\d: /,''))} ${(me.types||[]).map(b2ty).join('')}`)+row('ABILITY',esc(me.abilityName||me.baseAbility||'—'))+row('ITEM',esc(me.itemName||me.item||'—'))+(me.stats?row('STATS',`<small>Atk ${me.stats.atk} · Def ${me.stats.def} · SpA ${me.stats.spa} · SpD ${me.stats.spd} · Spe ${me.stats.spe}</small>`):''):''}
  </span></div>${b2back('sdInfoBack')}`);
  $('sdInfoBack').onclick=()=>{ SFX.tab(); B.view='cmd'; sdShowControls(); };
}
function sdTryShowRequest(){
  const B=SD.battle; if(!B||B.busy||B.queue.length||B.result||B.replay) return;
  if(B.role==='spectator'){ sdBotSpectator(B); return; }
  if(!B.request) return;
  sdDrawBalls(B);
  if(!B.pending){ sdBotWait(); return; }
  if(B.reqShown&&B.chosen) return;
  B.reqShown=true; B.view=B.request.forceSwitch?'party':'cmd'; sdShowControls();
}
async function sdChoose(choice){
  const B=SD.battle; if(!B||!B.pending||B.chosen) return;
  B.chosen=true; SFX.tab(); sdBotWait();
  const err=await sdCall('Choose',B.id,choice);
  if(err&&typeof err==='string'){ SFX.err(); flash(err); B.chosen=false; sdShowControls(); }
}
function sdForfeit(btn){
  const B=SD.battle; if(!B) return;
  if(SD.forfeitArm&&Date.now()-SD.forfeitArm<3000){ SD.forfeitArm=0; sdCall('Forfeit',B.id); sdSay('You forfeited…'); return; }
  SD.forfeitArm=Date.now(); SFX.err(); sdSay('Forfeit? Press FORFEIT again to confirm.'); if(btn){ const l=btn.querySelector('.b2-lbl')||btn; l.textContent='SURE?'; }
}

/* ---------------- draft: pick six from a shared pool, then the lead ----------------
   The top screen shows both teams and the set of the highlighted Pokémon; the bottom screen is the pool. */
function sdDraftSide(B){ return B.role==='p1'?1:B.role==='p2'?2:0; }
function sdDraftLeft(B){ return Math.max(0,Math.ceil((B.draft.deadlineMs-(Date.now()-B.draft.at))/1000)); }
function sdDraftTypes(t){ return `<span class="dr-types">${t.map(x=>`<span class="dr-type" style="background:${TYC[x]||'#888'}">${esc(x.toUpperCase())}</span>`).join('')}</span>`; }
function sdDraftDots(t){ return `<span class="dr-dots">${t.map(x=>`<i style="background:${TYC[x]||'#888'}"></i>`).join('')}</span>`; }
function sdDraftDetail(p,tag,c){
  if(!p) return `<div class="dr-det dr-empty"><span>TAP A POKÉMON BELOW TO SEE ITS SET</span></div>`;
  const m={species:p.species,shiny:p.shiny,gender:p.gender};
  const rows=[p.ability?`<dt>ABILITY</dt><dd>${esc(p.ability)}</dd>`:'',p.item?`<dt>ITEM</dt><dd>${esc(p.item)}</dd>`:''].join('');
  return `<div class="dr-det"><div class="dr-stage">${tag?`<span class="dr-tag" style="--c:${c}">${tag}</span>`:''}<img class="dr-big" alt="${esc(p.species)}" ${chainAttr(battleChain(m,false))}></div>
    <div class="dr-info"><div class="dr-nm"><span>${esc(p.species)}${p.shiny?' <small>★</small>':''}</span><small>Lv${p.level}</small></div>${sdDraftTypes(p.types)}
    ${rows?`<dl class="dr-kv">${rows}</dl>`:''}
    <div class="dr-moves">${p.moves.map(mv=>`<span class="dr-mv" style="--t:${TYC[mv.type]||'#888'}">${esc(mv.name)}</span>`).join('')}</div></div></div>`;
}
function sdDraftTeam(B,side,label,cls,leadIdx){
  const D=B.draft, team=D.picks.filter(i=>D.owner[i]===side); let slots='';
  for(let k=0;k<6;k++){ const i=team[k]; slots+=`<span class="dr-slot${i!=null&&i===leadIdx?' dr-lead':''}">${i!=null?`<img alt="" ${chainAttr(iconChain(D.pool[i].species,D.pool[i].num))}>`:''}</span>`; }
  return `<div class="dr-team ${cls}"><div class="dr-tl"><span>${esc(String(label).toUpperCase())}</span><span>${team.length}/6</span></div><div class="dr-slots">${slots}</div></div>`;
}
function sdDraftCard(B,i,cls,plain){
  const p=B.draft.pool[i], o=plain?0:B.draft.owner[i], me=sdDraftSide(B);
  const own=o?(o===me?'YOU':String(B.names[o===1?'p1':'p2']).toUpperCase()):'';
  return `<button class="dr-pc${o?(o===me||(!me&&o===1)?' dr-mine':' dr-theirs'):''}${SD.draftSel===i?' dr-sel':''}${cls||''}" type="button" data-i="${i}" aria-label="${esc(p.species)}${own?', taken by '+esc(own):''}">
    <span class="dr-f"><img alt="" ${chainAttr(staticChain(p.species,p.shiny))}><span><span class="dr-n">${esc(p.species)}</span>${sdDraftDots(p.types)}</span></span>${own?`<span class="dr-own">${esc(own.length>7?own.slice(0,6)+'…':own)}</span>`:''}</button>`;
}
function sdDraftRender(){
  const B=SD.battle; if(!B||!B.draft) return; const D=B.draft, me=sdDraftSide(B), spect=!me;
  const myKey=me===2?'p2':'p1', foeKey=me===2?'p1':'p2', meName=spect?B.names.p1:'You', foeName=B.names[foeKey];
  let top=$('sdScr').querySelector('.dr-top'); if(!top){ top=document.createElement('div'); top.className='dr-top'; $('sdScr').appendChild(top); }
  if(D.phase==='loading'){
    top.innerHTML=`<div class="dr-head"><span>DRAFT</span><span>SHUFFLING THE POOL…</span><span></span></div><div class="dr-det dr-empty"><span class="s-ball" aria-hidden="true"></span></div>`;
    sdBot2(`<div class="b2-cb b2-panel b2-wait b2-short"><span class="b2-f"><span class="b2-lbl" style="color:var(--gold)">DRAFT</span><span>${esc(sdFmtName(B.format))}</span></span></div>`); return;
  }
  const pick=D.pick, mine=!spect&&D.phase==='pick'&&D.turn===myKey;
  const who=D.phase==='pick'?(mine?'<b class="dr-me">YOUR PICK</b>':`<b class="dr-foe">${esc(String(B.names[D.turn]).toUpperCase())} IS PICKING…</b>`):(D.lead!=null?`<b>WAITING FOR ${esc(String(foeName).toUpperCase())}…</b>`:'<b class="dr-me">CHOOSE YOUR LEAD</b>');
  const timer=`<span class="dr-tmr" id="drTmr">⏱ ${sdDraftLeft(B)}s</span>`;
  const shown=SD.draftSel!=null?SD.draftSel:(D.phase==='lead'&&D.lead!=null?D.lead:D.picks.length?D.picks[D.picks.length-1]:null);
  const so=shown!=null?D.owner[shown]:0, tag=D.phase==='lead'&&shown!=null&&so===me?(shown===D.lead?'LEAD':'YOUR TEAM'):so?(so===me?'YOURS':String(B.names[so===1?'p1':'p2']).toUpperCase()):'';
  const tagC=tag==='LEAD'?'var(--gold)':so===me||(!me&&so===1)?'var(--dr-me)':'var(--dr-foe)';
  const myIdx=me||1, foeIdx=myIdx===1?2:1;
  top.innerHTML=`<div class="dr-head"><span>${D.phase==='pick'?`DRAFT · PICK ${Math.min(pick+1,12)}/12`:'TEAM PREVIEW'}</span>${who}${timer}</div>
    <div class="dr-teams">${sdDraftTeam(B,myIdx,spect?B.names.p1:meName,'dr-tme',D.phase==='lead'?D.lead:null)}${sdDraftTeam(B,foeIdx,spect?B.names.p2:foeName,'dr-tfoe',null)}</div>
    ${D.phase==='pick'?`<div class="dr-order"><span>ORDER</span>${D.order.map((w,k)=>`<i class="${k<pick?'dr-done':k===pick?'dr-now':''} ${(w==='p1')===(myIdx===1)?'dr-ome':'dr-ofoe'}"></i>`).join('')}</div>`
      :`<div class="dr-order"><span>${D.leadReady[foeIdx-1]?esc(String(foeName).toUpperCase())+' HAS CHOSEN · ':''}YOU SEE THEIR LEAD WHEN THE BATTLE STARTS</span></div>`}
    ${sdDraftDetail(shown!=null?D.pool[shown]:null,tag,tagC)}`;
  wireChains(top);
  const big=top.querySelector('.dr-big'); if(big) big.addEventListener('load',()=>big.style.setProperty('--nw',Math.min(80,big.naturalWidth||64)),{once:true});
  if(D.phase==='pick'){
    const canPick=mine&&SD.draftSel!=null&&!D.owner[SD.draftSel];
    const sub=spect?'WATCHING THE DRAFT':!mine?`WAITING FOR ${esc(String(B.names[D.turn]).toUpperCase())}`:canPick?`PICK ${esc(D.pool[SD.draftSel].species.toUpperCase())}?`:'TAP A POKÉMON, THEN PICK!';
    sdBot(`<div class="b2-view dr-bot"><div class="dr-pool">${D.pool.map((p,i)=>sdDraftCard(B,i)).join('')}</div><div class="dr-sub">${sub}</div>
      ${spect?'':`<button class="dr-pick" type="button" id="drPick" ${canPick?'':'disabled'}><span class="dr-pf"><b>PICK!</b></span></button><button class="dr-ff" type="button" id="drFf"><span class="dr-f">FORFEIT</span></button>`}</div>`);
  } else {
    const team=D.picks.filter(i=>D.owner[i]===myIdx);
    sdBot(`<div class="b2-view dr-bot"><div class="dr-ttl">${spect?'BOTH TRAINERS ARE CHOOSING':D.lead!=null?'LEAD CHOSEN · WAITING':'WHO GOES FIRST?'}</div>
      <div class="dr-leads">${(spect?[]:team).map(i=>sdDraftCard(B,i,D.lead===i?' dr-sel dr-chosen':'',true)).join('')}</div>
      ${spect?'':`<button class="dr-pick dr-go" type="button" id="drPick" ${SD.draftSel!=null&&team.includes(SD.draftSel)&&D.lead==null?'':'disabled'}><span class="dr-pf"><b>${D.lead!=null?'READY':'BATTLE!'}</b></span></button><button class="dr-ff" type="button" id="drFf"><span class="dr-f">FORFEIT</span></button>`}</div>`);
  }
  const bot=$('sdBot'); wireChains(bot);
  bot.querySelectorAll('.dr-pc').forEach(b=>b.onclick=()=>{ SD.draftSel=+b.dataset.i; SFX.move(); sdDraftRender(); });
  const pk=$('drPick'); if(pk) pk.onclick=async()=>{
    const i=SD.draftSel; if(i==null) return; pk.disabled=true;
    const err=await sdCall(D.phase==='pick'?'DraftPick':'DraftLead',B.id,i);
    if(err&&typeof err==='string'){ SFX.err(); flash(err); pk.disabled=false; } else { SFX.mark(); if(D.phase==='pick') SD.draftSel=null; }
  };
  const ff=$('drFf'); if(ff) ff.onclick=()=>{ if(SD.forfeitArm&&Date.now()-SD.forfeitArm<3000){ SD.forfeitArm=0; sdCall('Forfeit',B.id); return; } SD.forfeitArm=Date.now(); SFX.err(); ff.querySelector('.dr-f').textContent='SURE?'; setTimeout(()=>{ if(ff.isConnected) ff.querySelector('.dr-f').textContent='FORFEIT'; },3000); };
}
setInterval(()=>{ const B=SD.battle, t=$('drTmr'); if(B&&B.draft&&t){ const s=sdDraftLeft(B); t.textContent='⏱ '+s+'s'; t.classList.toggle('dr-low',s<=5); } },500);

/* ---------------- result ---------------- */
function sdShowResult(B){
  SDM.stop();
  clearInterval(SD.timerInt); sdTimer();
  const R=B.result, me=sdMe();
  const mySide=B.role==='spectator'||B.replay?null:B.me;
  const winSide=R.winner===1?'p1':R.winner===2?'p2':null;
  let banner, cls='';
  if(!winSide) banner=R.reason==='aborted'?'BATTLE STOPPED':'DRAW';
  else if(mySide) { banner=winSide===mySide?'YOU WIN!':'YOU LOSE…'; if(winSide!==mySide) cls=' s-lose'; }
  else banner=`${String(B.names[winSide]).toUpperCase()} WINS!`;
  if(mySide&&winSide===mySide) SFX.mark(); else if(mySide) SFX.unmark();
  const left=winSide?R.left[winSide==='p1'?0:1]:0;
  const myRec=mySide&&R.records&&R.records[mySide];
  const why=R.reason==='forfeit'?' · by forfeit':R.reason==='timeout'?' · on time':R.reason==='aborted'?' · the simulator restarted':'';
  const oppName=mySide?B.names[mySide==='p1'?'p2':'p1']:null;
  const stats=mySide?`vs <b>${esc(oppName)}</b> · ${R.turns} turns${winSide?` · <b>${left}</b> Pokémon left`:''}${!R.cpu&&myRec&&myRec.streak>1?` · streak <b>${myRec.streak} ★</b>`:''}${why}`
    :`<b>${esc(B.names.p1)}</b> vs <b>${esc(B.names.p2)}</b> · ${R.turns} turns${why}`;
  const el=$('sdResult'); el.innerHTML=`<div class="s-result"><div class="s-banner${cls}">${banner}</div><div class="s-stats">${stats}</div><div class="s-rgrid"></div><div class="s-rbtns"></div></div>`;
  const grid=el.querySelector('.s-rgrid');
  ['p1','p2'].map(s=>s).sort((x,y)=>mySide?(x===mySide?-1:1):0).forEach(side=>{
    const pl=R.players.find(p=>p.side===side)||{name:B.names[side]}, idx=side==='p1'?0:1;
    let t=pl.cpu?{...CPU_CARD,name:pl.name}:(trainer(pl.userId)||{id:pl.userId,name:pl.name,wins:0,losses:0,streak:0,livingDex:0,partner:25});
    const rec=R.records&&R.records[side];
    let recordText=null;
    if(rec&&!pl.cpu&&R.cpu) recordText=`<span class="s-dr">vs CPU</span> <span class="s-w">${rec.cpuWins} W</span> · <span class="s-l">${rec.cpuLosses} L</span>`;
    if(rec&&!pl.cpu){
      t={...t,wins:rec.wins,losses:rec.losses,streak:rec.streak,badges:rec.badges};
      if(!R.cpu&&winSide) recordText=winSide===side?`<span class="s-w">${rec.wins-1} → ${rec.wins} W</span> · <span class="s-l">${rec.losses} L</span>`:`<span class="s-w">${rec.wins} W</span> · <span class="s-l">${rec.losses-1} → ${rec.losses} L</span>`;
    }
    if(pl.userId===me) t={...t,livingDex:(st.caught['home|normal']||[]).length};
    const col=document.createElement('div'); col.className='s-rcol';
    const frame=document.createElement('div'); frame.className='s-frame';
    frame.appendChild(cardEl(t,{crown:winSide===side,gray:!!winSide&&winSide!==side,label:pl.userId===me?'YOU':pl.cpu?'CPU':'TRAINER',lit:true,recordText,balls:((R.teams&&R.teams[idx])||[]).map(p=>p.fainted),foot:`${R.left[idx]} OF ${(R.teams&&R.teams[idx]||[]).length||6} LEFT`}));
    col.appendChild(frame);
    const team=(R.teams&&R.teams[idx])||[];
    const ic=document.createElement('div'); ic.className='s-icons'; ic.setAttribute('role','list'); ic.setAttribute('aria-label',`${pl.name}'s team`);
    ic.innerHTML=team.map(p=>`<span role="listitem" class="${p.fainted?'s-fnt':''}" title="${esc(p.species)} · Lv${p.level}${p.fainted?' · fainted':''}"><img alt="${esc(p.species)}${p.fainted?' (fainted)':''}" ${chainAttr(iconChain(p.species,p.num))}></span>`).join('')||'<span class="s-unk"></span>'.repeat(6);
    wireChains(ic); col.appendChild(ic); grid.appendChild(col);
  });
  const btns=el.querySelector('.s-rbtns'), add=(label,fn,red)=>{ const b=document.createElement('button'); b.type='button'; b.className='s-btn'+(red?' s-red':''); b.textContent=label; b.onclick=fn; btns.appendChild(b); };
  if(mySide&&!B.replay){
    const opp=R.players.find(p=>p.side!==mySide);
    add('⚔ REMATCH',async()=>{ if(opp.cpu){ sdSetFormat(R.format); await sdStartCpu(); } else { const err=await sdCall('Challenge',opp.userId,R.format); if(typeof err==='string'){ SFX.err(); flash(err); } else { flash(`Rematch sent to ${opp.name}`); SD.battle=null; sdShow('lobby'); sdLoadLobbyData(); } } },true);
  }
  add('◀ BACK TO LOBBY',()=>{ SD.battle=null; sdShow('lobby'); sdLoadLobbyData(); });
  add('▶ WATCH REPLAY',()=>sdReplay(R.battleId));
  SD.lastResult=R; sdShow('result'); window.scrollTo(0,0); sdLoadLobbyData();
}

/* ---------------- replay ---------------- */
async function sdReplay(id){
  let row; try{ const r=await api('GET','/api/showdown/battles/'+encodeURIComponent(id)); if(!r.ok) throw 0; row=await r.json(); }catch(_){ SFX.err(); flash('Could not load that replay'); return; }
  const me=sdMe(), role=row.p2UserId===me?'p2':'p1';
  const players=[{side:'p1',userId:row.p1UserId,name:row.p1Name,cpu:false},{side:'p2',userId:row.p2UserId,name:row.p2Name,cpu:!!row.cpu&&row.p2UserId==null}];
  const B=newBattle(row.id,'spectator',row.format,row.background,players,true);
  if(role==='p2'){ B.me='p2'; B.foe='p1'; }
  B.result={battleId:row.id,format:row.format,winner:row.winner,reason:row.reason,turns:row.turns,cpu:!!row.cpu,players,left:[row.p1Left,row.p2Left],teams:row.teams,records:null};
  SD.battle=B; if(!SD.view) sdOpen(); sdSetupScreen(B); sdShow('battle'); sdBotReplay(B);
  B.queue.push(...String(row.log||'').split('\n')); B.shownResult=false; sdPump();
}
