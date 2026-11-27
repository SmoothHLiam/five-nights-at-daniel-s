/* ===================================================================
   Five Birthdays at Daniel's  --  game engine
   Screens, the office, the camera system, the cast's A.I., power,
   the phone calls and both endings. Tuning lives in js/config.js.
   =================================================================== */
(() => {
"use strict";

const { CHARACTERS, ROOMS, CAM_ORDER, PATHS, SLOTS, NIGHT_AI, TUNE, CALLS, AD, Sound, FX } = FBAD;
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const rand = ([a, b]) => a + Math.random() * (b - a);
const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/* ---------------------------------------------------------------
   CAMERA ROOM SETS (drawn in CSS, see "room sets" in style.css)
   --------------------------------------------------------------- */
const hall = side => `<div class="rm r-hall ${side}"><i class="h-ceil"></i><i class="h-floor"></i><i class="h-wl"></i><i class="h-wr"></i><i class="h-end"></i><i class="h-light"></i><i class="h-post p1"></i><i class="h-post p2"></i></div>`;
const corner = (pf, word) => `<div class="rm r-corner"><div class="h-light"></div><div class="cstrip"></div><div class="c-poster">${pf}<b>${word}</b></div><div class="c-note"></div></div>`;
const hats = [[10,21,4],[27,21,4],[66,21,4],[84,21,4],[22,37,2.6],[70,37,2.6]]
  .map(([l, b, w]) => `<i class="phat" style="left:${l}%;bottom:${b}%;width:${w}%"></i>`).join("");
const ROOM_SCENES = {
  "1A": `<div class="rm r-stage"><div class="backdrop"></div><div class="spot"></div><div class="curtain l"></div><div class="curtain r"></div><div class="valance"></div><div class="boards"></div></div>`,
  "1B": `<div class="rm r-dining"><div class="dstrip"></div><div class="floorc"></div><div class="tbl t3"></div><div class="tbl t4"></div><div class="tbl t1"></div><div class="tbl t2"></div>${hats}</div>`,
  "1C": `<div class="rm r-cove" data-stage="0"><div class="cove-back"></div><div class="cove-slot"></div><div class="cove-cur l"></div><div class="cove-cur r"></div><div class="cove-top"></div><div class="cove-sign"><b>SORRY!</b><span>OUT OF ORDER</span></div></div>`,
  "5":  `<div class="rm r-back"><div class="shelf s1"></div><div class="shelf s2"></div><div class="balloons"></div><div class="worktable"></div><div class="hatstack"></div><div class="hatstack h2"></div><div class="bulb"></div></div>`,
  "7":  `<div class="rm r-rest"><div class="floorc"></div><div class="rdoor d1"><i></i></div><div class="rdoor d2"><i></i></div></div>`,
  "6":  `<div class="rm r-kitchen"></div>`,
  "4A": hall("east"),
  "2A": hall("west"),
  "4B": corner(`<div class="pf" data-sprite="daniel"></div>`, "CELEBRATE!"),
  "2B": corner(`<div class="pf pf-cake"></div>`, "EAT CAKE!"),
  "3":  `<div class="rm r-closet"><div class="shelf s1"></div><div class="shelf s2"></div><div class="shelf s3"></div><div class="mop"></div><div class="bucket"></div></div>`,
};

/* ---------------------------------------------------------------
   SAVE DATA
   --------------------------------------------------------------- */
const store = {
  get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} },
};
const save = {
  get maxUnlocked(){ return Math.max(1, +store.get("fbad_unlocked") || 1); },
  set maxUnlocked(v){ store.set("fbad_unlocked", Math.max(this.maxUnlocked, v)); },
  get beat6(){ return store.get("fbad_beat6") === "1"; },           // beat night 5, bonus night open
  set beat6(v){ if (v) store.set("fbad_beat6", "1"); },
  get customUnlocked(){ return store.get("fbad_custom") === "1"; }, // beat the bonus night
  set customUnlocked(v){ if (v) store.set("fbad_custom", "1"); },
  get beat420(){ return store.get("fbad_420") === "1"; },
  set beat420(v){ if (v) store.set("fbad_420", "1"); },
};

/* last-chosen Custom Night (Night 7) A.I. levels, 0..20 each */
let customAI = { daniel:0, bruno:0, cole:0, jett:0 };

let S = null;                      // active night state
let pan = 0.5, mouseX = 0.5, keyPan = 0;
let call = null;

function freshState(night, custom){
  const ai = custom ? { ...custom } : JSON.parse(JSON.stringify(NIGHT_AI[night] || NIGHT_AI[5]));
  // small random night-4 bump, like the original
  if (night === 4) { if (Math.random() < 0.5) ai.bruno++; if (Math.random() < 0.5) ai.daniel++; }
  return {
    night, ai,
    hour:12, hourProgress:0,
    power:100,
    leftDoor:false, rightDoor:false, leftLight:false, rightLight:false,
    camUp:false, currentCam:"1A",
    monsters:{
      daniel:{ pos:0, atDoor:false, attackT:0, spotted:false },
      bruno: { pos:0, atDoor:false, attackT:0, spotted:false },
      cole:  { pos:0, atDoor:false, attackT:0, spotted:false },
      jett:  { cove:0, running:false, runT:0 },
    },
    started:false, paused:false, powerOut:false, autoLeft:false, over:false, won:false,
    timers:[], timeouts:[], stopSong:null,
  };
}
const live   = () => S && S.started && !S.over && !S.won && !S.paused;
const canAct = live;

