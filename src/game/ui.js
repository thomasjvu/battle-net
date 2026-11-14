import Phaser from "phaser";
import { state, audio, announce } from "./state.js";
import{CHIP_CODES}from"../../dist/network-battle.js";
import { CARD_COST } from "../../dist/deck.js";
const W = 1280, H = 720, C = { ink:0x07111e, dark:0x030710, paper:0xf2f7ff, pale:0xffffff, gold:0xffd66f, mint:0x7ee9f5, muted:0x8da5ba, rose:0xff4766, hot:0xff294f, edge:0x51cadc };
const hex = (n) => typeof n === "string" ? n : "#" + n.toString(16).padStart(6, "0");
const cutRect = (x,y,w,h,c=12) => [{x:x+c,y},{x:x+w,y},{x:x+w,y:y+h-c},{x:x+w-c,y:y+h},{x,y:y+h},{x,y:y+c}];
function text(scene, x, y, value, size = 20, color = C.paper, extra = {}) {
  return scene.add.text(x, y, value, { fontFamily: "Arial, Helvetica, sans-serif", fontSize: size, color: hex(color), ...extra });
}
function label(scene, x, y, value, size = 12, color = C.muted, extra = {}) {
  return text(scene, x, y, value, size, color, { fontFamily: "Menlo, Consolas, monospace", letterSpacing: 1.2, ...extra });
}
function panel(scene, x, y, w, h, { fill = C.ink, alpha = 0.96, edge = C.edge, radius = 12 } = {}) {
  const g = scene.add.graphics();
  const cut = Math.min(radius, Math.max(7, Math.min(w,h)*.12));
  g.fillStyle(0x000000,.64).fillPoints(cutRect(x+7,y+8,w,h,cut),true);
  g.fillStyle(fill,alpha).fillPoints(cutRect(x,y,w,h,cut),true);
  g.lineStyle(1.5,edge,.76).strokePoints(cutRect(x,y,w,h,cut),true);
  g.lineStyle(1,edge,.16).strokePoints(cutRect(x+7,y+7,w-14,h-14,Math.max(4,cut-4)),true);
  // Persona-like scarlet slash and MMBN circuit traces make the plaque read as a game surface.
  g.fillStyle(C.hot,.95).fillPoints([{x:x+cut+8,y:y+10},{x:x+cut+48,y:y+10},{x:x+cut+42,y:y+13},{x:x+cut+8,y:y+13}],true);
  g.fillStyle(C.mint,.75).fillRect(x+w-38,y+10,18,2).fillRect(x+w-16,y+10,5,2);
  g.lineStyle(1,C.mint,.36).beginPath().moveTo(x+12,y+h-17).lineTo(x+12,y+h-10).lineTo(x+36,y+h-10).strokePath();
  return g;
}
function button(scene, x, y, w, h, value, action, { primary = false, disabled = false, size = 19, small = false } = {}) {
  const root = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const t = text(scene, 0, 0, value, size, primary ? C.hot : disabled ? 0x637589 : C.paper, { align: "center", fontStyle: primary ? "bold" : "normal", letterSpacing: primary?1.3:0.2 }).setOrigin(0.5);
  const draw = (hover) => {
    bg.clear();
    const selected = !disabled && (hover || primary), left=-w/2, top=-h/2, cut=Math.min(10,h*.3);
    const shape=cutRect(left,top,w,h,cut);
    bg.fillStyle(0x000000,.62).fillPoints(cutRect(left+3,top+4,w,h,cut),true);
    bg.fillStyle(disabled ? 0x0a121c : hover ? 0x151521 : 0x0b1725, disabled ? .76 : .98).fillPoints(shape,true);
    bg.lineStyle(selected ? 2 : 1.2, selected ? C.hot : C.edge, disabled ? .28 : selected ? .95 : .58).strokePoints(shape,true);
    if(!small){
      bg.lineStyle(1,C.edge,disabled ? .08 : .16).strokePoints(cutRect(left+5,top+5,w-10,h-10,Math.max(4,cut-3)),true);
      bg.fillStyle(C.mint,disabled ? .24 : .7).fillRect(left+13,top+8,16,1);
    }
    if(selected){
      bg.fillStyle(C.hot).fillPoints([{x:left+cut+7,y:top+5},{x:left+cut+34,y:top+5},{x:left+cut+28,y:top+8},{x:left+cut+7,y:top+8}],true);
      bg.fillPoints([{x:left+cut+7,y:top+h-8},{x:left+cut+29,y:top+h-8},{x:left+cut+24,y:top+h-5},{x:left+cut+7,y:top+h-5}],true);
      bg.fillStyle(C.hot,.95).fillPoints([{x:w/2-18,y:-5},{x:w/2-13,y:0},{x:w/2-18,y:5}],true);
    }
    t.setColor(hex(disabled?0x637589:selected?C.hot:C.paper));
  };
  draw(false);
  root.add([bg, t]);
  if (!disabled) {
    root.setData("ui",true);root.setSize(w, h).setInteractive({ useHandCursor: true });
    const animateScale = scale => {
      scene.tweens.killTweensOf(root);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      scene.tweens.add({targets:root,scale,duration:115,ease:"Cubic.easeOut"});
    };
    root.on("pointerover", () => {
      draw(true);
      animateScale(1.025);
    });
    root.on("pointerout", () => {
      draw(false);
      animateScale(1);
    });
    root.on("pointerdown", () => animateScale(.96));
    root.on("pointerup", () => {
      animateScale(1.025);
      audio.unlock();
      audio.play("ui");
      action();
    });
  }
  return root;
}
function background(scene, { dim = 0.25, key = "forest" } = {}) {
  if(key==="forest"&&state.networkWorld!==false&&scene.textures.exists("network-battle"))key="network-battle";
  const image = scene.add.image(W / 2, H / 2, key);
  if (scene.textures.exists(key)) {
    const scale = Math.max(W / image.width, H / image.height);
    image.setScale(scale);
  } else image.destroy();
  scene.add.rectangle(W / 2, H / 2, W, H, C.dark, dim);
  const g = scene.add.graphics();
  g.lineStyle(1, C.mint, 0.42).strokePoints(cutRect(18,18,W-36,H-36,16),true);
  g.lineStyle(1, C.edge, 0.16).strokePoints(cutRect(25,25,W-50,H-50,14),true);
  g.fillStyle(C.hot,.95).fillPoints([{x:31,y:18},{x:108,y:18},{x:96,y:21},{x:31,y:21}],true);
  g.fillStyle(C.mint,.8).fillRect(W-75,H-21,42,2);
  label(scene,36,31,"BN   //   LINK 01",9,C.mint);
  for(const [x,y,flipX,flipY] of [[26,26,1,1],[W-26,26,-1,1],[26,H-26,1,-1],[W-26,H-26,-1,-1]]){
    g.lineStyle(2,C.hot,.92).beginPath().moveTo(x,y+8*flipY).lineTo(x,y).lineTo(x+8*flipX,y).strokePath();
    g.fillStyle(C.mint,.86).fillCircle(x,y,1.5);
  }
  return image;
}
function heading(scene, title, subtitle = "", back = "Title") {
  announce(title + ". " + subtitle);
  button(scene, 76, 55, 94, 39, "‹ Back", () => scene.scene.start(back), { size: 17, small: true });
  text(scene, 155, 27, title.toUpperCase(), 35, C.paper, {fontStyle:"bold",letterSpacing:1.1}).setAngle(-2);
  scene.add.graphics().fillStyle(C.hot,.95).fillPoints([{x:156,y:69},{x:234,y:69},{x:227,y:72},{x:156,y:72}],true);
  scene.add.graphics().lineStyle(1,C.edge,.42).beginPath().moveTo(238,70).lineTo(410,70).strokePath();
  if (subtitle) label(scene, 157, 80, subtitle, 10, C.muted);
  systemButtons(scene);
}
function fullscreen(scene) {
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
    toast(scene, "This browser keeps games inside its window. Open in a regular browser for native fullscreen.");
    return;
  }
  if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
  else scene.scale.startFullscreen();
}
function systemButtons(scene) {
  button(scene, 1215, 54, 48, 38, "⛶", () => {
    fullscreen(scene);
  }, { size: 24, small: true });
  scene.scale.on("fullscreenfailed", () => toast(scene, "Your browser blocked fullscreen. The game still fills this window."));
}
function toast(scene, message, color = C.paper) {
  announce(message);
  if (scene.messageToast) scene.messageToast.destroy();
  const root = scene.add.container(W / 2, scene.scene.key === 'Overworld' ? 600 : 670).setScrollFactor(0).setDepth(30000);
  const width=Math.min(1e3,message.length*9+70),p=scene.add.graphics();
  p.fillStyle(0x000000,.75).fillPoints(cutRect(-width/2+3,-23+3,width,46,8),true);
  p.fillStyle(C.dark,.98).fillPoints(cutRect(-width/2,-23,width,46,8),true);
  p.lineStyle(1,C.edge,.8).strokePoints(cutRect(-width/2,-23,width,46,8),true);
  p.fillStyle(C.hot).fillRect(-width/2+11,-13,3,26);
  p.fillStyle(C.mint,.7).fillRect(width/2-29,-13,14,2).fillRect(width/2-12,-13,3,2);
  const t = text(scene, 0, 0, message, 18, color, { align: "center" }).setOrigin(0.5);
  p.setScrollFactor(0);t.setScrollFactor(0);root.add([p, t]);
  scene.messageToast = root;
  scene.time.delayedCall(3200, () => {
    if (root.active) scene.tweens.add({ targets: root, alpha: 0, duration: 180, onComplete: () => root.destroy() });
  });
}
function modal(scene, { title, body, yes = "Continue", no = "Cancel", onYes, onNo, portrait = null }) {
  const root = scene.add.container(0,0).setDepth(20000);
  const left = 210, width = 860, bottom = 674;
  const inset = portrait ? 115 : 25;
  const titleView = text(scene,left+inset,0,title,24,C.paper,{
    fontStyle:"bold",wordWrap:{width:width-inset-25}
  });
  const message = text(scene,left+inset,0,body,18,0xbbcede,{
    wordWrap:{width:width-inset-25},lineSpacing:4
  });
  const height = Math.max(184, titleView.height+message.height+100);
  const top = bottom-height;
  titleView.y = top+21;
  message.y = titleView.y+titleView.height+9;
  const dim = scene.add.rectangle(W/2,H/2,W,H,0x030b16,.47).setInteractive();
  const surface = panel(scene,left,top,width,height,{fill:0x07111e,alpha:.99,edge:C.edge});
  root.add([dim,surface,titleView,message]);
  if(portrait)root.add(scene.add.image(left+58,top+66,portrait).setDisplaySize(74,92));
  const action = (caption,x,callback,primary=false) => {
    root.add(button(scene,x,bottom-29,174,36,caption,()=>{
      root.destroy();
      callback?.();
    },{primary,small:true,size:15}));
  };
  if(no)action(no,left+width-294,onNo);
  action(yes,left+width-101,onYes,true);

  return root;
}
function cardView(scene, id, x, y, scale = 1, { catalog, showCount = false, count = 0, onClick = null, handKey = null, muted = false } = {}) {
  const card = catalog[id], root = scene.add.container(x, y);
  root.setScale(scale);
  const width = 164, height = 218;
  const accent = id === "gold" ? 0xffca69 : ({fire:0xff775e,water:0x78afff,electric:0xc5a2ff,nature:0x88e7a1,wind:0x7fe9e4}[card.element] ?? 0x61ddf7);
  const g = scene.add.graphics();
  g.fillStyle(0x020710,.82).fillPoints(cutRect(-79,-105,width,height,12),true);
  g.fillStyle(0x081321,.98).fillPoints(cutRect(-82,-109,width,height,12),true);
  g.lineStyle(1.5,accent,.88).strokePoints(cutRect(-82,-109,width,height,12),true);
  g.lineStyle(1,accent,.2).strokePoints(cutRect(-77,-104,width-10,height-10,9),true);
  g.fillGradientStyle(0x14283c,0x102038,accent,0x101929,1,1,.45,1).fillRect(-75,-75,150,108);
  for(let k=-70;k<75;k+=12)g.lineStyle(1,accent,.14).lineBetween(k,-74,k,33);
  g.lineStyle(1,accent,.7).lineBetween(-75,34,75,34);
  g.fillStyle(C.hot).fillPoints([{x:-72,y:-106},{x:-37,y:-106},{x:-42,y:-103},{x:-72,y:-103}],true);
  g.fillStyle(accent).fillRect(40,104,31,2);
  root.add(g);
  const artKey=scene.textures.exists("premium-"+id)?"premium-"+id:"card-"+id;
  root.add(scene.add.image(0,-22,artKey).setDisplaySize(103,103));
  root.add(label(scene,-70,-95,card.type.toUpperCase(),9,accent));
  root.add(text(scene,0,48,card.name,15,C.paper,{align:"center",fontStyle:"bold",wordWrap:{width:150}}).setOrigin(.5));
  root.add(text(scene,0,75,shortDesc(id),10,C.muted,{align:"center",wordWrap:{width:142}}).setOrigin(.5));
  root.add(label(scene,-69,92,card.stat??(card.damage?String(card.damage):"UTILITY"),8,accent));
  root.add(text(scene,67,-92,card.type==="equipment"?"◆":CHIP_CODES[id]??"*",21,accent,{fontStyle:"bold"}).setOrigin(1,.5));
  if(showCount)root.add(label(scene,68,93,"×"+count,9,C.paper).setOrigin(1,0));
  if(handKey)root.add(label(scene,63,-64,handKey,10,C.paper).setOrigin(1,0));
  if (muted) root.setAlpha(0.5);
  if (onClick) {
    root.setSize(width, height).setInteractive({ useHandCursor: true });
    root.on("pointerup", onClick);
  }
  return root;
}
function shortDesc(id) {
  return { cannon: "Straight-line cannon shot.", longsword: "Strike 2 panels ahead.", gold: "Same blade. Gold finish.", thunder: "Homing. Doubles on wet foes.", recover: "Restore 60 health.", barrier: "Absorb 50 damage.", shotgun: "A bolt for every row.", firewall: "Burn a row. Shatter ice.", icewave: "Freeze a row. Leave it wet.", areagrab: "Claim a column for 6s.", charge: "Double your buster for 8s.", vampire: "Strike close. Steal life.", prism: "Pierce every foe in a row.", repair: "Mend panels. Heal 30.", gust:"Pierce a row. Push back.", stonewall:"Raise an 80-point ward.", poison:"A homing poisonous thorn.", bloom:"Heal now and over time.", meteor:"A delayed column blast.", tidal:"Soak a row for 10s.", chainlight:"Lightning for every foe.", cleave:"Strike a wide front arc.", dash:"Step ahead. Dodge a hit.", echo:"Repeat your last attack.", draw:"Advance Custom Gauge by 4s.", focus:"Fill the Custom Gauge.", thorns:"Reflect the next 3 hits.", revive:"Heal 100. Cleanse poison.", slow:"Freeze one foe for 3s.", storm:"A storm strikes every foe." }[id] ?? "";
}
function transition(scene, target, data) {
  scene.cameras.main.fadeOut(180, 15, 12, 20);
  scene.time.delayedCall(180, () => scene.scene.start(target, data));
}
function startFade(scene) {
  scene.cameras.main.fadeIn(240, 15, 12, 20);
}
function credits(scene) {
  label(scene, 1095, 53, "◈ " + state.save.credits + " GOLD", 14, C.gold).setOrigin(1, 0.5);
}
export {
  C,
  H,
  W,
  background,
  button,
  cardView,
  credits,
  fullscreen,
  heading,
  hex,
  label,
  modal,
  panel,
  shortDesc,
  startFade,
  systemButtons,
  text,
  toast,
  transition
};
