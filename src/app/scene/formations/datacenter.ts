import { TAU, gauss, put, rand, rgb } from '../math';
import { Formation, FrameInfo, Projected, Targets } from '../types';

const FLOOR = -0.75;
const RACK_TOP = 0.38;
const RACK_W = 0.34;
const RACK_D = 0.4;
const COLS = 9;
const SLOTS = 10;
const CORE_TOP = 0.95;

const FRAME = rgb('#5a96e6');
const SLOT = rgb('#6eaaff');
const GRID = rgb('#4670c8');
const TEAL = rgb('#3ee6c4');
const AIR = rgb('#78aaff');
const LED_COLORS = [rgb('#62e6b4'), rgb('#62e6b4'), rgb('#62e6b4'), rgb('#62e6b4'), rgb('#62e6b4'), rgb('#62e6b4'), rgb('#62e6b4'), rgb('#71b8ff'), rgb('#71b8ff'), rgb('#ffb547')];

interface Rack {
  x: number;
  z: number;
  /** Ön yüzün z konumu (koridora bakar) */
  front: number;
  name: string;
}

type Kind = 'static' | 'led' | 'column' | 'helix' | 'ring' | 'stream' | 'air';

/**
 * Parçacıklardan veri merkezi: iki sıra kabin, ortada OneCore çekirdeği.
 * Her kabinden çekirdeğe kavisli kablo yolları boyunca veri akar.
 */
export class DatacenterFormation implements Formation {
  private readonly base: Targets;
  private readonly kind: Kind[];
  private readonly ref: Uint16Array;
  private readonly a: Float32Array;
  private readonly b: Float32Array;
  private readonly c: Float32Array;
  private readonly racks: Rack[] = [];
  private readonly scratch: Projected = { x: 0, y: 0, k: 1, z: 0 };

