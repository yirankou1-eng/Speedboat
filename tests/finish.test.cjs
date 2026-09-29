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


assert.equal(test(`(()=>{
 for(let rank=1;rank<=4;rank++){
  [player,...ais].forEach(b=>{b.finished=false;b.finishRank=undefined;b.finishTime=0;});
  for(let i=0;i<rank-1;i++){raceTime=90+i;recordFinish(ais[i]);}
  raceTime=100;recordFinish(player);updateHUD();if(player.finishRank!==rank||$('pos').textContent!=='POS '+rank+' / 4')return false;
  for(let i=rank-1;i<3;i++){raceTime=104+i;recordFinish(ais[i]);ais[i].t=2.09+i*.01;updateHUD();if($('pos').textContent!=='POS '+rank+' / 4')return false;}
  if(raceStandings().indexOf(player)+1!==rank)return false;
  recordFinish(player);if(player.finishTime!==100)return false;
 }
 [player,...ais].forEach(b=>{b.finished=false;b.finishRank=undefined;});
 raceTime=120;recordFinish(player);recordFinish(ais[0]);
 if(player.finishRank!==1||ais[0].finishRank!==2)return false;
 showResults();if(!$('resultRows').innerHTML.includes('RACING'))return false;
 raceTime=125;recordFinish(ais[1]);raceTime=130;recordFinish(ais[2]);updateResults();
 return $('resultRows').innerHTML.includes('+10.0s')&&!$('resultRows').innerHTML.includes('RACING')&&$('resultPlace').textContent==='#1';
})()`),true,'all four finish positions stay fixed; same-frame finishes, actual gaps and board updates');
assert.equal(test(`(()=>{
 const p=curveAt(.002);player.x=p.x;player.z=p.z;player.v=40;player.air=false;player.finished=true;
 for(const heading of [0,.7,Math.PI,4.8]){
  player.heading=heading;const fx=Math.sin(heading),fz=Math.cos(heading);
  camera.position.set(p.x-fx*24,p.y+12,p.z-fz*24);player.cameraWater=p.y;
  for(let i=0;i<240;i++){
   finT=i/60;updateCamera(1/60);camera.updateMatrixWorld();
   const forward=camera.getWorldDirection(new THREE.Vector3());
   if(forward.x*fx+forward.z*fz<.3)return false;
  }
 }
 return true;
})()`),true,'finish camera preserves forward heading throughout lift at all course orientations');
console.log('PASS: finish order, results table and stable camera.');
assert.equal(test(`(()=>{
 const surface=physics.baseWaterHeight(player.x,player.z);
 if(camera.position.y-surface<145)return false;
 ais.forEach((a,i)=>{a.finished=false;a.lap=1;a.t=.2+i*.2;const p=curveAt(a.t);a.px=p.x;a.pz=p.z;});
 toggleRouteMap();if(!routeOpen||!$('routeSvg').innerHTML.includes('FINISH'))return false;
 const before=$('routeMarkers').innerHTML,p=curveAt(.35);ais[0].px=p.x;ais[0].pz=p.z;t+=.2;updateRouteMap();
 if(before===$('routeMarkers').innerHTML||!$('routeLegend').innerHTML.includes('LAP 1/2'))return false;
 raceTime=140;recordFinish(ais[0]);t+=.2;updateRouteMap();
 if(!$('routeLegend').innerHTML.includes('FINISHED #'))return false;
 toggleRouteMap();return !routeOpen&&$('toggleRoute').textContent==='LIVE MAP';
})()`),true,'higher finish view, live positions, finished markers and map/results toggle');
