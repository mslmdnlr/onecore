import { TAU, gauss, put, rand, rgb, wrap } from '../math';
import { Formation, FrameInfo, Projected, RadarStats, Targets } from '../types';

const RINGS = 7;
const RIM = 2.1;
const SIGNALS = 120;
const ORANGE = rgb('#ffa05a');
const HOT_WHITE = rgb('#ffe1b4');
const SIGNAL = rgb('#ffbe78');
const HOT = rgb('#ff5546');
const DUST = rgb('#c8784a');
const CI_NAMES = ['MSSQL-PRD', 'ORACLE-RAC', 'K8S-CLUSTER', 'F5 LTM', 'APP-WEB-01', 'LINUX-01', 'WIN-SRV-02', 'POSTGRES-01', 'FIREWALL', 'API Gateway', 'CMDB Portal'];

interface Signal {
  phi: number;
  r: number;
  y: number;
  hot: boolean;
  label: string;
  glow: number;
}

/**
 * 3B radar: halkalar ve ışınlardan oluşan bir disk, üzerinde süzülen
 * olay sinyalleri. Tarama ışını geçtikçe sinyaller parlar; kritik alarmlar
 * kırmızı nabız atar.
 */
export class RadarFormation implements Formation {
  private readonly kind: Uint8Array;
  private readonly phi: Float32Array;
  private readonly rad: Float32Array;
  private readonly vec: Float32Array;
  private readonly ref: Uint16Array;
  private readonly signals: Signal[] = [];
  private readonly correlations: number;
  private readonly scratch: Projected = { x: 0, y: 0, k: 1, z: 0 };
  private readonly scratch2: Projected = { x: 0, y: 0, k: 1, z: 0 };
  private sweep = 0;
  private statsAt = 0;

  constructor(
    private readonly n: number,
    private readonly onStats: (s: RadarStats) => void,
  ) {
    this.kind = new Uint8Array(n);
    this.phi = new Float32Array(n);
    this.rad = new Float32Array(n);
    this.vec = new Float32Array(n * 3);
    this.ref = new Uint16Array(n);

    for (let s = 0; s < SIGNALS; s++) {
      const hot = s % 11 === 3;
      this.signals.push({
        phi: rand(0, TAU),
        r: rand(0.35, 2),
        y: gauss() * 0.3,
        hot,
        label: `ALM-${1040 + s} · ${CI_NAMES[Math.floor(s / 11) % CI_NAMES.length]}`,
        glow: 0,
      });
    }
    const hot = this.signals.filter((s) => s.hot);
    this.correlations = hot.reduce(
      (acc, h) =>
        acc +
        this.signals.filter((s) => !s.hot && Math.hypot(Math.cos(s.phi) * s.r - Math.cos(h.phi) * h.r, Math.sin(s.phi) * s.r - Math.sin(h.phi) * h.r) < 0.5).length,
      0,
    );

    const ringEnd = Math.floor(n * 0.5);
    const spokeEnd = ringEnd + Math.floor(n * 0.06);
    const signalEnd = spokeEnd + Math.floor(n * 0.3);
    for (let i = 0; i < n; i++) {
      if (i < ringEnd) {
        const ring = Math.min(RINGS - 1, Math.floor(Math.sqrt(Math.random()) * RINGS));
        this.kind[i] = 0;
        this.rad[i] = 0.3 * (ring + 1) + gauss() * 0.006;
        this.phi[i] = rand(0, TAU);
      } else if (i < spokeEnd) {
        this.kind[i] = 1;
        this.rad[i] = Math.random() * RIM;
        this.phi[i] = (Math.floor(Math.random() * 12) * TAU) / 12;
      } else if (i < signalEnd) {
        const s = i % SIGNALS;
        const spread = this.signals[s].hot ? 0.05 : 0.03;
        this.kind[i] = 2;
        this.ref[i] = s;
        this.phi[i] = this.signals[s].phi;
        this.vec.set([gauss() * spread, gauss() * spread, gauss() * spread], i * 3);
      } else {
        this.kind[i] = 3;
        const r = Math.sqrt(Math.random()) * 2.5;
        const a = rand(0, TAU);
        this.vec.set([Math.cos(a) * r, gauss() * 0.5, Math.sin(a) * r], i * 3);
      }
    }
  }

