import {CardBattle} from './card-battle.js';
import {seeded} from './combat.js';
export const CHIP_CODES={cannon:'A',longsword:'S',gold:'S',thunder:'A',recover:'*',barrier:'*',shotgun:'A',firewall:'F',icewave:'A',areagrab:'*',charge:'*',vampire:'S',prism:'A',repair:'*',gust:'A',stonewall:'*',poison:'B',bloom:'B',meteor:'F',tidal:'A',chainlight:'A',cleave:'S',dash:'*',echo:'*',draw:'*',focus:'*',thorns:'B',revive:'*',slow:'A',storm:'A'};
export function compatibleChips(chips){const named=chips.filter(c=>c.code!=='*');return chips.length<=5&&(chips.every(c=>c.id===chips[0]?.id)||new Set(named.map(c=>c.code)).size<=1);}
export class CustomFolder{
 constructor(deck,random){this.drawPile=deck.map(id=>({id,code:CHIP_CODES[id]??'*'}));for(let i=this.drawPile.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[this.drawPile[i],this.drawPile[j]]=[this.drawPile[j],this.drawPile[i]];}this.window=[];this.selected=[];this.queue=[];this.discard=[];this.events=[];this.energy=6;this.maxEnergy=6;this.time=0;this.refill();}
 get hand(){return Array.from({length:5},(_,i)=>this.queue[i]?.id??null);}
 refreshWindow(){
  this.drawPile.unshift(...this.window);
  this.window=[];
  this.refill();
 }
 refill(){while(this.window.length<5&&this.drawPile.length)this.window.push(this.drawPile.pop());}
 select(i){if(!this.window[i])return false;const pos=this.selected.indexOf(i);if(pos>=0){this.selected.splice(pos);return true;}if(!compatibleChips([...this.selected.map(j=>this.window[j]),this.window[i]]))return false;this.selected.push(i);return true;}
 load(){this.discard.push(...this.queue.flatMap(c=>Array(c.copies??1).fill(c.id)));const chips=this.selected.map(i=>this.window[i]);this.queue=chips.length===3&&chips.every(c=>c.id==='cannon')?[{...chips[0],advance:'TRI CANNON',copies:3}]:chips;this.window=this.window.filter((_,i)=>!this.selected.includes(i));this.selected=[];}
 canPlay(i){return i===0&&!!this.queue[0];}
 play(i){if(!this.canPlay(i))return null;const c=this.queue.shift();this.discard.push(...Array(c.copies??1).fill(c.id));return c.id;}
 redraw(){this.events.push({type:'notice',text:'CUSTOM GAUGE BOOST'});}
 update(dt){this.time+=dt;}
 drain(){return this.events.splice(0);}
}
export const CUSTOM_SECONDS = 8;
export class NetworkBattle extends CardBattle{
 constructor(options){super(options);this.cards=new CustomFolder(options.deck,seeded((options.seed??1)+27));this.folder=this.cards.hand;this.customGauge=0;this.customDuration=CUSTOM_SECONDS;this.phase='custom';this.busterCharge=0;this.fireHeld=false;this.advanceMultiplier=1;}
 start(){super.start();this.phase='custom';}
 openCustom(){if(this.status!=='running'||this.phase==='custom'||this.customGauge<this.customDuration)return false;this.phase='custom';this.cards.refreshWindow();this.busterCharge=0;this.fireHeld=false;return true;}
 confirmCustom(){if(this.phase!=='custom'||this.status!=='running')return false;this.cards.load();this.folder=this.cards.hand;this.customGauge=0;this.phase='action';if(this.cards.queue[0]?.advance)this.emit('notice',{text:'PROGRAM ADVANCE · TRI CANNON'});return true;}
 useCard(index=0){if(this.phase!=='action'||index!==0)return false;const chip=this.cards.queue[0];this.advanceMultiplier=chip?.advance?3:1;const n=this.shots.length,ok=super.useCard(0);if(ok&&chip?.advance){for(const shot of this.shots.slice(n))shot.damage*=3;this.emit('notice',{text:'PROGRAM ADVANCE · TRI CANNON'});}this.advanceMultiplier=1;return ok;}
 damageEnemy(e,amount,...rest){return super.damageEnemy(e,amount*this.advanceMultiplier,...rest);}
 applyExtra(id,slot){if(['focus','draw'].includes(id)){this.customGauge=Math.min(this.customDuration,this.customGauge+(id==='focus'?8:4));this.emit('chip',{id,name:'CUSTOM BOOST',x:this.p.x,y:this.p.y});return;}return super.applyExtra(id,slot);}
 shoot(charged=false){if(this.status!=='running'||this.phase!=='action'||this.time-this.p.shotAt<.16)return;this.p.shotAt=this.time;this.shots.push({x:this.p.x+.25,y:this.p.y,speed:charged?14:11,damage:Math.round((charged?40:5)*(this.equipment.buster?1.3:1)*(this.p.boost>this.time?2:1)),kind:charged?'charge':'buster',element:'neutral',hit:[]});this.emit('shot',{x:this.p.x,y:this.p.y,charged});}
 update(dt,input={}){if(this.phase!=='action'||this.status!=='running')return;dt=Math.max(0,Math.min(.05,dt));if(input.fire)this.busterCharge=Math.min(1.1,this.busterCharge+dt);else if(this.fireHeld){this.shoot(this.busterCharge>=.9);this.busterCharge=0;}this.fireHeld=!!input.fire;const before=this.time;super.update(dt,{...input,fire:false});if(this.time>before)this.customGauge=Math.min(this.customDuration,this.customGauge+this.time-before);}
}
