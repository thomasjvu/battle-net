const ITEM_IDS = ["cannon", "longsword", "thunder", "recover", "barrier", "gold", "buster", "armor", "shotgun", "firewall", "icewave", "areagrab", "charge", "vampire", "prism", "repair", "gust", "stonewall", "poison", "bloom", "meteor", "tidal", "chainlight", "cleave", "dash", "echo", "draw", "focus", "thorns", "revive", "slow", "storm"];
const DECOR_IDS = ["home_planter_signal", "home_lamp_moon", "home_bench_cloud", "home_pond_memory", "home_rug_starweave", "home_sculpture_orbit"];
const TOKEN_IDS = [...ITEM_IDS, ...DECOR_IDS];
function parseNear(text) {
  const value = String(text).trim();
  if (!/^(0|[1-9]\d{0,3})(\.\d{1,24})?$/.test(value)) throw Error("Enter a NEAR amount with at most 24 decimal places");
  const [whole, frac = ""] = value.split(".");
  return (BigInt(whole) * 10n ** 24n + BigInt(frac.padEnd(24, "0"))).toString();
}
function formatNear(value) {
  const n = BigInt(value), whole = n / 10n ** 24n, frac = (n % 10n ** 24n).toString().padStart(24, "0").replace(/0+$/, "");
  return `${whole}${frac ? "." + frac : ""}`;
}
const isTestnetAccount = (id) => typeof id === "string" && /^(?:[a-z0-9]+(?:[._-][a-z0-9]+)*\.testnet|[a-f0-9]{64})$/.test(id) && id.length <= 64;
class NearEconomy {
  constructor(onChange = () => {
  }) {
    this.onChange = onChange;
    this.connector = null;
    this.account = null;
    this.config = null;
    this.contractConfig = null;
    this.player = null;
    this.decorItems = {};
    this.canClaimStarterDecor = false;
    this.listings = [];
    this.busy = false;
    this.error = "";
    this.requestId = 0;
  }
  async init() {
    const r = await fetch("./near-config.json");
    if (!r.ok) throw Error("Unable to read network configuration");
    const config = await r.json();
    if (config.network !== "testnet" || config.rpcUrl !== "https://rpc.testnet.near.org" ||
        (config.contractId && !isTestnetAccount(config.contractId))) throw Error("Unsupported network configuration");
    this.config = config;
    const custom = localStorage.getItem("battle-net-contract");
    if (custom && isTestnetAccount(custom)) this.config.contractId = custom;
    this.onChange();
    if (this.config.contractId) {
      await this.setup();
      try {
        const { accounts } = await this.connector.getConnectedWallet();
        if (isTestnetAccount(accounts[0]?.accountId)) this.account = accounts[0].accountId;
      } catch {
      }
      await this.refresh();
    }
  }
  async setup() {
    if (this.connector) return;
    const { NearConnector } = await import("./vendor/wallet.js");
    this.connector = new NearConnector({ network: "testnet", features: { testnet: true }, autoConnect: false });
    this.connector.on("wallet:signIn", ({ accounts }) => {
      const account = accounts[0]?.accountId;
      if (!isTestnetAccount(account)) {
        this.error = "Connect a testnet account.";
        this.account = null;
      } else this.account = account;
      this.refresh();
    });
    this.connector.on("wallet:signOut", () => {
      this.requestId++;
      this.account = null;
      this.player = null;
      this.decorItems = {};
      this.canClaimStarterDecor = false;
      this.listings = [];
      this.onChange();
    });
  }
  async connect() {
    await this.setup();
    await this.connector.connect();
    const w = await this.connector.wallet();
    const a = await w.getAccounts();
    if (!isTestnetAccount(a[0]?.accountId)) throw Error("Use a NEAR testnet account");
    this.account = a[0].accountId;
    await this.refresh();
  }
  async disconnect() {
    if (this.connector) await this.connector.disconnect();
    this.requestId++;
    this.account = null;
    this.player = null;
    this.decorItems = {};
    this.canClaimStarterDecor = false;
    this.onChange();
  }
  configure(contractId) {
    if (this.busy) throw Error("Finish the pending transaction before changing contracts");
    if (!isTestnetAccount(contractId)) throw Error("Enter a valid .testnet contract account");
    this.config.contractId = contractId;
    localStorage.setItem("battle-net-contract", contractId);
    this.player = null;
    this.decorItems = {};
    this.canClaimStarterDecor = false;
    this.contractConfig = null;
    return this.refresh();
  }
  async rpc(method, params) {
    const r = await fetch(this.config.rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: "battle-net", method, params }), signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw Error(`NEAR RPC unavailable (${r.status})`);
    const result = await r.json();
    if (result.error) throw Error(result.error.cause?.name || result.error.message || "NEAR request failed");
    return result.result;
  }
  async view(method, args = {}) {
    if (!this.config?.contractId) throw Error("Contract not configured yet");
    const bytes = new TextEncoder().encode(JSON.stringify(args));
    const args_base64 = btoa(String.fromCharCode(...bytes));
    const result = await this.rpc("query", { request_type: "call_function", finality: "final", account_id: this.config.contractId, method_name: method, args_base64 });
    if (!Array.isArray(result?.result)) throw Error(result?.error || "Invalid NEAR view response");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(result.result)));
  }
  async refresh() {
    const request = ++this.requestId;
    this.error = "";
    if (!this.config?.contractId) {
      this.onChange();
      return;
    }
    const account = this.account;
    try {
      const [config, listings, player] = await Promise.all([this.view("get_config"), this.view("get_listings", { from_index: 0, limit: 100 }), account ? this.view("get_player", { account_id: account }) : null]);
      if (request !== this.requestId) return;
      const contractIds = Array.isArray(config.item_ids) ? config.item_ids : [...(config.card_ids ?? []), ...(config.decor_ids ?? [])];
      if (config.version !== "0.5.0" || config.standard !== "nep245" || JSON.stringify(contractIds) !== JSON.stringify(TOKEN_IDS) || (config.decor_ids && JSON.stringify(config.decor_ids) !== JSON.stringify(DECOR_IDS)) || !/^\d+$/.test(config.registration_deposit) || !/^\d+$/.test(config.listing_deposit)) throw Error("This account does not host the Battle Net contract");
      if (!Array.isArray(listings) || listings.some((l) => !TOKEN_IDS.includes(l.item_id) || !Number.isSafeInteger(l.quantity) || l.quantity < 1 || typeof l.seller !== "string" || !/^\d+$/.test(l.price) || !/^\d+$/.test(String(l.id)))) throw Error("Invalid listing data returned by contract");
      if (player && (!Array.isArray(player.items) || player.items.length !== 38 || player.items.some((n) => !Number.isSafeInteger(n) || n < 0) || !/^\d+$/.test(player.proceeds) || !Number.isInteger(player.active_listings) || typeof player.withdrawing !== "boolean")) throw Error("Invalid wallet inventory returned by contract");
      let decorItems = {};
      let canClaimStarterDecor = false;
      if (player) {
        const [balances, canClaim] = await Promise.all([
          this.view("decor_balances_of", { account_id: account }),
          this.view("can_claim_starter_decor", { account_id: account })
        ]);
        if (!Array.isArray(balances) || balances.length !== DECOR_IDS.length || balances.some((n) => !/^\d+$/.test(String(n)) || !Number.isSafeInteger(Number(n)))) throw Error("Invalid decoration balances returned by contract");
        if (typeof canClaim !== "boolean") throw Error("Invalid home starter claim state returned by contract");
        decorItems = Object.fromEntries(DECOR_IDS.map((id, i) => [id, Number(balances[i])]));
        canClaimStarterDecor = canClaim;
      }
      this.contractConfig = config;
      this.listings = listings;
      this.player = player;
      this.decorItems = decorItems;
      this.canClaimStarterDecor = canClaimStarterDecor;
    } catch (e) {
      if (request !== this.requestId) return;
      this.error = e.message;
      this.player = null;
      this.decorItems = {};
      this.canClaimStarterDecor = false;
      this.contractConfig = null;
      this.listings = [];
    }
    this.onChange();
  }
  async transact(method, args = {}, deposit = "1") {
    if (this.busy) throw Error("A transaction is already pending");
    if (!this.account || !this.config?.contractId || !this.contractConfig) throw Error("Connect a wallet and a deployed contract first");
    const receiverId = this.config.contractId, signerId = this.account;
    this.busy = true;
    this.error = "";
    this.onChange();
    try {
      const wallet = await this.connector.wallet();
      const outcome = await wallet.signAndSendTransaction({ receiverId, signerId, actions: [{ type: "FunctionCall", params: { methodName: method, args, gas: "100000000000000", deposit } }] });
      if (outcome?.status?.Failure) throw Error("Transaction failed. Check your wallet activity.");
      if (outcome === void 0) {
        this.error = "Wallet signing opened. Refresh after the transaction confirms.";
      } else await this.refresh();
      return outcome;
    } catch (e) {
      this.error = e.message || "Transaction cancelled";
      throw e;
    } finally {
      this.busy = false;
      this.onChange();
    }
  }
}
export {
  DECOR_IDS,
  ITEM_IDS,
  TOKEN_IDS,
  NearEconomy,
  formatNear,
  isTestnetAccount,
  parseNear
};
