/* ===================================================================
   Five Birthdays at Daniel's
   A from-scratch recreation of the classic "five nights" gameplay loop:
   power management, two doors + lights, a camera system, four monsters
   with per-night AI levels, the dark "main mover", a Pirate-Cove sprinter,
   power-out sequence, jumpscares and a 12AM -> 6AM clock.

   All art/UI is original CSS. Character art is loaded from /assets.
   See assets/README.md for the file each monster expects.
   =================================================================== */

(() => {
"use strict";

/* ---------------------------------------------------------------
   CHARACTER CONFIG  -- rename / re-point images here freely.
   role:
     'left'   -> approaches the LEFT door  (block by closing left door)
     'right'  -> approaches the RIGHT door (block by closing right door)
     'dark'   -> only moves while you are NOT watching it on cams (right door)
     'cove'   -> hides in Pirate Cove, sprints the west hall (left door)
   --------------------------------------------------------------- */
const CHARACTERS = {
  daniel: { name:"Daniel", role:"dark",  img:"assets/daniel.png", color:"#39c46a" }, // the face of the game
  bruno:  { name:"gut genug",     role:"left",  img:"assets/bruno.png",  color:"#9aa0a6" },
  cole:   { name:"excuse me sir", role:"right", img:"assets/cole.png",   color:"#d98ad0" },
  jett:   { name:"get in the car",role:"cove",  img:"assets/jett.png",   color:"#e0a73c" },
};

/* ---------------------------------------------------------------
   ROOMS / CAMERA MAP   (faithful layout to the original 11 cams)
   --------------------------------------------------------------- */
const ROOMS = {
  "1A":{ name:"Show Stage",        x:62, y:6,  w:30, h:20 },
  "1B":{ name:"Dining Area",       x:50, y:30, w:42, h:18 },
  "1C":{ name:"Pirate Cove",       x:50, y:52, w:24, h:16 },
  "5" :{ name:"Backstage",         x:78, y:30, w:14, h:18 },
  "7" :{ name:"Restrooms",         x:78, y:52, w:14, h:16 },
  "6" :{ name:"Kitchen",           x:78, y:72, w:14, h:16, audio:true },
  "4A":{ name:"E. Hall",           x:60, y:72, w:14, h:16 },
  "4B":{ name:"E. Hall Corner",    x:60, y:90, w:14, h:8  },
  "2A":{ name:"W. Hall",           x:30, y:72, w:14, h:16 },
  "2B":{ name:"W. Hall Corner",    x:30, y:90, w:14, h:8  },
  "3" :{ name:"Supply Closet",     x:30, y:52, w:14, h:16 },
};
const CAM_ORDER = ["1A","1B","1C","5","7","6","4A","4B","2A","2B","3"];

/* Movement paths toward the office. Each monster walks these room nodes;
   the final node is the door blind-spot. */
const PATHS = {
  left:  ["1A","1B","3","2A","2B","LEFT_DOOR"],   // -> left door
  right: ["1A","1B","7","4A","4B","RIGHT_DOOR"],  // -> right door
  dark:  ["1A","1B","7","4A","4B","RIGHT_DOOR"],  // Daniel -> right door
};

/* Per-night AI levels (1..20 style). Higher = moves more often. */
const NIGHT_AI = {
  1:{ daniel:0,  bruno:0,  cole:0,  jett:1 },
  2:{ daniel:1,  bruno:3,  cole:1,  jett:2 },
  3:{ daniel:2,  bruno:4,  cole:5,  jett:4 },
  4:{ daniel:3,  bruno:6,  cole:6,  jett:6 },   // (3-4 randomly bumped at runtime)
  5:{ daniel:5,  bruno:9,  cole:8,  jett:9 },
  6:{ daniel:10, bruno:13, cole:12, jett:13 },  // bonus "extra" night
};
const MAX_NIGHT = 5;

/* timing */
const HOUR_MS   = 50000;   // real ms per in-game hour (12->1, ... 5->6)
const MOVE_MS   = 4800;    // base ms between monster movement checks
const POWER_TICK_MS = 480; // power drain cadence

/* ---------------------------------------------------------------
   AUDIO  -- generated with WebAudio so there are no copyrighted clips.
   --------------------------------------------------------------- */
const Sound = (() => {
  let ctx=null;
  const ac = () => (ctx || (ctx = new (window.AudioContext||window.webkitAudioContext)()));
  function tone(freq, dur, type="sine", gain=0.2, slideTo=null){
    try{
      const c=ac(); const o=c.createOscillator(); const g=c.createGain();
      o.type=type; o.frequency.value=freq;
      if(slideTo) o.frequency.linearRampToValueAtTime(slideTo, c.currentTime+dur);
      g.gain.value=gain; g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+dur);
    }catch(e){}
  }
  function noise(dur, gain=0.4){
    try{
      const c=ac(); const n=c.createBufferSource();
      const buf=c.createBuffer(1, c.sampleRate*dur, c.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
      n.buffer=buf; const g=c.createGain(); g.gain.value=gain;
      g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
      n.connect(g).connect(c.destination); n.start(); n.stop(c.currentTime+dur);
    }catch(e){}
  }
  return {
    resume(){ try{ ac().resume(); }catch(e){} },
    blip(){ tone(880,0.05,"square",0.05); },
    doorThud(){ tone(70,0.25,"sawtooth",0.3,40); noise(0.12,0.15); },
    lightHum(){ tone(120,0.12,"square",0.04); },
    camOn(){ noise(0.18,0.25); tone(220,0.1,"square",0.05); },
    knock(){ tone(60,0.18,"square",0.3,45); },
    chime(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.5,"triangle",0.18),i*180)); },
    sixAM(){ [880,880,1174].forEach((f,i)=>setTimeout(()=>tone(f,0.3,"square",0.2),i*250)); },
    musicBox(){ // creepy descending toy-box motif
      const notes=[659,587,523,587,659,659,659];
      notes.forEach((f,i)=>setTimeout(()=>tone(f,0.4,"triangle",0.12),i*350));
    },
    scream(){ noise(0.9,0.6); tone(300,0.9,"sawtooth",0.4,80); tone(1200,0.5,"square",0.2,200); },
  };
})();

