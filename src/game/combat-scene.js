import {battleBreak} from './battle-break.js';
import {impact} from "./impact.js";
import Phaser from "phaser";
import { NetworkBattle } from "../../dist/network-battle.js";
import { chipTile, drawCustom } from "./custom-screen.js";
import { reward, MISSIONS } from "../../dist/core.js";
import { validateDeck, CARD_COST } from "../../dist/deck.js";
import { state, audio, persist, announce, near, CARDS, OPERATORS } from "./state.js";
import { W, H, C, text, label, panel, button, background, modal, toast, cardView, shortDesc, systemButtons, fullscreen, transition, startFade } from "./ui.js";
const pos = (x, y) => ({ x: 328 + x * 96 + y * 18, y: 292 + y * 54 });
const firstBattleSteps = [
  { id: "commands", text: "Pick up to 3 commands.", key: "1–5  /  ENTER" },
  { id: "move", text: "Step away from warning panels.", key: "WASD" },
  { id: "charge", text: "Hold, then release to charge.", key: "SPACE" },
  { id: "command", text: "Fire your next command.", key: "Z" },
  { id: "custom", text: "Full gauge? Press C for a new hand.", key: "C" }
];
class Combat extends Phaser.Scene {
  constructor() {
    super("Combat");
  }
  async create(data) {
    if (state.walletDeck) {
      await near.refresh();
      if (!near.player || near.account !== state.walletDeck.account || near.config.contractId !== state.walletDeck.contract) {
        state.walletDeck = null;
        this.scene.start("Network");
        return;
      }
      const items = Object.fromEntries(Object.keys(CARDS).map((id, i) => [id, near.player.items[i]]));
      state.walletDeck.items = items;
      state.walletDeck.equipment = {
        buster: state.walletDeck.equipment.buster && items.buster > 0,
        armor: state.walletDeck.equipment.armor && items.armor > 0
      };
    }
    this.customRoot = null;
    this.finished = false;
    this.fleeing = false;
    this.fleeDuration = 1.6;
    this.fleeRemaining = 0;
    this.handSignature = "";
    this.heroPose = 0;
    this.enemyPoses = {};
    this.tutorialActive = !state.save.tutorial;
    this.tutorialStep = -1;
    this.tutorialDone = new Set();
    this.mission = state.mission ?? MISSIONS[0];
    const deck = state.walletDeck?.deck ?? state.save.deck;
    if (!validateDeck(deck, state.walletDeck?.items ?? state.save.items, CARDS)) {
      this.scene.start("Deck", { wallet: Boolean(state.walletDeck) });
      return;
    }
    this.battle = new NetworkBattle({ mission: this.mission, deck, equipment: state.walletDeck?.equipment ?? state.save.equipment, operator: state.save.operator, seed: Date.now(), endless: state.endless });
    this.battle.p.hp = Math.max(1, Math.min(300, state.save.fieldHp ?? 300));
    if(this.textures.exists("network-battle"))this.add.image(640,360,"network-battle").setDisplaySize(1280,720);else this.cameras.main.setBackgroundColor(0x061627);
    const grid=this.add.graphics().setDepth(-1);grid.lineStyle(1,0x1e718a,.35);for(let x=0;x<1280;x+=64)grid.lineBetween(x,160,x,720);for(let y=160;y<720;y+=40)grid.lineBetween(0,y,1280,y);
    const header=this.add.graphics();
    for(const [x,y,w,h] of [[40,24,310,97],[455,24,370,97],[930,24,310,97]]){
      header.fillStyle(C.ink,.66).fillRoundedRect(x,y,w,h,8);
      header.lineStyle(1,C.edge,.32).strokeRoundedRect(x,y,w,h,8);
    }
    header.fillStyle(C.rose,.9).fillRect(54,34,34,2).fillRect(469,34,34,2).fillRect(944,34,34,2);
    const commandRail=this.add.graphics();
    commandRail.fillStyle(C.ink,.66).fillRoundedRect(20,153,225,477,9);
    commandRail.lineStyle(1,C.edge,.3).strokeRoundedRect(20,153,225,477,9);
    commandRail.fillStyle(C.rose,.82).fillRect(34,166,22,2);
    label(this,34,178,"COMMANDS",8,C.muted);
    this.board = this.add.graphics();
    this.aura = this.add.graphics();
    this.hero = this.add.sprite(0, 0, state.save.operator + "-idle").setOrigin(0.5, 120 / 128).setDisplaySize(132, 132);
    this.enemies = /* @__PURE__ */ new Map();
    this.shots = /* @__PURE__ */ new Map();
    this.enemyBars = this.add.graphics();
    this.cardLayer = this.add.container(0, 0);
    this.focusGraphics = this.add.graphics();
    this.healthGraphics = this.add.graphics();
    this.hpText = text(this, 71, 77, "300", 27, C.paper, { fontStyle: "bold" });
    label(this, 72, 44, OPERATORS[state.save.operator].name.toUpperCase(), 12, C.mint);
    this.enemyHp = text(this, 1209, 77, "", 27, C.paper, { fontStyle: "bold" }).setOrigin(1, 0);
    this.enemyName = label(this, 1209, 44, "", 12, C.rose).setOrigin(1, 0);
    text(this, W / 2, 39, this.mission.name.toUpperCase(), 23, C.paper,{fontStyle:"bold",letterSpacing:1}).setOrigin(0.5);
    this.timeText = label(this, W / 2, 80, "00:00", 11, C.muted).setOrigin(0.5);
    this.focusText = label(this, 622, 501, "CUSTOM", 8, C.muted).setOrigin(1,0.5);
    this.resolveText = label(this, 1080, 581, "", 8, C.gold).setOrigin(.5);
    this.resolveBtn = button(this, 1080, 611, 190, 31, "Y   SPECIAL", () => this.castResolve(), { size: 13, small: true });
    this.customBtn=button(this,1080,535,190,31,"CUSTOM   C",()=>this.openCustom(),{size:13,small:true});
    this.noticeText = text(this, W / 2, 167, "", 23, C.gold, { fontStyle: "bold", stroke: "#251e2f", strokeThickness: 4, align: "center" }).setOrigin(0.5).setDepth(100);
    this.runButton=button(this,1134,145,78,28,"RUN",()=>this.toggleFlee(),{size:11,small:true});
    this.runButtonText=this.runButton.getAt(1);
    button(this,1238,145,68,28,"⛶",()=>fullscreen(this),{size:18,small:true});
    this.fleeGraphics=this.add.graphics().setDepth(101);
    this.fleeLabel=label(this,1134,171,"",8,C.rose,{align:"center"}).setOrigin(.5);
    this.keys = this.input.keyboard.addKeys({ up: "W", down: "S", left: "A", right: "D", arrowUp: "UP", arrowDown: "DOWN", arrowLeft: "LEFT", arrowRight: "RIGHT", fire: "SPACE" });
    this.input.keyboard.on("keydown", (e) => {
      if (e.repeat && /^[1-5eE]$/.test(e.key)) return;
      if (/^[1-5]$/.test(e.key) && this.battle.phase === "custom") this.playCard(+e.key - 1);
      if(e.key.toLowerCase()==="z")this.playCard(0);
      if(e.key.toLowerCase()==="c")this.openCustom();
      if(e.key==="Enter"&&this.customRoot)this.sendCustom();
      if (e.key.toLowerCase() === "y") this.castResolve();
      if (e.key === "Escape") this.toggleFlee();
    });
    this.input.keyboard.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.touch = { dx: 0, dy: 0, fire: false };
    if (this.game.device.input.touch) this.touchControls();
    this.events.once("shutdown", () => {
      audio.setActive(false);
    });
    this.input.on("pointerup", () => {
      this.touch.dx = 0;
      this.touch.dy = 0;
      this.touch.fire = false;
    });
    startFade(this);
    if(data?.shattered)battleBreak(this,true);
    this.refreshHand();
    this.syncView();
    this.begin();
    if(this.tutorialActive)this.startTutorial();
  }
  begin() {
    state.save.stats.battles++;
    persist();
    this.battle.start();
    drawCustom(this);
    audio.setTrack("battle");
    audio.unlock();
    audio.configure(state.save.settings);
    audio.setActive(true);
    announce(this.mission.name + ". Battle begins.");
  }
  startTutorial(){
    this.tutorialRoot=this.add.container(640,184).setDepth(12000);
    const frame=this.add.graphics();
    const shape=[{x:-252,y:-28},{x:239,y:-28},{x:252,y:-15},{x:252,y:17},{x:240,y:28},{x:-252,y:28}];
    frame.fillStyle(0x030914,.94).fillPoints(shape,true);
    frame.lineStyle(1,C.edge,.68).strokePoints(shape,true);
    frame.fillStyle(C.rose,.96).fillPoints([{x:-244,y:-24},{x:-201,y:-24},{x:-207,y:-21},{x:-244,y:-21}],true);
    frame.lineStyle(1,C.mint,.26).beginPath().moveTo(-244,20).lineTo(-205,20).lineTo(-199,16).strokePath();
    frame.fillStyle(C.rose,.13).fillPoints([{x:151,y:-12},{x:243,y:-12},{x:243,y:12},{x:151,y:12}],true);
    frame.lineStyle(1,C.rose,.65).strokePoints([{x:151,y:-12},{x:243,y:-12},{x:243,y:12},{x:151,y:12}],true);
    this.tutorialCount=label(this,-229,-14,'TUTORIAL  ·  01 / 05',8,C.mint);
    this.tutorialLine=text(this,-229,1,'',14,C.paper,{fontStyle:'bold'});
    this.tutorialKey=label(this,197,0,'',9,C.rose,{fontStyle:'bold',align:'center'}).setOrigin(.5);
    this.tutorialRoot.add([frame,this.tutorialCount,this.tutorialLine,this.tutorialKey]);
    this.tutorialPips=[];
    for(let i=0;i<firstBattleSteps.length;i++){
      const pip=this.add.rectangle(-228+i*10,20,5,2,0x526a7c).setOrigin(0,.5);
      this.tutorialPips.push(pip);
      this.tutorialRoot.add(pip);
    }
    this.tutorialSkip=button(this,957,184,78,30,'SKIP',()=>this.finishTutorial(),{size:10,small:true});
    this.setTutorialStep(0);
  }
  setTutorialStep(index){
    this.tutorialStep=index;
    const step=firstBattleSteps[index];
    if(!step){this.finishTutorial();return;}
    this.tutorialCount.setText(`TUTORIAL  ·  ${String(index+1).padStart(2,'0')} / 05`);
    this.tutorialLine.setText(step.text);
    this.tutorialKey.setText(step.key);
    this.tutorialPips?.forEach((pip,i)=>pip.setFillStyle(i===index?C.rose:i<index?C.mint:0x526a7c));
  }
  completeTutorialAction(action){
    if(!this.tutorialActive)return;
    this.tutorialDone.add(action);
    while(this.tutorialStep<firstBattleSteps.length&&this.tutorialDone.has(firstBattleSteps[this.tutorialStep].id))this.tutorialStep++;
    if(this.tutorialStep>=firstBattleSteps.length){this.finishTutorial();return;}
    this.setTutorialStep(this.tutorialStep);
  }
  finishTutorial(){
    if(!this.tutorialActive)return;
    this.tutorialActive=false;
    state.save.tutorial=true;
    persist();
    this.tutorialRoot?.destroy();
    this.tutorialSkip?.destroy();
  }
  touchControls() {
    const controls = [["↑", 92, 349, 0, -1], ["←", 48, 393, -1, 0], ["↓", 92, 437, 0, 1], ["→", 136, 393, 1, 0]];
    for (const [symbol, x, y, dx, dy] of controls) {
      const zone = this.add.rectangle(x, y, 39, 39, C.ink, 0.8).setStrokeStyle(1, C.gold).setInteractive();
      text(this, x, y, symbol, 25, C.paper).setOrigin(0.5);
      zone.on("pointerdown", () => {
        this.touch.dx = dx;
        this.touch.dy = dy;
        this.battle.move(dx, dy);
      });
      zone.on("pointerout", () => {
        this.touch.dx = 0;
        this.touch.dy = 0;
      });
    }
    const fire = this.add.circle(1195, 408, 37, C.ink, 0.9).setStrokeStyle(2, C.gold).setInteractive();
    label(this, 1195, 408, "BUSTER", 11, C.paper).setOrigin(0.5);
    fire.on("pointerdown", () => {
      this.touch.fire = true;
      
    });
    fire.on("pointerout", () => this.touch.fire = false);
  }
  selectCustom(index){if(this.battle.cards.select(index))drawCustom(this);else this.notice("Codes do not match.");}
  openCustom(){if(this.fleeing)return;if(this.battle.openCustom()){this.completeTutorialAction("custom");drawCustom(this);audio.play("ui");}else if(this.battle.phase!=="custom")this.notice("CUSTOM CHARGING");}
  sendCustom(){
    if(this.tutorialActive&&!this.tutorialDone.has("commands")&&!this.battle.cards.selected.length){this.notice("SELECT A COMMAND");return;}
    if(!this.battle.confirmCustom())return;
    this.completeTutorialAction("commands");
    this.customRoot?.destroy();this.customRoot=null;this.cardLayer.setVisible(true);audio.play("chip-load");this.touch.fire=false;this.refreshHand();this.processEvents();audio.setActive(true);
  }
  playCard(index) {
    if(this.battle.phase==='custom'){this.selectCustom(index);return;}
    if(this.battle.useCard(index)){this.cancelFlee();this.completeTutorialAction("command");audio.play('chip');this.refreshHand();this.processEvents();}
    else if(this.battle.status==='running')this.notice(index?'NEXT COMMAND  ·  Z':'NO COMMANDS');
  }
  castResolve() {
    if(this.battle.overdrive())this.cancelFlee();
    this.processEvents();
  }
  notice(message) {
    this.noticeText.setText(message);
    this.noticeClear?.remove();
    this.noticeClear = this.time.delayedCall(1650, () => this.noticeText.setText(""));
  }
  toggleFlee(){
    if(this.finished||this.battle.status!=="running")return;
    if(this.battle.phase!=="action"){this.notice("SEND COMMANDS TO ESCAPE");return;}
    if(this.fleeing){this.fleeing=false;this.fleeRemaining=0;this.runButtonText.setText("RUN");this.fleeLabel.setText("");this.fleeGraphics.clear();this.notice("ESCAPE CANCELLED");return;}
    this.fleeing=true;this.fleeRemaining=this.fleeDuration;this.runButtonText.setText("CANCEL");this.fleeLabel.setText("ESCAPING");
  }
  cancelFlee(){
    if(!this.fleeing)return;
    this.fleeing=false;this.fleeRemaining=0;this.runButtonText.setText("RUN");this.fleeLabel.setText("");this.fleeGraphics.clear();
    this.notice("ESCAPE INTERRUPTED");
  }
  escapeBattle(){
    if(this.finished)return;
    this.finished=true;this.fleeing=false;
    state.save.fieldHp=Math.max(1,this.battle.p.hp);state.wildEncounter=null;persist();audio.setActive(false);
    this.cameras.main.fadeOut(180,5,14,24);
    this.time.delayedCall(180,()=>this.scene.start("Overworld"));
  }
  updateFlee(dt){
    if(!this.fleeing)return;
    this.fleeRemaining=Math.max(0,this.fleeRemaining-dt);
    const ratio=1-this.fleeRemaining/this.fleeDuration;
    this.fleeGraphics.clear().fillStyle(0x152534,.9).fillRoundedRect(1086,181,96,4,2).fillStyle(C.rose).fillRoundedRect(1086,181,96*ratio,4,2);
    if(this.fleeRemaining<=0)this.escapeBattle();
  }
  refreshHand() {
    const cards = this.battle.cards.hand;
    this.handSignature = cards.join("|");
    this.cardLayer.removeAll(true);
    this.handViews = [];
    for (let i = 0; i < 5; i++) {
      const id = cards[i], x = 132, y = 220 + i * 82;
      if (!id) {
        const back = this.add.rectangle(x,y,201,68,0x0b2134).setStrokeStyle(1,0x32617b).setAlpha(.28);
        this.handViews[i] = back;
        this.cardLayer.add(back);
        continue;
      }
      const view=this.add.container(x,y);
      const accent=id==='gold'?C.gold:C.edge;
      const shape=this.add.graphics();
      shape.fillStyle(i===0?0x14293a:0x0b1725,.98).fillRoundedRect(-100,-33,200,66,7);
      shape.lineStyle(i===0?1.5:1,i===0?accent:0x294455,i===0?.82:.7).strokeRoundedRect(-100,-33,200,66,7);
      if(i===0)shape.fillStyle(C.rose,.92).fillPoints([{x:-94,y:-28},{x:-70,y:-28},{x:-75,y:-25},{x:-94,y:-25}],true);
      view.add(shape);
      const art=this.textures.exists('premium-'+id)?'premium-'+id:'card-'+id;
      view.add(this.add.image(-68,0,art).setDisplaySize(49,49));
      view.add(text(this,-33,-8,CARDS[id].name,13,C.paper,{fontStyle:'bold',wordWrap:{width:104},maxLines:1}).setOrigin(0,.5));
      if(i===0){
        const keyBg=this.add.graphics();keyBg.fillStyle(C.rose,.95).fillRoundedRect(68,-12,22,24,4);view.add(keyBg);
        view.add(label(this,79,0,'Z',10,C.paper,{fontStyle:'bold'}).setOrigin(.5));
      }else view.add(label(this,87,0,String(i+1).padStart(2,'0'),8,C.muted).setOrigin(1,.5));
      if(i===0){view.setSize(200,66).setInteractive({useHandCursor:true});view.on('pointerup',()=>this.playCard(0));}
      this.handViews[i] = view;
      this.cardLayer.add(view);
      view.on("pointerover", () => {
        if(i===0)this.tweens.add({ targets: view, x: 138, duration: 100 });
        this.cardLayer.bringToTop(view);
      });
      view.on("pointerout", () => {
        if(i===0)this.tweens.add({ targets: view, x, duration: 100 });
      });
    }
  }
  syncView() {
    const b = this.battle, cards = b.cards;
    this.board.clear();
    this.aura.clear();
    this.enemyBars.clear();
    const time = this.time.now / 1e3;
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      const p2 = pos(col, row), mine = col < 4 || col === 4 && b.p.grab > b.time, h = b.hazards.find((h2) => h2.x === col && h2.y === row), danger = b.attacks.some((a) => a.cells.some((cell) => cell.x === col && cell.y === row));
      let fill = mine ? 0x246db6 : 0xb44859, edge = mine ? 0x78d9ff : 0xff94a6;
      if (h) {
        fill = h.kind === "fire" ? 11820863 : h.kind === "ice" ? 7904428 : 6721433;
        edge = h.kind === "fire" ? 15907693 : 12706274;
      }
      if (danger) {
        fill = Math.sin(time * 18) > 0 ? 13203804 : 10832969;
        edge = 16768433;
      }
      const pts = [new Phaser.Geom.Point(p2.x - 46, p2.y - 26), new Phaser.Geom.Point(p2.x + 46, p2.y - 26), new Phaser.Geom.Point(p2.x + 64, p2.y + 26), new Phaser.Geom.Point(p2.x - 28, p2.y + 26)];
      this.board.fillStyle(2959408, 0.65);
      this.board.fillPoints(pts.map((q) => new Phaser.Geom.Point(q.x, q.y + 7)), true);
      this.board.fillStyle(fill, 0.9);
      this.board.fillPoints(pts, true);
      this.board.lineStyle(2, edge, 0.8);
      this.board.strokePoints(pts, true);
      if (danger) {
        this.board.lineStyle(3, 16770494, 0.8);
        this.board.lineBetween(p2.x - 7, p2.y - 12, p2.x + 6, p2.y + 6);
        this.board.lineBetween(p2.x + 6, p2.y - 12, p2.x - 7, p2.y + 6);
      }
    }
    const p = pos(b.p.x, b.p.y), heroId = b.operator;
    this.hero.setPosition(p.x + 12, p.y + 5 + Math.sin(time * 3) * 2).setTexture(heroId + (this.heroPose > this.time.now ? "-attack" : "-idle")).setFlipX(heroId === "nova").setDepth(10 + b.p.y);
    this.hero.setAlpha(b.p.inv > 0 && Math.floor(time * 16) % 2 === 0 ? 0.45 : 1);
    if (b.p.shield > 0) {
      this.aura.lineStyle(2, C.gold, 0.8);
      this.aura.strokeEllipse(p.x + 12, p.y - 64, 85, 140);
    }
    if (b.p.boost > b.time) {
      this.aura.lineStyle(3, C.mint, 0.65);
      this.aura.strokeCircle(p.x + 12, p.y - 72, 45);
    }
    for (const e of b.enemies) {
      let sprite = this.enemies.get(e.id);
      if (!sprite) {
        const isHero2 = ["nova", "echo"].includes(e.type);
        const chapter = MISSIONS.indexOf(this.mission);
        const zone = this.mission.region ?? (chapter >= 0 ? ["garden","aqueduct","archive"][Math.floor(chapter/3)] : null);
        const themed = "virus-" + zone;
        const key = isHero2 ? e.type + "-idle" : e.boss || !this.textures.exists(themed) ? "monster-" + e.type : themed;
        sprite = this.add.sprite(0, 0, key).setOrigin(0.5, isHero2 ? 120 / 128 : 0.94).setDisplaySize(e.boss ? 136 : 105, e.boss ? 136 : 105);
        this.enemies.set(e.id, sprite);
      }
      sprite.setVisible(e.hp > 0);
      if (e.hp <= 0) continue;
      const q = pos(e.x, e.y), isHero = ["nova", "echo"].includes(e.type);
      if (isHero) {
        const id = e.type === "queen" ? "echo" : e.type;
        sprite.setTexture(id + (this.enemyPoses[e.id] > this.time.now ? "-attack" : "-idle")).setFlipX(id !== "nova");
      }
      sprite.setPosition(q.x, q.y + 5 + Math.sin(time * 4 + e.id) * 2).setDepth(10 + e.y).setAlpha(e.flash > 0 ? 0.55 : 1);
      if (e.frozen > b.time) sprite.setTint(10802669);
      else if (sprite.texture.key.startsWith("virus-") && e.type === "flare") sprite.setTint(0xffbba4);
      else if (sprite.texture.key.startsWith("virus-") && e.type === "frost") sprite.setTint(0xa8daff);
      
      else sprite.clearTint();
      this.enemyBars.fillStyle(C.ink, 0.85);
      this.enemyBars.fillRect(q.x - 31, q.y - 135, 62, 5);
      this.enemyBars.fillStyle(e.boss ? C.rose : C.gold);
      this.enemyBars.fillRect(q.x - 31, q.y - 135, 62 * e.hp / e.max, 5);
    }
    for (const [shot, image] of this.shots) if (!b.shots.includes(shot)) {
      image.destroy();
      this.shots.delete(shot);
    }
    for (const shot of b.shots) {
      let image = this.shots.get(shot);
      if (!image) {
        image = this.add.image(0, 0, "mote").setTint(shot.element === "electric" ? 16373645 : C.mint).setDisplaySize(shot.kind === "prism" ? 52 : 24, shot.kind === "buster" ? 7 : 14).setDepth(30);
        this.shots.set(shot, image);
      }
      const q = pos(shot.x, shot.y);
      image.setPosition(q.x, q.y - 70);
    }
    const max = b.enemies.reduce((n, e) => n + e.max, 0), hp = b.enemies.reduce((n, e) => n + e.hp, 0);
    this.hpText.setText("HP " + b.p.hp);
    this.enemyHp.setText(hp + " / " + max);
    this.enemyName.setText(b.enemies.length === 1 ? b.enemies[0].name.toUpperCase() : b.enemies.filter((e) => e.hp > 0).length + " VIRUSES");
    this.timeText.setText(String(Math.floor(b.time / 60)).padStart(2, "0") + ":" + String(Math.floor(b.time % 60)).padStart(2, "0") + (b.endless ? "  ·  WAVE " + b.wave : ""));
    this.healthGraphics.clear().fillStyle(5654591).fillRoundedRect(70, 113, 275, 6, 3).fillRoundedRect(934, 113, 275, 6, 3).fillStyle(C.mint).fillRoundedRect(70, 113, 275 * b.p.hp / 300, 6, 3).fillStyle(C.rose).fillRoundedRect(934, 113, 275 * hp / max, 6, 3);
    this.focusGraphics.clear();
    const ready=b.customGauge>=b.customDuration;
    this.focusGraphics.fillStyle(0x102839).fillRoundedRect(640,495,390,12,5).fillStyle(ready?0xffd66e:0x5ee0ed).fillRoundedRect(640,495,390*b.customGauge/b.customDuration,12,5);
    this.focusText.setText(ready?"CUSTOM READY":"CUSTOM").setColor(ready?"#ff4766":"#8da5ba");
    this.customBtn.setAlpha(ready?1:.58);
    if(b.busterCharge>0){this.aura.lineStyle(3,b.busterCharge>=.9?0xffd66e:0x66efff,.9);this.aura.strokeCircle(p.x+12,p.y-70,25+Math.sin(time*18)*4);}
    this.resolveText.setText(OPERATORS[b.operator].special.toUpperCase());
    this.resolveBtn.setAlpha(b.p.charge >= 100 ? 1 : 0.55);
    if (cards.hand.join("|") !== this.handSignature) this.refreshHand();
    this.handViews.forEach((child, index) => {
      const id = cards.hand[index];
      if (id) child.setAlpha(index===0?1:.65);
    });
  }
  burst(x, y, color, count = 16) {
    if (!state.save.settings.particles) return;
    const emitter = this.add.particles(x, y, "mote", { speed: { min: 40, max: 190 }, lifespan: { min: 200, max: 600 }, scale: { start: 0.6, end: 0 }, gravityY: 150, tint: color, emitting: false }).setDepth(40);
    emitter.explode(count);
    this.time.delayedCall(700, () => emitter.destroy());
  }
  float(x, y, value, color = C.paper, size = 26) {
    const obj = text(this, x, y, value, size, color, { fontStyle: "bold", stroke: "#251e2f", strokeThickness: 4 }).setOrigin(0.5).setDepth(80);
    this.tweens.add({ targets: obj, y: y - 45, alpha: 0, duration: 750, ease: "Cubic.easeOut", onComplete: () => obj.destroy() });
  }
  processEvents() {
    for (const event of this.battle.drain()) {
      const p = pos(event.x ?? this.battle.p.x, event.y ?? this.battle.p.y);
      if(event.type!=="attackLaunch")audio.play(event.type === "shot" && event.charged ? "charged" : event.type);
      if (["shot", "chip", "overdrive"].includes(event.type)) this.heroPose = this.time.now + (event.type === "shot" ? 120 : 350);
      switch (event.type) {
        case "shot":
          if(event.charged)this.completeTutorialAction("charge");
          if(event.charged)impact(this,p.x+28,p.y-67,0x83f3ff,1.4);
          break;
        case "hit":
          impact(this,p.x,p.y-60,0x86eaff,event.amount>=60?1.6:1);
          this.float(p.x, p.y - 120, "−" + event.amount, C.paper, 24);
          if (state.save.settings.shake) this.cameras.main.shake(55, 2e-3);
          break;
        case "hurt":
          this.cancelFlee();
          impact(this,p.x,p.y-60,0xff637f,1.3);
          this.float(p.x, p.y - 125, "−" + event.amount, C.rose, 28);
          if (state.save.settings.shake) this.cameras.main.shake(110, 6e-3);
          break;
        case "heal":
          this.float(p.x, p.y - 130, "+" + event.amount, C.mint);
          break;
        case "block":
          this.cancelFlee();
          this.float(p.x, p.y - 120, "WARDED", C.gold, 20);
          break;
        case "delete":
          this.burst(p.x, p.y - 65, C.gold, 40);
          break;
        case "chip":
          this.notice(CARDS[event.id].name);
          this.cardFly(event.id);
          break;
        case "venom": this.burst(p.x,p.y-65,0xa9cf6a,24);break;
        case "reflect":this.float(p.x,p.y-110,"REFLECT",C.mint,19);this.burst(p.x,p.y-60,0xc6b0de,12);break;
        case "focus":this.float(p.x,p.y-120,"+3 FOCUS",C.gold,24);break;
        case "meteorTell":{const marker=this.add.ellipse(p.x,p.y,110,45,0xe48b65,.3).setStrokeStyle(3,0xffd5a4).setDepth(25);this.tweens.add({targets:marker,alpha:.8,scale:1.12,duration:220,yoyo:true,repeat:3,onComplete:()=>marker.destroy()});break;}
        case "meteor":{const star=this.add.image(p.x+40,100,"mote").setTint(0xffb06e).setDisplaySize(45,45).setDepth(40);this.tweens.add({targets:star,x:p.x,y:p.y-30,duration:220,onComplete:()=>{star.destroy();this.burst(p.x,p.y-30,0xffb875,50);if(state.save.settings.shake)this.cameras.main.shake(140,.007);}});break;}
        case "combo":
          this.notice(event.text.replace("OVERLOAD", "TEMPEST"));
          this.burst(p.x, p.y - 70, C.gold, 25);
          break;
        case "notice":
          this.notice(event.text.replace("CHIP", "COMMAND"));
          break;
        case "attackLaunch": {
          this.enemyPoses[event.owner] = this.time.now + 300;
          const owner = this.battle.enemies.find(enemy=>enemy.id===event.owner);
          if(!owner)break;
          const origin = pos(owner.x,owner.y);
          const color = typeof event.color==='string' ? Number(event.color.replace('#','0x')) : event.color ?? C.rose;
          const source = {x:origin.x-27,y:origin.y-63};
          impact(this,source.x,source.y,color,.83);
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          for (const cell of event.cells) {
            const q = pos(cell.x,cell.y);
            const streak = this.add.rectangle(source.x,source.y,34,7,color,.88).setDepth(29);
            streak.setRotation(Math.atan2(q.y-29-source.y,q.x-source.x));
            this.tweens.add({targets:streak,x:q.x,y:q.y-29,duration:reduced?55:Math.max(55,(event.fireAt-this.battle.time)*1000),ease:'Quad.easeIn',onComplete:()=>{
              streak.destroy();
            }});
          }
          break;
        }
        case "attack":
          for(const cell of event.cells){
            const q=pos(cell.x,cell.y);
            impact(this,q.x,q.y-29,C.rose,.65);
          }
          break;
        case "lightning": {
          const g = this.add.graphics().setDepth(35);
          g.lineStyle(7, 16772534);
          g.beginPath();
          g.moveTo(p.x + 25, 150);
          g.lineTo(p.x - 12, p.y - 110);
          g.lineTo(p.x + 20, p.y - 115);
          g.lineTo(p.x, p.y - 20);
          g.strokePath();
          this.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() });
          break;
        }
        case "slash": {
          const arc = this.add.graphics().setDepth(30);
          arc.lineStyle(12, event.gold ? 16768899 : 14216638);
          arc.beginPath();
          arc.arc(p.x + 80, p.y - 65, 90, -1.1, 1.1);
          arc.strokePath();
          this.tweens.add({ targets: arc, alpha: 0, x: 28, duration: 300, onComplete: () => arc.destroy() });
          break;
        }
        case "wave": {
          const wave = this.add.rectangle(p.x, p.y - 35, 42, 83, event.color === "#ff9770" ? 14848345 : 10080221, 0.8).setDepth(29);
          this.tweens.add({ targets: wave, x: 1150, alpha: 0, duration: 500, onComplete: () => wave.destroy() });
          break;
        }
        case "overdrive":
          this.notice(OPERATORS[this.battle.operator].special);
          this.cameras.main.flash(250, 226, 204, 153, false);
          for (const e of this.battle.enemies) {
            const q = pos(e.x, e.y);
            this.burst(q.x, q.y - 60, C.gold, 25);
          }
          break;
        case "phase":
          this.notice(event.name + " · phase " + event.phase);
          break;
        case "newwave":
          this.enemies.forEach((s) => s.destroy());
          this.enemies.clear();
          this.notice("Wave " + event.wave + " · Restored 40 health");
          break;
        case "reshuffle":
          this.notice("Your discard returns to the deck.");
          audio.play("chip");
          break;
        case "victory":
          this.finish(true);
          break;
        case "defeat":
          this.finish(false);
          break;
      }
    }
  }
  cardFly(id) {
    const view = cardView(this, id, 640, 520, 0.5, { catalog: CARDS });
    view.setDepth(70);
    this.tweens.add({ targets: view, x: 1204, y: 589, scaleX: 0.15, scaleY: 0.15, angle: 35, alpha: 0, duration: 350, onComplete: () => view.destroy() });
  }
  finish(win) {
    if (this.finished) return;
    this.finished = true;
    if(win&&this.tutorialActive)this.finishTutorial();
    audio.setActive(false);
    let gains = null, result = this.battle.result ?? {}, mission = this.mission;
    if (win || this.battle.endless && this.battle.wave > 1) {
      if (!win) {
        const cleared = this.battle.wave - 1;
        mission = { ...mission, reward: cleared * 25, xp: cleared * 25 };
        result = { ...result, rank: "B", time: this.battle.time, wave: cleared };
      }
      gains = reward(state.save, mission, result);
      if(state.wildEncounter&&!state.save.world.wildDefeated.includes(state.wildEncounter))state.save.world.wildDefeated.push(state.wildEncounter);
      state.wildEncounter=null;
      state.save.fieldHp = win ? this.battle.p.hp : 300;
      state.result = { ...result, gains };
      persist();
      this.time.delayedCall(1100, () => transition(this, "Rewards"));
      this.notice(gains.card ? "COMMAND FOUND" : gains.decor ? "POCKET DECOR FOUND" : "VIRUS DELETED");
    } else {
      state.save.fieldHp = 300;
      state.save.stats.kills += this.battle.kills;
      state.save.stats.combos += this.battle.combos;
      state.save.stats.damage += this.battle.damage;
      persist();
      this.time.delayedCall(500, () => modal(this, { title: "Navi down.", body: "Your deck and gold are safe. Adjust your commands and try again.", yes: "Retry", no: "Leave", portrait: state.save.operator + "-portrait", onYes: () => this.scene.restart(), onNo: () => this.scene.start("Overworld") }));
    }
  }
  update(_time, delta) {
    if (!this.battle) return;
    const dt = Math.min(delta / 1e3, 0.05);
    const k = this.keys;
    const oldX=this.battle.p.x,oldY=this.battle.p.y;
    this.battle.update(dt, { dx: this.touch.dx + (k.right.isDown || k.arrowRight.isDown ? 1 : 0) - (k.left.isDown || k.arrowLeft.isDown ? 1 : 0), dy: this.touch.dy + (k.down.isDown || k.arrowDown.isDown ? 1 : 0) - (k.up.isDown || k.arrowUp.isDown ? 1 : 0), fire: this.touch.fire || k.fire.isDown });
    if(this.battle.p.x!==oldX||this.battle.p.y!==oldY)this.completeTutorialAction("move");
    this.processEvents();
    this.updateFlee(dt);
    this.syncView();
  }
}
export {
  Combat
};
