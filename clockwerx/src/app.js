/* =====================================================================
   APP — storage, screens, menus, game flow, input, audio, rendering.
   The simulation above is pure; everything with a side effect lives here.
   ===================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString();
const STAGE_NAMES = ["FIRST TICK","THE ESCAPEMENT","GOING TRAIN","STRIKE WORK","COMPLICATIONS","TRAVELLING DOTS","OIL SINK","MAINSPRING","GRANDE SONNERIE","MASTER REGULATOR"];

/* ---------------- storage ---------------- */
const STORE = "clockwerx.v2";
const DEFAULT_OPTS = { name1:"New Player", name2:"Player 2", control:"keyboard", type:1, time:0, diff:"M", sound:true, music:"loop", indicator:true };
let S = { qok:false, opts:Object.assign({}, DEFAULT_OPTS), sets:{}, sel:{}, custom:null };
try {
  const raw = localStorage.getItem(STORE);
  if (raw){ const o = JSON.parse(raw); S = Object.assign(S, o); S.opts = Object.assign({}, DEFAULT_OPTS, o.opts || {}); }
} catch (e){}
function save(){ try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e){} }

/* ---------------- level sets ---------------- */
let SET = { id:"builtin", name:"Built-in levels", levels:BUILTIN_LEVELS };
/** Check every level of a custom set builds; returns the cleaned list or throws. */
function validateLevels(list){
  if (!Array.isArray(list) || !list.length) throw new Error("The file has no levels.");
  return list.map((d, i) => {
    if (!d || !Array.isArray(d.map)) throw new Error("Level " + (i+1) + " has no map.");
    const def = Object.assign({ name:"Level " + (i+1), time:90, note:"", tip:"", stage:Math.floor(i/10) + 1, objects:[], enemies:[] }, d);
    for (const df of ["C","E","M","H"]) buildLevel(def, df);
    return def;
  });
}
function useCustom(name, levels, remember){
  SET = { id:"custom:" + name, name, levels };
  if (remember){ S.custom = JSON.stringify({ name, levels }); save(); }
}
if (S.custom){ try { const c = JSON.parse(S.custom); useCustom(c.name, validateLevels(c.levels), false); } catch (e){ S.custom = null; } }
function setData(){ return S.sets[SET.id] || (S.sets[SET.id] = { profiles:{}, top1:{}, top2:{}, tot2:{} }); }
function profile(name){ const sd = setData(); return sd.profiles[name] || (sd.profiles[name] = { done:{}, best:{}, skipped:[] }); }
function totalOf(name){ return Object.values(profile(name).best).reduce((a, b) => a + b.score, 0); }
function rating(t){ return t < 2000 ? "Beginner" : t < 15000 ? "Apprentice" : t < 60000 ? "Journeyman" : t < 150000 ? "Clocksmith" : "Master Horologist"; }
function frontier(name){ const p = profile(name), N = SET.levels.length; let i = 0; while (i < N-1 && (p.done[i] || p.skipped.includes(i))) i++; return i; }
function stageOf(i){ return SET.levels[i].stage || Math.floor(i/10) + 1; }
function stageName(s){ return SET.id === "builtin" ? STAGE_NAMES[s-1] || "STAGE " + s : "STAGE " + s; }
function pushTop(list, entry, keep){ list.push(entry); list.sort((a, b) => b.score - a.score); list.length = Math.min(list.length, keep || 10); }
function p1(){ return (S.opts.name1 || "").trim() || "Player 1"; }

/* ---------------- screens & menus ---------------- */
const UI = { screen:null, back:null, idleAt:0 };
const PANELS = ["scrTitle","scrOptions","scrScores","scrHelp","scrAbout"];
function show(id){
  for (const s of PANELS) $("#" + s).hidden = s !== id;
  UI.screen = id;
  if (id === "scrOptions") UI.idleAt = performance.now();
  const focus = id && $("#" + id + " [data-close], #" + id + " #bPlay");
  if (focus) focus.focus();
}
function openPanel(id){
  if (UI.screen === id) return;
  if (!UI.screen && G.active) pauseGame(false);
  UI.back = UI.screen || (G.active ? "game" : "scrOptions");
  show(id);
  if (id === "scrScores") renderScores();
}
function closePanel(){
  const b = UI.back; UI.back = null;
  if (b === "game") show(null); else if (b === "scrTitle") goTitle(); else goOptions();
}
$$("[data-close]").forEach(b => b.onclick = closePanel);

function closeMenus(){ $$(".menu > button").forEach(b => { b.setAttribute("aria-expanded", "false"); b.nextElementSibling.hidden = true; }); }
$$(".menu > button").forEach(b => b.addEventListener("click", e => {
  const open = b.getAttribute("aria-expanded") === "true";
  closeMenus();
  if (!open){ b.setAttribute("aria-expanded", "true"); b.nextElementSibling.hidden = false; syncMenus(); }
  e.stopPropagation();
}));
document.addEventListener("click", e => { if (!e.target.closest(".menu")) closeMenus(); });
document.addEventListener("click", e => { const c = e.target.closest("[data-cmd]"); if (c && !c.disabled) cmd(c.dataset.cmd); });
function syncMenus(){
  const on = (sel, v) => { const el = $(sel); if (el) el.setAttribute("aria-checked", String(!!v)); };
  on('[data-cmd="sound"]', S.opts.sound);
  on('[data-cmd="indicator"]', S.opts.indicator);
  for (const m of ["none","once","pause","loop"]) on('[data-cmd="music:' + m + '"]', S.opts.music === m);
  const g = G.active;
  for (const c of ["end","abort","pause","restart","skip"]) { const el = $('.drop [data-cmd="' + c + '"]'); if (el) el.disabled = !g; }
  $("#qPause").textContent = G.state === "paused" ? "Resume" : "Pause";
}
function cmd(c){
  closeMenus();
  audio();
  if (c.startsWith("music:")){ S.opts.music = c.slice(6); save(); syncMenus(); Music.refresh(); return; }
  switch (c){
    case "new": if (G.active) stopGame(); goOptions(); break;
    case "end": endGame(); break;
    case "abort": if (G.active){ stopGame(); goOptions(); } break;
    case "open": $("#fileLevels").click(); break;
    case "pause": if (G.active) togglePause(); break;
    case "restart": if (G.active && !UI.screen) startLevel(G.idx); break;
    case "skip": skipThisLevel(); break;
    case "quit": confirmQuit(); break;
    case "sound": S.opts.sound = !S.opts.sound; save(); syncMenus(); break;
    case "indicator": S.opts.indicator = !S.opts.indicator; save(); syncMenus(); break;
    case "scores": openPanel("scrScores"); break;
    case "help": openPanel("scrHelp"); break;
    case "about": openPanel("scrAbout"); break;
  }
}

/* Dialog helper: buttons is [[label, fn, primary]]. */
function dialog(title, html, buttons){
  const box = $("#dialogBox");
  box.innerHTML = "<h3>" + title + "</h3>" + html + "<div class='bar' id='dlgBtns'></div>";
  const bar = box.querySelector("#dlgBtns");
  buttons.forEach(([label, fn, primary]) => {
    const b = document.createElement("button"); b.className = "btn" + (primary ? " primary" : ""); b.textContent = label;
    b.onclick = () => { if (fn() !== false) $("#dialog").hidden = true; };
    bar.appendChild(b);
  });
  $("#dialog").hidden = false;
  (box.querySelector("input") || bar.querySelector(".primary") || bar.querySelector("button")).focus();
}
const dialogOpen = () => !$("#dialog").hidden;
function confirmQuit(){
  if (G.active) pauseGame(false);
  dialog("Quit ClockWerx?", "<p>Your scores are kept. You'll go back to the title screen.</p>",
    [["Quit", () => { stopGame(); goTitle(); }, true], ["Cancel", () => {}]]);
}

/* ---------------- title & clock question ---------------- */
function goTitle(){ show("scrTitle"); Music.stop(); }
function titleContinue(){
  audio();
  if (!S.qok) return clockQuestion();
  goOptions();
}
$("#scrTitle").addEventListener("click", titleContinue);
/* The original asked a question answered in the manual's margins (copy protection). */
const QUESTIONS = [
  [2,"Seat board","Which wooden board does a longcase clock's movement sit on?"],
  [3,"Fusee","Which mechanism cuts escapement error as a mainspring runs down?"],
  [4,"Foliot","What first regulated verge-escapement clocks?"],
  [5,"Hipp-toggle","Which mechanism keeps a pendulum swinging electrically?"],
  [6,"Invar","Which steel alloy for pendulum rods hardly expands with heat?"],
  [7,"Rhomboid","Which pendulum has a diamond-shaped frame as its rod?"],
  [9,"Rating nut","What is the knurled nut that holds up a pendulum bob?"],
  [10,"Stackfreed","Which device evened out a mainspring's force over its run?"],
  [11,"Repeating work","What lets a watch sound the time on demand?"],
  [12,"Barrel","What is the brass drum that holds a mainspring?"],
  [14,"Snail","Which cam sets how many blows a rack-striking clock strikes?"],
  [15,"Rack hook","Which arm acts as the click for the rack?"],
  [16,"Pallet","What is the nib on the anchor that the escape wheel acts on?"],
  [17,"Oil sink","What is the hollow around a pivot hole called?"],
  [18,"Pinion leaves","What are the teeth of small driven gears called?"],
  [19,"Contrate","Which wheel drives the escape pinion in a platform carriage clock?"],
  [20,"Ting-tang","What is the sound of quarters struck on two different bells?"],
  [21,"Pivot hole","What is the bearing a pivot runs in called?"],
  [22,"Motion work","Which wheel train makes the 12 to 1 reduction for the hour hand?"],
  [23,"Kidney piece","Which cam in an equation clock shows solar time?"],
];
function clockQuestion(){
  const [page, answer, q] = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, "");
  dialog("Clock question",
    "<p>" + q + "</p><p class='small'>The answer is in the margin of page " + page + " of the ClockWerx manual.</p>" +
    "<input type='text' id='qAns' autocomplete='off' aria-label='Answer'><div class='err' id='qErr'></div>",
    [["Answer", () => {
        if (norm($("#qAns").value) === norm(answer)){ S.qok = true; save(); goOptions(); return true; }
        $("#qErr").textContent = "That's not it. Check the margin of page " + page + ".";
        return false;
      }, true],
     ["Skip for now", () => { goOptions(); }]]);
  $("#qAns").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); $("#dlgBtns .primary").click(); } });
}

