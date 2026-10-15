#!/usr/bin/env node
// Assemble the game page from src/shell.html, src/sim.js, src/levels.json and src/app.js.
// Usage: node tools/build.js [--out index.html] [--fragment]
//   default      full HTML document (doctype, charset, viewport) for opening in a browser
//   --fragment   body-only markup, for hosts that supply their own <head> (e.g. Claude artifacts)
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const args = process.argv.slice(2), oi = args.indexOf("--out"), fragment = args.includes("--fragment");
const out = path.resolve(oi >= 0 ? args[oi + 1] : path.join(root, "index.html"));
const read = f => fs.readFileSync(path.join(root, "src", f), "utf8");
const levels = JSON.parse(read("levels.json")).map(({ feats, solved, n, ...keep }) => keep);
if (levels.length !== 100) console.warn("warning: " + levels.length + " levels");
let html = read("shell.html")
  .replace("/*SIM*/", () => read("sim.js"))
  .replace("/*LEVELS*/", () => JSON.stringify(levels))
  .replace("/*APP*/", () => read("app.js"));
if (!fragment) html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  html.replace(/<\/style>\n/, "</style>\n</head>\n<body>\n") + "\n</body>\n</html>\n";
fs.writeFileSync(out, html);
console.log("Wrote " + out + " (" + (html.length / 1024).toFixed(0) + " KB, " + levels.length + " levels" + (fragment ? ", fragment" : "") + ")");
