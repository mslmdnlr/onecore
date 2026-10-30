import { CI_COLORS, CI_EDGES, CI_NODES, CI_TYPES, ROOT_COLOR } from '../topology-data';
import { RGB, TAU, Vec3, gauss, normalize, put, rand, randomDir, rgb } from '../math';
import { Formation, FrameInfo, HoverInfo, Projected, Targets } from '../types';

const DUST = rgb('#6e8cc8');
const PACKETS = 5;

/**
 * CMDB topolojisi: her CI bir parçacık bulutu, her bağlantı merkeze doğru
 * akan bir veri nehri. Üzerine gelinen düğüm ve komşuları öne çıkar;
 * "etki analizi" çekirdekten dışa doğru dalga dalga yayılır.
 */
export class NetworkFormation implements Formation {
  private readonly kind: Uint8Array;
  private readonly ref: Uint16Array;
  private readonly vec: Float32Array;
  private readonly u0: Float32Array;
  private readonly speed: Float32Array;
  private readonly trail: Float32Array;

  private readonly colors: RGB[];
  private readonly depth: number[];
  /** Akış yönü: [kaynak, hedef] — hedef çekirdeğe daha yakındır */
  private readonly flows: [number, number][];
  private readonly bulge: Vec3[];
  private readonly neighbors: Set<number>[];
  private readonly glow: Float32Array;
  private readonly screen: Projected[];
  private hovered = -1;
  private lastHover = -2;

  constructor(
    private readonly n: number,
    private readonly onHover: (info: HoverInfo | null, x: number, y: number) => void,
  ) {
    this.kind = new Uint8Array(n);
    this.ref = new Uint16Array(n);
    this.vec = new Float32Array(n * 3);
    this.u0 = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.trail = new Float32Array(n);

    this.colors = CI_NODES.map((c, i) => rgb(i === 0 ? ROOT_COLOR : CI_COLORS[c.type]));
    this.neighbors = CI_NODES.map(() => new Set<number>());
    for (const [a, b] of CI_EDGES) {
      this.neighbors[a].add(b);
      this.neighbors[b].add(a);
    }
    this.depth = this.bfs();
    this.flows = CI_EDGES.map(([a, b]) => (this.depth[a] <= this.depth[b] ? [b, a] : [a, b]));
    this.bulge = this.flows.map(([a, b]) => {
      const A = CI_NODES[a].pos;
      const B = CI_NODES[b].pos;
      const mid: Vec3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2 + 0.3];
      const len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
      const d = normalize(mid);
      return [d[0] * len * 0.12, d[1] * len * 0.12, d[2] * len * 0.12];
    });
    this.glow = new Float32Array(CI_NODES.length);
    this.screen = CI_NODES.map(() => ({ x: 0, y: 0, k: 1, z: 0 }));

    const weights = CI_NODES.map((_, i) => (i === 0 ? 5 : this.depth[i] === 1 ? 2 : 1.3));
    const wSum = weights.reduce((a, b) => a + b, 0);
    const clusterEnd = Math.floor(n * 0.24);
    const streamEnd = clusterEnd + Math.floor(n * 0.66);