/* ---------------- options screen ---------------- */
function goOptions(){ show("scrOptions"); renderOptions(); Music.stop(); }
function renderOptions(){
  const o = S.opts;
  $("#oName1").value = o.name1; $("#oName2").value = o.name2;
  $("#oRating1").innerHTML = "Rating: <b>" + rating(totalOf(p1())) + "</b> · " + fmt(totalOf(p1())) + " points";
  for (const [id, v] of [["#oControl", o.control], ["#oType", String(o.type)], ["#oDiff", o.diff]])
    $$(id + " button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
  $$(".p2only").forEach(el => el.hidden = o.type !== 2);
  $("#oTime").textContent = o.time ? o.time + " minutes" : "No limit";
  $("#oMusic").value = o.music; $("#oSound").checked = o.sound; $("#oInd").checked = o.indicator;
  $("#oDiffNote").textContent = {
    C:"Child: slowest hands, no time limit, simplest layouts, most way stations.",
    E:"Easy: slow hands, 50% more time, fewer obstacles.",
    M:"Medium: standard speed, time and obstacles.",
    H:"Hard: fast hands, 20% less time, every obstacle and no way stations."}[o.diff];
  $("#setName").textContent = SET.name + " · " + SET.levels.length + " levels";
  $("#bBuiltin").hidden = SET.id === "builtin";
  renderLevelList();
}
function renderLevelList(){
  const name = p1(), pr = profile(name), fr = frontier(name), box = $("#oLevels");
  let sel = S.sel[SET.id] || 0;
  if (sel > fr) sel = S.sel[SET.id] = fr;
  box.innerHTML = "";
  let stage = 0;
  SET.levels.forEach((lv, i) => {
    const st = stageOf(i);
    if (st !== stage){
      stage = st;
      const h = document.createElement("div"); h.className = "stagehead"; h.textContent = stageName(st);
      box.appendChild(h);
    }
    const firstOfStage = SET.levels.findIndex((l, j) => stageOf(j) === st);
    const seen = fr >= firstOfStage;
    const best = pr.best[i];
    const b = document.createElement("button");
    b.className = "lvl" + (pr.done[i] ? " done" : "") + (i === sel ? " sel" : "");
    b.disabled = i > fr;
    b.innerHTML = "<span class='n'>" + String(i+1).padStart(2, "0") + "</span><span class='nm'>" + (seen ? esc(lv.name) : "· · ·") + "</span><span class='sc'>" +
      (best ? fmt(best.score) + " " + best.diff : pr.skipped.includes(i) ? "skipped" : i > fr ? "" : "—") + "</span>";
    b.onclick = () => { S.sel[SET.id] = i; save(); renderLevelList(); };
    b.ondblclick = () => { S.sel[SET.id] = i; save(); startGame(); };
    box.appendChild(b);
  });
  const left = 3 - pr.skipped.length;
  $("#oSkips").textContent = left + " skip" + (left === 1 ? "" : "s") + " left";
  $("#bSkip").disabled = !(sel === fr && !pr.done[sel] && !pr.skipped.includes(sel) && left > 0 && sel < SET.levels.length - 1);
  $("#bPlay").textContent = "Play level " + (sel + 1);
  const selEl = box.querySelector(".sel"); if (selEl) selEl.scrollIntoView({ block:"nearest" });
}
function esc(t){ return String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
$("#oName1").addEventListener("input", e => { S.opts.name1 = e.target.value.slice(0, 20); save(); $("#oRating1").innerHTML = "Rating: <b>" + rating(totalOf(p1())) + "</b> · " + fmt(totalOf(p1())) + " points"; renderLevelList(); });
$("#oName2").addEventListener("input", e => { S.opts.name2 = e.target.value.slice(0, 20); save(); });
for (const [id, key, conv] of [["#oControl","control",v => v], ["#oType","type",v => +v], ["#oDiff","diff",v => v]])
  $(id).addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.opts[key] = conv(b.dataset.v); save(); renderOptions(); });
$("#oTimeUp").onclick = () => { S.opts.time = Math.min(55, (S.opts.time || 0) + 5); save(); renderOptions(); };
$("#oTimeDn").onclick = () => { S.opts.time = Math.max(0, (S.opts.time || 0) - 5); save(); renderOptions(); };
$("#oMusic").onchange = e => { S.opts.music = e.target.value; save(); };
$("#oSound").onchange = e => { S.opts.sound = e.target.checked; save(); };
$("#oInd").onchange = e => { S.opts.indicator = e.target.checked; save(); };
$("#bPlay").onclick = () => startGame();
$("#bSkip").onclick = () => {
  const pr = profile(p1()), sel = S.sel[SET.id] || 0;
  pr.skipped.push(sel); S.sel[SET.id] = Math.min(sel + 1, SET.levels.length - 1); save(); renderLevelList();
};
$("#bBuiltin").onclick = () => { SET = { id:"builtin", name:"Built-in levels", levels:BUILTIN_LEVELS }; S.custom = null; save(); renderOptions(); };
["pointerdown","keydown"].forEach(ev => $("#scrOptions").addEventListener(ev, () => UI.idleAt = performance.now()));
$("#fileLevels").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const levels = validateLevels(Array.isArray(data) ? data : data.levels);
    const name = (data.name || f.name.replace(/\.json$/i, "")).slice(0, 40);
    if (G.active) stopGame();
    useCustom(name, levels, true);
    goOptions();
  } catch (err){
    dialog("Can't open that levels file", "<p>" + esc(err.message || err) + "</p><p class='small'>A levels file is JSON: a list of levels, or {\"name\", \"levels\"}, each with a map in the same format as the built-in set.</p>", [["OK", () => {}, true]]);
  }
});

/* ---------------- top scores ---------------- */
let scoreTab = "level";
function renderScores(){
  const sd = setData(), sel = $("#sLevel");
  if (sel.options.length !== SET.levels.length){
    sel.innerHTML = SET.levels.map((l, i) => "<option value='" + i + "'>" + String(i+1).padStart(2, "0") + " · " + esc(l.name) + "</option>").join("");
    sel.value = String(S.sel[SET.id] || 0);
  }
  const i = +sel.value;
  const table = (rows, cols) => rows.length
    ? "<tr>" + cols.map(c => "<th>" + c + "</th>").join("") + "</tr>" + rows.map((r, k) => "<tr><td>" + (k+1) + "</td>" + r.map((v, j) => "<td" + (j > 0 && typeof v === "number" ? " class='num'" : "") + ">" + (typeof v === "number" ? fmt(v) : esc(v)) + "</td>").join("") + "</tr>").join("")
    : "<tr><td class='small'>No scores yet.</td></tr>";
  $("#tL1").innerHTML = table((sd.top1[i] || []).map(e => [e.name, e.score, DIFFNAME[e.diff]]), ["#", "Player", "Score", "Difficulty"]);
  $("#tL2").innerHTML = table((sd.top2[i] || []).map(e => [e.name, e.score, DIFFNAME[e.diff]]), ["#", "Player", "Score", "Difficulty"]);
  const tot1 = Object.keys(sd.profiles).map(n => [n, totalOf(n), rating(totalOf(n))]).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 20);
  $("#tT1").innerHTML = table(tot1, ["#", "Player", "Total", "Rating"]);
  const tot2 = Object.entries(sd.tot2).sort((a, b) => b[1] - a[1]).slice(0, 20);
  $("#tT2").innerHTML = table(tot2, ["#", "Player", "Total"]);
  $("#paneLevel").hidden = scoreTab !== "level"; $("#paneTotal").hidden = scoreTab !== "total";
  $("#tabLevel").setAttribute("aria-selected", String(scoreTab === "level")); $("#tabTotal").setAttribute("aria-selected", String(scoreTab === "total"));
}
$("#sLevel").onchange = renderScores;
$("#tabLevel").onclick = () => { scoreTab = "level"; renderScores(); };
$("#tabTotal").onclick = () => { scoreTab = "total"; renderScores(); };

/* =====================================================================
   GAME FLOW
   ===================================================================== */
const G = {
  active:false, two:false, names:["",""], totals:[0,0], level:[0,0], streak:[0,0],
  idx:0, L:null, w:null, state:"idle", prev:null, timeLeft:0, sessionLeft:Infinity,
  checkpoint:null, ways:new Set(), taken:{ bonus:new Set(), glass:new Set() },
  finish:[], death:[null,null], fx:[], pending:null, asked:false,
};
const STEP = 1/240;
const now = () => performance.now();
function levelLimit(){ return SET.levels[G.idx].time * TIMEMUL[S.opts.diff]; }

function startGame(){
  audio();
  const o = S.opts;
  G.active = true; G.two = o.type === 2;
  G.names = [p1(), (o.name2 || "").trim() || "Player 2"];
  G.totals = [0,0]; G.sessionLeft = o.time ? o.time * 60 : Infinity; G.asked = false;
  $("#pad2").hidden = !G.two; $("#hP2a").hidden = $("#hP2b").hidden = !G.two;
  $("#hS1l").textContent = G.two ? G.names[0] + " level" : "This level";
  $("#hT1l").textContent = G.two ? G.names[0] + " game" : "Total";
  $("#hS2l").textContent = G.names[1] + " level"; $("#hT2l").textContent = G.names[1] + " game";
  show(null);
  startLevel(S.sel[SET.id] || 0);
}
function stopGame(){
  if (G.two && G.active) recordTwoPlayerTotals();
  G.active = false; G.state = "idle"; Music.stop(); $("#card").hidden = true; syncMenus();
}
function endGame(){
  if (G.active) stopGame();
  UI.back = "scrOptions"; show("scrScores"); renderScores();
}
function recordTwoPlayerTotals(){
  const sd = setData();
  G.names.forEach((n, p) => { if (G.totals[p] > (sd.tot2[n] || 0)) sd.tot2[n] = G.totals[p]; });
  save();
}

function startLevel(i){
  G.idx = i; S.sel[SET.id] = i; save();
  const def = SET.levels[i];
  G.L = buildLevel(def, S.opts.diff); tintDots(G.L);
  G.taken = { bonus:new Set(), glass:new Set() }; G.checkpoint = null; G.ways = new Set();
  G.level = [0,0]; G.finish = []; G.fx = [];
  freshWorld();
  G.timeLeft = levelLimit();
  $("#hLevel").innerHTML = "<small>" + String(i+1).padStart(2, "0") + "</small>" + esc(def.name);
  $("#note").textContent = def.note || "";
  $("#card").hidden = true;
  setState("ready");
  resize();
  Music.start(i);
}
function freshWorld(){
  G.w = makeWorld(G.L, G.two ? 2 : 1, G.idx + 1);
  for (const i of G.taken.bonus) G.w.bonus[i] = 0;
  for (const i of G.taken.glass) G.w.glasses[i] = 0;
  G.streak = [0,0]; G.pending = null; G.death = [null,null];
}
function respawnSolo(){
  freshWorld();
  const cp = G.checkpoint, P = G.w.players[0];
  if (cp){
    const d = G.L.dots[cp.i], p = dotPos(G.L, G.w, d);
    P.on = { k:"d", i:cp.i }; P.x = p[0]; P.y = p[1]; P.q = cp.q; P.dir = cp.dir;
    G.timeLeft = cp.time;
  } else G.timeLeft = levelLimit();
  setState("ready");
}
function respawnPlayer(p){
  const s = G.L.start[p] || G.L.start[0];
  G.w.players[p] = makeHand(s, p === 1 && !G.L.start[1] ? 2 : 0, 1, { id:p, kind:"player" });
  G.streak[p] = 0; G.death[p] = null;
}
function setState(s){
  G.state = s;
  const st = $("#status"), tip = SET.levels[G.idx] ? SET.levels[G.idx].tip || "" : "";
  if (s === "ready") st.innerHTML = "Press a game key or tap the board to begin. <span class='tip'>" + esc(tip) + "</span>";
  else if (s === "play") st.innerHTML = "<span class='tip'>" + esc(tip) + "</span>";
  else if (s === "paused") st.textContent = "Paused";
  syncMenus();
}
function begin(){
  if (G.state !== "ready") return;
  audio(); setState("play");
  if (!Music.playing) Music.start(G.idx);
}
function pauseGame(card){
  if (G.state !== "play" && G.state !== "ready") return;
  G.prev = G.state; setState("paused"); Music.stop();
  if (card !== false) showCard("<h3>Paused</h3><p>The clock is stopped.</p><div class='row'><button class='btn primary' data-act='resume'>Resume <kbd>P</kbd></button><button class='btn' data-act='retry'>Restart level</button><button class='btn' data-act='options'>Options</button></div>");
}
function togglePause(){
  if (G.state === "paused"){ $("#card").hidden = true; setState(G.prev || "ready"); if (G.state === "play") Music.start(G.idx); }
  else pauseGame();
}
function showCard(html){ const c = $("#card"); c.innerHTML = html; c.hidden = false; const b = c.querySelector(".primary") || c.querySelector("button"); if (b) b.focus(); }
$("#card").addEventListener("click", e => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act;
  if (act === "next") startLevel(Math.min(G.idx + 1, SET.levels.length - 1));
  else if (act === "retry") startLevel(G.idx);
  else if (act === "resume") togglePause();
  else if (act === "options"){ stopGame(); goOptions(); }
  else if (act === "end") endGame();
});
function skipThisLevel(){
  if (!G.active) return;
  const pr = profile(G.names[0]), i = G.idx;
  if (i >= SET.levels.length - 1) return flash("This is the last level.");
  if (!pr.done[i] && !pr.skipped.includes(i)){
    if (pr.skipped.length >= 3) return flash("No skips left. Complete a skipped level to earn one back.");
    pr.skipped.push(i); save();
  }
  startLevel(i + 1);
}
function flash(msg){ $("#status").textContent = msg; }