/* ---------------------------------------------------------------
   STATE
   --------------------------------------------------------------- */
const save = {
  get maxUnlocked(){ return Math.max(1, +localStorage.getItem("fbad_unlocked")||1); },
  set maxUnlocked(v){ localStorage.setItem("fbad_unlocked", Math.max(this.maxUnlocked,v)); },
  get beat6(){ return localStorage.getItem("fbad_beat6")==="1"; },
  set beat6(v){ if(v) localStorage.setItem("fbad_beat6","1"); },
  get customUnlocked(){ return localStorage.getItem("fbad_custom")==="1"; },
  set customUnlocked(v){ if(v) localStorage.setItem("fbad_custom","1"); },
};

/* last-chosen Custom Night (Night 7) A.I. levels, 0..20 each */
let customAI = { daniel:0, bruno:0, cole:0, jett:0 };

let S = null; // active game state, created per night

function freshState(night, custom){
  const ai = custom ? {...custom}
                    : JSON.parse(JSON.stringify(NIGHT_AI[night] || NIGHT_AI[5]));
  // small random night-4 bump like the original
  if(night===4){ if(Math.random()<0.5) ai.bruno++; if(Math.random()<0.5) ai.daniel++; }
  return {
    night,
    hour:12, hourProgress:0,
    power:100, drain:0,
    leftDoor:false, rightDoor:false, leftLight:false, rightLight:false,
    camUp:false, currentCam:"1A",
    pan:0,                        // office horizontal pan -1..1
    ai,
    monsters:{
      daniel:{ key:"daniel", pos:0, atDoor:false, attackT:0 },
      bruno: { key:"bruno",  pos:0, atDoor:false, attackT:0 },
      cole:  { key:"cole",   pos:0, atDoor:false, attackT:0 },
      jett:  { key:"jett",   cove:0, running:false, runT:0 }, // cove stages 0..3
    },
    powerOut:false, powerOutT:0, danielJingle:false,
    over:false, won:false,
    timers:[],
  };
}

/* ---------------------------------------------------------------
   DOM helpers
   --------------------------------------------------------------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function show(id){
  $$(".screen").forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
}
/* monster background helper: real image, css fallback if it 404s */
function monsterBG(key){
  const c = CHARACTERS[key];
  return c.img;
}

/* =================================================================
   MENU + NAVIGATION
   ================================================================= */