/* ---------------------------------------------------------------
   DOM helpers
   --------------------------------------------------------------- */
function show(id){
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + id).classList.add("active");
}
/* a character sprite: <div class="ch ch-KEY"><div class="ch-img"></div></div> */
function sprite(key, cls = ""){
  const el = document.createElement("div");
  el.className = `ch ch-${key} ${cls}`.trim();
  const im = document.createElement("div");
  im.className = "ch-img";
  im.style.backgroundImage = `url("${CHARACTERS[key].img}")`;
  el.appendChild(im);
  return el;
}
function later(fn, ms){
  const mine = S;
  const id = setTimeout(() => { if (S === mine && S && !S.over && !S.won) fn(); }, ms);
  if (S) S.timeouts.push(id);
  return id;
}
function deny(btn){ btn.classList.remove("denied"); void btn.offsetWidth; btn.classList.add("denied"); Sound.click(); }

/* =================================================================
   MENU + NAVIGATION
   ================================================================= */
function buildMenu(){
  const cont = $('.menu-list li[data-action="continue"]');
  cont.classList.toggle("disabled", save.maxUnlocked <= 1);
  $("#menu-night").textContent = save.maxUnlocked > 1 ? "Night " + save.maxUnlocked : "";
  // Custom Night (Night 7) opens once the Bonus Night is beaten
  $('.menu-list li[data-action="customnight"]').classList.toggle("disabled", !save.customUnlocked);
  const stars = (save.beat6 ? 1 : 0) + (save.customUnlocked ? 1 : 0) + (save.beat420 ? 1 : 0);
  $("#menu-stars").textContent = "★".repeat(stars);
}
function bindMenu(){
  $$(".menu-list li").forEach(li => {
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    const go = () => {
      if (li.classList.contains("disabled")) return;
      Sound.resume(); Sound.blip();
      const a = li.dataset.action;
      if (a === "new") startNight(1, null, true);
      else if (a === "continue") startNight(save.maxUnlocked);
      else if (a === "custom") { buildNightSelect(); show("nightselect"); }
      else if (a === "customnight") { buildCustomNight(); show("customnight"); }
      else if (a === "howto") show("howto");
    };
    li.addEventListener("click", go);
    li.addEventListener("keydown", e => { if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); go(); } });
    li.addEventListener("pointerenter", () => { if (!li.classList.contains("disabled")) Sound.hover(); });
  });
}
function goMenu(){
  stopGame();
  S = null;
  Sound.stopLoops();
  show("menu"); buildMenu();
  Sound.start("drone");
}
function twitchLoop(){
  setTimeout(() => {
    if ($("#menu").classList.contains("active")) {
      const face = $("#menu-face"), c = "tw" + (1 + Math.floor(Math.random() * 3));
      face.classList.add(c);
      FX.burst($("#menu canvas.static"), 130);
      setTimeout(() => face.classList.remove(c), 90 + Math.random() * 260);
    }
    twitchLoop();
  }, 1400 + Math.random() * 4600);
}

function buildNightSelect(){
  const wrap = $("#night-buttons"); wrap.innerHTML = "";
  const total = save.beat6 ? 6 : 5;
  for (let n = 1; n <= total; n++) {
    const b = document.createElement("button");
    b.innerHTML = `${n >= 6 ? "★" : n}<span class="nlbl">${n === 6 ? "BONUS" : "NIGHT"}</span>`;
    b.disabled = n > save.maxUnlocked;
    b.onclick = () => { Sound.resume(); Sound.blip(); startNight(n); };
    wrap.appendChild(b);
  }
}

/* Custom Night (Night 7): pick each monster's A.I. level 0..20, like the original */
function buildCustomNight(){
  const wrap = $("#custom-cards"); wrap.innerHTML = "";
  ["daniel", "bruno", "cole", "jett"].forEach(key => {
    const card = document.createElement("div");
    card.className = "cc-card";
    card.innerHTML = `
      <div class="cc-name"></div>
      <div class="cc-portrait"></div>
      <div class="cc-ailabel">A.I. Level</div>
      <div class="cc-controls">
        <button class="cc-arrow" data-d="-1" aria-label="Lower">&lt;</button>
        <span class="cc-level">${customAI[key]}</span>
        <button class="cc-arrow" data-d="1" aria-label="Raise">&gt;</button>
      </div>`;
    card.querySelector(".cc-name").textContent = CHARACTERS[key].name;
    card.querySelector(".cc-portrait").appendChild(sprite(key));
    const span = card.querySelector(".cc-level");
    card.querySelectorAll(".cc-arrow").forEach(b => {
      b.onclick = () => {
        Sound.blip();
        customAI[key] = Math.max(0, Math.min(20, customAI[key] + (+b.dataset.d)));
        span.textContent = customAI[key];
      };
    });
    wrap.appendChild(card);
  });
  $("#custom-ready").onclick = () => { Sound.resume(); Sound.blip(); startNight(7, { ...customAI }); };
}

