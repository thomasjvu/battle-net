import Phaser from 'phaser';
import { PATHS, LANDMARK_TRAILS, WORLD_WIDTH, WORLD_HEIGHT, LANDMARKS, distanceToSegment, isWalkable } from '../../dist/world.js';
import { state } from './state.js';

const roadDistance=(x,y)=>Math.min(...PATHS.flatMap(line=>line.slice(1).map((p,i)=>distanceToSegment(x,y,...line[i],...p))));
function random(seed=5127){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function traceRoad(ctx,line,width,phase=0){
  const points=[];
  for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/16);
    for(let j=0;j<n;j++){const t=j/n;points.push({x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,nx:-(b[1]-a[1])/length,ny:(b[0]-a[0])/length});}}
  const last=points.at(-1);points.push({...last,x:line.at(-1)[0],y:line.at(-1)[1]});
  ctx.beginPath();for(let side=0;side<2;side++){const list=side?[...points].reverse():points;for(let i=0;i<list.length;i++){const p=list[i],j=side?points.length-i-1:i;const wobble=Math.sin(j*.72+phase)*3+Math.sin(j*1.61+phase)*2;const r=(width/2+wobble)*(side?-1:1);if(!side&&!i)ctx.moveTo(p.x+p.nx*r,p.y+p.ny*r);else ctx.lineTo(p.x+p.nx*r,p.y+p.ny*r);}}ctx.closePath();
}
function lake(ctx){ctx.beginPath();ctx.moveTo(1620,806);ctx.bezierCurveTo(1730,760,1870,805,2020,806);ctx.bezierCurveTo(2130,815,2100,1000,2110,1115);ctx.bezierCurveTo(2145,1300,2010,1328,1850,1320);ctx.bezierCurveTo(1690,1355,1565,1290,1575,1165);ctx.bezierCurveTo(1555,1010,1550,855,1620,806);ctx.closePath();}
export function buildLandscape(scene){
  const rng=random(),key='world-landscape';
  // One cached ground layer keeps the dense world inexpensive to draw.
  if(scene.textures.exists(key))scene.textures.remove(key);
  const texture=scene.textures.createCanvas(key,WORLD_WIDTH,WORLD_HEIGHT),ctx=texture.getContext();
  const source=id=>scene.textures.get(id).getSourceImage();
  const grass=ctx.createPattern(source('world-grass'),'repeat'),dirt=ctx.createPattern(source('world-path'),'repeat'),detail=ctx.createPattern(source('world-path-base'),'repeat');
  ctx.imageSmoothingEnabled=false;ctx.fillStyle=grass;ctx.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  const forest=ctx.createPattern(source('world-floor'),'repeat');
  for(const t of scene.geo.trees){ctx.save();ctx.beginPath();ctx.ellipse(t.x,t.y+5,95*t.size,46*t.size,0,0,Math.PI*2);ctx.clip();ctx.globalAlpha=.42;ctx.fillStyle=forest;ctx.fillRect(t.x-140,t.y-80,280,160);ctx.restore();}
  // Broad, soft material variation, with the generated grass remaining visible.
  for(let i=0;i<240;i++){const x=rng()*WORLD_WIDTH,y=rng()*WORLD_HEIGHT,r=70+rng()*220;const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,i%3?'rgba(33,68,32,.13)':'rgba(205,198,105,.12)');gradient.addColorStop(1,'rgba(54,90,42,0)');ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);}
  for(const line of PATHS){traceRoad(ctx,line,108);ctx.fillStyle='rgba(98,103,59,.3)';ctx.fill();traceRoad(ctx,line,100);ctx.fillStyle=dirt;ctx.fill();for(const point of [line[0],line.at(-1)]){ctx.beginPath();ctx.arc(point[0],point[1],49,0,Math.PI*2);ctx.fill();}ctx.save();traceRoad(ctx,line,95);ctx.clip();ctx.globalAlpha=.18;ctx.fillStyle=detail;ctx.fillRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);ctx.restore();}
  for(const trail of LANDMARK_TRAILS){traceRoad(ctx,trail.line,trail.kind==='service'?67:42);ctx.globalAlpha=trail.kind==='chest'?.4:.65;ctx.fillStyle=dirt;ctx.fill();ctx.globalAlpha=1;}
  // Clearings around destinations connect the props to the earth.
  for(const p of LANDMARKS.filter(p=>['service','duel','notice','shrine','puzzle'].includes(p.kind))){ctx.save();ctx.globalAlpha=.92;const width=p.kind==='service'?230:140;ctx.drawImage(source('world-dirt-patch'),p.x-width/2,p.y-50,width,100);ctx.restore();}
  // Pebbles and grass at the ragged road edges, using the same material palette.
  for(let i=0;i<4800;i++){const x=rng()*WORLD_WIDTH,y=rng()*WORLD_HEIGHT,d=roadDistance(x,y);if(d<43&&rng()>.72){ctx.fillStyle=i%2?'#a18e64':'#d2c099';ctx.fillRect(x,y,2+rng()*4,1+rng()*2);}else if(d>52&&d<74){ctx.fillStyle=i%2?'#637b43':'#8da35b';ctx.fillRect(x,y,2,4);ctx.fillRect(x-2,y+2,6,2);}}
  // The pond has a bank, reflected shallows, and a deep, irregular shoreline.
  lake(ctx);ctx.fillStyle='#a29970';ctx.fill();ctx.lineWidth=18;ctx.strokeStyle='#647b4d';ctx.stroke();lake(ctx);ctx.fillStyle='#507d86';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#83aaa0';ctx.stroke();
  ctx.save();lake(ctx);ctx.clip();for(let i=0;i<280;i++){const x=1580+rng()*540,y=800+rng()*530;ctx.fillStyle=i%3?'rgba(179,215,194,.22)':'rgba(27,65,80,.22)';ctx.fillRect(x,y,12+rng()*55,2);}ctx.restore();
  texture.refresh();if(scene.textures.exists('world-mini'))scene.textures.remove('world-mini');const mini=scene.textures.createCanvas('world-mini',188,116);const mc=mini.getContext();mc.drawImage(texture.getSourceImage(),0,0,188,116);mc.fillStyle='#3d5a39';for(const t of scene.geo.trees){mc.beginPath();mc.arc(t.x/WORLD_WIDTH*188,t.y/WORLD_HEIGHT*116,2,0,Math.PI*2);mc.fill();}mini.refresh();scene.add.image(0,0,key).setOrigin(0).setDepth(-30);
  // Dappled tree shade is baked under the movable sprites, never over the HUD.
  const shade=scene.add.graphics().setDepth(-4);scene.forestSprites=[];
  for(const t of scene.geo.trees){shade.fillStyle(0x263e2b,.10).fillEllipse(t.x+12,t.y+6,88*t.size,25*t.size);const tree=scene.add.image(t.x,t.y+6,'world-tree').setOrigin(.5,252/256).setScale(t.size*.88).setDepth(t.y);scene.forestSprites.push({sprite:tree,x:t.x,y:t.y,size:t.size});if(t.x>2020&&t.y<950)tree.setTint(0xc4d9c4);else if(t.x>2000&&t.y>1350)tree.setTint(0xc2abbc);}
  scene.scenery=[];
  for(let i=0;i<1800;i++){const x=100+rng()*(WORLD_WIDTH-200),y=160+rng()*(WORLD_HEIGHT-300),d=roadDistance(x,y);if(x>1535&&x<2155&&y>750&&y<1370)continue;if(d<68||!isWalkable(x,y,scene.geo.obstacles,10)||LANDMARKS.some(p=>Math.hypot(p.x-x,p.y-y)<65))continue;const variant=i%9;let image;
    if(variant<3&&scene.textures.exists('world-flowers'))image=scene.add.image(x,y,'world-flowers').setOrigin(.5,.5).setScale(.38+rng()*.13);
    else if(variant<6&&scene.textures.exists('world-bush'))image=scene.add.image(x,y,'world-bush').setOrigin(.5,.5).setScale(.48+rng()*.16);
    else if(variant===6)image=scene.add.image(x,y,'world-rock').setOrigin(.5,.96).setDisplaySize(35+rng()*26,35+rng()*26);
    else if(scene.textures.exists('world-tuft'))image=scene.add.image(x,y,'world-tuft').setOrigin(.5,.5).setScale(.28+rng()*.12);
    if(image)image.setDepth(y-2);
  }
  for(const [x,y,size] of [[1590,865,52],[1700,785,40],[1920,788,35],[2112,935,48],[2125,1180,44],[2015,1330,52],[1755,1335,38],[1565,1200,48]]){
    scene.add.image(x,y,'world-rock').setOrigin(.5,.9).setDisplaySize(size,size).setDepth(y);
    if(scene.textures.exists('world-tuft'))scene.add.image(x+22,y-3,'world-tuft').setDisplaySize(44,44).setDepth(y-1);
  }
  if(scene.textures.exists('world-flowers'))for(const [x,y] of [[272,510],[490,510],[752,555],[974,555],[485,835],[590,900],[1025,885],[1110,895]]){
    const bed=scene.add.ellipse(x,y+2,85,26,0x594d37,.65).setDepth(y-4);
    for(let j=0;j<4;j++)scene.add.image(x-30+j*20,y+(j%2)*5,'world-flowers').setOrigin(.5,.5).setDisplaySize(52,52).setDepth(y+3);
  }
  // Hand-placed village planting beds, fences and warm lamplight give the opening a composed shape.
  const fences=scene.add.graphics();
  for(const [ax,ay,bx,by] of [[250,520,325,520],[435,520,510,520],[755,570,815,570],[905,570,980,570],[280,780,510,780]]){
    const length=Math.hypot(bx-ax,by-ay);for(let d=0;d<length;d+=32){const x=ax+(bx-ax)*d/length,y=ay+(by-ay)*d/length;fences.fillStyle(0x493e2b).fillRect(x-4,y-28,8,31);fences.fillStyle(0xb39a65).fillRect(x-3,y-29,5,28);}
    fences.lineStyle(5,0x8d7651).lineBetween(ax,ay-20,bx,by-20).lineBetween(ax,ay-8,bx,by-8);
  }fences.setDepth(540);
  for(const [x,y] of [[531,585],[1010,570],[545,830],[1115,845]]){const g=scene.add.graphics().setDepth(y);g.fillStyle(0x493f31).fillRect(x-3,y-56,6,56);g.fillStyle(0xc1ab70).fillRect(x-10,y-66,20,17);g.fillStyle(0xffdd96).fillRect(x-6,y-63,12,10);g.fillStyle(0x493f31).fillTriangle(x-15,y-67,x,y-77,x+15,y-67);const glow=scene.add.circle(x,y-57,29,0xffd48d,.12).setDepth(y+1);scene.tweens.add({targets:glow,alpha:.22,scale:1.2,duration:1600,yoyo:true,repeat:-1});}
  scene.water=scene.add.graphics().setDepth(-8);scene.water.lineStyle(2,0xc7e2c4,.3);for(let i=0;i<13;i++)scene.water.lineBetween(1660+i*23,900+(i*79)%300,1680+i*23,900+(i*79)%300);scene.tweens.add({targets:scene.water,x:12,alpha:.3,duration:2400,yoyo:true,repeat:-1});
  scene.nearGlow=scene.add.ellipse(0,0,85,29,0xffdf9b,.08).setStrokeStyle(2,0xe4ca86,.7).setDepth(-1).setVisible(false);
  scene.leafClock=0;
}
export function updateLandscape(scene,time,dt){
  const w=scene.walker;for(const t of scene.forestSprites){const behind=t.y-w.y;const target=(behind>0&&behind<175*t.size&&Math.abs(w.x-t.x)<105*t.size)?0.38:1;t.sprite.alpha+=Math.min(1,dt*10)*(target-t.sprite.alpha);}const nearby=LANDMARKS.find(p=>Math.hypot(p.x-w.x,p.y-w.y)<100);
  scene.nearGlow.setVisible(!!nearby);if(nearby)scene.nearGlow.setPosition(nearby.x,nearby.y+4).setAlpha(.65+Math.sin(time/300)*.2);
  scene.leafClock+=dt;if(!state.save.settings.particles||scene.leafClock<.5)return;scene.leafClock=0;
  const camera=scene.cameras.main;const x=camera.scrollX+Math.random()*1280,y=camera.scrollY+100+Math.random()*500;
  const leaf=(scene.network?scene.add.rectangle(x,y,3,3,0x70dbe8,.5):scene.add.ellipse(x,y,5,2,Math.random()>.5?0xc6ba70:0x93aa66,.6)).setDepth(4000).setAngle(25);
  scene.tweens.add({targets:leaf,x:x+70,y:y+80,angle:180,alpha:0,duration:3800,onComplete:()=>leaf.destroy()});
}