function buildMenu(){
  // disable continue if nothing unlocked beyond 1
  const cont = $('.menu-list li[data-action="continue"]');
  if(save.maxUnlocked<=1) cont.classList.add("disabled"); else cont.classList.remove("disabled");

  // Custom Night (Night 7) appears only after the Bonus Night is beaten
  const cn = $('.menu-list li[data-action="customnight"]');
  if(cn) cn.classList.toggle("disabled", !save.customUnlocked);

  $$(".menu-list li").forEach(li=>{
    li.onclick = () => {
      if(li.classList.contains("disabled")) return;
      Sound.resume(); Sound.blip();
      const a=li.dataset.action;
      if(a==="new"){ startNight(1); }
      else if(a==="continue"){ startNight(save.maxUnlocked); }
      else if(a==="custom"){ buildNightSelect(); show("nightselect"); }
      else if(a==="customnight"){ buildCustomNight(); show("customnight"); }
      else if(a==="howto"){ show("howto"); }
    };
  });
}

/* Custom Night (Night 7): pick each monster's A.I. level 0..20, like the original */
function buildCustomNight(){
  const wrap=$("#custom-cards"); wrap.innerHTML="";
  ["daniel","bruno","cole","jett"].forEach(key=>{
    const c=CHARACTERS[key];
    const card=document.createElement("div");
    card.className="cc-card";
    card.innerHTML=`
      <div class="cc-name">${c.name}</div>
      <div class="cc-portrait" style="background-image:url('${c.img}')"></div>
      <div class="cc-ailabel">A.I. Level</div>
      <div class="cc-controls">
        <button class="cc-arrow" data-d="-1">&lsaquo;</button>
        <span class="cc-level" id="lvl-${key}">${customAI[key]}</span>
        <button class="cc-arrow" data-d="1">&rsaquo;</button>
      </div>`;
    const span=card.querySelector(".cc-level");
    card.querySelectorAll(".cc-arrow").forEach(b=>{
      b.onclick=()=>{
        Sound.blip();
        customAI[key]=Math.max(0, Math.min(20, customAI[key] + (+b.dataset.d)));
        span.textContent=customAI[key];
      };
    });
    wrap.appendChild(card);
  });
  $("#custom-ready").onclick=()=>{ Sound.resume(); Sound.blip(); startNight(7, {...customAI}); };
}
function buildNightSelect(){
  const wrap=$("#night-buttons"); wrap.innerHTML="";
  const total = save.beat6 ? 6 : 5;
  for(let n=1;n<=total;n++){
    const b=document.createElement("button");
    const locked = n>save.maxUnlocked;
    b.innerHTML = `${n>=6?"&#9733;":n}<span class="nlbl">${n===6?"BONUS":"NIGHT"}</span>`;
    b.disabled = locked;
    b.onclick = () => { Sound.resume(); startNight(n); };
    wrap.appendChild(b);
  }
}
function bindNav(){
  $$('[data-action="back-menu"]').forEach(b=>b.onclick=()=>{ stopGame(); show("menu"); buildMenu(); });
  $('[data-action="win-continue"]').onclick=()=>{ show("menu"); buildMenu(); };
  $('[data-action="retry"]').onclick=()=>{ startNight(S? S.night : 1); };
}

/* =================================================================
   NIGHT START
   ================================================================= */
function startNight(night, custom){
  stopGame();
  // Night 7 always uses the Custom Night levels (even on retry)
  if(night===7 && !custom) custom = {...customAI};
  S = freshState(night, custom);
  $("#intro-num").textContent = night;
  show("intro");
  setTimeout(()=>{ if(S) beginPlay(); }, 2200);
}

function beginPlay(){
  show("play");
  buildMap();
  closeMonitor();
  resetOfficeDOM();
  bindOfficeControls();
  renderHUD();
  // master loops
  const loop = setInterval(tick, 100);
  const move = setInterval(moveMonsters, MOVE_MS);
  const pw   = setInterval(drainPower, POWER_TICK_MS);
  S.timers.push(loop, move, pw);
}

function stopGame(){
  if(S){ S.timers.forEach(clearInterval); S.timers=[]; }
}

/* =================================================================
   OFFICE CONTROLS  (doors / lights / panning / cameras)
   ================================================================= */
