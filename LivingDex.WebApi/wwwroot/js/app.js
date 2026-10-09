/* HOME Living Dex: the tracker (state, boxes, inspector, sync). The other scripts in this folder build on it and boot.js starts the app.
   Classic scripts sharing one global scope, loaded in order by index.html; the Pokédex data comes from /data/pokedex.js. */
const RAW = window.PKDATA;
let BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
let CRY = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/';
const TYPES = [null,['Normal','#a8a878'],['Fighting','#c03028'],['Flying','#a890f0'],['Poison','#a040a0'],['Ground','#d4a84a'],['Rock','#b8a038'],['Bug','#98b020'],['Ghost','#705898'],['Steel','#a0a0c0'],['Fire','#f08030'],['Water','#5890f0'],['Grass','#68b848'],['Electric','#e8c018'],['Psychic','#f85888'],['Ice','#78c8c8'],['Dragon','#7038f8'],['Dark','#705848'],['Fairy','#e890b0']];
const REG = {1:'Kanto',2:'Johto',3:'Hoenn',4:'Sinnoh',5:'Unova',6:'Kalos',7:'Alola',8:'Galar',9:'Paldea'};
const ROMAN = ['','I','II','III','IV','V','VI','VII','VIII','IX'];
const DEXNAME = {kantoc:'Kanto',johto:'Johto',johtohg:'Johto',hoenn:'Hoenn',hoennoras:'Hoenn',sinnoh:'Sinnoh',sinnohpt:'Sinnoh',unova:'Unova',unova2:'Unova',kalosc:'Central Kalos',kalosco:'Coastal Kalos',kalosm:'Mountain Kalos',
  alola:'Alola',melemele:'Melemele',akala:'Akala',ulaula:"Ula'ula",poni:'Poni',alolau:'Alola',melemeleu:'Melemele',akalau:'Akala',ulaulau:"Ula'ula",poniu:'Poni',
  kanto:'Kanto',galar:'Galar',armor:'Isle of Armor',tundra:'Crown Tundra',hisui:'Hisui',paldea:'Paldea',kitakami:'Kitakami',blueberry:'Blueberry',lumiose:'Lumiose',hyperspace:'Hyperspace'};
const GBIT = {za:0,sv:1,pla:2,bdsp:3,swsh:4,lgpe:5};
const V_ALL=['normal','forms','gender','shiny','all','origin'], V_NOGEN=['normal','forms','shiny','all','origin'];
const GAMES = [
  {k:'home',s:'HOME',n:'Pokémon HOME',c:'#36c6a8',dex:[],grp:'HOME',vars:V_ALL},
  {k:'rby',s:'RBY',n:'Red / Green / Blue / Yellow',c:'#e04a3a',dex:['kantoc'],grp:'GEN I',vg:2,vars:['normal','origin']},
  {k:'gsc',s:'GSC',n:'Gold / Silver / Crystal',c:'#d4af37',dex:['johto'],grp:'GEN II',vg:4,vars:V_NOGEN},
  {k:'rse',s:'RSE',n:'Ruby / Sapphire / Emerald',c:'#d0453a',dex:['hoenn'],grp:'GEN III',vg:6,vars:V_NOGEN},
  {k:'frlg',s:'FRLG',n:'FireRed / LeafGreen',c:'#e8743b',dex:['kantoc'],grp:'GEN III',vg:7,vars:V_NOGEN},
  {k:'dppt',s:'DPPt',n:'Diamond / Pearl / Platinum',c:'#7a9ad8',dex:['sinnoh','sinnohpt'],dexLabel:{sinnoh:'Sinnoh (DP)',sinnohpt:'Sinnoh (Pt)'},grp:'GEN IV',vg:9,vars:V_ALL},
  {k:'hgss',s:'HGSS',n:'HeartGold / SoulSilver',c:'#e2b53c',dex:['johtohg'],grp:'GEN IV',vg:10,vars:V_ALL},
  {k:'bw',s:'BW',n:'Black / White',c:'#a7adb6',dex:['unova'],grp:'GEN V',vg:11,vars:V_ALL},
  {k:'b2w2',s:'B2W2',n:'Black 2 / White 2',c:'#5a8ac8',dex:['unova2'],grp:'GEN V',vg:14,vars:V_ALL},
  {k:'xy',s:'XY',n:'X / Y',c:'#2f78d6',dex:['kalosc','kalosco','kalosm'],grp:'GEN VI',vg:15,vars:V_ALL},
  {k:'oras',s:'ORAS',n:'Omega Ruby / Alpha Sapphire',c:'#c43a3a',dex:['hoennoras'],grp:'GEN VI',vg:16,vars:V_ALL},
  {k:'sm',s:'SM',n:'Sun / Moon',c:'#f08a24',dex:['alola','melemele','akala','ulaula','poni'],grp:'GEN VII',vg:17,vars:V_ALL},
  {k:'usum',s:'USUM',n:'Ultra Sun / Ultra Moon',c:'#b04ad6',dex:['alolau','melemeleu','akalau','ulaulau','poniu'],grp:'GEN VII',vg:18,vars:V_ALL},
  {k:'lgpe',s:'LGPE',n:"Let's Go Pikachu / Eevee",c:'#f2c230',dex:['kanto'],grp:'GEN VII',vars:V_ALL},
  {k:'swsh',s:'SwSh',n:'Sword / Shield',c:'#3fa0e0',dex:['galar','armor','tundra'],dlc:['armor','tundra'],grp:'GEN VIII',vars:V_ALL},
  {k:'bdsp',s:'BDSP',n:'Brilliant Diamond / Shining Pearl',c:'#6aa8f0',dex:['sinnoh'],grp:'GEN VIII',vars:V_ALL},
  {k:'pla',s:'PLA',n:'Legends: Arceus',c:'#d9b25c',dex:['hisui'],grp:'GEN VIII',vars:V_ALL},
  {k:'sv',s:'SV',n:'Scarlet / Violet',c:'#e0533e',dex:['paldea','kitakami','blueberry'],dlc:['kitakami','blueberry'],grp:'GEN IX',vars:V_ALL},
  {k:'za',s:'Z-A',n:'Legends: Z-A',c:'#c4e04a',dex:['lumiose','hyperspace'],dlc:['hyperspace'],grp:'GEN IX',vars:V_ALL},
  {k:'wo',s:'W&W',n:'Winds / Waves',c:'#7fd1c7',dex:[],grp:'GEN X',soon:true,vars:['normal']},
];
const PLAY = GAMES.filter(g=>!g.soon);
const dexLabel=(g,d)=>(g.dexLabel&&g.dexLabel[d])||DEXNAME[d];
const VARIANTS = [{k:'normal',n:'Normal'},{k:'forms',n:'Forms'},{k:'gender',n:'Genders'},{k:'shiny',n:'Shiny'},{k:'all',n:'All',hint:'Base + forms + genders, each also shiny'},{k:'origin',n:'Origin',hint:'Each Pokémon caught in a game from its own generation'}];
const ORIGINS = [['rby','Red / Blue / Yellow (VC)',1],['gsc','Gold / Silver / Crystal (VC)',2],['rse','Ruby / Sapphire / Emerald',3],['frlg','FireRed / LeafGreen',3],['dppt','Diamond / Pearl / Platinum',4],['hgss','HeartGold / SoulSilver',4],['bw','Black / White',5],['b2w2','Black 2 / White 2',5],['xy','X / Y',6],['oras','Omega Ruby / Alpha Sapphire',6],['sm','Sun / Moon',7],['usum','Ultra Sun / Ultra Moon',7],['lgpe',"Let's Go Pikachu / Eevee",7],['go','Pokémon GO',0],['swsh','Sword / Shield',8],['bdsp','Brilliant Diamond / Shining Pearl',8],['pla','Legends: Arceus',8],['sv','Scarlet / Violet',9],['za','Legends: Z-A',9],['event','Event / HOME gift',0]];
const ORIG = Object.fromEntries(ORIGINS.map(o=>[o[0],{n:o[1],gen:o[2]}]));
const BALLS = [['poke','Poké Ball','#e3363a'],['great','Great Ball','#3b7fd6'],['ultra','Ultra Ball','#f2c230'],['master','Master Ball','#7b3fb0'],['premier','Premier Ball','#f2f2f2'],['luxury','Luxury Ball','#2a2a2a'],['heal','Heal Ball','#f59ac2'],['net','Net Ball','#2aa3a8'],['nest','Nest Ball','#8bc34a'],['dive','Dive Ball','#2e78c8'],['dusk','Dusk Ball','#2f6b3a'],['quick','Quick Ball','#2d6fd4'],['timer','Timer Ball','#d8d8d8'],['repeat','Repeat Ball','#e89c2a'],['level','Level Ball','#c9302c'],['lure','Lure Ball','#2b8fd6'],['moon','Moon Ball','#3a4a6a'],['love','Love Ball','#ef86b5'],['heavy','Heavy Ball','#6d7b86'],['fast','Fast Ball','#f2d23a'],['friend','Friend Ball','#3aa64a'],['dream','Dream Ball','#f39bc4'],['safari','Safari Ball','#6b8e23'],['sport','Sport Ball','#e88a2a'],['beast','Beast Ball','#2a5bd6'],['cherish','Cherish Ball','#c62828'],['strange','Strange Ball','#9fb86a'],['hpoke','Poké Ball (Hisui)','#b5583a'],['feather','Feather Ball','#a8c8e8'],['wing','Wing Ball','#8fb0d8'],['jet','Jet Ball','#6aa0d8'],['heavyh','Heavy Ball (Hisui)','#59606a'],['leaden','Leaden Ball','#4a5058'],['gigaton','Gigaton Ball','#3d434c'],['origin','Origin Ball','#9a7fd0']];
const THEMES = [{k:'blue',n:'Blue',h:222,s:1},{k:'red',n:'Red',h:356,s:1},{k:'green',n:'Green',h:150,s:.9},{k:'teal',n:'Teal',h:186,s:.9},{k:'purple',n:'Purple',h:268,s:1},{k:'pink',n:'Pink',h:326,s:.95},{k:'gold',n:'Gold',h:40,s:.85},{k:'black',n:'Black',h:222,s:.12}];
function applyTheme(){ const t=THEMES.find(x=>x.k===st.theme)||THEMES[0]; const r=document.documentElement.style; r.setProperty('--h',t.h); r.setProperty('--sat',t.s); }
const BALL = Object.fromEntries(BALLS.map(b=>[b[0],{n:b[1],c:b[2]}]));

