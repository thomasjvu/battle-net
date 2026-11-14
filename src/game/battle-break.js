// Irregular triangles fracture the view without requiring a framebuffer copy.
export function battleBreak(scene, reveal = false) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return 0;
  const center = {x:660,y:344};
  const rim = [[0,0],[330,0],[783,0],[1280,0],[1280,301],[1280,720],[932,720],[460,720],[0,720],[0,409]];
  const effect = scene.add.container(0,0).setDepth(reveal?16000:30000);
  for (let i=0;i<rim.length;i++) {
    const a = rim[i], b = rim[(i+1)%rim.length];
    const shard = scene.add.graphics();
    const vertices = [center,{x:a[0],y:a[1]},{x:b[0],y:b[1]}];
    shard.fillStyle(i%2?0x081426:0x0b1c30).fillPoints(vertices,true);
    shard.lineStyle(1,i%2?0x8befe6:0x436e86,.7).strokePoints(vertices,true);
    effect.add(shard);
    const dx = (a[0]+b[0])/2-center.x, dy = (a[1]+b[1])/2-center.y;
    if(!reveal)shard.setPosition(dx*.38,dy*.38).setAlpha(0);
    scene.tweens.add({
      targets:shard,x:reveal?dx*.82:0,y:reveal?dy*.82:0,
      alpha:reveal?0:1,duration:reveal?390:270,delay:i*10,ease:reveal?'Cubic.easeIn':'Cubic.easeOut'
    });
  }
  if(reveal)scene.time.delayedCall(490,()=>effect.destroy());
  return 365;
}
