import{Battle,seeded}from'./combat.js';import{DrawDeck}from'./deck.js';import{EXTRA_CARDS}from'./extra-cards.js';
export class CardBattle extends Battle{
 constructor(options){super({...options,cardMode:true,folder:options.deck.slice(0,5)});this.cards=new DrawDeck(options.deck,seeded((options.seed??1)+27));this.folder=[...this.cards.hand];this.lastAttack=null;this.delayed=[];this.regenUntil=0;this.regenNext=0;this.thornsUntil=0;this.thornCharges=0;this.poisonUntil=0;this.poisonNext=0;}
 useCard(slot){if(this.status!=='running')return false;if(!this.cards.canPlay(slot)){this.emit('notice',{text:this.cards.hand[slot]?'NOT ENOUGH FOCUS':'DRAWING A CARD…'});return false;}const id=this.cards.hand[slot];if(id==='echo'&&!this.lastAttack){this.emit('notice',{text:'PLAY AN ATTACK CARD FIRST'});return false;}this.folder=[...this.cards.hand];if(EXTRA_CARDS[id])this.applyExtra(id,slot);else if(!super.useChip(slot))return false;this.cards.play(slot);if((EXTRA_CARDS[id]?.type??this.cardType(id))==='attack')this.lastAttack=id;this.checkVictory();return true;}
 cardType(id){return ['recover','barrier','areagrab','charge','repair'].includes(id)?'support':'attack';}
 applyExtra(id,slot){const c=EXTRA_CARDS[id],living=this.enemies.filter(e=>e.hp>0),row=living.filter(e=>e.y===this.p.y),weak=[...living].sort((a,b)=>a.hp-b.hp)[0];this.chipUses++;this.emit('chip',{id,name:c.name,x:this.p.x,y:this.p.y});const heal=n=>{this.p.hp=Math.min(this.p.max,this.p.hp+n);this.emit('heal',{x:this.p.x,y:this.p.y,amount:n});};
 switch(id){
 case'gust':for(const e of row){this.damageEnemy(e,45,'wind');e.x=Math.min(5,e.x+1);}this.emit('wave',{y:this.p.y,color:'#c3e3ac'});break;
 case'stonewall':this.p.shield=Math.min(140,this.p.shield+80);this.emit('block',{x:this.p.x,y:this.p.y,amount:0});break;
 case'poison':if(weak){this.damageEnemy(weak,25,'nature');weak.poisonUntil=this.time+6;weak.poisonNext=this.time+1;this.emit('venom',{x:weak.x,y:weak.y});}break;
 case'bloom':heal(30);this.regenUntil=this.time+6;this.regenNext=this.time+1;break;
 case'meteor':if(weak){this.delayed.push({x:weak.x,at:this.time+1.1,damage:110});this.emit('meteorTell',{x:weak.x,y:weak.y});}break;
 case'tidal':for(const e of row){this.damageEnemy(e,60,'water');e.wet=this.time+10;}this.emit('wave',{y:this.p.y,color:'#83d6fa'});break;
 case'chainlight':case'storm':for(const e of living){this.emit('lightning',{x:e.x,y:e.y});this.damageEnemy(e,c.damage,'electric');}break;
 case'cleave':this.emit('slash',{x:this.p.x,y:this.p.y,color:'#eff2d0'});for(const e of living)if(e.x>this.p.x&&e.x-this.p.x<=2)this.damageEnemy(e,60);break;
 case'dash':this.p.x=Math.min(this.p.grab>this.time?3:2,this.p.x+1);this.p.inv=Math.max(1,this.p.inv);this.p.charge=Math.min(100,this.p.charge+10);this.emit('move',{x:this.p.x,y:this.p.y});break;
 case'echo':if(EXTRA_CARDS[this.lastAttack])this.applyExtra(this.lastAttack,slot);else{this.folder[slot]=this.lastAttack;super.useChip(slot);}break;
 case'draw':this.cards.redraw(slot);break;
 case'focus':this.cards.energy=Math.min(6,this.cards.energy+3);this.emit('focus',{x:this.p.x,y:this.p.y});break;
 case'thorns':this.thornsUntil=this.time+8;this.thornCharges=3;break;
 case'revive':heal(100);this.poisonUntil=0;break;
 case'slow':if(weak){this.damageEnemy(weak,20,'water');weak.frozen=this.time+3;this.emit('wave',{y:weak.y,color:'#83d6fa'});}break;
 }
 }
 damagePlayer(amount){const before=this.p.hp;super.damagePlayer(amount);if(this.p.hp>0&&this.p.hp<before&&this.thornsUntil>this.time&&this.thornCharges>0){this.thornCharges--;const e=this.enemies.filter(e=>e.hp>0).sort((a,b)=>a.hp-b.hp)[0];if(e){this.damageEnemy(e,18,'nature');this.emit('reflect',{x:e.x,y:e.y});this.checkVictory();}}}
 update(dt,input={}){const before=this.time;super.update(dt,input);if(this.time<=before)return;this.cards.update(this.time-before);this.folder=[...this.cards.hand];for(const e of this.cards.drain())this.emit(e.type,e);if(this.status!=='running')return;
 if(this.regenNext>0&&this.regenNext<=this.regenUntil+0.00001&&this.regenNext<=this.time){this.regenNext+=1;this.p.hp=Math.min(this.p.max,this.p.hp+6);this.emit('heal',{x:this.p.x,y:this.p.y,amount:6});}
 if(this.poisonNext>0&&this.poisonNext<=this.poisonUntil+0.00001&&this.poisonNext<=this.time){this.poisonNext+=1;this.damagePlayer(6);}
 for(const e of this.enemies)if(e.hp>0&&e.poisonNext>0&&e.poisonNext<=e.poisonUntil+0.00001&&e.poisonNext<=this.time){e.poisonNext+=1;this.damageEnemy(e,6,'nature');}
 const due=this.delayed.filter(d=>d.at<=this.time);this.delayed=this.delayed.filter(d=>d.at>this.time);for(const d of due){this.emit('meteor',{x:d.x,y:1});for(const e of this.enemies)if(e.hp>0&&e.x===d.x)this.damageEnemy(e,d.damage,'fire');}
 this.checkVictory();}
}