function resetOfficeDOM(){
  ["left","right"].forEach(s=>{
    $(`#${s}-door-panel`).classList.remove("closed");
    $(`#btn-${s}-door`).classList.remove("active");
    $(`#btn-${s}-light`).classList.remove("active");
    $(`.${s}-hall`).classList.remove("on");
    $(`#peek-${s}`).classList.remove("show");
  });
  $("#office").style.transform="translateX(0)";
  $("#blackout").classList.remove("on");
  $("#jumpscare").classList.remove("show"); $("#jumpscare").innerHTML="";
}

function bindOfficeControls(){
  $("#btn-left-door").onclick  = ()=>toggleDoor("left");
  $("#btn-right-door").onclick = ()=>toggleDoor("right");
  $("#btn-left-light").onclick  = ()=>flickLight("left");
  $("#btn-right-light").onclick = ()=>flickLight("right");
  $("#cam-flip").onclick = ()=> S.camUp ? closeMonitor() : openMonitor();

  // panning by moving the mouse to screen edges
  const vp=$("#play");
  vp.onmousemove = e=>{
    if(S.camUp) return;
    const x=e.clientX / window.innerWidth;
    if(x<0.18) setPan(-1);
    else if(x>0.82) setPan(1);
    else setPan(0);
  };
  $(".pan-left").onclick = ()=> setPan(-1);
  $(".pan-right").onclick = ()=> setPan(1);

  // swipe up to raise monitor, swipe down to lower it
  let _sy=null, _sx=null;
  vp.addEventListener("pointerdown", e=>{ _sy=e.clientY; _sx=e.clientX; });
  vp.addEventListener("pointerup", e=>{
    if(_sy===null || !S || S.over || S.won || S.powerOut){ _sy=_sx=null; return; }
    const dy=_sy-e.clientY, dx=Math.abs(e.clientX-_sx);
    _sy=_sx=null;
    if(Math.abs(dy)<70 || Math.abs(dy)<dx*1.5) return; // must be mostly vertical
    if(dy>0 && !S.camUp) openMonitor();
    else if(dy<0 && S.camUp) closeMonitor();
  });
  vp.addEventListener("pointercancel",()=>{ _sy=_sx=null; });
}

function setPan(dir){
  if(!S) return;
  S.pan=dir;
  const off = dir<0 ? 0 : dir>0 ? -37.5 : -18.75; // shift the 160% office
  $("#office").style.transform = `translateX(${off}%)`;
}

function toggleDoor(side){
  if(!S || S.powerOut) return;
  const key = side+"Door";
  S[key] = !S[key];
  $(`#${side}-door-panel`).classList.toggle("closed", S[key]);
  $(`#btn-${side}-door`).classList.toggle("active", S[key]);
  Sound.doorThud();
}

function flickLight(side){
  if(!S || S.powerOut) return;
  const key=side+"Light";
  S[key]=!S[key];
  $(`.${side}-hall`).classList.toggle("on", S[key]);
  $(`#btn-${side}-light`).classList.toggle("active", S[key]);
  // turning the other light off when one turns on (like the original you can only check one effectively)
  if(S[key]) Sound.lightHum();
  updatePeeks();
}

/* show a monster silhouette in the door blind-spot if the light is on
   and a door-monster is standing there */
function updatePeeks(){
  ["left","right"].forEach(side=>{
    const peek=$(`#peek-${side}`);
    let present=false;
    for(const k in S.monsters){
      const m=S.monsters[k]; const role=CHARACTERS[k].role;
      const atThisDoor =
        ((role==="left") && side==="left" && m.atDoor) ||
        ((role==="right"||role==="dark") && side==="right" && m.atDoor) ||
        (role==="cove" && side==="left" && m.running && m.runT>0);
      if(atThisDoor){ present=true; peek.style.backgroundImage=`url('${CHARACTERS[k].img}')`; break; }
    }
    peek.classList.toggle("show", present && S[side+"Light"]);
  });
}

/* =================================================================
   CAMERA MONITOR
   ================================================================= */