/* ---------- data ---------- */
const SP = new Map();
RAW.s.forEach(([id,en,ja,gen,t1,t2,gr,fl,chain,mask])=>SP.set(id,{id,en,ja,gen,t:[t1,t2].filter(Boolean),gr,fl,chain,mask}));
const FORMS = new Map();
RAW.f.forEach(([key,sid,label,sk,t1,t2,mask,vg])=>{ if(!FORMS.has(sid))FORMS.set(sid,[]); FORMS.get(sid).push({key,sid,label,sk,t:[t1,t2].filter(Boolean),mask,vg}); });
const GDIFF = new Set(RAW.g);
const EVO = RAW.e; // sid -> [fromSid, method, trade]
const CHAINS = new Map();
SP.forEach(sp=>{ if(!CHAINS.has(sp.chain)) CHAINS.set(sp.chain,[]); CHAINS.get(sp.chain).push(sp.id); });
const DEXNUM = {};
Object.keys(DEXNAME).forEach(d=>{ const m=new Map(); RAW.x[d].forEach((sid,i)=>{ if(!m.has(sid)) m.set(sid,RAW.x[d+'#'][i]); }); DEXNUM[d]=m; });
const ALL_IDS = [...SP.keys()].sort((a,b)=>a-b);

/* ---------- state ---------- */
const STORE='home-livingdex-b2-v1';
let st = {game:'home',scope:{},variant:{},caught:{},det:{},log:[],sel:{},quick:false,hl:false,sound:true,tab:'evo',noticeOff:false,view:'track',gamesOpen:false};
try{ const s=JSON.parse(localStorage.getItem(STORE)||'null'); if(s&&typeof s==='object') st=Object.assign(st,s); }catch(e){}
if(!st.det||typeof st.det!=='object') st.det={}; if(!Array.isArray(st.log)) st.log=[];
const localSave=()=>{ try{ localStorage.setItem(STORE,JSON.stringify(st)); }catch(e){} };
const save=()=>{ localSave(); syncTouch(); };
applyTheme();
const game=()=>PLAY.find(g=>g.k===st.game)||GAMES[0];
const scopeOf=g=>st.scope[g.k]||'all';
const variantOf=g=>g.vars.includes(st.variant[g.k])?st.variant[g.k]:'normal';
const slotKey=(g,v)=>g.k+'|'+v;
const caughtArr=(g,v)=>{ const k=slotKey(g,v); if(!Array.isArray(st.caught[k])) st.caught[k]=[]; return st.caught[k]; };
const lookup={};
function cset(g,v){ const k=slotKey(g,v), arr=caughtArr(g,v); let c=lookup[k]; if(!c||c.arr!==arr||c.n!==arr.length){ c={arr,n:arr.length,set:new Set(arr)}; lookup[k]=c; } return c.set; }
const detKey=(g,v,e)=>slotKey(g,v)+'|'+e.key;
const detOf=(g,v,e)=>st.det[detKey(g,v,e)]||{};
function setCaught(g,v,e,on){
  const arr=caughtArr(g,v), i=arr.indexOf(e.key);
  if(on&&i<0){ arr.push(e.key); const dk=detKey(g,v,e); const d=st.det[dk]||{}; if(!d.ts) d.ts=Date.now(); d.mt=Date.now(); if(!d.game && ORIG[g.k]) d.game=g.k; st.det[dk]=d; st.log.unshift({k:dk,ts:Date.now(),n:(e.shiny?'★ ':'')+SP.get(e.sid).en+(e.label?' ('+shortLabel(e.label)+')':'')}); if(st.log.length>300) st.log.length=300; }
  if(!on&&i>=0) arr.splice(i,1);
  save(); dexbAfterMark(on);
}
function originState(e,d){ if(!d.game) return 'unset'; const o=ORIG[d.game]; const gen=SP.get(e.sid).gen; if(!o) return 'bad'; return (o.gen===gen || (d.game==='lgpe'&&gen===1)) ? 'ok' : 'bad'; }
function isDone(g,v,e,c){ if(!c.has(e.key)) return false; if(v!=='origin') return true; return originState(e,detOf(g,v,e))==='ok'; }

/* ---------- lists ---------- */
function speciesFor(g,scope){
  if(g.k==='home'){ if(scope==='all') return ALL_IDS; const gen=+scope.slice(3); return ALL_IDS.filter(id=>SP.get(id).gen===gen); }
  const dexes=scope==='all'?g.dex:[scope]; const out=[],seen=new Set();
  dexes.forEach(d=>RAW.x[d].forEach(id=>{ if(!seen.has(id)){seen.add(id);out.push(id);} }));
  return out;
}
const formOk=(g,f)=>g.k==='home'||(g.vg?f.vg<=g.vg:((f.mask>>GBIT[g.k])&1));
const listCache=new Map();
function entries(g,scope,variant){
  const ck=g.k+'|'+scope+'|'+variant; if(listCache.has(ck)) return listCache.get(ck);
  const ids=speciesFor(g,scope), out=[], all=variant==='all';
  ids.forEach(id=>{
    const sp=SP.get(id), grp=[{key:'s:'+id,sid:id,sk:String(id),t:sp.t,label:'',female:false}];
    if(variant==='forms'||all) (FORMS.get(id)||[]).forEach(f=>{ if(!formOk(g,f)) return; grp.push({key:'f:'+f.key,sid:id,sk:f.sk,t:f.t,label:f.label,female:/female/.test(f.key),form:f}); });
    if((variant==='gender'||all)&&GDIFF.has(id)&&g.vars.includes('gender')) grp.push({key:'g:'+id,sid:id,sk:String(id),t:sp.t,label:'Female',female:true,gfemale:true});
    if(variant==='shiny') grp.forEach(e=>e.shiny=true);
    out.push(...grp);
    if(all) grp.forEach(e=>out.push({...e,key:'x:'+e.key,shiny:true}));
  });
  listCache.set(ck,out); return out;
}
function regionalNo(g,scope,sid){
  if(g.k==='home') return sid;
  for(const d of (scope==='all'?g.dex:[scope])){ const n=DEXNUM[d].get(sid); if(n!=null) return n; }
  return sid;
}

/* ---------- sprites ---------- */
let spriteMode='unknown';
function spriteChain(e,animated){
  const sh=e.shiny?'shiny/':'', fe=e.gfemale?'female/':'', bw=BASE+'versions/generation-v/black-white/', c=[];
  if(animated&&e.sid<=649) c.push(bw+'animated/'+sh+fe+e.sk+'.gif');
  c.push(bw+sh+fe+e.sk+'.png'); c.push(BASE+sh+fe+e.sk+'.png'); if(fe) c.push(BASE+sh+e.sk+'.png');
  return c;
}
/* Static sprites (Gen VI+) sit in a mostly empty 96x96 canvas while the animated ones are cropped;
   trimming the transparent border puts both on the same scale. Returns null if the image can't be read. */
function trimSprite(im){
  try{
    const w=im.naturalWidth, h=im.naturalHeight; if(!w||!h) return null;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,0,w,h).data;
    let t=h,l=w,r=-1,b=-1;
    for(let y=0;y<h;y++) for(let i=0;i<w;i++) if(d[(y*w+i)*4+3]>8){ if(i<l)l=i; if(i>r)r=i; if(y<t)t=y; if(y>b)b=y; }
    if(r<0) return null;
    const o=document.createElement('canvas'); o.width=r-l+1; o.height=b-t+1;
    o.getContext('2d').drawImage(c,l,t,o.width,o.height,0,0,o.width,o.height);
    o.style.setProperty('--nw',o.width); o.setAttribute('role','img'); if(im.alt) o.setAttribute('aria-label',im.alt);
    return o;
  }catch(_){ return null; }
}
const isStatic=im=>/\.png(\?|$)/.test(im.currentSrc||im.src);
function imgEl(chain,alt,onFail,onLoad){
  const im=document.createElement('img'); im.alt=alt; im.decoding='async'; im.loading='lazy';
  let i=0; im.onerror=()=>{ i++; if(i<chain.length) im.src=chain[i]; else onFail(); };
  if(onLoad) im.onload=()=>onLoad(im);
  im.src=chain[0]; return im;
}
function miniBall(tc){ const m=document.createElement('span'); m.className='mini'; m.style.setProperty('--tc',tc); return m; }
function probeSprites(){
  const im=new Image(); let done=false; const fin=m=>{ if(done)return; done=true; spriteMode=m; render(); };
  im.onload=()=>fin('on'); im.onerror=()=>fin('off'); setTimeout(()=>fin('off'),5000);
  im.src=BASE+'versions/generation-v/black-white/169.png';
}

/* ---------- sound ---------- */
let AC=null, cryAudio=null, cryT=0;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(_){ AC=null; } } if(AC&&AC.state==='suspended') AC.resume().catch(()=>{}); return AC; }
function blip(f,d=.04,delay=0,type='square',vol=.05){
  if(!st.sound) return; const a=ac(); if(!a) return;
  const t=a.currentTime+delay, o=a.createOscillator(), gn=a.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t); gn.gain.setValueAtTime(vol,t); gn.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(gn).connect(a.destination); o.start(t); o.stop(t+d+.02);
}
const SFX={ move:()=>blip(1480,.03), box:()=>{blip(988,.035);blip(1319,.035,.04);}, tab:()=>blip(1175,.04,0,'triangle',.08),
  mark:()=>{blip(880,.05);blip(1320,.08,.06);}, unmark:()=>{blip(660,.05);blip(440,.08,.06);}, err:()=>blip(220,.12,0,'square',.04) };
function cry(sid){
  if(!st.sound||!AC) return; clearTimeout(cryT);
  cryT=setTimeout(()=>{
    try{ if(cryAudio){ cryAudio.pause(); } const urls=[CRY+(sid<=649?'legacy/':'latest/')+sid+'.ogg',CRY+'latest/'+sid+'.ogg']; let i=0;
      const a=new Audio(); a.volume=.32; a.onerror=()=>{ i++; if(i<urls.length){ a.src=urls[i]; a.play().catch(()=>{}); } };
      a.src=urls[0]; a.play().catch(()=>{}); cryAudio=a; }catch(_){}
  },260);
}

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(3,'0');
const typeColor=t=>(TYPES[t]||TYPES[1])[1];
const pct=(a,b)=>b?Math.floor(a*1000/b)/10:0;
function countDone(g,v,list){ const c=cset(g,v); let n=0; for(const e of list) if(isDone(g,v,e,c)) n++; return n; }
const shortLabel=l=>l.replace(/ (Form|Forme|Style|Mode|Pattern|Plumage|Flower|Cloak|Cream|Swirl|Breed|Mask)\b/g,'').replace(/ (Strawberry|Berry|Love|Star|Clover|Flower|Ribbon) Sweet/,m=>' '+m.trim().split(' ')[0]);
function current(){ const g=game(), s=scopeOf(g), v=variantOf(g); const list=entries(g,s,v); let i=st.sel[g.k+'|'+s+'|'+v]|0; if(i>=list.length)i=list.length-1; if(i<0)i=0; return {g,s,v,list,i}; }

