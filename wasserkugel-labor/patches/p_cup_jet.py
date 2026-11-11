p='/home/claude/orb/index.html'; s=open(p).read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt, (s.count(a),a[:70]); s=s.replace(a,b)
rep("const a=matOf(S.pour.name),Rj=2.4,v=2.5,","const a=matOf(S.pour.name),Rj=1.5,v=3.0,")
rep("vort:.3,turb:.02,wt:.1,","vort:.3,turb:.02,wt:.05,")
rep("v4([C0[0]+S.cupR*.12,C0[2]-S.cupR*.05,.75,pj?1:0]);","v4([C0[0]+S.cupR*.12,C0[2]-S.cupR*.05,.6,pj?1:0]);")
open(p,'w').write(s); print('patched cup')
