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

assert.equal(test('confettiSites.length'),2);
assert.equal(test(`confettiSites.every(s=>s.cannons.length===2&&halfWidthAt(s.t)<51&&s.cannons.every(c=>Math.abs(c.direction.y-Math.cos(Math.PI/3))<1e-9))`),true);
assert.equal(test(`(()=>{
 const s=confettiSites[0];
 function move(site,along){player.x=site.center.x+site.tan.x*along;player.z=site.center.z+site.tan.z*along;updateConfetti(.016);}
 player.lap=1;move(s,-65);if(s.bursts!==0)return false;
 started=true;move(s,-75);if(s.bursts!==0)return false;
 move(s,-65);if(s.bursts!==1||confettiPieces.length!==160||confettiScreen.style.display!=='none')return false;
 move(s,-20);if(s.screenLap!==0)return false;
 // A slow player can reach the line after the world particles have expired.
 for(let i=0;i<320;i++)updateConfetti(1/60);
 move(s,-7);if(s.screenLap!==1||confettiScreen.style.display!=='block'||confettiMesh.visible)return false;
 for(let i=0;i<160;i++)updateConfetti(1/60);
 for(let i=0;i<10;i++){move(s,-65);move(s,-7);}
 if(s.bursts!==1||confettiScreen.style.display!=='none')return false;
 player.lap=2;move(s,-65);if(s.bursts!==2||s.screenLap!==1)return false;
 move(s,-7);if(s.screenLap!==2||confettiScreen.style.display!=='block')return false;
 const other=confettiSites[1];move(other,-65);if(other.bursts!==1||other.screenLap!==0)return false;
 move(other,-7);if(other.screenLap!==2)return false;
 player.finished=true;player.lap=3;move(other,-65);move(other,-7);if(other.bursts!==1||other.screenLap!==2)return false;
 for(let i=0;i<320;i++)updateConfetti(1/60);
 return !confettiMesh.visible&&confettiScreen.style.display==='none'&&confettiPieces.every(p=>p.p.toArray().every(Number.isFinite));
})()`),true,'early launch, delayed screen, independent lifetimes, once per lap, next lap and cleanup');
console.log('PASS: Playground confetti cannons and per-lap effects.',test('confettiSites.map(s=>({progress:s.t,width:halfWidthAt(s.t)*2}))'));
