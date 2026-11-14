import { Battle, seeded } from "./combat.js";
import { DrawDeck } from "./deck.js";
class CardBattle extends Battle {
  constructor(options) {
    super({ ...options, cardMode: true, folder: options.deck.slice(0, 5) });
    this.cards = new DrawDeck(options.deck, seeded((options.seed ?? 1) + 27));
    this.folder = [...this.cards.hand];
  }
  useCard(slot) {
    if (this.status !== "running") return false;
    if (!this.cards.canPlay(slot)) {
      this.emit("notice", { text: this.cards.hand[slot] ? "NOT ENOUGH FOCUS" : "DRAWING A CARD…" });
      return false;
    }
    this.folder = [...this.cards.hand];
    if (!super.useChip(slot)) return false;
    this.cards.play(slot);
    return true;
  }
  update(dt, input = {}) {
    const before = this.time;
    super.update(dt, input);
    if (this.time > before) {
      this.cards.update(this.time - before);
      this.folder = [...this.cards.hand];
      for (const e of this.cards.drain()) this.emit(e.type, e);
    }
  }
}
export {
  CardBattle
};
