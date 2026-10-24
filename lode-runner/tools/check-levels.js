// Approximate reachability check for the built-in levels: node tools/check-levels.js [index.html]
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||require("path").join(__dirname,"..","index.html"),'utf8');
const m=src.match(/<script id="levels" type="application\/json">([\s\S]*?)<\/script>/);
const data=JSON.parse(m?m[1]:src);
const W=28,H=16;
let bad=0;
function check(lv,arena){
  const g=lv.map.map(r=>r.split(''));
  const items=lv.map.join('');
  const jack=items.includes('j'), bomb=/[bB]/.test(items), mega=items.includes('m'), keys=items.includes('k');
  const pads={},tele={};
  g.forEach((r,y)=>r.forEach((c,x)=>{if(c>='5'&&c<='9')(pads[c]=pads[c]||[]).push(x+','+y);}));
  for(const c in pads)if(pads[c].length===2){tele[pads[c][0]]=pads[c][1];tele[pads[c][1]]=pads[c][0];}
  const at=(x,y)=>x<0||x>=W||y>=H?'@':y<0?' ':g[y][x];
  const reach=(sx,sy,open)=>{
    const lad=(x,y)=>{const c=at(x,y);return c==='H'||(open&&c==='S');};
    const sol=(x,y)=>'#~@%&'.includes(at(x,y))||(!keys&&at(x,y)==='D');
    const bad=(x,y)=>sol(x,y)||at(x,y)==='=';
    const sup=(x,y)=>y>=H-1||lad(x,y)||at(x,y)==='-'||sol(x,y+1)||lad(x,y+1);
    const seen=new Set([sx+','+sy]),q=[[sx,sy]];let exit=false;
    const push=(x,y)=>{if(x<0||x>=W||y<0||y>=H||at(x,y)==='=')return;let k=x+','+y;if(tele[k]){if(!seen.has(k))seen.add(k);k=tele[k];[x,y]=k.split(',').map(Number);}if(!seen.has(k)){seen.add(k);q.push([x,y]);}};
    while(q.length){const[x,y]=q.shift();
      if(open&&(at(x,y)==='E'||(y===0&&lad(x,y))))exit=true;
      if(!sup(x,y)){if(!bad(x,y+1))push(x,y+1);continue;}
      for(const d of[-1,1]){ if(!sol(x+d,y))push(x+d,y);
        const c=at(x+d,y+1); if(c==='#'&&!sol(x+d,y)&&!lad(x+d,y))push(x+d,y+1);}
      if(lad(x,y)&&!sol(x,y-1))push(x,y-1);
      if(!sol(x,y+1))push(x,y+1);
      const b=at(x,y+1);
      if((jack||mega)&&'#~@X%&D'.includes(b))push(x,y+1);
      if(bomb&&b==='#')push(x,y+1);
    }
    return {seen,exit};
  };
  const starts=[],gold=[];
  g.forEach((r,y)=>r.forEach((c,x)=>{if('1234'.includes(c))starts.push([x,y,c]);if(c==='$')gold.push([x,y]);}));
  const errs=[];
  if(!starts.find(s=>s[2]==='1'))errs.push('no start 1');
  for(const[sx,sy,c] of starts){const r=reach(sx,sy,false);
    for(const[gx,gy]of gold)if(!r.seen.has(gx+','+gy))errs.push(`P${c}: gold ${gx},${gy} unreachable`);}
  for(const[gx,gy]of gold){const r=reach(gx,gy,!arena);
    if(!arena&&!r.exit)errs.push(`no exit from gold ${gx},${gy}`);
    if(arena&&!starts.every(([sx,sy])=>r.seen.has(sx+','+sy))&&!gold.every(([hx,hy])=>r.seen.has(hx+','+hy)))errs.push(`stuck after gold ${gx},${gy}`);}
  if(lv.race){const r=reach(starts[0][0],starts[0][1],true);if(!r.exit)errs.push('race: no exit');}
  console.log((errs.length?'FAIL ':'ok   ')+lv.name+(errs.length?'\n   '+errs.join('\n   '):''));
  bad+=errs.length;
}
data.campaign.forEach(l=>check(l,false));data.arenas.forEach(l=>check(l,true));
process.exit(bad?1:0);