    let i = 0;
    weights.forEach((w, node) => {
      const count = Math.floor((w / wSum) * clusterEnd);
      const radius = node === 0 ? 0.17 : this.depth[node] === 1 ? 0.1 : 0.075;
      for (let c = 0; c < count && i < clusterEnd; c++, i++) {
        const d = randomDir();
        const r = Math.abs(gauss()) * radius;
        this.kind[i] = 0;
        this.ref[i] = node;
        this.vec.set([d[0] * r, d[1] * r, d[2] * r], i * 3);
      }
    });
    for (; i < streamEnd; i++) {
      const off = Math.pow(Math.random(), 1.5) * 0.14;
      this.kind[i] = 1;
      this.ref[i] = i % CI_EDGES.length;
      this.u0[i] = Math.floor(Math.random() * PACKETS) / PACKETS - off;
      this.trail[i] = 1 - off / 0.14;
      this.speed[i] = 0.09 + (this.ref[i] % 5) * 0.012;
      this.vec.set([gauss() * 0.014, gauss() * 0.014, gauss() * 0.014], i * 3);
    }
    for (; i < n; i++) {
      const d = randomDir();
      const r = rand(2.5, 3.6);
      this.kind[i] = 2;
      this.vec.set([d[0] * r, d[1] * r * 0.8, d[2] * r], i * 3);
    }
  }

  private bfs(): number[] {
    const depth = CI_NODES.map(() => Infinity);
    depth[0] = 0;
    const queue = [0];
    while (queue.length) {
      const a = queue.shift()!;
      for (const b of this.neighbors[a]) {
        if (depth[b] === Infinity) {
          depth[b] = depth[a] + 1;
          queue.push(b);
        }
      }
    }
    return depth;
  }

  reset() {
    this.hovered = -1;
    this.lastHover = -2;
    this.onHover(null, 0, 0);
  }

  write(T: Targets, f: FrameInfo) {
    const t = f.t;
    const casc = f.fxAge('cascade');
    for (let j = 0; j < CI_NODES.length; j++) {
      const lit = casc - this.depth[j] * 0.45;
      this.glow[j] = casc < 10 && lit >= 0 ? Math.exp(-lit * 1.3) : 0;
    }
    const h = this.hovered;
    const focus = (node: number) => (h < 0 ? 1 : node === h || this.neighbors[h].has(node) ? 1.5 : 0.28);
    const v = this.vec;

    for (let i = 0; i < this.n; i++) {
      const o = i * 3;
      if (this.kind[i] === 0) {
        const node = this.ref[i];
        const p = CI_NODES[node].pos;
        const breathe = 1 + 0.15 * Math.sin(t * 1.6 + i);
        const c = this.colors[node];
        const gl = this.glow[node];
        const w = gl * 0.8;
        put(
          T, i,
          p[0] + v[o] * breathe, p[1] + v[o + 1] * breathe, p[2] + v[o + 2] * breathe,
          c[0] + (1 - c[0]) * w, c[1] + (1 - c[1]) * w, c[2] + (1 - c[2]) * w,
          Math.min(1, 0.5 * focus(node) + gl * 0.5),
          (node === 0 ? 2 : 1.6) * (1 + gl),
        );
      } else if (this.kind[i] === 1) {
        const e = this.ref[i];
        const [from, to] = this.flows[e];
        const A = CI_NODES[from].pos;
        const B = CI_NODES[to].pos;
        const u = (((this.u0[i] + t * this.speed[i]) % 1) + 1) % 1;
        const arch = Math.sin(Math.PI * u);
        const bl = this.bulge[e];
        const jit = 0.4 + arch;
        const cf = this.colors[from];
        const ct = this.colors[to];
        const tr = this.trail[i];
        const incident = h < 0 ? 1 : from === h || to === h ? 1.7 : 0.25;
        const gl = Math.max(this.glow[from], this.glow[to]) * 0.7;
        put(
          T, i,
          A[0] + (B[0] - A[0]) * u + bl[0] * arch + v[o] * jit,
          A[1] + (B[1] - A[1]) * u + bl[1] * arch + v[o + 1] * jit,
          A[2] + (B[2] - A[2]) * u + bl[2] * arch + v[o + 2] * jit,
          cf[0] + (ct[0] - cf[0]) * u + gl,
          cf[1] + (ct[1] - cf[1]) * u + gl,
          cf[2] + (ct[2] - cf[2]) * u + gl,
          Math.min(1, (0.12 + 0.7 * tr) * incident + gl * 0.4),
          1.1 + tr * 1.1,
        );
      } else {
        put(T, i, v[o], v[o + 1], v[o + 2], DUST[0], DUST[1], DUST[2], 0.07, 1.4);
      }
    }
  }

  overlay(g: CanvasRenderingContext2D, f: FrameInfo) {
    const sc = this.screen;
    CI_NODES.forEach((c, i) => f.project(c.pos[0], c.pos[1], c.pos[2], sc[i]));

    // İmlece en yakın düğüm
    let best = -1;
    let bestD = 30 * 30;
    if (f.pointer) {
      sc.forEach((p, i) => {
        const d = (p.x - f.pointer!.x) ** 2 + (p.y - f.pointer!.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
    }
    this.hovered = best;
    if (best >= 0) {
      const c = CI_NODES[best];
      const p = sc[best];
      this.onHover(
        {
          title: c.name,
          subtitle: `${best === 0 ? 'Çekirdek' : CI_TYPES[c.type]} · ${this.neighbors[best].size} bağlantı · Örnek CI`,
          color: best === 0 ? ROOT_COLOR : CI_COLORS[c.type],
        },
        p.x,
        p.y,
      );
    } else if (this.lastHover !== -1) {
      this.onHover(null, 0, 0);
    }
    this.lastHover = best;

    g.lineWidth = 1;
    for (const [a, b] of CI_EDGES) {
      const on = best >= 0 && (a === best || b === best);
      g.strokeStyle = on ? 'rgba(170,225,255,0.45)' : `rgba(120,190,255,${best >= 0 ? 0.04 : 0.09})`;
      g.beginPath();
      g.moveTo(sc[a].x, sc[a].y);
      g.lineTo(sc[b].x, sc[b].y);
      g.stroke();
    }

    const casc = f.fxAge('cascade');
    g.textAlign = 'center';
    CI_NODES.forEach((c, i) => {
      const p = sc[i];
      const dim = best >= 0 && i !== best && !this.neighbors[best].has(i);
      const a = (dim ? 0.25 : 0.9) * Math.min(1, p.k * 1.1);
      const lit = casc - this.depth[i] * 0.45;
      if (casc < 10 && lit >= 0 && lit < 1.4) {
        const k = lit / 1.4;
        g.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.7})`;
        g.beginPath();
        g.arc(p.x, p.y, 8 + k * 46, 0, TAU);
        g.stroke();
      }
      if (i === best) {
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.beginPath();
        g.arc(p.x, p.y, (i === 0 ? 22 : 14) * p.k, 0, TAU);
        g.stroke();
      }
      g.fillStyle = `rgba(222,240,255,${a})`;
      g.font = i === 0 ? '800 13px Inter, system-ui, sans-serif' : '600 10.5px Inter, system-ui, sans-serif';
      g.fillText(i === 0 ? 'ONECORE' : c.name, p.x, p.y - (i === 0 ? 30 : 17) * p.k);
    });
    g.textAlign = 'start';
  }
}