  write(T: Targets, f: FrameInfo) {
    const { t, dt } = f;
    const scanAge = f.fxAge('scan');
    const boost = scanAge < 8 ? Math.exp(-scanAge * 0.55) : 0;
    this.sweep = wrap(this.sweep + dt * 0.9 * (1 + boost * 3.5));
    const sweep = this.sweep;
    const waveR = scanAge * 1.7;
    const waveOn = scanAge < 2;

    for (const s of this.signals) s.glow = Math.exp(-wrap(sweep - s.phi) * 0.75);

    const v = this.vec;
    for (let i = 0; i < this.n; i++) {
      const o = i * 3;
      const k = this.kind[i];
      if (k === 0 || k === 1) {
        const r = this.rad[i];
        const p = this.phi[i];
        const gl = Math.exp(-wrap(sweep - p) * (k === 0 ? 2.2 : 3));
        const bump = waveOn ? Math.exp(-((r - waveR) ** 2) / 0.015) : 0;
        const w = Math.min(1, gl + bump);
        put(
          T, i,
          Math.cos(p) * r, bump * 0.16, Math.sin(p) * r,
          ORANGE[0] + (HOT_WHITE[0] - ORANGE[0]) * w,
          ORANGE[1] + (HOT_WHITE[1] - ORANGE[1]) * w,
          ORANGE[2] + (HOT_WHITE[2] - ORANGE[2]) * w,
          (k === 0 ? 0.32 : 0.13) + 0.68 * w,
          1.2 + w * 0.9,
        );
      } else if (k === 2) {
        const s = this.signals[this.ref[i]];
        const drift = Math.sin(t * 0.3 + s.r * 5) * 0.03;
        const x = Math.cos(s.phi + drift) * s.r + v[o];
        const z = Math.sin(s.phi + drift) * s.r + v[o + 2];
        const y = s.y + v[o + 1] + Math.sin(t + s.r * 7) * 0.02;
        if (s.hot) {
          const pulse = 0.65 + 0.35 * Math.sin(t * 4 + s.r * 10);
          put(T, i, x, y, z, HOT[0], HOT[1], HOT[2], pulse, 1.8 + pulse);
        } else {
          const gl = Math.min(1, s.glow + boost * 0.4);
          put(T, i, x, y, z, SIGNAL[0], SIGNAL[1], SIGNAL[2], 0.1 + 0.85 * gl, 1.2 + gl * 1.4);
        }
      } else {
        put(T, i, v[o], v[o + 1], v[o + 2], DUST[0], DUST[1], DUST[2], 0.06, 1.3);
      }
    }

    if (t - this.statsAt > 0.3) {
      this.statsAt = t;
      this.onStats({
        events: this.signals.filter((s) => s.glow > 0.3).length,
        alarms: this.signals.filter((s) => s.hot).length,
        correlations: this.correlations,
      });
    }
  }

  overlay(g: CanvasRenderingContext2D, f: FrameInfo) {
    const p = this.scratch;
    const q = this.scratch2;
    const o = f.project(0, 0, 0, { x: 0, y: 0, k: 1, z: 0 });

    // Tarama yelpazesi
    for (let i = 0; i < 60; i++) {
      const a = this.sweep - i * 0.013;
      f.project(Math.cos(a) * RIM, 0, Math.sin(a) * RIM, p);
      g.strokeStyle = `rgba(255,160,95,${(i === 0 ? 0.7 : 0.16) * (1 - i / 60)})`;
      g.lineWidth = i === 0 ? 1.4 : 1;
      g.beginPath();
      g.moveTo(o.x, o.y);
      g.lineTo(p.x, p.y);
      g.stroke();
    }

    // Kenar halkası ve derece etiketleri
    g.strokeStyle = 'rgba(255,170,110,0.35)';
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * TAU;
      f.project(Math.cos(a) * RIM * 1.04, 0, Math.sin(a) * RIM * 1.04, p);
      if (i) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
    }
    g.stroke();
    g.font = '600 9px Inter, system-ui, sans-serif';
    g.textAlign = 'center';
    for (let d = 0; d < 360; d += 30) {
      const a = (d * Math.PI) / 180;
      f.project(Math.cos(a) * RIM * 1.13, 0, Math.sin(a) * RIM * 1.13, p);
      g.fillStyle = `rgba(255,190,140,${0.35 + 0.35 * Math.min(1, p.k)})`;
      g.fillText(String(d).padStart(3, '0'), p.x, p.y + 3);
    }
    g.textAlign = 'start';

    // Tarama dalgası
    const scanAge = f.fxAge('scan');
    if (scanAge < 2) {
      const r = scanAge * 1.7;
      g.strokeStyle = `rgba(255,220,180,${0.6 * (1 - scanAge / 2)})`;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * TAU;
        f.project(Math.cos(a) * r, 0.03, Math.sin(a) * r, p);
        if (i) g.lineTo(p.x, p.y);
        else g.moveTo(p.x, p.y);
      }
      g.stroke();
    }

    // Kritik alarmlar: diske iniş çizgisi ve etiket
    const alarms = this.signals
      .filter((s) => s.hot)
      .map((s) => {
        const x = Math.cos(s.phi) * s.r;
        const z = Math.sin(s.phi) * s.r;
        return { s, top: { ...f.project(x, s.y, z, p) }, floor: { ...f.project(x, 0, z, q) } };
      })
      // Kameraya en yakın alarmlar etiket önceliği alır
      .sort((a, b) => a.top.z - b.top.z);

    g.font = '600 9.5px Inter, system-ui, sans-serif';
    const placed: [number, number, number, number][] = [];
    for (const { s, top, floor } of alarms) {
      const a = 0.4 + 0.5 * Math.min(1, top.k);
      g.setLineDash([2, 3]);
      g.strokeStyle = `rgba(255,110,90,${a * 0.6})`;
      g.beginPath();
      g.moveTo(top.x, top.y);
      g.lineTo(floor.x, floor.y);
      g.stroke();
      g.setLineDash([]);

      // Etiketler çakışmaz ve ekrandan taşmaz; sığmayan atlanır
      const w = g.measureText(s.label).width + 6;
      const lx = top.x + 10;
      const ly = top.y - 18;
      const free =
        lx + w < f.width - 12 &&
        !placed.some(([x, y, pw, ph]) => lx < x + pw && lx + w > x && ly < y + ph && ly + 14 > y);
      if (!free) continue;
      placed.push([lx, ly, w, 14]);
      g.fillStyle = `rgba(255,150,130,${a})`;
      g.fillText(s.label, lx, top.y - 8);
    }
  }
}
