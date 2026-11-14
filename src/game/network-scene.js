import Phaser from "phaser";
import { state, near, events, CARDS } from "./state.js";
import { ITEM_IDS, DECOR_IDS, TOKEN_IDS, isTestnetAccount, parseNear, formatNear } from "../../dist/near.js";
import { DECOR, DECOR_TOKEN_BY_ID } from "../../dist/home.js";
import { reconcileDeck } from "../../dist/deck.js";
import { C, text, label, panel, button, background, heading, toast, modal, startFade } from "./ui.js";

const tokenName = (id) => CARDS[id]?.name ?? DECOR_TOKEN_BY_ID[id]?.name ?? id;
const tokenArt = (id) => CARDS[id] ? "card-" + id : "decor-card-" + (DECOR_TOKEN_BY_ID[id]?.type ?? "planter");
const tokenBalance = (id) => {
  const cardIndex = ITEM_IDS.indexOf(id);
  if (cardIndex >= 0) return near.player?.items?.[cardIndex] ?? 0;
  return near.decorItems?.[id] ?? 0;
};
const walletBalance = (id) => {
  if (ITEM_IDS.includes(id)) return tokenBalance(id);
  const placed = state.save?.base?.placements?.filter((p) => DECOR[p.type]?.tokenId === id).length ?? 0;
  return Math.max(0, tokenBalance(id) - placed);
};
class Network extends Phaser.Scene {
  constructor() {
    super("Network");
    this.page = 0;
  }
  async create() {
    this.page = 0;
    this.inventoryPage = 0;
    this.inventoryTab = "cards";
    this.transferMode = false;
    this.listener = () => {
      if (this.scene.isActive()) this.draw();
    };
    events.addEventListener("network", this.listener);
    this.events.once("shutdown", () => events.removeEventListener("network", this.listener));
    this.draw();
    startFade(this);
    if (!near.config) try {
      await near.init();
    } catch (e) {
      toast(this, e.message, C.rose);
    }
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Overworld"));
  }
  async task(fn) {
    try {
      await fn();
      this.draw();
    } catch (e) {
      this.draw();
      toast(this, e.message, C.rose);
    }
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.64 });
    heading(this, "The Trading Hall", "Player-owned cards and home decorations · NEAR testnet", "Overworld");
    button(this, 1055, 60, 260, 42, near.account ? "Disconnect wallet" : "Connect wallet", () => this.task(() => near.account ? near.disconnect() : near.connect()), { size: 18, primary: true });
    label(this, 60, 123, near.account ?? "Your local collection stays separate from your wallet cards.", 14, C.gold);
    const config = near.config, player = near.player, c = near.contractConfig;
    if (!config?.contractId) {
      panel(this, 80, 167, 1120, 330);
      text(this, 120, 205, "The trading gates are being prepared.", 36, C.paper);
      text(this, 120, 272, "The contract is built and tested in a local NEAR sandbox.\nLive deployment is on hold until you configure a dedicated testnet account.\n\nYour journey, deck book, merchant, and forge are playable now.", 22, C.muted, { lineSpacing: 12 });
    } else {
      panel(this, 50, 154, 1180, 345);
      label(this, 77, 176, config.contractId.toUpperCase(), 12, C.gold);
      button(this, 1120, 180, 160, 32, "Refresh", () => this.task(() => near.refresh()), { size: 16, small: true });
      if (!player && near.account && c) button(this, 640, 295, 520, 56, "Receive starter set · " + formatNear(c.registration_deposit) + " testnet NEAR", () => this.review("Begin trading", "A one-time set of battle cards, equipment, and home decorations. The storage deposit is nonrefundable.", "register", {}, c.registration_deposit), { primary: true, size: 20 });
      else if (player) {
        text(this, 77, 210, "Wallet inventory", 24, C.paper);
        const owned = (this.inventoryTab === "decor" ? DECOR_IDS : ITEM_IDS).filter((id) => tokenBalance(id) > 0);
        const page = this.inventoryPage ?? 0;
        button(this, 785, 213, 112, 28, "Cards", () => { this.inventoryTab = "cards"; this.inventoryPage = 0; this.draw(); }, {size:14,small:true,primary:this.inventoryTab === "cards"});
        button(this, 905, 213, 140, 28, "Decorations", () => { this.inventoryTab = "decor"; this.inventoryPage = 0; this.draw(); }, {size:14,small:true,primary:this.inventoryTab === "decor"});
        const pages = Math.max(1, Math.ceil(owned.length / 16));
        button(this, 1060, 213, 150, 28, page ? "‹ Previous" : "More ›", () => { this.inventoryPage = page ? page - 1 : Math.min(pages - 1, 1); this.draw(); }, {size:14,small:true,disabled:pages<=1});
        if (!owned.length) text(this, 640, 329, this.inventoryTab === "decor" ? "No decorations in this wallet yet." : "No cards in this wallet yet.", 17, C.muted, {align:"center"}).setOrigin(.5);
        owned.slice(page*16, page*16+16).forEach((id, i) => {
          const col = i % 8, row = Math.floor(i / 8), x = 130 + col * 143, y = 280 + row * 108;
          this.add.image(x, y, tokenArt(id)).setDisplaySize(58, 58);
          label(this, x, y + 38, tokenName(id) + " ×" + tokenBalance(id), 9, C.paper, { align: "center", wordWrap: { width: 135 } }).setOrigin(0.5);
        });
        if (this.inventoryTab === "cards") {
          button(this, 265, 452, 340, 37, state.walletDeck ? "Edit wallet deck" : "Travel with these cards", () => {
            const items = Object.fromEntries(ITEM_IDS.map((id, i) => [id, player.items[i]]));
            const sameWallet = state.walletDeck?.account === near.account && state.walletDeck.contract === config.contractId;
            state.walletDeck = {
              account: near.account, contract: config.contractId, items,
              deck: reconcileDeck(sameWallet ? state.walletDeck.deck : [], items, CARDS),
              equipment: {
                buster: items.buster > 0 && (!sameWallet || state.walletDeck.equipment.buster),
                armor: items.armor > 0 && (!sameWallet || state.walletDeck.equipment.armor)
              }
            };
            this.scene.start("Deck", { wallet: true });
          }, { size: 17, small: true });
          button(this, 660, 452, 310, 37, "Forge 100 Longswords → 1 Gold", () => this.review("Gild your wallet cards", "Burn 100 onchain Longswords to create 1 Gold Longsword. This cannot be undone. Local cards are unaffected.", "forge"), { size: 16, small: true, disabled: player.items[1] < 100 });
        } else {
          if (near.canClaimStarterDecor) {
            button(this, 265, 452, 340, 37, "Claim home starter set", () => this.review("Claim your home set", "A one-time set of six decorations for your home hub.", "claim_starter_decor"), {size:16,small:true,primary:true});
          } else {
            const hasDecor = DECOR_IDS.some((id) => (near.decorItems?.[id] ?? 0) > 0);
            text(this, 265, 451, hasDecor ? "Your Pocket displays wallet-owned decorations.\nPlaced copies stay off the market until returned to storage." : "Your one-time home starter set has been claimed.", 14, C.muted, {lineSpacing:6});
          }
        }
        button(this, 1040, 452, 285, 37, "Withdraw " + formatNear(player.proceeds) + " NEAR", () => this.review("Collect your proceeds", "Transfer your earned testnet NEAR to your connected wallet.", "withdraw"), { size: 15, small: true, disabled: BigInt(player.proceeds) === 0n || player.withdrawing });
      }
    }
    panel(this, 50, 523, 1180, 132);
    if (player) {
      label(this, 75, 543, this.transferMode ? "SEND ITEMS TO A REGISTERED WALLET" : "CREATE A LOT · TOTAL PRICE FOR THE WHOLE LOT", 12, C.gold);
      button(this, 1080, 545, 240, 32, this.transferMode ? "Create a lot" : "Send items", () => {
        this.transferMode = !this.transferMode;
        this.draw();
      }, { size: 15, small: true });
      const destination = this.transferMode
        ? '<input id="lot-price" placeholder="Recipient.testnet" aria-label="Recipient account">'
        : '<input id="lot-price" inputmode="decimal" placeholder="Lot price in NEAR" aria-label="Total price">';
      const ownedTokens = TOKEN_IDS.filter((id) => walletBalance(id) > 0);
      this.listingForm = this.add.dom(550, 596).createFromHTML(`<div class="game-form"><select id="lot-card">${ownedTokens.map((id) => `<option value="${id}">${tokenName(id).replace(/'/g, "&#39;")}</option>`).join("")}</select><input id="lot-quantity" type="number" min="1" max="10000" value="1" aria-label="Quantity">${destination}</div>`);
      button(this, 1080, 596, 240, 39, this.transferMode ? "Review transfer" : "Review listing", () => {
        try {
          const id = this.listingForm.getChildByID("lot-card").value, quantity = Number(this.listingForm.getChildByID("lot-quantity").value), destinationValue = this.listingForm.getChildByID("lot-price").value.trim();
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1e4 || !TOKEN_IDS.includes(id) || quantity > walletBalance(id)) throw Error("Enter a quantity you can trade.");
          if (this.transferMode) {
            if (!isTestnetAccount(destinationValue) || destinationValue === near.account) throw Error("Enter a different testnet account.");
            this.review("Send wallet items", `Send ${quantity} ${tokenName(id)} to ${destinationValue}.`, "mt_transfer", {
              receiver_id: destinationValue, token_id: id, amount: String(quantity)
            });
            return;
          }
          const cost = parseNear(destinationValue);
          if (BigInt(cost) <= 0n || BigInt(cost) > 1000n * 10n ** 24n) throw Error("Price must be above 0 and at most 1000 testnet NEAR.");
          this.review("Create a listing", `Escrow ${quantity} ${tokenName(id)} for a total of ${formatNear(cost)} testnet NEAR. The ${formatNear(c.listing_deposit)} NEAR listing storage deposit is nonrefundable.`, "create_listing", { item_id: id, quantity, price: cost }, c.listing_deposit);
        } catch (e) {
          toast(this, e.message, C.rose);
        }
      }, { primary: true, size: 18 });
    } else {
      label(this, 75, 544, "DEDICATED TESTNET CONTRACT ACCOUNT", 12, C.gold);
      this.configInput = this.add.dom(480, 594).createFromHTML(`<input class="game-input" id="contract-account" placeholder="your-game.testnet" aria-label="Testnet contract account">`);
      this.configInput.getChildByID("contract-account").value = config?.contractId ?? "";
      button(this, 1050, 594, 275, 42, "Configure contract", () => this.task(() => near.configure(this.configInput.getChildByID("contract-account").value.trim())), { size: 19, primary: true });
    }
    button(this, 225, 687, 350, 32, "Browse player listings", () => this.scene.start("Listings"), { size: 17, small: true, disabled: !c });
    button(this, 650, 687, 330, 32, "Use my local deck", () => {
      state.walletDeck = null;
      toast(this, "Your local deck is active.");
    }, { size: 17, small: true });
    label(this, 1195, 687, "NO MAINNET TRANSACTIONS", 10, C.muted).setOrigin(1, 0.5);
    if (near.error) toast(this, near.error, C.rose);
  }
  review(title, body, method, args = {}, deposit = "1") {
    if (near.busy) return;
    modal(this, { title, body: body + "\n\nAttached: " + (deposit === "1" ? "1 yoctoNEAR" : formatNear(deposit) + " testnet NEAR") + " plus gas.\nContract: " + near.config.contractId, yes: "Open wallet", onYes: () => this.task(async () => {
      const result = await near.transact(method, args, deposit);
      if (result) toast(this, "Your wallet state has been refreshed.");
    }) });
  }
}
class Listings extends Network {
  constructor() {
    super();
    this.sys.settings.key = "Listings";
  }
  draw() {
    this.children.removeAll(true);
    background(this, { dim: 0.6 });
    heading(this, "Collector Market", "Cards and home decorations · Total lot prices in testnet NEAR", "Network");
    this.page = Math.min(this.page, Math.max(0, Math.ceil(near.listings.length / 5) - 1));
    const lots = near.listings.slice(this.page * 5, this.page * 5 + 5);
    if (!lots.length) text(this, 640, 330, "No active lots yet. A new market starts with its first traveler.", 26, C.paper, { align: "center" }).setOrigin(0.5);
    lots.forEach((l, i) => {
      const y = 155 + i * 94;
      panel(this, 85, y, 1110, 80);
      this.add.image(134, y + 39, tokenArt(l.item_id)).setDisplaySize(60, 60);
      text(this, 185, y + 15, tokenName(l.item_id) + " × " + l.quantity, 24, C.paper);
      label(this, 185, y + 52, l.seller, 12, C.muted);
      label(this, 950, y + 39, formatNear(l.price) + " NEAR", 15, C.gold).setOrigin(1, 0.5);
      button(this, 1070, y + 39, 180, 41, l.seller === near.account ? "Cancel lot" : "Review trade", () => this.review(l.seller === near.account ? "Cancel this lot?" : "Take this lot?", `${l.quantity} ${tokenName(l.item_id)}. Total: ${formatNear(l.price)} testnet NEAR.`, l.seller === near.account ? "cancel_listing" : "buy_listing", { listing_id: String(l.id) }, l.seller === near.account ? "1" : l.price), { size: 17, primary: true, disabled: !near.player });
    });
    button(this, 450, 665, 170, 40, "‹ Previous", () => {
      this.page = Math.max(0, this.page - 1);
      this.draw();
    }, { size: 17, disabled: this.page === 0 });
    button(this, 830, 665, 170, 40, "Next ›", () => {
      this.page++;
      this.draw();
    }, { size: 17, disabled: (this.page + 1) * 5 >= near.listings.length });
  }
}
export {
  Listings,
  Network
};
