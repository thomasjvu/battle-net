import Phaser from "phaser";
import { state, audio, announce } from "./state.js";
import { CARD_COST } from "../../dist/deck.js";
const W = 1280, H = 720, C = { ink: 2432559, dark: 1775652, paper: 15916982, pale: 16773581, gold: 13477224, mint: 11192714, muted: 11510413, rose: 13204618, edge: 7756101 };
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function text(scene, x, y, value, size = 20, color = C.paper, extra = {}) {
  return scene.add.text(x, y, value, { fontFamily: "Georgia, serif", fontSize: size, color: hex(color), ...extra });
}
function label(scene, x, y, value, size = 12, color = C.muted, extra = {}) {
  return text(scene, x, y, value, size, color, { fontFamily: "Verdana, sans-serif", letterSpacing: 1, ...extra });
}
function panel(scene, x, y, w, h, { fill = C.ink, alpha = 0.94, edge = C.gold, radius = 12 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(0, 0.25);
  g.fillRoundedRect(x + 5, y + 7, w, h, radius);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, edge, 0.8);
  g.strokeRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, edge, 0.25);
  g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, Math.max(2, radius - 4));
  return g;
}
function button(scene, x, y, w, h, value, action, { primary = false, disabled = false, size = 19, small = false } = {}) {
  const root = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const draw = (hover) => {
    bg.clear();
    bg.fillStyle(primary ? hover ? 15321231 : C.gold : hover ? 5324854 : C.ink, disabled ? 0.45 : 0.98);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1.5, primary ? 16047020 : C.gold, disabled ? 0.35 : 0.85);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    if (!small) {
      bg.lineStyle(1, C.gold, 0.15);
      bg.strokeRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 5);
    }
  };
  draw(false);
  const t = text(scene, 0, 0, value, size, primary ? C.ink : disabled ? 9207928 : C.paper, { align: "center", fontStyle: primary ? "bold" : "normal" }).setOrigin(0.5);
  root.add([bg, t]);
  if (!disabled) {
    root.setData("ui",true);root.setSize(w, h).setInteractive({ useHandCursor: true });
    root.on("pointerover", () => {
      draw(true);
      scene.tweens.add({ targets: root, scale: 1.025, duration: 100 });
    });
    root.on("pointerout", () => {
      draw(false);
      scene.tweens.add({ targets: root, scale: 1, duration: 100 });
    });
    root.on("pointerup", () => {
      audio.unlock();
      audio.play("ui");
      action();
    });
  }
  return root;
}
function background(scene, { dim = 0.25, key = "forest" } = {}) {
  const image = scene.add.image(W / 2, H / 2, key);
  if (scene.textures.exists(key)) {
    const scale = Math.max(W / image.width, H / image.height);
    image.setScale(scale);
  } else image.destroy();
  scene.add.rectangle(W / 2, H / 2, W, H, C.dark, dim);
  const g = scene.add.graphics();
  g.lineStyle(1, C.gold, 0.5);
  g.strokeRect(18, 18, W - 36, H - 36);
  g.lineStyle(1, C.gold, 0.15);
  g.strokeRect(25, 25, W - 50, H - 50);
  for (const [x, y] of [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]]) {
    g.fillStyle(C.gold, 0.9);
    g.fillTriangle(x - 5, y, x, y - 5, x + 5, y);
    g.fillTriangle(x - 5, y, x, y + 5, x + 5, y);
  }
  return image;
}
function heading(scene, title, subtitle = "", back = "Title") {
  announce(title + ". " + subtitle);
  button(scene, 76, 55, 94, 39, "‹ Back", () => scene.scene.start(back), { size: 17, small: true });
  text(scene, 155, 30, title, 37, C.paper);
  if (subtitle) label(scene, 157, 77, subtitle, 11, C.muted);
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
  const root = scene.add.container(W / 2, 670).setDepth(2e3);
  const p = scene.add.rectangle(0, 0, Math.min(1e3, message.length * 9 + 50), 46, C.dark, 0.96).setStrokeStyle(1, C.gold, 0.8);
  const t = text(scene, 0, 0, message, 18, color, { align: "center" }).setOrigin(0.5);
  root.add([p, t]);
  scene.messageToast = root;
  scene.time.delayedCall(3200, () => {
    if (root.active) scene.tweens.add({ targets: root, alpha: 0, duration: 180, onComplete: () => root.destroy() });
  });
}
function modal(scene, { title, body, yes = "Continue", no = "Cancel", onYes, onNo, portrait = null }) {
  const root = scene.add.container(0, 0).setDepth(1e3);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 1052184, 0.82).setInteractive();
  const p = panel(scene, portrait ? 275 : 330, 160, portrait ? 780 : 620, 400);
  root.add([dim, p]);
  if (portrait) {
    root.add(scene.add.image(230, 520, portrait).setOrigin(0.5, 1).setDisplaySize(250, 313));
  }
  root.add(text(scene, portrait ? 320 : 370, 200, title, 33, C.paper, { wordWrap: { width: 600 } }));
  root.add(text(scene, portrait ? 320 : 370, 270, body, 20, C.muted, { wordWrap: { width: portrait ? 660 : 540 }, lineSpacing: 8 }));
  const close = () => root.destroy();
  const a = button(scene, portrait ? 535 : 535, 500, 250, 48, yes, () => {
    close();
    onYes?.();
  }, { primary: true });
  root.add(a);
  if (no) {
    root.add(button(scene, 815, 500, 210, 48, no, () => {
      close();
      onNo?.();
    }));
  }
  return root;
}
function cardView(scene, id, x, y, scale = 1, { catalog, showCount = false, count = 0, onClick = null, handKey = null, muted = false } = {}) {
  const card = catalog[id], root = scene.add.container(x, y);
  root.setScale(scale);
  const width = 164, height = 218;
  const g = scene.add.graphics();
  g.fillStyle(1051413, 0.4);
  g.fillRoundedRect(-width / 2 + 5, -height / 2 + 7, width, height, 10);
  g.fillStyle(id === "gold" ? 14729086 : C.paper);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
  g.lineStyle(3, id === "gold" ? 16375697 : 10385753);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
  g.lineStyle(1, 7227966, 0.7);
  g.strokeRoundedRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, 6);
  g.fillStyle(card.element === "fire" ? 7422270 : card.element === "water" ? 3955041 : card.element === "electric" ? 7099709 : 4535629);
  g.fillRoundedRect(-69, -89, 138, 111, 5);
  root.add(g);
  if (scene.textures.exists("card-frame")) root.add(scene.add.image(0, 0, "card-frame").setDisplaySize(width, height));
  const art = scene.add.image(0, -32, "card-" + id).setDisplaySize(108, 100);
  root.add(art);
  const title = text(scene, 0, 37, card.name, 16, C.ink, { align: "center", fontStyle: "bold", wordWrap: { width: 145 } }).setOrigin(0.5, 0);
  root.add(title);
  root.add(text(scene, 0, 70, card.type === "equipment" ? id === "buster" ? "Wand attacks deal 16." : "Take 5 less damage." : shortDesc(id), 11, 5718584, { align: "center", wordWrap: { width: 140 }, lineSpacing: 3 }).setOrigin(0.5, 0));
  root.add(label(scene, 0, 96, card.type === "equipment" ? "EQUIPMENT" : card.stat ?? `${card.damage ? card.damage + (card.type === "attack" ? " POWER" : " RESTORE") : "CONTROL"}`, 8, 7426622, { align: "center" }).setOrigin(0.5));
  if (card.type !== "equipment") {
    const circle = scene.add.circle(-62, -89, 18, C.ink).setStrokeStyle(2, C.gold);
    root.add([circle, text(scene, -62, -90, String(CARD_COST[id] ?? 1), 20, C.paper, { fontStyle: "bold" }).setOrigin(0.5)]);
  }
  if (showCount) root.add(label(scene, 58, -89, "×" + count, 12, C.paper).setOrigin(1, 0.5));
  if (handKey) root.add(label(scene, 60, 88, handKey, 11, 6769723).setOrigin(0.5));
  if (muted) root.setAlpha(0.5);
  if (onClick) {
    root.setSize(width, height).setInteractive({ useHandCursor: true });
    root.on("pointerup", onClick);
  }
  return root;
}
function shortDesc(id) {
  return { cannon: "A straight magic bolt.", longsword: "Strike 2 panels ahead.", gold: "Same blade. Gold finish.", thunder: "Homing. Doubles on wet foes.", recover: "Restore 60 health.", barrier: "Absorb 50 damage.", shotgun: "A bolt for every row.", firewall: "Burn a row. Shatter ice.", icewave: "Freeze a row. Leave it wet.", areagrab: "Claim a column for 6s.", charge: "Double your wand for 8s.", vampire: "Strike close. Steal life.", prism: "Pierce every foe in a row.", repair: "Mend panels. Heal 30.", gust:"Pierce a row. Push back.", stonewall:"Raise an 80-point ward.", poison:"A homing poisonous thorn.", bloom:"Heal now and over time.", meteor:"A delayed column blast.", tidal:"Soak a row for 10s.", chainlight:"Lightning for every foe.", cleave:"Strike a wide front arc.", dash:"Step ahead. Dodge a hit.", echo:"Repeat your last attack.", draw:"Replace the rest of your hand.", focus:"Free. Restore 3 focus.", thorns:"Reflect the next 3 hits.", revive:"Heal 100. Cleanse poison.", slow:"Freeze one foe for 3s.", storm:"A storm strikes every foe." }[id] ?? "";
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
