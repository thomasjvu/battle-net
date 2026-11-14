class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.settings = { sound: false, music: false, volume: 0.3 };
    this.active = false;
    this.step = 0;
    this.timer = null;
  }
  async unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      await this.ctx.resume();
      this.master.gain.value = this.settings.volume * 0.22;
    } catch {
    }
  }
  configure(settings) {
    this.settings = settings;
    if (this.master) this.master.gain.value = settings.volume * 0.22;
    this.sync();
  }
  sync() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.settings.music && this.active && this.ctx) {
      this.timer = setInterval(() => this.musicStep(), 180);
    }
  }
  setActive(value) {
    if (this.active !== value) {
      this.active = value;
      this.sync();
    }
  }
  tone(freq, duration = 0.1, type = "square", volume = 0.3, delay = 0, slide = 1) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + duration);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.01);
  }
  play(type) {
    if (!this.settings.sound) return;
    switch (type) {
      case "shot":
        this.tone(900, 0.045, "square", 0.09, 0, 0.4);
        break;
      case "hit":
        this.tone(190, 0.065, "sawtooth", 0.18, 0, 0.3);
        break;
      case "hurt":
        this.tone(100, 0.18, "sawtooth", 0.28, 0, 0.4);
        break;
      case "delete":
        this.tone(500, 0.18, "sawtooth", 0.18, 0, 0.15);
        break;
      case "chip":
        this.tone(600, 0.1, "triangle", 0.3);
        this.tone(1100, 0.18, "triangle", 0.2, 0.07);
        break;
      case "heal":
        this.tone(440, 0.1, "sine", 0.3);
        this.tone(660, 0.13, "sine", 0.3, 0.1);
        this.tone(880, 0.2, "sine", 0.25, 0.2);
        break;
      case "warning":
        this.tone(250, 0.05, "triangle", 0.08);
        break;
      case "combo":
      case "overdrive":
        [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.2, "square", 0.15, i * 0.06));
        break;
      case "victory":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, "square", 0.25, i * 0.12));
        break;
      case "defeat":
        [440, 330, 220, 110].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.25, i * 0.15));
        break;
      default:
        this.tone(660, 0.08, "triangle", 0.2);
    }
  }
  musicStep() {
    if (!this.ctx || document.hidden) return;
    const melody = [76, 79, 83, 79, 74, 78, 81, 78, 72, 76, 79, 76, 74, 78, 81, 86];
    const bass = [40, 40, 38, 38, 36, 36, 38, 38];
    const n = melody[this.step % 16];
    this.tone(440 * 2 ** ((n - 69) / 12), 0.14, "triangle", 0.075);
    if (this.step % 2 === 0) this.tone(440 * 2 ** ((bass[Math.floor(this.step / 2) % 8] - 69) / 12), 0.28, "triangle", 0.14);
    this.step++;
  }
}
export {
  AudioEngine
};
