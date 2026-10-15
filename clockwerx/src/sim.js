/* =====================================================================
   SIMULATION — pure and deterministic. Shared by the game, the solver
   and the level generator (node extracts this block from the page).

   Angles are measured in quarter-turns "q": 0=east 1=south 2=west 3=north.
   Increasing q is clockwise on screen (y grows down).
   Every rate below is "per quarter-turn of a clock hand", so a level plays
   the same at every difficulty, only faster or slower.
   ===================================================================== */
const DIRS = [[1,0],[0,1],[-1,0],[0,-1]];
const mod4 = k => ((k % 4) + 4) % 4;
const key  = (x,y) => x + "," + y;

const SPEED   = {C:1.5, E:2.0, M:2.5, H:3.0};      // quarter-turns per second
const TIMEMUL = {C:Infinity, E:1.5, M:1, H:0.8};   // multiplier on a level's time limit
const DONE_PTS= {C:500, E:1000, M:2000, H:3000};   // completion bonus
const SEC_PTS = {C:0, E:10, M:15, H:20};           // points per second left
const DIFFNAME= {C:"Child", E:"Easy", M:"Medium", H:"Hard"};

const TUNE = {
  mover:1,        // moving dot: cells per quarter-turn (manual: one position per quarter revolution)
  bar:1,          // sliding along an extended dot: cells per quarter-turn
  door:.7,        // door open fraction per quarter-turn
  ud:.7,          // up/down dot travel per quarter-turn
  ring:6,         // quarter-turns before a ring dot reappears
  bullet:1.2,     // cells per quarter-turn
  spark:.6,       // fuse burn rate, cells per quarter-turn
  buster:1.5,     // wallbuster travel, cells per quarter-turn
  busterBack:10,  // quarter-turns before a wallbuster reappears
  globCreep:.35, globDrip:.5, globSit:2.5, globSplit:.3, globMax:8,
  bombR:1.25,     // blast radius for spikes, walls, globs and bonus dots
  bombKill:.9,    // blast radius for clock hands (distance to the hand body)
  touch:.13,      // how close a hand must pass to press a switch, lighter, etc.
};