/* ---------------- scoring ---------------- */
function winSolo(){
  G.state = "won"; sfx("goal"); Music.stop();
  const d = S.opts.diff, left = G.timeLeft === Infinity ? 0 : Math.floor(G.timeLeft);
  const done = DONE_PTS[d], tb = left * SEC_PTS[d], gathered = G.level[0], total = gathered + done + tb;
  G.level[0] = total; G.totals[0] += total;
  const pr = profile(G.names[0]), prev = pr.best[G.idx], isBest = !prev || total > prev.score;
  if (isBest) pr.best[G.idx] = { score:total, diff:d };
  pr.done[G.idx] = true; pr.skipped = pr.skipped.filter(i => i !== G.idx);
  const sd = setData(); pushTop(sd.top1[G.idx] = sd.top1[G.idx] || [], { name:G.names[0], score:total, diff:d });
  save();
  const last = G.idx >= SET.levels.length - 1;
  showCard("<h3>" + (last ? "Every level finished" : "Level complete") + "</h3>" +
    "<dl><dt>Bonus dots and hourglasses</dt><dd>" + fmt(gathered) + "</dd><dt>Completion (" + DIFFNAME[d] + ")</dt><dd>" + fmt(done) + "</dd>" +
    "<dt>Time bonus (" + left + " s)</dt><dd>" + fmt(tb) + "</dd><dt>Level score</dt><dd class='total'>" + fmt(total) + "</dd></dl>" +
    (isBest ? "<p>New best for this level.</p>" : "<p>Your best: " + fmt(prev.score) + " " + prev.diff + "</p>") +
    "<div class='row'>" + (last ? "<button class='btn primary' data-act='end'>Top scores</button>" : "<button class='btn primary' data-act='next'>Next level <kbd>Enter</kbd></button>") +
    "<button class='btn' data-act='retry'>Replay</button><button class='btn' data-act='options'>Options</button></div>");
  $("#status").textContent = "Goal reached.";
}
function goalTwo(p){
  const P = G.w.players[p]; P.done = true; G.finish.push(p);
  const d = S.opts.diff, first = G.finish.length === 1, left = G.timeLeft === Infinity ? 0 : Math.floor(G.timeLeft);
  const pts = (first ? DONE_PTS[d] : DONE_PTS[d] / 2) + left * SEC_PTS[d];
  G.level[p] += pts; popup(P.x, P.y, "+" + fmt(pts)); sfx("goal");
  const other = G.w.players[1-p];
  if (G.finish.length === 2 || other.dead) endLevelTwo();
}
function endLevelTwo(){
  if (G.state === "results") return;
  G.state = "results"; Music.stop();
  const d = S.opts.diff, sd = setData();
  G.names.forEach((n, p) => {
    G.totals[p] += G.level[p];
    pushTop(sd.top2[G.idx] = sd.top2[G.idx] || [], { name:n, score:G.level[p], diff:d });
    if (G.finish.includes(p)){ const pr = profile(n); pr.done[G.idx] = true; if (!pr.best[G.idx] || G.level[p] > pr.best[G.idx].score) pr.best[G.idx] = { score:G.level[p], diff:d }; }
  });
  save();
  const row = p => "<dt>" + esc(G.names[p]) + (G.finish[0] === p ? " · first" : G.finish.includes(p) ? " · second" : " · no goal") + "</dt><dd>" + fmt(G.level[p]) + "</dd>";
  const last = G.idx >= SET.levels.length - 1;
  showCard("<h3>Level over</h3><dl>" + row(0) + row(1) + "<dt>Game totals</dt><dd class='total'>" + fmt(G.totals[0]) + " · " + fmt(G.totals[1]) + "</dd></dl>" +
    "<div class='row'>" + (last ? "<button class='btn primary' data-act='end'>Top scores</button>" : "<button class='btn primary' data-act='next'>Next level <kbd>Enter</kbd></button>") +
    "<button class='btn' data-act='retry'>Replay</button><button class='btn' data-act='end'>End game</button></div>");
  $("#status").textContent = "Level over.";
}
function onDeath(e){
  const p = e.p, t = now();
  G.death[p] = { t, hand:{ x:e.x, y:e.y, q:e.q }, why:e.why };
  sfx("die"); flash(e.why);
  if (!G.two){ G.state = "dying"; G.respawnAt = t + 900; return; }
  if (G.finish.length) { endLevelTwo(); return; }
  G.death[p].respawn = t + 900;
}
function timeUp(){
  if (!G.two){ G.checkpoint = null; G.ways = new Set(); kill(G.w, G.w.players[0], "Out of time. The level starts over."); handleEvents(); return; }
  if (G.finish.length) return endLevelTwo();
  flash("Out of time. The level starts over.");
  freshWorld(); G.timeLeft = levelLimit(); setState("ready");
}

/* ---------------- simulation glue ---------------- */
function decide(h, k){
  const p = h.id, K = keys[p], B = pads[p];
  const swing = K.swing || B.swing, bounce = K.bounce || B.bounce, flip = K.flip || B.flip || (swing && bounce);
  let act = flip ? "f" : swing ? "s" : bounce ? "b" : "n";
  if (p === 0 && G.pending){
    const pd = G.pending, tx = h.x + DIRS[k][0], ty = h.y + DIRS[k][1];
    if (act === "n" && Math.hypot(pd.x - tx, pd.y - ty) < .3){ act = pd.act; G.pending = null; }
    else if (--pd.left <= 0) G.pending = null;
  }
  return act;
}
function handleEvents(){
  const w = G.w;
  for (const e of w.ev){
    switch (e.e){
      case "grab": sfx("grab"); break;
      case "bounce": sfx("bounce"); break;
      case "bonus": {
        G.streak[e.p]++;
        const pts = Math.min(5, G.streak[e.p]) * 1000;
        G.level[e.p] += pts; G.taken.bonus.add(e.i); popup(e.x, e.y, "+" + fmt(pts)); sfx("bonus"); break;
      }
      case "glass":
        G.taken.glass.add(e.i); if (G.timeLeft !== Infinity) G.timeLeft += 10;
        G.level[e.p] += 1000; popup(e.x, e.y, "+10 s"); sfx("bonus"); break;
      case "way":
        if (!G.two && !G.ways.has(e.i)){ G.ways.add(e.i); G.checkpoint = { i:e.i, q:e.q, dir:e.dir, time:G.timeLeft }; const d = G.L.dots[e.i]; popup(d.x, d.y, "Way station"); sfx("way"); }
        break;
      case "goal": if (G.two) goalTwo(e.p); else winSolo(); break;
      case "die": onDeath(e); break;
      case "edie": G.fx.push({ k:"poof", x:e.x, y:e.y, t:now() }); break;
      case "boom": G.fx.push({ k:"boom", x:e.x, y:e.y, t:now() }); sfx("boom"); break;
      case "dust": G.fx.push({ k:"dust", x:e.x, y:e.y, t:now() }); sfx("dust"); break;
      default: sfx(e.e);
    }
  }
  w.ev.length = 0;
}
function tick(dt){
  if (G.state === "play"){
    const n = Math.max(1, Math.ceil(dt / STEP)), h = dt / n, sp = SPEED[S.opts.diff];
    for (let i = 0; i < n && G.state === "play"; i++){
      worldStep(G.L, G.w, h, sp, decide);
      handleEvents();
      if (G.state !== "play") break;
      if (G.timeLeft !== Infinity){ G.timeLeft -= h; if (G.timeLeft <= 0){ G.timeLeft = 0; timeUp(); } }
      G.sessionLeft -= h;
    }
    if (G.two) for (let p = 0; p < 2; p++){ const d = G.death[p]; if (d && d.respawn && now() > d.respawn && G.state === "play") respawnPlayer(p); }
    if (G.state === "play" && G.sessionLeft <= 0 && !G.asked){
      G.asked = true; pauseGame(false);
      dialog("Time's up", "<p>Your " + S.opts.time + "-minute session is over. Keep playing?</p>",
        [["Keep playing", () => { G.sessionLeft = Infinity; togglePause(); }, true], ["End game", () => { endGame(); }]]);
    }
  } else if (G.state === "dying" && now() > G.respawnAt) respawnSolo();
}

/* =====================================================================
   INPUT
   ===================================================================== */
const keys = [{ swing:false, bounce:false, flip:false }, { swing:false, bounce:false, flip:false }];
const pads = [{ swing:false, bounce:false, flip:false }, { swing:false, bounce:false, flip:false }];
const P1KEYS = { KeyX:"swing", Period:"swing", KeyZ:"bounce", Slash:"bounce", ShiftLeft:"flip", ShiftRight:"flip" };
const P2KEYS = { Numpad2:"swing", Numpad6:"swing", ArrowDown:"swing", Numpad3:"bounce", Numpad5:"bounce", ArrowRight:"bounce",
                 Numpad1:"flip", Numpad4:"flip", NumpadAdd:"flip", ArrowLeft:"flip" };
