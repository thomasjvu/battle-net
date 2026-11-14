import {state} from './state.js';

// One short layered effect per strike. Existing particle and shake settings apply.
export function impact(scene,x,y,color,power=1){
  if(!state.save.settings.particles)return;
  const ring=scene.add.ellipse(x,y,34,24).setStrokeStyle(2,color).setDepth(90).setBlendMode(1);
  const core=scene.add.star(x,y,4,4,18,color,.88).setDepth(91).setBlendMode(1);
  const sparks=scene.add.particles(x,y,'mote',{
    speed:{min:85,max:245*power},angle:{min:0,max:360},lifespan:{min:125,max:380},
    scale:{start:.46,end:0},tint:color,emitting:false,blendMode:1
  }).setDepth(89);
  sparks.explode(Math.floor(14*power));
  scene.tweens.add({targets:ring,scale:2.7*power,alpha:0,duration:240,ease:'Quad.Out',onComplete:()=>ring.destroy()});
  scene.tweens.add({targets:core,scale:.2,alpha:0,angle:45,duration:120,onComplete:()=>core.destroy()});
  scene.time.delayedCall(420,()=>sparks.destroy());
}
