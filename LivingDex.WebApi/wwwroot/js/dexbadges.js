/* ---------- DEX BADGES: earned by filling the boxes ----------
   Worked out from the progress (Pokémon HOME), so existing boxes count straight away.
   st.dexb = { _init: when badges were first worked out, badgeId: first-earned timestamp } travels with the synced progress; a badge stays once earned. */
const DEXB_HOME=()=>GAMES.find(g=>g.k==='home');
const dexbKeys=(v,keys)=>{ const H=DEXB_HOME(), c=cset(H,v); return keys.filter(k=>c.has(k)).map(k=>slotKey(H,v)+'|'+k); };
const dexbIds=(a,b)=>ALL_IDS.filter(id=>id>=a&&id<=b).map(id=>'s:'+id);
const dexbForm=sid=>['s:'+sid,...(FORMS.get(sid)||[]).map(f=>'f:'+f.key)];
// each badge: id, group, name, glyph, colour, what it asks, basis, need, got() → det keys that count
const DEXB=[
  ...[['kanto','Kanto',1,151,'I','#ef3d4f'],['johto','Johto',152,251,'II','#f2c40c'],['hoenn','Hoenn',252,386,'III','#2fbfa5'],['sinnoh','Sinnoh',387,493,'IV','#9d7ff0'],
      ['unova','Unova',494,649,'V','#b8c0d4'],['kalos','Kalos',650,721,'VI','#4a8cf0'],['alola','Alola',722,809,'VII','#f59e3b'],['galar','Galar',810,898,'VIII','#e0569a'],
      ['hisui','Hisui',899,905,'H','#b98a5c'],['paldea','Paldea',906,1025,'IX','#c0396b']]
    .map(([id,n,a,b,gl,c])=>({id,grp:'REGIONS',name:n+' Complete',gl,c,how:`Catch all ${b-a+1} ${n} Pokémon (#${String(a).padStart(3,'0')}–${b})`,basis:'HOME · Normal',need:b-a+1,all:true,got:()=>dexbKeys('normal',dexbIds(a,b))})),
  ...[[100,'#7ad3ff'],[250,'#5fb8ff'],[500,'#4a8cf0']].map(([n,c])=>({id:'m'+n,grp:'MILESTONES',name:n+' Caught',gl:String(n),c,how:`Mark ${n} Pokémon`,basis:'HOME · Normal',need:n,got:()=>dexbKeys('normal',dexbIds(1,1025))})),
  {id:'m1025',grp:'MILESTONES',name:'Living Dex',gl:'1025',c:'#ffd23f',how:'Complete the National Living Dex: all 1025',basis:'HOME · Normal',need:1025,all:true,got:()=>dexbKeys('normal',dexbIds(1,1025))},
  ...[[1,'First Shiny','#ffe066'],[25,'25 Shinies','#ffc94a'],[100,'100 Shinies','#ff9f43']].map(([n,name,c])=>({id:'s'+n,grp:'SHINY',name,gl:'★',c,how:n===1?'Mark your first shiny':`Mark ${n} shinies`,basis:'HOME · Shiny',need:n,got:()=>dexbKeys('shiny',dexbIds(1,1025))})),
  ...[[201,'unown','All Unown','U','#5fd38a','All 28 Unown: every letter, ! and ?'],[666,'vivillon','All Vivillon','V','#3fc7a0','All 20 Vivillon patterns'],
      [869,'alcremie','All Alcremie','A','#f59ac2','All 63 Alcremie (9 creams × 7 sweets)'],[676,'furfrou','All Furfrou','F','#78c8c8','Furfrou in all 10 looks (natural + 9 trims)']]
    .map(([sid,id,name,gl,c,how])=>({id,grp:'FORMS',name,gl,c,how,basis:'HOME · Forms',need:dexbForm(sid).length,all:true,got:()=>dexbKeys('forms',dexbForm(sid))})),
  {id:'gender',grp:'SPECIAL',name:'Gender Gap',gl:'♂♀',c:'#f08030',how:'Both versions of every Pokémon with a visible gender difference',basis:'HOME · Genders',need:GDIFF.size,all:true,
    got:()=>{ const H=DEXB_HOME(), c=cset(H,'gender'); return [...GDIFF].filter(id=>c.has('s:'+id)&&c.has('g:'+id)).map(id=>slotKey(H,'gender')+'|g:'+id); }},
  {id:'game',grp:'SPECIAL',name:'Game Clear',gl:'✓',c:'#e64a4e',how:'Complete any game’s Pokédex (Normal)',basis:'Any game',need:1,
    got:()=>PLAY.filter(g=>g.k!=='home').filter(g=>{ const c=cset(g,'normal'), L=entries(g,'all','normal'); return L.length&&L.every(e=>c.has(e.key)); }).map(g=>slotKey(g,'normal'))},
  {id:'roots',grp:'SPECIAL',name:'Back to the Roots',gl:'⌂',c:'#a0a0c0',how:'50 Pokémon with an OT game from their own generation',basis:'HOME · Origin',need:50,
    got:()=>{ const H=DEXB_HOME(), c=cset(H,'origin'); return ALL_IDS.filter(id=>c.has('s:'+id)&&originState({sid:id},st.det[slotKey(H,'origin')+'|s:'+id]||{})==='ok').map(id=>slotKey(H,'origin')+'|s:'+id); }}
];
const DEXB_GROUPS=['REGIONS','MILESTONES','SHINY','FORMS','SPECIAL'];

