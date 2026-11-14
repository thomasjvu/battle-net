const scores = {
  town: {tick:220, bass:[45,41,48,43], melody:[76,79,81,84,79,76,74,72], lead:'sine'},
  dungeon: {tick:197, bass:[38,39,35,36], melody:[62,69,70,64,63,67,66,60], lead:'triangle'},
  battle: {tick:119, bass:[40,40,43,38], melody:[76,79,83,86,83,79,74,78], lead:'square'},
  pvp: {tick:106, bass:[33,36,38,31], melody:[69,72,76,79,77,74,72,67], lead:'sawtooth'}
};
const pitch = note => 440 * 2 ** ((note - 69) / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.settings = { sound: false, music: false, volume: 0.3 };
    this.active = false;
    this.step = 0;
    this.timer = null;
    this.track = 'town';
    this.buffers = new Map();
    this.decoded = new Map();
    this.samples = Promise.resolve(null);
  }
  setTrack(track) {
    if (this.track === track) return;
    this.track = track;
    this.sync();
  }
  loadBuffer(file) {
    if (!/^[a-z0-9][a-z0-9_.-]*\.(ogg|mp3|wav|m4a)$/i.test(file ?? '')) return Promise.resolve(null);
    if (!this.buffers.has(file)) {
      this.buffers.set(file, fetch('assets/audio/' + file).then(response => {
        if (!response.ok) throw Error('Audio unavailable');
        return response.arrayBuffer();
      }).then(bytes => this.ctx.decodeAudioData(bytes)).then(buffer => {
        this.decoded.set(file,buffer);
        return buffer;
      }).catch(() => null));
    }
    return this.buffers.get(file);
  }
  async unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      if (!this.manifestRequested) {
        this.manifestRequested = true;
        this.samples = fetch('assets/audio/manifest.json').then(response => response.ok ? response.json() : null).catch(() => null);
        this.samples.then(manifest => {
          this.manifest = manifest;
          if (manifest) {
            for (const file of Object.values(manifest.sfx ?? {})) this.loadBuffer(file);
            this.sync();
          }
        });
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
    if (this.loop) {
      this.loop.stop();
      this.loop = null;
    }
    const generation = this.musicGeneration = (this.musicGeneration ?? 0) + 1;
    if (!this.settings.music || !this.active || !this.ctx) return;
    this.loadBuffer(this.manifest?.music?.[this.track]).then(buffer => {
      if (generation !== this.musicGeneration) return;
      if (!buffer) {
        this.step = 0;
        this.musicStep();
        this.timer = setInterval(() => this.musicStep(), (scores[this.track] ?? scores.town).tick);
        return;
      }
      const loop = this.ctx.createBufferSource();
      loop.buffer = buffer;
      loop.loop = true;
      loop.connect(this.master);
      loop.start();
      this.loop = loop;
    });
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
    const file = this.manifest?.sfx?.[type];
    if (file && this.ctx?.state === 'running') {
      const buffer = this.decoded.get(file);
      if (!buffer) { this.playFallback(type); return; }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.master);
      source.start();
      return;
    }
    this.playFallback(type);
  }
  playFallback(type) {
    switch (type) {
      case "encounter":
        this.tone(780,.25,"sawtooth",.16,0,.14);
        this.tone(130,.32,"triangle",.32,.08,.42);
        break;
      case "attack":
        this.tone(270,.13,"triangle",.22,0,.26);
        break;
      case "footstep":
        this.tone(95,.04,"triangle",.04);
        break;
      case "charged":
        this.tone(425,.21,"triangle",.32,0,.25);
        break;
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
      case "gate":
        this.tone(310,.22,"sine",.25,0,1.9);
        this.tone(620,.26,"triangle",.13,.06,1.5);
        break;
      case "gold":
      case "rare":
        this.tone(type==="rare"?1244:988,.16,"triangle",.22);
        break;
      case "block":
        this.tone(330,.11,"triangle",.26,0,1.8);
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
      case "ui":
      case "chip-load":
        this.tone(660, 0.08, "triangle", 0.2);
    }
  }
  musicStep() {
    if (!this.ctx || document.hidden) return;
    const score = scores[this.track] ?? scores.town;
    const step = this.step++;
    const driving = this.track === 'battle' || this.track === 'pvp';
    const root = score.bass[Math.floor(step / 8) % score.bass.length];
    if (step % 2 === 0) this.tone(pitch(root),score.tick*.0016,'triangle',.15);
    if (step % 8 === 0) {
      this.tone(pitch(root+12),.5,'sine',.055);
      this.tone(pitch(root+(this.track==='town'?19:15)),.55,'sine',.05);
    }
    if (driving || step % 2 === 0) {
      const note = score.melody[(step + Math.floor(step/8)*3)%8];
      this.tone(pitch(note),score.tick*.00088,score.lead,driving?.055:.09);
    }
    if (driving && step%4===0) this.tone(113,.11,'sine',.21,0,.32);

  }
}
export {
  AudioEngine
};
