import { validateDeck, reconcileDeck, deckCounts } from "./deck.js";
const CHIPS = {
  cannon: { name: "Arc Bolt", icon: "⌁", damage: 40, type: "attack", label: "BALLISTIC", desc: "Loose a bolt of magic along your row.", price: 12, stock: 35, cooldown: 6, element: "neutral", art: "cannon" },
  longsword: { name: "Longsword", icon: "⚔", damage: 80, type: "attack", label: "BLADE", desc: "Cuts two panels ahead in your row. Move to the front!", price: 5, stock: 100, cooldown: 6, element: "neutral", art: "longsword" },
  thunder: { name: "Thunder", icon: "ϟ", damage: 60, type: "attack", label: "ELECTRIC", desc: "Homing lightning strikes the weakest virus. Double damage on wet panels.", price: 24, stock: 15, cooldown: 9, element: "electric", art: "thunder" },
  recover: { name: "Mend", icon: "✚", damage: 60, type: "support", label: "RECOVERY", desc: "Restore 60 HP. Keep your connection alive.", price: 18, stock: 25, cooldown: 12, element: "neutral", art: "recover" },
  barrier: { name: "Ward", icon: "⬡", damage: 50, type: "support", label: "DEFENSE", desc: "Absorb 50 incoming damage. Stacks up to 100 shield.", price: 20, stock: 20, cooldown: 12, element: "neutral", art: "barrier" },
  gold: { name: "Gold Longsword", icon: "⚔", damage: 80, type: "attack", label: "GOLD FINISH", desc: "100 blades. One statement. Identical combat stats to Longsword.", price: 420, stock: 2, cooldown: 6, element: "neutral", art: "gold-longsword" },
  buster: { name: "Focus Wand", icon: "⌁", damage: 16, type: "equipment", label: "BUSTER", desc: "Equip to raise basic shot damage from 12 to 16.", price: 90, stock: 8, element: "neutral", art: "buster" },
  armor: { name: "Traveler's Cloak", icon: "◈", damage: 5, type: "equipment", label: "ARMOR", desc: "Equip to reduce each incoming hit by 5.", price: 80, stock: 8, element: "neutral", art: "armor" },
  shotgun: { name: "Scattershot", icon: "⋔", damage: 35, type: "attack", label: "SPREAD", desc: "Three projectiles cover all rows. Excellent against swarms.", price: 45, stock: 12, cooldown: 8, element: "neutral", art: "cannon" },
  firewall: { name: "Flame Wall", icon: "♨", damage: 70, type: "attack", label: "FIRE", desc: "Burn every enemy in your row. Clears ice and hits frozen targets harder.", price: 55, stock: 12, cooldown: 9, element: "fire", art: "thunder" },
  icewave: { name: "Frost Tide", icon: "❄", damage: 45, type: "attack", label: "WATER", desc: "Sweeps your row, freezes enemies for 2 seconds and wets their panels.", price: 48, stock: 12, cooldown: 9, element: "water", art: "barrier" },
  areagrab: { name: "Advance", icon: "▥", damage: 0, type: "support", label: "CONTROL", desc: "Claim the front enemy column for 6 seconds. Get in sword range.", price: 60, stock: 10, cooldown: 14, element: "neutral", art: "barrier" },
  charge: { name: "Quickening", icon: "»", damage: 8, type: "support", label: "BOOST", desc: "Double your wand damage for 8 seconds.", price: 38, stock: 15, cooldown: 14, element: "electric", art: "buster" },
  vampire: { name: "Leech Blade", icon: "†", damage: 60, type: "attack", label: "DRAIN", desc: "Sword range. Heal for half the damage dealt.", price: 65, stock: 8, cooldown: 10, element: "neutral", art: "longsword" },
  prism: { name: "Prism Ray", icon: "◇", damage: 90, type: "attack", label: "PIERCING", desc: "A piercing beam hits every target in your row.", price: 85, stock: 6, cooldown: 11, element: "electric", art: "cannon" },
  repair: { name: "Sanctuary", icon: "⊞", damage: 30, type: "support", label: "RESTORE", desc: "Clear hazardous panels on your side and restore 30 HP.", price: 35, stock: 16, cooldown: 12, element: "water", art: "recover" }
};
const OPERATORS = {
  pulse: { name: "Pulse", title: "The Wayfarer", role: "WANDERER", color: "#bbed71", special: "Heart’s Resolve", desc: "A kind-hearted wanderer who carries a worn deck and an unreasonable amount of hope.", quote: "There’s a story waiting just beyond those trees.", unlock: null },
  nova: { name: "Nova", title: "The Scarlet Blade", role: "DUELIST", color: "#ff8da9", special: "Crimson Waltz", desc: "A traveling duelist with a wicked grin. She has never met a challenge she could resist.", quote: "Keep up, darling. The road won’t walk itself.", unlock: "m3" },
  echo: { name: "Echo", title: "The Moon Reader", role: "SPELLWEAVER", color: "#baa4ff", special: "Stillwater", desc: "A quiet mage who reads the spaces between words. She knows what the old forest remembers.", quote: "Listen. Even silence has something to tell us.", unlock: "m6" }
};
const MISSIONS = [
  { id: "m1", name: "A Page Unwritten", world: 0, sector: "01", subtitle: "Every tale begins somewhere.", brief: "The old road is overgrown, and the creatures here have grown bold. Watch for marked ground, step aside, and let your cards do the talking.", speaker: "pulse", enemies: ["hex", "hex"], reward: 40, drop: "cannon", xp: 40 },
  { id: "m2", name: "Bramble Crossing", world: 0, sector: "02", subtitle: "A little courage goes a long way.", brief: "These fireflies move quickly. Scattershot can catch all three rows. Your deck draws a fresh card after every spell; save focus for the right moment.", speaker: "pulse", enemies: ["spark", "hex", "spark"], reward: 55, drop: "shotgun", xp: 55 },
  { id: "m3", name: "The Scarlet Duel", world: 0, sector: "03", subtitle: "A stranger with a familiar smile.", brief: "Nova: “A deck of cards and that much confidence? Adorable. Let’s see what you’ve got.” Her blade threatens a whole column. Step sideways to escape.", speaker: "nova", enemies: ["nova"], reward: 100, drop: "vampire", xp: 100, boss: true },
  { id: "m4", name: "Frozen Memories", world: 1, sector: "04", subtitle: "The world remembers winter.", brief: "The frost slows your steps. Flame Wall melts ice; Thunder strikes wet creatures twice as hard. Some cards are better together.", speaker: "nova", enemies: ["frost", "hex", "frost"], reward: 65, drop: "icewave", xp: 65 },
  { id: "m5", name: "The Ember Garden", world: 1, sector: "05", subtitle: "Beauty has its thorns.", brief: "Those blossoms burn. Keep off the scorched earth, or play Sanctuary to clear your footing. A well-timed Ward can make all the difference.", speaker: "pulse", enemies: ["flare", "spark", "flare"], reward: 80, drop: "firewall", xp: 80 },
  { id: "m6", name: "A Whisper in the Glass", world: 1, sector: "06", subtitle: "Some secrets look back.", brief: "Echo: “The forest asked me to stop you. I’d rather know why you came.” Her spells form a cross. Find the unmarked ground, and show her your resolve.", speaker: "echo", enemies: ["echo"], reward: 120, drop: "areagrab", xp: 120, boss: true },
  { id: "m7", name: "Moonless Road", world: 2, sector: "07", subtitle: "Stay close. The dark is listening.", brief: "The Hollow Court lies ahead. Freeze your foes with Frost Tide, then strike with Thunder. Trust your companions. Trust your deck.", speaker: "echo", enemies: ["frost", "flare", "spark"], reward: 90, drop: "charge", xp: 90 },
  { id: "m8", name: "The Last Gate", world: 2, sector: "08", subtitle: "Nothing precious is unguarded.", brief: "The wardens won’t let us pass easily. Advance gives you ground; Leech Blade helps you hold it. There’s always one more card to draw.", speaker: "nova", enemies: ["guard", "guard", "spark"], reward: 110, drop: "prism", xp: 110 },
  { id: "m9", name: "The Thorn Queen", world: 2, sector: "09", subtitle: "Write the ending together.", brief: "The queen has waited a long time for someone to reach her. Three phases. Watch the ground, keep your focus, and make this a story worth remembering.", speaker: "pulse", enemies: ["queen"], reward: 200, drop: "prism", xp: 200, boss: true }
];
const WORLDS = [{ name: "The Elderwood", color: "#bbed71", desc: "Follow the forgotten road." }, { name: "Frostfall Reach", color: "#87d7f7", desc: "Where old memories bloom." }, { name: "The Hollow Court", color: "#c6a0ff", desc: "The last page awaits." }];
const QUESTS = [{ id: "first", name: "First Steps", desc: "Win your first battle.", goal: 1, stat: "wins", reward: 40 }, { id: "trader", name: "Open for business", desc: "Complete 5 merchant trades.", goal: 5, stat: "trades", reward: 60 }, { id: "golden", name: "Stay golden", desc: "Forge a Gold Longsword.", goal: 1, stat: "forged", reward: 100 }, { id: "combo", name: "Chain reaction", desc: "Land 10 elemental combos.", goal: 10, stat: "combos", reward: 90 }, { id: "runner", name: "A Friend in Scarlet", desc: "Clear the Elderwood.", goal: 3, stat: "cleared", reward: 80 }, { id: "collector", name: "Full spectrum", desc: "Own 12 different card types.", goal: 12, stat: "types", reward: 100 }, { id: "heart", name: "A Tale Remembered", desc: "Complete all 9 chapters.", goal: 9, stat: "cleared", reward: 200 }];
const stats = () => ({ kills: 0, trades: 0, forged: 0, combos: 0, damage: 0, battles: 0, bestEndless: 0 });
const freshSave = () => ({ version: 2, credits: 240, items: Object.fromEntries(Object.keys(CHIPS).map((id) => [id, { cannon: 3, longsword: 100, thunder: 2, recover: 3, barrier: 2 }[id] ?? 0])), stock: Object.fromEntries(Object.entries(CHIPS).map(([id, c]) => [id, c.stock])), folder: ["cannon", "longsword", "thunder", "recover", "barrier"], deck: ["cannon", "cannon", "cannon", "longsword", "longsword", "longsword", "thunder", "thunder", "recover", "recover", "barrier", "barrier"], equipment: { buster: false, armor: false }, wins: 0, xp: 0, operator: "pulse", completed: [], bests: {}, claimed: [], stats: stats(), history: [], settings: { sound: false, music: false, shake: true, particles: true, volume: 0.3 }, tutorial: false });
const natural = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e8;
function validSave(s) {
  return Boolean(s?.version === 2 && natural(s.credits) && natural(s.wins) && natural(s.xp) && Object.keys(CHIPS).every((id) => natural(s.items?.[id]) && natural(s.stock?.[id])) && Array.isArray(s.folder) && s.folder.length === 5 && s.folder.every((id) => CHIPS[id] && CHIPS[id].type !== "equipment" && s.items[id] > 0) && s.equipment && ["buster", "armor"].every((id) => typeof s.equipment[id] === "boolean" && (!s.equipment[id] || s.items[id] > 0)) && OPERATORS[s.operator] && Array.isArray(s.completed) && s.completed.every((id) => MISSIONS.some((m) => m.id === id)) && Array.isArray(s.claimed) && s.claimed.every((id) => QUESTS.some((q) => q.id === id)) && s.stats && Object.keys(stats()).every((k) => natural(s.stats[k])) && s.bests && typeof s.bests === "object" && Object.values(s.bests).every((b) => b && Number.isFinite(b.time) && b.time >= 0 && ["S", "A", "B", "C"].includes(b.rank)) && Array.isArray(s.history) && s.history.length <= 40 && s.history.every((h) => typeof h === "string" && h.length <= 200) && s.settings && ["sound", "music", "shake", "particles"].every((k) => typeof s.settings[k] === "boolean") && Number.isFinite(s.settings.volume) && s.settings.volume >= 0 && s.settings.volume <= 1 && typeof s.tutorial === "boolean" && validateDeck(s.deck, s.items, CHIPS, false) && (!s.pendingReward || Array.isArray(s.pendingReward.choices) && s.pendingReward.choices.length === 3 && s.pendingReward.choices.every((id) => CHIPS[id] && CHIPS[id].type !== "equipment" && id !== "gold")));
}
function migrateSave(s) {
  if (validSave(s)) return s;
  if (![1, 2].includes(s?.version)) return freshSave();
  const n = freshSave();
  for (const id of Object.keys(CHIPS)) {
    if (natural(s.items?.[id])) n.items[id] = s.items[id];
    if (natural(s.stock?.[id])) n.stock[id] = s.stock[id];
  }
  for (const key of ["credits", "wins", "xp"]) if (natural(s[key])) n[key] = s[key];
  if (Array.isArray(s.folder) && s.folder.length === 5 && s.folder.every((id) => CHIPS[id] && CHIPS[id].type !== "equipment" && n.items[id] > 0)) n.folder = [...s.folder];
  for (const id of ["buster", "armor"]) n.equipment[id] = Boolean(s.equipment?.[id] && n.items[id]);
  if (s.version === 2) {
    for (const key of ["completed", "claimed", "bests", "stats", "history", "settings", "tutorial", "operator"]) if (s[key] !== void 0) n[key] = s[key];
  }
  n.deck = reconcileDeck(s.deck ?? n.deck, n.items, CHIPS);
  return validSave(n) ? n : freshSave();
}
function log(s, message) {
  s.history.unshift(message);
  s.history = s.history.slice(0, 40);
}
function price(s, id, mode = "buy") {
  const c = CHIPS[id];
  if (!c) return 0;
  const dynamic = Math.max(0.65, Math.min(1.8, 1 + (c.stock - s.stock[id]) / c.stock * 0.4));
  return Math.max(1, Math.round(c.price * dynamic * (mode === "sell" ? 0.65 : 1)));
}
function trade(s, id, mode, quantity = 1) {
  if (!CHIPS[id] || !["buy", "sell"].includes(mode) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return { ok: false, message: "Invalid trade" };
  const cost = price(s, id, mode) * quantity;
  if (mode === "buy") {
    if (s.stock[id] < quantity) return { ok: false, message: "Not enough merchant stock" };
    if (s.credits < cost) return { ok: false, message: "Not enough credits" };
    s.credits -= cost;
    s.items[id] += quantity;
    s.stock[id] -= quantity;
  } else {
    const keep = Math.max(s.folder.includes(id) || s.equipment[id] ? 1 : 0, deckCounts(s.deck)[id] ?? 0);
    if (s.items[id] - keep < quantity) return { ok: false, message: keep ? "Keep one copy for your active loadout" : "Not enough copies to sell" };
    s.items[id] -= quantity;
    s.stock[id] += quantity;
    s.credits += cost;
  }
  s.stats.trades++;
  const message = `${mode === "buy" ? "Bought" : "Sold"} ${quantity} ${CHIPS[id].name} for ${cost} credits`;
  log(s, message);
  return { ok: true, message };
}
function forge(s) {
  if (s.items.longsword < 100) return { ok: false, message: "You need 100 Longswords" };
  s.items.longsword -= 100;
  s.items.gold++;
  s.stats.forged++;
  s.deck = reconcileDeck(s.deck.map((id) => id === "longsword" && s.items.longsword === 0 ? "gold" : id), s.items, CHIPS);
  s.folder = s.folder.map((id) => id === "longsword" && s.items.longsword === 0 ? "gold" : id);
  log(s, "Forged Gold Longsword · 100 standard copies consumed");
  return { ok: true, message: "Gold Longsword forged. Same power. Legendary finish." };
}
function equip(s, id, slot) {
  if (!CHIPS[id] || s.items[id] < 1) return false;
  if (CHIPS[id].type === "equipment") {
    s.equipment[id] = !s.equipment[id];
    return true;
  }
  if (!Number.isInteger(slot) || slot < 0 || slot > 4) return false;
  s.folder[slot] = id;
  return true;
}
const level = (s) => 1 + Math.floor(Math.sqrt(s.xp / 65));
const unlocked = (s, id) => !OPERATORS[id]?.unlock || s.completed.includes(OPERATORS[id].unlock);
const missionUnlocked = (s, index) => index === 0 || s.completed.includes(MISSIONS[index - 1].id);
function questProgress(s, q) {
  return q.stat === "wins" ? s.wins : q.stat === "cleared" ? new Set(s.completed).size : q.stat === "types" ? Object.values(s.items).filter((x) => x > 0).length : s.stats[q.stat] ?? 0;
}
function claimQuest(s, id) {
  const q = QUESTS.find((q2) => q2.id === id);
  if (!q || s.claimed.includes(id) || questProgress(s, q) < q.goal) return false;
  s.claimed.push(id);
  s.credits += q.reward;
  log(s, `Commission complete: ${q.name} · +${q.reward} credits`);
  return true;
}
function reward(s, mission = MISSIONS[0], result = { rank: "B", time: 60, kills: 1, combos: 0, damage: 0 }) {
  const first = !s.completed.includes(mission.id);
  const bonus = result.rank === "S" ? 1.4 : result.rank === "A" ? 1.2 : 1;
  const credits = Math.round(mission.reward * bonus * (first ? 1 : 0.65));
  s.credits += credits;
  s.xp += Math.round(mission.xp * (first ? 1 : 0.5));
  s.items.longsword += first ? 10 : 5;
  s.items[mission.drop]++;
  s.wins++;
  if (mission.id !== "endless" && first) s.completed.push(mission.id);
  const old = s.bests[mission.id];
  if (!old || result.time < old.time) s.bests[mission.id] = { time: result.time, rank: result.rank };
  for (const k of ["kills", "combos", "damage"]) s.stats[k] += Math.floor(result[k] ?? 0);
  if (mission.id === "endless") s.stats.bestEndless = Math.max(s.stats.bestEndless, result.wave ?? 1);
  log(s, `${mission.name} · Rank ${result.rank} · +${credits} credits · ${CHIPS[mission.drop].name}`);
  return { credits, xp: Math.round(mission.xp * (first ? 1 : 0.5)), longswords: first ? 10 : 5, card: mission.drop, first };
}
function simulateMarket(s, seed = 1) {
  let x = seed >>> 0;
  const rand = () => {
    x = Math.imul(x, 1664525) + 1013904223 >>> 0;
    return x / 4294967296;
  };
  for (let day = 0; day < 7; day++) for (const id of Object.keys(CHIPS)) {
    const c = CHIPS[id], demand = Math.ceil(c.stock * 0.15 * rand());
    s.stock[id] = Math.max(0, Math.min(c.stock * 2, s.stock[id] + Math.floor(c.stock * 0.12 * rand()) - demand));
  }
  log(s, "Merchant simulation: 7 days of NPC supply and demand");
}
export {
  CHIPS,
  MISSIONS,
  OPERATORS,
  QUESTS,
  WORLDS,
  claimQuest,
  equip,
  forge,
  freshSave,
  level,
  log,
  migrateSave,
  missionUnlocked,
  price,
  questProgress,
  reward,
  simulateMarket,
  trade,
  unlocked,
  validSave
};
