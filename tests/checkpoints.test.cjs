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


const racer={};
function segment(a,b){return D.advanceLapCheckpoints(racer,a,b);}
assert.equal(segment(.002,.999),false);assert.equal(segment(.999,.002),false);assert.equal(racer.lapCheckpoint,0);
for(let lap=0;lap<3;lap++){
 let finishes=0;for(let i=0;i<1000;i++)if(segment(i/1000,((i+1)%1000)/1000))finishes++;
 assert.equal(finishes,1);assert.equal(racer.lapCheckpoint,0);
}
segment(.16,.17);assert.equal(racer.lapCheckpoint,1);
segment(.49,.51);assert.equal(racer.lapCheckpoint,2);
segment(.51,.49);assert.equal(racer.lapCheckpoint,1);
segment(.84,.82);assert.equal(racer.lapCheckpoint,1);
assert.equal(segment(.999,.001),false,'out-of-order gates cannot finish a lap');
segment(.16,.17);segment(.49,.51);segment(.83,.84);segment(.84,.82);segment(.51,.49);segment(.17,.16);
assert.equal(segment(.999,.001),false,'returning backwards over passed gates revokes credit');
segment(.16,.9);assert.equal(racer.lapCheckpoint,0,'large jumps do not grant gate credit');
assert.equal(test(`(()=>{
 started=true;ais.forEach(a=>a.finished=true);player.lap=1;player.lapCheckpoint=0;player.finished=false;
 function move(previous,next){placeAt(player,next,0);player.prog=previous;player.v=0;updatePlayer(1/60,0);}
 for(let i=0;i<3;i++){move(.001,.999);move(.999,.001);}
 if(player.lap!==1||player.finished)return false;
 for(const gate of physics.LAP_CHECKPOINTS)move(gate-.001,gate+.001);
 move(.999,.001);if(player.lap!==2||player.finished)return false;
 move(.001,.999);move(.999,.001);if(player.lap!==2||player.finished)return false;
 for(const gate of physics.LAP_CHECKPOINTS)move(gate-.001,gate+.001);
 move(.999,.001);return player.finished&&player.lap===3;
})()`),true,'actual player rejects seam farming, allows two validated laps and resets gates each lap');
console.log('PASS: ordered gates, reverse rollback, seam exploit, normal laps and finish.');

assert.equal(test(`(()=>{
 Object.assign(player,{finished:false,lap:1,lapCheckpoint:0,sec:0,secStart:0,secBest:[null,null,null],secLast:null});
 function move(previous,next,time){placeAt(player,next,0);player.prog=previous;player.v=0;raceTime=time;updatePlayer(1/60,time);}
 move(.001,.999,5);move(.999,.001,10);
 if(player.sec!==0||player.secLast!==null||player.secBest.some(Boolean))return false;
 move(.165,.168,20);move(.332,.335,30);
 if(player.sec!==1||player.secBest[0]!==30)return false;
 move(.335,.332,35);move(.332,.335,40);
 if(player.sec!==1||player.secStart!==30||player.secBest[0]!==30)return false;
 move(.499,.501,45);move(.665,.668,60);move(.832,.835,80);move(.999,.001,90);
 return player.lap===2&&player.sec===0&&player.secBest.every(v=>v===30);
})()`),true,'reverse seam and boundary crossings do not award sectors; normal sector times remain valid');