function buildMap(){
  const map=$("#cam-map"); map.innerHTML="";
  for(const id of CAM_ORDER){
    const r=ROOMS[id];
    const el=document.createElement("div");
    el.className="map-room"+(r.audio?" audio":"");
    el.style.left=r.x+"%"; el.style.top=r.y+"%"; el.style.width=r.w+"%"; el.style.height=r.h+"%";
    el.textContent=id+(r.audio?" (audio)":"");
    el.dataset.cam=id;
    el.onclick=()=>switchCam(id);
    map.appendChild(el);
  }
  const office=document.createElement("div");
  office.className="map-office";
  office.style.left="44%"; office.style.top="90%"; office.style.width="16%"; office.style.height="8%";
  office.textContent="OFFICE";
  map.appendChild(office);
}

function openMonitor(){
  if(!S || S.powerOut) return;
  S.camUp=true; setPan(0);
  $("#monitor").classList.add("open");
  $("#cam-flip").querySelector("span").textContent="CLOSE";
  Sound.camOn();
  switchCam(S.currentCam);
}
function closeMonitor(){
  if(!S) return;
  S.camUp=false;
  $("#monitor").classList.remove("open");
  const span=$("#cam-flip").querySelector("span"); if(span) span.textContent="CAMERAS";
}

function switchCam(id){
  if(!S) return;
  S.currentCam=id;
  const r=ROOMS[id];
  $("#cam-label").textContent="CAM "+id;
  $("#cam-title").textContent=r.name;
  const img=$("#cam-image"); img.innerHTML=""; img.style.backgroundImage="";
  Sound.camOn();
  // mark active room on map + show who's here
  $$(".map-room").forEach(el=>{
    el.classList.toggle("active", el.dataset.cam===id);
    el.classList.remove("here");
  });
  // render any monsters standing in this room, side by side
  if(!r.audio){
    const present=[];
    for(const k in S.monsters){
      const m=S.monsters[k]; const role=CHARACTERS[k].role;
      let roomHere=null;
      if(role==="cove"){
        roomHere=(m.cove<3 && !m.running)?"1C":null;
      }else{
        const path=PATHS[role];
        const node=path[m.pos];
        if(node && ROOMS[node]) roomHere=node;
      }
      if(roomHere===id) present.push({k,m,role});
    }
    const n=present.length;
    present.forEach(({k,m,role},i)=>{
      const mon=document.createElement("div");
      mon.className="cam-monster";
      mon.style.backgroundImage=`url('${CHARACTERS[k].img}')`;
      // size: shrink as more monsters share the frame
      const w = role==="cove" ? 40 : n===1 ? 55 : n===2 ? 38 : 28;
      mon.style.width=`${w}%`;
      // distribute evenly across the feed width
      const leftPct=((i+1)/(n+1))*100;
      mon.style.left=`${leftPct}%`;
      mon.style.transform="translateX(-50%)";
      if(role==="cove" && m.cove===1) mon.style.opacity=".5";
      img.appendChild(mon);
      const cell=$$(".map-room").find(e=>e.dataset.cam===id);
      if(cell) cell.classList.add("here");
    });
  }
}

/* =================================================================
   POWER
   ================================================================= */
function usageBars(){
  let u=1;
  if(S.leftDoor)  u++;
  if(S.rightDoor) u++;
  if(S.leftLight) u++;
  if(S.rightLight)u++;
  if(S.camUp)     u++;     // monitor itself counts
  return Math.min(u,5);
}
function drainPower(){
  if(!S || S.over || S.won || S.powerOut) return;
  const u=usageBars();
  S.drain=u;
  // fairer drain: idle barely sips, cameras alone are sustainable,
  // and only holding doors+lights+cam together burns fast.
  S.power -= 0.05 + (u-1) * 0.06;
  if(S.power<=0){ S.power=0; enterPowerOut(); }
  renderHUD();
}
function renderHUD(){
  $("#hud-hour").textContent = S.hour;
  $("#hud-night-num").textContent = S.night;
  $("#power-pct").textContent = Math.ceil(S.power);
  const u=usageBars();
  let html="";
  for(let i=1;i<=5;i++){
    const cls = i<=u ? "on" : "off";
    const sev = u>=5?"danger":u>=3?"warn":"";
    html+=`<span class="usage-bar ${sev} ${cls}"></span>`;
  }
  $("#usage-bars").innerHTML=html;
}