const P2REV = new Set(["NumpadEnter","Numpad0","ArrowUp"]);
const CTRL = { KeyN:"new", KeyE:"end", KeyA:"abort", KeyF:"open", KeyP:"pause", KeyR:"restart", KeyK:"skip", KeyQ:"quit", KeyS:"sound", KeyI:"indicator", KeyT:"scores" };
function reverse(p){ const h = G.w && G.w.players[p]; if (G.state === "play" && h && !h.dead && !h.done){ h.dir = -h.dir; sfx("rev"); } }
addEventListener("keydown", e => {
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  if (dialogOpen()) return;
  if (e.key === "F1"){ e.preventDefault(); cmd("help"); return; }
  if (typing) return;
  if (UI.screen === "scrTitle"){ e.preventDefault(); titleContinue(); return; }
  if ((e.ctrlKey || e.metaKey) && CTRL[e.code]){ e.preventDefault(); cmd(CTRL[e.code]); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (UI.screen){ if (e.key === "Escape" && UI.screen !== "scrOptions") closePanel(); return; }
  if (!G.active) return;
  const p2 = G.two && P2KEYS[e.code];
  if (P1KEYS[e.code]){ e.preventDefault(); keys[0][P1KEYS[e.code]] = true; begin(); }
  else if (p2){ e.preventDefault(); keys[1][p2] = true; begin(); }
  else if (e.code === "Space"){ e.preventDefault(); if (!e.repeat){ begin(); reverse(0); } }
  else if (G.two && P2REV.has(e.code) && G.state !== "won" && G.state !== "results"){ e.preventDefault(); if (!e.repeat){ begin(); reverse(1); } }
  else if (e.code === "KeyP" || e.code === "Escape"){ e.preventDefault(); togglePause(); }
  else if (e.code === "KeyR") startLevel(G.idx);
  else if (e.code === "KeyK") skipThisLevel();
  else if (e.code === "KeyI"){ S.opts.indicator = !S.opts.indicator; save(); syncMenus(); }
  else if ((e.code === "Enter" || e.code === "NumpadEnter") && (G.state === "won" || G.state === "results") && G.idx < SET.levels.length - 1){ e.preventDefault(); startLevel(G.idx + 1); }
});
addEventListener("keyup", e => { if (P1KEYS[e.code]) keys[0][P1KEYS[e.code]] = false; if (P2KEYS[e.code]) keys[1][P2KEYS[e.code]] = false; });
addEventListener("blur", () => { for (const o of keys.concat(pads)) for (const k in o) o[k] = false; });

$$("[data-hold]").forEach(b => {
  const a = b.dataset.hold, p = +b.dataset.p;
  b.addEventListener("pointerdown", e => {
    e.preventDefault(); audio();
    try { b.setPointerCapture(e.pointerId); } catch (_){}
    b.classList.add("on"); begin();
    if (a === "reverse") reverse(p); else pads[p][a] = true;
  });
  const off = () => { if (a !== "reverse") pads[p][a] = false; b.classList.remove("on"); };
  ["pointerup","pointercancel","lostpointercapture"].forEach(ev => b.addEventListener(ev, off));
});

/* Mouse control (manual p.15): click a neighbouring dot within a quarter turn to swing,
   double-click to flip, click your own dot to reverse. Taps work the same in keyboard mode. */
const cv = $("#cv"), ctx = cv.getContext("2d");
const VIEW = { c:ctx, cs:40, ox:0, oy:0 };
cv.addEventListener("pointerdown", e => {
  if (!G.active) return;
  audio();
  if (G.state === "ready"){ begin(); if (S.opts.control !== "mouse") return; }
  if (G.state !== "play") return;
  const r = cv.getBoundingClientRect();
  const gx = (e.clientX - r.left - VIEW.ox) / VIEW.cs, gy = (e.clientY - r.top - VIEW.oy) / VIEW.cs;
  const P = G.w.players[0];
  if (P.dead || P.done) return;
  if (Math.hypot(gx - P.x, gy - P.y) < .45){ reverse(0); return; }
  const t = findGrab(G.L, G.w, gx, gy) || (() => { // snap to the nearest neighbour position
    for (let k = 0; k < 4; k++){ const tx = P.x + DIRS[k][0], ty = P.y + DIRS[k][1]; if (Math.hypot(gx - tx, gy - ty) < .45) return { x:tx, y:ty }; }
    return null; })();
  if (!t || Math.abs(Math.hypot(t.x - P.x, t.y - P.y) - 1) > .35) return;
  const tn = now();
  if (G.pending && Math.hypot(G.pending.x - t.x, G.pending.y - t.y) < .3 && tn - G.pending.t < 380) G.pending.act = "f";
  else G.pending = { x:t.x, y:t.y, act:"s", left:1, t:tn };
});

/* =====================================================================
   AUDIO — synthesised effects and per-level procedural music.
   ===================================================================== */
let AC = null, NOISE = null;
function audio(){
  if (!AC){
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e){ AC = null; }
  }
  if (AC && AC.state === "suspended") AC.resume().catch(() => {});
}
function tone(f, dur, type, vol, to, delay, dest){
  if (!AC) return;
  const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol || .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(dest || AC.destination); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, freq, delay){
  if (!AC) return;
  const t = AC.currentTime + (delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NOISE; f.type = "lowpass"; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f).connect(g).connect(AC.destination); s.start(t); s.stop(t + dur + .02);
}
function sfx(n){
  if (!S.opts.sound || !AC) return;
  switch (n){
    case "grab": tone(2200, .035, "square", .025); break;
    case "bounce": tone(700, .06, "triangle", .06); break;
    case "rev": tone(1100, .04, "triangle", .04); break;
    case "bonus": tone(1320, .14, "sine", .07); tone(1760, .18, "sine", .06, 0, .07); break;
    case "way": tone(990, .2, "sine", .06); tone(1485, .25, "sine", .05, 0, .1); break;
    case "hyper": tone(400, .2, "sine", .07, 1600); break;
    case "goal": [880,1109,1319,1760].forEach((f, i) => tone(f, .35, "sine", .07, 0, i*.09)); break;
    case "die": tone(320, .45, "sawtooth", .05, 70); break;
    case "switch": tone(1500, .03, "square", .04); tone(900, .04, "square", .04, 0, .05); break;
    case "fire": noise(.12, .12, 2500); break;
    case "boom": noise(.9, .3, 500); tone(70, .6, "sine", .15, 35); break;
    case "dust": noise(.4, .15, 1200); break;
    case "light": noise(.5, .05, 4000); break;
    case "glob": tone(220, .18, "sine", .06, 120); break;
    case "split": tone(180, .12, "sine", .06, 260); break;
    case "push": tone(500, .08, "triangle", .05, 300); break;
  }
}
/* Music modes from the original menu: None, Play Once, Play Pause (once, pause, again), Play Loop. */
const Music = {
  gain:null, timer:null, seed:0, playing:false,
  start(seed){
    this.stop(); this.seed = seed;
    if (S.opts.music === "none" || !AC || !G.active) return;
    this.gain = AC.createGain(); this.gain.gain.value = .045; this.gain.connect(AC.destination);
    this.playing = true; this.pass();
  },
  pass(){
    if (!this.gain) return;
    const len = this.schedule(this.seed), mode = S.opts.music;
    if (mode === "loop") this.timer = setTimeout(() => this.pass(), len * 1000 - 40);
    else if (mode === "pause") this.timer = setTimeout(() => this.pass(), (len + 6) * 1000);
  },
  schedule(seed){
    let s = seed * 9301 + 49297;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const scales = [[0,2,3,5,7,8,10],[0,2,3,5,7,9,10],[0,2,4,7,9],[0,3,5,7,10],[0,2,4,5,7,9,11]];
    const sc = scales[seed % scales.length], root = 50 + (seed * 5) % 9, tempo = 112 + (seed * 13) % 28, e8 = 60 / tempo / 2;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12), t0 = AC.currentTime + .05;
    let deg = 7, phrase = [];
    for (let i = 0; i < 32; i++){
      deg = Math.max(0, Math.min(14, deg + Math.round((r() - .5) * 4)));
      phrase.push(r() < .2 ? null : deg);
    }
    const note = d => root + 12 + sc[d % sc.length] + 12 * Math.floor(d / sc.length);
    for (let rep = 0; rep < 2; rep++) for (let i = 0; i < 32; i++){
      const t = t0 + (rep * 32 + i) * e8, d = phrase[i];
      if (d !== null){ this.voice(hz(note(d + (rep && i > 24 ? 2 : 0))), t, e8 * .9, "triangle", .5); }
      if (i % 4 === 0) this.voice(hz(root - 12 + (i % 16 === 8 ? sc[4 % sc.length] : 0)), t, e8 * 3.6, "sine", .9);
      if (i % 2 === 1) this.voice(hz(root + 24 + sc[2 % sc.length]), t, e8 * .25, "square", .07);
    }
    return 64 * e8;
  },
  voice(f, t, dur, type, vol){
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.gain); o.start(t); o.stop(t + dur + .05);
  },
  stop(){
    clearTimeout(this.timer); this.playing = false;
    if (this.gain){ const g = this.gain; this.gain = null; try { g.gain.setTargetAtTime(0, AC.currentTime, .05); } catch (e){} setTimeout(() => g.disconnect(), 400); }
  },
  refresh(){ if (G.active && (G.state === "play" || G.state === "ready")) this.start(G.idx); else this.stop(); },
};

/* =====================================================================
   RENDERING — canvas primitives only, styled after the 1995 original:
   a black stippled playfield inside a marble frame with gold trim, clock
   pillars on either side and engraved status plates along the top.
   A view V = {c, cs, ox, oy, w, h, F}.
   ===================================================================== */
const C = {
  marble:"#a39d93", marbleDk:"#77716a", marbleLt:"#cdc7bc", pillar:"#d7d1c5", pillarDk:"#9c958a",
  gold:"#cfa648", goldHi:"#f3dc95", goldDk:"#7a5a17", plate:"#24211d",
  field:"#06070a", stip:"rgba(125,135,155,.34)",
  fg:"#ebe8e2", dot:"#dcdcdc", wall:"#dcd7cd", wallSh:"#5f5b55",
  p1:"#d9a93a", p1hi:"#ffe7a3", p1ink:"#4a3208", p2:"#1b1b1b", p2hi:"#9a9a9a", p2ink:"#d0d0d0",
  spike:"#e2e2e2", spikeInk:"#8c2a1f", oil:"#0b0c0f", fuse:"#c9a46a", hyper:"#c7adff", shield:"#72d6d1",
  red:"#e5493b", blue:"#5a8ff0", green:"#43bb74", danger:"#ff6b57",
};
const ECOL = { red:C.red, blue:C.blue, green:C.green, gold:C.p1 };
const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX"];
const FONT_DISPLAY = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
const FONT_MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
const MARGIN = 1.08;               // field margin: a hand reaches one cell past the outer dots
const FRAME_FULL = { side:1.3, top:.95, bottom:.42, clocks:true };
const FRAME_COMPACT = { side:.28, top:.95, bottom:.28, clocks:false };
const X = (V, x) => V.ox + x * V.cs, Y = (V, y) => V.oy + y * V.cs;
const bg = document.createElement("canvas"), bgc = bg.getContext("2d");

