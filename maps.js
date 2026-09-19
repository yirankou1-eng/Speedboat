/* Map geometry is shared by the playable course and its selection preview. */
(function(root){
  const maps=[
    {id:'classic',name:'Classic',laps:2,night:false,scenery:true,channel:{}},
    {id:'neon-city',name:'Neon City',laps:3,night:true,scenery:false,tunnels:[{id:'long',start:.30,end:.39,halfWidth:43},{id:'short',start:.78,end:.815,halfWidth:38}],channel:{wide:72,narrowA:25,narrowB:32,startFlare:8}}
  ];
  function get(id){return maps.find(m=>m.id===id)||maps[0];}
  function curve(THREE,id){
    const neon=get(id).id==='neon-city',pts=[];
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2;
      const r=700*(neon?1+.23*Math.cos(3*a+.4)+.06*Math.sin(2*a):1+.16*Math.sin(2*a+1.3)+.09*Math.sin(5*a+4.1)+.05*Math.cos(3*a));
      pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));
    }
    let result=new THREE.CatmullRomCurve3(pts,true,'catmullrom',.6);
    if(neon){
      const scale=curve(THREE,'classic').getLength()*.8/result.getLength();
      pts.forEach(p=>p.multiplyScalar(scale));
      result=new THREE.CatmullRomCurve3(pts,true,'catmullrom',.6);
    }
    return result;
  }
  function channel(THREE,id){
    const map=get(id),c=curve(THREE,id);
    const angle=t=>{const p=c.getPointAt(t);return (Math.atan2(p.z,p.x)+Math.PI*2)%(Math.PI*2);};
    return {...map.channel,tunnels:(map.tunnels||[]).map(t=>({start:angle(t.start),end:angle(t.end),width:t.halfWidth,blend:.10}))};
  }
  const api={maps,get,curve,channel};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MapCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
