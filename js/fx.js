/* ===================================================================
   Five Birthdays at Daniel's  --  visual effects
   Animated TV static, drifting dust, confetti, screen shake.
   =================================================================== */
window.FBAD = window.FBAD || {};

FBAD.FX = (() => {
  "use strict";
  const W = 256, H = 144;
  const targets = [];
  let img = null, px = null, lastT = 0;

  /* every <canvas class="static"> shows the same noise frame */
  function attachAll(){
    document.querySelectorAll("canvas.static").forEach(c => {
      if (c._fx) return;
      c._fx = true; c.width = W; c.height = H;
      targets.push({ c, ctx: c.getContext("2d") });
    });
    if (!img && targets.length) {
      img = targets[0].ctx.createImageData(W, H);
      px = new Uint32Array(img.data.buffer);
    }
  }
  function fill(){
    for (let i = 0; i < px.length; i++) {
      const v = (Math.random() * 255) | 0;
      px[i] = 0xff000000 | (v << 16) | (v << 8) | v;
    }
    // a couple of bright tear lines
    for (let k = 0; k < 2; k++) {
      const row = ((Math.random() * H) | 0) * W;
      for (let x = 0; x < W; x++) px[row + x] = 0xffe8e8e8;
    }
  }
  function tick(t){
    if (!img || t - lastT < 55) return;
    lastT = t;
    let filled = false;
    for (const o of targets) {
      if (o.c.offsetParent === null) continue;   // hidden screen
      if (!filled) { fill(); filled = true; }
      o.ctx.putImageData(img, 0, 0);
    }
  }

  /* briefly crank a static canvas up, then let it settle */
  function burst(canvas, ms = 260){
    if (!canvas) return;
    canvas.classList.add("burst");
    clearTimeout(canvas._bt);
    canvas._bt = setTimeout(() => canvas.classList.remove("burst"), ms);
  }

  function dust(container, n = 34){
    if (!container || container.childElementCount) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      const size = 1 + Math.random() * 2.4;
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `animation-duration:${14 + Math.random() * 22}s;animation-delay:${-Math.random() * 30}s;` +
        `--dx:${(Math.random() * 16 - 8).toFixed(1)}vw;--dy:${(-6 - Math.random() * 16).toFixed(1)}vh;opacity:${(0.15 + Math.random() * 0.4).toFixed(2)}`;
      container.appendChild(s);
    }
  }

  function confetti(container, n = 90){
    if (!container) return;
    container.innerHTML = "";
    const colors = ["#b3261e", "#e8b04a", "#3f8f8a", "#d9cfb6", "#58e08a"];
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
        `width:${6 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;` +
        `animation-duration:${2.6 + Math.random() * 2.8}s;animation-delay:${Math.random() * 1.8}s;` +
        `--sway:${(Math.random() * 30 - 15).toFixed(1)}vw;--spin:${(Math.random() * 1400 - 700) | 0}deg`;
      container.appendChild(s);
    }
  }

  function shake(el, cls = "shake", ms = 360){
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el["_s" + cls]);
    el["_s" + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  return { attachAll, tick, burst, dust, confetti, shake };
})();