function bindNav(){
  $$('[data-action="back-menu"]').forEach(b => b.onclick = () => { Sound.blip(); goMenu(); });
  $('[data-action="win-continue"]').onclick = () => { Sound.blip(); goMenu(); };
  $('[data-action="retry"]').onclick = () => { Sound.blip(); startNight(S ? S.night : 1); };
}

/* =================================================================
   NIGHT START
   ================================================================= */
function startNight(night, custom, withAd){
  stopGame();
  Sound.stopLoops();
  // Night 7 always uses the Custom Night levels (even on retry)
  if (night === 7 && !custom) custom = { ...customAI };
  S = freshState(night, custom);
  const mine = S;
  if (!withAd) return runIntro(mine);

  // the job ad, shown once on New Game
  $("#np-head").textContent = AD.head;
  $("#np-venue").textContent = AD.venue;
  $("#np-body").innerHTML = AD.body.map(t => `<p>${t}</p>`).join("");
  $("#np-pay").textContent = AD.pay;
  show("paper");
  let done = false;
  const next = () => { if (done || S !== mine) return; done = true; $("#paper").onclick = null; runIntro(mine); };
  $("#paper").onclick = next;
  setTimeout(next, 7000);
}
function runIntro(mine){
  $("#intro-night").textContent = mine.night === 7 ? "Custom Night" : ORDINAL[mine.night] + " Night";
  show("intro");
  const box = $(".intro-box"); box.style.animation = "none"; void box.offsetWidth; box.style.animation = "";
  Sound.nightStart();
  FX.burst($("#intro canvas.static"), 300);
  setTimeout(() => { if (S === mine) beginPlay(); }, 2300);
}

function beginPlay(){
  resetPlayDOM();
  show("play");
  buildMap();
  S.started = true;
  renderHUD();
  S.timers.push(
    setInterval(tick, 100),
    setInterval(moveMonsters, TUNE.MOVE_MS),
    setInterval(drainPower, TUNE.POWER_TICK_MS),
    setInterval(() => { if (live() && !S.powerOut && Math.random() < 0.35) Sound.creak(); }, 9000),
  );
  Sound.start("ambience");
  startCall(S.night);
}

function stopGame(){
  stopCall();
  if (!S) return;
  S.timers.forEach(clearInterval); S.timers = [];
  S.timeouts.forEach(clearTimeout); S.timeouts = [];
  if (S.stopSong) { S.stopSong(); S.stopSong = null; }
}

function resetPlayDOM(){
  const play = $("#play");
  play.classList.remove("dead", "shake");
  $("#monitor").classList.remove("open");
  $("#cam-flip").classList.remove("open");
  $("#blackout").classList.remove("on");
  $("#pause").classList.remove("show");
  const js = $("#jumpscare"); js.classList.remove("show"); js.innerHTML = "";
  const face = $("#dead-face"); face.classList.remove("singing"); face.style.opacity = ""; face.innerHTML = "";
  $("#cam-view").classList.remove("lost");
  $("#cam-room").dataset.cam = "";
  pan = 0.5; keyPan = 0; applyPan();
  syncOffice();
}

/* =================================================================
   THE OFFICE  (panning, doors, lights)
   ================================================================= */
function applyPan(){
  const office = $("#office");
  office.style.transform = `translate3d(${(-pan * TUNE.PAN_RANGE).toFixed(3)}%,0,0)`;
  office.style.setProperty("--pan", pan.toFixed(3));
}

/* who is standing in the blind spot outside a door */
function whoAtDoor(side){
  if (!S) return null;
  for (const k of ["bruno", "cole", "daniel"]) {
    const role = CHARACTERS[k].role;
    const theirSide = role === "left" ? "left" : "right";
    if (theirSide === side && S.monsters[k].atDoor) return k;
  }
  return null;
}

/* push door / light / peek state into the DOM */
function syncOffice(){
  ["left", "right"].forEach(side => {
    const door = $(`#door-${side}`);
    const closed = !!(S && S[side + "Door"]), lit = !!(S && S[side + "Light"]);
    door.classList.toggle("closed", closed);
    door.classList.toggle("lit", lit);
    $(`#btn-${side}-door`).classList.toggle("active", closed);
    $(`#btn-${side}-light`).classList.toggle("active", lit);
    const peek = $(`#peek-${side}`), k = whoAtDoor(side) || "";
    if (peek.dataset.k !== k) {
      peek.innerHTML = ""; peek.dataset.k = k;
      if (k) peek.appendChild(sprite(k));
    }
    peek.classList.toggle("show", !!k);
  });
  if (S && (S.leftLight || S.rightLight)) Sound.start("buzz"); else Sound.stop("buzz");
}

