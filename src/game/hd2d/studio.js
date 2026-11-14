import {DECOR,normalizeBase} from '../../../dist/home.js';
import {C,button,label,panel,text} from '../ui.js';
import {audio,persist,announce} from '../state.js';

export function openStudio(scene){
 scene.busy=true;scene.stopWalking();
 const base=normalizeBase(scene.save.base);
 const items=Object.keys(DECOR);
 let selected=Math.max(0,items.findIndex(type=>base.storage[type]>0));
 const root=scene.add.container(0,0).setDepth(20000);
 const add=object=>{root.add(object);return object;};
 add(scene.add.rectangle(640,360,1280,720,0x030914,.68).setInteractive());
 add(panel(scene,260,137,760,446,{fill:0x07111e,edge:C.edge,radius:10}));
 add(text(scene,300,164,'POCKET STORAGE',26,C.paper,{fontStyle:'bold',letterSpacing:1}));
 add(label(scene,302,202,'HOME  /  DECOR',9,C.mint));
 add(button(scene,946,176,70,30,'×',close,{size:21,small:true}));

 const tiles=[];
 const takeButton=button(scene,882,506,208,42,'TAKE  ↗',take,{primary:true,size:16,small:true});
 add(takeButton);
 add(label(scene,300,536,'CHOOSE A PIECE · CARRY IT OUTSIDE TO PLACE',8,C.muted));
 add(label(scene,300,557,'1–6 SELECT   ·   ENTER TAKE   ·   ESC CLOSE',8,C.muted));

 const coords=[[393,279],[628,279],[393,374],[628,374],[393,469],[628,469]];
 items.forEach((id,index)=>{
  const [x,y]=coords[index],decor=DECOR[id];
  const tile=add(scene.add.container(x,y));
  const bg=scene.add.graphics();
  const draw=active=>{
   bg.clear();bg.fillStyle(active?0x122b3b:0x0b1927,.98).fillRoundedRect(-103,-38,206,76,7);
   bg.lineStyle(active?1.8:1,active?decor.color:0x294455,active?.9:.8).strokeRoundedRect(-103,-38,206,76,7);
   bg.fillStyle(decor.color,.94).fillRoundedRect(-90,-17,31,34,5);
   if(active)bg.fillStyle(C.rose,.95).fillRect(-102,-35,28,2);
  };
  draw(index===selected);tile.add(bg);
  const cardKey='decor-card-'+id;
  if(scene.textures.exists(cardKey))tile.add(scene.add.image(-79,0,cardKey).setDisplaySize(30,40));
  else tile.add(scene.add.rectangle(-79,0,27,31,decor.color).setStrokeStyle(1,0xffffff,.3));
  tile.add(label(scene,-99,-27,String(index+1).padStart(2,'0'),8,activeColor(index)));
  tile.add(text(scene,-49,-16,decor.name,13,C.paper,{fontStyle:'bold',wordWrap:{width:143}}).setOrigin(0,.5));
  const count=label(scene,-49,16,'',8,C.muted);
  tile.add(count);
  const colorDot=scene.add.circle(91,-23,3,decor.color);
  tile.add(colorDot);
  const hit=scene.add.rectangle(0,0,206,76,0xffffff,0).setInteractive({useHandCursor:true});
  tile.add(hit);hit.on('pointerup',()=>{selected=index;redraw();audio.play('ui');});
  tiles.push({tile,bg,count,colorDot,id,draw});
 });

 const panelDetail=add(scene.add.graphics());
 const preview=add(scene.add.graphics());
 const previewImage=add(scene.add.image(882,273,'decor-card-planter').setDisplaySize(44,58));
 const nameText=add(text(scene,848,287,'',19,C.paper,{fontStyle:'bold',align:'center',wordWrap:{width:190}}).setOrigin(.5));
 const quantityText=add(label(scene,848,320,'',9,C.mint,{align:'center'}).setOrigin(.5));
 const inventoryText=add(label(scene,848,355,'',8,C.muted,{align:'center'}).setOrigin(.5));
 function activeColor(index){return index===selected?C.mint:C.muted;}
 function redraw(){
  const id=items[selected],decor=DECOR[id],count=base.storage[id]??0;
  tiles.forEach((item,index)=>{
   const qty=base.storage[item.id]??0;
   item.draw(index===selected);
   item.count.setText(qty>0?`${qty} IN STORAGE`:'' );
   item.count.setColor(qty>0?'#8da5ba':'#516477');
   item.tile.setAlpha(qty>0?1:.46);
   item.colorDot.setVisible(qty>0);
  });
  panelDetail.clear().fillStyle(0x0a1927,.96).fillRoundedRect(770,236,224,242,8).lineStyle(1,0x294455,.9).strokeRoundedRect(770,236,224,242,8);
  const previewKey='decor-card-'+id;
  if(scene.textures.exists(previewKey)){previewImage.setTexture(previewKey).setVisible(true);preview.clear();}
  else{previewImage.setVisible(false);preview.clear().fillStyle(decor.color,.16).fillCircle(882,273,27).lineStyle(2,decor.color,.9).strokeCircle(882,273,27).fillStyle(decor.color).fillCircle(882,273,5);}
  nameText.setText(decor.name).setY(319);
  quantityText.setText(count>0?`${String(count).padStart(2,'0')} READY`:'OUT OF STOCK').setY(351).setColor(count>0?'#7ee9f5':'#ff7d91');
  inventoryText.setText('FIELD LIMIT  '+String(decor.limit).padStart(2,'0')).setY(379);
  takeButton.setAlpha(count>0?1:.42);
 }
 function take(){
  const id=items[selected];
  if((base.storage[id]??0)<1)return;
  base.storage[id]--;base.carried={type:id,rotation:0};scene.carriedDecor=base.carried;
  scene.runtime.setCarriedDecor(base.carried);persist();audio.play('ui');close();announce(`${DECOR[id].name}. Carry it to a clear spot and press Y to place.`);
 }
 function key(event){
  if(event.repeat)return;
  if(/^[1-6]$/.test(event.key)){selected=Number(event.key)-1;redraw();audio.play('ui');}
  else if(event.key==='Enter')take();
  else if(event.key==='Escape')close();
 }
 function close(){
  scene.input.keyboard.off('keydown',key);scene.events.off('shutdown',close);
  root.destroy();scene.busy=false;
 }
 scene.input.keyboard.on('keydown',key);scene.events.once('shutdown',close);
 redraw();
}
