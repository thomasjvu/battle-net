import{CHIP_CODES,compatibleChips}from'../../dist/network-battle.js';
import{state,CARDS}from'./state.js';
import{C,text,label,button}from'./ui.js';
export function chipTile(scene,id,x,y,scale=1,{onClick,selected=false,code=true}={}){
 const root=scene.add.container(x,y).setScale(scale),card=CARDS[id];
 root.add(scene.add.rectangle(0,0,168,154,selected?0x164c64:0x102438).setStrokeStyle(2,selected?0xffd66e:0x52afca));
 root.add(scene.add.rectangle(0,-35,150,66,0x173f53));root.add(scene.add.image(0,-35,'card-'+id).setDisplaySize(60,60));
 root.add(text(scene,0,14,card.name,17,'#e8faff',{align:'center',wordWrap:{width:155}}).setOrigin(.5));
 root.add(label(scene,-66,-63,'CHIP',9,0x6ce2f1));root.add(text(scene,64,52,code?CHIP_CODES[id]??'*':'',24,0xffd66e,{fontStyle:'bold'}).setOrigin(.5));
 root.add(text(scene,-66,48,card.stat??(card.type==='attack'?card.damage+' ATK':'SUPPORT'),11,0xa0c4cf,{wordWrap:{width:110}}));
 if(onClick)root.setSize(168,154).setInteractive({useHandCursor:true}).on('pointerup',onClick);return root;
}
export function drawCustom(scene){
 scene.customRoot?.destroy();const b=scene.battle,root=scene.add.container(0,0).setDepth(1000);scene.customRoot=root;
 root.add(scene.add.rectangle(640,360,1280,720,0x06121e,.98));
 root.add(scene.add.rectangle(640,61,1240,85,0x123e55).setStrokeStyle(2,0x5de4ef));
 root.add(text(scene,45,27,'CUSTOM',43,0x7cf4fb,{fontStyle:'bold'}));root.add(label(scene,1230,55,'BATTLE TIME FROZEN',14,0xffd66e).setOrigin(1,.5));
 root.add(text(scene,640,138,'Select matching chip codes or matching chip names.  * links with any code.',20,0xc3e2ee).setOrigin(.5));
 root.add(scene.add.image(110,410,state.save.operator+'-portrait').setOrigin(.5,1).setDisplaySize(150,188));
 for(let i=0;i<5;i++){const c=b.cards.window[i],x=255+i*208;if(!c){root.add(scene.add.rectangle(x,340,168,154,0x102438).setStrokeStyle(1,0x274857));root.add(label(scene,x,340,'NO DATA',13,0x597483).setOrigin(.5));continue;}
 const chosen=b.cards.selected.includes(i),legal=chosen||compatibleChips([...b.cards.selected.map(j=>b.cards.window[j]),c]);const tile=chipTile(scene,c.id,x,340,1,{selected:chosen,onClick:()=>scene.selectCustom(i)});tile.setAlpha(legal?1:.35);root.add(tile);root.add(label(scene,x,236,'['+(i+1)+']  '+(chosen?'ORDER '+(b.cards.selected.indexOf(i)+1):'CODE '+c.code),14,chosen?0xffd66e:0x77cfdd).setOrigin(.5));}
 root.add(scene.add.rectangle(640,520,1180,100,0x102c3e).setStrokeStyle(1,0x4c8196));
 const names=b.cards.selected.map(i=>CARDS[b.cards.window[i].id].name);root.add(label(scene,75,481,'SEND ORDER',11,0x67dbe8));root.add(text(scene,75,512,names.join('  →  ')||'Buster only. Select chips above, or send an empty loadout.',20,0xe4f8fc,{wordWrap:{width:1100}}));
 if(names.length===3&&b.cards.selected.every(i=>b.cards.window[i].id==='cannon'))root.add(label(scene,640,582,'PROGRAM ADVANCE FOUND · TRI CANNON',17,0xffd66e).setOrigin(.5));
 root.add(label(scene,65,653,'FOLDER '+b.cards.drawPile.length+'  ·  SPENT '+b.cards.discard.length+'  ·  NO RESHUFFLE',12,0x8cb7c6));
 root.add(button(scene,1065,647,290,56,'SEND CHIPS  [ENTER]',()=>scene.sendCustom(),{primary:true,size:22}));
 root.add(button(scene,670,647,220,40,'Clear selection',()=>{b.cards.selected=[];drawCustom(scene);},{size:17,small:true}));
}