function toggleDoor(side){
  if (!canAct()) return;
  const btn = $(`#btn-${side}-door`);
  if (S.powerOut) return deny(btn);
  const key = side + "Door", sPan = side === "left" ? -0.7 : 0.7;
  S[key] = !S[key];
  if (S[key]) { Sound.doorSlam(sPan); FX.shake($("#play")); } else Sound.doorOpen(sPan);
  syncOffice(); renderHUD();
}

function flickLight(side){
  if (!canAct()) return;
  const btn = $(`#btn-${side}-light`);
  if (S.powerOut) return deny(btn);
  const key = side + "Light", on = !S[key];
  S.leftLight = S.rightLight = false;      // one light at a time
  S[key] = on;
  Sound.click();
  syncOffice(); renderHUD();
  if (on) {
    const k = whoAtDoor(side);
    if (k && !S.monsters[k].spotted) { S.monsters[k].spotted = true; Sound.stinger(); }
  }
}

/* =================================================================
   CAMERA MONITOR
   ================================================================= */
function buildMap(){
  const map = $("#cam-map");
  if (map.childElementCount) return;
  let svg = `<svg viewBox="0 0 100 103" preserveAspectRatio="none" aria-hidden="true">`;
  for (const id of CAM_ORDER) {
    const r = ROOMS[id].rect;
    if (r) svg += `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/>`;
  }
  [[22,22,26,22],[76,24,80,24],[24,39,26,39],[24,60,32,60],[74,39,74,45],[42,82,44,82],[56,82,58,82]]
    .forEach(l => { svg += `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}"/>`; });
  svg += `</svg>`;
  let html = svg + `<div class="cam-you">YOU</div>`;
  for (const id of CAM_ORDER) {
    const [x, y] = ROOMS[id].btn;
    html += `<button class="cam-btn" data-cam="${id}" style="left:${x}%;top:${(y / 1.03).toFixed(2)}%" aria-label="Camera ${id}, ${ROOMS[id].name}">CAM<br>${id}</button>`;
  }
  map.innerHTML = html;
  map.querySelectorAll(".cam-btn").forEach(b => b.onclick = () => switchCam(b.dataset.cam));
}

function openMonitor(){
  if (!canAct() || S.powerOut || S.camUp) return;
  S.camUp = true;
  S.leftLight = S.rightLight = false;     // lights drop when the monitor comes up
  syncOffice();
  $("#monitor").classList.add("open");
  $("#cam-flip").classList.add("open");
  Sound.camUp(); Sound.start("camStatic"); Sound.level("ambience", 0.45);
  FX.burst($("#cam-static"), 340);
  renderCam();
  renderHUD();
}
function closeMonitor(silent){
  if (!S || !S.camUp) return;
  S.camUp = false;
  $("#monitor").classList.remove("open");
  $("#cam-flip").classList.remove("open");
  if (!silent) Sound.camDown();
  Sound.stop("camStatic"); Sound.level("ambience", 1);
  renderHUD();
}
function toggleMonitor(){ if (S && S.camUp) closeMonitor(); else openMonitor(); }

function switchCam(id){
  if (!canAct() || !S.camUp) return;
  S.currentCam = id;
  Sound.camSwitch();
  FX.burst($("#cam-static"), 230);
  renderCam();
}

/* everyone visible in a room right now */
function occupants(id){
  const out = [];
  if (id === "2A" && S.monsters.jett.running) out.push({ k:"jett", sprint:true });
  for (const k of ["daniel", "bruno", "cole"]) {
    const node = PATHS[CHARACTERS[k].role][S.monsters[k].pos];
    if (node === id) out.push({ k });
  }
  return out;
}

function renderCam(){
  if (!S) return;
  const id = S.currentCam, r = ROOMS[id];
  $("#cam-name").textContent = r.name;
  $$(".cam-btn").forEach(b => b.classList.toggle("active", b.dataset.cam === id));
  $("#cam-disabled").classList.toggle("show", !!r.audio);
  const room = $("#cam-room");
  if (room.dataset.cam !== id) {
    room.innerHTML = ROOM_SCENES[id];
    room.dataset.cam = id;
    room.querySelectorAll("[data-sprite]").forEach(el => el.appendChild(sprite(el.dataset.sprite)));
  }
  const chars = $("#cam-chars"); chars.innerHTML = "";
  if (r.audio) return;
  if (id === "1C") return renderCove(room);

  const slots = SLOTS[id] || [];
  occupants(id).forEach((o, i) => {
    const s = slots[Math.min(i, slots.length - 1)];
    if (!s) return;
    const el = document.createElement("div");
    el.className = `cam-char k-${o.k}` + (s.h < 45 ? " far" : "") + (o.sprint ? " sprint" : "");
    el.style.cssText = `left:${s.x + (i >= slots.length ? 9 * (i - slots.length + 1) : 0)}%;bottom:${s.b}%;height:${s.h}%`;
    el.appendChild(sprite(o.k));
    chars.appendChild(el);
  });
}