/* ---------- render: header & controls ---------- */
function renderCarts(){
  const el=$('carts'); el.innerHTML='';
  let grpEl=null, last='';
  const open=!!st.gamesOpen; el.classList.toggle('closed',!open);
  $('allBtn').setAttribute('aria-expanded',String(open)); $('allBtn').firstChild.textContent=open?'HIDE GAMES ':'ALL GAMES '; $('allArrow').textContent=open?'▴':'▾';
  (open?GAMES:[game()]).forEach(g=>{
    if(g.grp!==last){ last=g.grp; grpEl=document.createElement('div'); grpEl.className='cgroup'; grpEl.innerHTML=`<span class="cglbl">${esc(g.grp)}</span><div class="crow"></div>`; el.appendChild(grpEl); }
    const b=document.createElement('button'); b.type='button'; b.className='cart'+(g.soon?' soon':''); b.style.setProperty('--c',g.c);
    if(g.soon){ b.innerHTML=`<span class="s">${esc(g.s)}</span><span class="n">${esc(g.n)}</span><span class="cs">COMING SOON</span>`; b.title=`${g.n}: coming soon`; b.onclick=()=>{ SFX.err(); flash(`${g.n} is coming soon`); }; }
    else {
      const v=variantOf(g), list=entries(g,scopeOf(g),v), n=countDone(g,v,list);
      b.setAttribute('aria-pressed',String(g.k===st.game)); b.title=`${g.n}: ${n}/${list.length}`;
      b.innerHTML=`<span class="s">${esc(g.s)}</span><span class="n">${esc(g.n)}</span><span class="p"><i style="width:${pct(n,list.length)}%"></i></span>`;
      b.onclick=()=>{ if(g.k===st.game&&!st.gamesOpen){ setGames(true); return; } st.game=g.k; st.gamesOpen=false; save(); SFX.box(); render(); };
    }
    grpEl.querySelector('.crow').appendChild(b);
  });
}
function renderControls(){
  const g=game(), s=scopeOf(g), v=variantOf(g);
  const sc=$('dexPop'); sc.innerHTML='';
  const scopes = g.k==='home' ? [['all','National'],...[1,2,3,4,5,6,7,8,9].map(n=>['gen'+n,'Gen '+ROMAN[n]])]
    : [...(g.dex.length>1?[['all','Full']]:[]), ...g.dex.map(d=>[d,dexLabel(g,d)+((g.dlc||[]).includes(d)?' (DLC)':'')])];
  scopes.forEach(([k,n])=>{
    const on=g.dex.length===1?true:k===s;
    const b=document.createElement('button'); b.type='button'; b.className='tb-opt tb-row'; b.setAttribute('role','menuitemradio');
    b.setAttribute('aria-checked',String(on));
    b.innerHTML=`<i class="rd"></i><span>${esc(n)}</span><b>${speciesFor(g,k).length}</b>`;
    b.onclick=()=>{ st.scope[g.k]=k; save(); SFX.tab(); closePops(); render(); }; sc.appendChild(b);
    if(on){ $('dexLbl').textContent=n; $('dexN').textContent=speciesFor(g,k).length; }
  });
  $('dexBtn').disabled=scopes.length<2; $('dexCar').hidden=scopes.length<2;
  const vr=$('variants'); vr.querySelectorAll('button').forEach(b=>b.remove());
  VARIANTS.filter(o=>g.vars.includes(o.k)).forEach(o=>{
    const b=document.createElement('button'); b.type='button'; b.className='chip'; b.setAttribute('aria-pressed',String(o.k===v));
    b.textContent=o.n; if(o.hint) b.title=o.hint; b.onclick=()=>{ st.variant[g.k]=o.k; save(); SFX.tab(); render(); }; vr.appendChild(b);
  });
  syncSwatches();
  $('quickBtn').setAttribute('aria-pressed',String(!!st.quick)); $('sndBtn').setAttribute('aria-pressed',String(!!st.sound));
  $('ovw').checked=st.view==='over'; $('hl').checked=!!st.hl;
}

/* ---------- box ---------- */
function setSel(i,quiet){ const {g,s,v,list}=current(); const j=Math.max(0,Math.min(list.length-1,i)); st.sel[g.k+'|'+s+'|'+v]=j; save(); if(!quiet){ SFX.move(); cry(list[j].sid); } renderBox(); renderScreen(); renderLower(); }
function renderBox(){
  const {g,s,v,list,i}=current(); const c=cset(g,v);
  const nb=Math.max(1,Math.ceil(list.length/30)), b=Math.floor(i/30), from=b*30, to=Math.min(list.length,from+30);
  let got=0; for(let k=from;k<to;k++) if(isDone(g,v,list[k],c)) got++;
  const fNo=list[from]?regionalNo(g,s,list[from].sid):0, lNo=list[to-1]?regionalNo(g,s,list[to-1].sid):0;
  $('boxname').innerHTML=`<b>Box ${b+1}</b><small>No. ${pad(fNo)}–${pad(lNo)} · ${got}/${to-from}</small>`;
  $('box').style.setProperty('--c',g.c); $('box').classList.toggle('hl',!!st.hl); $('box').classList.toggle('ovw',st.view==='over');
  const el=$('slots'); el.innerHTML='';
  for(let k=0;k<30;k++){
    const idx=from+k, e=list[idx], btn=document.createElement('button'); btn.type='button';
    if(!e){ btn.className='slot empty'; btn.disabled=true; btn.setAttribute('aria-hidden','true'); el.appendChild(btn); continue; }
    const sp=SP.get(e.sid), have=c.has(e.key), d=have?detOf(g,v,e):{}, done=isDone(g,v,e,c);
    btn.className='slot '+(have?'caught':'missing')+(have&&!done?' warn':'')+(idx===i?' sel':'');
    btn.setAttribute('aria-label',`${e.shiny?'Shiny ':''}${sp.en}${e.label?' ('+e.label+')':''} no. ${regionalNo(g,s,e.sid)}, ${done?'caught':have?'needs origin game':'missing'}`);
    const tc=typeColor(e.t[0]); btn.style.setProperty('--tc',tc);
    if(d.ball&&BALL[d.ball]) btn.style.setProperty('--bc',BALL[d.ball].c);
    if(spriteMode==='on') btn.appendChild(imgEl(spriteChain(e,false),'',()=>btn.querySelector('img')?.replaceWith(miniBall(tc))));
    else btn.appendChild(miniBall(tc));
    btn.insertAdjacentHTML('beforeend',`<span class="no">${pad(regionalNo(g,s,e.sid))}</span>${have?'<span class="ck" aria-hidden="true"></span>':''}${e.shiny&&v==='all'?'<span class="sh" aria-hidden="true">★</span>':''}${spriteMode!=='on'||e.label?`<span class="tag">${esc(e.label?shortLabel(e.label):sp.en)}</span>`:''}`);
    btn.onclick=()=>{ if(st.quick) toggle(idx); else setSel(idx); };
    btn.ondblclick=()=>{ if(!st.quick) toggle(idx); };
    el.appendChild(btn);
  }
  const mi=$('minis'); mi.innerHTML=''; let total=0;
  for(let bi=0;bi<nb;bi++){
    const f=bi*30,t=Math.min(list.length,f+30); let n=0; for(let k=f;k<t;k++) if(isDone(g,v,list[k],c)) n++; total+=n;
    const m=document.createElement('button'); m.type='button'; m.className='mb'+(n===t-f?' done':''); if(bi===b) m.setAttribute('aria-current','true');
    m.innerHTML=`${bi+1}<i><b style="width:${pct(n,t-f)}%"></b></i>`; m.title=`Box ${bi+1}: ${n}/${t-f}`;
    m.onclick=()=>{ SFX.box(); setSel(bi*30,true); }; mi.appendChild(m);
  }
  $('ovCount').textContent=`${total}/${list.length} · ${nb} BOXES`;
  $('overall').innerHTML=`${esc(g.n)} · ${VARIANTS.find(o=>o.k===v).n}<br><b>${total}</b> / ${list.length} · ${pct(total,list.length)}%`;
  $('prevBox').disabled=b===0; $('nextBox').disabled=b>=nb-1;
}