/* ---------- geometry ---------- */
function handSeg(h, a0, a1){
  const a = h.q * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  return [h.x + c*a0, h.y + s*a0, h.x + c*a1, h.y + s*a1];
}
function orient(ax,ay,bx,by,cx,cy){ return (bx-ax)*(cy-ay) - (by-ay)*(cx-ax); }
function within(s,px,py){
  return Math.min(s[0],s[2])-1e-9 <= px && px <= Math.max(s[0],s[2])+1e-9 &&
         Math.min(s[1],s[3])-1e-9 <= py && py <= Math.max(s[1],s[3])+1e-9;
}
function segsCross(a,b){
  const E = 1e-9;
  const d1 = orient(b[0],b[1],b[2],b[3],a[0],a[1]), d2 = orient(b[0],b[1],b[2],b[3],a[2],a[3]);
  const d3 = orient(a[0],a[1],a[2],a[3],b[0],b[1]), d4 = orient(a[0],a[1],a[2],a[3],b[2],b[3]);
  if (((d1>E&&d2<-E)||(d1<-E&&d2>E)) && ((d3>E&&d4<-E)||(d3<-E&&d4>E))) return true;
  if (Math.abs(d1)<=E && within(b,a[0],a[1])) return true;
  if (Math.abs(d2)<=E && within(b,a[2],a[3])) return true;
  if (Math.abs(d3)<=E && within(a,b[0],b[1])) return true;
  if (Math.abs(d4)<=E && within(a,b[2],b[3])) return true;
  return false;
}
function ptSeg(px,py,s){
  const dx=s[2]-s[0], dy=s[3]-s[1], l=dx*dx+dy*dy;
  let t = l ? ((px-s[0])*dx + (py-s[1])*dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - s[0] - t*dx, py - s[1] - t*dy);
}
function segDist(a,b){
  if (segsCross(a,b)) return 0;
  return Math.min(ptSeg(a[0],a[1],b), ptSeg(a[2],a[3],b), ptSeg(b[0],b[1],a), ptSeg(b[2],b[3],a));
}
/** Polyline helper: cumulative lengths so a point can be found at distance s. */
function polyPrep(pts, closed){
  const P = pts.map(p => [p[0], p[1]]);
  if (closed && P.length > 1) P.push(P[0].slice());
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i-1] + Math.hypot(P[i][0]-P[i-1][0], P[i][1]-P[i-1][1]));
  return { pts:P, cum, total:cum[cum.length-1], closed };
}
function polyAt(o, s){
  if (!o.total) return o.pts[0].slice();
  s = o.closed ? ((s % o.total) + o.total) % o.total : Math.max(0, Math.min(o.total, s));
  let i = 1;
  while (i < o.cum.length-1 && o.cum[i] < s) i++;
  const a = o.pts[i-1], b = o.pts[i], f = (s - o.cum[i-1]) / ((o.cum[i] - o.cum[i-1]) || 1);
  return [a[0] + (b[0]-a[0])*f, a[1] + (b[1]-a[1])*f];
}
/** Seeded PRNG (mulberry32) kept inside the world so runs are reproducible. */
function rand(w){
  let t = (w.rng = (w.rng + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* =====================================================================
   LEVEL FORMAT
   map: character grid. Even row + even col = dot cell.
     dot cells : o dot · S start · T player-2 start · G goal · + bonus · W way station
                 v slowdown · s shield · x death · r ring · 1-9 hyperdot pair
                 A B C up/down dot (starts up) · a b c up/down dot (starts down)
     even row, odd col : | wall   = extended-dot link
     odd row, even col : - wall   : extended-dot link
     odd row, odd col  : * spike  ^ hourglass  % oil glob  @ wallbuster
   objects: [{t:"door", seg:[x1,y1,x2,y2], id, color, pips, open}
             {t:"switch", at:[x,y], id}            door switch
             {t:"trigger", at, color}  {t:"gun", at, color, dirs:[0..3]}
             {t:"fuse", path:[[x,y],...]}          lighter = first point, bomb = last
             {t:"ud", at, group:"A"}               up/down switch
             {t:"mover", path:[[x,y],...], type}   moving dot (closed loop)
             {t:"spike"|"glass"|"glob"|"buster", at}]
   enemies: [{x,y,q,dir,color,script,speed,kind:"hand"|"spike"}]
     script tokens, one per 90° crossing: n nothing · s swing · f flip · b bounce
   Any object or enemy may carry d:"CEMH" to appear only on those difficulties.
   vary: {C:{...}, E:{...}} replaces fields wholesale for a difficulty.
   ===================================================================== */
const DOTCH = {o:"dot", S:"dot", T:"dot", G:"goal", "+":"bonus", W:"way", v:"slow", s:"shield", x:"death", r:"ring"};
const inDiff = (o, diff) => !o.d || o.d.indexOf(diff) >= 0;

function buildLevel(def, diff){
  diff = diff || "M";
  const v = Object.assign({}, def, (def.vary && def.vary[diff]) || {});
  const rows = v.map, H = (rows.length + 1) / 2;
  const W = Math.ceil((Math.max(...rows.map(r => r.length)) + 1) / 2);
  const L = { def:v, diff, W, H, dots:[], grid:new Map(), movers:[], bars:[], walls:[], doors:[], switches:[],
              triggers:[], guns:[], fuses:[], uds:[], spikes:[], glasses:[], globs:[], busters:[],
              start:[null,null], groups:[], enemies:[] };
  const cells = new Map(), links = [];
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++){
    const ch = rows[r][c], er = r % 2 === 0, ec = c % 2 === 0;
    if (er && ec){ if (ch !== " " && ch !== ".") cells.set(key(c/2, r/2), {x:c/2, y:r/2, ch}); }
    else if (er){
      if (ch === "|") L.walls.push([c/2, r/2-.5, c/2, r/2+.5]);
      else if (ch === "=") links.push([key((c-1)/2, r/2), key((c+1)/2, r/2)]);
    } else if (ec){
      if (ch === "-") L.walls.push([c/2-.5, r/2, c/2+.5, r/2]);
      else if (ch === ":") links.push([key(c/2, (r-1)/2), key(c/2, (r+1)/2)]);
    } else {
      const p = {x:c/2, y:r/2};
      if (ch === "*") L.spikes.push(p); else if (ch === "^") L.glasses.push(p);
      else if (ch === "%") L.globs.push(p); else if (ch === "@") L.busters.push(p);
    }
  }
  // Extended dots: linked dot cells merge into one long bar.
  const parent = {};
  const find = a => parent[a] === undefined || parent[a] === a ? (parent[a] = a) : (parent[a] = find(parent[a]));
  for (const [a,b] of links) if (cells.has(a) && cells.has(b)) parent[find(a)] = find(b);
  const barGroups = {};
  for (const [a,b] of links) for (const k of [a,b]) if (cells.has(k)) (barGroups[find(k)] = barGroups[find(k)] || new Set()).add(k);
  for (const g of Object.values(barGroups)){
    const pts = [...g].map(k => cells.get(k));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const b = { x1:Math.min(...xs), y1:Math.min(...ys), x2:Math.max(...xs), y2:Math.max(...ys) };
    b.len = Math.max(b.x2-b.x1, b.y2-b.y1); b.i = L.bars.length;
    L.bars.push(b);
    for (const k of g) cells.delete(k);
  }
  const addDot = (x, y, ch, extra) => {
    let type = DOTCH[ch] || "dot", tag = 0, group = null, initUp = true;
    if (/[1-9]/.test(ch)){ type = "hyper"; tag = +ch; }
    else if (/[ABCabc]/.test(ch)){ type = "ud"; group = ch.toUpperCase(); initUp = ch === group; }
    if (type === "way" && diff === "H") type = "dot";          // Hard has no way stations
    const d = Object.assign({ i:L.dots.length, x, y, type, tag, group, initUp, mv:null, pair:null, colors:new Set() }, extra || {});
    L.dots.push(d);
    if (!d.mv) L.grid.set(key(x,y), d);
    if (ch === "S") L.start[0] = d;
    if (ch === "T") L.start[1] = d;
    return d;
  };
  for (const c of cells.values()) addDot(c.x, c.y, c.ch);
  for (const o of (v.objects || []).filter(o => inDiff(o, diff))){
    const at = o.at || [0,0];
    if (o.t === "door") L.doors.push({ i:L.doors.length, seg:o.seg.slice(), id:o.id, color:o.color||"red", pips:o.pips||1, open:!!o.open });
    else if (o.t === "switch") L.switches.push({ x:at[0], y:at[1], id:o.id });
    else if (o.t === "trigger") L.triggers.push({ x:at[0], y:at[1], color:o.color||"red" });
    else if (o.t === "gun") L.guns.push({ x:at[0], y:at[1], color:o.color||"red", dirs:o.dirs||[0] });
    else if (o.t === "fuse") L.fuses.push(polyPrep(o.path, false));
    else if (o.t === "ud") L.uds.push({ x:at[0], y:at[1], group:(o.group||"A").toUpperCase() });
    else if (o.t === "mover"){
      const ch = Object.keys(DOTCH).find(k => DOTCH[k] === (o.type||"dot")) || "o";
      L.movers.push(addDot(o.path[0][0], o.path[0][1], ch, { mv:polyPrep(o.path, true) }));
    }
    else if (o.t === "spike") L.spikes.push({x:at[0], y:at[1]});
    else if (o.t === "glass") L.glasses.push({x:at[0], y:at[1]});
    else if (o.t === "glob") L.globs.push({x:at[0], y:at[1]});
    else if (o.t === "buster") L.busters.push({x:at[0], y:at[1]});
  }
  for (const s of L.switches){ const d = L.doors.find(d => d.id === s.id); s.color = d ? d.color : "red"; s.pips = d ? d.pips : 1; }
  const hy = {};
  for (const d of L.dots) if (d.type === "hyper") (hy[d.tag] = hy[d.tag] || []).push(d);
  for (const t in hy){ const [a,b] = hy[t]; if (a && b){ a.pair = b; b.pair = a; } }
  L.groups = [...new Set(L.dots.filter(d => d.type === "ud").map(d => d.group))];
  L.enemies = (v.enemies || []).filter(e => inDiff(e, diff));
  L.bounds = [-1.3, -1.3, W + .3, H + .3];
  if (!L.start[0]) throw new Error("Level has no start dot (S)");
  return L;
}

/* =====================================================================
   WORLD — all mutable state, so it can be cloned for the solver.
   A hand: {x,y pivot, q angle, dir +1 cw/-1 ccw, on:{k:"d",i} | {k:"b",i,s,sd}}
   ===================================================================== */
function makeHand(d, q, dir, extra){
  return Object.assign({ x:d.x, y:d.y, q, dir, on:{k:"d", i:d.i}, dead:false, done:false }, extra);
}
function makeWorld(L, nPlayers, seed){
  const w = {
    tq:0, rng:(seed || 1) | 0, ev:[], gid:0,
    players:[], enemies:[],
    bonus:L.dots.map(d => d.type === "bonus" ? 1 : 0),
    ringT:L.dots.map(() => 0),
    ud:{}, doors:L.doors.map(d => ({ o:d.open ? 1 : 0, tg:d.open ? 1 : 0 })),
    walls:L.walls.map(() => 1), spikes:L.spikes.map(() => 1), glasses:L.glasses.map(() => 1),
    fuses:L.fuses.map(() => ({ st:0, s:0 })), bullets:[],
    busters:L.busters.map(b => ({ x:b.x, y:b.y, dx:0, dy:0, st:0, t:0 })),
    globs:[], touch:{},
  };
  for (const g of L.globs) w.globs.push({ id:w.gid++, x:g.x, y:g.y, st:0, dot:-1, t:0, dx:0, dy:0 });
  for (const g of L.groups) w.ud[g] = { p:0, tg:0 };
  for (let p = 0; p < nPlayers; p++){
    const s = L.start[p] || L.start[0];
    w.players.push(makeHand(s, p === 1 && !L.start[1] ? 2 : 0, 1, { id:p, kind:"player" }));
  }
  L.enemies.forEach((e, i) => {
    const d = L.grid.get(key(e.x, e.y));
    if (!d) throw new Error("Enemy at " + e.x + "," + e.y + " is not on a dot");
    w.enemies.push(makeHand(d, e.q || 0, e.dir || 1,
      { id:2 + i, kind:e.kind || "hand", color:e.color || "red", script:e.script || "n", speed:e.speed || 1, i:0 }));
  });
  return w;
}

/* ---------- dot and pivot helpers ---------- */
function dotPos(L, w, d){ return d.mv ? polyAt(d.mv, w.tq * TUNE.mover) : [d.x, d.y]; }
function udLevel(w, d){ const g = w.ud[d.group]; return d.initUp ? 1 - g.p : g.p; }
function grabbable(w, d){ return w.ringT[d.i] <= 0 && (d.type !== "ud" || udLevel(w, d) >= 1); }
function onDot(L, h){ return h.on.k === "d" ? L.dots[h.on.i] : null; }
function refPos(L, w, on){
  if (on.k === "d") return dotPos(L, w, L.dots[on.i]);
  const b = L.bars[on.i], f = b.len ? on.s / b.len : 0;
  return [b.x1 + (b.x2-b.x1)*f, b.y1 + (b.y2-b.y1)*f];
}
/** What a tip at (tx,ty) can grab: a dot (static or moving) or a point on an extended dot. */
function findGrab(L, w, tx, ty){
  let best = null, bd = .22;
  const consider = d => {
    if (!grabbable(w, d)) return;
    const p = dotPos(L, w, d), dd = Math.hypot(p[0]-tx, p[1]-ty);
    if (dd < bd){ bd = dd; best = { k:"d", i:d.i, x:p[0], y:p[1] }; }
  };
  const g = L.grid.get(key(Math.round(tx), Math.round(ty)));
  if (g) consider(g);
  for (const d of L.movers) consider(d);
  for (const b of L.bars){
    const horiz = b.y1 === b.y2;
    const s = Math.max(0, Math.min(b.len, horiz ? tx - b.x1 : ty - b.y1));
    const px = horiz ? b.x1 + s : b.x1, py = horiz ? b.y1 : b.y1 + s, dd = Math.hypot(px-tx, py-ty);
    if (dd < .15 && dd < bd){ bd = dd; best = { k:"b", i:b.i, s, x:px, y:py }; }
  }
  return best;
}
function doorSeg(L, w, i){
  const s = L.doors[i].seg, o = w.doors[i].o;
  return [s[0] + (s[2]-s[0])*o, s[1] + (s[3]-s[1])*o, s[2], s[3]];   // the panel retracts toward the first end
}
function activeWalls(L, w){
  const out = [];
  for (let i = 0; i < L.walls.length; i++) if (w.walls[i]) out.push(L.walls[i]);
  for (let i = 0; i < L.doors.length; i++) if (w.doors[i].o < .999) out.push(doorSeg(L, w, i));
  return out;
}
function hitsWalls(walls, h){ const s = handSeg(h, 0, 1); for (const x of walls) if (segsCross(s, x)) return true; return false; }
function kill(w, h, why){
  if (h.dead) return;
  h.dead = true;
  w.ev.push({ e:h.kind === "player" ? "die" : "edie", p:h.id, why, x:h.x, y:h.y, q:h.q });
}

/* ---------- rotation ---------- */
/** Turn hand h by `amount` quarter-turns. At each exact 90° mark onCross(h,k) runs;
    returning "stop" ends this step. Walls reverse the spin. */
function advance(walls, h, amount, onCross){
  if (Math.abs(h.q) > 400) h.q = ((h.q % 4) + 4) % 4;
  let rem = amount, guard = 0;
  while (rem > 1e-12 && guard++ < 6){
    const b = h.dir > 0 ? Math.floor(h.q) + 1 : Math.ceil(h.q) - 1;
    const dist = Math.abs(b - h.q), step = Math.min(rem, dist), old = h.q;
    h.q = old + h.dir * step;
    if (hitsWalls(walls, h)){ h.q = old; h.dir = -h.dir; return "wall"; }
    rem -= step;
    if (step >= dist - 1e-12){ h.q = b; if (onCross(h, mod4(b)) === "stop") return "stop"; }
  }
  return "";
}

/** Move hand onto target t found in direction k. keep=true keeps the spin (flip). */
function grabTo(L, w, h, t, k, keep){
  const isP = h.kind === "player", prev = onDot(L, h), d = t.k === "d" ? L.dots[t.i] : null;
  h.on = t.k === "d" ? { k:"d", i:t.i } : { k:"b", i:t.i, s:t.s, sd:t.s < L.bars[t.i].len/2 ? 1 : -1 };
  h.x = t.x; h.y = t.y; h.q = mod4(k + 2);
  if (!keep) h.dir = -h.dir;
  if (d && d.type === "hyper" && d.pair){
    h.on = { k:"d", i:d.pair.i };
    const p = dotPos(L, w, d.pair); h.x = p[0]; h.y = p[1];
    if (isP){ w.ev.push({ e:"hyper", p:h.id }); if (hitsWalls(activeWalls(L, w), h)) kill(w, h, "You hyperdotted into a wall."); }
  }
  if (!isP) return;
  w.ev.push({ e:"grab", p:h.id });
  if (prev && prev.type === "ring") w.ringT[prev.i] = TUNE.ring;
  if (!d) return;
  if (prev && prev.type === "death" && d.type === "death") return kill(w, h, "You jumped from one death dot to another.");
  if (w.globs.some(g => g.st === 2 && g.dot === d.i)) return kill(w, h, "You grabbed a dot an oil glob was sitting on.");
  if (d.type === "goal") w.ev.push({ e:"goal", p:h.id });
  if (d.type === "bonus" && w.bonus[d.i]){ w.bonus[d.i] = 0; w.ev.push({ e:"bonus", p:h.id, x:d.x, y:d.y, i:d.i }); }
  if (d.type === "way") w.ev.push({ e:"way", p:h.id, i:d.i, q:h.q, dir:h.dir });
}
/** A player's choice at a 90° mark: n nothing · s swing · f flip · b bounce off a dot · r reverse.
    Returns true if the hand changed course. */
function playerAct(L, w, h, k, act){
  if (!act || act === "n") return false;
  if (act === "r"){ h.dir = -h.dir; return true; }
  const t = findGrab(L, w, h.x + DIRS[k][0], h.y + DIRS[k][1]);
  if (!t) return false;
  if (act === "b"){ h.dir = -h.dir; w.ev.push({ e:"bounce", p:h.id }); return true; }
  grabTo(L, w, h, t, k, act === "f");
  return true;
}
function crossEnemy(L, w, h, k){
  const tok = h.script[h.i++ % h.script.length];
  if (tok === "n") return "";
  const t = findGrab(L, w, h.x + DIRS[k][0], h.y + DIRS[k][1]);
  if (!t) return "";
  if (tok === "b"){ h.dir = -h.dir; return "stop"; }
  grabTo(L, w, h, t, k, tok === "f");
  return "stop";
}
/** Carry a hand along with a moving dot or an extended dot. Returns true if the pivot moved. */
function ride(L, w, h, dq){
  if (h.on.k === "b"){
    const b = L.bars[h.on.i];
    let s = h.on.s + h.on.sd * TUNE.bar * dq;
    if (s > b.len){ s = 2*b.len - s; h.on.sd = -1; }
    if (s < 0){ s = -s; h.on.sd = 1; }
    h.on.s = s;
  } else if (!L.dots[h.on.i].mv) return false;
  const p = refPos(L, w, h.on), moved = p[0] !== h.x || p[1] !== h.y;
  h.x = p[0]; h.y = p[1];
  return moved;
}

/* ---------- objects ---------- */
function fire(L, w, color){
  for (const g of L.guns) if (g.color === color)
    for (const k of g.dirs) w.bullets.push({ x:g.x + DIRS[k][0]*.3, y:g.y + DIRS[k][1]*.3, k });
  w.ev.push({ e:"fire" });
}
const outside = (L, x, y) => x < L.bounds[0] || y < L.bounds[1] || x > L.bounds[2] || y > L.bounds[3];
function stepBullets(L, w, dq, walls){
  const v = TUNE.bullet * dq;
  w.bullets = w.bullets.filter(b => {
    const nx = b.x + DIRS[b.k][0]*v, ny = b.y + DIRS[b.k][1]*v, seg = [b.x, b.y, nx, ny];
    for (const s of walls) if (segsCross(seg, s)) return false;      // bullets stop at walls and doors
    b.x = nx; b.y = ny;
    if (outside(L, b.x, b.y)) return false;
    for (const p of w.players) if (!p.dead && !p.done && ptSeg(b.x, b.y, handSeg(p, 0, 1)) < .07) kill(w, p, "A bullet hit your hand.");
    return true;                                                     // and pass straight through enemy hands
  });
}
function explode(L, w, bx, by){
  w.ev.push({ e:"boom", x:bx, y:by });
  for (const h of w.players.concat(w.enemies))
    if (!h.dead && !h.done && ptSeg(bx, by, h.kind === "spike" ? spikePoint(h).concat(spikePoint(h)) : handSeg(h, 0, 1)) < TUNE.bombKill)
      kill(w, h, "A bomb went off next to your hand.");
  L.spikes.forEach((s, i) => { if (Math.hypot(s.x-bx, s.y-by) < TUNE.bombR) w.spikes[i] = 0; });
  for (const g of w.globs) if (Math.hypot(g.x-bx, g.y-by) < TUNE.bombR) g.st = 9;
  L.walls.forEach((s, i) => { if (ptSeg(bx, by, s) < TUNE.bombR) w.walls[i] = 0; });
  for (const d of L.dots) if (w.bonus[d.i]){ const p = dotPos(L, w, d); if (Math.hypot(p[0]-bx, p[1]-by) < TUNE.bombR) w.bonus[d.i] = 0; }
}
function stepFuses(L, w, dq){
  L.fuses.forEach((f, i) => {
    const s = w.fuses[i];
    if (s.st !== 1) return;
    s.s += TUNE.spark * dq;
    if (s.s >= f.total){ s.st = 2; const b = f.pts[f.pts.length-1]; explode(L, w, b[0], b[1]); }
  });
}
function stepBusters(L, w, dq){
  L.busters.forEach((home, i) => {
    const b = w.busters[i];
    if (b.st === 1){
      const v = TUNE.buster * dq;
      b.x += b.dx * v; b.y += b.dy * v;
      let hit = false;
      L.walls.forEach((s, j) => { if (w.walls[j] && ptSeg(b.x, b.y, s) < .12) hit = true; });
      if (hit){
        L.walls.forEach((s, j) => { if (w.walls[j] && ptSeg(b.x, b.y, s) < .55) w.walls[j] = 0; });
        w.ev.push({ e:"dust", x:b.x, y:b.y }); b.st = 2; b.t = TUNE.busterBack; return;
      }
      for (let j = 0; j < L.doors.length; j++)
        if (w.doors[j].o < .999 && ptSeg(b.x, b.y, doorSeg(L, w, j)) < .12){ b.dx = -b.dx; b.dy = -b.dy; b.x += b.dx*v*2; b.y += b.dy*v*2; break; }
      if (outside(L, b.x, b.y)){ b.st = 2; b.t = TUNE.busterBack; }
    } else if (b.st === 2){
      b.t -= dq;
      if (b.t <= 0){ b.st = 0; b.x = home.x; b.y = home.y; }
    }
  });
}
function nearestDot(L, w, x, y){
  let best = -1, bd = 1e9;
  for (const d of L.dots){ if (!grabbable(w, d)) continue; const p = dotPos(L, w, d), dd = Math.hypot(p[0]-x, p[1]-y); if (dd < bd){ bd = dd; best = d.i; } }
  return best;
}
/* Oil globs: 0 dormant · 1 creeping to the nearest dot · 2 sitting on a dot · 4 dripping to the next dot · 3 leaving · 9 gone */
function stepGlobs(L, w, dq){
  const live = w.players.filter(p => !p.dead && !p.done);
  const add = [];
  for (const g of w.globs){
    if (g.st === 1 || g.st === 4){
      const p = dotPos(L, w, L.dots[g.dot]), v = (g.st === 1 ? TUNE.globCreep : TUNE.globDrip) * dq;
      const dx = p[0]-g.x, dy = p[1]-g.y, dd = Math.hypot(dx, dy);
      if (dd <= v){
        g.x = p[0]; g.y = p[1]; g.st = 2; g.t = TUNE.globSit;
        for (const pl of live){ const od = onDot(L, pl); if (od && od.i === g.dot) kill(w, pl, "An oil glob landed on your dot."); }
      } else { g.x += dx/dd*v; g.y += dy/dd*v; }
    } else if (g.st === 2){
      const p = dotPos(L, w, L.dots[g.dot]); g.x = p[0]; g.y = p[1];
      g.t -= dq;
      if (g.t > 0) continue;
      const nb = [];
      for (let k = 0; k < 4; k++){ const t = findGrab(L, w, g.x + DIRS[k][0], g.y + DIRS[k][1]); if (t && t.k === "d") nb.push(t.i); }
      const targets = live.length ? live : w.players;
      if (!nb.length || !targets.length){
        const pl = targets[0], ax = pl ? pl.x - g.x : 1, ay = pl ? pl.y - g.y : 0;
        g.st = 3; g.dx = Math.abs(ax) >= Math.abs(ay) ? Math.sign(ax) || 1 : 0; g.dy = g.dx ? 0 : Math.sign(ay); continue;
      }
      const dist = i => { const q = dotPos(L, w, L.dots[i]); return Math.min(...targets.map(pl => Math.hypot(pl.x-q[0], pl.y-q[1]))); };
      nb.sort((a, b) => dist(a) - dist(b));
      const pick = rand(w) < .75 ? nb[0] : nb[Math.floor(rand(w) * nb.length)];
      g.dot = pick; g.st = 4;
      if (nb.length > 1 && w.globs.length + add.length < TUNE.globMax && rand(w) < TUNE.globSplit){
        add.push({ id:w.gid++, x:g.x, y:g.y, st:4, dot:nb.find(i => i !== pick), t:0, dx:0, dy:0 });
        w.ev.push({ e:"split", x:g.x, y:g.y });
      }
    } else if (g.st === 3){
      g.x += g.dx * TUNE.globDrip * dq; g.y += g.dy * TUNE.globDrip * dq;
      if (outside(L, g.x, g.y)) g.st = 9;
    }
  }
  if (add.length) w.globs.push(...add);
  if (w.globs.some(g => g.st === 9)) w.globs = w.globs.filter(g => g.st !== 9);
}
function spikePoint(e){ const a = e.q * Math.PI / 2; return [e.x + Math.cos(a)*.5, e.y + Math.sin(a)*.5]; }

/** Switches, triggers, lighters, hourglasses, dormant globs and wallbusters react once
    when a hand starts passing over them (edge-triggered per hand). */
function touches(L, w){
  const hs = [];
  for (const h of w.players) if (!h.dead && !h.done) hs.push(h);
  for (const e of w.enemies) if (!e.dead && e.kind === "hand") hs.push(e);
  const segs = hs.map(h => handSeg(h, 0, 1));
  const edge = (id, x, y, playersOnly, fn) => {
    let m = 0;
    hs.forEach((h, j) => { if ((!playersOnly || h.kind === "player") && ptSeg(x, y, segs[j]) < TUNE.touch) m |= 1 << h.id; });
    const old = w.touch[id] || 0;
    if (m) w.touch[id] = m; else delete w.touch[id];
    const rise = m & ~old;
    if (rise) fn(hs.find(h => rise & (1 << h.id)));
  };
  L.switches.forEach((s, i) => edge("s"+i, s.x, s.y, false, () => {
    L.doors.forEach((d, j) => { if (d.id === s.id) w.doors[j].tg = 1 - w.doors[j].tg; });
    w.ev.push({ e:"switch" });
  }));
  L.uds.forEach((s, i) => edge("u"+i, s.x, s.y, false, () => { const g = w.ud[s.group]; if (g){ g.tg = 1 - g.tg; w.ev.push({ e:"switch" }); } }));
  L.triggers.forEach((s, i) => edge("t"+i, s.x, s.y, false, () => fire(L, w, s.color)));
  L.fuses.forEach((f, i) => edge("f"+i, f.pts[0][0], f.pts[0][1], true, () => {
    if (w.fuses[i].st === 0){ w.fuses[i].st = 1; w.ev.push({ e:"light" }); }
  }));
  L.glasses.forEach((g, i) => { if (w.glasses[i]) edge("g"+i, g.x, g.y, true, h => { w.glasses[i] = 0; w.ev.push({ e:"glass", p:h.id, x:g.x, y:g.y, i }); }); });
  for (const g of w.globs) if (g.st === 0) edge("o"+g.id, g.x, g.y, true, () => {
    const d = nearestDot(L, w, g.x, g.y);
    if (d >= 0){ g.dot = d; g.st = 1; w.ev.push({ e:"glob" }); }
  });
  L.busters.forEach((home, i) => {
    const b = w.busters[i];
    if (b.st !== 0){ delete w.touch["b"+i]; return; }
    edge("b"+i, b.x, b.y, true, h => {
      const a = h.q * Math.PI / 2, tx = -Math.sin(a) * h.dir, ty = Math.cos(a) * h.dir;
      if (Math.abs(tx) >= Math.abs(ty)){ b.dx = Math.sign(tx); b.dy = 0; } else { b.dx = 0; b.dy = Math.sign(ty); }
      b.st = 1; w.ev.push({ e:"push" });
    });
  });
}
/** Two hands whose tips meet at the same dot from different sides do not collide:
    near a shared dot only the inner parts of the bodies count. */
const MEET_R = .3;
function handsCollide(L, w, a, b){
  const ta = handSeg(a, 1, 1), tb = handSeg(b, 1, 1);
  let end = .97;
  if (Math.hypot(a.x - b.x, a.y - b.y) > .5 && Math.hypot(ta[0] - tb[0], ta[1] - tb[1]) < 2 * MEET_R){
    const d = findGrab(L, w, (ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2);
    if (d && Math.hypot(ta[0] - d.x, ta[1] - d.y) < MEET_R && Math.hypot(tb[0] - d.x, tb[1] - d.y) < MEET_R) end = 1 - MEET_R - .05;
  }
  return segDist(handSeg(a, .1, end), handSeg(b, .1, end)) < .045;
}
function hazards(L, w){
  for (const p of w.players){
    if (p.dead || p.done) continue;
    const od = onDot(L, p), shield = od && od.type === "shield";
    const full = handSeg(p, 0, 1);
    for (const e of w.enemies){
      if (e.dead) continue;
      if (e.kind === "hand"){ if (!shield && handsCollide(L, w, p, e)){ kill(w, p, "An enemy hand caught yours."); break; } }
      else { const sp = spikePoint(e); if (ptSeg(sp[0], sp[1], full) < .08){ kill(w, p, "A moving spike hit your hand."); break; } }
    }
    if (p.dead) continue;
    for (let i = 0; i < L.spikes.length && !p.dead; i++)
      if (w.spikes[i] && ptSeg(L.spikes[i].x, L.spikes[i].y, full) < .07) kill(w, p, "Your hand hit a spike.");
    for (let i = 0; i < L.fuses.length && !p.dead; i++){
      const s = w.fuses[i];
      if (s.st === 1 && s.s > .3){ const sp = polyAt(L.fuses[i], s.s);   // the spark is harmless until it leaves the lighter
        if (ptSeg(sp[0], sp[1], full) < .08) kill(w, p, "You touched a burning fuse."); }
    }
    for (let i = 0; i < L.doors.length && !p.dead; i++){
      const s = w.doors[i];
      if (s.o !== s.tg && s.o < .999 && segsCross(full, doorSeg(L, w, i))) kill(w, p, "A moving door guillotined your hand.");
    }
  }
}

/** One fixed step. decide(hand, k) returns the player's action at a 90° mark,
    or "hold" to stop there without acting (the solver uses that to branch). */
function worldStep(L, w, dt, speed, decide){
  const dq = speed * dt;
  w.tq += dq;
  for (let i = 0; i < w.ringT.length; i++) if (w.ringT[i] > 0) w.ringT[i] = Math.max(0, w.ringT[i] - dq);
  for (const d of w.doors) if (d.o !== d.tg) d.o = d.tg > d.o ? Math.min(d.tg, d.o + TUNE.door*dq) : Math.max(d.tg, d.o - TUNE.door*dq);
  for (const g in w.ud){ const u = w.ud[g]; if (u.p !== u.tg) u.p = u.tg > u.p ? Math.min(u.tg, u.p + TUNE.ud*dq) : Math.max(u.tg, u.p - TUNE.ud*dq); }
  let walls = activeWalls(L, w);
  for (const h of w.players.concat(w.enemies)){
    if (h.dead || h.done) continue;
    const moved = ride(L, w, h, dq), d = onDot(L, h);
    if (d && d.type === "ud" && udLevel(w, d) < .5){ kill(w, h, "Your dot sank into the floor."); continue; }
    if (moved && h.kind === "player" && hitsWalls(walls, h)) kill(w, h, "Your dot carried you into a wall.");
  }
  const slow = w.players.some(p => !p.dead && !p.done && (onDot(L, p) || {}).type === "slow") ? .5 : 1;
  for (const e of w.enemies) if (!e.dead) advance(walls, e, dq * e.speed * slow, (h, k) => crossEnemy(L, w, h, k));
  for (const p of w.players) if (!p.dead && !p.done) advance(walls, p, dq, (h, k) => {
    const a = decide(h, k);
    if (a === "hold") return "stop";
    return playerAct(L, w, h, k, a) ? "stop" : "";
  });
  walls = activeWalls(L, w);
  stepBullets(L, w, dq, walls);
  stepFuses(L, w, dq);
  stepBusters(L, w, dq);
  stepGlobs(L, w, dq);
  touches(L, w);
  hazards(L, w);
}

/** Run enemies alone so dots can be tinted with the colours of the hands that use them. */
function tintDots(L){
  for (const d of L.dots) d.colors.clear();
  const w = makeWorld(L, 0, 1);
  const tag = () => { for (const e of w.enemies) if (!e.dead && e.kind === "hand" && e.on.k === "d") L.dots[e.on.i].colors.add(e.color); };
  tag();
  for (let i = 0; i < 6000; i++){ worldStep(L, w, .03, 1, () => "n"); tag(); }
}

/* =====================================================================
   SOLVER — breadth-first search over the player's choice at every 90° mark
   (carry on · reverse · swing · flip), with the whole world simulated as in
   play. It never reverses between marks and ignores hourglasses, so it is
   slightly pessimistic: if it finds a path, a careful player can win.
   ===================================================================== */
function cloneDeep(o){
  if (Array.isArray(o)) return o.map(cloneDeep);
  if (o && typeof o === "object"){ const r = {}; for (const k in o) r[k] = cloneDeep(o[k]); return r; }
  return o;
}
function worldSig(L, w){
  const R = v => Math.round(v * 40), out = [];
  for (const h of w.players.concat(w.enemies)){
    if (h.dead){ out.push("x"); continue; }
    out.push(R(h.x), R(h.y), R(mod4(h.q)), h.dir, h.on.k, h.on.i, h.on.k === "b" ? R(h.on.s) + "/" + h.on.sd : "", h.script ? h.i % h.script.length : "");
  }
  for (const d of L.movers) out.push("m" + R((w.tq * TUNE.mover) % d.mv.total));
  out.push(w.ringT.map(R).join(""), w.doors.map(d => R(d.o) + "" + d.tg).join(""));
  for (const g in w.ud) out.push(R(w.ud[g].p) + "" + w.ud[g].tg);
  out.push(w.walls.join(""), w.spikes.join(""), w.fuses.map(f => f.st + ":" + R(f.s)).join(""));
  out.push(w.bullets.map(b => R(b.x) + "," + R(b.y) + "," + b.k).sort().join(";"));
  out.push(w.busters.map(b => b.st === 2 ? "2:" + Math.ceil(b.t) : b.st + ":" + R(b.x) + "," + R(b.y)).join(";"));   // coarse keys only merge states, so found paths stay valid
  out.push(w.globs.map(g => g.st + ":" + R(g.x) + "," + R(g.y) + "," + g.dot + "," + R(g.t)).join(";"));
  out.push(Object.keys(w.touch).sort().map(k => k + w.touch[k]).join(""), w.globs.length ? w.rng : "");
  return out.join("|");
}
/** opts: {limitQ (quarter-turns), maxStates, step}. Returns {ok, tq, moves, states, reason}. */
function solveLevel(L, opts){
  opts = opts || {};
  const step = opts.step || .015, limitQ = opts.limitQ || 1e9, maxStates = opts.maxStates || 200000;
  const start = makeWorld(L, 1, opts.seed || 1);
  start.moves = [];
  const seen = new Set([worldSig(L, start)]);
  let queue = [start], states = 0;
  while (queue.length){
    const next = [];
    for (const w0 of queue){
      const w = cloneDeep(w0);
      let k = -1;
      const decide = (h, kk) => { k = kk; return "hold"; };
      while (k < 0 && w.tq < limitQ && !w.players[0].dead){ w.ev.length = 0; worldStep(L, w, step, 1, decide); }
      if (k < 0 || w.players[0].dead) continue;
      const P = w.players[0];
      const opts2 = ["n", "r"];
      if (findGrab(L, w, P.x + DIRS[k][0], P.y + DIRS[k][1])) opts2.push("s", "f");
      for (const a of opts2){
        const w2 = cloneDeep(w);
        w2.ev = [];
        playerAct(L, w2, w2.players[0], k, a);
        hazards(L, w2);
        if (w2.players[0].dead) continue;
        if (a !== "n") w2.moves = w.moves.concat([{ tq:+w.tq.toFixed(2), a, k }]);
        if (w2.ev.some(e => e.e === "goal")) return { ok:true, tq:w2.tq, moves:w2.moves, states };
        const s = worldSig(L, w2);
        if (seen.has(s)) continue;
        seen.add(s); next.push(w2);
        if (++states > maxStates) return { ok:false, reason:"search limit", states };
      }
    }
    queue = next;
  }
  return { ok:false, reason:"no path", states };
}
/** Solve a level definition on one difficulty, checking its time limit. */
function verifyLevel(def, diff, opts){
  const L = buildLevel(def, diff);
  const lim = Math.min(600, def.time * TIMEMUL[diff]);
  const r = solveLevel(L, Object.assign({ limitQ:lim * SPEED[diff] }, opts || {}));
  r.secs = r.ok ? r.tq / SPEED[diff] : 0; r.limit = lim;
  return r;
}