/* Pirate Cove: closed -> peeking -> out -> gone */
function renderCove(room){
  const m = S.monsters.jett, cove = room.firstElementChild;
  const stage = m.running ? 3 : Math.min(m.cove, 3);
  cove.dataset.stage = stage;
  const slot = cove.querySelector(".cove-slot"); slot.innerHTML = "";
  cove.querySelector(".cove-sign").innerHTML = stage === 3 ? "<b>BE RIGHT</b><span>BACK</span>" : "<b>SORRY!</b><span>OUT OF ORDER</span>";
  if (stage === 1 || stage === 2) {
    const el = document.createElement("div");
    el.className = "cam-char k-jett";
    el.style.cssText = `left:50%;bottom:0;height:${stage === 1 ? 84 : 98}%`;
    el.appendChild(sprite("jett"));
    slot.appendChild(el);
  }
}

/* feeds drop to static when someone moves through the room on screen */
function camInterference(rooms){
  if (!S.camUp) return;
  if (!rooms.includes(S.currentCam)) return;
  const view = $("#cam-view");
  view.classList.add("lost");
  FX.burst($("#cam-static"), TUNE.CAM_BLACKOUT_MS);
  Sound.camLost();
  later(() => { view.classList.remove("lost"); if (S.camUp) renderCam(); }, TUNE.CAM_BLACKOUT_MS);
}

/* =================================================================
   POWER
   ================================================================= */
function usageBars(){
  let u = 1;
  if (S.leftDoor) u++;
  if (S.rightDoor) u++;
  if (S.leftLight) u++;
  if (S.rightLight) u++;
  if (S.camUp) u++;          // the monitor itself counts
  return Math.min(u, 5);
}
function drainPower(){
  if (!live() || S.powerOut) return;
  // idle barely sips, cameras alone are sustainable, doors + lights + cams together burn fast
  S.power -= TUNE.DRAIN_BASE + (usageBars() - 1) * TUNE.DRAIN_PER_USE;
  if (S.power <= 0) { S.power = 0; renderHUD(); enterPowerOut(); return; }
  renderHUD();
}
function renderHUD(){
  $("#hud-hour").textContent = S.hour;
  $("#hud-night").textContent = "Night " + S.night;
  $("#power-pct").textContent = Math.ceil(S.power);
  $(".hud-power").classList.toggle("low", S.power <= 10);
  const u = usageBars();
  let html = "";
  for (let i = 1; i <= u; i++) html += `<i class="ub${i >= 4 ? " r" : i === 3 ? " y" : ""}"></i>`;
  $("#usage-bars").innerHTML = html;
}

/* power out: everything dies, Daniel sings in the left doorway, then the dark, then him */
function enterPowerOut(){
  if (S.powerOut) return;
  S.powerOut = true; S.autoLeft = true;
  S.leftDoor = S.rightDoor = S.leftLight = S.rightLight = false;
  closeMonitor(true);
  stopCall();
  syncOffice();
  Sound.stopLoops(); Sound.powerDown();
  $("#play").classList.add("dead");
  const face = $("#dead-face"); face.innerHTML = ""; face.appendChild(sprite("daniel"));
  later(() => {
    face.classList.add("singing");
    S.stopSong = Sound.birthdayBox();
    later(() => {
      if (S.stopSong) { S.stopSong(); S.stopSong = null; }
      face.classList.remove("singing");
      $("#blackout").classList.add("on");
      later(() => jumpscare("daniel"), rand(TUNE.POWEROUT_DARK_MS));
    }, rand(TUNE.POWEROUT_SONG_MS));
  }, 2400);
}

/* =================================================================
   MONSTER A.I.
   ================================================================= */
function roll(level){ return (Math.floor(Math.random() * 20) + 1) <= level; }

function moveMonsters(){
  if (!live() || S.powerOut) return;

  // ---- door walkers: bruno (left), cole (right), daniel (dark / right) ----
  for (const k of ["bruno", "cole", "daniel"]) {
    if (S.over) return;
    const m = S.monsters[k], role = CHARACTERS[k].role, path = PATHS[role];
    const sPan = role === "left" ? -0.75 : 0.75;

    // Daniel freezes while you are watching the room he is in
    if (role === "dark" && S.camUp && S.currentCam === path[m.pos]) continue;

    if (m.atDoor) { handleDoorMonster(k, role, sPan); continue; }

    if (roll(S.ai[k]) && m.pos < path.length - 1) {
      const from = path[m.pos];
      m.pos++;
      const to = path[m.pos];
      if (to === "LEFT_DOOR" || to === "RIGHT_DOOR") { m.atDoor = true; m.attackT = 0; m.spotted = false; }
      if (k === "daniel") Sound.laugh(sPan * 0.6);
      else Sound.steps(sPan, 3, 0.08 + m.pos * 0.05);
      camInterference([from, to]);
    }
  }
  if (S.over) return;
  syncOffice();

  // ---- the Pirate Cove sprinter ----
  jettAI();
}

