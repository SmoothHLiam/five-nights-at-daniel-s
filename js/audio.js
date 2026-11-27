/* ===================================================================
   Five Birthdays at Daniel's  --  sound engine
   Everything is synthesised with Web Audio. No audio files.
   =================================================================== */
window.FBAD = window.FBAD || {};

FBAD.Sound = (() => {
  "use strict";
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem("fbad_mute") === "1"; } catch (e) {}
  const loops = {};

  function ac(){
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }
  function dest(pan){
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(master); return p;
    }
    return master;
  }
  const safe = fn => (...a) => { try { return fn(...a); } catch (e) {} };

  /* one-shot oscillator */
  function tone(o){
    const c = ac(), t = c.currentTime + (o.at || 0), d = o.d || 0.2;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.g || 0.2, t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; node.connect(f); node = f; }
    node.connect(g); g.connect(o.out || dest(o.pan));
    osc.start(t); osc.stop(t + d + 0.05);
  }
  /* one-shot filtered noise */
  function noise(o){
    const c = ac(), t = c.currentTime + (o.at || 0), d = o.d || 0.2;
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.g || 0.2, t + (o.a || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let node = src;
    if (o.type) {
      const f = c.createBiquadFilter(); f.type = o.type; f.frequency.value = o.f || 1000;
      if (o.q) f.Q.value = o.q;
      node.connect(f); node = f;
    }
    node.connect(g); g.connect(o.out || dest(o.pan));
    src.start(t, Math.random()); src.stop(t + d + 0.05);
  }

  /* looping beds: start(name) / stop(name) */
  const LOOPS = {
    ambience(c, out){
      const nodes = [];
      const n = c.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 340;
      const ng = c.createGain(); ng.gain.value = 0.11;
      n.connect(lp); lp.connect(ng); ng.connect(out); n.start(); nodes.push(n);
      const hum = c.createOscillator(); hum.frequency.value = 55;
      const hg = c.createGain(); hg.gain.value = 0.05; hum.connect(hg); hg.connect(out); hum.start(); nodes.push(hum);
      // fan blade chop
      const fan = c.createOscillator(); fan.type = "sawtooth"; fan.frequency.value = 110.5;
      const flp = c.createBiquadFilter(); flp.type = "lowpass"; flp.frequency.value = 240;
      const fg = c.createGain(); fg.gain.value = 0.02;
      const lfo = c.createOscillator(); lfo.frequency.value = 11;
      const lg = c.createGain(); lg.gain.value = 0.014; lfo.connect(lg); lg.connect(fg.gain);
      fan.connect(flp); flp.connect(fg); fg.connect(out); fan.start(); lfo.start(); nodes.push(fan, lfo);
      return nodes;
    },
    buzz(c, out){
      const a = c.createOscillator(); a.type = "sawtooth"; a.frequency.value = 100;
      const b = c.createOscillator(); b.type = "square"; b.frequency.value = 201;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 0.7;
      const g = c.createGain(); g.gain.value = 0.035;
      a.connect(bp); b.connect(bp); bp.connect(g); g.connect(out); a.start(); b.start();
      return [a, b];
    },
    camStatic(c, out){
      const n = c.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2400;
      const g = c.createGain(); g.gain.value = 0.02;
      n.connect(hp); hp.connect(g); g.connect(out); n.start();
      return [n];
    },
    drone(c, out){
      const a = c.createOscillator(); a.type = "sawtooth"; a.frequency.value = 48;
      const b = c.createOscillator(); b.type = "sawtooth"; b.frequency.value = 48.6;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170;
      const g = c.createGain(); g.gain.value = 0.09;
      a.connect(lp); b.connect(lp); lp.connect(g); g.connect(out); a.start(); b.start();
      return [a, b];
    },
  };
  function start(name){
    const c = ac(); if (loops[name]) return;
    const g = c.createGain(); g.gain.value = 0.0001; g.connect(master);
    g.gain.linearRampToValueAtTime(1, c.currentTime + 0.25);
    loops[name] = { g, nodes: LOOPS[name](c, g) };
  }
  function stop(name){
    const l = loops[name]; if (!l) return;
    delete loops[name];
    const t = ctx.currentTime;
    l.g.gain.cancelScheduledValues(t);
    l.g.gain.setValueAtTime(l.g.gain.value, t);
    l.g.gain.linearRampToValueAtTime(0.0001, t + 0.15);
    setTimeout(() => { l.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { l.g.disconnect(); } catch (e) {} }, 250);
  }
  function level(name, v){
    const l = loops[name]; if (!l) return;
    l.g.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.2);
  }

  /* "Happy Birthday" on a tired music box. Returns a stop function. */
  function birthdayBox(){
    const c = ac(), out = c.createGain(); out.gain.value = 0.5; out.connect(master);
    const G = 392, A = 440, B = 493.88, C = 523.25, D = 587.33, E = 659.25, F = 698.46, G5 = 783.99;
    const song = [[G,.75],[G,.25],[A,1],[G,1],[C,1],[B,2], [G,.75],[G,.25],[A,1],[G,1],[D,1],[C,2],
                  [G,.75],[G,.25],[G5,1],[E,1],[C,1],[B,1],[A,2], [F,.75],[F,.25],[E,1],[C,1],[D,1],[C,2]];
    const beat = 0.46; let at = 0.1;
    for (let rep = 0; rep < 2; rep++) {
      song.forEach(([f, b]) => {
        const wob = 0.93 * (1 + (Math.random() - 0.7) * 0.02);
        tone({ f: f * wob, d: 1.1, g: 0.2, at, out });
        tone({ f: f * wob * 3, d: 0.35, g: 0.05, at, out });
        at += b * beat;
      });
    }
    return () => {
      try { out.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.08); setTimeout(() => out.disconnect(), 200); } catch (e) {}
    };
  }

  const api = {
    get muted(){ return muted; },
    resume(){ const c = ac(); if (c.state === "suspended") c.resume(); },
    setMuted(v){
      muted = !!v;
      try { localStorage.setItem("fbad_mute", muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.9;
    },
    toggleMute(){ api.setMuted(!muted); return muted; },
    start, stop, level,
    stopLoops(){ Object.keys(loops).forEach(stop); },

    blip(){ tone({ f: 880, d: 0.05, type: "square", g: 0.05 }); },
    hover(){ tone({ f: 520, d: 0.03, type: "square", g: 0.02 }); },
    nightStart(){ tone({ f: 660, d: 0.09, type: "square", g: 0.06 }); tone({ f: 990, d: 0.14, type: "square", g: 0.05, at: 0.09 }); },
    honk(){ tone({ f: 233, to: 196, d: 0.2, type: "square", g: 0.12 }); tone({ f: 294, to: 247, d: 0.2, type: "square", g: 0.08 }); },

    doorSlam(pan){
      tone({ f: 85, to: 30, d: 0.38, g: 0.7, pan });
      noise({ d: 0.16, g: 0.45, type: "lowpass", f: 1200, pan });
      noise({ d: 0.07, g: 0.2, type: "bandpass", f: 2600, q: 3, pan });
    },
    doorOpen(pan){
      noise({ d: 0.3, g: 0.14, type: "lowpass", f: 700, pan });
      tone({ f: 55, to: 95, d: 0.3, g: 0.2, pan });
    },
    click(){ noise({ d: 0.03, g: 0.18, type: "highpass", f: 3000 }); },
    stinger(){
      [311, 440, 466, 932].forEach(f => tone({ f, d: 0.7, type: "square", g: 0.06, lp: 2600 }));
      noise({ d: 0.25, g: 0.2, type: "highpass", f: 1500 });
    },

    camUp(){ tone({ f: 170, to: 520, d: 0.16, type: "sawtooth", g: 0.06, lp: 1400 }); noise({ d: 0.2, g: 0.2, type: "highpass", f: 1800 }); },
    camDown(){ tone({ f: 480, to: 150, d: 0.16, type: "sawtooth", g: 0.05, lp: 1400 }); },
    camSwitch(){ noise({ d: 0.1, g: 0.2, type: "highpass", f: 1500 }); tone({ f: 1100, d: 0.03, type: "square", g: 0.03 }); },
    camLost(){ noise({ d: 0.8, g: 0.22, type: "bandpass", f: 3000, q: 0.5 }); },

    steps(pan, n = 3, g = 0.3){
      for (let i = 0; i < n; i++) {
        tone({ f: 72, to: 38, d: 0.14, g, at: i * 0.42, pan });
        noise({ d: 0.07, g: g * 0.4, type: "lowpass", f: 420, at: i * 0.42, pan });
      }
    },
    run(pan){
      for (let i = 0; i < 12; i++) {
        tone({ f: 80, to: 42, d: 0.09, g: 0.12 + i * 0.03, at: i * 0.13, pan });
        noise({ d: 0.05, g: 0.05 + i * 0.012, type: "lowpass", f: 600, at: i * 0.13, pan });
      }
    },
    bang(pan){
      for (let i = 0; i < 3; i++) {
        tone({ f: 95, to: 42, d: 0.2, g: 0.7, at: i * 0.24, pan });
        noise({ d: 0.1, g: 0.4, type: "lowpass", f: 900, at: i * 0.24, pan });
      }
    },
    laugh(pan){
      for (let i = 0; i < 6; i++)
        tone({ f: 150 - i * 9, to: 100 - i * 7, d: 0.17, type: "sawtooth", g: 0.11, lp: 620, at: i * 0.23, pan });
    },
    creak(){ tone({ f: 190 + Math.random() * 80, to: 120, d: 0.7, type: "sawtooth", g: 0.018, lp: 520, pan: Math.random() * 2 - 1 }); },

    scream(){
      [520, 547, 780, 1210].forEach((f, i) => tone({ f, to: 160 + i * 30, d: 1.15, type: "sawtooth", g: 0.24 }));
      tone({ f: 1500, to: 300, d: 0.6, type: "square", g: 0.14 });
      noise({ d: 1.15, g: 0.55, type: "bandpass", f: 1400, q: 0.4 });
    },
    powerDown(){ tone({ f: 220, to: 28, d: 1.7, type: "sawtooth", g: 0.25, lp: 900 }); noise({ d: 0.3, g: 0.25, type: "lowpass", f: 500 }); },
    birthdayBox: safe(birthdayBox),

    ring(){
      for (let r = 0; r < 2; r++)
        for (let i = 0; i < 14; i++)
          tone({ f: i % 2 ? 1150 : 1420, d: 0.045, type: "square", g: 0.045, at: r * 1.2 + i * 0.05 });
    },
    talk(){ tone({ f: 260 + Math.random() * 240, d: 0.045, type: "square", g: 0.022, lp: 1800 }); },

    sixAM(){
      [659, 523, 587, 392, 392, 587, 659, 523].forEach((f, i) => {
        tone({ f, d: 1.4, g: 0.2, at: i * 0.5 }); tone({ f: f * 2, d: 0.5, g: 0.05, at: i * 0.5 });
      });
      [0, 0.35, 0.8].forEach((at, i) => {   // party horns
        tone({ f: 300 + i * 40, to: 640 + i * 60, d: 0.55, type: "sawtooth", g: 0.09, lp: 2200, at: 4.2 + at, pan: i - 1 });
        noise({ d: 0.5, g: 0.05, type: "bandpass", f: 2000, at: 4.2 + at, pan: i - 1 });
      });
    },
  };
  // never let a sound error break the game
  Object.keys(api).forEach(k => { if (typeof api[k] === "function" && k !== "birthdayBox") api[k] = safe(api[k]); });
  return api;
})();
