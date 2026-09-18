const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../dynamics.js');
const ScreenSplash=require('../screen-splash.js');
for(const hz of [20,30,60,120]){
  let y=1.2,v=-5,min=y;
  for(let i=0;i<hz*3;i++){const r=D.spring(y,v,1.2,1/hz);y=r.value;v=r.velocity;min=Math.min(min,y);}
  assert(min<1.0);assert(Math.abs(y-1.2)<.01);
}
for(const hz of [20,30,60,120]){
  const e=D.createWaterEntry(0,-22,0,.5);let min=0,deepTime=0,peakTime=0,previous=0,recovering=false;
  assert.equal(e.velocity,-22,'impact velocity must survive contact');
  for(let i=0;i<hz*5;i++){
    D.stepWaterEntry(e,1/hz);
    if(e.offset<min){min=e.offset;peakTime=e.age;}
    if(e.offset<-1.5)deepTime+=1/hz;
    if(recovering)assert(e.offset>=previous-1e-8,'recovery stays monotonic');
    if(e.velocity>=0)recovering=true;
    assert(e.offset<=0,'no artificial upward rebound');previous=e.offset;
  }
  assert(min<-3.5&&min>-4.2);assert(peakTime>.4&&peakTime<.6);
  assert(deepTime>1.25,'immersion lasts, rather than being a short dip');assert(e.done);
}
for(const speed of [30,52,80])for(const lat of [-68,68])for(const skill of [0,1]){
  const f={t:.8,lat:-lat*.8,kind:'ramp'},a={t:0,lat,curV:speed,skill};let calls=0,decisionDistance=0;
  while(a.t<.8){
    const target=D.chooseRoute(a,[f],1000,1/60,()=>{calls++;decisionDistance=(f.t-a.t)*1000;return .5;});
    a.lat+=Math.max(-16/60,Math.min(16/60,target-a.lat));a.t+=speed/60000;
  }
  assert.equal(calls,1,'one probability roll per encounter');
  assert(skill?Math.abs(a.lat-f.lat)<2:Math.abs(a.lat-f.lat)>10);
  assert(decisionDistance>0);
}
// Execute the real scene and game logic with only the WebGL renderer stubbed.
const THREE=require('../three.min.js');
THREE.WebGLRenderer=class{constructor(){this.domElement={};this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.info={render:{calls:0}};}setSize(){}setPixelRatio(){}getPixelRatio(){return 1;}setRenderTarget(){}render(){}};
THREE.PMREMGenerator=class{fromScene(){return {texture:new THREE.Texture()};}dispose(){}};
const elements=new Map(),element=()=>({style:{},dataset:{},children:[],setAttribute(){},appendChild(child){this.children.push(child);},classList:{add(){},remove(){}},addEventListener(){}});
const document={body:{appendChild(){}},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement(tag){return tag==='canvas'?{getContext:()=>({fillRect(){},strokeRect(){}})}:element();}};
let seed=93461;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const ctx=vm.createContext({THREE,BoatDynamics:D,ScreenSplash,document,window:{},innerWidth:1280,innerHeight:720,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},setTimeout(){},location:{search:''},URLSearchParams,performance,console,Math:math});
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],ctx);
function test(code){return vm.runInContext(code,ctx);}
assert.equal(test('gridStart(-60)>gridStart(-20)&&gridStart(-20)>gridStart(20)&&gridStart(20)>gridStart(60)'),true);
assert(Math.abs(test('(gridStart(-60)-gridStart(60))*curveLen')-12)<1e-8);
assert.deepEqual(Array.from(test('bridges.map(b=>b.openings.length)')),[3,2,3]);
assert.equal(test('scene.getObjectByName("channel-floor").geometry.attributes.position.array.every((x,i)=>i%3!==1||x===CHANNEL_BOTTOM)'),true);
assert.equal(test('ramps.every(r=>Math.abs(r.lat)+r.width/2<HW-4)&&boosts.every(b=>Math.abs(b.lat)+13<HW-4)'),true);
assert.equal(test(`(()=>{
  const g=scene.getObjectByName('channel-floor').geometry;
  return Math.abs(g.attributes.uv.getX(g.attributes.uv.count-1)-curveLen/12)<.001;
})()`),true,'tile scale follows course distance');
assert.equal(test(`bridges.every(b=>{
  b.g.updateMatrixWorld(true);
  return b.g.children.filter(m=>m.name==='bridge-approach').every(m=>{
    const p=m.geometry.attributes.position,n=p.count;
    const endA=new THREE.Vector3().fromBufferAttribute(p,n-4).applyMatrix4(b.g.matrixWorld);
    const endB=new THREE.Vector3().fromBufferAttribute(p,n-3).applyMatrix4(b.g.matrixWorld);
    const ground=Math.max(terH(endA.x,endA.z),terH(endB.x,endB.z));
    return Math.abs(endA.y-ground-.18)<.01 && endA.y<p.getY(0)-5;
  });
})`),true,'all six approaches descend onto their graded ground');
assert.equal(test(`(()=>{
  const g=scene.getObjectByName('island-terrain').geometry,p=g.attributes.position;
  return [...new Set(g.index.array)].every(i=>nearestDistToTrack(p.getX(i),p.getZ(i))>HW+22.9);
})()`),true,'mountain triangles stay outside the retaining walls');
const heave=test(`(()=>{
  const b={mesh:makeBoat(0xffffff),heading:.4,curV:45,air:false};let lo=Infinity,hi=-Infinity;
  for(let i=0;i<360;i++){poseBoat(b,1/60,i/60,10,20,waterH(10,20,i/60),0,0);lo=Math.min(lo,b.mesh.position.y);hi=Math.max(hi,b.mesh.position.y);}
  return hi-lo;
})()`);assert(heave>.5,'visible buoyant motion');
// The player rides the launch face, leaves its lip, dips the bow on landing and settles.
const jump=test(`(()=>{
  started=true;const r=ramps[0];player.x=r.x-r.tan.x*23;player.z=r.z-r.tan.z*23;
  player.prog=r.t-23/curveLen;player.heading=Math.atan2(r.tan.x,r.tan.z);player.v=50;keys.w=true;
  let rose=false,air=false,landed=false,dip=false,maxY=-99,minSink=99,submergedTime=0,impactVelocity=0,entryAge=0,contactSpeedRatio=1;
  for(let i=0;i<420;i++){
    const now=i/60;raceTime=now;const wasAir=player.air;const previousSpeed=player.v;updatePlayer(1/60,now);
    if(wasAir&&!player.air){impactVelocity=player.vy;contactSpeedRatio=player.v/previousSpeed;}
    if(player.waterEntry)entryAge=Math.max(entryAge,player.waterEntry.age);
    rose=rose||!!player.onRamp;air=air||player.air;landed=landed||player.jumpCount>0;
    if(landed&&player.mesh.position.y-waterH(player.x,player.z,now)<-.5)submergedTime+=1/60;
    if(landed){minSink=Math.min(minSink,player.mesh.position.y-waterH(player.x,player.z,now));if(player.pitchSm>.15)dip=true;}maxY=Math.max(maxY,player.y);
    if(![player.x,player.y,player.z,player.mesh.position.y].every(Number.isFinite))throw Error('nonfinite player');
  }
  return {rose,air,landed,dip,maxY,minSink,submergedTime,impactVelocity,entryAge,contactSpeedRatio};
})()`);
assert(jump.minSink<-2 && jump.submergedTime>1.1 && jump.impactVelocity<-18 && jump.entryAge>2,JSON.stringify(jump));
assert(jump.contactSpeedRatio>.97);
assert(jump.rose&&jump.air&&jump.landed&&jump.dip&&jump.maxY>9,JSON.stringify(jump));
// Simulate opponents for two full laps and check continuous lane motion and bridge clearances.
const race=test(`(()=>{
  ais.forEach(a=>{a.skill=1;a.rampSkill=1;a.t=.003;a.lat=a.baseLat;a.finished=false;a.lap=1;a.curV=0;a.route=null;});
  let maxLatStep=0,bridgePasses=0,unsafe=0,boostsHit=0;
  for(let i=0;i<220*60;i++){
    const old=ais.map(a=>({t:a.t,lat:a.lat,speed:a.curV}));
    const leader=ais.reduce((best,a)=>a.t>best.t?a:best);player.lap=leader.lap;player.prog=leader.t%1;
    updateAI(1/60,i/60);
    ais.forEach((a,k)=>{
      maxLatStep=Math.max(maxLatStep,Math.abs(a.lat-old[k].lat));
      if(a.curV-old[k].speed>10)boostsHit++;
      for(const b of bridges){
        if(Math.floor(old[k].t-b.t)<Math.floor(a.t-b.t)){
          bridgePasses++;if(b.pillars.some(c=>Math.abs(a.lat-c)<10))unsafe++;
        }
      }
      if(![a.lat,a.curV,a.mesh.position.y,a.mesh.rotation.x].every(Number.isFinite))throw Error('nonfinite AI');
    });
  }
  return {maxLatStep,bridgePasses,unsafe,boostsHit,jumps:ais.map(a=>a.jumpCount||0),finished:ais.every(a=>a.finished)};
})()`);
assert.equal(race.unsafe,0,JSON.stringify(race));assert.equal(race.bridgePasses,18);assert(race.maxLatStep<2);assert(race.boostsHit>=12);assert(race.jumps.every(n=>n>=5));assert(race.finished);
console.log('PASS: spring at 20–120 Hz; committed AI routing; three bridges; tiled floor; launch and bow-first landing; two AI race laps.');
console.log(JSON.stringify({jump,race}));

