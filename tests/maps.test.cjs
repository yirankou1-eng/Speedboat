const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const D=require('../dynamics.js'),ScreenSplash=require('../screen-splash.js'),Maps=require('../maps.js');
// Execute the real scene and game logic with only the WebGL renderer stubbed.
const THREE=require('../three.min.js');
THREE.WebGLRenderer=class{constructor(){this.domElement={};this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.info={render:{calls:0}};}setSize(){}setPixelRatio(){}getPixelRatio(){return 1;}setRenderTarget(){}render(){}};
THREE.PMREMGenerator=class{fromScene(){return {texture:new THREE.Texture()};}dispose(){}};
const elements=new Map(),element=()=>({style:{},dataset:{},children:[],setAttribute(){},appendChild(child){this.children.push(child);},classList:{add(){},remove(){}},addEventListener(type,fn){this[type]=fn;}});
const document={body:{appendChild(){}},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement(tag){return tag==='canvas'?{getContext:()=>({fillRect(){},strokeRect(){}})}:element();}};
let seed=93461;const math=Object.create(Math);math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const ctx=vm.createContext({THREE,MapCatalog:require('../maps.js'),CityScenery:require('../city.js'),BoatDynamics:D,ScreenSplash,document,window:{},innerWidth:1280,innerHeight:720,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},setTimeout(){},location:{search:'?map=neon-city'},URLSearchParams,performance,console,Math:math});
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],ctx);
function test(code){return vm.runInContext(code,ctx);}

elements.get('map-classic').click();
assert.equal(ctx.location.search,'?map=classic','selection navigates before countdown');
ctx.location.search='?map=neon-city';
elements.get('startBtn').click();elements.get('map-classic').click();
assert.equal(ctx.location.search,'?map=neon-city','selection locks during countdown');
test('countdown=null;');
const classic=Maps.curve(THREE,'classic'),neon=Maps.curve(THREE,'neon-city');
assert(Math.abs(neon.getLength()/classic.getLength()-.8)<1e-10);
assert.equal(Maps.get('unknown').id,'classic');
assert.equal(test('RACE_LAPS'),3);
assert.equal(test('bridges.length+bridgeSites.length+staticScenery.length'),0);
assert.equal(test('ramps.length'),4);assert.equal(test('boosts.length'),3);
assert.equal(test('ramps.every(r=>Math.abs(r.lat)+r.width/2<halfWidthAt(r.t)-4)&&boosts.every(b=>Math.abs(b.lat)+13<halfWidthAt(b.t)-4)'),true);
const widths=test(`(()=>{
 let sum=0,min=80,max=0;
 for(let i=0;i<1200;i++){
  const t=i/1200,w=halfWidthAt(t);sum+=w;min=Math.min(min,w);max=Math.max(max,w);
  const p=curveAt(t),before=tangentAt(t-.001),after=tangentAt(t+.001);
  const turn=Math.abs(Math.atan2(before.x*after.z-before.z*after.x,before.dot(after)));
  if(turn*w/(curveLen*.002)>.95)throw Error('bank folds at a sharp bend');
 }
 return {mean:sum/1200,min,max,start:halfWidthAt(0)};
})()`);
assert(widths.mean>55&&widths.mean<72);assert(widths.start>79&&widths.min>=38-1e-6&&widths.max<=80);
// City footprints stay clear; shells are continuous and contain no launch or boost zones.
assert.equal(test('mtnPeaks.length'),0);
assert.equal(test("!!scene.getObjectByName('island-terrain')||!!scene.getObjectByName('canyon-bank')"),false);
assert(test('city.blocks.length')>250);
assert.equal(test(`city.blocks.every((a,i)=>city.blocks.slice(i+1).every(b=>!CityScenery.overlaps(a,b,0)))`),true,'no overlapping building volumes, including tunnel towers');
assert.equal(test("bloom.color.depthTexture.type===THREE.UnsignedIntType&&reflectionTarget.depthTexture.type===THREE.UnsignedIntType&&camera.near===1"),true,'both depth attachments retain distant occlusion precision');
assert.equal(test("!!scene.getObjectByName('city-bank')"),false,'one city ground surface, no nearly coplanar collar');
assert.equal(test(`(()=>{const shader={fragmentShader:'#include <map_fragment>\\n#include <emissivemap_fragment>'};channelMat.onBeforeCompile(shader);return !shader.fragmentShader.includes('stone')&&!shader.fragmentShader.includes('strata');})()`),true,'track walls never switch to rock strata');