// progress of every badge: {b, have, keys, done, ts}
function dexbProgress(){
  return DEXB.map(b=>{ const keys=b.got(), have=Math.min(keys.length,b.need); return {b,have,keys,done:keys.length>=b.need,ts:st.dexb&&st.dexb[b.id]||0}; });
}
// when it was earned, from the capture dates: the last one needed ("all of"), or the Nth one ("N of")
function dexbWhen(p){
  const ts=p.keys.map(k=>(st.det[k]||{}).ts||0).filter(Boolean).sort((a,b)=>a-b);
  if(!ts.length) return Date.now();
  return p.b.all?ts[ts.length-1]:(ts[p.b.need-1]||ts[ts.length-1]);
}
// records newly earned badges; returns the new ones (none on the very first run, which only catches up)
function dexbUpdate(){
  if(!st.dexb||typeof st.dexb!=='object') st.dexb={};
  const first=!st.dexb._init; if(first) st.dexb._init=Date.now();
  const fresh=[]; let changed=false;
  dexbProgress().forEach(p=>{ if(p.done&&!st.dexb[p.b.id]){ st.dexb[p.b.id]=first?dexbWhen(p):Date.now(); changed=true; if(!first) fresh.push(p.b); } });
  if(changed||first) save();
  return {first,fresh,count:dexbCount()};
}
// after a mark on this device: celebrate on phones (PC records the badge quietly)
let dexbTimer=0;
function dexbAfterMark(on){
  if(!on) return; clearTimeout(dexbTimer);
  dexbTimer=setTimeout(()=>{ const r=dexbUpdate(); if(r.fresh.length&&typeof isMob==='function'&&isMob()) dexbCelebrate(r.fresh); },250);
}
const dexbCount=()=>DEXB.filter(b=>st.dexb&&st.dexb[b.id]).length;
const dexbDate=ts=>new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'}).toUpperCase();
const dexbGem=(b,on,s)=>`<span class="dexb-gem${on?'':' off'}" style="--c:${b.c};--s:${s}px"><b class="${b.gl.length>3?'sm':''}">${esc(b.gl)}</b></span>`;
function dexbFanfare(){ if(!st.sound) return; try{ blip(1047,.09,0,'square',.05); blip(1319,.09,.1,'square',.05); blip(1568,.09,.2,'square',.05); blip(2093,.3,.32,'square',.05); }catch(_){} }
function dexbCelebrate(list){
  const queue=[...list];
  const next=()=>{
    const b=queue.shift(); if(!b) return;
    const total=dexbCount();
    const w=document.createElement('div'); w.className='dexb-get-wrap'; w.setAttribute('role','dialog'); w.setAttribute('aria-label','Badge earned: '+b.name);
    w.innerHTML=`<div class="dexb-get" style="--c:${b.c}"><span class="k">BADGE GET!</span>${dexbGem(b,true,86)}<h3>${esc(b.name.toUpperCase())}</h3><p>${esc(b.how)}.</p><small>DEX BADGES · ${total} / ${DEXB.length}</small><button type="button" class="dexb-ok">NICE!</button></div>`;
    document.body.appendChild(w); dexbFanfare();
    const close=()=>{ w.remove(); next(); };
    w.querySelector('.dexb-ok').onclick=close; w.onclick=e=>{ if(e.target===w) close(); };
    setTimeout(()=>w.querySelector('.dexb-ok').focus(),50);
  };
  next();
}
