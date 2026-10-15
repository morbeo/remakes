// Loads the simulation from src/sim.js, or from the SIM block of a built page.
const fs = require("fs"), path = require("path");
const NAMES = "DIRS,TUNE,SPEED,TIMEMUL,DONE_PTS,SEC_PTS,DIFFNAME,buildLevel,makeWorld,worldStep,solveLevel,verifyLevel,tintDots,findGrab,cloneDeep,worldSig";
module.exports = function load(file){
  file = file || path.join(__dirname, "..", "src", "sim.js");
  let src = fs.readFileSync(file, "utf8");
  if (file.endsWith(".html")) src = src.split("/*SIM-START*/")[1].split("/*SIM-END*/")[0];
  return new Function(src + "\nreturn {" + NAMES + "};")();
};
