import Phaser from "phaser";
import {audio, announce, state} from "./state.js";
import {fullscreen, H, W} from "./ui.js";

const ink = 0x071323;
const mint = 0xaaf9e0;
const mono = "Menlo, Consolas, monospace";

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    this.cameras.main.setBackgroundColor(ink);
    this.add.image(W / 2, H / 2, "title-relay").setDisplaySize(W, H);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const logo = this.add.container(88, 203);
    const lettering = {fontFamily:"Arial Black, Arial, sans-serif",fontSize:"106px",fontStyle:"bold italic",padding:{right:22}};
    logo.add(this.add.text(-5, -22, "BATTLE", {...lettering,color:"#f3faff"}));
    logo.add(this.add.text(-5, 69, "NET", {...lettering,color:"#aaf9e0",fontSize:"126px"}));
    const rule = this.add.graphics();
    rule.fillStyle(mint).fillRect(1,209,52,3);
    rule.fillStyle(0x628a9d,.75).fillRect(57,210,266,1);
    logo.add(rule);
    if (!reducedMotion) {
      logo.setAlpha(0).setY(216);
      this.tweens.add({targets:logo,alpha:1,y:203,duration:520,ease:"Cubic.easeOut"});
    }

    let leaving = false;
    const open = target => {
      if (leaving) return;
      leaving = true;
      audio.unlock();
      audio.play("ui");
      this.cameras.main.fadeOut(reducedMotion?0:230,7,14,27);
      this.time.delayedCall(reducedMotion?0:230,()=>this.scene.start(target));
    };

    this.actions = [
      this.makeAction(88,466,252,55,"JACK IN",true,()=>open(state.save.pendingReward?.choices?"Rewards":"Overworld")),
      this.makeAction(88,540,112,38,"Options",false,()=>open("Settings")),
      this.makeAction(218,540,142,38,"Fullscreen",false,()=>fullscreen(this))
    ];
    this.selection = 0;
    this.select(0);
    this.input.keyboard.on("keydown", event => {
      if (event.repeat || leaving) return;
      if (["ArrowDown","ArrowRight","ArrowUp","ArrowLeft","Tab"].includes(event.key)) {
        event.preventDefault();
        const backwards = event.key === "ArrowUp" || event.key === "ArrowLeft" || (event.key === "Tab" && event.shiftKey);
        this.select((this.selection+(backwards?2:1))%3);
      } else if (event.key === "Enter" || event.key === " ") {
        this.actions[this.selection].activate();
      } else if (event.code === "KeyF") {
        fullscreen(this);
      }
    });

    this.add.text(89,630,"↑ ↓  SELECT     ENTER  CONFIRM",{
      fontFamily:mono,fontSize:"12px",color:"#9bb6c8",letterSpacing:1
    });
    if (!reducedMotion) this.cameras.main.fadeIn(360,7,14,27);
    announce("Battle Net title screen. Jack In. Use arrow keys to select and Enter to confirm.");
  }

  makeAction(x,y,width,height,title,primary,activate) {
    const index = primary ? 0 : title === "Options" ? 1 : 2;
    const plate = this.add.graphics().setPosition(x,y);
    const caption = this.add.text(x+(primary?20:12),y+height/2,title,{
      fontFamily:primary?"Arial, sans-serif":mono,fontSize:primary?"24px":"15px",
      fontStyle:primary?"bold":"normal",letterSpacing:primary?3:0
    }).setOrigin(0,.5);
    const arrow = primary ? this.add.text(x+width-30,y+height/2,"›",{
      fontFamily:"Arial, sans-serif",fontSize:"32px"
    }).setOrigin(.5) : null;
    const target = this.add.zone(x,y,width,height).setOrigin(0).setInteractive({useHandCursor:true});
    target.on("pointerover",()=>this.select(index));
    target.on("pointerup",activate);
    return {activate,draw:selected=>{
      plate.clear();
      const points=[{x:0,y:0},{x:width,y:0},{x:width-12,y:height},{x:0,y:height}];
      plate.fillStyle(selected?mint:primary?0x214c55:ink,selected?1:.82).fillPoints(points,true);
      if(!selected)plate.lineStyle(1,0x7cb0b8,.6).strokePoints(points,true);
      caption.setColor(selected?"#071b25":"#e6f5ff");
      arrow?.setColor(selected?"#071b25":"#aaf9e0");
    }};
  }

  select(index) {
    this.selection=index;
    this.actions.forEach((action,i)=>action.draw(i===index));
  }
}