/** Pick a frame and cell size that fit the available box; phones drop the clock pillars. */
function fitView(L, aw, ah){
  const fit = F => { const gw = L.W - 1 + 2*MARGIN + 2*F.side, gh = L.H - 1 + 2*MARGIN + F.top + F.bottom; return { F, gw, gh, cs:Math.floor(Math.min(aw / gw, ah / gh)) }; };
  let r = fit(FRAME_FULL);
  if (r.cs < 30 || aw < 600) r = fit(FRAME_COMPACT);
  r.cs = Math.max(8, r.cs);
  r.w = Math.round(r.cs * r.gw); r.h = Math.round(r.cs * r.gh);
  r.ox = r.cs * (r.F.side + MARGIN); r.oy = r.cs * (r.F.top + MARGIN);
  return r;
}
function resize(){
  const st = $("#stage"), L = G.L;
  if (!L || !st.clientWidth) return;
  const r = fitView(L, st.clientWidth, st.clientHeight), dpr = Math.min(3, window.devicePixelRatio || 1);
  for (const c of [cv, bg]){ c.width = Math.round(r.w * dpr); c.height = Math.round(r.h * dpr); }
  cv.style.width = r.w + "px"; cv.style.height = r.h + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0); bgc.setTransform(dpr,0,0,dpr,0,0);
  Object.assign(VIEW, { cs:r.cs, ox:r.ox, oy:r.oy, w:r.w, h:r.h, F:r.F });
  drawBackdrop(Object.assign({}, VIEW, { c:bgc }), L);
}
new ResizeObserver(resize).observe($("#stage"));
function rr(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function fieldRect(V, L){ return [X(V, -MARGIN), Y(V, -MARGIN), (L.W - 1 + 2*MARGIN) * V.cs, (L.H - 1 + 2*MARGIN) * V.cs]; }
/** The three engraved status plates along the top band: level, time, players. */
function plateRects(V, L){
  const [fx, , fw] = fieldRect(V, L), top = V.F.top * V.cs, y = top * .14, h = top * .72, gap = Math.max(4, fw * .02);
  const wl = fw * .4, wc = fw * .16, wr = fw - wl - wc - gap*2;
  return [[fx, y, wl, h], [fx + wl + gap, y, wc, h], [fx + wl + wc + gap*2, y, wr, h]];
}
function clockRects(V){
  if (!V.F.clocks) return [];
  const sw = V.F.side * V.cs, top = V.F.top * V.cs, bot = V.F.bottom * V.cs, h = V.h - top - bot;
  const r = Math.min(sw * .4, h * .22);
  return [[sw / 2, top + h * .5, r], [V.w - sw / 2, top + h * .5, r]];
}

function drawBackdrop(V, L){
  const c = V.c, cs = V.cs, W = V.w, H = V.h, F = V.F;
  c.clearRect(0, 0, W, H);
  // Marble frame with seeded veins and speckle.
  const rad = Math.min(14, cs * .18);
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, C.marbleLt); g.addColorStop(.55, C.marble); g.addColorStop(1, C.marbleDk);
  c.fillStyle = g; rr(c, 0, 0, W, H, rad); c.fill();
  c.save(); rr(c, 0, 0, W, H, rad); c.clip();
  let seed = L.W * 131 + L.H * 17 + 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 52; i++){
    c.strokeStyle = rnd() < .5 ? "rgba(255,255,255," + (.07 + rnd() * .16) + ")" : "rgba(55,50,45," + (.07 + rnd() * .16) + ")";
    c.lineWidth = .5 + rnd() * 1.6;
    let x = rnd() * W, y = rnd() * H;
    c.beginPath(); c.moveTo(x, y);
    for (let k = 0; k < 4; k++){ const nx = x + (rnd() - .5) * W * .45, ny = y + (rnd() - .5) * H * .45; c.quadraticCurveTo(x + (rnd() - .5) * cs * 3, y + (rnd() - .5) * cs * 3, nx, ny); x = nx; y = ny; }
    c.stroke();
  }
  for (let i = 0, n = W * H / 80; i < n; i++){ c.fillStyle = rnd() < .5 ? "rgba(255,255,255,.12)" : "rgba(40,35,30,.15)"; c.fillRect(rnd() * W, rnd() * H, 1.3, 1.3); }
  c.restore();
  c.lineWidth = 2; c.strokeStyle = "rgba(40,36,32,.55)"; rr(c, 1, 1, W - 2, H - 2, rad); c.stroke();
  c.lineWidth = 1; c.strokeStyle = "rgba(255,255,255,.5)"; rr(c, 3, 3, W - 6, H - 6, Math.max(2, rad - 2)); c.stroke();
  // Clock pillars
  if (F.clocks){
    const sw = F.side * cs, top = F.top * cs, bot = F.bottom * cs;
    for (const x0 of [0, W - sw]) drawPillar(c, x0, top, sw, H - top - bot);
    for (const [x, y, r] of clockRects(V)) drawDial(c, x, y, r);
  }
  // Gold trim around the field, with rosettes at the corners
  const [fx, fy, fw, fh] = fieldRect(V, L), t = Math.max(4, cs * .09);
  c.fillStyle = C.goldDk; c.fillRect(fx - t, fy - t, fw + 2*t, fh + 2*t);
  const tg = c.createLinearGradient(fx, fy - t, fx, fy + fh + t);
  tg.addColorStop(0, C.goldHi); tg.addColorStop(.5, C.gold); tg.addColorStop(1, C.goldDk);
  c.fillStyle = tg; c.fillRect(fx - t + 1, fy - t + 1, fw + 2*t - 2, fh + 2*t - 2);
  c.fillStyle = "#000"; c.fillRect(fx - 1, fy - 1, fw + 2, fh + 2);
  // Black playfield with the stippled texture of the original
  c.fillStyle = C.field; c.fillRect(fx, fy, fw, fh);
  const tile = Math.max(4, Math.round(cs / 6)), pc = document.createElement("canvas");
  pc.width = pc.height = tile;
  const pg = pc.getContext("2d");
  pg.fillStyle = C.stip; pg.fillRect(0, 0, 1.4, 1.4); pg.fillRect(tile / 2, tile / 2, 1.4, 1.4);
  c.save(); c.translate(fx, fy); c.fillStyle = c.createPattern(pc, "repeat"); c.fillRect(0, 0, fw, fh); c.restore();
  const vg = c.createRadialGradient(fx + fw/2, fy + fh/2, Math.min(fw, fh) * .3, fx + fw/2, fy + fh/2, Math.hypot(fw, fh) * .6);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.5)");
  c.fillStyle = vg; c.fillRect(fx, fy, fw, fh);
  for (const [x, y] of [[fx - t/2, fy - t/2], [fx + fw + t/2, fy - t/2], [fx - t/2, fy + fh + t/2], [fx + fw + t/2, fy + fh + t/2]]){
    c.beginPath(); c.arc(x, y, t * 1.25, 0, Math.PI*2); c.fillStyle = C.gold; c.fill(); c.strokeStyle = C.goldDk; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(x, y, t * .5, 0, Math.PI*2); c.fillStyle = C.goldDk; c.fill();
  }
  // Engraved status plates
  for (const [x, y, w, h] of plateRects(V, L)){
    const r = Math.min(6, h * .2);
    c.fillStyle = C.plate; rr(c, x, y, w, h, r); c.fill();
    c.strokeStyle = C.gold; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = "rgba(255,255,255,.08)"; c.lineWidth = 1; rr(c, x + 3, y + 3, w - 6, h - 6, Math.max(1, r - 2)); c.stroke();
  }
}
function drawPillar(c, x, y, w, h){
  const cx = x + w / 2, bw = w * .56, cap = Math.min(w * .22, h * .07);
  const g = c.createLinearGradient(cx - bw/2, 0, cx + bw/2, 0);
  g.addColorStop(0, C.pillarDk); g.addColorStop(.35, C.pillar); g.addColorStop(.65, C.pillar); g.addColorStop(1, C.pillarDk);
  c.fillStyle = g; c.fillRect(cx - bw/2, y + cap, bw, h - cap*2);
  c.strokeStyle = "rgba(80,74,66,.35)"; c.lineWidth = 1;
  for (let i = 1; i < 5; i++){ const fx = cx - bw/2 + bw * i / 5; c.beginPath(); c.moveTo(fx, y + cap * 1.4); c.lineTo(fx, y + h - cap * 1.4); c.stroke(); }
  for (const yy of [y, y + h - cap]){
    const cg = c.createLinearGradient(0, yy, 0, yy + cap);
    cg.addColorStop(0, C.pillar); cg.addColorStop(1, C.pillarDk);
    c.fillStyle = cg; c.fillRect(cx - w * .4, yy, w * .8, cap);
    c.fillStyle = C.gold; c.fillRect(cx - w * .4, yy + (yy === y ? cap - 2 : 0), w * .8, 2);
  }
}
function drawDial(c, x, y, r){
  const g = c.createRadialGradient(x - r*.3, y - r*.3, r * .2, x, y, r * 1.15);
  g.addColorStop(0, C.goldHi); g.addColorStop(1, C.goldDk);
  c.beginPath(); c.arc(x, y, r * 1.12, 0, Math.PI*2); c.fillStyle = g; c.fill();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fillStyle = "#f4efe2"; c.fill();
  c.strokeStyle = "#3a2f22";
  for (let i = 0; i < 60; i++){
    const a = i * Math.PI / 30, big = i % 5 === 0, r1 = r * (big ? .8 : .88);
    c.lineWidth = big ? 1.4 : .6; c.beginPath(); c.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.lineTo(x + Math.cos(a) * r * .94, y + Math.sin(a) * r * .94); c.stroke();
  }
  if (r > 20){
    c.fillStyle = "#3a2f22"; c.font = "600 " + Math.round(r * .2) + "px " + FONT_DISPLAY; c.textAlign = "center"; c.textBaseline = "middle";
    [["XII", -Math.PI/2], ["III", 0], ["VI", Math.PI/2], ["IX", Math.PI]].forEach(([s, a]) => c.fillText(s, x + Math.cos(a) * r * .62, y + Math.sin(a) * r * .62));
  }
}
/** Pillar clocks keep real time. */
function drawClockHands(V){
  const c = V.c, d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = d.getHours() % 12 + min / 60;
  for (const [x, y, r] of clockRects(V)){
    const hand = (a, len, wd, col) => { c.strokeStyle = col; c.lineWidth = wd; c.lineCap = "round"; c.beginPath(); c.moveTo(x - Math.cos(a) * r * .12, y - Math.sin(a) * r * .12); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke(); };
    hand(hr / 12 * Math.PI * 2 - Math.PI/2, r * .5, Math.max(2, r * .07), "#1e1a14");
    hand(min / 60 * Math.PI * 2 - Math.PI/2, r * .75, Math.max(1.5, r * .045), "#1e1a14");
    hand(sec / 60 * Math.PI * 2 - Math.PI/2, r * .82, 1, "#9a2a1a");
    c.beginPath(); c.arc(x, y, Math.max(2, r * .06), 0, Math.PI*2); c.fillStyle = C.goldDk; c.fill();
  }
}
/** Text on the status plates. data = [[label, value, valueColor], x3]. */
function drawStatus(V, L, data){
  const c = V.c;
  plateRects(V, L).forEach(([x, y, w, h], i) => {
    const rows = data[i]; if (!rows) return;
    const pad = Math.max(4, h * .16), lab = Math.max(8, Math.round(h * .26)), val = Math.max(9, Math.round(h * .4));
    c.save(); c.beginPath(); c.rect(x + 2, y + 2, w - 4, h - 4); c.clip();
    c.textBaseline = "alphabetic"; c.textAlign = i === 1 ? "center" : "left";
    const tx = i === 1 ? x + w / 2 : x + pad;
    if (rows.two){
      rows.two.forEach((r, k) => {
        const yy = y + h * (k ? .86 : .44);
        c.font = "600 " + lab + "px " + FONT_MONO; c.fillStyle = r[2] || C.goldHi;
        fitText(c, r[0], tx, yy, w - pad * 2);
      });
    } else {
      c.font = "600 " + lab + "px " + FONT_MONO; c.fillStyle = C.goldHi;
      fitText(c, rows[0].toUpperCase().split("").join(String.fromCharCode(8202)), tx, y + pad + lab * .85, w - pad * 2);
      c.font = (i === 0 ? "600 " + val + "px " + FONT_DISPLAY : "600 " + val + "px " + FONT_MONO); c.fillStyle = rows[2] || C.fg;
      fitText(c, rows[1], tx, y + h - pad * .9, w - pad * 2);
    }
    c.restore();
  });
}
function fitText(c, s, x, y, maxW){
  const m = c.measureText(s).width;
  if (m <= maxW){ c.fillText(s, x, y); return; }
  c.save(); c.translate(x, y); c.scale(maxW / m, 1); c.fillText(s, 0, 0); c.restore();
}

