const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../three.min.js'),Maps=require('../maps.js'),D=require('../dynamics.js');
THREE.WebGLRenderer=class{constructor(){this.domElement={};this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.info={render:{calls:0}};}setSize(){}setPixelRatio(){}getPixelRatio(){return 1;}setRenderTarget(){}render(){}};
THREE.PMREMGenerator=class{fromScene(){return {texture:new THREE.Texture()};}dispose(){}};
const elements=new Map(),element=()=>({style:{},dataset:{},children:[],setAttribute(){},appendChild(child){this.children.push(child);},classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn;}});
const document={body:{appendChild(){}},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement(tag){return tag==='canvas'?{getContext:()=>({fillRect(){},strokeRect(){}})}:element();}};
let seed=93461;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const ctx=vm.createContext({THREE,MapCatalog:Maps,CityScenery:require('../city.js'),BoatDynamics:D,ScreenSplash:require('../screen-splash.js'),document,window:{},innerWidth:1280,innerHeight:720,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},setTimeout(){},location:{search:'?map=playground'},URLSearchParams,performance,console,Math:math});
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],ctx);
const test=code=>vm.runInContext(code,ctx);
assert.equal(test('swimRings.length'),18);
assert.equal(test(`(()=>{
 const r=swimRings[0],savedR={...r},savedP={...player},savedA=ais.map(a=>({...a})),wasStarted=started,savedShake=shake;
 function setContact(b,human){
   const p=curveAt(.075),tan=tangentAt(.075),heading=Math.atan2(tan.x,tan.z);
   r.x=p.x+tan.x*8-tan.z*3;r.z=p.z+tan.z*8+tan.x*3;r.vx=r.vz=0;r.progress=.075;
   Object.assign(b,{heading,air:false,onRamp:null,finished:false});
   if(human)Object.assign(b,{x:p.x,z:p.z,y:waterH(p.x,p.z,0),v:50,yawVel:0,floatVX:0,floatVZ:0,prog:.075});
   else {Object.assign(b,{px:p.x,pz:p.z,t:.075,lat:0,curV:50,floatLatV:0});b.mesh.position.y=waterH(p.x,p.z,0);}
 }
 try{
   started=true;shake=0;ais.forEach(a=>a.finished=true);setContact(player,true);updateSwimRings(1/60,0);
   if(!(player.v<50&&player.v>42&&shake>.24&&shake<=.48&&Math.abs(player.yawVel)>0&&Math.hypot(r.vx,r.vz)>10))return false;
   setContact(player,true);player.air=true;updateSwimRings(1/60,0);
   if(r.vx!==0||r.vz!==0)return false;
   player.finished=true;setContact(ais[0],false);updateSwimRings(1/60,0);
   if(!(ais[0].curV<50&&Math.hypot(r.vx,r.vz)>10))return false;
   const p=curveAt(.075),tan=tangentAt(.075),lat=halfWidthAt(.075)+5;
   r.x=p.x-tan.z*lat;r.z=p.z+tan.x*lat;r.vx=-tan.z*20;r.vz=tan.x*20;
   ais[0].finished=true;updateSwimRings(1/60,0);
   return r.vx*-tan.z+r.vz*tan.x<0;
 }finally{Object.assign(r,savedR);Object.assign(player,savedP);ais.forEach((a,i)=>Object.assign(a,savedA[i]));started=wasStarted;shake=savedShake;}
})()`),true,'real player/AI contact, airborne exclusion and ring rebound at the bank');
assert.equal(Maps.maps.length,3);
assert.equal(test('activeMap.id'),'playground');assert.equal(test('RACE_LAPS'),2);
assert(Math.abs(test('curveLen')/Maps.curve(THREE,'classic').getLength()-1.1)<1e-10);
assert.equal(test('bridges.length+bridgeSites.length'),0,'no bridges or approach grading sites');
assert.equal(test('staticScenery.length'),290,'Classic palms and huts retained');
assert(test('mtnPeaks.length')>0);assert.equal(test("!!scene.getObjectByName('island-terrain')&&!!scene.getObjectByName('canyon-bank')"),true);
assert.equal(test('ramps.length'),4);assert.equal(test('boosts.length'),3);
assert.equal(test('ramps.concat(boosts).every(f=>Math.abs(f.lat)+(f.kind===\'ramp\'?f.width/2:13)<halfWidthAt(f.t)-4)'),true);
assert.equal(test(`(()=>{
  for(let i=0;i<1200;i++){
    const t=i/1200,p=curveAt(t),a=tangentAt(t-.001),b=tangentAt(t+.001);
    const turn=Math.abs(Math.atan2(a.x*b.z-a.z*b.x,a.dot(b)));
    if(turn*(halfWidthAt(t)+3)/(curveLen*.002)>.95)return false;
    // The ground grid ends at +/-1300; leave room for the complete bank collar.
    if(Math.max(Math.abs(p.x),Math.abs(p.z))+halfWidthAt(t)+68>1300)return false;
    for(let j=i+60;j<1200;j+=12){
      if(1200-(j-i)<60)continue;
      if(p.distanceTo(curveAt(j/1200))<halfWidthAt(t)+halfWidthAt(j/1200)+10)return false;
    }
  }
  return true;
})()`),true,'banks do not fold or overlap distant sections, and stay inside the terrain');
assert.equal(test(`(()=>{
  started=true;ais.forEach(a=>a.finished=true);
  function cross(lap){placeAt(player,.0004,0);player.prog=.999;player.lapCheckpoint=physics.LAP_CHECKPOINTS.length;player.lap=lap;player.v=0;player.finished=false;updatePlayer(1/60,10);}
  cross(1);if(player.finished||player.lap!==2)return false;
  cross(2);return player.finished&&player.lap===3;
})()`),true,'race finishes after two laps');
console.log('PASS: Playground scenery, facilities, bank clearance, 110% length and two-lap finish.');
const {run}=require('./balance.test.cjs');
for(let slot=0;slot<3;slot++){
  const race=run({map:'playground',slot});
  assert(race.player>0&&race.ai.every(t=>t>0),'all boats finish');
  assert.equal(race.boostCount,6);
  assert(race.player<race.ai[slot],JSON.stringify({slot,race}));
  console.log('PASS: Playground strongest opponent beatable in slot',slot,JSON.stringify(race));
}
