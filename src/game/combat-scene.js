import Phaser from "phaser";
import { NetworkBattle } from "../../dist/network-battle.js";
import { chipTile, drawCustom } from "./custom-screen.js";
import { ENEMIES } from "../../dist/combat.js";
import { reward, MISSIONS } from "../../dist/core.js";
import { validateDeck, CARD_COST } from "../../dist/deck.js";
import { state, audio, persist, announce, near, CARDS, OPERATORS } from "./state.js";
import { W, H, C, text, label, panel, button, background, modal, toast, cardView, shortDesc, systemButtons, fullscreen, transition, startFade } from "./ui.js";
const pos = (x, y) => ({ x: 180 + x * 155 + y * 32, y: 268 + y * 66 });
class Combat extends Phaser.Scene {
  constructor() {
    super("Combat");
  }
  async create() {
    if (state.walletDeck) {
      await near.refresh();
      if (!near.player || near.account !== state.walletDeck.account) {
        state.walletDeck = null;
        this.scene.start("Network");
        return;
      }
      state.walletDeck.items = Object.fromEntries(Object.keys(CARDS).map((id, i) => [id, near.player.items[i]]));
    }
    this.finished = false;
    this.pausedDialog = false;
    this.handSignature = "";
    this.heroPose = 0;
    this.enemyPoses = {};
    this.mission = state.mission ?? MISSIONS[0];
    const deck = state.walletDeck?.deck ?? state.save.deck;
    if (!validateDeck(deck, state.walletDeck?.items ?? state.save.items, CARDS)) {
      this.scene.start("Deck");
      return;
    }
    this.battle = new NetworkBattle({ mission: this.mission, deck, equipment: state.walletDeck?.equipment ?? state.save.equipment, operator: state.save.operator, seed: Date.now(), endless: state.endless });
    if(this.textures.exists("network-battle"))this.add.image(640,360,"network-battle").setDisplaySize(1280,720);else this.cameras.main.setBackgroundColor(0x061627);
    const grid=this.add.graphics().setDepth(-1);grid.lineStyle(1,0x1e718a,.35);for(let x=0;x<1280;x+=64)grid.lineBetween(x,160,x,720);for(let y=160;y<720;y+=40)grid.lineBetween(0,y,1280,y);
    this.add.rectangle(W / 2, 80, W - 58, 120, C.ink, 0.82).setStrokeStyle(1, C.gold, 0.5);
    this.board = this.add.graphics();
    this.aura = this.add.graphics();
    this.hero = this.add.sprite(0, 0, state.save.operator + "-idle").setOrigin(0.5, 120 / 128).setDisplaySize(148, 148);
    this.enemies = /* @__PURE__ */ new Map();
    this.shots = /* @__PURE__ */ new Map();
    this.enemyBars = this.add.graphics();
    this.cardLayer = this.add.container(0, 0);
    this.focusGraphics = this.add.graphics();
    this.healthGraphics = this.add.graphics();
    this.hpText = text(this, 71, 77, "300 / 300", 27, C.paper, { fontStyle: "bold" });
    label(this, 72, 44, OPERATORS[state.save.operator].name.toUpperCase(), 14, C.gold);
    this.enemyHp = text(this, 1209, 77, "", 27, C.paper, { fontStyle: "bold" }).setOrigin(1, 0);
    this.enemyName = label(this, 1209, 44, "", 13, C.rose).setOrigin(1, 0);
    text(this, W / 2, 42, this.mission.name, 29, C.paper).setOrigin(0.5);
    this.timeText = label(this, W / 2, 81, "00:00", 13, C.muted).setOrigin(0.5);
    this.add.rectangle(76,589,65,100,0x102b40).setStrokeStyle(2,0x5bbbd3);
    this.drawText = label(this, 77, 655, "", 11, C.paper, { align: "center" }).setOrigin(0.5);
    this.add.rectangle(1204,589,65,100,0x102b40).setStrokeStyle(2,0x5bbbd3);
    this.discardText = label(this, 1203, 655, "", 11, C.paper, { align: "center" }).setOrigin(0.5);
    this.focusText = label(this, W / 2, 490, "CUSTOM GAUGE", 12, C.paper).setOrigin(0.5);
    this.resolveText = label(this, 48, 430, "", 11, C.paper);
    this.resolveBtn = button(this, 155, 469, 220, 34, "Resolve  [E]", () => this.castResolve(), { size: 16, small: true });
    this.tipText = text(this, W / 2, 701, "Z / 1: next chip   ·   WASD: move   ·   Hold / release Space: buster   ·   C: Custom", 13, C.paper, { align: "center" }).setOrigin(0.5);
    this.noticeText = text(this, W / 2, 167, "", 23, C.gold, { fontStyle: "bold", stroke: "#251e2f", strokeThickness: 4, align: "center" }).setOrigin(0.5).setDepth(100);
    button(this, 1187, 691, 118, 29, "Pause Ⅱ", () => this.pauseBattle(), { size: 15, small: true });
    button(this, 1190, 144, 100, 28, "⛶", () => fullscreen(this), { size: 20, small: true });
    button(this,1000,469,235,34,"CUSTOM  [C]",()=>this.openCustom(),{size:17,small:true});
    this.keys = this.input.keyboard.addKeys({ up: "W", down: "S", left: "A", right: "D", arrowUp: "UP", arrowDown: "DOWN", arrowLeft: "LEFT", arrowRight: "RIGHT", fire: "SPACE" });
    this.input.keyboard.on("keydown", (e) => {
      if (e.repeat && /^[1-5eE]$/.test(e.key)) return;
      if (/^[1-5]$/.test(e.key)) this.playCard(+e.key - 1);
      if(e.key.toLowerCase()==="z")this.playCard(0);
      if(e.key.toLowerCase()==="c")this.openCustom();
      if(e.key==="Enter"&&this.customRoot)this.sendCustom();
      if (e.key.toLowerCase() === "e") this.castResolve();
      if (e.key === "Escape") {
        if (this.pausedDialog) {
          this.pauseRoot?.destroy();
          this.pausedDialog = false;
          this.battle.pause();
          audio.setActive(true);
        } else this.pauseBattle();
      }
    });
    this.input.keyboard.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.touch = { dx: 0, dy: 0, fire: false };
    if (this.game.device.input.touch) this.touchControls();
    const suspend = () => {
      if (this.battle.status === "running") this.pauseBattle();
    };
    this.game.events.on(Phaser.Core.Events.BLUR, suspend);
    this.events.once("shutdown", () => {
      this.game.events.off(Phaser.Core.Events.BLUR, suspend);
      audio.setActive(false);
    });
    this.input.on("pointerup", () => {
      this.touch.dx = 0;
      this.touch.dy = 0;
      this.touch.fire = false;
    });
    startFade(this);
    this.refreshHand();
    this.syncView();
    this.begin();
  }
  begin() {
    state.save.stats.battles++;
    persist();
    this.battle.start();
    drawCustom(this);
    audio.unlock();
    audio.configure(state.save.settings);
    audio.setActive(true);
    announce(this.mission.name + ". Battle begins. Select chips in Custom, send with Enter, use the next chip with Z. Hold Space to charge the buster.");
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
  selectCustom(index){if(this.battle.cards.select(index))drawCustom(this);else this.notice("Chip codes do not match.");}
  openCustom(){if(this.battle.openCustom()){drawCustom(this);audio.setActive(false);}else if(this.battle.phase!=="custom")this.notice("Custom Gauge is still charging.");}
  sendCustom(){if(!this.battle.confirmCustom())return;this.customRoot?.destroy();this.customRoot=null;this.touch.fire=false;this.refreshHand();this.processEvents();audio.setActive(true);}
  playCard(index) {
    if(this.battle.phase==='custom'){this.selectCustom(index);return;}
    if(this.battle.useCard(index)){audio.play('chip');this.refreshHand();this.processEvents();}
    else if(this.battle.status==='running')this.notice(index?'Use chips in order with Z.':'No chips loaded. Fill the gauge, then press C.');
  }
  castResolve() {
    this.battle.overdrive();
    this.processEvents();
  }
  notice(message) {
    this.noticeText.setText(message);
    this.noticeClear?.remove();
    this.noticeClear = this.time.delayedCall(1650, () => this.noticeText.setText(""));
  }
  pauseBattle() {
    if (this.pausedDialog || this.finished || this.battle.status !== "running") return;
    this.pausedDialog = true;
    this.battle.pause();
    audio.setActive(false);
    this.pauseRoot = modal(this, { title: "Rest a moment.", body: "The road can wait. Return when you’re ready, or leave this encounter to work on your deck. Your cards and gold stay with you.", yes: "Keep going", no: "Leave encounter", portrait: state.save.operator + "-portrait", onYes: () => {
      this.pausedDialog = false;
      this.battle.pause();
      audio.setActive(true);
    }, onNo: () => this.scene.start("Overworld") });
  }
  refreshHand() {
    const cards = this.battle.cards.hand;
    this.handSignature = cards.join("|");
    this.cardLayer.removeAll(true);
    this.handViews = [];
    for (let i = 0; i < 5; i++) {
      const id = cards[i], x = 260 + i * 190, y = 602;
      if (!id) {
        const back = this.add.rectangle(x,y,135,125,0x0b2134).setStrokeStyle(1,0x32617b).setAlpha(.6);
        this.handViews[i] = back;
        this.cardLayer.add(back);
        this.cardLayer.add(label(this, x, y + 2, "NO CHIP", 17, C.paper).setOrigin(0.5));
        continue;
      }
      const view = chipTile(this, id, x, y, 0.83, { onClick: () => this.playCard(i) });
      view.setAngle((i - 2) * 1.7);
      this.handViews[i] = view;
      this.cardLayer.add(view);
      view.on("pointerover", () => {
        this.tweens.add({ targets: view, y: 579, angle: 0, duration: 100 });
        this.tipText.setText(CARDS[id].name + " · " + CARDS[id].desc + " · " + (i===0?"Z: USE NEXT":"QUEUED "+(i+1)));
        this.cardLayer.bringToTop(view);
      });
      view.on("pointerout", () => {
        this.tweens.add({ targets: view, y, angle: (i - 2) * 1.7, duration: 100 });
        this.tipText.setText("Z / 1: next chip   ·   WASD: move   ·   Hold / release Space: buster   ·   C: Custom");
      });
    }
  }
  syncView() {
    const b = this.battle, cards = b.cards;
    this.board.clear();
    this.aura.clear();
    this.enemyBars.clear();
    const time = this.time.now / 1e3;
    for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
      const p2 = pos(col, row), mine = col < 3 || col === 3 && b.p.grab > b.time, h = b.hazards.find((h2) => h2.x === col && h2.y === row), danger = b.attacks.some((a) => a.cells.some((cell) => cell.x === col && cell.y === row));
      let fill = mine ? 0x246db6 : 0xb44859, edge = mine ? 0x78d9ff : 0xff94a6;
      if (h) {
        fill = h.kind === "fire" ? 11820863 : h.kind === "ice" ? 7904428 : 6721433;
        edge = h.kind === "fire" ? 15907693 : 12706274;
      }
      if (danger) {
        fill = Math.sin(time * 18) > 0 ? 13203804 : 10832969;
        edge = 16768433;
      }
      const pts = [new Phaser.Geom.Point(p2.x - 77, p2.y - 33), new Phaser.Geom.Point(p2.x + 78, p2.y - 33), new Phaser.Geom.Point(p2.x + 110, p2.y + 33), new Phaser.Geom.Point(p2.x - 45, p2.y + 33)];
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
        const isHero2 = ["nova", "echo"].includes(e.type), key = isHero2 ? e.type + "-idle" : "monster-" + e.type;
        sprite = this.add.sprite(0, 0, key).setOrigin(0.5, isHero2 ? 120 / 128 : 0.94).setDisplaySize(e.boss ? 148 : 115, e.boss ? 148 : 115);
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
    this.hpText.setText(b.p.hp + " / 300");
    this.enemyHp.setText(hp + " / " + max);
    this.enemyName.setText(b.enemies.length === 1 ? b.enemies[0].name.toUpperCase() : b.enemies.filter((e) => e.hp > 0).length + " VIRUSES");
    this.timeText.setText(String(Math.floor(b.time / 60)).padStart(2, "0") + ":" + String(Math.floor(b.time % 60)).padStart(2, "0") + (b.endless ? "  ·  WAVE " + b.wave : ""));
    this.healthGraphics.clear().fillStyle(5654591).fillRoundedRect(70, 113, 275, 6, 3).fillRoundedRect(934, 113, 275, 6, 3).fillStyle(C.mint).fillRoundedRect(70, 113, 275 * b.p.hp / 300, 6, 3).fillStyle(C.rose).fillRoundedRect(934, 113, 275 * hp / max, 6, 3);
    this.focusGraphics.clear();
    const ready=b.customGauge>=b.customDuration;
    this.focusGraphics.fillStyle(0x102839).fillRect(470,451,340,17).fillStyle(ready?0xffd66e:0x5ee0ed).fillRect(470,451,340*b.customGauge/b.customDuration,17);
    this.focusText.setText(ready?"CUSTOM READY · PRESS C":"CUSTOM GAUGE · "+Math.floor(b.customGauge/b.customDuration*100)+"%");
    if(b.busterCharge>0){this.aura.lineStyle(3,b.busterCharge>=.9?0xffd66e:0x66efff,.9);this.aura.strokeCircle(p.x+12,p.y-70,25+Math.sin(time*18)*4);}
    this.drawText.setText("FOLDER\n" + cards.drawPile.length + " CARDS");
    this.discardText.setText("SPENT\n" + cards.discard.length + " CARDS");
    this.resolveText.setText(OPERATORS[b.operator].special.toUpperCase() + "  " + Math.floor(b.p.charge) + "%");
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
      audio.play(event.type);
      if (["shot", "chip", "overdrive"].includes(event.type)) this.heroPose = this.time.now + (event.type === "shot" ? 120 : 350);
      switch (event.type) {
        case "hit":
          this.burst(p.x, p.y - 60, C.gold, 11);
          this.float(p.x, p.y - 120, "−" + event.amount, C.paper, 24);
          if (state.save.settings.shake) this.cameras.main.shake(55, 2e-3);
          break;
        case "hurt":
          this.burst(p.x, p.y - 60, C.rose, 20);
          this.float(p.x, p.y - 125, "−" + event.amount, C.rose, 28);
          if (state.save.settings.shake) this.cameras.main.shake(110, 6e-3);
          break;
        case "heal":
          this.float(p.x, p.y - 130, "+" + event.amount, C.mint);
          break;
        case "block":
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
          this.notice(event.text.replace("CHIP", "CARD"));
          break;
        case "attack":
          this.enemyPoses[event.owner] = this.time.now + 300;
          for (const cell of event.cells) {
            const q = pos(cell.x, cell.y), line = this.add.rectangle(q.x, q.y - 28, 9, 86, C.rose, 0.8).setDepth(25);
            this.tweens.add({ targets: line, alpha: 0, scaleX: 3, duration: 220, onComplete: () => line.destroy() });
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
      state.save.items[gains.card]--;
      const pool = Object.keys(CARDS).filter((id) => CARDS[id].type !== "equipment" && id !== "gold");
      const choices = [gains.card];
      while (choices.length < 3) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        if (!choices.includes(id)) choices.push(id);
      }
      state.save.pendingReward = { choices, missionId: mission.id };
      state.result = { ...result, gains };
      persist();
      this.time.delayedCall(1100, () => transition(this, "Rewards"));
      this.notice(win ? "Victory · A new page awaits." : "A journey worth remembering.");
    } else {
      state.save.stats.kills += this.battle.kills;
      state.save.stats.combos += this.battle.combos;
      state.save.stats.damage += this.battle.damage;
      persist();
      this.time.delayedCall(500, () => modal(this, { title: "Even the best stories have setbacks.", body: "No cards or gold were lost. Refine your deck, read the marked ground, and try another approach.", yes: "Try again", no: "Back to the road", portrait: state.save.operator + "-portrait", onYes: () => this.scene.restart(), onNo: () => this.scene.start("Overworld") }));
    }
  }
  update(_time, delta) {
    if (!this.battle) return;
    const dt = Math.min(delta / 1e3, 0.05);
    const k = this.keys;
    this.battle.update(dt, { dx: this.touch.dx + (k.right.isDown || k.arrowRight.isDown ? 1 : 0) - (k.left.isDown || k.arrowLeft.isDown ? 1 : 0), dy: this.touch.dy + (k.down.isDown || k.arrowDown.isDown ? 1 : 0) - (k.up.isDown || k.arrowUp.isDown ? 1 : 0), fire: this.touch.fire || k.fire.isDown });
    this.processEvents();
    this.syncView();
  }
}
export {
  Combat
};
