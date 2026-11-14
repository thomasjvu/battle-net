import Phaser from "phaser";
import { Overworld } from "./overworld-scene.js";
import { DuelLobby, DuelCombat } from "./duel-scene.js";
import { Title, Journey, Deck, Merchant, Forge, Party, Journal, Settings, Rewards } from "./menus.js";
import { Combat } from "./combat-scene.js";
import { Network, Listings } from "./network-scene.js";
import { state, announce } from "./state.js";
import { W, H, C, text, label } from "./ui.js";
class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  preload() {
    this.load.json("art", "art-manifest.json");
    this.load.json("locomotion", "assets/fantasy/locomotion/locomotion.json");
  }
  create() {
    state.art = this.cache.json.get("art");
    this.scene.start("Load");
  }
}
class Load extends Phaser.Scene {
  constructor() {
    super("Load");
  }
  preload() {
    this.cameras.main.setBackgroundColor(C.dark);
    text(this, W / 2, 280, "BATTLE NET", 56, C.paper, { fontStyle: "bold" }).setOrigin(0.5);
    label(this, W / 2, 350, "OPENING YOUR STORY…", 14, C.gold).setOrigin(0.5);
    const bar = this.add.graphics();
    this.load.on("progress", (value) => {
      bar.clear();
      bar.fillStyle(4470588).fillRoundedRect(390, 397, 500, 5, 2);
      bar.fillStyle(C.gold).fillRoundedRect(390, 397, 500 * value, 5, 2);
    });
    for (const [key, path] of Object.entries(state.art)) this.load.image(key, path);
    for (const clip of this.cache.json.get("locomotion").clips) this.load.spritesheet(clip.id, clip.path, { frameWidth: clip.frameWidth, frameHeight: clip.frameHeight });
    this.load.on("loaderror", (file) => console.error("Unable to load game art:", file.key, file.src));
  }
  create() {
    for (const key of Object.keys(state.art)) if (key !== "forest" && key !== "card-frame" && key !== "card-back") this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const clip of this.cache.json.get("locomotion").clips) this.textures.get(clip.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const g = this.add.graphics();
    g.fillStyle(16777215);
    g.fillCircle(8, 8, 6);
    g.generateTexture("mote", 16, 16);
    g.destroy();
    this.scene.start("Title");
  }
}
new Phaser.Game({ type: Phaser.AUTO, parent: "game-root", width: W, height: H, backgroundColor: C.dark, render: { antialias: true, pixelArt: false, roundPixels: true, powerPreference: "high-performance" }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: "game-root" }, dom: { createContainer: true }, input: { activePointers: 4, keyboard: { capture: ["SPACE", "UP", "DOWN", "LEFT", "RIGHT"] } }, scene: [Boot, Load, Title, Overworld, DuelLobby, DuelCombat, Journey, Deck, Merchant, Forge, Party, Journal, Settings, Combat, Rewards, Network, Listings], callbacks: { postBoot: (game) => {
  game.canvas.setAttribute("aria-label", "Battle Net, a full-screen card tactics game. Press Enter to begin. During battle use WASD or arrows, hold and release Space for the buster, Z for the next chip, C for Custom, and Enter to send selected chips.");
  game.canvas.setAttribute("tabindex", "0");
  game.scale.on("fullscreenfailed", () => announce("Fullscreen was blocked by this browser. The game fills its available window."));
} } });
