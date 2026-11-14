import { CHIPS, OPERATORS, MISSIONS, freshSave, migrateSave, validSave, missionUnlocked, unlocked } from "../../dist/core.js";
import { NearEconomy } from "../../dist/near.js";
import { AudioEngine } from "../../dist/audio.js";
const events = new EventTarget();
let initial = freshSave();
try {
  const raw = localStorage.getItem("battle-net-v2") ?? localStorage.getItem("battle-net-v1");
  if (raw) initial = migrateSave(JSON.parse(raw));
} catch {
}
const state = { save: initial, art: {}, mission: null, endless: false, result: null, walletDeck: null };
const audio = new AudioEngine();
audio.configure(state.save.settings);
const near = new NearEconomy(() => events.dispatchEvent(new Event("network")));
function persist() {
  try {
    localStorage.setItem("battle-net-v2", JSON.stringify(state.save));
  } catch {
    announce("Storage unavailable. Export your save before leaving.");
  }
}
function announce(text) {
  const live = document.getElementById("game-status");
  if (live) live.textContent = text;
}
function currentMission() {
  return MISSIONS.find((m, i) => !state.save.completed.includes(m.id) && missionUnlocked(state.save, i)) ?? MISSIONS[8];
}
function cardArt(id) {
  return "card-" + id;
}
function heroKey(id, part = "idle") {
  return id + "-" + part;
}
function operatorAvailable(id) {
  return unlocked(state.save, id);
}
function saveBackup() {
  const blob = new Blob([JSON.stringify(state.save, null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url;
  a.download = "battle-net-save.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
async function importBackup() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      try {
        const file = input.files[0];
        if (!file || file.size > 1e6) throw Error("Choose a save file under 1 MB.");
        const data = JSON.parse(await file.text());
        if (!validSave(data)) throw Error("This is not a valid Battle Net save.");
        resolve(data);
      } catch (e) {
        resolve({ error: e.message });
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
const specialDesc = { pulse: "Strike all foes for 90. Become invulnerable for 2 seconds.", nova: "Strike all foes for 110 and restore 30 health.", echo: "Strike all foes for 65, freeze them for 4 seconds and gain 40 ward." };
function equipmentPower() {
  return state.save.equipment.buster ? 16 : 12;
}
export {
  CHIPS as CARDS,
  MISSIONS,
  OPERATORS,
  announce,
  audio,
  cardArt,
  currentMission,
  equipmentPower,
  events,
  heroKey,
  importBackup,
  near,
  operatorAvailable,
  persist,
  saveBackup,
  specialDesc,
  state
};