/* power-out: doors fail open, then Daniel's jingle, then dark, then strike */
function enterPowerOut(){
  if(S.powerOut) return;
  S.powerOut=true;
  // force everything off / open
  S.leftDoor=S.rightDoor=S.leftLight=S.rightLight=false;
  ["left","right"].forEach(s=>{
    $(`#${s}-door-panel`).classList.remove("closed");
    $(`#btn-${s}-door`).classList.remove("active");
    $(`#btn-${s}-light`).classList.remove("active");
    $(`.${s}-hall`).classList.remove("on");
  });
  closeMonitor();
  const bo=$("#blackout"); bo.classList.add("on");
  bo.innerHTML = `<div class="eyes"><div></div><div></div></div>`;
  Sound.musicBox();
  // after the jingle, a random delay, then the strike
  const t1=setTimeout(()=>{
    if(!S||S.over) return;
    bo.querySelector(".eyes").classList.add("show");
    Sound.musicBox();
    const t2=setTimeout(()=>{ if(S&&!S.over) jumpscare("daniel"); }, 1800+Math.random()*4000);
    S.timers.push(t2);
  }, 2600);
  S.timers.push(t1);
}

/* =================================================================
   MONSTER AI
   ================================================================= */
function roll(level){ return (Math.floor(Math.random()*20)+1) <= level; }

function moveMonsters(){
  if(!S || S.over || S.won || S.powerOut) return;

  // ---- door walkers: bruno(left), cole(right), daniel(dark/right) ----
  ["bruno","cole","daniel"].forEach(k=>{
    const m=S.monsters[k]; const role=CHARACTERS[k].role; const lvl=S.ai[k];
    const path=PATHS[role];

    // "dark" mover (Daniel): only advances while NOT being watched on his current cam
    if(role==="dark"){
      const node=path[m.pos];
      const watched = S.camUp && S.currentCam===node;
      if(watched) return; // freezes while observed
    }

    if(m.atDoor){
      handleDoorMonster(k,role);
      return;
    }
    if(roll(lvl)){
      if(m.pos < path.length-1){
        m.pos++;
        const node=path[m.pos];
        if(node==="LEFT_DOOR"||node==="RIGHT_DOOR"){ m.atDoor=true; m.attackT=0; }
        if(k==="daniel" && Math.random()<0.4) Sound.knock();
        if(S.camUp && S.currentCam===node) switchCam(node); // refresh feed if we're watching
        if(S.camUp && S.currentCam===path[m.pos-1]) switchCam(path[m.pos-1]);
      }
    }
    updatePeeks();
  });

  // ---- Jett: Pirate Cove sprinter ----
  jettAI();
}

function handleDoorMonster(k,role){
  const m=S.monsters[k];
  const side = (role==="left") ? "left" : "right";
  const doorClosed = S[side+"Door"];
  if(doorClosed){
    // blocked -> after a beat, retreat back down the hall
    m.attackT++;
    if(m.attackT>=2){
      m.atDoor=false; m.attackT=0;
      m.pos=Math.max(1, m.pos-2);   // sent back
    }
  }else{
    // door open at the blind spot -> small window, then strike
    m.attackT++;
    if(m.attackT>=2){ jumpscare(k); }
  }
  updatePeeks();
}

function jettAI(){
  const m=S.monsters.jett; const lvl=S.ai.jett;
  if(m.running){
    // sprinting down the west hall toward the left door
    m.runT++;
    if(S.leftDoor){
      // banged the door: drains power, resets to cove
      Sound.knock(); Sound.doorThud();
      S.power = Math.max(0, S.power - (4 + S.night)); // power penalty
      m.running=false; m.runT=0; m.cove=0;
      renderHUD();
    }else if(m.runT>=1){
      jumpscare("jett");
    }
    return;
  }
  // progress out of the cove only while NOT being watched on 1C
  const watched = S.camUp && S.currentCam==="1C";
  if(watched){ return; }
  if(roll(lvl)){
    m.cove++;
    if(m.cove>=3){ m.running=true; m.runT=0; updatePeeks(); }
  }
}

/* =================================================================
   CLOCK
   ================================================================= */
function tick(){
  if(!S || S.over || S.won) return;
  S.hourProgress += 100;
  if(S.hourProgress >= HOUR_MS){
    S.hourProgress=0;
    S.hour = (S.hour===12) ? 1 : S.hour+1;
    renderHUD();
    if(S.hour>=6){ winNight(); return; }
  }
  // keep peeks/feeds responsive
  if(S.camUp && Math.random()<0.05) switchCam(S.currentCam);
}

