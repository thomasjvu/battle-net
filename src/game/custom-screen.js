import{compatibleChips}from'../../dist/network-battle.js';
import{CARDS}from'./state.js';
import{C,text,label,button,cardView}from'./ui.js';
export function chipTile(scene,id,x,y,scale=1,{onClick,selected=false,code=true,handKey=null}={}){
 return cardView(scene,id,x,y,scale*.78,{catalog:CARDS,onClick,handKey:handKey??(selected?'✓':null)});

}
export function drawCustom(scene){
 const opening=!scene.customRoot;
 scene.customRoot?.destroy();
 const root=scene.add.container(0,0).setDepth(1000);
 scene.customRoot=root;
 scene.cardLayer.setVisible(false);
 commandSidebar(scene,root,scene.battle.cards,{
  select:i=>scene.selectCustom(i),send:()=>scene.sendCustom(),
  clear:()=>{scene.battle.cards.selected=[];drawCustom(scene);}
 });
 if(opening&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  root.setX(-45).setAlpha(.4);
  scene.tweens.add({targets:root,x:0,alpha:1,duration:200,ease:'Cubic.easeOut'});
 }
}

export function commandSidebar(scene,root,folder,{title='CUSTOM',keys='12345',sendLabel='Send  ↵',select,send,clear}){
 root.add(scene.add.rectangle(150,423,284,530,0x081725,.98).setStrokeStyle(1,0x41697c).setInteractive());
 root.add(text(scene,26,171,title,28,C.paper,{fontStyle:'bold'}));
 root.add(label(scene,274,189,`${folder.drawPile.length} LEFT`,10,C.muted).setOrigin(1,.5));
 const picked=folder.selected.map(index=>folder.window[index]);
 for(let i=0;i<5;i++){
  const card=folder.window[i], y=241+i*63;
  const order=folder.selected.indexOf(i);
  const legal=card&&(order>=0||compatibleChips([...picked,card]));
  const row=scene.add.rectangle(150,y,252,55,order>=0?0x164b4f:0x102538)
   .setStrokeStyle(1,order>=0?C.mint:0x294759);
  root.add(row);
  if(card){
   const art=scene.textures.exists('premium-'+card.id)?'premium-'+card.id:'card-'+card.id;
   root.add(scene.add.image(70,y,art).setDisplaySize(42,42).setAlpha(legal?1:.38));
   root.add(text(scene,98,y,CARDS[card.id].name,15,legal?C.paper:C.muted,{wordWrap:{width:134},maxLines:2}).setOrigin(0,.5));
   root.add(label(scene,263,y,order>=0?'#'+(order+1):card.code,14,order>=0?C.mint:C.gold).setOrigin(1,.5));
   row.setInteractive({useHandCursor:true}).on('pointerup',()=>select(i));
  }
  root.add(label(scene,32,y,keys[i],10,C.muted).setOrigin(0,.5));
 }
 const advance=picked.length===3&&picked.every(card=>card.id==='cannon');
 root.add(label(scene,26,535,advance?'TRI CANNON':picked.length?`${picked.length} SELECTED`:'BUSTER ONLY',11,advance?0xffd66e:C.muted));
 root.add(button(scene,150,578,244,42,sendLabel,send,{primary:true,small:true,size:19}));
 if(clear)root.add(button(scene,150,631,244,31,'Clear',clear,{small:true,size:14}));
}