/* ---------- top screen ---------- */
function renderScreen(){
  const {g,s,v,list,i}=current(); const e=list[i], sc=$('screen'); if(!e){ sc.innerHTML=''; return; }
  const sp=SP.get(e.sid), c=cset(g,v), have=c.has(e.key), d=detOf(g,v,e), done=isDone(g,v,e,c);
  const no=regionalNo(g,s,e.sid), b=Math.floor(i/30)+1, r=Math.floor((i%30)/6)+1, col=i%6+1;
  const n=countDone(g,v,list), left=list.length-n;
  const sex = e.female ? '<span class="sex f">♀</span>' : (sp.gr===8?'<span class="sex f">♀</span>':(sp.gr===0?'<span class="sex m">♂</span>':''));
  const types=e.t.map(t=>`<span class="type" style="background:${typeColor(t)}">${esc(TYPES[t][0].toUpperCase())}</span>`).join('');
  const varName=(e.label||(v==='gender'?'Male / default':'Base form'))+(e.shiny?' · Shiny':'');
  const os=v==='origin'&&have?originState(e,d):null;
  const status=!have?'Missing':os==='unset'?'Set game':os==='bad'?'Wrong origin':v==='origin'?'Origin OK':'Caught';
  const pill=!have?'<span class="pill miss">MISSING</span>':done?'<span class="pill ok">IN BOX</span>':'<span class="pill warn">CHECK</span>';
  const ot=d.game&&ORIG[d.game]?`<span class="val blue">${esc(ORIG[d.game].n)}</span>`:`<span class="val dim">—</span>`;
  const ball=d.ball&&BALL[d.ball]?`<span class="val"><span class="bd" style="--bc:${BALL[d.ball].c}"></span>${esc(BALL[d.ball].n)}</span>`:`<span class="val dim">—</span>`;
  const OTSHORT={bdsp:'BDiamond / SPearl',oras:'ORuby / ASapphire',usum:'Ultra Sun / U.Moon',rse:'Ruby / Sapph. / Emerald',dppt:'Diamond / Pearl / Pt',rby:'Red / Blue / Yellow',gsc:'Gold / Silver / Crystal',lgpe:"Let's Go P / E",event:'Event / Gift'};
  const ok=d.game&&ORIG[d.game]?esc(OTSHORT[d.game]||ORIG[d.game].n):'—', bl=d.ball&&BALL[d.ball]?`<span class="bd" style="--bc:${BALL[d.ball].c}"></span>${esc(BALL[d.ball].n)}`:'—';
  sc.innerHTML=`
    <div class="nameplate">
      <div class="l1"><span class="ball" aria-hidden="true"></span><span class="nm">${esc(d.nick||sp.ja||sp.en)}</span>${sex}</div>
      <div class="l2"><span>B${b} · ${r}-${col}</span>${pill}</div>
    </div>
    <div class="hx" style="top:15%"><div class="in"><span class="chip">DEX No.</span><span class="vv red">${pad(no)}${g.k!=='home'?` <small>NAT. ${pad(sp.id)}</small>`:''}</span></div></div>
    <div class="hx" style="top:27%"><div class="in"><span class="chip">NAME</span><span class="vv">${esc(sp.en)}</span></div></div>
    <div class="hx" style="top:39%"><div class="in"><span class="chip">TYPE</span>${types}</div></div>
    <div class="hx" style="top:51%"><div class="in"><span class="chip">OT GAME</span><span class="vv${d.game?'':' dim'}" title="${ok}">${ok}</span></div></div>
    <div class="hx" style="top:63%"><div class="in"><span class="chip">BALL</span><span class="vv${d.ball?'':' dim'}">${bl}</span></div></div>
    <div class="hx" style="top:75.5%"><div class="in"><span class="chip">LEFT</span><span class="vv">${left}</span><span class="track" title="${n} of ${list.length}"><i style="width:${pct(n,list.length)}%"></i></span></div></div>
    <div class="stage ${have?'':'missing'}" id="stage">${e.shiny?'<span class="star">★</span>':''}</div>
    <div class="strip"><span>NAT. ${pad(sp.id)}</span><span>${REG[sp.gen]} · GEN ${ROMAN[sp.gen]}</span>${e.shiny?'<span class="red">★</span>':''}</div>
    <div class="infobox">
      <div><small>Status</small><span>${status}</span></div>
      <div><small>Variant</small><span>${esc(varName)}</span></div>
    </div>
    <div class="toolbar">
      <button class="tb" type="button" data-a="up" aria-label="Previous Pokémon">▲</button>
      <button class="tb" type="button" data-a="down" aria-label="Next Pokémon">▼</button>
      <button class="tb wide2 ${have?'x':'ok'}" type="button" data-a="toggle">${have?'✕ REMOVE':'✓ MARK'}</button>
      <button class="tb back" type="button" data-a="next" aria-label="Next missing" title="Next missing">⤼</button>
    </div>`;
  const stage=sc.querySelector('#stage'), ph=()=>`<span class="ph" style="--tc:${typeColor(e.t[0])}"></span>`;
  if(spriteMode==='on') stage.appendChild(imgEl(spriteChain(e,true),sp.en,()=>{ stage.querySelector('img')?.remove(); stage.insertAdjacentHTML('beforeend',ph()); },im=>{ const cv=isStatic(im)?trimSprite(im):null; if(cv){ cv.classList.add('ready'); im.replaceWith(cv); return; } im.style.setProperty('--nw',im.naturalWidth||96); im.classList.add('ready'); }));
  else stage.insertAdjacentHTML('beforeend',ph());
  sc.querySelectorAll('.tb').forEach(bt=>bt.onclick=()=>{
    const a=bt.dataset.a;
    if(a==='up') setSel(i-1); else if(a==='down') setSel(i+1); else if(a==='toggle') toggle(i);
    else { const j=nextMissing(i); if(j<0){ SFX.err(); flash('This living dex is complete!'); } else setSel(j); }
  });
}

