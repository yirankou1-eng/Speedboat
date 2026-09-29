const assert=require('node:assert/strict'),D=require('../dynamics.js');
function boat(){return {x:0,z:0,vx:0,vz:50,heading:0,yaw:0,radius:2.6,halfLength:4.8,mass:1,inertia:28};}
function ring(x=0,z=9){return {x,z,vx:0,vz:0,radius:8.8,mass:.11};}
{
 const b=boat(),r=ring(),before=b.vz;
 assert(D.hitFloat(b,r)>0);assert(b.vz<before&&b.vz>before*.85);assert(r.vz>35);
 assert(Math.abs(b.vz+r.mass*r.vz-before)<1e-10,'equal and opposite linear impulse');
 assert.equal(b.yaw,0,'centred hit does not turn the boat');
 assert.equal(D.hitFloat(b,r),0,'separating contacts cannot inject a second impulse');
}
{
 const left=boat(),right=boat(),a=ring(-3,8),b=ring(3,8);
 D.hitFloat(left,a);D.hitFloat(right,b);
 assert(left.yaw*right.yaw<0&&Math.abs(left.yaw)<.6,'off-centre hits turn gently in opposite directions');
 assert(Math.abs(left.vx+a.mass*a.vx)<1e-10);
 const stationary=boat();stationary.vz=0;const resting=ring(2,2);
 D.hitFloat(stationary,resting);assert.equal(resting.vx,0);assert.equal(resting.vz,0);
}
const distances=[];
for(const hz of [20,60,120]){
 const r=ring();r.vx=24;r.vz=16;let last=Math.hypot(r.vx,r.vz);
 for(let i=0;i<12*hz;i++){D.stepFloat(r,1/hz);const speed=Math.hypot(r.vx,r.vz);assert(speed<=last);last=speed;}
 assert.equal(last,0);assert(r.x>25&&r.x<30);distances.push(r.x);
}
assert(Math.max(...distances)-Math.min(...distances)<.01,'inertial drift is stable across frame rates');
console.log('PASS: light-body impulse, momentum, gentle angular response, no resting energy and frame-independent stopping.');