// Screen water is bounded, nonpersistent and exclusive to the player's landing event.
test('lensSplash.update(10);registerLanding(ais[0],0,0,24,0)');
assert.equal(test('lensSplash.active'),false);
test('registerLanding(player,0,0,24,0)');
assert.equal(test('lensSplash.active'),true);assert.equal(test('lensSplash.drops.length'),26);
test('lensSplash.update(.25)');assert(test('Number(lensSplash.drops[0].el.style.opacity)')>0);
test('lensSplash.update(3)');assert.equal(test('lensSplash.active'),false);
assert.equal(test('lensSplash.layer.style.display'),'none');
for(let i=0;i<10;i++)test('lensSplash.trigger(25)');
assert.equal(test('lensSplash.layer.children.length'),27);
console.log('PASS: continuous entry velocity, sustained immersion without rebound, player-only screen splash and automatic clear.');

// Hull-edge contact, oblique approach, wrong-way rejection and the high rear face.
assert.equal(test(`(()=>{
 const r=ramps[0],heading=Math.atan2(r.tan.x,r.tan.z);
 const sample=(along,across,angle=0)=>rideRamp({heading:heading+angle},r.x+r.tan.x*along-r.tan.z*across,r.z+r.tan.z*along+r.tan.x*across,52);
 return !!sample(-10,10,.35) && !sample(-10,12) && !sample(-10,0,Math.PI) && !sample(8,0);
})()`),true);
// Finish reveal is gated by lap and visibility, completes once, and retains its flag.
assert.equal(test(`(()=>{
 started=true;player.finished=false;player.prog=.97;player.v=80;
 const p=finishFlag.center,tan=tangentAt(0);
 camera.position.set(p.x-tan.x*180,9,p.z-tan.z*180);camera.lookAt(p);camera.updateMatrixWorld();
 player.lap=1;updateFinishFlag(1,0);if(finishFlag.active)return false;
 player.lap=2;camera.lookAt(camera.position.clone().sub(p.clone().sub(camera.position)));updateFinishFlag(1,0);if(finishFlag.active)return false;
 camera.lookAt(p);updateFinishFlag(.3,0);if(finishFlag.active)return false;
 for(let i=0;i<240;i++)updateFinishFlag(1/60,i/60);
 return finishFlag.active && finishFlag.progress===1.12 && finishFlag.uniforms.uSweep.value===-1;
})()`),true);
console.log('PASS: hull-edge ramp contact, direction gating, lap/visibility-gated finish reveal and settled flag.');
