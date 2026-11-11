p='/home/claude/orb/index.html'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt, (s.count(a),a[:70]); s=s.replace(a,b)
# Spritze: Milch als langsamer Strahl in die schwerelose Kugel (statt Kugel-Beschuss mit Pfannkuchen-Effekt)
rep("  S.teaInCup=S.mode===1?","""  for(const J of (S.mode===0&&!S.paused?S.injs:[])){J.left--;const a=matOf(J.name),Rj=1.7,v=J.v||0.9,nsub=Math.max(1,Math.round(T.sub*(S.subMul||1)));
    const d=nrm(J.dir),u=nrm(crs(d,Math.abs(d[1])<.9?[0,1,0]:[1,0,0])),w=crs(d,u);J.acc=(J.acc||0)+v*S.dt*nsub;const R0=(S.orbR||8)+0.3;let i=0;const sp=SP;const cxyz=[];
    while(J.acc>=sp){J.acc-=sp;const off=R0+J.acc;const o=(J.ph=(J.ph||0)+1)%2*sp*.5;
      for(let x=-Rj;x<=Rj;x+=sp)for(let z=-Rj;z<=Rj;z+=sp){const X=x+o,Z=z+o;if(X*X+Z*Z>Rj*Rj)continue;
        const P=[C0[0]+d[0]*off+u[0]*X+w[0]*Z,C0[1]+d[1]*off+u[1]*X+w[1]*Z,C0[2]+d[2]*off+u[2]*X+w[2]*Z];put(i++,P[0],P[1],P[2],-d[0]*v,-d[1]*v,-d[2]*v,a.k,a.milk,a.tea,0,a.m,0);}}
    if(i){const k=flush(i);if(TKIND[J.name])emitT(k*TQ,()=>{const an=rnd()*6.2832,rr=Rj*Math.sqrt(rnd()),t=R0+rnd()*(v*S.dt*nsub+sp);return [C0[0]+d[0]*t+(u[0]*Math.cos(an)+w[0]*Math.sin(an))*rr,C0[1]+d[1]*t+(u[1]*Math.cos(an)+w[1]*Math.sin(an))*rr,C0[2]+d[2]*t+(u[2]*Math.cos(an)+w[2]*Math.sin(an))*rr];},TKIND[J.name]);}
    if(S.N>=MAXP)J.left=0;}
  S.injs=S.injs.filter(J=>J.left>0);
  S.teaInCup=S.mode===1?""")
rep("S.queue.push({t:8,f:()=>shootBall('milk',.11,[-.6,.75,.45],1.25)});S.queue.push({t:150,f:()=>shootBall('milk',.07,[.7,-.3,.6],1.4)});",
    "S.queue.push({t:6,f:()=>{S.injs.push({name:'milk',left:200,dir:[-.6,.75,.45],v:.9});}});")
rep("S.queue.push({t:6,f:()=>shootBall('oil',.14,[.5,.7,-.5],1.5)});","S.queue.push({t:6,f:()=>{S.injs.push({name:'oil',left:200,dir:[.5,.7,-.5],v:.9});}});")
rep("S.mode=m;S.NT=0;","S.mode=m;S.injs=[];S.NT=0;")
# Oberflächenspannung als begrenzter Zug (negativer Druck) in der Schwerelos-Kugel
rep("if(m===0){Object.assign(S,{dt:.22,milkM:1.06,k:60,coh:.0,","if(m===0){Object.assign(S,{dt:.22,milkM:1.06,k:60,coh:.12,")
rep("mk(sp,{milk:'Milch',tea:'Tee',water:'Wasser',oil:'Öl'}[n],()=>{shootBall(n,.07,dirs[di++%dirs.length],1.3);if(n==='oil'&&S.demix<.3)S.demix=.5;},MAT[n].col);",
    "mk(sp,{milk:'Milch',tea:'Tee',water:'Wasser',oil:'Öl'}[n],()=>{S.injs.push({name:n,left:120,dir:dirs[di++%dirs.length],v:.9});if(n==='oil'&&S.demix<.3)S.demix=.5;},MAT[n].col);")
rep("mk(ac,'Alle gleichzeitig',()=>{['milk','tea','water','oil'].forEach((n,i)=>shootBall(n,.05,dirs[(di+i)%dirs.length],1.2));di+=4;S.demix=Math.max(S.demix,.4);});",
    "mk(ac,'Alle gleichzeitig',()=>{['milk','tea','water','oil'].forEach((n,i)=>S.injs.push({name:n,left:110,dir:dirs[(di+i)%dirs.length],v:.9}));di+=4;S.demix=Math.max(S.demix,.4);});")
open(p,'w').write(s); print('patched')
s=open(p).read()
a="  let w = 0.25 * RU.ex6.x * RU.sig.x * RU.cen.w * RU.cen.w / (dp * dp);"
assert a in s
s=s.replace(a,"  let w = select(1.0, 0.15, t.w > 1.5) * 0.25 * RU.ex6.x * RU.sig.x * RU.cen.w * RU.cen.w / (dp * dp);")
open(p,'w').write(s); print('oil translucent')