function handleDoorMonster(k, role, sPan){
  const m = S.monsters[k];
  const side = role === "left" ? "left" : "right";
  m.attackT++;
  if (S[side + "Door"]) {
    // blocked: after a beat, walks back down the hall
    if (m.attackT >= 2) {
      m.atDoor = false; m.attackT = 0; m.spotted = false;
      m.pos = Math.max(1, m.pos - 2);
      Sound.steps(sPan, 2, 0.16);
    }
  } else if (m.attackT >= 2) {
    // door open at the blind spot: a short window, then the strike
    jumpscare(k);
  }
}

function jettAI(){
  const m = S.monsters.jett;
  if (m.running) {
    // sprinting down the west hall toward the left door
    m.runT++;
    if (S.leftDoor) {
      // hits the door: costs power, back to the cove
      Sound.bang(-0.8); FX.shake($("#play"));
      S.power = Math.max(0, S.power - (4 + S.night));
      m.running = false; m.runT = 0; m.cove = 0;
      renderHUD();
      if (S.camUp) renderCam();
    } else if (m.runT >= 1) {
      jumpscare("jett");
    }
    return;
  }
  // only creeps out while NOT being watched on CAM 1C
  if (S.camUp && S.currentCam === "1C") return;
  if (roll(S.ai.jett)) {
    m.cove++;
    if (m.cove >= 3) { m.running = true; m.runT = 0; Sound.run(-0.8); }
    if (S.camUp) renderCam();
  }
}

/* =================================================================
   CLOCK
   ================================================================= */
function tick(){
  if (!live()) return;
  S.hourProgress += 100;
  if (S.hourProgress >= TUNE.HOUR_MS) {
    S.hourProgress = 0;
    S.hour = S.hour === 12 ? 1 : S.hour + 1;
    renderHUD();
    if (S.hour >= 6) { winNight(); return; }
  }
  // the odd glitch on the feed
  if (S.camUp && Math.random() < 0.012) FX.burst($("#cam-static"), 90);
}

/* =================================================================
   PHONE CALLS
   ================================================================= */
function startCall(night){
  stopCall();
  const lines = CALLS[night];
  if (!lines) return;
  const phone = $("#desk-phone"), text = $("#call-text");
  const c = call = { i:0, c:0, wait:0, t:0, ringing:true, timer:null };
  phone.classList.add("ringing");
  Sound.ring();
  c.timer = setInterval(() => {
    if (!S || S.paused) return;
    c.t += 30;
    if (c.ringing) {
      if (c.t < 2600) return;
      c.ringing = false;
      phone.classList.remove("ringing"); phone.classList.add("talking");
      text.textContent = ""; $("#call").classList.add("show");
      return;
    }
    if (c.wait > 0) {
      c.wait -= 30;
      if (c.wait <= 0) {
        c.i++; c.c = 0; text.textContent = "";
        if (c.i >= lines.length) stopCall();
      }
      return;
    }
    const line = lines[c.i];
    c.c++;
    text.textContent = line.slice(0, c.c);
    if (c.c % 3 === 0 && line[c.c - 1] !== " ") Sound.talk();
    if (c.c >= line.length) c.wait = 1700;
  }, 30);
}
function stopCall(){
  if (call) { clearInterval(call.timer); call = null; }
  $("#desk-phone").classList.remove("ringing", "talking");
  $("#call").classList.remove("show");
}

/* =================================================================
   PAUSE + MUTE
   ================================================================= */
function setPaused(v){
  if (!S || !S.started || S.over || S.won || S.powerOut) return;
  S.paused = v;
  $("#pause").classList.toggle("show", v);
  Sound.level("ambience", v ? 0.05 : S.camUp ? 0.45 : 1);
  if (v) { Sound.stop("buzz"); Sound.stop("camStatic"); }
  else { syncOffice(); if (S.camUp) Sound.start("camStatic"); }
}
function updateMuteUI(){
  $("#mute-btn").classList.toggle("muted", Sound.muted);
  $("#mute-btn").setAttribute("aria-label", Sound.muted ? "Unmute sound" : "Mute sound");
  $("#pause-mute").textContent = "Sound: " + (Sound.muted ? "off" : "on");
}
function toggleMute(){ Sound.resume(); Sound.toggleMute(); updateMuteUI(); }

/* =================================================================
   END STATES
   ================================================================= */
