import {battleBreak} from '../battle-break.js';
import {REGIONS,regionId} from '../../../dist/regions.js';
import {basePosition,DECOR,decorCells,freshBase,HOME_GRID,normalizeBase,placeDecor,removeDecor,validBase} from '../../../dist/home.js';
import {openStudio} from './studio.js';
import {EncounterSteps} from '../../../dist/encounters.js';
import {validateDeck} from '../../../dist/deck.js';
import {Overworld} from '../overworld-scene.js';
import {HDRenderer} from './renderer.js';
import {FloorGrid,FloorWalker,FLOOR_TILE,zoneLandmarks} from '../../../dist/hd-world.js';
import {freshWorld,validWorld} from '../../../dist/world.js';
import {state,audio,persist,announce,CARDS} from '../state.js';
import {C,text,label,button,toast,fullscreen} from '../ui.js';
const clipped=(x,y,w,h,c=9)=>[{x:x+c,y},{x:x+w,y},{x:x+w,y:y+h-c},{x:x+w-c,y:y+h},{x,y:y+h},{x,y:y+c}];
export class HDWorld extends Overworld{
 constructor(){super("Overworld");}
 async create(data){
  if(state.save.pendingReward?.choices){this.scene.start('Rewards');return;}
  this.network=true;state.networkWorld=true;this.error=false;this.save=state.save;this.operator=this.save.operator;this.busy=false;this.saveClock=0;this.loading=true;this.lastPoint=null;this.seated=null;this.reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!validWorld(this.save.world))this.save.world=freshWorld();this.zone=regionId(data?.zone??this.save.fieldZone??'base');this.region=REGIONS[this.zone];
  this.save.fieldZone=this.zone;
  if(this.zone==='town')this.save.fieldHp=300;
  this.landmarks=zoneLandmarks(this.zone);
  this.encounterSteps=new EncounterSteps();
  this.grid=new FloorGrid(this.zone);
  if(this.zone==='base'){this.save.base??=freshBase();normalizeBase(this.save.base);this.carriedDecor=this.save.base.carried;this.grid.setDecor(this.save.base);}
  const stored=this.save.regionPositions?.[this.zone];
  const start=data?.arrival??(Number.isFinite(stored?.x)&&Number.isFinite(stored?.y)?stored:this.region.spawn);
  this.walker=new FloorWalker(start.x,start.y,this.grid);this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');this.cameras.main.setScroll(0,0).setZoom(1);
  this.runtime=new HDRenderer(this,this.grid);this.drawHUD();this.drawLoadingScreen();
  this.keys=this.input.keyboard.addKeys({up:'W',down:'S',left:'A',right:'D',au:'UP',ad:'DOWN',al:'LEFT',ar:'RIGHT',run:'SHIFT'});
  this.input.keyboard.addCapture(['SPACE','UP','DOWN','LEFT','RIGHT']);this.input.keyboard.on('keydown-Y',()=>{if(!this.loading&&!this.error)this.interact();});this.input.keyboard.on('keydown-SPACE',()=>{if(!this.loading&&!this.error)this.interact();});this.input.keyboard.on('keydown-G',()=>{if(!this.loading&&!this.busy)this.grabDecor();});this.input.keyboard.on('keydown-X',()=>{if(!this.busy)this.stowDecor();});this.input.keyboard.on('keydown-B',()=>{if(!this.busy)this.leaveTo('Deck');});this.input.keyboard.on('keydown-M',()=>{if(!this.busy)this.leaveTo('Journey');});this.input.keyboard.on('keydown-Q',()=>{if(!this.busy)this.runtime.rotate(-1);});this.input.keyboard.on('keydown-R',()=>{if(!this.busy){if(this.carriedDecor)this.rotateCarried();else this.runtime.rotate(1);}});this.input.keyboard.on('keydown-F',()=>fullscreen(this));this.input.keyboard.on('keydown-J',()=>{if(!this.busy)this.leaveTo('ForestWorld');});this.input.keyboard.on('keydown-ESC',()=>{if(!this.loading)this.menu();});
  this.input.keyboard.on('keydown-L',()=>{if(!this.loading&&!this.error&&!this.busy){this.runtime.toggleEffects();toast(this,this.runtime.effects?'Lighting effects on.':'Performance mode.');}});
  this.input.on('wheel',(_p,_over,_dx,dy)=>{if(!this.busy)this.runtime.setZoom(-dy*.001);});
  const blur=()=>this.stopWalking();this.game.events.on(Phaser.Core.Events.BLUR,blur);this.events.once('shutdown',()=>{this.savePosition();this.game.events.off(Phaser.Core.Events.BLUR,blur);this.runtime.dispose();audio.setActive(false);});
  this.input.keyboard.on('keydown-H',()=>{if(!this.loading&&!this.error&&!this.busy&&!this.region.safe)this.travelZone({target:'town'});});
  audio.setTrack(this.region.safe?'town':'dungeon');audio.unlock();audio.configure(this.save.settings);audio.setActive(true);
  try{await this.runtime.init();if(this.runtime.disposed)return;this.loading=false;this.hideLoadingScreen();this.showAreaBanner();if(data?.arrival&&!this.reduceMotion)this.cameras.main.fadeIn(260,5,14,24);this.refreshLandmarks();announce(this.region.name+'. WASD or arrows move. Shift runs. Y accesses nearby gates or terminals. Q and R rotate the camera.');}catch(error){if(this.runtime.disposed)return;console.error('3D field failed:',error);this.loadingText.setText('FIELD LINK FAILED');this.loadingHint.setText('OPEN MENU TO RETURN');this.loading=false;this.error=true;}
 }
 drawLoadingScreen(){
  this.loadingRoot=this.add.container(640,360).setDepth(12000).setScrollFactor(0);
  const frame=this.add.graphics(),shape=[{x:-252,y:-74},{x:236,y:-74},{x:252,y:-58},{x:252,y:58},{x:236,y:74},{x:-252,y:74},{x:-252,y:-62}];
  frame.fillStyle(0x030914,.94).fillPoints(shape,true);frame.lineStyle(1,C.edge,.72).strokePoints(shape,true);
  frame.fillStyle(C.rose,.95).fillPoints([{x:-238,y:-67},{x:-176,y:-67},{x:-182,y:-64},{x:-238,y:-64}],true);
  frame.lineStyle(1,C.mint,.28).beginPath().moveTo(-237,60).lineTo(-191,60).lineTo(-185,54).strokePath();
  frame.lineStyle(1,C.edge,.25).beginPath().moveTo(-232,-42).lineTo(232,-42).strokePath();
  const kicker=label(this,-230,-56,'NETBATTLE  /  FIELD LINK',8,C.mint);
  this.loadingText=text(this,0,-17,this.region.name.toUpperCase(),21,C.paper,{fontStyle:'bold',letterSpacing:1.1}).setOrigin(.5);
  this.loadingHint=label(this,0,17,'SYNCHRONIZING WORLD GEOMETRY',8,C.muted,{align:'center'}).setOrigin(.5);
  frame.fillStyle(0x172939).fillRoundedRect(-154,45,308,4,2);
  this.loadingBeam=this.add.rectangle(-154,47,70,2,C.mint).setOrigin(0,.5);
  this.loadingRoot.add([frame,kicker,this.loadingText,this.loadingHint,this.loadingBeam]);
  if(!this.reduceMotion)this.tweens.add({targets:this.loadingBeam,x:154,duration:920,ease:'Sine.easeInOut',yoyo:true,repeat:-1});
 }
 hideLoadingScreen(){
  if(!this.loadingRoot?.active)return;
  this.tweens.killTweensOf(this.loadingBeam);
  if(this.reduceMotion){this.loadingRoot.destroy();return;}
  this.tweens.add({targets:this.loadingRoot,y:344,alpha:0,duration:170,ease:'Cubic.easeIn',onComplete:()=>this.loadingRoot?.destroy()});
 }
 drawHUD(){
  this.hud=this.add.container(0,0).setDepth(10000);
  const add=object=>{this.hud.add(object);return object;};
  const frame=add(this.add.graphics());
  frame.fillStyle(0x020711,.78).fillPoints(clipped(24,24,258,92,12),true);
  frame.fillStyle(0x07111e,.94).fillPoints(clipped(18,18,258,92,12),true);
  frame.lineStyle(1,C.mint,.56).strokePoints(clipped(18,18,258,92,12),true);
  frame.fillStyle(C.rose,.95).fillPoints([{x:39,y:28},{x:94,y:28},{x:88,y:31},{x:39,y:31}],true);
  frame.lineStyle(1,C.mint,.27).beginPath().moveTo(75,43).lineTo(75,91).strokePath();
  add(this.add.image(48,91,this.operator+'-portrait').setOrigin(.5,1).setDisplaySize(43,54));
  add(label(this,89,36,'NAVI / '+this.operator.toUpperCase(),9,C.mint));
  this.hpLabel=add(text(this,89,48,'',16,C.paper,{fontStyle:'bold'}));
  frame.fillStyle(0x243242).fillPoints(clipped(89,75,157,6,2),true);
  this.hpBar=add(this.add.rectangle(89,75,157,6,0x95f3cb).setOrigin(0,0));
  this.goldLabel=add(label(this,89,91,'',10,C.gold));

  frame.fillStyle(0x020711,.78).fillPoints(clipped(1102,28,154,126,10),true);
  frame.fillStyle(0x07111e,.94).fillPoints(clipped(1096,22,154,126,10),true);
  frame.lineStyle(1,C.mint,.52).strokePoints(clipped(1096,22,154,126,10),true);
  frame.fillStyle(C.rose,.94).fillRect(1110,31,3,14);
  add(label(this,1120,32,'LOCAL MAP',8,C.mint));
  frame.lineStyle(1,C.mint,.2).beginPath().moveTo(1110,49).lineTo(1238,49).strokePath();
  this.drawMap();
  this.miniDot=add(this.add.circle(0,0,2.5,0xf5fff7).setStrokeStyle(1,C.rose));
  add(button(this,1236,678,42,36,'☰',()=>this.menu(),{size:19,small:true}));
  this.nearPrompt=add(this.add.container(640,560).setDepth(10002).setVisible(false));
  this.placeGhost=add(this.add.ellipse(0,0,74,42,0x7ee9f5,.13).setStrokeStyle(2,C.mint,.9).setVisible(false));
  this.nearFrame=this.add.graphics();
  this.promptKey=label(this,0,0,'Y',10,C.rose,{fontStyle:'bold'}).setOrigin(.5);
  this.nearLabel=text(this,0,0,'',13,C.paper,{fontStyle:'bold',letterSpacing:.6}).setOrigin(0,.5);
  this.nearPrompt.add([this.nearFrame,this.promptKey,this.nearLabel]);
 }
 showAreaBanner(){
  const arrival=this.add.container(640,112).setDepth(11000);
  const banner=this.add.graphics();
  const shape=[{x:-208,y:-29},{x:208,y:-29},{x:222,y:-15},{x:222,y:18},{x:208,y:29},{x:-208,y:29},{x:-222,y:15},{x:-222,y:-18}];
  banner.fillStyle(0x020711,.88).fillPoints(shape,true);
  banner.lineStyle(1,C.mint,.74).strokePoints(shape,true);
  banner.fillStyle(C.rose,.96).fillPoints([{x:-201,y:-25},{x:-151,y:-25},{x:-157,y:-22},{x:-201,y:-22}],true);
  banner.lineStyle(1,C.mint,.32).beginPath().moveTo(-194,18).lineTo(-150,18).lineTo(-144,14).strokePath();
  const kicker=label(this,0,-12,'NEW FIELD NODE',8,C.mint).setOrigin(.5);
  const area=text(this,0,2,this.region.name.toUpperCase(),20,C.paper,{fontStyle:'bold',letterSpacing:1.6}).setOrigin(.5,0);
  arrival.add([banner,kicker,area]);
  if(!this.reduceMotion){arrival.setAlpha(0).setY(124);this.tweens.add({targets:arrival,alpha:1,y:112,duration:220,ease:'Cubic.easeOut'});}
  this.time.delayedCall(3400,()=>{
   if(!arrival.active)return;
   if(this.reduceMotion){arrival.destroy();return;}
   this.tweens.add({targets:arrival,alpha:0,y:102,duration:300,ease:'Cubic.easeIn',onComplete:()=>arrival.destroy()});
  });
 }
 drawMap(){
  const g=this.add.graphics(),t=FLOOR_TILE;
  const parts=this.region.platforms;
  const left=Math.min(...parts.map(p=>p.x)),top=Math.min(...parts.map(p=>p.z));
  const width=Math.max(...parts.map(p=>p.x+p.w))-left,height=Math.max(...parts.map(p=>p.z+p.h))-top;
  const scale=Math.min(120/width,76/height);
  this.mapPoint=(x,z)=>[1173+(x-left-width/2)*scale,99+(z-top-height/2)*scale];
  for(const key of this.grid.cells){
   const x=(key%this.grid.cols)*t,z=Math.floor(key/this.grid.cols)*t;
   g.fillStyle(this.region.color,.34+Math.min(.48,this.grid.height(x,z)*.09)).fillRect(...this.mapPoint(x,z),t*scale+.25,t*scale+.25);
  }
  for(const p of this.landmarks)g.fillStyle(p.kind==='sealed'?0xfb916f:p.kind==='mission'?0xff9fb9:p.kind==='chest'?0xffdc93:0xe8fff6).fillCircle(...this.mapPoint(p.x,p.y),p.kind==='gate'?3:2);
  this.hud.add(g);
 }
 setNearPrompt(value,key='Y'){
  if(this.nearLabel.text===value&&this.promptKey.text===key)return;
  this.nearLabel.setText(value);
  this.promptKey.setText(key);
  const width=Math.min(300,Math.max(126,this.nearLabel.width+61));
  this.nearFrame.clear();
  this.nearFrame.fillStyle(0x020711,.88).fillPoints(clipped(-width/2+3,-16, width,32,7),true);
  this.nearFrame.fillStyle(0x07111e,.96).fillPoints(clipped(-width/2,-18,width,36,7),true);
  this.nearFrame.lineStyle(1,C.mint,.68).strokePoints(clipped(-width/2,-18,width,36,7),true);
  this.nearFrame.fillStyle(C.rose,.9).fillPoints(clipped(-width/2+6,-12,30,24,4),true);
  this.promptKey.setPosition(-width/2+21,0);
  this.nearLabel.setPosition(-width/2+45,0);
 }
 savePosition(){
  if(!this.walker)return;
  if(!this.save.regionPositions||typeof this.save.regionPositions!=='object'||Array.isArray(this.save.regionPositions))this.save.regionPositions={};
  this.save.regionPositions[this.zone]={x:this.walker.x,y:this.walker.y};
  persist();
 }
 leaveTo(scene){
  if(this.carriedDecor)this.stowDecor(false);
  super.leaveTo(scene);
 }
 interact(){
  if(this.busy||this.loading||this.error)return;
  if(this.carriedDecor){this.placeCarriedDecor();return;}
  if(this.seated){this.seated=null;return;}
  const point=this.findNearbyLandmark();
  if(point?.kind==='decor'){this.grabDecor(point);return;}
  if(point?.kind==='bench'){
   this.stopWalking();
   this.seated=point;
   audio.play('ui');
   return;
  }
  if(point?.kind==='gate'){this.travelZone(point);return;}
  if(point?.kind==='sealed'||point?.kind==='story'){this.dialog(point.name,point.body,'Close',null);return;}
  if(point?.kind==='studio'){openStudio(this);return;}
  super.interact();
 }
 findNearbyLandmark(){
  let closest=null, distance=94;
  const canSit=this.zone==='base'&&this.runtime?.hero?.clips['south-sit'];
  const decorations=this.zone==='base'?this.save.base.placements.map(placement=>{
   const point=basePosition(placement),bench=placement.type==='bench'&&canSit;
   return{...point,rotation:placement.rotation,kind:bench?'bench':'decor',decor:true,type:placement.type,placement,name:bench?'Sit':DECOR[placement.type].name};
  }):[];
  for(const point of [...this.landmarks,...decorations]){const d=Math.hypot(point.x-this.walker.x,point.y-this.walker.y);if(d<distance){closest=point;distance=d;}}
  return closest;
 }
 grabDecor(point=null){
  if(this.zone!=='base'||this.carriedDecor)return false;
  const candidates=this.save.base.placements.map(placement=>({placement,...basePosition(placement)}));
  const target=point?.decor?candidates.find(item=>item.placement===point.placement):candidates.sort((a,b)=>Math.hypot(a.x-this.walker.x,a.y-this.walker.y)-Math.hypot(b.x-this.walker.x,b.y-this.walker.y))[0];
  if(!target||Math.hypot(target.x-this.walker.x,target.y-this.walker.y)>94){toast(this,'Move closer to a decoration.');return false;}
  const {placement}=target;removeDecor(this.save.base,placement.col,placement.row);this.save.base.carried={type:placement.type,rotation:placement.rotation};
  this.carriedDecor=this.save.base.carried;this.grid.setDecor(this.save.base);this.runtime.refreshDecor();this.runtime.setCarriedDecor(this.carriedDecor);persist();audio.play('ui');return true;
 }
 rotateCarried(){
  if(!this.carriedDecor)return;
  this.carriedDecor.rotation=(this.carriedDecor.rotation+1)%4;this.save.base.carried=this.carriedDecor;
  this.runtime.setCarriedDecor(this.carriedDecor);persist();audio.play('ui');
 }
 stowDecor(showToast=true){
  if(!this.carriedDecor)return;
  const id=this.carriedDecor.type;this.save.base.storage[id]=(this.save.base.storage[id]??0)+1;
  this.save.base.carried=null;this.carriedDecor=null;this.runtime.setCarriedDecor(null);persist();audio.play('ui');
  if(showToast)toast(this,DECOR[id].name+' returned to storage.');
 }
 placeCarriedDecor(){
  if(this.zone!=='base'||!this.carriedDecor)return;
  const result=placeDecor(this.save.base,this.carriedPlacement(),this.walker);
  if(!result.ok){toast(this,result.message);return;}
  this.carriedDecor=null;this.grid.setDecor(this.save.base);this.runtime.refreshDecor();this.runtime.setCarriedDecor(null);persist();audio.play('heal');
 }
 carriedPlacement(){
  const dirs={east:[1,0],southeast:[1,1],south:[0,1],southwest:[-1,1],west:[-1,0],northwest:[-1,-1],north:[0,-1],northeast:[1,-1]};
  const [dx,dy]=dirs[this.walker.facing]??[0,1],step=dx&&dy?88:64,d=DECOR[this.carriedDecor.type];
  const width=this.carriedDecor.rotation%2?d.h:d.w,height=this.carriedDecor.rotation%2?d.w:d.h;
  const x=this.walker.x+dx*step,z=this.walker.y+dy*step;
  return{...this.carriedDecor,col:Math.round((x-HOME_GRID.x)/HOME_GRID.size-(width-1)/2),row:Math.round((z-HOME_GRID.y)/HOME_GRID.size-(height-1)/2)};
 }
 travelZone({target,arrival}){
  this.busy=true;
  audio.play('gate');
  this.stopWalking();
  const enter=()=>this.scene.restart({zone:target,arrival:arrival??REGIONS[target].spawn});
  if(this.reduceMotion){enter();return;}
  const source=this.nearPoint;
  if(source&&this.save.settings.particles){
   const p=this.runtime.project(source.x,source.y,.9);
   const ring=this.add.ellipse(p.x,p.y,34,21).setStrokeStyle(2,this.region.color).setDepth(12000);
   this.tweens.add({targets:ring,scale:4.5,alpha:0,duration:245,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()});
  }
  this.cameras.main.fadeOut(240,5,14,24);
  this.time.delayedCall(240,enter);
 }
 startRandomBattle(mission){
  const source=state.walletDeck??this.save;
  if(!validateDeck(source.deck,source.items,CARDS)){
   toast(this,'Equip a complete command folder before fighting.');
   return false;
  }
  this.busy=true;
  this.stopWalking();
  this.savePosition();
  state.wildEncounter=null;
  state.mission=mission;
  state.endless=false;
  announce('Virus detected. Battle start.');
  audio.play('encounter');
  const duration=battleBreak(this);
  if(duration)this.time.delayedCall(duration,()=>this.scene.start('Combat',{shattered:true}));
  else this.scene.start('Combat');
  return true;
 }
 refreshLandmarks(){this.runtime?.refresh(this.save);}
 loot(id,gold,x,z){this.runtime.mark(x,z);const point=this.runtime.project(x,z,2);const icon=this.add.image(point.x,point.y,'card-'+id).setDisplaySize(62,62).setDepth(15000);this.tweens.add({targets:icon,y:point.y-80,alpha:0,duration:1400,onComplete:()=>icon.destroy()});}
 update(time,delta){if(this.loading||this.error||!this.runtime?.ready)return;const dt=Math.min(.05,delta/1000),k=this.keys,w=this.walker,oldX=w.x,oldZ=w.y;this.nearPoint=this.seated?null:this.findNearbyLandmark();
  if(!this.busy&&!this.loading){const dx=(k.right.isDown||k.ar.isDown?1:0)-(k.left.isDown||k.al.isDown?1:0),dy=(k.down.isDown||k.ad.isDown?1:0)-(k.up.isDown||k.au.isDown?1:0);if(dx||dy)this.seated=null;const move=this.runtime.screenMotion(dx,dy);w.update(dt,{...move,run:k.run.isDown});if(w.moving)w.facing=this.runtime.facing(w.x-oldX,w.y-oldZ);}
  if (!this.busy && !this.region.safe && !this.nearPoint) {
   const mission = this.encounterSteps.walk(Math.hypot(w.x-oldX,w.y-oldZ),w.height,this.zone);
   if (mission && this.startRandomBattle(mission)) return;
  }
  this.runtime.update(time/1000,dt);
  const hp=Math.max(1,Math.min(300,this.save.fieldHp??300));
  this.hpBar.scaleX=hp/300;
  this.hpBar.setFillStyle(hp<=75?0xff8b95:0x95f3c7);
  this.hpLabel.setText(hp+' HP');
  this.goldLabel.setText('◈ '+this.save.credits);
  this.miniDot.setPosition(...this.mapPoint(w.x,w.y));
  this.nearPrompt.setVisible(!!(this.nearPoint||this.seated||this.carriedDecor)&&!this.busy);
  if(this.carriedDecor&&!this.busy){
   const p=this.runtime.project(w.x,w.y,2.45);this.setNearPrompt('PLACE   R ROTATE   X STOW','Y');this.nearPrompt.setPosition(p.x,p.y+62);
   const candidate=this.carriedPlacement(),cells=decorCells(candidate);
   const clear=validBase({...this.save.base,placements:[...this.save.base.placements,candidate],carried:null})&&!cells.some(c=>Math.hypot(HOME_GRID.x+c.col*HOME_GRID.size-w.x,HOME_GRID.y+c.row*HOME_GRID.size-w.y)<48);
   const target=basePosition(candidate),projected=this.runtime.project(target.x,target.y,.045);
   this.placeGhost.setPosition(projected.x,projected.y).setFillStyle(clear?C.mint:C.rose,.13).setStrokeStyle(2,clear?C.mint:C.rose,.86).setVisible(true).setScale(1+Math.sin(time*.005)*.04);
  }else this.placeGhost.setVisible(false);
  if(this.seated&&!this.busy){
   const p=this.runtime.project(this.seated.x,this.seated.y,2.08);
   this.setNearPrompt('Stand');this.nearPrompt.setAlpha(1).setScale(1).setPosition(p.x,p.y);
  }
  if(this.nearPoint&&!this.carriedDecor){
   const p=this.runtime.project(this.nearPoint.x,this.nearPoint.y,2.15);
   this.nearPrompt.setPosition(p.x,p.y);
   if(this.nearPoint.name!==this.lastPoint){
    const prompt=this.nearPoint.kind==='bench'?'SIT  ·  G MOVE':this.nearPoint.kind==='decor'?'PICK UP':this.nearPoint.name;
    this.setNearPrompt(prompt,'Y');
    this.tweens.killTweensOf(this.nearPrompt);
    if(!this.reduceMotion){
     this.nearPrompt.setAlpha(.35).setScale(.94);
     this.tweens.add({targets:this.nearPrompt,alpha:1,scale:1,duration:170,ease:'Cubic.easeOut'});
    }
   }
  }
  this.lastPoint=this.busy?null:this.nearPoint?.name;
  this.saveClock+=dt;if(this.saveClock>3){this.saveClock=0;this.savePosition();}
 }
}
