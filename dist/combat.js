import { CHIPS } from "./core.js";
const ENEMIES = { hex: { name: "Bramble Imp", hp: 120, color: "#f16f74", interval: 2.5, tell: 0.8, damage: 32 }, spark: { name: "Will-o’-Wisp", hp: 90, color: "#f8d66d", interval: 1.9, tell: 0.65, damage: 24 }, frost: { name: "Frostling", hp: 150, color: "#8edcf4", interval: 2.7, tell: 0.9, damage: 30 }, flare: { name: "Ember Imp", hp: 130, color: "#ff956e", interval: 2.3, tell: 0.8, damage: 34 }, guard: { name: "Stone Warden", hp: 210, color: "#bea1fa", interval: 2.4, tell: 0.75, damage: 40 }, nova: { name: "Nova", hp: 520, color: "#ff8da9", interval: 1.9, tell: 0.75, damage: 42, boss: true }, echo: { name: "Echo", hp: 650, color: "#b9a5ff", interval: 1.8, tell: 0.8, damage: 40, boss: true }, queen: { name: "The Thorn Queen", hp: 1100, color: "#ef8ed4", interval: 1.8, tell: 0.75, damage: 48, boss: true } };
function seeded(seed = 1) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
class Battle {
  constructor({ mission, folder, equipment = {}, operator = "pulse", seed = 1, endless = false, cardMode = false }) {
    this.cardMode = cardMode;
    this.mission = mission;
    this.folder = [...folder];
    this.equipment = { ...equipment };
    this.operator = operator;
    this.random = seeded(seed);
    this.endless = endless;
    this.wave = 1;
    this.time = 0;
    this.status = "ready";
    this.p = { x: 1, y: 1, hp: 300, max: 300, shield: 0, inv: 0, moveAt: 0, shotAt: -1, charge: 0, boost: 0, grab: 0 };
    this.cooldowns = [0, 0, 0, 0, 0];
    this.shots = [];
    this.attacks = [];
    this.hazards = [];
    this.events = [];
    this.kills = 0;
    this.combos = 0;
    this.damage = 0;
    this.dodges = 0;
    this.chipUses = 0;
    this.maxCombo = 0;
    this.chain = 0;
    this.chainAt = -99;
    this.hitstop = 0;
    this.result = null;
    this.spawn(mission.enemies);
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  drain() {
    return this.events.splice(0);
  }
  spawn(types) {
    this.enemies = types.map((type, i) => {
      const d = ENEMIES[type];
      const scale = this.endless ? 1 + (this.wave - 1) * 0.15 : 1;
      const maxHp = Math.round(d.hp * scale * 0.75);
      return { id: i, type, ...d, hp: maxHp, max: maxHp, x: types.length === 1 ? 6 : 5 + i % 2, y: types.length === 1 ? 1 : i % 4, attackAt: this.time + 1.8 + i * 0.7, moveAt: this.time + 0.8 + i * 0.4, frozen: 0, wet: 0, flash: 0, phase: 1, pattern: 0 };
    });
  }
  start() {
    if (this.status === "ready") this.status = "running";
  }
  pause() {
    if (this.status === "running") this.status = "paused";
    else if (this.status === "paused") this.status = "running";
  }
  abandon() {
    if (["running", "paused"].includes(this.status)) {
      this.status = "lost";
      this.result = { abandoned: true };
      this.emit("defeat");
    }
  }
  damageEnemy(e, amount, element = "neutral", leech = false) {
    if (e.hp <= 0) return 0;
    let combo = false;
    if (element === "electric" && (e.wet > this.time || e.frozen > this.time)) {
      amount *= 2;
      combo = true;
    }
    if (element === "fire" && e.frozen > this.time) {
      amount = Math.round(amount * 1.5);
      e.frozen = 0;
      combo = true;
    }
    if (combo) {
      this.combos++;
      this.emit("combo", { x: e.x, y: e.y, text: element === "electric" ? "OVERLOAD ×2" : "SHATTER ×1.5" });
    }
    if (this.time - this.chainAt < 2.5) this.chain++;
    else this.chain = 1;
    this.chainAt = this.time;
    this.maxCombo = Math.max(this.maxCombo, this.chain);
    const actual = Math.min(e.hp, amount);
    e.hp = Math.max(0, e.hp - amount);
    e.flash = 0.12;
    this.damage += actual;
    this.p.charge = Math.min(100, this.p.charge + actual * 0.09);
    if (leech) this.p.hp = Math.min(this.p.max, this.p.hp + Math.floor(actual / 2));
    this.hitstop = 0.035;
    this.emit("hit", { x: e.x, y: e.y, amount, color: e.color });
    if (e.hp === 0) {
      this.kills++;
      this.p.charge = Math.min(100, this.p.charge + 15);
      this.emit("delete", { x: e.x, y: e.y, color: e.color });
      this.attacks = this.attacks.filter((a) => a.owner !== e.id);
    }
    return actual;
  }
  damagePlayer(amount) {
    if (this.p.inv > 0 || this.status !== "running") return;
    amount = Math.max(0, amount - (this.equipment.armor ? 5 : 0));
    const shield = Math.min(amount, this.p.shield);
    this.p.shield -= shield;
    amount -= shield;
    this.p.hp = Math.max(0, this.p.hp - amount);
    this.p.inv = 0.55;
    this.p.charge = Math.min(100, this.p.charge + 8);
    this.chain = 0;
    this.hitstop = 0.065;
    this.emit(amount ? "hurt" : "block", { x: this.p.x, y: this.p.y, amount });
    if (this.p.hp === 0) {
      this.status = "lost";
      this.result = { time: this.time, kills: this.kills, damage: this.damage, combos: this.combos };
      this.emit("defeat");
    }
  }
  shoot() {
    if (this.status !== "running" || this.time - this.p.shotAt < 0.25) return;
    this.p.shotAt = this.time;
    const damage = (this.equipment.buster ? 16 : 12) * (this.p.boost > this.time ? 2 : 1);
    this.shots.push({ x: this.p.x + 0.25, y: this.p.y, speed: 10, damage, kind: "buster", element: "neutral", hit: [] });
    this.emit("shot", { x: this.p.x, y: this.p.y });
  }
  useChip(index) {
    if (this.status !== "running" || !Number.isInteger(index) || index < 0 || index > 4) return false;
    if (!this.cardMode && this.cooldowns[index] > 0) {
      this.emit("notice", { text: "CHIP RELOADING" });
      return false;
    }
    const id = this.folder[index], c = CHIPS[id];
    if (!c) return false;
    this.cooldowns[index] = this.cardMode ? 0 : c.cooldown;
    this.chipUses++;
    this.emit("chip", { id, name: c.name, x: this.p.x, y: this.p.y });
    const living = this.enemies.filter((e) => e.hp > 0), row = living.filter((e) => e.y === this.p.y);
    if (id === "recover" || id === "repair") {
      this.p.hp = Math.min(this.p.max, this.p.hp + c.damage);
      if (id === "repair") this.hazards = this.hazards.filter((h) => h.x > 2);
      this.emit("heal", { x: this.p.x, y: this.p.y, amount: c.damage });
    } else if (id === "barrier") {
      this.p.shield = Math.min(100, this.p.shield + 50);
    } else if (id === "charge") {
      this.p.boost = this.time + 8;
    } else if (id === "areagrab") {
      this.p.grab = this.time + 6;
      for (const e of living) if (e.x === 4) e.x = 5;
      this.emit("area");
    } else if (id === "thunder") {
      const e = living.sort((a, b) => a.hp - b.hp)[0];
      if (e) {
        this.emit("lightning", { x: e.x, y: e.y });
        this.damageEnemy(e, c.damage, "electric");
      }
    } else if (["longsword", "gold", "vampire"].includes(id)) {
      let hit = false;
      this.emit("slash", { x: this.p.x, y: this.p.y, gold: id === "gold", color: id === "gold" ? "#ffe08a" : "#a8f5d9" });
      for (const e of row) if (e.x > this.p.x && e.x - this.p.x <= 2) {
        this.damageEnemy(e, c.damage, "neutral", id === "vampire");
        hit = true;
      }
      if (!hit) this.emit("notice", { text: "OUT OF RANGE · MOVE TO THE FRONT" });
    } else if (["firewall", "icewave"].includes(id)) {
      this.emit("wave", { y: this.p.y, color: id === "firewall" ? "#ff9770" : "#83d6fa" });
      for (const e of row) {
        this.damageEnemy(e, c.damage, c.element);
        if (id === "icewave") {
          e.frozen = this.time + 2;
          e.wet = this.time + 8;
          this.hazards.push({ x: e.x, y: e.y, kind: "wet", until: this.time + 8, next: 0 });
        }
      }
      if (id === "firewall") this.hazards = this.hazards.filter((h) => h.y !== this.p.y);
    } else {
      const rows = id === "shotgun" ? [0, 1, 2, 3] : [this.p.y];
      for (const y of rows) this.shots.push({ x: this.p.x + 0.2, y, speed: id === "prism" ? 14 : 8, damage: c.damage, kind: id, element: c.element, pierce: id === "prism", hit: [] });
    }
    this.checkVictory();
    return true;
  }
  overdrive() {
    if (this.status !== "running" || this.p.charge < 100) {
      this.emit("notice", { text: "OVERDRIVE CHARGES AS YOU FIGHT" });
      return false;
    }
    this.p.charge = 0;
    this.emit("overdrive", { operator: this.operator });
    if (this.operator === "echo") {
      for (const e of this.enemies) if (e.hp > 0) {
        e.frozen = this.time + 4;
        this.damageEnemy(e, 65, "neutral");
      }
      this.p.shield = Math.min(100, this.p.shield + 40);
    } else {
      for (const e of this.enemies) if (e.hp > 0) this.damageEnemy(e, this.operator === "nova" ? 110 : 90, "neutral");
      if (this.operator === "nova") this.p.hp = Math.min(this.p.max, this.p.hp + 30);
      else this.p.inv = 2;
    }
    this.checkVictory();
    return true;
  }
  planAttack(e) {
    const phase = e.hp / e.max < 0.33 ? 3 : e.hp / e.max < 0.66 ? 2 : 1;
    if (phase > e.phase && e.boss) {
      e.phase = phase;
      this.emit("phase", { name: e.name, phase });
    }
    e.pattern++;
    let cells = [];
    const p = this.p;
    const maxX = p.grab > this.time ? 4 : 3;
    const add = (x, y) => {
      if (!cells.some((c) => c.x === x && c.y === y)) cells.push({ x, y });
    };
    if (e.type === "nova" || e.type === "guard") {
      const col = p.x;
      for (let y = 0; y < 4; y++) add(col, y);
      if (e.type === "nova" && phase >= 2) {
        const extra = (col + 1) % 4;
        for (let y = 0; y < 4; y++) add(extra, y);
      }
    } else if (e.type === "echo" || e.type === "queen" && e.pattern % 3 === 0) {
      for (let x = 0; x <= maxX; x++) add(x, p.y);
      for (let y = 0; y < 4; y++) add(p.x, y);
    } else if (e.type === "queen" && e.pattern % 3 === 1) {
      for (let x = 0; x <= maxX; x++) for (let y = 0; y < 4; y++) if ((x + y) % 2 === e.pattern % 2) add(x, y);
    } else if (e.type === "spark") {
      add(p.x, p.y);
      if (phase >= 2) add(p.x, (p.y + 1) % 4);
    } else {
      for (let x = 0; x <= maxX; x++) add(x, p.y);
    }
    this.attacks.push({ owner: e.id, cells, fireAt: this.time + Math.max(0.5, e.tell - (phase - 1) * 0.07), damage: e.damage + (e.boss ? (phase - 1) * 4 : 0), color: e.color, kind: e.type });
    e.attackAt = this.time + Math.max(1.25, e.interval - (phase - 1) * 0.14);
    this.emit("warning", { cells });
  }
  checkVictory() {
    if (this.status !== "running" || this.enemies.some((e) => e.hp > 0)) return;
    if (this.endless) {
      this.wave++;
      this.p.hp = Math.min(300, this.p.hp + 40);
      this.attacks = [];
      this.shots = [];
      const pool = ["hex", "spark", "frost", "flare", "guard"];
      this.spawn(this.wave % 5 === 0 ? ["queen"] : Array.from({ length: Math.min(3, 1 + Math.floor(this.wave / 2)) }, () => pool[Math.floor(this.random() * pool.length)]));
      this.emit("newwave", { wave: this.wave });
      return;
    }
    this.status = "won";
    const ratio = this.p.hp / this.p.max;
    const rank = ratio >= 0.8 && this.time < 100 ? "S" : ratio >= 0.5 ? "A" : ratio >= 0.2 ? "B" : "C";
    this.result = { rank, time: this.time, kills: this.kills, combos: this.combos, damage: this.damage, chipUses: this.chipUses, dodges: this.dodges, maxCombo: this.maxCombo, wave: this.wave };
    this.emit("victory", this.result);
  }
  move(dx, dy) {
    if (this.status !== "running" || this.time < this.p.moveAt) return false;
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    if (!dx && !dy) return false;
    const p = this.p, x = Math.max(0, Math.min(p.grab > this.time ? 4 : 3, p.x + dx)), y = Math.max(0, Math.min(3, p.y + dy));
    if (x === p.x && y === p.y) return false;
    p.x = x;
    p.y = y;
    const icy = this.hazards.some((h) => h.x === x && h.y === y && h.kind === "ice");
    p.moveAt = this.time + (icy ? 0.22 : 0.12);
    this.emit("move", { x, y });
    return true;
  }
  update(dt, input = {}) {
    if (this.status !== "running") return;
    dt = Math.max(0, Math.min(dt, 0.05));
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return;
    }
    this.time += dt;
    const p = this.p;
    p.inv = Math.max(0, p.inv - dt);
    this.cooldowns = this.cooldowns.map((c) => Math.max(0, c - dt));
    if (p.x === 4 && p.grab <= this.time) {
      p.x = 3;
      this.emit("areaEnd");
    }
    this.move(input.dx || 0, input.dy || 0);
    if (input.fire) this.shoot();
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      if (e.hp <= 0 || e.frozen > this.time) continue;
      if (this.time >= e.moveAt) {
        if (e.type === "spark" || e.boss) {
          e.y = (e.y + 1 + Math.floor(this.random() * 3)) % 4;
          e.x = 4 + Math.floor(this.random() * 4);
        }
        e.moveAt = this.time + (e.boss ? 1.2 : 0.85);
      }
      if (this.time >= e.attackAt) this.planAttack(e);
    }
    for (const attack of this.attacks) {
      if (!attack.launched && this.time >= attack.fireAt - .15) {
        attack.launched = true;
        this.emit("attackLaunch", {...attack});
      }
    }
    const fired = this.attacks.filter((a) => this.time >= a.fireAt);
    this.attacks = this.attacks.filter((a) => this.time < a.fireAt);
    for (const a of fired) {
      this.emit("attack", { ...a });
      const hit = a.cells.some((c) => c.x === p.x && c.y === p.y);
      if (hit) this.damagePlayer(a.damage);
      else {
        this.dodges++;
        this.p.charge = Math.min(100, p.charge + 2);
      }
      if (["flare", "frost"].includes(a.kind)) {
        const c = a.cells[Math.floor(this.random() * a.cells.length)];
        this.hazards = this.hazards.filter((h) => h.x !== c.x || h.y !== c.y);
        this.hazards.push({ ...c, kind: a.kind === "flare" ? "fire" : "ice", until: this.time + 5, next: this.time + 0.8 });
      }
    }
    for (const s of this.shots) {
      const previousX = s.x;
      s.x += s.speed * dt;
      for (const e of this.enemies.filter((e2) => e2.hp > 0).sort((a, b) => a.x - b.x)) {
        if (s.x >= e.x - 0.3 && previousX <= e.x + 0.3 && s.y === e.y && !s.hit.includes(e.id)) {
          s.hit.push(e.id);
          this.damageEnemy(e, s.damage, s.element);
          if (!s.pierce) {
            s.x = 10;
            break;
          }
        }
      }
    }
    this.shots = this.shots.filter((s) => s.x < 8.5);
    this.hazards = this.hazards.filter((h) => h.until > this.time);
    for (const h of this.hazards) {
      if (h.kind === "fire" && h.x === p.x && h.y === p.y && this.time >= h.next) {
        h.next = this.time + 1;
        this.damagePlayer(12);
      }
    }
    this.checkVictory();
  }
}
export {
  Battle,
  ENEMIES,
  seeded
};