/* ---------- hands ---------- */
/** The player's ornate hand: counterweight, eye ring, spade and needle, along +x. */
function playerHandPath(c){
  c.beginPath();
  c.moveTo(-.2, 0); c.lineTo(-.15, -.05); c.lineTo(-.07, -.03); c.lineTo(.2, -.032);
  c.lineTo(.6, -.022); c.lineTo(.72, -.085); c.lineTo(.79, -.03); c.lineTo(.86, -.022); c.lineTo(1, 0);
  c.lineTo(.86, .022); c.lineTo(.79, .03); c.lineTo(.72, .085); c.lineTo(.6, .022);
  c.lineTo(.2, .032); c.lineTo(-.07, .03); c.lineTo(-.15, .05); c.closePath();
}
/** Enemy hands: slender shaft with an arrowhead. */
function enemyHandPath(c){
  c.beginPath();
  c.moveTo(-.12, 0); c.lineTo(-.08, -.035); c.lineTo(.78, -.02); c.lineTo(.8, -.07); c.lineTo(1, 0);
  c.lineTo(.8, .07); c.lineTo(.78, .02); c.lineTo(-.08, .035); c.closePath();
}
function drawHand(V, h, style, color, alpha, off){
  const c = V.c, isP = style === "p1" || style === "p2";
  const fill = style === "p1" ? C.p1 : style === "p2" ? C.p2 : color;
  const hi = style === "p1" ? C.p1hi : style === "p2" ? C.p2hi : "rgba(255,255,255,.55)";
  const ink = style === "p1" ? C.p1ink : style === "p2" ? C.p2ink : "rgba(0,0,0,.85)";
  c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
  c.translate(X(V, h.x) + (off ? off[0] : 0), Y(V, h.y) + (off ? off[1] : 0));
  c.rotate(h.q * Math.PI / 2); c.scale(V.cs, V.cs);
  c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 4; c.shadowOffsetY = 2;
  (isP ? playerHandPath : enemyHandPath)(c);
  c.fillStyle = fill; c.fill();
  c.shadowColor = "transparent";
  c.lineWidth = 1.1 / V.cs; c.strokeStyle = ink; c.stroke();
  c.beginPath(); c.moveTo(-.06, 0); c.lineTo(isP ? .92 : .9, 0); c.lineWidth = 1.2 / V.cs; c.strokeStyle = hi; c.stroke();
  if (isP){
    c.beginPath(); c.arc(.3, 0, .055, 0, Math.PI*2); c.lineWidth = .028; c.strokeStyle = fill; c.stroke();
    c.lineWidth = 1 / V.cs; c.strokeStyle = ink; c.beginPath(); c.arc(.3, 0, .07, 0, Math.PI*2); c.stroke(); c.beginPath(); c.arc(.3, 0, .04, 0, Math.PI*2); c.stroke();
    c.beginPath(); c.arc(-.16, 0, .045, 0, Math.PI*2); c.fillStyle = fill; c.fill(); c.stroke();
  }
  c.beginPath(); c.arc(0, 0, isP ? .07 : .055, 0, Math.PI*2); c.fillStyle = fill; c.fill(); c.lineWidth = 1.1 / V.cs; c.strokeStyle = ink; c.stroke();
  c.beginPath(); c.arc(0, 0, .022, 0, Math.PI*2); c.fillStyle = hi; c.fill();
  c.restore();
}

/* ---------- small shapes ---------- */
/** Spikes look like the original's little silver crosses. */
function spikeMark(V, x, y, r, rot){
  const c = V.c, s = r * V.cs;
  c.save(); c.translate(X(V, x), Y(V, y)); c.rotate(rot == null ? Math.PI/4 : rot);
  c.beginPath();
  for (let i = 0; i < 8; i++){ const a = i * Math.PI/4, l = i % 2 ? s * .28 : s; c.lineTo(Math.cos(a) * l, Math.sin(a) * l); }
  c.closePath(); c.fillStyle = C.spike; c.fill(); c.lineWidth = 1; c.strokeStyle = C.spikeInk; c.stroke();
  c.restore();
}
/** The goal's white four-pointed twinkle. */
function twinkle(V, x, y, t, r, color){
  const c = V.c, s = r * V.cs * (1 + .15 * Math.sin(t / 160));
  c.save(); c.translate(X(V, x), Y(V, y));
  for (const [rot, k] of [[t / 900, 1], [t / 900 + Math.PI/4, .55]]){
    c.save(); c.rotate(rot); c.beginPath();
    for (let i = 0; i < 8; i++){ const a = i * Math.PI/4, l = i % 2 ? s * .12 * k : s * k; c.lineTo(Math.cos(a) * l, Math.sin(a) * l); }
    c.closePath(); c.fillStyle = color; c.globalAlpha = k === 1 ? 1 : .7; c.fill(); c.restore();
  }
  c.restore();
}
function sparkle(V, x, y, t, r, color){
  const c = V.c;
  c.save(); c.translate(X(V, x), Y(V, y)); c.rotate(t / 700);
  c.strokeStyle = color; c.lineWidth = 1.5; c.lineCap = "round";
  for (let i = 0; i < 8; i++){
    const a = i*Math.PI/4, l = (i % 2 ? .08 : .16) * V.cs * (1 + .3*Math.sin(t/150 + i));
    c.beginPath(); c.moveTo(Math.cos(a)*r*V.cs, Math.sin(a)*r*V.cs); c.lineTo(Math.cos(a)*(r*V.cs + l), Math.sin(a)*(r*V.cs + l)); c.stroke();
  }
  c.restore();
}
function udSymbol(V, x, y, group, s, color, fill){
  const c = V.c, px = X(V, x), py = Y(V, y), r = s * V.cs;
  c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = Math.max(1.2, V.cs * .03);
  c.beginPath();
  if (group === "A") c.arc(px, py, r, 0, Math.PI*2);
  else if (group === "B") c.rect(px - r, py - r, r*2, r*2);
  else { c.moveTo(px - r, py); c.lineTo(px + r, py); c.moveTo(px, py - r); c.lineTo(px, py + r); }
  if (fill && group !== "C") c.fill(); else c.stroke();
  c.restore();
}
function pips(V, x, y, n, color){
  const c = V.c; c.save(); c.fillStyle = color;
  for (let i = 0; i < n; i++){ c.beginPath(); c.arc(X(V, x) + (i - (n-1)/2) * V.cs * .075, Y(V, y), V.cs * .028, 0, Math.PI*2); c.fill(); }
  c.restore();
}
function bevelLine(V, x1, y1, x2, y2, wd, col){
  const c = V.c;
  c.save(); c.lineCap = "round";
  c.strokeStyle = C.wallSh; c.lineWidth = wd; c.beginPath(); c.moveTo(X(V, x1) + 1, Y(V, y1) + 1.5); c.lineTo(X(V, x2) + 1, Y(V, y2) + 1.5); c.stroke();
  c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(X(V, x1), Y(V, y1)); c.lineTo(X(V, x2), Y(V, y2)); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = Math.max(1, wd * .25); c.beginPath(); c.moveTo(X(V, x1) - .5, Y(V, y1) - .8); c.lineTo(X(V, x2) - .5, Y(V, y2) - .8); c.stroke();
  c.restore();
}