function jumpscare(k){
  if (!S || S.over || S.won) return;
  closeMonitor(true);
  S.over = true;
  stopGame();
  Sound.stopLoops(); Sound.scream();
  $("#blackout").classList.remove("on");
  $("#pause").classList.remove("show");
  const js = $("#jumpscare");
  js.innerHTML = "";
  js.style.setProperty("--jc", CHARACTERS[k].color);
  const zoom = document.createElement("div"); zoom.className = "js-zoom";
  const shake = document.createElement("div"); shake.className = "js-shake";
  shake.appendChild(sprite(k, "face"));
  zoom.appendChild(shake);
  const flash = document.createElement("div"); flash.className = "js-flash";
  js.append(zoom, flash);
  js.classList.add("show");
  const mine = S;
  setTimeout(() => { if (S === mine) showGameOver(k); }, 1350);
}

function showGameOver(k){
  const c = CHARACTERS[k];
  const face = $("#go-face"); face.innerHTML = ""; face.appendChild(sprite(k, "face"));
  $("#go-line").textContent = `"${c.name}" got you.`;
  $("#go-tip").textContent = c.tip;
  show("gameover");
  FX.burst($("#gameover canvas.static"), 650);
  Sound.camLost();
  Sound.start("drone");
}

function winNight(){
  if (!S || S.won || S.over) return;
  S.won = true;
  const night = S.night, all20 = Object.values(S.ai).every(v => v >= 20);
  closeMonitor(true);
  stopGame();
  Sound.stopLoops();
  $("#blackout").classList.remove("on");

  if (night <= 5) save.maxUnlocked = Math.min(night + 1, 6);
  if (night === 5) save.beat6 = true;
  if (night === 6) save.customUnlocked = true;   // beating the Bonus Night unlocks Custom Night
  if (night >= 7 && all20) save.beat420 = true;

  $("#win-msg").textContent =
      night >= 7 ? (all20 ? "4/20 MODE BEATEN. Legendary." : "Custom Night complete.")
    : night === 6 ? "Bonus Night beaten. Overtime pay: $0.50. Custom Night unlocked."
    : night === 5 ? "You survived the week. Paycheck: $120.00 and one slice of cake."
    : `Night ${night} complete.`;

  const win = $("#win"), rollEl = $("#win-roll");
  win.classList.remove("done");
  $("#confetti").innerHTML = "";
  show("win");
  rollEl.classList.remove("go"); void rollEl.offsetWidth; rollEl.classList.add("go");
  Sound.sixAM();
  const mine = S;
  setTimeout(() => {
    if (S !== mine || !win.classList.contains("active")) return;
    FX.confetti($("#confetti"));
    win.classList.add("done");
  }, 4300);
}

/* =================================================================
   INPUT
   ================================================================= */
function bindControls(){
  $("#btn-left-door").onclick   = () => toggleDoor("left");
  $("#btn-right-door").onclick  = () => toggleDoor("right");
  $("#btn-left-light").onclick  = () => flickLight("left");
  $("#btn-right-light").onclick = () => flickLight("right");
  $("#pause-btn").onclick    = () => setPaused(true);
  $("#pause-resume").onclick = () => setPaused(false);
  $("#pause-mute").onclick   = toggleMute;
  $("#mute-btn").onclick     = toggleMute;
  $("#call-mute").onclick    = () => { Sound.blip(); stopCall(); };
  $("#poster-main").onclick  = () => { if (canAct()) Sound.honk(); };

  // monitor bar: hover flips it (like the original), click / tap also works
  const bar = $("#cam-flip");
  let hoverFlipped = false;
  bar.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && canAct()) { toggleMonitor(); hoverFlipped = true; } });
  bar.addEventListener("pointerleave", () => { hoverFlipped = false; });
  bar.addEventListener("click", () => { if (!hoverFlipped) toggleMonitor(); });

  // looking around + swipe up / down for the monitor
  const play = $("#play");
  let sy = null, sx = null;
  play.addEventListener("pointermove", e => { mouseX = e.clientX / window.innerWidth; });
  play.addEventListener("pointerleave", () => { mouseX = 0.5; });
  document.addEventListener("mouseleave", () => { mouseX = 0.5; });
  play.addEventListener("pointerdown", e => { sy = e.clientY; sx = e.clientX; mouseX = e.clientX / window.innerWidth; });
  play.addEventListener("pointerup", e => {
    if (e.pointerType !== "mouse") mouseX = 0.5;
    if (sy === null || !canAct() || S.powerOut) { sy = sx = null; return; }
    const dy = sy - e.clientY, dx = Math.abs(e.clientX - sx);
    sy = sx = null;
    if (Math.abs(dy) < TUNE.SWIPE_PX || Math.abs(dy) < dx * 1.5) return;   // must be mostly vertical
    if (dy > 0 && !S.camUp) openMonitor();
    else if (dy < 0 && S.camUp) closeMonitor();
  });
  play.addEventListener("pointercancel", () => { sy = sx = null; mouseX = 0.5; });

  // keyboard
  const held = new Set();
  document.addEventListener("keydown", e => {
    held.add(e.code);
    if (e.code === "KeyM" && !e.repeat) toggleMute();
    // debug skip: C + D + NumpadAdd jumps to 6 AM (the original's cheat)
    if (held.has("KeyC") && held.has("KeyD") && held.has("NumpadAdd")) {
      if (S && S.started && !S.over && !S.won) winNight();
      return;
    }
    if (e.code === "Escape") { if (S && S.started) setPaused(!S.paused); return; }
    if (!canAct()) return;
    if (e.code === "Space") { e.preventDefault(); if (!e.repeat) toggleMonitor(); }
    if (S.camUp) return;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keyPan = -1;
    if (e.code === "KeyD" || e.code === "ArrowRight") keyPan = 1;
    if (e.repeat) return;
    if (e.code === "KeyQ") toggleDoor("left");
    if (e.code === "KeyE") toggleDoor("right");
    if (e.code === "KeyZ") flickLight("left");
    if (e.code === "KeyC") flickLight("right");
  });
  document.addEventListener("keyup", e => {
    held.delete(e.code);
    if (["KeyA", "KeyD", "ArrowLeft", "ArrowRight"].includes(e.code)) keyPan = 0;
  });
  window.addEventListener("blur", () => { held.clear(); keyPan = 0; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) setPaused(true); });
}

