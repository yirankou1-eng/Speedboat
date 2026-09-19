const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../dynamics.js');
const ScreenSplash=require('../screen-splash.js');
// Execute the real scene and game logic with only the WebGL renderer stubbed.
const THREE=require('../three.min.js');
THREE.WebGLRenderer=class{constructor(){this.domElement={};this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.info={render:{calls:0}};}setSize(){}setPixelRatio(){}getPixelRatio(){return 1;}setRenderTarget(){}render(){}};
THREE.PMREMGenerator=class{fromScene(){return {texture:new THREE.Texture()};}dispose(){}};
function run(cfg){
const elements=new Map(),element=()=>({style:{},dataset:{},children:[],setAttribute(){},appendChild(child){this.children.push(child);},classList:{add(){},remove(){}},addEventListener(){}});
const document={body:{appendChild(){}},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement(tag){return tag==='canvas'?{getContext:()=>({fillRect(){},strokeRect(){}})}:element();}};
let seed=93461;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const ctx=vm.createContext({cfg,THREE,MapCatalog:require('../maps.js'),CityScenery:require('../city.js'),BoatDynamics:{...D,chooseRoute:(a,f,length,dt)=>D.chooseRoute(a,f,length,dt,math.random)},ScreenSplash,document,window:{},innerWidth:1280,innerHeight:720,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},setTimeout(){},location:{search:cfg.map?'?map='+cfg.map:''},URLSearchParams,performance,console,Math:math});
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],ctx);
function test(code){return vm.runInContext(code,ctx);}


return test(`(()=>{
 started=true;keys.w=true;
 let other=0;const speeds=[...speedPool].sort((a,b)=>a-b),skills=[...skillPool].sort((a,b)=>a-b);
 ais.forEach((a,i)=>{const elite=i===(cfg.slot===undefined?2:cfg.slot);a.baseSpeed=elite?speeds[2]:speeds[other];a.skill=elite?skills[2]:skills[other++];a.rampSkill=1-a.skill;});

 let lane=-20, boostCount=0,wasBonus=0,goal=0;const events=[];
 for(let i=0;i<300*60;i++){
  const dt=1/60;raceTime=i*dt;
  const progress=player.lap-1+player.prog;
  while(progress>features[goal%features.length].t+Math.floor(goal/features.length)+25/curveLen)goal++;
  const f=features[goal%features.length],d=(f.t+Math.floor(goal/features.length)-progress)*curveLen;
  let desired=player.lap===1&&player.prog<.13?-10:(cfg.inner||70)*halfWidthAt(player.prog)/HW;
  if(d<(f.kind==='boost'&&f.lat<0?400:(cfg.lead||260))){
   desired=f.kind==='bridge'?f.openings.reduce((best,o)=>Math.abs(o-lane)<Math.abs(best-lane)?o:best)+Math.min(12,f.halfOpening-6):f.kind==='boost'?f.lat+8:Math.abs(f.lat-desired)<20?(f.lat+22<=laneLimitAt(f.t)?f.lat+22:f.lat-16):desired;
   if(f.kind==='boost'&&Math.floor(goal/features.length)*3+boosts.indexOf(f)===cfg.skip)desired=f.lat>=0?f.lat-24:laneLimitAt(f.t);
  }
  if(f.kind==='bridge'&&f.t===.12&&player.lap===1)desired=-12;
  desired=THREE.MathUtils.clamp(desired,-Math.min(laneLimitAt(player.prog),laneLimitAt(player.prog+.02)),Math.min(laneLimitAt(player.prog),laneLimitAt(player.prog+.02)));
  lane+=THREE.MathUtils.clamp(desired-lane,-20*dt,20*dt);
  const look=Math.max(20,player.v*(cfg.look||.6)),target=curveAt(player.prog+look/curveLen),dir=tangentAt(player.prog+look/curveLen);
  target.x-=dir.z*lane;target.z+=dir.x*lane;
  const delta=Math.atan2(Math.sin(Math.atan2(target.x-player.x,target.z-player.z)-player.heading),Math.cos(Math.atan2(target.x-player.x,target.z-player.z)-player.heading));
  const control=delta*3-(player.yawVel||0)*1.1;keys.a=control>.02;keys.d=control<-.02;
  keys.s=!!cfg.brake&&raceTime>80&&raceTime<81.5;
  updatePlayer(dt,raceTime);updateAI(dt,raceTime);
  if((player.bonus||0)>wasBonus+10){boostCount++;events.push([raceTime.toFixed(2),player.prog.toFixed(3)]);}wasBonus=player.bonus||0;
  if(player.finished&&ais.every(a=>a.finished))break;
 }
 return {player:player.finishTime,hits:player.hits||0,boostCount,ai:ais.map(a=>a.finishTime),events};
})()`);
}

// A feasible input-only route, not a mathematical proof of global optimality.
// Each fresh race uses the actual tiers and real AI routing, boosts and collisions.
if(require.main===module&&process.argv[2]){console.log(run(JSON.parse(process.argv[2])));process.exit(0);}
if(require.main===module){
const results=[];
for(let slot=0;slot<3;slot++){
 const clean=run({slot});const margin=clean.ai[slot]-clean.player;
 assert.equal(clean.boostCount,6);assert(clean.player>0&&margin>.1&&margin<1.5,JSON.stringify({slot,clean}));
 const missed=[];
 for(let skip=0;skip<6;skip++){
  const result=run({slot,skip});
  assert.equal(result.boostCount,5,JSON.stringify({slot,skip,result}));
  assert(result.ai[slot]>0&&result.player>result.ai[slot],JSON.stringify({slot,skip,result}));
  missed.push(+(result.player-result.ai[slot]).toFixed(2));
 }
 results.push({slot,player:+clean.player.toFixed(2),opponent:+clean.ai[slot].toFixed(2),margin:+margin.toFixed(2),missedLosses:missed});
}
const inefficient=run({slot:2,inner:48});
assert(inefficient.player>inefficient.ai[2],JSON.stringify(inefficient));
const mistake=run({slot:2,brake:true});
assert(mistake.player>mistake.ai[2],JSON.stringify(mistake));
console.log('PASS: all three strongest-opponent grid slots narrowly beatable; each omitted boost, wider route and 1.5-second braking error lose.');
console.log(JSON.stringify({results,widerRoute:inefficient.player,brakingError:mistake.player}));

}
module.exports={run};
