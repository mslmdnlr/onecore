import { RGB, TAU, gauss, put, rand, rgb } from '../math';
import { Accent, Formation, FrameInfo, Targets } from '../types';

const CORE = rgb('#ffe2b4');
const BLUE = rgb('#6eafff');
const VIOLET = rgb('#af8cff');
const SPOT = rgb('#ffb48c');
const DUST = rgb('#7898e0');
const ACCENTS: Record<Exclude<Accent, null>, RGB> = {
  topology: rgb('#71deff'),
  radar: rgb('#ffa064'),
};

/**
 * Uygulama merkezi: üç kollu, farklı hızlarda dönen bir galaksi.
 * Kartların üzerine gelindiğinde kollar uygulamanın rengine bürünür.
 */
export class GalaxyFormation implements Formation {
  private readonly r: Float32Array;
  private readonly th: Float32Array;
  private readonly y: Float32Array;
  private readonly kind: Uint8Array;
  private readonly tone: Float32Array;
  private accentLevel = 0;
  private accentColor: RGB = ACCENTS.topology;

  constructor(private readonly n: number) {
    this.r = new Float32Array(n);
    this.th = new Float32Array(n);
    this.y = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.tone = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      this.tone[i] = Math.random();
      if (roll < 0.15) {
        // Çekirdek şişkinliği
        const rr = Math.abs(gauss()) * 0.26;
        this.kind[i] = 0;
        this.r[i] = rr;
        this.th[i] = rand(0, TAU);
        this.y[i] = gauss() * 0.13 * Math.exp(-rr * 3);
      } else if (roll < 0.88) {
        const arm = i % 3;
        const rr = 0.22 + Math.pow(Math.random(), 0.85) * 1.75;
        const spread = (0.28 + rr * 0.1) * gauss() * 0.55;
        this.kind[i] = Math.random() < 0.05 ? 2 : 1;
        this.r[i] = rr;
        this.th[i] = (arm * TAU) / 3 + rr * 2.3 + spread;
        this.y[i] = gauss() * 0.035;
      } else {
        const rr = 0.2 + Math.random() * 2.3;
        this.kind[i] = 3;
        this.r[i] = rr;
        this.th[i] = rand(0, TAU);
        this.y[i] = gauss() * 0.28;
      }
    }
  }

  write(T: Targets, f: FrameInfo) {
    const target = f.accent ? 1 : 0;
    if (f.accent) this.accentColor = ACCENTS[f.accent];
    this.accentLevel += (target - this.accentLevel) * Math.min(1, f.dt * 3);
    const lv = this.accentLevel * 0.6;
    const ac = this.accentColor;

    for (let i = 0; i < this.n; i++) {
      const rr = this.r[i];
      const ang = this.th[i] + (f.t * 0.32) / (0.35 + rr);
      const x = Math.cos(ang) * rr;
      const z = Math.sin(ang) * rr;
      const tn = this.tone[i];
      switch (this.kind[i]) {
        case 0:
          put(T, i, x, this.y[i], z, CORE[0], CORE[1], CORE[2], 0.4, 1.8);
          break;
        case 1: {
          const r = BLUE[0] + (VIOLET[0] - BLUE[0]) * tn;
          const g = BLUE[1] + (VIOLET[1] - BLUE[1]) * tn;
          const b = BLUE[2] + (VIOLET[2] - BLUE[2]) * tn;
          const fade = 1 - rr / 2.2;
          put(T, i, x, this.y[i], z, r + (ac[0] - r) * lv, g + (ac[1] - g) * lv, b + (ac[2] - b) * lv, 0.3 + 0.5 * fade, 1.3 + tn * 0.8);
          break;
        }
        case 2:
          put(T, i, x, this.y[i], z, SPOT[0], SPOT[1], SPOT[2], 0.95, 2.4);
          break;
        default:
          put(T, i, x, this.y[i], z, DUST[0], DUST[1], DUST[2], 0.08, 1.4);
      }
    }
  }
}