  constructor(private readonly n: number) {
    this.base = { pos: new Float32Array(n * 3), col: new Float32Array(n * 4), size: new Float32Array(n) };
    this.kind = new Array<Kind>(n).fill('static');
    this.ref = new Uint16Array(n);
    this.a = new Float32Array(n);
    this.b = new Float32Array(n);
    this.c = new Float32Array(n);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < COLS; col++) {
        const z = row === 0 ? -0.85 : 0.85;
        this.racks.push({
          x: -1.8 + col * 0.45,
          z,
          front: z + (row === 0 ? RACK_D / 2 : -RACK_D / 2),
          name: `${row === 0 ? 'A' : 'B'}-${String(col + 1).padStart(2, '0')}`,
        });
      }
    }

    // Bölüşüm: [çerçeve | yuvalar | LED | çekirdek | akış | zemin | hava]
    const shares: [Kind | 'frame' | 'slot' | 'grid', number][] = [
      ['frame', 0.25],
      ['slot', 0.15],
      ['led', 0.05],
      ['column', 0.05],
      ['helix', 0.04],
      ['ring', 0.04],
      ['stream', 0.18],
      ['grid', 0.13],
      ['air', 0.11],
    ];
    let i = 0;
    for (const [kind, share] of shares) {
      const end = kind === 'air' ? n : Math.min(n, i + Math.floor(n * share));
      for (; i < end; i++) this.init(kind, i);
    }
  }

  private init(kind: Kind | 'frame' | 'slot' | 'grid', i: number) {
    const B = this.base;
    const rackIdx = i % this.racks.length;
    const r = this.racks[rackIdx];
    switch (kind) {
      case 'frame': {
        // Kabin kutusunun 12 kenarından biri
        const x0 = r.x - RACK_W / 2;
        const x1 = r.x + RACK_W / 2;
        const z0 = r.z - RACK_D / 2;
        const z1 = r.z + RACK_D / 2;
        const u = Math.random();
        const e = Math.floor(Math.random() * 12);
        const lerp = (p: number, q: number) => p + (q - p) * u;
        const xs = [x0, x1];
        const ys = [FLOOR, RACK_TOP];
        const zs = [z0, z1];
        let x: number, y: number, z: number;
        if (e < 4) [x, y, z] = [lerp(x0, x1), ys[e & 1], zs[e >> 1]];
        else if (e < 8) [x, y, z] = [xs[e & 1], lerp(FLOOR, RACK_TOP), zs[(e >> 1) & 1]];
        else [x, y, z] = [xs[e & 1], ys[(e >> 1) & 1], lerp(z0, z1)];
        const top = y === RACK_TOP ? 0.25 : 0;
        put(B, i, x, y, z, FRAME[0] + top, FRAME[1] + top, FRAME[2], 0.42 + top, 1.3);
        break;
      }
      case 'slot': {
        const k = Math.floor(Math.random() * SLOTS);
        const y = FLOOR + 0.07 + (k * (RACK_TOP - FLOOR - 0.14)) / (SLOTS - 1);
        const x = r.x - RACK_W / 2 + 0.03 + Math.random() * (RACK_W - 0.06);
        put(B, i, x, y, r.front, SLOT[0], SLOT[1], SLOT[2], 0.2, 1.1);
        break;
      }
      case 'grid': {
        const u = Math.random();
        let x: number, z: number;
        if (Math.random() < 0.6) {
          x = -2.4 + Math.floor(Math.random() * 17) * 0.3;
          z = -1.6 + u * 3.2;
        } else {
          z = -1.5 + Math.floor(Math.random() * 11) * 0.3;
          x = -2.4 + u * 4.8;
        }
        const fade = Math.max(0, 1 - Math.hypot(x, z) / 2.9);
        put(B, i, x, FLOOR - 0.01, z, GRID[0], GRID[1], GRID[2], 0.04 + 0.16 * fade, 1.1);
        break;
      }
      case 'led': {
        const j = Math.floor(i / this.racks.length);
        const k = j % SLOTS;
        const y = FLOOR + 0.1 + (k * (RACK_TOP - FLOOR - 0.14)) / (SLOTS - 1);
        const x = r.x + RACK_W / 2 - 0.04 - (Math.floor(j / SLOTS) % 6) * 0.026;
        const z = r.front + (r.front > r.z ? 0.006 : -0.006);
        const c = LED_COLORS[Math.floor(Math.random() * LED_COLORS.length)];
        put(B, i, x, y, z, c[0], c[1], c[2], 1, 2);
        this.kind[i] = 'led';
        this.a[i] = rand(0.6, 5);
        this.b[i] = rand(0, TAU);
        this.c[i] = rand(-0.4, 0.7);
        break;
      }
      case 'column':
        this.kind[i] = 'column';
        this.a[i] = rand(0, TAU);
        this.b[i] = FLOOR + Math.random() * (CORE_TOP - FLOOR);
        this.c[i] = 0.1 + Math.abs(gauss()) * 0.04;
        break;
      case 'helix':
        this.kind[i] = 'helix';
        this.a[i] = (i % 2) * Math.PI;
        this.b[i] = Math.random();
        break;
      case 'ring':
        this.kind[i] = 'ring';
        this.a[i] = rand(0, TAU);
        this.ref[i] = i % 5;
        break;
      case 'stream': {
        this.kind[i] = 'stream';
        this.ref[i] = rackIdx;
        const off = Math.pow(Math.random(), 1.6) * 0.1;
        this.a[i] = Math.floor(Math.random() * 3) / 3 - off;
        this.b[i] = 1 - off / 0.1;
        this.c[i] = 0.16 + (rackIdx % 4) * 0.03;
        break;
      }
      case 'air':
        this.kind[i] = 'air';
        this.a[i] = rand(-2.2, 2.2);
        this.b[i] = Math.random();
        this.c[i] = Math.random() < 0.6 ? rand(-0.55, 0.55) : rand(-1.5, 1.5);
        this.ref[i] = Math.floor(rand(1, 4));
        break;
    }
  }

  write(T: Targets, f: FrameInfo) {
    const t = f.t;
    T.pos.set(this.base.pos);
    T.col.set(this.base.col);
    T.size.set(this.base.size);
    const span = CORE_TOP - FLOOR;

    for (let i = 0; i < this.n; i++) {
      switch (this.kind[i]) {
        case 'led': {
          const on = Math.sin(t * this.a[i] + this.b[i]) > this.c[i] ? 1 : 0.12;
          T.col[i * 4 + 3] = on;
          T.size[i] = on > 0.5 ? 2.1 : 1.4;
          break;
        }
        case 'column': {
          const ang = this.a[i] + t * 1.2;
          const y = this.b[i];
          const h = (y - FLOOR) / span;
          const w = 0.25 + h * 0.6;
          put(T, i, Math.cos(ang) * this.c[i], y, Math.sin(ang) * this.c[i], TEAL[0] + (1 - TEAL[0]) * w, TEAL[1] + (1 - TEAL[1]) * w, TEAL[2] + (1 - TEAL[2]) * w, 0.35 + h * 0.4, 1.5);
          break;
        }
        case 'helix': {
          const u = this.b[i];
          const y = FLOOR + u * span;
          const ang = this.a[i] + u * 9 - t * 1.6;
          const rr = 0.22 + Math.sin(u * Math.PI) * 0.05;
          put(T, i, Math.cos(ang) * rr, y, Math.sin(ang) * rr, 0.75, 0.95, 1, 0.75, 1.6);
          break;
        }
        case 'ring': {
          const k = this.ref[i];
          const ang = this.a[i] + t * 0.4;
          if (k < 3) {
            // Çekirdek boyunca yükselen halkalar
            const ph = (t * 0.22 + k / 3) % 1;
            const rr = 0.3 - ph * 0.08;
            put(T, i, Math.cos(ang) * rr, FLOOR + ph * span, Math.sin(ang) * rr, TEAL[0], TEAL[1], TEAL[2], Math.sin(ph * Math.PI) * 0.8, 1.4);
          } else {
            // Zemindeki sabit halkalar
            const rr = k === 3 ? 0.42 : 0.58;
            const pulse = 0.3 + 0.25 * Math.sin(t * 2 - k);
            put(T, i, Math.cos(ang) * rr, FLOOR, Math.sin(ang) * rr, TEAL[0], TEAL[1], TEAL[2], pulse, 1.3);
          }
          break;
        }
        case 'stream': {
          const r = this.racks[this.ref[i]];
          const u = (((this.a[i] + t * this.c[i]) % 1) + 1) % 1;
          const v = 1 - u;
          // Kabin tepesi → çekirdek tepesi (karesel Bezier)
          const cx = r.x * 0.55;
          const cz = r.z * 0.55;
          const x = v * v * r.x + 2 * v * u * cx;
          const y = v * v * (RACK_TOP + 0.02) + 2 * v * u * 1.3 + u * u * CORE_TOP;
          const z = v * v * r.z + 2 * v * u * cz;
          const tr = this.b[i];
          const w = tr * 0.5;
          put(T, i, x, y, z, TEAL[0] + (1 - TEAL[0]) * w, TEAL[1] + (1 - TEAL[1]) * w, TEAL[2] + (1 - TEAL[2]) * w, 0.15 + 0.85 * tr, 1.2 + tr * 1.3);
          break;
        }
        case 'air': {
          const y = FLOOR + ((this.b[i] + t * 0.03 * this.ref[i]) % 1) * 1.9;
          put(T, i, this.a[i] + Math.sin(t * 0.4 + i) * 0.03, y, this.c[i], AIR[0], AIR[1], AIR[2], 0.07, 1.3);
          break;
        }
      }
    }
  }

  overlay(g: CanvasRenderingContext2D, f: FrameInfo) {
    const p = this.scratch;

    // Çekirdek tabanından yayılan dalgalar
    for (let k = 0; k < 2; k++) {
      const ph = (f.t * 0.35 + k / 2) % 1;
      const rr = 0.3 + ph * 1.4;
      g.strokeStyle = `rgba(62,230,196,${(1 - ph) * 0.35})`;
      g.lineWidth = 1;
      g.beginPath();
      for (let s = 0; s <= 64; s++) {
        const a = (s / 64) * TAU;
        f.project(Math.cos(a) * rr, FLOOR, Math.sin(a) * rr, p);
        if (s) g.lineTo(p.x, p.y);
        else g.moveTo(p.x, p.y);
      }
      g.stroke();
    }

    // Çekirdek etiketi
    f.project(0, CORE_TOP + 0.08, 0, p);
    g.strokeStyle = 'rgba(62,230,196,0.5)';
    g.beginPath();
    g.moveTo(p.x + 6, p.y - 6);
    g.lineTo(p.x + 26, p.y - 26);
    g.lineTo(p.x + 140, p.y - 26);
    g.stroke();
    g.fillStyle = 'rgba(62,230,196,0.95)';
    g.font = '700 10px Inter, system-ui, sans-serif';
    g.fillText('ONECORE CORE', p.x + 30, p.y - 31);
    g.fillStyle = 'rgba(200,240,232,0.6)';
    g.font = '500 9px Inter, system-ui, sans-serif';
    g.fillText(`${this.racks.length} KABİN · 180 SUNUCU`, p.x + 30, p.y - 14);

    // Kabin numaraları
    g.font = '600 9px Inter, system-ui, sans-serif';
    for (const r of this.racks) {
      f.project(r.x, RACK_TOP + 0.08, r.z, p);
      const a = Math.min(1, p.k * 0.9);
      g.fillStyle = `rgba(160,200,255,${0.45 * a})`;
      g.textAlign = 'center';
      g.fillText(r.name, p.x, p.y);
    }
    g.textAlign = 'start';
  }
}