function drawDot(V, L, w, d, t){
  const c = V.c, p = dotPos(L, w, d), x = X(V, p[0]), y = Y(V, p[1]), cs = V.cs, r = cs * .06;
  const gone = w.ringT[d.i] > 0;
  c.save();
  c.lineWidth = Math.max(1.2, cs * .025);
  if (d.mv){
    c.save(); c.setLineDash([2, 4]); c.strokeStyle = "rgba(255,255,255,.22)"; c.beginPath();
    d.mv.pts.forEach((q, i) => i ? c.lineTo(X(V, q[0]), Y(V, q[1])) : c.moveTo(X(V, q[0]), Y(V, q[1]))); c.stroke(); c.restore();
  }
  if (d.type === "ud"){
    const lv = udLevel(w, d);
    c.globalAlpha = .25 + .75 * lv;
    udSymbol(V, p[0], p[1], d.group, .06 + .06 * lv, C.fg, lv >= 1);
    if (lv < 1){ c.globalAlpha = .45; udSymbol(V, p[0], p[1], d.group, .13, C.fg, false); }
    c.restore(); return;
  }
  if (d.type === "ring"){
    c.beginPath(); c.arc(x, y, cs * .1, 0, Math.PI*2);
    if (gone){ c.setLineDash([2, 3]); c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1; }
    else { c.strokeStyle = C.dot; c.lineWidth = Math.max(1.5, cs * .035); }
    c.stroke(); c.restore(); return;
  }
  if (d.type === "death"){
    const s = cs * .085; c.fillStyle = "#3a3a3a"; c.fillRect(x - s, y - s, s*2, s*2);
    c.strokeStyle = C.fg; c.lineWidth = 1.5; c.strokeRect(x - s, y - s, s*2, s*2); c.restore(); return;
  }
  if (d.colors.size){
    const cols = [...d.colors], seg = Math.PI*2 / cols.length;
    cols.forEach((col, i) => { c.beginPath(); c.moveTo(x, y); c.arc(x, y, r * 1.3, i*seg - Math.PI/2, (i+1)*seg - Math.PI/2); c.closePath(); c.fillStyle = ECOL[col] || C.dot; c.fill(); });
  } else {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fillStyle = C.dot; c.fill();
    c.beginPath(); c.arc(x - r*.3, y - r*.3, r * .35, 0, Math.PI*2); c.fillStyle = "#ffffff"; c.fill();
  }
  switch (d.type){
    case "goal": c.restore(); twinkle(V, p[0], p[1], t, .2, "#ffffff"); return;
    case "bonus":
      if (w.bonus[d.i]){
        const hue = (d.x * 67 + d.y * 131) % 360;
        c.beginPath(); c.arc(x, y, cs * .15, 0, Math.PI*2);
        c.fillStyle = "hsla(" + hue + ",75%,65%,.33)"; c.fill(); c.strokeStyle = "hsla(" + hue + ",80%,75%,.6)"; c.lineWidth = 1; c.stroke();
      }
      break;
    case "way": {
      const s = cs * .16; c.beginPath(); c.moveTo(x, y-s); c.lineTo(x+s, y); c.lineTo(x, y+s); c.lineTo(x-s, y); c.closePath();
      c.strokeStyle = C.gold; c.stroke();
      if (G.ways && G.ways.has(d.i) && w === G.w){ c.fillStyle = "rgba(207,166,72,.35)"; c.fill(); }
      break;
    }
    case "slow": { const s = cs * .17; c.beginPath(); c.moveTo(x, y-s); c.lineTo(x+s*.9, y+s*.6); c.lineTo(x-s*.9, y+s*.6); c.closePath(); c.strokeStyle = C.fg; c.stroke(); break; }
    case "shield":
      c.strokeStyle = C.shield; c.beginPath(); c.arc(x, y, cs * .14, 0, Math.PI*2); c.stroke();
      c.beginPath(); c.arc(x, y, cs * .2, -.6, .6); c.stroke(); c.beginPath(); c.arc(x, y, cs * .2, Math.PI - .6, Math.PI + .6); c.stroke(); break;
    case "hyper":
      c.beginPath(); c.arc(x, y, cs * .15, 0, Math.PI*2); c.strokeStyle = C.hyper; c.stroke();
      c.fillStyle = C.hyper; c.font = "600 " + Math.round(cs * .17) + "px " + FONT_DISPLAY; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(ROMAN[d.tag] || d.tag, x, y - cs * .29); break;
  }
  c.restore();
}
function drawWorld(V, L, w, t, opt){
  const c = V.c, cs = V.cs;
  opt = opt || {};
  // Fuses, lighters and bombs (a banded drum, as in the original)
  L.fuses.forEach((f, i) => {
    const st = w.fuses[i], b = f.pts[f.pts.length - 1];
    if (st.st < 2){
      c.save(); c.strokeStyle = C.fuse; c.lineWidth = Math.max(1.5, cs * .035); c.setLineDash([cs * .07, cs * .05]);
      c.beginPath();
      const from = st.st === 1 ? st.s : 0, sp = polyAt(f, from);
      c.moveTo(X(V, sp[0]), Y(V, sp[1]));
      for (let k = 1; k < f.pts.length; k++) if (f.cum[k] > from) c.lineTo(X(V, f.pts[k][0]), Y(V, f.pts[k][1]));
      c.stroke(); c.restore();
      const bx = X(V, b[0]), by = Y(V, b[1]), bw = cs * .2, bh = cs * .3;
      c.save();
      const dg = c.createLinearGradient(bx - bw, 0, bx + bw, 0);
      dg.addColorStop(0, "#2b2b2b"); dg.addColorStop(.45, "#7a7a7a"); dg.addColorStop(1, "#202020");
      c.fillStyle = dg; rr(c, bx - bw, by - bh/2, bw*2, bh, bw * .35); c.fill();
      c.strokeStyle = "#111"; c.lineWidth = 1; c.stroke();
      c.strokeStyle = C.gold; c.lineWidth = 1.5;
      for (const yy of [by - bh * .28, by + bh * .28]){ c.beginPath(); c.moveTo(bx - bw, yy); c.lineTo(bx + bw, yy); c.stroke(); }
      c.restore();
      if (st.st === 1){
        const flick = .07 + .03 * Math.sin(t / 40);
        c.beginPath(); c.arc(X(V, sp[0]), Y(V, sp[1]), cs * flick * 1.8, 0, Math.PI*2); c.fillStyle = "rgba(255,170,60,.3)"; c.fill();
        c.beginPath(); c.arc(X(V, sp[0]), Y(V, sp[1]), cs * flick, 0, Math.PI*2); c.fillStyle = "#ffd36b"; c.fill();
      }
    }
    const l = f.pts[0], s = cs * .12;
    c.save(); c.fillStyle = st.st === 0 ? "#b98a2c" : "#5b5b5b"; rr(c, X(V, l[0]) - s, Y(V, l[1]) - s * .7, s*2, s*1.4, s * .25); c.fill();
    c.strokeStyle = C.goldHi; c.lineWidth = 1; c.stroke();
    if (st.st === 0){
      c.fillStyle = "#ff9b2f"; c.beginPath(); c.moveTo(X(V, l[0]), Y(V, l[1]) - s * 1.6); c.quadraticCurveTo(X(V, l[0]) + s*.5, Y(V, l[1]) - s, X(V, l[0]), Y(V, l[1]) - s*.7); c.quadraticCurveTo(X(V, l[0]) - s*.5, Y(V, l[1]) - s, X(V, l[0]), Y(V, l[1]) - s * 1.6); c.fill();
    }
    c.restore();
  });
  // Walls: bevelled light bars
  const ww = Math.max(3, cs * .085);
  L.walls.forEach((s, i) => { if (w.walls[i]) bevelLine(V, s[0], s[1], s[2], s[3], ww, C.wall); });
  // Doors: trim bars at both ends with pips, panel slides toward the first end
  L.doors.forEach((d, i) => {
    const s = d.seg, col = ECOL[d.color] || C.red, dx = s[2] - s[0], dy = s[3] - s[1], len = Math.hypot(dx, dy), nx = -dy/len * .17, ny = dx/len * .17;
    c.save(); c.strokeStyle = col; c.globalAlpha = .3; c.lineWidth = 1; c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(X(V, s[0]), Y(V, s[1])); c.lineTo(X(V, s[2]), Y(V, s[3])); c.stroke(); c.restore();
    const ds = doorSeg(L, w, i);
    if (w.doors[i].o < .999) bevelLine(V, ds[0], ds[1], ds[2], ds[3], Math.max(4, cs * .1), col);
    for (const e of [[s[0], s[1]], [s[2], s[3]]]) bevelLine(V, e[0] - nx, e[1] - ny, e[0] + nx, e[1] + ny, Math.max(3, cs * .07), C.wall);
    for (const e of [[s[0], s[1]], [s[2], s[3]]]) pips(V, e[0] + nx * 1.7, e[1] + ny * 1.7, d.pips, col);
  });
  // Door switches, up/down switches, triggers
  for (const s of L.switches){
    const col = ECOL[s.color] || C.red, r = cs * .14;
    c.save(); c.fillStyle = "#2a2a2a"; c.strokeStyle = col; c.lineWidth = 2; rr(c, X(V, s.x) - r, Y(V, s.y) - r, r*2, r*2, r*.3); c.fill(); c.stroke(); c.restore();
    pips(V, s.x, s.y, s.pips, col);
  }
  for (const s of L.uds){
    const r = cs * .15; c.save(); c.fillStyle = "#3a3a3a"; c.strokeStyle = C.fg; c.lineWidth = 1; rr(c, X(V, s.x) - r, Y(V, s.y) - r, r*2, r*2, r*.3); c.fill(); c.stroke(); c.restore();
    udSymbol(V, s.x, s.y, s.group, .065, C.fg, true);
  }
  for (const s of L.triggers){
    const col = ECOL[s.color] || C.red;
    c.save(); c.beginPath(); c.arc(X(V, s.x), Y(V, s.y), cs * .12, 0, Math.PI*2); c.fillStyle = col; c.fill(); c.strokeStyle = "#111"; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(X(V, s.x), Y(V, s.y), cs * .055, 0, Math.PI*2); c.fillStyle = "#f2f2f2"; c.fill(); c.restore();
  }
  L.spikes.forEach((s, i) => { if (w.spikes[i]) spikeMark(V, s.x, s.y, .13); });
  L.glasses.forEach((g, i) => {
    if (!w.glasses[i]) return;
    const x = X(V, g.x), y = Y(V, g.y), s = cs * .11;
    c.save(); c.strokeStyle = C.goldHi; c.fillStyle = C.gold; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x-s, y-s*1.3); c.lineTo(x+s, y-s*1.3); c.lineTo(x, y); c.lineTo(x+s, y+s*1.3); c.lineTo(x-s, y+s*1.3); c.lineTo(x, y); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(x-s*.5, y+s*1.3); c.lineTo(x+s*.5, y+s*1.3); c.lineTo(x, y+s*.5); c.closePath(); c.fill(); c.restore();
  });
  // Extended dots
  for (const b of L.bars){
    c.save(); c.lineCap = "round"; c.strokeStyle = "#bdbdbd"; c.lineWidth = cs * .13;
    c.beginPath(); c.moveTo(X(V, b.x1), Y(V, b.y1)); c.lineTo(X(V, b.x2), Y(V, b.y2)); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = cs * .035; c.beginPath(); c.moveTo(X(V, b.x1), Y(V, b.y1) - cs * .02); c.lineTo(X(V, b.x2), Y(V, b.y2) - cs * .02); c.stroke();
    c.restore();
  }
  for (const d of L.dots) drawDot(V, L, w, d, t);
  // Oil globs: glossy black with a bright rim so they read on the black field
  for (const g of w.globs){
    const x = X(V, g.x), y = Y(V, g.y), wob = 1 + .08 * Math.sin(t / 160 + g.id), r = cs * (g.st === 0 ? .1 : .13) * wob;
    c.save(); c.globalAlpha = g.st === 0 ? .75 : 1;
    c.beginPath(); c.ellipse(x, y, r * 1.12, r * .9, 0, 0, Math.PI*2); c.fillStyle = C.oil; c.fill();
    c.strokeStyle = "rgba(170,190,230,.75)"; c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.ellipse(x - r*.35, y - r*.35, r * .3, r * .18, -.6, 0, Math.PI*2); c.fillStyle = "rgba(230,240,255,.85)"; c.fill(); c.restore();
  }
  // Wallbusters
  w.busters.forEach(b => {
    if (b.st === 2) return;
    const x = X(V, b.x), y = Y(V, b.y), r = cs * .12;
    const bgr = c.createRadialGradient(x - r*.4, y - r*.4, r*.1, x, y, r);
    bgr.addColorStop(0, "#f0ece4"); bgr.addColorStop(1, "#7f7a72");
    c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fillStyle = bgr; c.fill(); c.strokeStyle = "#222"; c.lineWidth = 1; c.stroke(); c.restore();
  });
  // Guns: dark housings with coloured lamps; bullets are white pellets
  for (const g of L.guns){
    const col = ECOL[g.color] || C.red, x = X(V, g.x), y = Y(V, g.y), s = cs * .14;
    c.save(); c.strokeStyle = "#b5b5b5"; c.lineWidth = cs * .06; c.lineCap = "butt";
    for (const k of g.dirs){ c.beginPath(); c.moveTo(x, y); c.lineTo(x + DIRS[k][0] * cs * .27, y + DIRS[k][1] * cs * .27); c.stroke(); }
    c.fillStyle = "#2c2c2c"; rr(c, x - s, y - s, s*2, s*2, s*.25); c.fill(); c.strokeStyle = "#9a9a9a"; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(x, y, cs * .065, 0, Math.PI*2); c.fillStyle = col; c.fill(); c.restore();
  }
  c.save(); c.fillStyle = "#ffffff";
  for (const b of w.bullets){ c.beginPath(); c.arc(X(V, b.x), Y(V, b.y), cs * .05, 0, Math.PI*2); c.fill(); }
  c.restore();
  if (opt.indicator) for (const p of w.players) if (!p.dead && !p.done) drawIndicator(V, L, w, p);
  // Enemy hands and moving spikes
  for (const e of w.enemies){
    if (e.dead) continue;
    if (e.kind === "spike"){
      c.save(); c.strokeStyle = "rgba(255,255,255,.14)"; c.setLineDash([2, 4]); c.beginPath(); c.arc(X(V, e.x), Y(V, e.y), cs * .5, 0, Math.PI*2); c.stroke(); c.restore();
      const sp = spikePoint(e); spikeMark(V, sp[0], sp[1], .14, t / 300);
    } else drawHand(V, e, "enemy", ECOL[e.color] || C.red);
  }
}
function drawIndicator(V, L, w, P){
  const c = V.c;
  const arcArrow = (cx, cy, from, dir, color, rad) => {
    const a0 = from * Math.PI/2, a1 = a0 + dir * 1.1;
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2; c.lineCap = "round";
    c.beginPath(); c.arc(X(V, cx), Y(V, cy), rad * V.cs, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
    const ex = X(V, cx) + Math.cos(a1) * rad * V.cs, ey = Y(V, cy) + Math.sin(a1) * rad * V.cs, tang = a1 + dir * Math.PI/2;
    c.beginPath(); c.moveTo(ex + Math.cos(tang)*6, ey + Math.sin(tang)*6);
    c.lineTo(ex + Math.cos(tang+2.4)*6, ey + Math.sin(tang+2.4)*6); c.lineTo(ex + Math.cos(tang-2.4)*6, ey + Math.sin(tang-2.4)*6);
    c.closePath(); c.fill(); c.restore();
  };
  const col = P.id === 1 ? "rgba(220,220,220," : "rgba(243,220,149,";
  arcArrow(P.x, P.y, P.q + P.dir * .3, P.dir, col + ".55)", .34);
  const b = P.dir > 0 ? Math.floor(P.q) + 1 : Math.ceil(P.q) - 1, k = mod4(b);
  const tg = findGrab(L, w, P.x + DIRS[k][0], P.y + DIRS[k][1]);
  if (tg) arcArrow(tg.x, tg.y, k + 2 - P.dir * .3, -P.dir, col + ".85)", .3);
}
function popup(x, y, text){ G.fx.push({ k:"text", x, y, text, t:now() }); }
const clockStr = s => s === Infinity ? "∞" : Math.floor(Math.ceil(s) / 60) + ":" + String(Math.ceil(s) % 60).padStart(2, "0");

function render(t){
  const L = G.L; if (!L || !G.w || !VIEW.F) return;
  const V = VIEW, c = ctx;
  c.save(); c.setTransform(1,0,0,1,0,0); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(bg, 0, 0); c.restore();
  drawClockHands(V);
  const low = G.timeLeft !== Infinity && G.timeLeft < 10;
  drawStatus(V, L, [
    ["Level " + String(G.idx + 1).padStart(2, "0"), SET.levels[G.idx].name],
    ["Time", clockStr(G.timeLeft), low ? C.danger : C.fg],
    G.two ? { two:[[G.names[0] + "  " + fmt(G.level[0]) + " / " + fmt(G.totals[0]), "", C.p1hi], [G.names[1] + "  " + fmt(G.level[1]) + " / " + fmt(G.totals[1]), "", "#e0e0e0"]] }
          : [G.names[0], fmt(G.level[0]) + "   " + fmt(totalOf(G.names[0]))],
  ]);
  drawWorld(V, L, G.w, t, { indicator:S.opts.indicator && (G.state === "play" || G.state === "ready") });
  if (G.pending){
    c.save(); c.strokeStyle = C.goldHi; c.lineWidth = 2; c.setLineDash([4, 4]);
    c.beginPath(); c.arc(X(V, G.pending.x), Y(V, G.pending.y), V.cs * (.22 + .03 * Math.sin(t / 90)), 0, Math.PI*2); c.stroke(); c.restore();
  }
  G.w.players.forEach((P, p) => {
    const style = p ? "p2" : "p1", dd = G.death[p];
    if (dd){
      const k = Math.min(1, (t - dd.t) / 800), a = dd.hand.q * Math.PI / 2;
      c.save(); c.strokeStyle = C.danger; c.globalAlpha = 1 - k; c.lineWidth = 3;
      c.beginPath(); c.arc(X(V, dd.hand.x), Y(V, dd.hand.y), V.cs * (.2 + k * .9), 0, Math.PI*2); c.stroke(); c.restore();
      drawHand(V, dd.hand, style, null, 1 - k, [Math.cos(a+1) * k * V.cs * .4, Math.sin(a+1) * k * V.cs * .4 + k*k * V.cs * .6]);
    } else if (!P.dead && !P.done) drawHand(V, P, style);
    if (G.state === "ready" && !P.dead) sparkle(V, P.x, P.y, t, .22, p ? "#e0e0e0" : C.goldHi);
  });
  G.fx = G.fx.filter(f => t - f.t < (f.k === "text" ? 1100 : 900));
  for (const f of G.fx){
    const k = (t - f.t) / (f.k === "text" ? 1100 : 900);
    c.save(); c.globalAlpha = 1 - k;
    if (f.k === "text"){
      c.fillStyle = C.goldHi; c.textAlign = "center"; c.font = "600 " + Math.round(Math.max(11, V.cs * .22)) + "px " + FONT_MONO;
      c.fillText(f.text, X(V, f.x), Y(V, f.y) - V.cs * (.3 + k * .4));
    } else if (f.k === "boom"){
      const g = c.createRadialGradient(X(V, f.x), Y(V, f.y), 0, X(V, f.x), Y(V, f.y), V.cs * 1.3 * (.3 + k));
      g.addColorStop(0, "rgba(255,240,180,.95)"); g.addColorStop(.6, "rgba(255,130,40,.65)"); g.addColorStop(1, "rgba(255,130,40,0)");
      c.fillStyle = g; c.beginPath(); c.arc(X(V, f.x), Y(V, f.y), V.cs * 1.3 * (.3 + k), 0, Math.PI*2); c.fill();
    } else if (f.k === "dust"){
      c.fillStyle = "rgba(200,192,178,.65)";
      for (let i = 0; i < 9; i++){ const a = i * 2.4, r = V.cs * (.1 + k * .6) * (1 + (i % 3) * .3); c.beginPath(); c.arc(X(V, f.x) + Math.cos(a) * r, Y(V, f.y) + Math.sin(a) * r, V.cs * .07 * (1 - k * .5), 0, Math.PI*2); c.fill(); }
    } else if (f.k === "poof"){
      c.strokeStyle = "#ffffff"; c.lineWidth = 2; c.beginPath(); c.arc(X(V, f.x), Y(V, f.y), V.cs * (.2 + k * .8), 0, Math.PI*2); c.stroke();
    }
    c.restore();
  }
}

/* ---------------- HUD ---------------- */
const hud = { time:$("#hTime"), s1:$("#hScore1"), t1:$("#hTotal1"), s2:$("#hScore2"), t2:$("#hTotal2") };
function setText(el, v){ if (el.textContent !== v) el.textContent = v; }
function updateHud(){
  if (G.timeLeft === Infinity) setText(hud.time, "∞");
  else { const s = Math.ceil(G.timeLeft); setText(hud.time, Math.floor(s/60) + ":" + String(s % 60).padStart(2, "0")); }
  hud.time.classList.toggle("low", G.timeLeft !== Infinity && G.timeLeft < 10);
  setText(hud.s1, fmt(G.level[0]));
  setText(hud.t1, fmt(G.two ? G.totals[0] : totalOf(G.names[0])));
  if (G.two){ setText(hud.s2, fmt(G.level[1])); setText(hud.t2, fmt(G.totals[1])); }
}

/* =====================================================================
   TITLE ATTRACT MODE + HELP LEGEND
   ===================================================================== */
const DEMO = { map:["o.o.o.o.o.o.o","............." ,"o.o.o.o.o.o.o",".............","S.o.o.o.o.o.G"], time:60, objects:[],
  enemies:[{x:1,y:0,q:0,dir:1,color:"gold",script:"nnns"},{x:3,y:1,q:1,dir:-1,color:"blue",script:"n"},
           {x:5,y:0,q:2,dir:1,color:"red",script:"nnnf"},{x:4,y:2,q:3,dir:1,color:"green",script:"nnns"}] };
const titleL = buildLevel(DEMO, "M"); tintDots(titleL);
const titleW = makeWorld(titleL, 0, 1);
const tcv = $("#titleCv"), tctx = tcv.getContext("2d");
let titleBg = null;
function renderTitle(t, dt){
  if (!titleBg){
    const r = fitView(titleL, 640, 380), dpr = Math.min(3, window.devicePixelRatio || 1);
    tcv.width = Math.round(r.w * dpr); tcv.height = Math.round(r.h * dpr);
    tcv.style.width = "min(" + r.w + "px, 100%)"; tcv.style.height = "auto";
    tctx.setTransform(dpr,0,0,dpr,0,0);
    const V = { c:tctx, cs:r.cs, ox:r.ox, oy:r.oy, w:r.w, h:r.h, F:r.F };
    const off = document.createElement("canvas"); off.width = tcv.width; off.height = tcv.height;
    const oc = off.getContext("2d"); oc.setTransform(dpr,0,0,dpr,0,0);
    drawBackdrop(Object.assign({}, V, { c:oc }), titleL);
    titleBg = { V, off };
  }
  const V = titleBg.V, best = Math.max(0, ...Object.keys(setData().profiles).map(totalOf));
  worldStep(titleL, titleW, Math.min(dt, .05), 2, () => "n");
  tctx.save(); tctx.setTransform(1,0,0,1,0,0); tctx.drawImage(titleBg.off, 0, 0); tctx.restore();
  drawClockHands(V);
  const d = new Date();
  drawStatus(V, titleL, [["Fan remake", "Press any key"], ["Time", d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0")], ["Best total", fmt(best)]]);
  drawWorld(V, titleL, titleW, t, {});
}
/* Each legend entry is a tiny level drawn with the same renderer. */
const LEGEND = [
  ["Your clock hand", "Gold for player 1, black for player 2.", { map:["S"], player:true }],
  ["Goal dot", "Grab it to finish the level. It sparkles at the start.", { map:["S.G"] , focus:[1,0] }],
  ["Bonus dot", "Swing or flip onto it: 1,000, then 2,000, up to 5,000 each.", { map:["S.+"], focus:[1,0] }],
  ["Enemy clock hands", "Blue, green or red, each on a fixed path. Touching one destroys you.", { map:["S.o"], enemies:[{x:1,y:0,q:2,dir:1,color:"blue"}], focus:[.5,0] }],
  ["Spike", "Stationary spikes destroy your hand; enemies pass them safely.", { map:["S.o"], objects:[{t:"spike",at:[.5,0]}], focus:[.5,0] }],
  ["Moving spike", "Orbits a dot on a clock-hand path, at the middle of the hand.", { map:["S.o"], enemies:[{x:1,y:0,q:2,dir:1,kind:"spike"}], focus:[.75,0] }],
  ["Wall", "Bounces clock hands. Hyperdotting or riding into one destroys you.", { map:["S|o"], focus:[.5,0] }],
  ["Door and switch", "Any hand over a switch opens or closes doors with matching colour and dots.", { map:["S.o"], objects:[{t:"door",seg:[1.5,-.5,1.5,.5],id:"r1",color:"red",pips:1},{t:"switch",at:[.5,0],id:"r1"}], focus:[1,0] }],
  ["Oil glob", "Wakes when you pass over it, creeps to a dot, then drips toward you.", { map:["S.o"], objects:[{t:"glob",at:[.5,0]}], focus:[.5,0] }],
  ["Lighter, fuse and bomb", "Pass the lighter to start the spark. The blast breaks walls and spikes and kills nearby hands.", { map:["S.o"], objects:[{t:"fuse",path:[[0,0],[1,0]]}], focus:[.5,0] }],
  ["Trigger, gun and bullet", "A trigger fires every gun of its colour. Bullets stop at walls.", { map:["S.o"], objects:[{t:"trigger",at:[0,0],color:"blue"},{t:"gun",at:[1,0],color:"blue",dirs:[0,3]}], focus:[.5,0] }],
  ["Wallbuster", "Push it with your hand; it smashes the first wall it hits and returns later.", { map:["S.o"], objects:[{t:"buster",at:[.5,0]}], focus:[.5,0] }],
  ["Moving dot", "Moves one place per quarter turn of your hand. Riding into a wall destroys you.", { map:["S. "], objects:[{t:"mover",path:[[1,0],[1.6,0]]}], focus:[1,0] }],
  ["Extended dot", "One long dot. Stay on it and you slide from end to end.", { map:["S.o=o"], focus:[1.5,0] }],
  ["Ring dot", "Disappears when you let go, then reappears after a delay.", { map:["S.r"], focus:[1,0] }],
  ["Slowdown dot", "While you ride it, every enemy hand moves at half speed.", { map:["S.v"], focus:[1,0] }],
  ["Way station", "Grab it to restart there, with the time you had. Hard has none.", { map:["S.W"], focus:[1,0] }],
  ["Death dot", "Safe to ride, deadly to jump from one straight to another.", { map:["S.x"], focus:[1,0] }],
  ["Hyperdots", "Come in pairs. Grab one and you jump to its twin, angle and spin kept.", { map:["S.1"], focus:[1,0] }],
  ["Shield dot", "Enemy hands can't hurt you while you stay on it.", { map:["S.s"], focus:[1,0] }],
  ["Up/down dots and switch", "A switch raises or sinks every dot with its symbol. Don't be on one when it sinks.", { map:["S.A"], objects:[{t:"ud",at:[.5,0],group:"A"}], focus:[1,0] }],
  ["Hourglass", "Sweep over it for 10 more seconds and 1,000 points.", { map:["S.o"], objects:[{t:"glass",at:[.5,0]}], focus:[.5,0] }],
];
function buildLegend(){
  const box = $("#legend"); box.innerHTML = "";
  for (const [name, desc, spec] of LEGEND){
    const c = document.createElement("canvas"), dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = 64 * dpr; c.height = 64 * dpr;
    const g = c.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0);
    try {
      const L = buildLevel({ map:spec.map, time:60, objects:spec.objects || [], enemies:spec.enemies || [] }, "M");
      const w = makeWorld(L, spec.player ? 1 : 0, 1);
      const f = spec.focus || [.5,0], cs = 38, V = { c:g, cs, ox:32 - f[0]*cs, oy:32 - f[1]*cs };
      drawWorld(V, L, w, 0, {});
      if (spec.player) drawHand(V, w.players[0], "p1");
    } catch (e){}
    const label = document.createElement("div");
    label.innerHTML = "<b>" + name + ".</b> " + desc;
    box.append(c, label);
  }
}

/* =====================================================================
   MAIN LOOP + BOOT
   ===================================================================== */
let last = now();
function frame(t){
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  if (UI.screen === "scrTitle") renderTitle(t, dt);
  else if (UI.screen === "scrOptions" && t - UI.idleAt > 60000 && !dialogOpen()) goTitle();   // idle options return to the title
  if (G.active){
    if (!UI.screen && !dialogOpen()) tick(dt);
    if (!UI.screen){ render(t); updateHud(); }
  }
  requestAnimationFrame(frame);
}
buildLegend();
syncMenus();
goTitle();
requestAnimationFrame(frame);
