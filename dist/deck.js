const DECK_SIZE = 12, MAX_COPIES = 3, HAND_SIZE = 5;
const CARD_COST = { cannon: 1, longsword: 2, thunder: 2, recover: 2, barrier: 1, gold: 2, shotgun: 2, firewall: 3, icewave: 2, areagrab: 2, charge: 2, vampire: 2, prism: 3, repair: 1 };
function deckCounts(deck) {
  const counts = {};
  for (const id of deck) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}
function validateDeck(deck, items, catalog, exact = true) {
  if (!Array.isArray(deck) || deck.length > DECK_SIZE || exact && deck.length !== DECK_SIZE) return false;
  const counts = deckCounts(deck);
  return Object.entries(counts).every(([id, n]) => catalog[id] && catalog[id].type !== "equipment" && n <= MAX_COPIES && n <= (items[id] ?? 0));
}
function reconcileDeck(deck, items, catalog, fill = true) {
  const result = [], counts = {};
  for (const id of deck) {
    if (catalog[id]?.type === "equipment" || !catalog[id] || result.length >= DECK_SIZE) continue;
    const limit = Math.min(MAX_COPIES, items[id] ?? 0);
    if ((counts[id] ?? 0) < limit) {
      result.push(id);
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  if (fill) for (const id of ["cannon", "longsword", "thunder", "recover", "barrier", "gold", ...Object.keys(catalog)]) {
    if (catalog[id]?.type === "equipment") continue;
    while (result.length < DECK_SIZE && (counts[id] ?? 0) < Math.min(MAX_COPIES, items[id] ?? 0)) {
      result.push(id);
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return result;
}
class DrawDeck {
  constructor(cards, random = Math.random) {
    this.random = random;
    this.drawPile = [...cards];
    this.discard = [];
    this.hand = Array(HAND_SIZE).fill(null);
    this.pending = [];
    this.energy = 3;
    this.maxEnergy = 6;
    this.time = 0;
    this.shuffles = 0;
    this.events = [];
    this.shuffle(this.drawPile);
    for (let i = 0; i < HAND_SIZE; i++) this.draw(i);
  }
  shuffle(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }
  draw(slot) {
    if (this.hand[slot] !== null) return false;
    if (!this.drawPile.length && this.discard.length) {
      this.drawPile = this.discard.splice(0);
      this.shuffle(this.drawPile);
      this.shuffles++;
      this.events.push({ type: "reshuffle" });
    }
    if (!this.drawPile.length) return false;
    this.hand[slot] = this.drawPile.pop();
    this.events.push({ type: "draw", slot, id: this.hand[slot] });
    return true;
  }
  canPlay(slot) {
    const id = this.hand[slot];
    return !!id && this.energy >= (CARD_COST[id] ?? 1);
  }
  play(slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= HAND_SIZE || !this.canPlay(slot)) return null;
    const id = this.hand[slot];
    this.energy -= CARD_COST[id] ?? 1;
    this.hand[slot] = null;
    this.discard.push(id);
    this.pending.push({ slot, at: this.time + 0.7 });
    this.events.push({ type: "play", slot, id });
    return id;
  }
  update(dt) {
    dt = Math.max(0, Math.min(dt, 0.1));
    this.time += dt;
    this.energy = Math.min(this.maxEnergy, this.energy + dt * 0.85);
    for (const p of this.pending.filter((p2) => p2.at <= this.time)) this.draw(p.slot);
    this.pending = this.pending.filter((p) => p.at > this.time);
  }
  drain() {
    return this.events.splice(0);
  }
}
export {
  CARD_COST,
  DECK_SIZE,
  DrawDeck,
  HAND_SIZE,
  MAX_COPIES,
  deckCounts,
  reconcileDeck,
  validateDeck
};