/* one animation frame: ease the office pan, redraw static */
let lastT = 0;
function frame(t){
  const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
  if (live()) {
    let v = 0;
    if (S.powerOut && S.autoLeft) { v = -0.55; if (pan <= 0) S.autoLeft = false; }   // head turns to the left door
    else if (!S.camUp) {
      if (keyPan) v = keyPan;
      else {
        const dz = TUNE.PAN_DEAD_ZONE / 2, off = mouseX - 0.5;
        if (Math.abs(off) > dz) v = Math.sign(off) * Math.min(1, (Math.abs(off) - dz) / (0.5 - dz) * 1.4);
      }
    }
    if (v) {
      const next = Math.max(0, Math.min(1, pan + v * dt * TUNE.PAN_SPEED));
      if (next !== pan) { pan = next; applyPan(); }
    }
  }
  FX.tick(t);
  requestAnimationFrame(frame);
}

/* =================================================================
   SET DRESSING + IMAGE FALLBACK
   ================================================================= */
function buildBunting(){
  const wrap = $("#bunting"), text = "HAPPY★BIRTHDAY", colors = ["#a8392f", "#d9a441", "#3f8f8a", "#d9cfb6"];
  [...text].forEach((ch, i) => {
    const t = (i + 0.5) / text.length, u = 2 * t - 1;
    const b = document.createElement("b");
    b.textContent = ch;
    b.style.cssText = `left:${(t * 100).toFixed(2)}%;top:${(-10 + 50 * Math.sqrt(1 - u * u)).toFixed(2)}%;background:${colors[i % colors.length]};animation-delay:${(-i * 0.37).toFixed(2)}s`;
    wrap.appendChild(b);
  });
}

/* If a character image fails to load, swap in a generated name card so the
   game is fully playable before the real art is dropped into /assets. */
function setupFallbacks(){
  for (const key in CHARACTERS) {
    const c = CHARACTERS[key];
    const probe = new Image();
    probe.onerror = () => {
      const svg = encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>
           <defs><radialGradient id='g' cx='50%' cy='30%' r='80%'>
             <stop offset='0%' stop-color='${c.color}'/>
             <stop offset='75%' stop-color='#050505'/></radialGradient></defs>
           <rect width='600' height='800' fill='url(#g)'/>
           <text x='300' y='430' font-family='Arial Black, sans-serif' font-size='70'
             font-weight='900' fill='#ffffff' text-anchor='middle'
             textLength='420' lengthAdjust='spacingAndGlyphs'>${c.name.toUpperCase()}</text>
         </svg>`);
      c.img = `data:image/svg+xml,${svg}`;
      $$(`.ch-${key} .ch-img`).forEach(el => { el.style.backgroundImage = `url("${c.img}")`; });
    };
    probe.src = c.img;
  }
}

/* =================================================================
   BOOT
   ================================================================= */
window.addEventListener("DOMContentLoaded", () => {
  setupFallbacks();
  $("#menu-face").appendChild(sprite("daniel"));
  $("#poster-face").appendChild(sprite("daniel"));
  buildBunting();
  FX.attachAll();
  FX.dust($("#dust"));
  bindMenu(); bindNav(); bindControls();
  buildMenu(); updateMuteUI();
  show("menu");
  twitchLoop();
  // audio can only start after a gesture
  const wake = () => {
    Sound.resume();
    if ($("#menu").classList.contains("active")) Sound.start("drone");
    document.removeEventListener("pointerdown", wake); document.removeEventListener("keydown", wake);
  };
  document.addEventListener("pointerdown", wake); document.addEventListener("keydown", wake);
  requestAnimationFrame(frame);
});

/* small hook for testing from the console */
FBAD.debug = { state: () => S, jumpscare: k => jumpscare(k), win: () => winNight(), powerOut: () => { if (S) { S.power = 0; enterPowerOut(); } } };

})();