/* =================================================================
   END STATES
   ================================================================= */
function jumpscare(k){
  if(!S || S.over) return;
  S.over=true; stopGame();
  Sound.scream();
  const js=$("#jumpscare");
  js.innerHTML = `<div class="js-img" id="js-img"></div><div class="js-flash"></div>`;
  const img=$("#js-img");
  img.style.backgroundImage=`url('${CHARACTERS[k].img}')`;
  img.style.backgroundColor="#000";
  // fallback tint behind transparent / missing images
  js.style.background = `radial-gradient(circle, ${CHARACTERS[k].color}33, #000 70%)`;
  js.classList.add("show");
  setTimeout(()=>{ show("gameover"); }, 1400);
}

function winNight(){
  if(!S || S.won) return;
  S.won=true; stopGame();
  Sound.sixAM();
  closeMonitor();
  const next = S.night+1;
  if(S.night<=5) save.maxUnlocked = Math.min(next, 6);
  if(S.night>=5) Sound.chime();
  if(S.night===5){ save.beat6=true; }
  if(S.night===6){ save.customUnlocked=true; } // beating Bonus Night unlocks Custom Night
  if(S.night>=7){
    const all20 = Object.values(S.ai).every(v=>v>=20);
    $("#win-msg").textContent = all20 ? "4/20 MODE BEATEN — Legendary."
                                      : "Custom Night Complete!";
  }else{
    $("#win-msg").textContent = S.night>=6 ? "You beat the Bonus Night!"
                              : S.night>=5 ? "You survived the week!"
                              : "Night Complete";
  }
  setTimeout(()=>show("win"), 1500);
}

/* =================================================================
   IMAGE PRELOAD + GRACEFUL FALLBACK
   If a character image 404s we swap in a generated CSS "card" so the
   game is fully playable before the real art is dropped into /assets.
   ================================================================= */
function setupFallbacks(){
  for(const key in CHARACTERS){
    const c=CHARACTERS[key];
    const probe=new Image();
    probe.onerror=()=>{
      // build an inline SVG data-URI card with the name + theme color
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>
           <defs><radialGradient id='g' cx='50%' cy='30%' r='80%'>
             <stop offset='0%' stop-color='${c.color}'/>
             <stop offset='75%' stop-color='#050505'/></radialGradient></defs>
           <rect width='600' height='800' fill='url(#g)'/>
           <text x='300' y='720' font-family='Arial Black, sans-serif' font-size='70'
             font-weight='900' fill='#ffffff' text-anchor='middle'
             textLength='540' lengthAdjust='spacingAndGlyphs'>${c.name.toUpperCase()}</text>
         </svg>`);
      c.img = `data:image/svg+xml,${svg}`;
    };
    probe.src=c.img;
  }
}

/* =================================================================
   BOOT
   ================================================================= */
window.addEventListener("DOMContentLoaded", ()=>{
  setupFallbacks();
  buildMenu();
  bindNav();
  show("menu");
  // keyboard: space toggles cams, A/D pan, arrows for doors
  const _held = new Set();
  document.addEventListener("keydown", e=>{
    _held.add(e.code);
    // debug skip: C + D + NumpadAdd -> jump to 6 AM (original FNAF cheat)
    if(_held.has("KeyC") && _held.has("KeyD") && _held.has("NumpadAdd")){
      if(S && !S.over && !S.won) winNight();
      return;
    }
    if(!S || S.over || S.won) return;
    if(e.code==="Space"){ e.preventDefault(); S.camUp?closeMonitor():openMonitor(); }
    if(!S.camUp){
      if(e.key==="a"||e.key==="ArrowLeft") setPan(-1);
      if(e.key==="d"||e.key==="ArrowRight") setPan(1);
      if(e.key==="s"||e.key==="ArrowDown") setPan(0);
      if(e.key==="q") toggleDoor("left");
      if(e.key==="e") toggleDoor("right");
      if(e.key==="z") flickLight("left");
      if(e.key==="c") flickLight("right");
    }
  });
  document.addEventListener("keyup", e=>{ _held.delete(e.code); });
});

})();
