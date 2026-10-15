#!/usr/bin/env node
// Solve every level in a built page on the chosen difficulties. Exits 1 if any level fails.
// Usage: node tools/verify.js [index.html] [C E M H] [--only 1,2,3]
const fs = require("fs"), path = require("path");
const args = process.argv.slice(2);
const oi = args.indexOf("--only"), only = oi >= 0 ? args.splice(oi, 2)[1].split(",").map(Number) : null;
const file = path.resolve(args.find(a => a.endsWith(".html")) || path.join(__dirname, "..", "index.html"));
const diffs = args.filter(a => /^[CEMH]$/.test(a)); if (!diffs.length) diffs.push("C", "E", "M", "H");
const S = require("./load.js")(file);
const src = fs.readFileSync(file, "utf8");
const json = src.slice(src.indexOf("const BUILTIN_LEVELS = ") + 23, src.indexOf(";\n", src.indexOf("const BUILTIN_LEVELS = ")));
const LEVELS = JSON.parse(json);
let bad = 0;
LEVELS.forEach((def, i) => {
  if (only && !only.includes(i + 1)) return;
  const row = [];
  for (const d of diffs){
    const r = S.verifyLevel(def, d, { maxStates:250000 });
    if (!r.ok) bad++;
    row.push(d + (r.ok ? " " + r.secs.toFixed(1) + "/" + r.limit + "s " + r.moves.length + "mv" : " FAIL(" + r.reason + ")"));
  }
  console.log(String(i + 1).padStart(3) + " " + def.name.padEnd(18) + " " + row.join("  "));
});
console.log(bad ? bad + " unsolved" : "All solvable");
process.exit(bad ? 1 : 0);
