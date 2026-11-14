import {commandSidebar} from './custom-screen.js';
import {duelRecord,recordDuel} from './duel-record.js';
import{CUSTOM_SECONDS}from'../../dist/network-battle.js';
import{impact}from'./impact.js';
import Phaser from'phaser';import{Duel,DUEL_PRESETS}from'../../dist/duel.js';import{state,audio,announce,CARDS,OPERATORS}from'./state.js';import{CARD_COST}from'../../dist/deck.js';import{W,H,C,text,label,panel,button,background,heading,modal,toast,transition,startFade}from'./ui.js';
const P=(col,row)=>({x:366+col*127+row*20,y:282+row*64});
const presetNames={balanced:'Wayfarer',frost:'Frozen Tempest',garden:'Briar Garden',blade:'Scarlet Blade'};
export class DuelLobby extends Phaser.Scene{
 constructor(){super('DuelLobby');this.presets=['balanced','frost'];this.operators=['pulse','nova'];}
 create(){this.draw();startFade(this);this.input.keyboard.on('keydown-ESC',()=>this.scene.start('Overworld'));}
 draw(){this.children.removeAll(true);background(this,{dim:.56});heading(this,'Duel Pavilion','Local versus','Overworld');const keys=Object.keys(DUEL_PRESETS),heroes=Object.keys(OPERATORS);for(let i=0;i<2;i++){const x=i?925:355;panel(this,x-250,130,500,440,{edge:i?C.rose:C.mint});this.add.image(x-125,416,this.operators[i]+'-portrait').setOrigin(.5,1).setDisplaySize(180,225);label(this,x,157,'PLAYER '+(i+1),17,i?C.rose:C.mint).setOrigin(.5);text(this,x+90,220,OPERATORS[this.operators[i]].name,34,C.paper).setOrigin(.5);button(this,x+90,273,210,35,'Next Navi',()=>{this.operators[i]=heroes[(heroes.indexOf(this.operators[i])+1)%heroes.length];this.draw();},{size:16,small:true});text(this,x+80,328,presetNames[this.presets[i]],25,C.gold,{align:'center'}).setOrigin(.5);button(this,x+90,374,210,35,'Next preset',()=>{this.presets[i]=keys[(keys.indexOf(this.presets[i])+1)%keys.length];this.draw();},{size:16,small:true});text(this,x-215,436,'30 commands · Equal equipment',14,C.muted,{wordWrap:{width:430},lineSpacing:4});label(this,x,540,i?'ARROWS · MOVE   ENTER · BUSTER   / · COMMAND':'WASD · MOVE   SPACE · BUSTER   Z · COMMAND',10,C.paper).setOrigin(.5);}
const record=duelRecord();
const leader=record.p1===record.p2?'TIED':record.p1>record.p2?'P1 LEADS':'P2 LEADS';
panel(this,65,574,1150,66,{fill:0x07111e,edge:C.edge,alpha:.92});
label(this,91,588,'LOCAL RANKING  //  '+leader,9,C.mint);
const stats=[['PLAYER 01',record.p1,C.mint],['PLAYER 02',record.p2,C.rose],['PRACTICE',`${record.practiceWins}W · ${record.practiceLosses}L`,C.gold]];
stats.forEach(([name,value,color],i)=>{const x=300+i*360;label(this,x,588,name,9,color).setOrigin(.5);text(this,x,606,String(value),20,C.paper,{fontStyle:'bold'}).setOrigin(.5);});
label(this,1165,588,`DRAWS  ${record.draws+record.practiceDraws}`,9,C.muted).setOrigin(1,0);
button(this,402,663,380,45,'TWO-PLAYER DUEL',()=>this.start(false),{primary:true,size:21});button(this,884,663,380,45,'PRACTICE AGAINST A RIVAL',()=>this.start(true),{size:19});}
 start(bot){state.duelOptions={decks:this.presets.map(p=>[...DUEL_PRESETS[p]]),operators:[...this.operators],seed:Date.now(),bot};transition(this,'DuelCombat');}
}
export class DuelCombat extends Phaser.Scene{
 constructor(){super('DuelCombat');}
 create(){this.duel=new Duel({...state.duelOptions,custom:true});this.ended=false;this.customLayer=null;this.privatePicker=null;this.signature='';this.poses=[0,0];this.touch={dx:0,dy:0,fire:false};background(this,{dim:.36});this.tiles=this.add.graphics();this.bars=this.add.graphics();this.spellGraphics=this.add.graphics();this.avatars=this.duel.fighters.map((f,i)=>this.add.sprite(0,0,f.operator+'-idle').setOrigin(.5,120/128).setDisplaySize(150,150).setDepth(12));this.projectiles=new Map();this.handLayer=this.add.container(0,0);this.hpLabels=[text(this,65,55,'400 / 400',30,C.paper),text(this,1215,55,'400 / 400',30,C.paper).setOrigin(1,0)];label(this,66,27,'P1 · '+OPERATORS[this.duel.fighters[0].operator].name.toUpperCase(),13,C.mint);label(this,1215,27,(this.duel.bot?'PRACTICE RIVAL':'P2')+' · '+OPERATORS[this.duel.fighters[1].operator].name.toUpperCase(),13,C.rose).setOrigin(1,0);this.timer=label(this,640,44,'FRIENDLY DUEL',17,C.gold).setOrigin(.5);this.notice=text(this,640,140,'',27,C.paper,{stroke:'#251e2f',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(100);this.focusLabels=[label(this,280,520,'',13,C.mint).setOrigin(.5),label(this,1000,520,'',13,C.rose).setOrigin(.5)];button(this,1192,121,135,33,'Resolve P2',()=>this.resolve(1),{small:true,size:16});button(this,125,474,185,33,'Resolve P1 [Y]',()=>this.resolve(0),{small:true,size:15});button(this,1155,474,185,33,'Right Shift',()=>this.resolve(1),{small:true,size:15});label(this,280,555,'P1 · Z: CMD',11,C.mint).setOrigin(.5);label(this,1000,555,this.duel.bot?'RIVAL':'P2 · /: CMD',11,C.rose).setOrigin(.5);label(this,640,703,'400 HEALTH EACH · STANDARD EQUIPMENT · NO CAMPAIGN OR WALLET REWARDS',10,C.muted).setOrigin(.5);this.keys=this.input.keyboard.addKeys({w:'W',a:'A',s:'S',d:'D',up:'UP',down:'DOWN',left:'LEFT',right:'RIGHT',fire0:'SPACE',fire1:'ENTER'});this.input.keyboard.on('keydown',e=>{if(e.key==='Escape'){this.scene.start('DuelLobby');return;}if(e.repeat)return;const n='12345'.indexOf(e.key),m='7890-'.indexOf(e.key);if(n>=0)this.play(0,n);if(m>=0&&!this.duel.bot)this.play(1,m);if(e.key==='z')this.play(0,0);if(e.key==='/')this.play(1,0);if(e.key==='c')this.customKey(0);if(e.key==='.'&&!this.duel.bot)this.customKey(1);if(e.key.toLowerCase()==='y')this.resolve(0);if(e.code==='ShiftRight'&&!this.duel.bot)this.resolve(1);});this.input.keyboard.addCapture(['SPACE','ENTER','UP','DOWN','LEFT','RIGHT']);this.events.once('shutdown',()=>audio.setActive(false));this.refreshHands();this.sync();startFade(this);this.countdown=text(this,640,315,'3',90,C.gold,{fontStyle:'bold',stroke:'#251e2f',strokeThickness:7}).setOrigin(.5).setDepth(100);let n=3;this.time.addEvent({delay:650,repeat:2,callback:()=>{n--;if(n>0)this.countdown.setText(String(n));else{this.countdown.destroy();this.duel.start();audio.setTrack("pvp");audio.unlock();audio.setActive(true);announce('Duel begins. Custom opens automatically. Player one sends with C and executes with Z. Player two sends with period and executes with slash.');}}});}
 customKey(player){
  if(this.duel.selecting){
   if(this.privatePicker!==player)return;
   this.duel.send(player);
   this.privatePicker=null;
  }
  else return;
  this.showCustom();
 }
 showCustom(){
  this.customLayer?.destroy();this.customLayer=null;
  if(!this.duel.selecting)return;
  const root=this.customLayer=this.add.container().setDepth(900);
  const player=this.duel.selectionReady.findIndex(ready=>!ready);
  if(this.privatePicker!==player){
   root.add(this.add.rectangle(640,360,1280,720,0x040c19,.96).setInteractive());
   root.add(text(this,640,55,'DUEL CUSTOM',38,C.paper,{fontStyle:'bold'}).setOrigin(.5));
   root.add(text(this,640,295,'Pass the screen to Player '+(player+1),30,C.paper).setOrigin(.5));
   root.add(label(this,640,353,'LOOK AWAY UNTIL YOUR TURN',13,C.muted).setOrigin(.5));
   root.add(button(this,640,423,260,48,'Reveal my commands',()=>{
    this.privatePicker=player;
    this.showCustom();
   },{primary:true}));
   return;
  }
  commandSidebar(this,root,this.duel.fighters[player].cards,{
   title:'P'+(player+1)+' CUSTOM',keys:player?'7890-':'12345',
   sendLabel:player?'Send [.]':'Send [C]',
   select:slot=>this.play(player,slot),send:()=>this.customKey(player)
  });
 }
 play(player,slot){
  if(this.duel.selecting){if(this.privatePicker===player&&!this.duel.selectionReady[player]){this.duel.fighters[player].cards.select(slot);this.showCustom();}return;}
if(player===1&&this.duel.bot)return;this.duel.useCard(player,slot);this.process();this.refreshHands();}
 resolve(player){if(player===1&&this.duel.bot)return;this.duel.resolve(player);this.process();}
 refreshHands(){
  this.handLayer.removeAll(true);
  this.handViews=[[],[]];
  this.signature=this.duel.fighters.map(f=>f.cards.queue.length).join('|');
  this.duel.fighters.forEach((fighter,player)=>{
   const x=player?1000:280;
   const count=fighter.cards.queue.length;
   this.handLayer.add(label(this,x,619,count+' LOADED',15,player?C.rose:C.mint).setOrigin(.5));
   if(!this.duel.bot||player===0){
    this.handLayer.add(button(this,x,663,196,38,player?'Execute [/]':'Execute [Z]',()=>this.play(player,0),{disabled:count===0}));
   }
  });
 }
 sync(){const fs=this.duel.fighters;this.tiles.clear();for(let y=0;y<3;y++)for(let x=0;x<6;x++){const p=P(x,y),pts=[{x:p.x-57,y:p.y-22},{x:p.x+65,y:p.y-22},{x:p.x+82,y:p.y+20},{x:p.x-40,y:p.y+20}];this.tiles.fillStyle(x<3?0x245990:0x8d3453,.9).fillPoints(pts,true);this.tiles.lineStyle(2,x<3?0x7de0ff:0xff98ae,.8).strokePoints(pts,true);}this.bars.clear();const progress=this.duel.roundTime/CUSTOM_SECONDS;this.bars.fillStyle(0x182b42).fillRoundedRect(475,77,330,9,4);if(progress>0)this.bars.fillStyle(C.gold).fillRoundedRect(475,77,330*progress,9,4);fs.forEach((f,i)=>{const col=i?5-f.p.x:f.p.x,p=P(col,f.p.y),sprite=this.avatars[i];sprite.setPosition(p.x,p.y+4).setDepth(10+f.p.y).setTexture(f.operator+(this.poses[i]>this.time.now?'-attack':'-idle')).setFlipX(i?f.operator!=='nova':f.operator==='nova').setAlpha(f.p.inv>0?.6:1);if(f.frozenUntil>f.time)sprite.setTint(0x9acbdc);else sprite.clearTint();this.hpLabels[i].setText(f.p.hp+' / 400');this.bars.fillStyle(0x453b3f).fillRoundedRect(i?915:65,97,300,7,3).fillStyle(i?C.rose:C.mint).fillRoundedRect(i?915:65,97,300*f.p.hp/400,7,3);if(f.p.shield){this.bars.lineStyle(2,C.gold,.8).strokeEllipse(p.x,p.y-60,82,135);}this.focusLabels[i].setText('CUSTOM '+Math.floor(this.duel.roundTime/CUSTOM_SECONDS*100)+'%   ·   RESOLVE '+Math.floor(f.p.charge)+'%');this.handViews[i]?.forEach((view,j)=>{if(view)view.setAlpha(f.cards.canPlay(j)?1:.6);});});const all=[];for(let i=0;i<2;i++)for(const shot of fs[i].shots){all.push(shot);let image=this.projectiles.get(shot);if(!image){image=this.add.image(0,0,'mote').setTint(i?C.rose:C.mint).setDisplaySize(25,8).setDepth(30);this.projectiles.set(shot,image);}const p=P(i?5-shot.x:shot.x,shot.y);image.setPosition(p.x,p.y-65);}for(const[shot,image]of this.projectiles)if(!all.includes(shot)){image.destroy();this.projectiles.delete(shot);}if(this.signature!==fs.map(f=>f.cards.queue.length).join('|'))this.refreshHands();this.timer.setText((this.duel.bot?'PRACTICE':'LOCAL DUEL')+'  ·  '+Math.floor(this.duel.time)+'s');}
 flashText(message){this.notice.setText(message);this.noticeTimer?.remove();this.noticeTimer=this.time.delayedCall(1400,()=>this.notice.setText(''));}
 burst(x,y,color){if(!state.save.settings.particles)return;const e=this.add.particles(x,y,'mote',{speed:{min:30,max:160},lifespan:450,scale:{start:.5,end:0},tint:color,emitting:false}).setDepth(50);e.explode(20);this.time.delayedCall(550,()=>e.destroy());}
 process(){for(const e of this.duel.drain()){const f=this.duel.fighters[e.player??0],p=P(e.player?5-(e.x??f.p.x):(e.x??f.p.x),e.y??f.p.y);audio.play(e.type==="shot"&&e.charged?"charged":e.type);if(['shot','chip','overdrive'].includes(e.type))this.poses[e.player]=this.time.now+(e.type==='shot'?120:350);if(['hit','hurt','combo','heal'].includes(e.type)){impact(this,p.x,p.y-65,e.type==='hurt'?C.rose:C.gold,1.25);if(e.amount){const t=text(this,p.x,p.y-120,(e.type==='heal'?'+':'−')+e.amount,25,e.type==='heal'?C.mint:C.paper,{stroke:'#251e2f',strokeThickness:4}).setOrigin(.5).setDepth(60);this.tweens.add({targets:t,y:t.y-35,alpha:0,duration:700,onComplete:()=>t.destroy()});}}if(e.type==='chip')this.flashText((e.player?'P2':'P1')+' · '+CARDS[e.id].name);if(e.type==='notice')this.flashText(e.text);if(e.type==='overdrive'){this.flashText(OPERATORS[f.operator].special);if(state.save.settings.shake)this.cameras.main.shake(140,.005);}if(e.type==='duelEnd')this.finish();}}
 finish(){if(this.ended)return;this.ended=true;audio.setActive(false);const winner=this.duel.winner;const record=recordDuel(winner,this.duel.bot);this.time.delayedCall(600,()=>modal(this,{title:winner===null?'An even match.':(winner===0?'Player one':'Player two')+' wins the duel.',body:this.duel.bot?`Practice record   ${record.practiceWins} W / ${record.practiceLosses} L / ${record.practiceDraws} D`:`Local record   P1 ${record.p1} / P2 ${record.p2} / Draws ${record.draws}`,yes:'Rematch',no:'Next presets',portrait:winner===null?'pulse-portrait':this.duel.fighters[winner].operator+'-portrait',onYes:()=>{state.duelOptions.seed=Date.now();this.scene.restart();},onNo:()=>this.scene.start('DuelLobby')}));}
 update(_time,delta){if(!this.duel||!this.keys)return;const k=this.keys;this.duel.update(Math.min(delta/1000,.05),[{dx:(k.d.isDown?1:0)-(k.a.isDown?1:0),dy:(k.s.isDown?1:0)-(k.w.isDown?1:0),fire:k.fire0.isDown},{dx:(k.left.isDown?1:0)-(k.right.isDown?1:0),dy:(k.down.isDown?1:0)-(k.up.isDown?1:0),fire:k.fire1.isDown}]);this.process();this.sync();if(this.duel.selecting&&!this.customLayer)this.showCustom();}
}
