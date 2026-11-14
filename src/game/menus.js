import Phaser from "phaser";
import{CHIP_CODES}from"../../dist/network-battle.js";
import { state, audio, persist, announce, currentMission, operatorAvailable, saveBackup, importBackup, near, events, CARDS, OPERATORS, MISSIONS, specialDesc } from "./state.js";
import { WORLDS, QUESTS, level, missionUnlocked, questProgress, claimQuest, trade, price, forge, reward, freshSave, equip, simulateMarket } from "../../dist/core.js";
import { DECK_SIZE, MAX_COPIES, CARD_COST, deckCounts, reconcileDeck, validateDeck } from "../../dist/deck.js";
import { W, H, C, text, label, panel, button, background, heading, credits, toast, modal, cardView, shortDesc, systemButtons, transition, startFade } from "./ui.js";
const next = (scene) => {
  if (state.save.pendingReward?.choices) {
    scene.scene.start("Rewards");
    return;
  }
  scene.scene.start("Overworld");
};
class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }
  create() {
    background(this, { dim: 0.23 });
    this.add.rectangle(325, H / 2, 650, H, 2169385, 0.72);
    label(this, 85, 95, "NETBATTLE · CUSTOM · EXECUTE", 15, C.gold);
    text(this, 79, 143, "BATTLE", 103, C.paper, { fontStyle: "bold", stroke: "#2a2030", strokeThickness: 4 });
    text(this, 82, 248, "NET", 126, C.gold, { fontStyle: "bold", stroke: "#2a2030", strokeThickness: 4 });
    text(this, 88, 405, "Jack in. Build your folder. Read the grid.\nSomeone worth fighting beside.", 23, C.paper, { lineSpacing: 8 });
    const portrait = this.add.image(990, 655, state.save.operator + "-portrait").setOrigin(0.5, 1).setDisplaySize(425, 531);
    this.tweens.add({ targets: portrait, y: 648, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    label(this, 1030, 650, OPERATORS[state.save.operator].name.toUpperCase(), 18, C.paper).setOrigin(0.5);
    button(this, 252, 535, 330, 63, "JACK IN", () => next(this), { primary: true, size: 25 });
    button(this, 252, 613, 330, 51, "Chip folder", () => this.scene.start("Deck"), { size: 21 });
    button(this, 535, 612, 170, 51, "Options", () => this.scene.start("Settings"), { size: 19 });
    systemButtons(this);
    label(this, 86, 682, "" + state.save.completed.length + " / 9 CHAPTERS  ·  LEVEL " + level(state.save) + "  ·  " + state.save.credits + " GOLD", 12, C.muted);
    this.input.keyboard.once("keydown-ENTER", () => next(this));
    startFade(this);
    announce("Battle Net title screen. Begin your tale or open the deck book.");
  }
}
class Journey extends Phaser.Scene {
  constructor() {
    super("Journey");
    this.world = 0;
  }
  create(data) {
    this.world = data?.world ?? Math.min(2, Math.floor(state.save.completed.length / 3));
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Title"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.27 });
    heading(this, "NETWORK MAP", "Select a battle node or return to network exploration.", "Overworld");
    credits(this);
    for (let i = 0; i < 3; i++) button(this, 260 + i * 340, 130, 310, 44, WORLDS[i].name, () => {
      this.world = i;
      this.draw();
    }, { primary: this.world === i, size: 20 });
    const g = this.add.graphics();
    g.lineStyle(8, 2628896, 0.6);
    g.beginPath();
    g.moveTo(250, 390);
    g.lineTo(640, 290);
    g.lineTo(1030, 390);
    g.strokePath();
    g.lineStyle(2, C.gold, 0.8);
    g.beginPath();
    g.moveTo(250, 390);
    g.lineTo(640, 290);
    g.lineTo(1030, 390);
    g.strokePath();
    for (let j = 0; j < 3; j++) {
      const index = this.world * 3 + j, m = MISSIONS[index], x = 250 + j * 390, y = j === 1 ? 290 : 390, can = missionUnlocked(state.save, index), done = state.save.completed.includes(m.id);
      this.add.circle(x, y, 75, 2170153, 0.94).setStrokeStyle(3, can ? C.gold : 6708058);
      this.add.circle(x, y, 65, 3222066, 0.8).setStrokeStyle(1, C.gold, 0.4);
      const enemyKey = m.enemies[0] === "nova" || m.enemies[0] === "echo" ? m.enemies[0] + "-idle" : "monster-" + m.enemies[0];
      this.add.image(x, y - 8, enemyKey).setDisplaySize(m.boss ? 118 : 98, m.boss ? 118 : 98).setAlpha(can ? 1 : 0.4);
      label(this, x, y + 47, done ? "COMPLETE  " + (state.save.bests[m.id]?.rank ?? "") : can ? m.boss ? "RIVAL" : "CHAPTER " + (index + 1) : "LOCKED", 11, can ? C.gold : C.muted).setOrigin(0.5);
      text(this, x, y + 95, m.name, 27, can ? C.paper : C.muted, { align: "center" }).setOrigin(0.5);
      text(this, x, y + 131, m.subtitle, 16, C.paper, { align: "center" }).setOrigin(0.5);
      if (can) {
        const zone = this.add.zone(x, y, 155, 155).setInteractive({ useHandCursor: true });
        zone.on("pointerover", () => this.tweens.add({ targets: zone, scale: 1.05, duration: 100 }));
        zone.on("pointerup", () => this.brief(m));
      } else label(this, x, y + 163, "Finish the previous chapter", 11, C.muted).setOrigin(0.5);
    }
    const menu = [["Chip folder", "Deck"], ["Merchant", "Merchant"], ["The forge", "Forge"], ["Companions", "Party"], ["Journal", "Journal"]];
    menu.forEach(([title, key], i) => button(this, 174 + i * 232, 643, 212, 48, title, () => this.scene.start(key), { size: 20 }));
    button(this, 1130, 550, 180, 40, "Endless journey", () => this.brief({ id: "endless", name: "The Endless Road", sector: "∞", world: 2, brief: "How far will your story take you? Every cleared encounter restores 40 health. A fearsome rival awaits every fifth wave. Your completed waves earn gold when the journey ends.", speaker: state.save.operator, enemies: ["hex"], reward: 30, xp: 35, drop: "longsword" }, true), { size: 16, small: true });
  }
  brief(m, endless = false) {
    if (!validateDeck(state.walletDeck?.deck ?? state.save.deck, state.walletDeck?.items ?? state.save.items, CARDS)) {
      modal(this, { title: "Your deck needs a little love.", body: "Bring exactly 12 cards, with no more than 3 copies of a card. Each copy must be in your collection. The deck book will help you prepare.", yes: "Open deck book", onYes: () => this.scene.start("Deck") });
      return;
    }
    modal(this, { title: m.name, body: m.brief, yes: "Set out", no: "Not yet", portrait: (m.speaker ?? state.save.operator) + "-portrait", onYes: () => {
      state.mission = m;
      state.endless = endless;
      transition(this, "Combat");
    } });
  }
}
class Deck extends Phaser.Scene {
  constructor() {
    super("Deck");
    this.page = 0;
    this.filter = "all";
    this.selected = null;
  }
  create(data) {
    this.source = data?.wallet && state.walletDeck ? state.walletDeck : state.save;
    this.page = 0;
    this.selected = null;
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Overworld"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.55 });
    heading(this, "CHIP FOLDER", "12 chips. Choose matching codes in Custom, then send an ordered loadout.", "Overworld");
    credits(this);
    const owned = Object.keys(CARDS).filter((id) => this.filter === "all" || this.filter === "owned" && this.source.items[id] > 0 || CARDS[id].type === this.filter);
    const pages = Math.ceil(owned.length / 8);
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    const filters = [["All chips", "all"], ["Owned", "owned"], ["Attacks", "attack"], ["Support", "support"], ["Equipment", "equipment"]];
    filters.forEach(([name, id], i) => button(this, 113 + i * 163, 132, 151, 35, name, () => {
      this.filter = id;
      this.page = 0;
      this.draw();
    }, { primary: this.filter === id, size: 15, small: true }));
    panel(this, 885, 115, 350, 535, { fill: 2367018 });
    const valid = validateDeck(this.source.deck, this.source.items, CARDS);
    text(this, 912, 140, "Equipped folder", 25, C.paper);
    label(this, 912, 178, this.source.deck.length + " / 12 CHIPS  ·  " + (valid ? "READY" : "INCOMPLETE"), 13, valid ? C.mint : C.rose);
    const counts = deckCounts(this.source.deck);
    let row = 0;
    for (const [id, n] of Object.entries(counts)) {
      const y = 222 + row * 28;
      text(this, 913, y, CARDS[id].name, 17, C.paper);
      label(this, 1166, y + 2, "×" + n, 13, C.gold);
      button(this, 1202, y + 10, 30, 23, "−", () => {
        this.source.deck.splice(this.source.deck.lastIndexOf(id), 1);
        persist();
        this.draw();
      }, { small: true, size: 16 });
      row++;
    }
    label(this, 912, 465, "Chip code mix", 12, C.gold);
    const codes=["A","S","*"],curve=codes.map(code=>this.source.deck.filter(id=>CHIP_CODES[id]===code).length);
    const g = this.add.graphics();
    curve.forEach((n, i) => {
      g.fillStyle(C.mint, 0.7);
      g.fillRect(916 + i * 90, 525 - n * 4, 55, n * 4);
      label(this, 943 + i * 90, 542, "CODE "+codes[i]+" · "+n, 10, C.muted).setOrigin(0.5);
    });
    button(this, 982, 605, 139, 36, "Auto-fill", () => {
      this.source.deck = reconcileDeck(this.source.deck, this.source.items, CARDS);
      persist();
      this.draw();
    }, { size: 16, small: true });
    button(this, 1146, 605, 135, 36, "Clear", () => {
      this.source.deck = [];
      persist();
      this.draw();
    }, { size: 16, small: true });
    const ids = owned.slice(this.page * 8, this.page * 8 + 8);
    ids.forEach((id, i) => {
      const x = 143 + i % 4 * 205, y = 294 + Math.floor(i / 4) * 230, n = counts[id] ?? 0;
      const view = cardView(this, id, x, y, 0.92, { catalog: CARDS, showCount: true, count: this.source.items[id], muted: !this.source.items[id], onClick: () => this.pick(id) });
      view.on("pointerover", () => {
        this.tweens.add({ targets: view, y: y - 8, duration: 100 });
        this.detail(CARDS[id].name + ": " + CARDS[id].desc + (CARDS[id].type === "equipment" ? "" : ` In deck: ${n}/3.`));
      });
      view.on("pointerout", () => this.tweens.add({ targets: view, y, duration: 100 }));
      if (n) label(this, x, y + 110, "IN DECK ×" + n, 11, C.gold).setOrigin(0.5);
    });
    button(this, 75, 637, 52, 32, "‹", () => {
      this.page--;
      this.draw();
    }, { disabled: this.page === 0, small: true });
    label(this, 450, 637, "PAGE " + (this.page + 1) + " / " + Math.max(1, pages) + "   ·   CLICK A CARD TO ADD / EQUIP", 11, C.muted).setOrigin(0.5);
    button(this, 826, 637, 52, 32, "›", () => {
      this.page++;
      this.draw();
    }, { disabled: this.page >= pages - 1, small: true });
    this.detailText = text(this, 57, 677, "Choose a code-focused folder. Wildcard chips link with any code. Solo battles use Custom Gauge, not focus.", 16, C.paper, { wordWrap: { width: 1160 } });
  }
  detail(message) {
    this.detailText?.setText(message);
  }
  pick(id) {
    const c = CARDS[id], n = deckCounts(this.source.deck)[id] ?? 0;
    if (!this.source.items[id]) {
      toast(this, "Find this card on your journey or at the merchant.");
      return;
    }
    if (c.type === "equipment") {
      equip(this.source, id);
      persist();
      this.draw();
      toast(this, c.name + (this.source.equipment[id] ? " equipped." : " unequipped."));
      return;
    }
    if (this.source.deck.length >= DECK_SIZE) {
      toast(this, "Your deck is full. Remove a card on the right first.");
      return;
    }
    if (n >= MAX_COPIES) {
      toast(this, "Three copies is the limit for any card.");
      return;
    }
    if (n >= this.source.items[id]) {
      toast(this, "Every copy in your deck must be in your collection.");
      return;
    }
    this.source.deck.push(id);
    persist();
    this.draw();
    audio.play("chip");
  }
}
const costName = (n) => n + " FOCUS";
class Merchant extends Phaser.Scene {
  constructor() {
    super("Merchant");
    this.page = 0;
    this.mode = "buy";
    this.quantity = 1;
  }
  create() {
    this.page = 0;
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Overworld"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.45 });
    heading(this, "The Wandering Merchant", "“A good card always finds its way to the right hand.”", "Overworld");
    credits(this);
    button(this, 130, 134, 170, 39, "Buy cards", () => {
      this.mode = "buy";
      this.draw();
    }, { primary: this.mode === "buy", size: 17, small: true });
    button(this, 320, 134, 170, 39, "Sell extras", () => {
      this.mode = "sell";
      this.draw();
    }, { primary: this.mode === "sell", size: 17, small: true });
    label(this, 560, 133, "TRADE AMOUNT", 11, C.muted);
    [1, 5, 10, 25, 100].forEach((q, i) => button(this, 720 + i * 68, 134, 57, 34, String(q), () => {
      this.quantity = q;
      this.draw();
    }, { primary: this.quantity === q, size: 16, small: true }));
    const ids = Object.keys(CARDS).filter((id) => this.mode === "buy" || state.save.items[id] > 0);
    const pages = Math.max(1, Math.ceil(ids.length / 6));
    this.page = Math.min(this.page, pages - 1);
    ids.slice(this.page * 6, this.page * 6 + 6).forEach((id, i) => {
      const x = 145 + i % 6 * 198, y = 329;
      cardView(this, id, x, y, 0.94, { catalog: CARDS, showCount: true, count: state.save.items[id] });
      const unit = price(state.save, id, this.mode);
      label(this, x, 456, "STOCK " + state.save.stock[id] + "  ·  " + unit + " G / CARD", 10, C.paper).setOrigin(0.5);
      button(this, x, 495, 177, 42, `${this.mode === "buy" ? "Buy" : "Sell"} ${this.quantity} · ${unit * this.quantity} G`, () => {
        const r = trade(state.save, id, this.mode, this.quantity);
        if (r.ok) {
          persist();
          this.draw();
        }
        toast(this, r.message, r.ok ? C.mint : C.rose);
      }, { size: 15, primary: true });
    });
    panel(this, 50, 554, 1180, 74);
    text(this, 80, 572, "The market ebbs and flows.", 23, C.paper);
    label(this, 80, 603, "Scarcity raises prices. Selling pays 65%. Your deck copies and equipped gear stay with you.", 12, C.muted);
    button(this, 1050, 591, 270, 42, "A week on the road ↻", () => {
      simulateMarket(state.save, Date.now());
      persist();
      this.draw();
      toast(this, "A week of trade passes. Prices have changed.");
    }, { size: 17 });
    button(this, 86, 666, 65, 34, "‹", () => {
      this.page = Math.max(0, this.page - 1);
      this.draw();
    }, { disabled: this.page === 0, small: true });
    label(this, 230, 667, "PAGE " + (this.page + 1) + " / " + pages, 11, C.paper).setOrigin(0.5);
    button(this, 370, 666, 65, 34, "›", () => {
      this.page = Math.min(pages - 1, this.page + 1);
      this.draw();
    }, { disabled: this.page >= pages - 1, small: true });
    button(this, 1090, 666, 280, 36, "The NEAR trading hall", () => this.scene.start("Network"), { size: 17, small: true });
  }
}
class Forge extends Phaser.Scene {
  constructor() {
    super("Forge");
  }
  create() {
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Overworld"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.48 });
    heading(this, "The Gilded Forge", "A hundred ordinary blades. One extraordinary keepsake.", "Overworld");
    credits(this);
    cardView(this, "longsword", 350, 337, 1.33, { catalog: CARDS });
    const golden = cardView(this, "gold", 930, 337, 1.33, { catalog: CARDS });
    text(this, 640, 320, "→", 66, C.gold).setOrigin(0.5);
    label(this, 640, 375, "100 : 1", 20, C.paper).setOrigin(0.5);
    text(this, 350, 507, state.save.items.longsword + " / 100 owned", 22, state.save.items.longsword >= 100 ? C.mint : C.muted).setOrigin(0.5);
    text(this, 930, 507, state.save.items.gold + " in your collection", 22, C.gold).setOrigin(0.5);
    label(this, 640, 562, "IDENTICAL POWER, RANGE, AND FOCUS COST. PURELY COSMETIC.", 13, C.paper).setOrigin(0.5);
    button(this, 640, 621, 340, 55, "Gild a Longsword", () => modal(this, { title: "A golden keepsake?", body: "Consume 100 ordinary Longswords to create 1 Gold Longsword. The forge cannot undo its work. Your deck will be refilled from your remaining cards.", yes: "Forge it", onYes: () => {
      const r = forge(state.save);
      if (r.ok) {
        persist();
        audio.play("overdrive");
        this.cameras.main.flash(350, 235, 204, 130);
        this.draw();
      }
      toast(this, r.message);
    } }), { primary: true, disabled: state.save.items.longsword < 100, size: 23 });
    this.tweens.add({ targets: golden, y: 330, duration: 1900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
}
class Party extends Phaser.Scene {
  constructor() {
    super("Party");
  }
  create() {
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Overworld"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.5 });
    heading(this, "The Company You Keep", "Some journeys are too good to walk alone.", "Overworld");
    credits(this);
    Object.entries(OPERATORS).forEach(([id, o], i) => {
      const x = 250 + i * 390, can = operatorAvailable(id), selected = state.save.operator === id;
      panel(this, x - 170, 128, 340, 530, { edge: selected ? C.mint : C.gold, fill: 2169640 });
      const portrait = this.add.image(x, 415, id + "-portrait").setOrigin(0.5, 1).setDisplaySize(240, 300).setAlpha(can ? 1 : 0.42);
      text(this, x, 435, o.name, 36, C.paper).setOrigin(0.5);
      label(this, x, 469, o.title.toUpperCase(), 12, C.gold).setOrigin(0.5);
      text(this, x, 503, o.quote, 17, C.muted, { align: "center", wordWrap: { width: 295 }, fontStyle: "italic" }).setOrigin(0.5, 0);
      label(this, x, 555, o.special.toUpperCase(), 12, C.mint).setOrigin(0.5);
      text(this, x, 575, specialDesc[id], 13, C.paper, { align: "center", wordWrap: { width: 285 } }).setOrigin(0.5, 0);
      button(this, x, 625, 285, 40, selected ? "Traveling together" : can ? "Take her hand" : id === "nova" ? "Complete the Scarlet Duel" : "Complete chapter six", () => {
        state.save.operator = id;
        persist();
        this.draw();
        toast(this, o.name + " joins you.");
      }, { primary: selected, disabled: !can || selected, size: 17 });
    });
  }
}
class Journal extends Phaser.Scene {
  constructor() {
    super("Journal");
  }
  create() {
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Overworld"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.55 });
    heading(this, "Pages Worth Keeping", "Milestones, memories, and a little pocket money.", "Overworld");
    credits(this);
    QUESTS.forEach((q, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 55 + col * 595, y = 130 + row * 132, progress = Math.min(q.goal, questProgress(state.save, q)), claimed = state.save.claimed.includes(q.id), ready = progress >= q.goal;
      panel(this, x, y, 575, 115, { alpha: 0.94, edge: claimed ? 6379086 : C.gold });
      text(this, x + 22, y + 17, q.name, 24, C.paper);
      text(this, x + 22, y + 49, q.desc, 15, C.muted);
      label(this, x + 22, y + 83, progress + " / " + q.goal + "  ·  " + q.reward + " GOLD", 11, C.gold);
      button(this, x + 465, y + 72, 164, 35, claimed ? "Claimed" : ready ? "Collect reward" : "In progress", () => {
        if (claimQuest(state.save, q.id)) {
          persist();
          this.draw();
          audio.play("heal");
        }
      }, { disabled: !ready || claimed, size: 15, small: true });
    });
  }
}
class Settings extends Phaser.Scene {
  constructor() {
    super("Settings");
  }
  create() {
    this.draw();
    startFade(this);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Title"));
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.64 });
    heading(this, "Make Yourself at Home", "Your settings and journey save on this device.", "Title");
    panel(this, 310, 130, 660, 515);
    const options = [["Sound effects", "sound"], ["Battle music", "music"], ["Screen shake", "shake"], ["Spell particles", "particles"]];
    options.forEach(([title, key], i) => {
      text(this, 350, 169 + i * 62, title, 24, C.paper);
      button(this, 847, 183 + i * 62, 160, 38, state.save.settings[key] ? "On" : "Off", () => {
        state.save.settings[key] = !state.save.settings[key];
        persist();
        audio.configure(state.save.settings);
        audio.unlock();
        this.draw();
      }, { primary: state.save.settings[key], size: 18, small: true });
    });
    label(this, 350, 437, "VOLUME", 13, C.muted);
    button(this, 660, 447, 50, 35, "−", () => {
      state.save.settings.volume = Math.max(0, state.save.settings.volume - 0.1);
      persist();
      audio.configure(state.save.settings);
      this.draw();
    }, { small: true });
    label(this, 768, 447, Math.round(state.save.settings.volume * 100) + "%", 15, C.paper).setOrigin(0.5);
    button(this, 875, 447, 50, 35, "+", () => {
      state.save.settings.volume = Math.min(1, state.save.settings.volume + 0.1);
      persist();
      audio.configure(state.save.settings);
      this.draw();
    }, { small: true });
    button(this, 480, 520, 250, 45, "Export save", () => {
      saveBackup();
      toast(this, "Your story has been saved to a file.");
    }, { size: 18 });
    button(this, 790, 520, 250, 45, "Import save", async () => {
      const result = await importBackup();
      if (!result) return;
      if (result.error) {
        toast(this, result.error, C.rose);
        return;
      }
      modal(this, { title: "Open another story?", body: "Replace your local progress with this save file? Your NEAR inventory is separate and will not change.", yes: "Import save", onYes: () => {
        state.save = result;
        persist();
        audio.configure(state.save.settings);
        this.draw();
      } });
    }, { size: 18 });
    button(this, 640, 588, 500, 40, "Start a new tale", () => modal(this, { title: "Turn back to the first page?", body: "This resets your local journey, gold, and cards. Export a backup if you would like to keep them. Your NEAR inventory will not change.", yes: "New tale", onYes: () => {
      state.save = freshSave();
      persist();
      this.scene.start("Title");
    } }), { size: 17, small: true });
    label(this, 640, 683, "WASD / ARROWS · MOVE     SPACE · WAND     1–5 · CARDS     E · RESOLVE     ESC · PAUSE", 12, C.paper).setOrigin(0.5);
  }
}
class Rewards extends Phaser.Scene {
  constructor() {
    super("Rewards");
  }
  create() {
    background(this, { dim: 0.55 });
    const result = state.result;
    const pending = state.save.pendingReward;
    if (!pending?.choices) {
      this.scene.start("Overworld");
      return;
    }
    text(this, 640, 58, "A new page for your deck.", 46, C.paper, { align: "center" }).setOrigin(0.5);
    label(this, 640, 112, "CHOOSE ONE CARD TO KEEP", 14, C.gold).setOrigin(0.5);
    if (result) {
      label(this, 640, 153, `RANK ${result.rank}  ·  +${result.gains.credits} GOLD  ·  +${result.gains.xp} EXPERIENCE`, 14, C.mint).setOrigin(0.5);
    }
    pending.choices.forEach((id, i) => {
      const x = 300 + i * 340;
      const view = cardView(this, id, x, 366, 1.55, { catalog: CARDS, onClick: () => this.choose(id) });
      view.on("pointerover", () => this.tweens.add({ targets: view, y: 352, duration: 120 }));
      view.on("pointerout", () => this.tweens.add({ targets: view, y: 366, duration: 120 }));
      button(this, x, 588, 250, 48, "Keep " + CARDS[id].name, () => this.choose(id), { primary: true, size: 19 });
    });
    text(this, 640, 664, "Every victory offers a choice. Your collection shapes the next journey.", 19, C.muted).setOrigin(0.5);
    startFade(this);
  }
  choose(id) {
    if (!state.save.pendingReward?.choices.includes(id)) return;
    state.save.items[id]++;
    delete state.save.pendingReward;
    persist();
    audio.play("heal");
    transition(this, "Overworld");
  }
}
export {
  Deck,
  Forge,
  Journal,
  Journey,
  Merchant,
  Party,
  Rewards,
  Settings,
  Title
};