/* ---------- lower screen ---------- */
function renderLower(){
  const open=!!st.lowerOpen; $('lower').hidden=!open; $('lowerToggle').setAttribute('aria-expanded',String(open)); $('lowerLbl').textContent=open?'▲ HIDE INFO':'▼ EVOLUTION · WHERE TO GET · DETAILS'; if(!open) return;
  document.querySelectorAll('.ltab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.t===st.tab)));
  $('lbody').setAttribute('aria-labelledby','tab-'+st.tab);
  const {g,s,v,list,i}=current(); const e=list[i], body=$('lbody'); if(!e){ body.innerHTML=''; return; }
  if(st.tab==='evo') renderEvo(body,g,s,v,list,e);
  else if(st.tab==='where') renderWhere(body,g,e);
  else renderDetails(body,g,v,list,i,e);
}
function chainTree(sid){
  const ids=CHAINS.get(SP.get(sid).chain)||[sid];
  const kids=new Map(); let root=ids[0];
  ids.forEach(id=>{ const ev=EVO[id]; if(ev&&ids.includes(ev[0])){ if(!kids.has(ev[0])) kids.set(ev[0],[]); kids.get(ev[0]).push(id); } else root=id; });
  const stages=[]; let lvl=[root];
  while(lvl.length){ stages.push(lvl); lvl=lvl.flatMap(id=>kids.get(id)||[]); }
  return stages;
}
function renderEvo(body,g,s,v,list,e){
  const stages=chainTree(e.sid), c=cset(g,v);
  const keyFor=id=>(e.shiny&&v==='all'?'x:':'')+'s:'+id;
  const idxOf=id=>list.findIndex(x=>x.key===keyFor(id));
  let inDex=0, missing=0;
  const wrap=document.createElement('div'); wrap.className='card';
  wrap.innerHTML='<h3>EVOLUTION LINE</h3>';
  const ch=document.createElement('div'); ch.className='chain';
  stages.forEach((lvl,si)=>{
    if(si){ const a=document.createElement('div'); a.className='arrowcol'; a.textContent='▶'; a.setAttribute('aria-hidden','true'); ch.appendChild(a); }
    const colEl=document.createElement('div'); colEl.className='stagecol'+(lvl.length>3?' many':'');
    lvl.forEach(id=>{
      const sp=SP.get(id), j=idxOf(id), ent=j>=0?list[j]:null, have=ent&&c.has(ent.key), d=ent&&have?detOf(g,v,ent):{};
      if(ent){ inDex++; if(!isDone(g,v,ent,c)) missing++; }
      const bt=document.createElement('button'); bt.type='button'; bt.className='evo'+(id===e.sid?' cur':'')+(have?'':' miss');
      const ev=EVO[id];
      bt.innerHTML=`<span class="im"></span><span class="nm">${esc(sp.en)}</span>${si&&ev?`<span class="how">${esc(ev[1])}</span>`:''}`;
      const im=bt.querySelector('.im'), tc=typeColor(sp.t[0]);
      const fake={sid:id,sk:String(id),shiny:!!e.shiny};
      if(spriteMode==='on') im.appendChild(imgEl(spriteChain(fake,false),'',()=>im.querySelector('img')?.replaceWith(miniBall(tc)))); else im.appendChild(miniBall(tc));
      if(have) im.insertAdjacentHTML('beforeend',`<span class="ck" style="${d.ball&&BALL[d.ball]?'--bc:'+BALL[d.ball].c:''}"></span>`);
      bt.title=ent?`${sp.en}: ${have?'in box':'missing'}`:`${sp.en}: not in this Pokédex`;
      bt.onclick=()=>{ if(j>=0) setSel(j); else { SFX.err(); flash(`${sp.en} is not in this Pokédex`); } };
      colEl.appendChild(bt);
    });
    ch.appendChild(colEl);
  });
  wrap.appendChild(ch);
  body.innerHTML=''; body.appendChild(wrap);
  const sum=document.createElement('div'); sum.className='card';
  const trade=stages.flat().filter(id=>EVO[id]&&EVO[id][2]).map(id=>SP.get(id).en);
  sum.innerHTML=`<h3>PLAN</h3><p>${stages.flat().length===1?'Does not evolve.':`${inDex} of ${stages.flat().length} stages are in this Pokédex · <b>${missing}</b> still missing.`}</p>${missing>1?`<p class="hint">Breed or catch ${missing} of the first stage and evolve them to fill the line.</p>`:''}${trade.length?`<p><span class="tg ev">TRADE</span> ${esc(trade.join(', '))} ${trade.length>1?'evolve':'evolves'} by trade.</p>`:''}`;
  body.appendChild(sum);
}
function renderWhere(body,g,e){
  const sp=SP.get(e.sid), lines=[];
  PLAY.forEach(x=>{ let pin=true; x.dex.forEach(d=>{ const isDlc=(x.dlc||[]).includes(d);
    const n=DEXNUM[d].get(e.sid); if(n==null) return;
    const exc=RAW.xc[x.k]&&RAW.xc[x.k][e.sid], note=RAW.xn[x.k+'|'+e.sid];
    // the map pin goes on the game's first Pokédex that has it (Giratina is only in Platinum's)
    const mp=pin&&wmFind(x.k,e.sid); pin=false;
    lines.push(`<div class="wline"><span class="gm">${esc(x.s)}</span><span class="tags">${mp?`<button type="button" class="tg map" data-map="${x.k}" title="Show on the map">${WM_PIN}<b>${esc(dexLabel(x,d))} ${pad(n)}</b></button>`:`<span class="tg${isDlc?' dlc':''}"><b>${esc(dexLabel(x,d))} ${pad(n)}</b></span>`}${isDlc?'<span class="tg">DLC</span>':''}${exc?`<span class="tg x">${esc(exc)} only</span>`:''}</span>${note&&exc?`<span class="hint">${esc(note)}</span>`:''}</div>`);
  }); });
  PLAY.forEach(x=>{ const exc=RAW.xc[x.k]&&RAW.xc[x.k][e.sid]; if(!exc||x.dex.some(d=>DEXNUM[d].has(e.sid))) return;
    lines.push(`<div class="wline"><span class="gm">${esc(x.s)}</span><span class="tags"><span class="tg"><b>Outside regional dex</b></span><span class="tg x">${esc(exc)} only</span></span></div>`); });
  // games with a map where it is found although it's outside their regional Pokédex (radio, Safari Zone, Kanto…)
  wmGames().forEach(k=>{ const x=PLAY.find(y=>y.k===k); if(!x||x.dex.some(d=>DEXNUM[d].has(e.sid))||!wmHas(k,e.sid)) return;
    lines.push(`<div class="wline"><span class="gm">${esc(x.s)}</span><span class="tags"><button type="button" class="tg map" data-map="${k}" title="Show on the map">${WM_PIN}<b>Outside regional dex</b></button></span></div>`); });
  const ev=EVO[e.sid], prev=ev?SP.get(ev[0]):null;
  const how=[];
  if(prev) how.push(`<p><span class="tg ${ev[2]?'ev':''}">${ev[2]?'TRADE':'EVOLVE'}</span> From ${esc(prev.en)} · ${esc(ev[1])}</p>`);
  if(sp.fl&2) how.push(`<p><span class="tg x">EVENT</span> Mythical: usually only from events, gifts or special distributions.</p>`);
  else if(sp.fl&1) how.push(`<p><span class="tg">LEGENDARY</span> One per save file in most games.</p>`);
  if(!lines.length) how.push(`<p><span class="tg x">TRANSFER</span> Not in any Switch game's Pokédex here. Bring it through Pokémon Bank (Gen 1–7) or Pokémon GO.</p>`);
  if(e.form) how.push(`<p class="hint">${esc(e.label)}: availability below is for this form.</p>`);
  const mask=e.form?e.form.mask:sp.mask;
  const can=PLAY.filter(x=>GBIT[x.k]!=null).map(x=>`<span class="tg ${(mask>>GBIT[x.k])&1?'ok':'no'}">${esc(x.s)}</span>`).join('');
  body.innerHTML=`<div class="card"><h3>CATCH IN</h3>${lines.join('')||'<p class="hint">No Switch game has it in its regional Pokédex.</p>'}</div>
    ${how.length?`<div class="card"><h3>HOW</h3>${how.join('')}</div>`:''}
    <div class="card"><h3>CAN LIVE IN (TRANSFER FROM HOME)</h3><div class="tags"><span class="tg ok">HOME</span>${can}</div></div>`;
  wmWire(body,e);
}
function renderDetails(body,g,v,list,i,e){
  const c=cset(g,v), have=c.has(e.key), dk=detKey(g,v,e), d=st.det[dk]||{};
  const os=v==='origin'?originState(e,d):null, sp=SP.get(e.sid);
  body.innerHTML=`<div class="card"><h3>CAPTURE DETAILS${d.ts&&have?' · '+new Date(d.ts).toLocaleDateString():''}</h3>
    ${have?'':`<p class="hint">Not marked yet. Details are kept and show once you mark it.</p>`}
    ${v==='origin'?`<p>${os==='ok'?'<span class="tg ok">ORIGIN OK</span>':os==='bad'?'<span class="tg x">WRONG ORIGIN</span>':'<span class="tg">SET GAME</span>'} Needs a Gen ${ROMAN[sp.gen]} game${sp.gen===1?" (or Let's Go)":''}.</p>`:''}
    <div class="form">
      <label for="dGame">CAUGHT IN</label><select id="dGame"><option value="">—</option>${ORIGINS.map(o=>`<option value="${o[0]}"${d.game===o[0]?' selected':''}>${esc(o[1])}${o[2]?' · Gen '+ROMAN[o[2]]:''}</option>`).join('')}</select>
      <label for="dBall">BALL</label><select id="dBall"><option value="">—</option>${BALLS.map(b=>`<option value="${b[0]}"${d.ball===b[0]?' selected':''}>${esc(b[1])}</option>`).join('')}</select>
      <label for="dNick">NICKNAME</label><input id="dNick" maxlength="12" value="${esc(d.nick||'')}" placeholder="${esc(sp.en)}">
      <label for="dNotes" class="full">NOTES</label><textarea id="dNotes" class="full" placeholder="Nature, mark, where you caught it…">${esc(d.notes||'')}</textarea>
      <div class="full" style="display:flex;gap:.5em;flex-wrap:wrap">${have?'':'<button class="mini-btn" type="button" id="dMark">✓ Mark as caught</button>'}<span class="hint">Saved automatically.</span></div>
    </div></div>`;
  const upd=(k,val)=>{ const cur=st.det[dk]||{}; if(val) cur[k]=val; else delete cur[k]; cur.mt=Date.now(); st.det[dk]=cur; save(); renderScreen(); renderBox(); renderCarts(); };
  $('dGame').onchange=ev=>{ upd('game',ev.target.value); if(v==='origin') renderLower(); };
  $('dBall').onchange=ev=>upd('ball',ev.target.value);
  $('dNick').oninput=ev=>{ const cur=st.det[dk]||{}; cur.nick=ev.target.value.trim(); if(!cur.nick) delete cur.nick; cur.mt=Date.now(); st.det[dk]=cur; save(); renderScreen(); };
  $('dNotes').oninput=ev=>{ const cur=st.det[dk]||{}; cur.notes=ev.target.value; if(!cur.notes) delete cur.notes; cur.mt=Date.now(); st.det[dk]=cur; save(); };
  const mk=$('dMark'); if(mk) mk.onclick=()=>toggle(i);
}

/* ---------- actions ---------- */
function nextMissing(i){ const {g,v,list}=current(), c=cset(g,v); for(let k=1;k<=list.length;k++){ const j=(i+k)%list.length; if(!isDone(g,v,list[j],c)) return j; } return -1; }
function toggle(idx){
  const {g,s,v,list}=current(), e=list[idx]; if(!e) return;
  const on=!cset(g,v).has(e.key); setCaught(g,v,e,on); (on?SFX.mark:SFX.unmark)();
  st.sel[g.k+'|'+s+'|'+v]=idx; save(); renderAllButControls();
  const sp=SP.get(e.sid); flash(`${e.shiny?'Shiny ':''}${sp.en}${e.label?' ('+e.label+')':''} ${on?'marked':'removed'}`);
}
let tt; function flash(m){ const t=$('toast'); t.textContent=m; t.hidden=false; clearTimeout(tt); tt=setTimeout(()=>t.hidden=true,1600); }
function renderNotice(){
  const n=$('notice');
  if(spriteMode==='off'&&SYNC.on){ $('noticeText').textContent='Sprites could not be loaded. Check that the server can reach raw.githubusercontent.com; once a sprite is downloaded it is served from the server cache.'; n.hidden=false; }
  else if(spriteMode==='off'&&!st.noticeOff){ $('noticeText').textContent='Black 2 sprites and cries can\'t load in this preview because the page blocks external images and audio, so each slot shows a type-coloured marker. Open the self-hosted copy to see the animated sprites and hear the cries.'; n.hidden=false; }
  else n.hidden=true;
}
function renderAllButControls(){ renderCarts(); renderBox(); renderScreen(); renderLower(); }
function render(){ renderControls(); renderAllButControls(); renderNotice(); }

/* ---------- events ---------- */
$('prevBox').onclick=()=>{ const {i}=current(); SFX.box(); setSel(Math.floor(i/30)*30-30,true); };
$('nextBox').onclick=()=>{ const {i}=current(); SFX.box(); setSel(Math.floor(i/30)*30+30,true); };
/* Theme swatches live in the account menu (server) and behind a gear button (no server). Built once, then only
   their pressed state changes, so clicking one never removes the element under the pointer. */
function buildSwatches(el){
  THEMES.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='sw'; b.dataset.theme=t.k; b.title=t.n+' theme'; b.setAttribute('aria-label',t.n+' theme');
    b.style.setProperty('--sw1',`hsl(${t.h} ${Math.round(48*t.s)}% 22%)`); b.style.setProperty('--sw2',`hsl(${t.h} ${Math.round(47*t.s)}% 44%)`);
    b.onclick=e=>{ e.stopPropagation(); st.theme=t.k; localSave(); applyTheme(); SFX.tab(); syncSwatches(); }; el.appendChild(b); });
}
function syncSwatches(){ document.querySelectorAll('.sw[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String((st.theme||'blue')===b.dataset.theme))); }
buildSwatches($('themesAcct')); buildSwatches($('themes'));
function setThemePop(open){ $('themes').hidden=!open; $('themeBtn').setAttribute('aria-expanded',String(open)); }
$('themeBtn').onclick=e=>{ e.stopPropagation(); setAcctPop(false); setThemePop($('themes').hidden); };
document.addEventListener('click',e=>{ if(!e.target.closest('.themepick')) setThemePop(false); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') setThemePop(false); });
function setGames(open){ st.gamesOpen=open; save(); SFX.tab(); renderCarts(); }
$('allBtn').onclick=()=>setGames(!st.gamesOpen);
const POPS=[['dexBtn','dexPop']];
function closePops(except){ POPS.forEach(([b,p])=>{ if(p===except) return; $(p).hidden=true; $(b).setAttribute('aria-expanded','false'); }); }
POPS.forEach(([b,p])=>{ $(b).onclick=e=>{ e.stopPropagation(); const open=$(p).hidden; closePops(p); setThemePop(false); $(p).hidden=!open; $(b).setAttribute('aria-expanded',String(open)); if(open) SFX.tab(); }; });
document.addEventListener('click',e=>{ if(!e.target.closest('.tb-dd')) closePops(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closePops(); });
$('ovw').onchange=e=>{ st.view=e.target.checked?'over':'track'; save(); SFX.tab(); renderBox(); };
$('hl').onchange=e=>{ st.hl=e.target.checked; save(); SFX.tab(); renderBox(); };
$('quickBtn').onclick=()=>{ st.quick=!st.quick; save(); SFX.tab(); renderControls(); };
$('sndBtn').onclick=()=>{ st.sound=!st.sound; save(); if(st.sound) SFX.tab(); else if(cryAudio) cryAudio.pause(); renderControls(); };
$('noticeX').onclick=()=>{ st.noticeOff=true; save(); renderNotice(); };
$('lowerToggle').onclick=()=>{ st.lowerOpen=!st.lowerOpen; save(); SFX.tab(); renderLower(); };
document.querySelectorAll('.ltab').forEach(t=>t.onclick=()=>{ st.tab=t.dataset.t; save(); SFX.tab(); renderLower(); });
function boxConfirm(btn,label,fn){ if(btn.dataset.arm){ delete btn.dataset.arm; btn.textContent=label; fn(); return; } btn.dataset.arm='1'; btn.textContent='Confirm?'; setTimeout(()=>{ if(btn.dataset.arm){ delete btn.dataset.arm; btn.textContent=label; } },2500); }
function setBox(on){ const {g,v,list,i}=current(), f=Math.floor(i/30)*30; for(let k=f;k<Math.min(list.length,f+30);k++){ const e=list[k]; if(cset(g,v).has(e.key)!==on) setCaught(g,v,e,on); } (on?SFX.mark:SFX.unmark)(); renderAllButControls(); flash(on?'Box marked':'Box cleared'); }
$('fillBox').onclick=e=>boxConfirm(e.currentTarget,'Mark box',()=>setBox(true));
$('clearBox').onclick=e=>boxConfirm(e.currentTarget,'Clear box',()=>setBox(false));
$('searchForm').onsubmit=e=>{
  e.preventDefault(); const q=$('q').value.trim().toLowerCase(); if(!q) return;
  const {g,s,list}=current(), isNum=/^\d+$/.test(q);
  let j=list.findIndex(x=>isNum?regionalNo(g,s,x.sid)===+q:SP.get(x.sid).en.toLowerCase().startsWith(q));
  if(j<0&&isNum) j=list.findIndex(x=>x.sid===+q);
  if(j<0) j=list.findIndex(x=>SP.get(x.sid).en.toLowerCase().includes(q)||SP.get(x.sid).ja.includes(q));
  if(j<0){ SFX.err(); flash('Not in this Pokédex'); } else setSel(j);
};
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select')||document.body.classList.contains('sdmode')) return;
  const {i}=current(), m={ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6,PageUp:-30,PageDown:30}[e.key];
  if(m!=null){ e.preventDefault(); setSel(i+m); }
  else if(e.key===' '||e.key==='Enter'){ if(e.target.closest('button')) return; e.preventDefault(); toggle(i); }
});
document.addEventListener('pointerdown',()=>{ if(st.sound) ac(); },{once:true});
const backupJson=()=>JSON.stringify({v:2,caught:st.caught,det:st.det,log:st.log});
document.querySelector('details.backup').addEventListener('toggle',ev=>{ if(ev.target.open){ $('backupText').value=backupJson(); loadHistory(); } });
$('copyBk').onclick=()=>{ const ta=$('backupText'); ta.value=backupJson(); const p=navigator.clipboard?.writeText(ta.value); if(p) p.then(()=>flash('Backup copied')).catch(()=>{ ta.select(); flash('Select and copy the text'); }); else { ta.select(); flash('Select and copy the text'); } };
$('importBk').onclick=()=>{ try{ const d=JSON.parse($('backupText').value); if(!d||typeof d.caught!=='object') throw 0; st.caught=d.caught; st.det=d.det&&typeof d.det==='object'?d.det:{}; st.log=Array.isArray(d.log)?d.log:[]; save(); render(); flash('Backup imported'); }catch(_){ SFX.err(); flash('Invalid text: paste a backup copied from here'); } };

/* ---------- server sync + accounts (only when served by the LivingDex server) ---------- */
const SYNC={on:false,user:null,health:null,rev:0,lastHash:null,timer:0,busy:false,again:false,listeners:false};
const syncPayload=()=>({caught:st.caught,det:st.det,log:st.log,dexb:st.dexb});
function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+':'+s.length; }
const hasData=()=>Object.values(st.caught||{}).some(a=>Array.isArray(a)&&a.length)||Object.keys(st.det||{}).length>0;
const device=()=>(/iPhone|iPad|Android/.exec(navigator.userAgent)||['Desktop'])[0];
function setSync(s){ const el=$('syncSt'); if(!el) return; el.textContent=s?' · '+s.toUpperCase():''; el.dataset.s=s; }
class AuthError extends Error{}
async function api(method,path,body){
  const h={'Accept':'application/json','X-LivingDex':'1'}; if(body) h['Content-Type']='application/json';
  const r=await fetch(path,{method,headers:h,body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin'});
  if(r.status===401&&!path.startsWith('/api/auth/login')&&!path.startsWith('/api/auth/register')){ sessionEnded(); throw new AuthError('401'); }
  return r;
}
async function problemText(r,fallback){
  if(r.status===429) return 'Too many attempts. Wait a minute and try again.';
  try{ const j=await r.json(); return j.detail||j.title||fallback; }catch(_){ return fallback; }
}
function markSynced(){ SYNC.lastHash=hashStr(JSON.stringify(syncPayload())); st.syncRev=SYNC.rev; st.syncHash=SYNC.lastHash; localSave(); }
function adopt(data){ const d=data||{}; st.caught=d.caught&&typeof d.caught==='object'?d.caught:{}; st.det=d.det&&typeof d.det==='object'?d.det:{}; st.log=Array.isArray(d.log)?d.log:[]; st.dexb=d.dexb&&typeof d.dexb==='object'?d.dexb:st.dexb; }
function clearLocalProgress(){ st.caught={}; st.det={}; st.log=[]; delete st.dexb; st.sel={}; st.syncRev=0; st.syncHash=null; Object.keys(lookup).forEach(k=>delete lookup[k]); }
function mergeData(a,b){
  a=a||{}; b=b||{};
  const caught={}; new Set([...Object.keys(a.caught||{}),...Object.keys(b.caught||{})]).forEach(k=>{ caught[k]=[...new Set([...((a.caught||{})[k]||[]),...((b.caught||{})[k]||[])])]; });
  const det={...(a.det||{})}; Object.entries(b.det||{}).forEach(([k,v])=>{ const o=det[k]; if(!o||(v.mt||v.ts||0)>=(o.mt||o.ts||0)) det[k]=v; });
  const seen=new Set(), log=[...(a.log||[]),...(b.log||[])].filter(l=>{ const id=l.k+'@'+l.ts; if(seen.has(id)) return false; seen.add(id); return true; }).sort((x,y)=>y.ts-x.ts).slice(0,300);
  const dexb={...(a.dexb||{})}; Object.entries(b.dexb||{}).forEach(([k,v])=>{ if(!dexb[k]||v<dexb[k]) dexb[k]=v; });   // a badge keeps its first date
  return {caught,det,log,dexb};
}
function syncTouch(){ if(!SYNC.on||!SYNC.user) return; clearTimeout(SYNC.timer); SYNC.timer=setTimeout(push,700); }
async function push(){
  if(!SYNC.on||!SYNC.user) return;
  if(SYNC.busy){ SYNC.again=true; return; }
  const data=syncPayload(), h=hashStr(JSON.stringify(data));
  if(h===SYNC.lastHash){ setSync('synced'); return; }
  SYNC.busy=true; setSync('saving');
  try{
    const r=await api('PUT','/api/state',{revision:SYNC.rev,data,client:device()});
    if(r.ok){ const j=await r.json(); SYNC.rev=j.revision; SYNC.lastHash=h; st.syncRev=SYNC.rev; st.syncHash=h; localSave(); setSync('synced'); }
    else if(r.status===409){ const srv=await r.json(); adopt(mergeData(srv.data,syncPayload())); SYNC.rev=srv.revision; localSave(); renderAllButControls(); SYNC.again=true; }
    else { setSync('error'); clearTimeout(SYNC.timer); SYNC.timer=setTimeout(push,15000); }
  }catch(e){ if(!(e instanceof AuthError)){ setSync('offline'); clearTimeout(SYNC.timer); SYNC.timer=setTimeout(push,10000); } }
  finally{ SYNC.busy=false; if(SYNC.again&&SYNC.user){ SYNC.again=false; push(); } }
}
async function pull(first){
  if(!SYNC.on||!SYNC.user||SYNC.busy) return;
  let r; try{ r=await api('GET','/api/state'); }catch(e){ if(!(e instanceof AuthError)) setSync('offline'); return; }
  if(!r.ok){ setSync('error'); return; }
  const srv=await r.json();
  const localHash=hashStr(JSON.stringify(syncPayload()));
  const dirty=first ? (hasData()&&localHash!==st.syncHash) : localHash!==SYNC.lastHash;
  if(!first&&!dirty&&srv.revision===SYNC.rev){ setSync('synced'); return; }
  if(dirty){
    // Changes made on this device that the server has not seen yet: keep both sides, then upload.
    adopt(mergeData(srv.data,syncPayload())); SYNC.rev=srv.revision; localSave(); renderAllButControls(); push();
  } else {
    adopt(srv.data); SYNC.rev=srv.revision; markSynced(); renderAllButControls(); setSync('synced');
  }
}

/* -- session -- */
async function refreshHealth(){ try{ const r=await fetch('/api/health',{cache:'no-store'}); if(r.ok){ const j=await r.json(); if(j&&j.status==='ok'){ SYNC.health=j; return j; } } }catch(_){} return null; }
function startSession(me){
  if(st.syncUser!==me.id){ clearLocalProgress(); st.syncUser=me.id; }   // never mix two people's boxes on a shared device
  st.syncName=me.username; localSave();
  SYNC.user=me; SYNC.rev=st.syncRev||0; SYNC.lastHash=st.syncHash||null;
  hideLogin(); renderAccount(); render(); setSync('connecting'); pull(true); sdInit();
  if(!SYNC.listeners){
    SYNC.listeners=true;
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') pull(false); });
    setInterval(()=>{ if(document.visibilityState==='visible') pull(false); },60000);
    window.addEventListener('online',()=>pull(false));
  }
}
function sessionEnded(){
  if(!SYNC.user) return;
  SYNC.user=null; clearTimeout(SYNC.timer); setSync(''); sdStop();
  showLogin('in','Your session ended. Sign in again to keep saving.');
}
async function signOut(){
  try{ await api('POST','/api/auth/logout'); }catch(_){}
  SYNC.user=null; clearTimeout(SYNC.timer); clearLocalProgress(); st.syncUser=null; st.syncName=null; localSave(); setSync('');
  sdStop(); closeAccount(); showLogin('in');
}

/* -- login screen -- */
const LG={mode:'in'};
const TRAINERS=['Red','Blue','Leaf','Ethan','Lyra','Kris','Brendan','May','Lucas','Dawn','Barry','Hilbert','Hilda','Nate','Rosa','Calem','Serena','Elio','Selene','Hau','Victor','Gloria','Hop','Florian','Juliana','Nemona','Cynthia','Steven','Wallace','Lance','Misty','Brock','Cheren','Bianca','Hugh','Iris','Diantha','Leon','Marnie','Arven','Penny','Silver','Wally','Akari','Rei','Urbain','Lana','Mallow','Kiawe'];
// Any Gen I–V Pokémon (all have Black/White animated sprites), with a 1 in SHINY_ODDS chance of the shiny one.
const SHINY_ODDS=128, LAST_ANIMATED=649;
function lgStripText(){ return (LG.mode==='new'?'TRAINER CARD · NEW':'TRAINER CARD')+(LG.shiny?' · ★ SHINY':''); }
function lgSprite(){
  const n=1+Math.floor(Math.random()*LAST_ANIMATED), shiny=Math.random()<1/SHINY_ODDS, stg=$('lgStage');
  const dir=`${BASE}versions/generation-v/black-white/animated/`;
  const urls=shiny?[`${dir}shiny/${n}.gif`,`${dir}${n}.gif`]:[`${dir}${n}.gif`];
  stg.innerHTML=''; stg.classList.remove('shiny'); LG.shiny=false; LG.dex=n;
  const im=new Image(); im.alt=''; let i=0;
  im.onload=()=>{
    LG.shiny=shiny&&i===0;
    stg.classList.toggle('shiny',LG.shiny);
    if(LG.shiny) stg.insertAdjacentHTML('beforeend','<span class="star" aria-hidden="true">★</span>');
    $('lgStrip').textContent=lgStripText();
    im.style.setProperty('--nw',im.naturalWidth); stg.appendChild(im);
  };
  im.onerror=()=>{ i++; if(i<urls.length) im.src=urls[i]; else stg.innerHTML='<span class="ph"></span>'; };
  im.src=urls[0];
}
function lgMode(m){
  const reg=!SYNC.health||SYNC.health.registration;
  if(m==='new'&&!reg) m='in';
  LG.mode=m; const isNew=m==='new';
  $('lgTabIn').setAttribute('aria-selected',String(!isNew)); $('lgTabNew').setAttribute('aria-selected',String(isNew));
  $('lgTabNew').hidden=!reg; $('lgSwap').hidden=!reg;
  $('lgConfirmRow').hidden=!isNew; $('lgNewHint').hidden=!isNew||!!(SYNC.health&&SYNC.health.firstRun); $('lgRememberRow').hidden=isNew;
  $('lgPass').autocomplete=isNew?'new-password':'current-password';
  $('lgGo').textContent=isNew?'▶ CREATE ACCOUNT':'▶ SIGN IN';
  $('lgSwap').textContent=isNew?'HAVE AN ACCOUNT? SIGN IN':'NEW HERE? CREATE ACCOUNT';
  $('lgStrip').textContent=lgStripText();
  $('lgDex').textContent=isNew?(SYNC.health&&SYNC.health.firstRun?'Keeps saved progress':'Starts empty'):'Saved on server';
  $('lgFirst').hidden=!(isNew&&SYNC.health&&SYNC.health.firstRun);
  lgMsg(''); if(!LG.sprite){ LG.sprite=true; lgSprite(); $('lgUser').placeholder='e.g. '+TRAINERS[Math.floor(Math.random()*TRAINERS.length)]; }
}
function lgMsg(t,ok){ const m=$('lgMsg'); m.textContent=t||''; m.className='msg'+(ok?' ok':''); }
async function showLogin(mode,message){
  await refreshHealth();
  $('boot').hidden=true; $('app').hidden=true; $('login').hidden=false; closeAccount();
  lgMode(SYNC.health&&SYNC.health.firstRun?'new':(mode||'in'));
  if(message) lgMsg(message);
  setTimeout(()=>($('lgUser').value?$('lgPass'):$('lgUser')).focus(),0);
}
function hideLogin(){ $('boot').hidden=true; $('login').hidden=true; $('app').hidden=false; $('lgPass').value=''; $('lgPass2').value=''; }
$('lgTabIn').onclick=()=>lgMode('in'); $('lgTabNew').onclick=()=>lgMode('new');
$('lgSwap').onclick=()=>lgMode(LG.mode==='in'?'new':'in');
$('lgEye').onclick=()=>{ const p=$('lgPass'), show=p.type==='password'; p.type=show?'text':'password'; $('lgEye').textContent=show?'HIDE':'SHOW'; $('lgEye').setAttribute('aria-label',show?'Hide password':'Show password'); };
$('lgUser').oninput=e=>{ $('lgName').textContent=e.target.value.trim()||'—'; };
$('lgForm').onsubmit=async e=>{
  e.preventDefault();
  const u=$('lgUser').value.trim(), p=$('lgPass').value, isNew=LG.mode==='new';
  if(isNew&&!/^[A-Za-z0-9_.-]{3,24}$/.test(u)) return lgMsg('Username must be 3–24 letters, numbers, dots, dashes or underscores.');
  if(!u) return lgMsg('Type your username.');
  if(isNew&&p.length<8) return lgMsg('Password must have at least 8 characters.');
  if(!p) return lgMsg('Type your password.');
  if(isNew&&p!==$('lgPass2').value) return lgMsg("The two passwords don't match.");
  const btn=$('lgGo'); btn.disabled=true; lgMsg(isNew?'Creating your account…':'Signing in…',true);
  try{
    const r=await api('POST',isNew?'/api/auth/register':'/api/auth/login',{username:u,password:p,remember:isNew||$('lgRemember').checked});
    if(!r.ok){ SFX.err(); lgMsg(await problemText(r,'Could not sign in.')); return; }
    const me=await r.json(); SFX.mark(); startSession(me);
    flash(isNew?`Welcome, ${me.username}!`:`Welcome back, ${me.username}!`);
  }catch(_){ lgMsg('Could not reach the server. Check your connection and try again.'); }
  finally{ btn.disabled=false; }
};

/* -- account menu + dialogs -- */
function renderAccount(){
  const on=!!SYNC.user; $('acct').hidden=!on; if(!on) return;
  $('acctBtn').textContent=SYNC.user.username.slice(0,1).toUpperCase();
  $('acctBtn').title=`Signed in as ${SYNC.user.username}`;
  $('acctName').textContent=SYNC.user.username;
  $('acctRole').textContent=SYNC.user.isAdmin?'ADMIN':'TRAINER';
  $('acctUsers').hidden=!SYNC.user.isAdmin; $('acctAssets').hidden=!SYNC.user.isAdmin;
}
function setAcctPop(open){ $('acctPop').hidden=!open; $('acctBtn').setAttribute('aria-expanded',String(open)); }
function closeAccount(){ setAcctPop(false); $('modal').hidden=true; }
$('acctBtn').onclick=e=>{ e.stopPropagation(); setThemePop(false); setAcctPop($('acctPop').hidden); };
document.addEventListener('click',e=>{ if(!e.target.closest('.acct')) setAcctPop(false); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ setAcctPop(false); if(!$('modal').hidden) $('modal').hidden=true; } });
$('acctOut').onclick=signOut;
$('modalX').onclick=()=>{ $('modal').hidden=true; };
$('modal').addEventListener('click',e=>{ if(e.target===$('modal')) $('modal').hidden=true; });
function openModal(title,html){ setAcctPop(false); $('modalTitle').textContent=title; $('modalBody').innerHTML=html; $('modal').hidden=false; const f=$('modalBody').querySelector('input,button'); if(f) setTimeout(()=>f.focus(),0); }
const field=(id,label,type,ac)=>`<label class="hex"><span class="in"><span class="chip">${label}</span><input id="${id}" type="${type}" autocomplete="${ac}"></span></label>`;
$('acctPass').onclick=()=>{
  openModal('Change password',`<form id="pwForm" class="mform" novalidate>${field('pwCur','CURRENT','password','current-password')}${field('pwNew','NEW','password','new-password')}${field('pwNew2','CONFIRM','password','new-password')}
    <p class="hint">Other devices signed in to this account will be signed out.</p><div class="msg" id="pwMsg" aria-live="polite"></div><button class="bt go" type="submit">▶ SAVE PASSWORD</button></form>`);
  $('pwForm').onsubmit=async e=>{
    e.preventDefault(); const m=$('pwMsg'); m.className='msg';
    const cur=$('pwCur').value, nw=$('pwNew').value;
    if(nw.length<8) return m.textContent='The new password must have at least 8 characters.';
    if(nw!==$('pwNew2').value) return m.textContent="The two new passwords don't match.";
    try{ const r=await api('POST','/api/auth/password',{currentPassword:cur,newPassword:nw}); if(!r.ok){ m.textContent=await problemText(r,'Could not change the password.'); return; } $('modal').hidden=true; flash('Password changed'); }
    catch(_){ m.textContent='Could not reach the server.'; }
  };
};
$('acctDelete').onclick=()=>{
  openModal('Delete account',`<form id="delForm" class="mform" novalidate><p class="warnp">This deletes <b>${esc(SYNC.user.username)}</b> and every box, detail and saved version on the server. It can't be undone. Copy a backup first if you might want it later.</p>
    ${field('delPass','PASSWORD','password','current-password')}<div class="msg" id="delMsg" aria-live="polite"></div><button class="bt danger" type="submit">✕ DELETE MY ACCOUNT</button></form>`);
  $('delForm').onsubmit=async e=>{
    e.preventDefault(); const m=$('delMsg');
    try{ const r=await api('POST','/api/auth/delete-account',{password:$('delPass').value}); if(!r.ok){ m.textContent=await problemText(r,'Could not delete the account.'); return; }
      SYNC.user=null; clearLocalProgress(); st.syncUser=null; st.syncName=null; localSave(); closeAccount(); showLogin('in','Your account was deleted.'); }
    catch(_){ m.textContent='Could not reach the server.'; }
  };
};
$('acctUsers').onclick=()=>{ openModal('Users','<p class="hint">Loading…</p>'); loadUsers(); };
async function loadUsers(){
  const box=$('modalBody');
  try{
    const r=await api('GET','/api/admin/users'); if(!r.ok) throw 0; const users=await r.json();
    const reg=SYNC.health&&SYNC.health.registration;
    box.innerHTML=`<p class="hint">${users.length} account${users.length===1?'':'s'} · new accounts are ${reg?'<b>open</b>':'<b>closed</b>'} (set LivingDex__AllowRegistration in docker-compose.yml).</p><ul class="ulist" id="ulist"></ul><div class="msg" id="uMsg" aria-live="polite"></div>`;
    const ul=$('ulist');
    users.forEach(u=>{
      const li=document.createElement('li'); const self=u.id===SYNC.user.id;
      li.innerHTML=`<div class="un"><span class="nm1"><b>${esc(u.username)}</b>${u.isAdmin?'<span class="badge">ADMIN</span>':''}${self?'<span class="badge you">YOU</span>':''}</span><small>${u.caught} marked · ${u.lastLoginAt?'last in '+esc(new Date(u.lastLoginAt).toLocaleDateString()):'never signed in'}</small></div><div class="ua"></div>`;
      if(!self){
        const rs=document.createElement('button'); rs.type='button'; rs.className='btn'; rs.textContent='Reset password';
        rs.onclick=()=>boxConfirm(rs,'Reset password',async()=>{
          try{ const r=await api('POST',`/api/admin/users/${u.id}/reset-password`); if(!r.ok){ $('uMsg').textContent=await problemText(r,'Could not reset.'); return; }
            const j=await r.json(); $('uMsg').className='msg ok'; $('uMsg').innerHTML=`Temporary password for <b>${esc(u.username)}</b>: <code class="tmp">${esc(j.temporaryPassword)}</code> — give it to them; they can change it after signing in.`; }
          catch(_){ $('uMsg').textContent='Could not reach the server.'; }
        });
        const dl=document.createElement('button'); dl.type='button'; dl.className='btn warn'; dl.textContent='Delete';
        dl.onclick=()=>boxConfirm(dl,'Delete',async()=>{
          try{ const r=await api('DELETE',`/api/admin/users/${u.id}`); if(!r.ok){ $('uMsg').textContent=await problemText(r,'Could not delete.'); return; } flash(`${u.username} deleted`); loadUsers(); }
          catch(_){ $('uMsg').textContent='Could not reach the server.'; }
        });
        li.querySelector('.ua').append(rs,dl);
      }
      ul.appendChild(li);
    });
  }catch(e){ if(!(e instanceof AuthError)) box.innerHTML='<p class="hint">Could not load the users.</p>'; }
}

/* ---------- admin: download every asset into the server cache ---------- */
const FX_FILES='alpha angry bg-beach bg-beachshore bg-city bg-dampcave bg-deepsea bg-desert bg-earthycave bg-forest bg-gen1-spl bg-gen1 bg-gen2-spl bg-gen2 bg-gen3-arena bg-gen3-cave bg-gen3-forest bg-gen3-ocean bg-gen3-sand bg-gen3-spl bg-gen3 bg-gen4-cave bg-gen4-indoors bg-gen4-snow bg-gen4-spl bg-gen4-water bg-gen4 bg-icecave bg-meadow bg-mountain bg-npa bg-river bg-route bg-scl bg-space.jpg bg-spl bg-thunderplains bg-volcanocave bg-wcop blackwisp bluefireball bone bottombite caltrop electroball energyball feather fireball fist fist1 flareball foot gear greenmetal1 greenmetal2 heart hitmarker iceball icicle-pink icicle impact leaf1 leaf2 leftchop leftclaw leftslash lightning mistball moon mudwisp omega petal pointer poisoncaltrop pokeball purplewisp rainbow rightchop rightclaw rightslash rock1 rock2 rock3 rocks shadowball shell shine stare sword topbite ultra waterwisp weather-electricterrain weather-hail weather-psychicterrain weather-raindance.jpg weather-sunnyday.jpg weather-trickroom web wisp z-symbol'.split(' ').map(f=>/\.jpg$/.test(f)?f:f+'.png');
/* Every file the app can ask for, as fallback chains of "kind/path" (the server keeps the first one that exists). */
function assetList(){
  const out=[], S='sprites/', bw=S+'versions/generation-v/black-white/', add=(...c)=>out.push(c);
  const ents=[];
  ALL_IDS.forEach(id=>{ ents.push({sid:id,sk:String(id),fe:''}); if(GDIFF.has(id)) ents.push({sid:id,sk:String(id),fe:'female/'}); (FORMS.get(id)||[]).forEach(f=>ents.push({sid:id,sk:f.sk,fe:''})); });
  ents.forEach(({sid,sk,fe})=>['','shiny/'].forEach(sh=>{
    add(bw+sh+fe+sk+'.png',S+sh+fe+sk+'.png',...(fe?[S+sh+sk+'.png']:[]));            // boxes, cards, static sprites
    if(sid<=649){ add(bw+'animated/'+sh+fe+sk+'.gif'); add(bw+'animated/back/'+sh+fe+sk+'.gif'); }   // top screen, sign-in, battles
    if(!fe) add(bw+'back/'+sh+sk+'.png',S+'back/'+sh+sk+'.png');                     // battle back sprites
  }));
  ents.filter(e=>!e.fe).forEach(({sid,sk})=>add(S+'versions/generation-vii/icons/'+sk+'.png',S+'versions/generation-vii/icons/'+sid+'.png',S+'versions/generation-viii/icons/'+sid+'.png'));
  const MAXG={1:151,2:251,3:386,4:493};                                             // Showdown Gen 1–4 sprites
  Object.entries(RETRO).forEach(([g,r])=>{ for(let id=1;id<=MAXG[g];id++) ['','back/'].forEach(b=>(r.shiny?['','shiny/']:['']).forEach(sh=>add(S+'versions/'+r.dir+b+sh+id+'.png'))); });
  ALL_IDS.forEach(id=>id<=649?add('cries/legacy/'+id+'.ogg','cries/latest/'+id+'.ogg'):add('cries/latest/'+id+'.ogg'));
  FX_FILES.forEach(f=>add('battlebg/fx/'+f));
  SDM.tracks().forEach(t=>add('music/'+t+'.mp3'));
  return out;
}
let assetPoll=0;
$('acctAssets').onclick=()=>{ openModal('Download all assets','<p class="hint">Checking…</p>'); assetStatus(); };
async function assetStatus(){
  clearTimeout(assetPoll);
  const box=$('modalBody'); if($('modal').hidden||$('modalTitle').textContent!=='Download all assets') return;
  let s=null; try{ const r=await api('GET','/api/admin/assets/status'); if(r.ok) s=await r.json(); }catch(_){}
  const mb=b=>b>=1048576?(b/1048576).toFixed(1)+' MB':Math.round(b/1024)+' KB';
  const pctDone=s&&s.total?Math.floor(s.done*100/s.total):0;
  const stats=s&&s.total?`<p class="hint">${s.done.toLocaleString()} / ${s.total.toLocaleString()} · ${s.downloaded.toLocaleString()} downloaded (${mb(s.bytes)}) · ${s.cached.toLocaleString()} already here · ${s.missing.toLocaleString()} don't exist upstream${s.failed?` · <b>${s.failed} failed</b>`:''}</p>`:'';
  const bar=s&&s.total?`<div class="abar"><i style="width:${pctDone}%"></i></div>`:'';
  if(s&&s.running){
    box.innerHTML=`<p class="hint">Downloading into the server cache. You can close this window — it keeps going on the server.</p>${bar}${stats}<div style="display:flex;gap:8px"><button class="btn warn" type="button" id="assetStop">Stop</button></div>`;
    $('assetStop').onclick=async()=>{ try{ await api('POST','/api/admin/assets/cancel'); }catch(_){} assetStatus(); };
    assetPoll=setTimeout(assetStatus,1500); return;
  }
  const last=s&&s.finishedAt?`<p class="hint">Last run ${s.cancelled?'stopped':'finished'} ${esc(new Date(s.finishedAt).toLocaleString())}.</p>${bar}${stats}`:'';
  box.innerHTML=`<p class="hint">Fetches every sprite (boxes, animated, shiny, female, back, icons and the Gen 1–4 battle sprites), every cry, the battle backgrounds and effects and the battle music, so the site works fast and without depending on GitHub or Showdown later. About 16,000 files and a few hundred MB; it takes several minutes. Files already in the cache are skipped, so running it again only picks up what's new.</p>${last}<div style="display:flex;gap:8px"><button class="btn" type="button" id="assetGo">${s&&s.finishedAt?'Run again':'Start download'}</button></div><div class="msg" id="assetMsg" aria-live="polite"></div>`;
  $('assetGo').onclick=async e=>{
    e.currentTarget.disabled=true;
    try{ const r=await api('POST','/api/admin/assets/download',{items:assetList()}); if(!r.ok){ $('assetMsg').textContent=await problemText(r,'Could not start the download.'); e.currentTarget.disabled=false; return; } SFX.tab(); assetStatus(); }
    catch(_){ $('assetMsg').textContent='Could not reach the server.'; }
  };
}

async function syncInit(){
  const health=await refreshHealth();
  if(!health){ $('boot').hidden=true; $('app').hidden=false; probeSprites(); return; }   // no server (e.g. the claude.ai preview): local-only mode
  SYNC.on=true; BASE='/assets/sprites/'; CRY='/assets/cries/'; $('localSettings').hidden=true;   // the theme lives in the account menu
  $('srvHist').hidden=false;
  document.querySelector('details.backup .note').textContent='Progress is saved on your server and synced to every device. You can also copy it as text below, or paste a backup to import it.';
  probeSprites();
  let me=null, offline=false;
  try{ const r=await fetch('/api/auth/me',{cache:'no-store',credentials:'same-origin'}); if(r.ok) me=await r.json(); else if(r.status!==401) offline=true; }catch(_){ offline=true; }
  if(me) startSession(me);
  else if(offline&&st.syncUser){ $('boot').hidden=true; $('app').hidden=false; setSync('offline'); setTimeout(syncInit,10000); }   // keep showing the cached boxes until the server answers
  else showLogin('in');
}
async function loadHistory(){
  if(!SYNC.on||!SYNC.user) return; const ul=$('histList'); ul.innerHTML='<li class="note">Loading…</li>';
  try{
    const r=await api('GET','/api/history?take=20'); if(!r.ok) throw 0; const items=await r.json(); ul.innerHTML='';
    if(!items.length){ ul.innerHTML='<li class="note">No saved versions yet.</li>'; return; }
    items.forEach(it=>{
      const li=document.createElement('li');
      li.innerHTML=`<span>r${it.revision} · ${esc(new Date(it.updatedAt).toLocaleString())} · ${it.caught} marked${it.client?' · '+esc(it.client):''}</span>`;
      const b=document.createElement('button'); b.className='btn'; b.type='button';
      if(it.revision===SYNC.rev){ b.textContent='Current'; b.disabled=true; } else { b.textContent='Restore'; b.onclick=()=>boxConfirm(b,'Restore',()=>restore(it.revision)); }
      li.appendChild(b); ul.appendChild(li);
    });
  }catch(_){ ul.innerHTML='<li class="note">Could not load the history.</li>'; }
}
async function restore(rev){
  try{ const r=await api('POST',`/api/history/${rev}/restore`); if(!r.ok) throw 0; const j=await r.json(); adopt(j.data); SYNC.rev=j.revision; markSynced(); renderAllButControls(); setSync('synced'); flash(`Restored version r${rev}`); loadHistory(); }
  catch(_){ SFX.err(); flash('Could not restore that version'); }
}