assert.equal(test(`city.blocks.filter(b=>!b.tunnel).every(b=>nearestDistToTrack(b.x,b.z)>80+Math.hypot(b.w,b.d)/2+23)`),true);
assert.equal(test('city.tunnels.length'),2);
assert.equal(test(`city.tunnels.every(s=>s.minClearance>=10&&s.buildingWidth>=5*s.halfWidth&&s.ceilingAt(0)===s.roof&&s.group.getObjectByName('tunnel-ceiling')&&
 ramps.concat(boosts).every(f=>f.t<s.start-.012||f.t>s.end+.012))`),true);
assert(test('city.tunnels[0].length/city.tunnels[1].length')>2.5);
assert.equal(test(`city.tunnels.every(s=>{
 for(let i=1;i<20;i++)if(halfWidthAt(s.start+(s.end-s.start)*i/20)>s.halfWidth+.01)return false;
 return true;
})`),true);
assert.equal(test(`(()=>{
 const s=city.tunnels[0],old={air:player.air,y:player.y,vy:player.vy,x:player.x,z:player.z};
 const p=curveAt((s.start+s.end)/2);player.x=p.x;player.z=p.z;player.air=true;player.y=s.roof+8;player.vy=12;
 const hit=limitTunnelHeight(player,(s.start+s.end)/2),ok=hit&&Math.abs(player.y-s.ceilingAt(3)+4.5)<1e-8&&player.vy<0;
 Object.assign(player,old);return ok;
})()`),true);
assert.equal(test(`(()=>{
 const s=city.tunnels[1],a=ais[0],old={air:a.air,y2:a.y2,vy2:a.vy2,lat:a.lat};
 a.lat=0;a.air=true;a.y2=s.roof+2;a.vy2=15;
 const hit=limitTunnelHeight(a,(s.start+s.end)/2),ok=hit&&a.y2===s.ceilingAt(3)-4.5&&a.vy2<0;
 Object.assign(a,old);return ok;
})()`),true);
console.log('PASS: dense city footprints, two clear continuous tunnels, width and ceiling protection.');
// Wider, briefly bevelled curbs and fast decorative flight, including live boat following.
assert.equal(test(`city.tunnels.every(s=>s.group.children.filter(m=>m.name==='tunnel-curb-top').length===2&&s.group.children.filter(m=>m.name==='tunnel-curb-end').length===4)`),true);
assert.equal(test(`city.tunnels.every(s=>laneLimitAt((s.start+s.end)/2,4)===halfWidthAt((s.start+s.end)/2)-8.5)`),true);
assert.equal(test(`(()=>{
 let low=Infinity,high=-Infinity,outside=false,fast=false,follow=false,dive=false;
 const boats=city.drones.map(d=>({progress:d.anchor,position:curveAt(d.anchor).clone()}));
 for(let tick=0;tick<=3600;tick++){
  const time=tick/30;city.update(time,boats);
  for(const d of city.drones){
   if(d.rotors.length!==4||!d.group.position.toArray().every(Number.isFinite))return false;
   if(city.tunnels.some(s=>d.progress>s.start-.012&&d.progress<s.end+.012))return false;
   const pos=d.group.position;
   if(city.blocks.some(b=>{const dx=pos.x-b.x,dz=pos.z-b.z,c=Math.cos(b.angle),s=Math.sin(b.angle);return pos.y>b.base&&pos.y<b.base+b.height&&Math.abs(dx*c-dz*s)<b.w/2&&Math.abs(dx*s+dz*c)<b.d/2;}))return false;
   outside ||= Math.abs(d.lane)>halfWidthAt(d.progress)+15;
   fast ||= d.velocity.length()>18;follow ||= d.mode==='follow';dive ||= d.mode==='dive';
   low=Math.min(low,d.height);high=Math.max(high,d.height);
  }
 }
 city.update(0);return low>=7&&low<12&&high>50&&outside&&fast&&follow&&dive;
})()`),true);
assert.equal(test(`city.streetlights.length>70&&city.streetlights.every(l=>!city.tunnels.some(s=>l.progress>s.start-.012&&l.progress<s.end+.012))`),true);
assert.equal(test(`city.tunnels.every(s=>s.group.children.filter(m=>m.name==='tunnel-curb-yellow-edge').length===2)`),true);
assert.equal(test(`(()=>{
 const d=city.drones[0],boat={progress:.09,position:curveAt(.09).clone(),speed:30};
 city.update(0,[boat]);d.mode='follow';d.targetIndex=0;d.nextChoice=100;d.progress=.09+34/curveLen;d.lane=7;d.height=11;
 for(let i=1;i<=180;i++){boat.progress=.09+30*(i/60)/curveLen;boat.position.copy(curveAt(boat.progress));boat.position.y+=1.2;city.update(i/60,[boat]);}
 const offset=d.group.position.clone().sub(boat.position),ahead=offset.dot(tangentAt(boat.progress));
 return ahead>24&&ahead<44&&offset.y>7&&offset.y<17;
})()`),true);
assert.equal(test(`city.drones.every(d=>{const lamps=d.group.children.filter(m=>m.name==='drone-status-light');return lamps.length===2&&lamps[0].material===lamps[1].material;})`),true);
assert.equal(test(`city.streetlights.every(l=>l.position.y-l.base>29&&l.direction.y<-.6&&l.target.y<l.position.y-25)`),true);
assert.equal(test(`waterUniforms.uLampGrid.value===city.waterLighting.texture`),true);
assert.equal(test(`!scene.getObjectByName('streetlight-halos')&&scene.children.filter(o=>o.isSpotLight).length===6`),true);
assert.equal(test(`(()=>{
 const g=city.waterLighting,data=g.texture.image.data,before=Array.from(data);
 for(let i=0;i<city.streetlights.length;i++){
  const lamp=city.streetlights[i];
  for(const dx of [-110,0,110])for(const dz of [-110,0,110]){
   const x=Math.floor((lamp.position.x+dx-g.origin.x)/g.cellSize),z=Math.floor((lamp.position.z+dz-g.origin.y)/g.cellSize);
   if(!g.cells[z*g.columns+x].includes(i))return false;
  }
 }
 city.update(5,[{progress:.8,position:curveAt(.8)}]);
 return before.every((v,i)=>v===data[i])&&g.slots<=32;
})()`),true);
console.log('PASS: full-course water lighting coverage remains unchanged when the player moves.');
// Actual seam crossings: lap two continues, the third completed lap finishes.
assert.equal(test(`(()=>{
 started=true;ais.forEach(a=>a.finished=true);
 function cross(lap){
  placeAt(player,.0004,0);player.prog=.999;player.lap=lap;player.v=0;player.finished=false;
  updatePlayer(1/60,10);
 }
 cross(2);if(player.finished||player.lap!==3)return false;
 cross(3);return player.finished&&player.lap===4;
})()`),true);
assert.equal(test(`(()=>{
 player.finished=false;player.prog=.97;player.v=80;
 const p=finishFlag.center,tan=tangentAt(0);
 camera.position.set(p.x-tan.x*180,9,p.z-tan.z*180);camera.lookAt(p);camera.updateMatrixWorld();
 player.lap=2;updateFinishFlag(1,0);if(finishFlag.active)return false;
 player.lap=3;for(let i=0;i<240;i++)updateFinishFlag(1/60,i/60);
 return finishFlag.active&&finishFlag.progress===1.12;
})()`),true);
console.log('PASS: Neon City 80% length, narrower continuous banks, clear facilities, no removed scenery, three-lap finish and final-lap flag.',widths);
const {run}=require('./balance.test.cjs');
for(let slot=0;slot<3;slot++){
 const race=run({map:'neon-city',slot});
 assert(race.player>0&&race.ai.every(t=>t>0),'all boats finish three laps');
 assert(race.player<race.ai[slot],JSON.stringify({slot,race}));
 console.log('PASS: Neon City strongest rival remains beatable in grid slot',slot,JSON.stringify(race));
}
