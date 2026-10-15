#!/usr/bin/env node
/* Build the 100-level set: hand-made showcase levels from src/levels.src.js,
   seeded generated levels for every other slot. Every level is solved on all four
   difficulties before it is accepted.

   Usage: node tools/generate.js [--only 6,7] [--workers 2] [--out src/levels.json]
*/
const fs = require("fs"), path = require("path");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const SRC = require("../src/levels.src.js");
const DIFFS = ["C","E","M","H"];
const DIVIDERS = new Set(["door","hyper","bomb","buster","ud","mover","bar"]);

/* ---------------- seeded helpers ---------------- */
function mulberry(seed){ return () => { let t = (seed = (seed + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- level builder ---------------- */
function blank(W, H){
  return { W, H, dot:Array.from({length:H}, () => Array(W).fill("o")),
    vwall:new Set(), hwall:new Set(), hlink:new Set(), objects:[], enemies:[], used:new Set() };
}
const K = (x, y) => x + "," + y;
function toMap(B, dotOverride){
  const rows = [];
  for (let r = 0; r < 2*B.H - 1; r++){
    let s = "";
    for (let c = 0; c < 2*B.W - 1; c++){
      if (r % 2 === 0 && c % 2 === 0){ const ch = (dotOverride && dotOverride[K(c/2, r/2)]) || B.dot[r/2][c/2]; s += ch === null ? " " : ch; }
      else if (r % 2 === 0){ const k = K((c-1)/2, r/2); s += B.vwall.has(k) ? "|" : B.hlink.has(k) ? "=" : "."; }
      else if (c % 2 === 0){ s += B.hwall.has(K(c/2, (r-1)/2)) ? "-" : "."; }
      else s += ".";
    }
    rows.push(s);
  }
  return rows;
}

function generate(n, stageIdx, slotInStage, attempt){
  const st = SRC.STAGES[stageIdx];
  const rnd = mulberry(n * 7919 + attempt * 104729 + 13);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const t = slotInStage / 9;                                   // 0..1 within the stage
  const W = clamp(7 + Math.floor(stageIdx * .5) + ri(0, 2), 7, 13);
  const H = clamp(3 + Math.floor(stageIdx / 3) + ri(0, 1), 3, 6);
  const B = blank(W, H);
  const sy = ri(0, H-1), gy = ri(0, H-1);
  B.dot[sy][0] = "S"; B.dot[gy][W-1] = "G";
  const noUse = new Set();
  const isFree = (x, y) => B.dot[y][x] === "o" && !noUse.has(K(x, y));
  const freeDots = (f) => { const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isFree(x, y) && (!f || f(x, y))) out.push([x, y]); return out; };
  const farFromStart = (x, y) => Math.abs(x) + Math.abs(y - sy) >= 3;
  const cells = (f) => { const out = []; for (let y = 0; y < H-1; y++) for (let x = 0; x < W-1; x++) if (!f || f(x+.5, y+.5)) out.push([x+.5, y+.5]); return out; };
  const notNearStart = (x, y) => Math.hypot(x, y - sy) > 1.6 && Math.hypot(x-(W-1), y-gy) > .8;
  const tagFor = i => i === 0 ? undefined : i === 1 ? "EMH" : i === 2 ? "MH" : "H";
  const obj = (o, i) => { const d = tagFor(i); if (d) o.d = d; B.objects.push(o); };
  const COLORS = ["red","blue","green"];

  // Holes in the field.
  const holes = Math.round(W * H * (.04 + .1 * rnd()));
  for (let i = 0; i < holes; i++){ const f = freeDots((x) => x > 0 && x < W-1); if (f.length){ const [x, y] = pick(f); B.dot[y][x] = null; } }

  // Choose features: the stage's new elements first, then extras from the pool.
  const feats = [];
  if (st.fresh.length) feats.push(st.fresh[slotInStage % st.fresh.length]);
  const extra = 1 + Math.round(t * 2 + stageIdx * .25);
  for (let i = 0; i < extra * 3 && feats.length < extra + 1; i++){
    const f = pick(st.pool);
    if (feats.includes(f) && f !== "spinner" && f !== "spike") continue;
    if (DIVIDERS.has(f) && feats.some(g => DIVIDERS.has(g))) continue;
    feats.push(f);
  }
  feats.sort((a, b) => (DIVIDERS.has(b) ? 1 : 0) - (DIVIDERS.has(a) ? 1 : 0));

  // Dividers split the board left/right at column xd | xd+1.
  const xd = ri(2, Math.max(2, W - 5));
  const fullWall = () => { for (let y = 0; y < H; y++) B.vwall.add(K(xd, y)); };
  const leftCell = () => [ri(0, Math.max(0, xd-1)) + .5, ri(0, H-2) + .5];
  const counts = {};
  for (const f of feats){
    const i = counts[f] = (counts[f] || 0) + 1, idx = i - 1;
    switch (f){
      case "door": {
        fullWall();
        const y0 = ri(0, H-2);
        B.vwall.delete(K(xd, y0)); B.vwall.delete(K(xd, y0+1));
        const top = rnd() < .5;
        B.objects.push({ t:"door", seg:top ? [xd+.5, y0-.5, xd+.5, y0+1.5] : [xd+.5, y0+1.5, xd+.5, y0-.5], id:"r1", color:"red", pips:1 });
        B.objects.push({ t:"switch", at:leftCell(), id:"r1" });
        if (t > .4 && W - xd > 4){
          const xe = ri(xd + 2, W - 3);
          B.objects.push({ t:"door", seg:[xe+.5, ri(0,1)-.5, xe+.5, H-.5], id:"b2", color:"blue", pips:2, open:true, d:"MH" });
          B.objects.push({ t:"switch", at:[ri(xd+1, xe-1)+.5, ri(0, H-2)+.5], id:"b2", d:"MH" });
        }
        break;
      }
      case "hyper": {
        fullWall();
        const L = freeDots((x) => x < xd && x > 0), R = freeDots((x) => x >= xd + 2 && x < W-1);
        if (!L.length || !R.length) return null;
        const [ax, ay] = pick(L), [bx, by] = pick(R);
        B.dot[ay][ax] = "1"; B.dot[by][bx] = "1";
        break;
      }
      case "bomb": {
        fullWall();
        const by = ri(0, H-2), bx = xd - .5;
        let lx = ri(0, Math.max(0, xd-2)) + .5, ly = ri(0, H-2) + .5;
        if (Math.hypot(lx - bx, ly - (by+.5)) < 2) lx = .5, ly = by + .5 === .5 && H > 2 ? H - 1.5 : .5;
        const pathPts = [[lx, ly], [bx, ly], [bx, by + .5]].filter((p, i, a) => i === 0 || p[0] !== a[i-1][0] || p[1] !== a[i-1][1]);
        if (pathPts.length < 2) return null;
        B.objects.push({ t:"fuse", path:pathPts });
        break;
      }
      case "buster": {
        fullWall();
        const by = ri(0, H-2), bx = ri(0, Math.max(0, xd-1));
        B.objects.push({ t:"buster", at:[bx, by + .5] });
        if (t > .5 && H > 3) B.objects.push({ t:"buster", at:[ri(0, Math.max(0, xd-1)), ri(0, H-2) + .5] });
        break;
      }
      case "ud": {
        for (let y = 0; y < H; y++) B.dot[y][xd+1] = "a";
        B.objects.push({ t:"ud", at:leftCell(), group:"A" });
        if (t > .5) B.objects.push({ t:"ud", at:[ri(xd+2, W-2)+.5, ri(0, H-2)+.5], group:"A", d:"MH" });
        break;
      }
      case "mover": case "bar": {
        if (xd + 3 > W - 1) return null;
        for (let y = 0; y < H; y++){ B.dot[y][xd+1] = null; B.dot[y][xd+2] = null; }
        const y = ri(0, H-1);
        if (!B.dot[y][xd]) B.dot[y][xd] = "o";
        if (!B.dot[y][xd+3]) B.dot[y][xd+3] = "o";
        if (f === "mover") B.objects.push({ t:"mover", path:[[xd+1, y], [xd+2, y]] });
        else { B.dot[y][xd+1] = "o"; B.dot[y][xd+2] = "o"; B.hlink.add(K(xd+1, y)); noUse.add(K(xd+1, y)); noUse.add(K(xd+2, y)); }
        break;
      }
      case "bonus": { for (let k = ri(2, 4); k > 0; k--){ const fd = freeDots(); if (fd.length){ const [x, y] = pick(fd); B.dot[y][x] = "+"; } } break; }
      case "spinner": case "swinger": case "mspike": {
        const nE = f === "spinner" ? 1 + Math.round(t * 1.5 + stageIdx * .2) : 1 + Math.round(t);
        for (let e = 0; e < nE; e++){
          const fd = freeDots((x, y) => farFromStart(x, y) && !B.used.has(K(x, y)));
          if (!fd.length) break;
          const [x, y] = pick(fd);
          const nb = [0,1,2,3].filter(k => { const nx = x + [1,0,-1,0][k], ny = y + [0,1,0,-1][k]; return nx >= 0 && ny >= 0 && nx < W && ny < H && B.dot[ny][nx] && !B.vwall.has(K(Math.min(x,nx), y)); });
          const kind = f === "mspike" ? "spike" : "hand";
          let script = "n", q = ri(0, 3);
          if ((f === "swinger" || (f === "mspike" && rnd() < .5)) && nb.length){ q = pick(nb); script = pick(["nnns","nnns","nnnf","nnnnnnns"]); }
          const en = { x, y, q, dir:rnd() < .5 ? 1 : -1, color:pick(COLORS), script, kind };
          if (stageIdx >= 2 && rnd() < .3) en.speed = pick([.75, 1.25]);
          const d = tagFor(e + (counts.enemy = (counts.enemy || 0)));
          if (d) en.d = d;
          counts.enemy++;
          B.enemies.push(en); B.used.add(K(x, y));
        }
        break;
      }
      case "spike": { const c = cells(notNearStart); for (let k = 0, m = ri(1, 2) + Math.round(t*2); k < m && c.length; k++){ const [x, y] = c.splice(Math.floor(rnd()*c.length), 1)[0]; obj({ t:"spike", at:[x, y] }, k); } break; }
      case "glass": { const c = cells(); for (let k = ri(1, 2); k > 0 && c.length; k--){ const [x, y] = c.splice(Math.floor(rnd()*c.length), 1)[0]; B.objects.push({ t:"glass", at:[x, y] }); } break; }
      case "glob": { const c = cells((x, y) => Math.hypot(x, y - sy) > 2.2); for (let k = 0, m = ri(1, 2) + Math.round(t); k < m && c.length; k++){ const [x, y] = c.splice(Math.floor(rnd()*c.length), 1)[0]; obj({ t:"glob", at:[x, y] }, k); } break; }
      case "way": { const fd = freeDots((x) => x > 1 && x < W-2); if (fd.length){ const [x, y] = pick(fd); B.dot[y][x] = "W"; } break; }
      case "wall": {
        for (let k = ri(1, 3); k > 0; k--){
          const x = ri(1, W-3), y = ri(0, H-2);
          if (rnd() < .5){ B.vwall.add(K(x, y)); if (y + 1 < H) B.vwall.add(K(x, y+1)); }
          else { B.hwall.add(K(x, y)); if (x + 1 < W) B.hwall.add(K(x+1, y)); }
        }
        break;
      }
      case "slow": { const fd = freeDots((x) => x > 0); if (fd.length){ const [x, y] = pick(fd); B.dot[y][x] = "v"; } break; }
      case "ring": { for (let k = ri(3, 5); k > 0; k--){ const fd = freeDots((x) => x > 0); if (fd.length){ const [x, y] = pick(fd); B.dot[y][x] = "r"; } } break; }
      case "death": { for (let k = ri(3, 6); k > 0; k--){ const fd = freeDots((x) => x > 0); if (fd.length){ const [x, y] = pick(fd); B.dot[y][x] = "x"; } } break; }
      case "shield": {
        const near = B.enemies.length ? B.enemies : [{x:ri(1,W-2), y:ri(0,H-1)}];
        for (let k = ri(1, 2); k > 0; k--){
          const e = pick(near), fd = freeDots((x, y) => Math.abs(x - e.x) + Math.abs(y - e.y) === 1);
          if (fd.length){ const [x, y] = pick(fd); B.dot[y][x] = "s"; }
        }
        break;
      }
      case "gun": {
        const gx = ri(1, W-3) + .5, down = rnd() < .5, color = pick(COLORS);
        B.objects.push({ t:"gun", at:[gx, down ? -.7 : H - .3], color, dirs:[down ? 1 : 3] });
        B.objects.push({ t:"trigger", at:[ri(0, W-2) + .5, ri(0, H-2) + .5], color });
        if (t > .3){ const fd = freeDots((x, y) => farFromStart(x, y)); if (fd.length){ const [x, y] = pick(fd); B.enemies.push({ x, y, q:ri(0,3), dir:1, color, script:"n", d:"MH" }); } }
        break;
      }
    }
  }
  if (!B.dot.some(r => r.includes("S")) || !B.dot.some(r => r.includes("G"))) return null;
  const def = { stage:stageIdx + 1, map:toMap(B), objects:B.objects, enemies:B.enemies, feats };
  // Way stations are more plentiful on easier settings.
  if (feats.includes("way")){
    const fd = freeDots((x) => x > 1 && x < W-2);
    if (fd.length){ const [x, y] = pick(fd), ov = { [K(x, y)]:"W" }; def.vary = { C:{ map:toMap(B, ov) }, E:{ map:toMap(B, ov) } }; }
  }
  return def;
}

/* ---------------- solving one slot (worker) ---------------- */
function solveSlot(job){
  const S = require("./load.js")();
  const { n, stageIdx, slot, hand } = job;
  const verifyAll = (def, budget) => {
    const res = {};
    for (const d of DIFFS){
      const r = S.verifyLevel(def, d, { maxStates: budget || +(process.env.CW_BUDGET || 25000) });
      if (!r.ok) return null;
      res[d] = { secs:+r.secs.toFixed(1), moves:r.moves.length };
    }
    return res;
  };
  if (hand){
    const res = verifyAll(hand, 300000);
    return { n, def:hand, res, attempts:0, ok:!!res };
  }
  const minMoves = Math.round(5 + stageIdx * .5 + (slot / 9) * 3);
  for (let attempt = 0; attempt < 80; attempt++){
    const def = generate(n, stageIdx, slot, attempt);
    if (!def) continue;
    def.time = 600;
    let L;
    try { L = S.buildLevel(def, "M"); } catch (e){ continue; }
    const r = S.solveLevel(L, { limitQ:150 * S.SPEED.M, maxStates:Math.round(+(process.env.CW_BUDGET || 25000) * .6) });
    const need = attempt < 50 ? minMoves : Math.max(3, minMoves - 3);
    if (!r.ok || r.moves.length < need) continue;
    const secs = r.tq / S.SPEED.M;
    def.time = clamp(Math.round((secs * 2.2 + 25) / 5) * 5, 45, 240);
    const res = verifyAll(def);
    if (res) return { n, def, res, attempts:attempt + 1, ok:true };
  }
  return { n, ok:false };
}

if (!isMainThread){
  parentPort.on("message", job => {
    let r;
    try { r = solveSlot(job); } catch (e){ r = { n:job.n, ok:false, error:String(e && e.stack || e) }; }
    parentPort.postMessage(r);
  });
} else if (require.main !== module){
  module.exports = { generate, solveSlot };
} else {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i+1] : dflt; };
  const out = path.resolve(opt("--out", path.join(__dirname, "..", "src", "levels.json")));
  const only = opt("--only", "") ? opt("--only").split(",").map(Number) : null;
  const nWorkers = +opt("--workers", 2);
  const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : [];
  const jobs = [];
  for (let n = 1; n <= 100; n++){
    if (only && !only.includes(n)) continue;
    const stageIdx = Math.floor((n - 1) / 10), slot = (n - 1) % 10;
    const hand = SRC.HAND[n] ? Object.assign({ stage:stageIdx + 1 }, SRC.HAND[n]) : null;
    jobs.push({ n, stageIdx, slot, hand });
  }
  const results = {};
  for (const l of prev) if (l && l.n) results[l.n] = { n:l.n, def:l, ok:true, res:l.solved };
  const partial = out + ".partial";
  if (fs.existsSync(partial)) for (const r of JSON.parse(fs.readFileSync(partial, "utf8"))) if (r.ok && (!only || only.includes(r.n))) results[r.n] = r;
  // Resume: skip slots already solved in an interrupted run (the .partial file).
  const resumed = new Set(fs.existsSync(partial) ? JSON.parse(fs.readFileSync(partial, "utf8")).filter(r => r.ok).map(r => r.n) : []);
  const pending = jobs.filter(j => !resumed.has(j.n));
  jobs.length = 0; jobs.push(...pending);
  const savePartial = () => fs.writeFileSync(partial, JSON.stringify(Object.values(results).filter(r => r.ok && r.res)));
  let next = 0, active = 0, done = 0;
  const finish = () => {
    // Names: hand-made names are reserved; generated levels take the next unused term.
    const usedNames = new Set(Object.values(SRC.HAND).map(h => h.name));
    const pool = SRC.NAMES.filter(([nm]) => !usedNames.has(nm));
    const seenFresh = new Set();
    const list = [];
    for (let n = 1; n <= 100; n++){
      const r = results[n];
      if (!r || !r.ok){ console.error("Level " + n + " missing"); process.exitCode = 1; continue; }
      const d = r.def;
      if (!SRC.HAND[n]){
        const [name, note] = pool[(n * 37) % pool.length] && pool.splice((n * 37) % pool.length, 1)[0];
        d.name = name; d.note = note;
        const fresh = (d.feats || []).find(f => !seenFresh.has(f) && SRC.TIPS[f]);
        d.tip = SRC.TIPS[fresh || (d.feats || [])[0]] || "Study the level before your first key.";
      }
      for (const f of d.feats || []) seenFresh.add(f);
      d.n = n; d.solved = r.res;
      list.push(d);
    }
    fs.writeFileSync(out, JSON.stringify(list));
    console.log("Wrote " + list.length + " levels to " + out);
  };
  const pump = () => {
    while (active < nWorkers && next < jobs.length){
      const job = jobs[next++], wk = new Worker(__filename);
      active++;
      wk.once("message", r => {
        active--; done++;
        results[r.n] = r;
        if (r.ok) savePartial(); else if (r.error) console.error(r.error);
        const m = r.ok ? Object.entries(r.res).map(([d, v]) => d + " " + v.secs + "s/" + v.moves).join("  ") : "FAILED";
        console.log(`[${done}/${jobs.length}] #${r.n} ${r.ok ? "ok" : "FAIL"} ${r.attempts != null ? "(" + r.attempts + " tries)" : ""} ${m}`);
        wk.terminate();
        if (done === jobs.length){ finish(); try { fs.unlinkSync(partial); } catch (e){} } else pump();
      });
      wk.postMessage(job);
    }
  };
  if (!jobs.length) finish(); else pump();
}
