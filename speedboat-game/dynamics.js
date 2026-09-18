/* Shared, renderer-independent boat dynamics and route planning. */
(function(root){
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function waveHeight(x,z,t){
    return .78*Math.sin(x*.045+z*.018+t*1.3)+.42*Math.sin(z*.072-x*.021+t*1.05)+.22*Math.sin((x+z)*.11-t*1.65);
  }
  function spring(value,velocity,target,dt,frequency=6,damping=.7){
    const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
    for(let i=0;i<steps;i++){
      velocity+=((target-value)*frequency*frequency-2*damping*frequency*velocity)*h;
      value+=velocity*h;
    }
    return {value,velocity};
  }
  function createWaterEntry(height,velocity,surface,pitch=0){
    return {offset:height-surface,velocity,age:0,omega:Math.max(2.05,Math.abs(velocity)/10.5),
      pitch:clamp(pitch,-.48,.52),height,justEntered:true,done:false};
  }
  function stepWaterEntry(entry,dt){
    // Exact critically damped buoyancy solution. Position AND velocity survive contact.
    // No sinusoidal depth animation, sign reversal, or spring overshoot above the waterline.
    const w=entry.omega,c=entry.velocity+w*entry.offset,decay=Math.exp(-w*dt);
    entry.offset=(entry.offset+c*dt)*decay;
    entry.velocity=(entry.velocity-w*c*dt)*decay;
    entry.age+=dt;
    entry.done=entry.age>1 && Math.abs(entry.offset)<.025 && Math.abs(entry.velocity)<.06;
    return entry;
  }
  function featureDistance(progress,feature,length){return ((feature.t-progress)%1+1)%1*length;}
  function chooseRoute(a,features,length,dt,random=Math.random){
    // Commit to one encounter. Release only after physically passing it, never reroll each frame.
    if(a.route){
      a.route.remaining-=(a.curV||0)*dt;
      if(a.route.remaining < -24)a.route=null;
    }
    if(!a.route){
      const next=features.map(f=>({f,d:featureDistance(a.t%1,f,length)})).sort((a,b)=>a.d-b.d)[0];
      if(next){
        const f=next.f;
        const target=f.kind==='bridge'?f.openings.reduce((b,x)=>Math.abs(x-a.lat)<Math.abs(b-a.lat)?x:b):f.lat;
        const lateralTime=Math.abs(target-a.lat)/16;
        const lead=Math.max(105,Math.max(24,a.curV)*(lateralTime+2.8)+25);
        if(next.d<lead){
          const chance=f.kind==='ramp'?(a.rampSkill===undefined?a.skill:a.rampSkill):a.skill;
          const go=f.kind==='bridge'||random()<chance;
          let lane=target;
          if(!go){
            const clearance=f.kind==='ramp'?18:20;
            const choices=[target-clearance,target+clearance].filter(x=>x>=-68&&x<=68);
            const nextFeature=features.filter(candidate=>candidate!==f&&candidate.kind!=='ramp').sort((x,y)=>featureDistance(f.t,x,length)-featureDistance(f.t,y,length))[0];
            const preferred=a.skill>=.85&&nextFeature&&nextFeature.kind==='boost'?nextFeature.lat:a.lat;
            lane=Math.abs(a.lat-target)>=clearance?a.lat:choices.reduce((best,x)=>Math.abs(x-preferred)<Math.abs(best-preferred)?x:best);
          }
          a.route={feature:f,lane,go,remaining:next.d};
        }
      }
    }
    return a.route?a.route.lane:a.lat;
  }
  function rampSample(r,x,z){
    const dx=x-r.x,dz=z-r.z;
    const along=dx*r.tan.x+dz*r.tan.z,across=-dx*r.tan.z+dz*r.tan.x;
    const inside=Math.abs(across)<r.width/2+1.6 && along>=-r.length/2-5 && along<=r.length/2+6;
    return {along,across,inside,height:clamp((along+r.length/2)/r.length,0,1)*(r.height-.15)+.15};
  }
  const api={waveHeight,spring,createWaterEntry,stepWaterEntry,chooseRoute,rampSample,featureDistance};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BoatDynamics=api;
})(typeof window!=='undefined'?window:globalThis);
