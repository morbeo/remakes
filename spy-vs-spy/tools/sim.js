// Headless CPU-vs-CPU rounds for checking balance after rule or AI changes.
// Usage: node tools/sim.js [rounds=40] [size=medium] [cpu=normal] [clock=300]
const fs = require("fs"), path = require("path");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = html.indexOf('"use strict";'), end = html.indexOf("// ---------------------------------------------------------------- drawing");
global.localStorage = { getItem() { return null; }, setItem() {} };
const { Game, AI } = new Function(html.slice(start, end) + "; return { Game, AI };")();
const [N = 40, size = "medium", cpu = "normal", clock = 300] = process.argv.slice(2);
const wins = { White: 0, Black: 0, none: 0 }, causes = {}; let t = 0, falls = 0;
for (let n = 0; n < +N; n++) {
  const g = new Game({ seed: n * 7919 + 1, size, time: +clock });
  g.ai = [new AI(g, 0, cpu), new AI(g, 1, cpu)];
  const kill = g.kill.bind(g); g.kill = (s, c, b) => { const k = c + (b === s.i ? " (own)" : ""); causes[k] = (causes[k] || 0) + 1; kill(s, c, b); };
  while (!g.over) g.step(1 / 60, []);
  wins[g.winner < 0 ? "none" : g.spies[g.winner].name]++; t += g.t; falls += g.spies[0].deaths + g.spies[1].deaths;
}
console.log(`${N} rounds, ${size}, ${cpu} CPU, ${clock}s clock`);
console.log("wins:", wins, " average round:", Math.round(t / N) + "s", " falls per round:", (falls / N).toFixed(1));
console.log("falls by cause:", causes);
