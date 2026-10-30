import { GalaxyFormation } from './formations/galaxy';
import { DatacenterFormation } from './formations/datacenter';
import { NetworkFormation } from './formations/network';
import { RadarFormation } from './formations/radar';
import { TAU, clamp, rand, randomDir, smoothstep } from './math';
import { PointRenderer, STRIDE } from './renderer';
import { Accent, Formation, FrameInfo, FxKind, HoverInfo, Projected, RadarStats, SceneMode, Targets } from './types';

/** Kamera uzaklığı (perspektif) */
const D = 4.2;
const STARS = 340;
const RATE_LEVELS = 8;
const REPEL_RADIUS = 95;

interface ModeView {
  cx: number;
  cy: number;
  size: number;
  pitch: number;
  spin: number;
  backDim: number;
  aura: string;
}

const viewFor = (mode: SceneMode, w: number, h: number): ModeView => {
  const mobile = w < 850;
  const m = Math.min(w, h);
  switch (mode) {
    case 'datacenter':
      return { cx: mobile ? 0.5 : 0.67, cy: mobile ? 0.74 : 0.56, size: m * (mobile ? 0.15 : 0.2), pitch: -0.42, spin: 0.06, backDim: 0.8, aura: '50,120,220' };
    case 'galaxy':
      return { cx: mobile ? 0.5 : 0.72, cy: mobile ? 0.8 : 0.52, size: m * (mobile ? 0.19 : 0.25), pitch: -0.62, spin: 0.03, backDim: 0.9, aura: '90,90,220' };
    case 'network':
      return { cx: mobile ? 0.5 : 0.68, cy: mobile ? 0.76 : 0.52, size: m * (mobile ? 0.15 : 0.19), pitch: -0.2, spin: 0.08, backDim: 0.55, aura: '40,140,220' };
    case 'radar':
      return { cx: mobile ? 0.5 : 0.68, cy: mobile ? 0.78 : 0.56, size: m * (mobile ? 0.16 : 0.2), pitch: -0.52, spin: 0.05, backDim: 0.7, aura: '210,100,40' };
  }
};

export interface SceneHooks {
  onHover(info: HoverInfo | null, x: number, y: number): void;
  onRadarStats(stats: RadarStats): void;
}

/**
 * Tüm sayfaların arkasında yaşayan tek parçacık sahnesi.
 * Aynı parçacıklar sayfa değiştikçe dünya → galaksi → ağ → radar biçimine akar.
 */
export class SceneEngine {
  private readonly n: number;
  private readonly renderer: PointRenderer | null;
  private readonly g: CanvasRenderingContext2D;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly off: Float32Array;
  private readonly rateLvl: Uint8Array;
  private readonly targets: Targets;
  private readonly formations: Record<SceneMode, Formation>;
  private readonly stars: Float32Array;
  private readonly lerp = new Float32Array(RATE_LEVELS);

  private mode: SceneMode;
  private modeSince: number;
  private accent: Accent = null;
  private fxAt: Record<FxKind, number> = { dive: -1e4, scan: -1e4, cascade: -1e4 };

  private yaw = 0.3;
  private pitch = -0.38;
  private vYaw = 0;
  private vPitch = 0;
  private zoom = 1;
  private cx = 0;
  private cy = 0;
  private scale = 0;
  private eff = 1;
  private backDim = 0.2;
  private lastDrag = -10;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastMoveT = 0;
  private pointer: { x: number; y: number } | null = null;

  private width = 1;
  private height = 1;
  private dpr = 1;
  private last = 0;
  private raf = 0;
  private readonly unbind: () => void;

  constructor(
    private readonly host: HTMLElement,
    glCanvas: HTMLCanvasElement,
    private readonly overlay: HTMLCanvasElement,
    hooks: SceneHooks,
    mode: SceneMode,
    private readonly reducedMotion: boolean,
  ) {
    this.n = window.innerWidth < 850 ? 12000 : 22000;
    this.renderer = PointRenderer.create(glCanvas, this.n + STARS);
    this.g = overlay.getContext('2d')!;

    const n = this.n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4);
    this.size = new Float32Array(n);
    this.off = new Float32Array(n * 2);
    this.rateLvl = new Uint8Array(n);
    this.targets = { pos: new Float32Array(n * 3), col: new Float32Array(n * 4), size: new Float32Array(n) };

    // Açılışta parçacıklar uzaydan toplanır
    for (let i = 0; i < n; i++) {
      const d = randomDir();
      const r = rand(2.5, 6);
      this.pos.set([d[0] * r, d[1] * r, d[2] * r], i * 3);
      this.col.set([0.5, 0.7, 1, 0], i * 4);
      this.size[i] = 1;
      this.rateLvl[i] = Math.floor(Math.random() * RATE_LEVELS);
    }

    this.stars = new Float32Array(STARS * 4);
    for (let i = 0; i < STARS; i++) this.stars.set([Math.random(), Math.random(), rand(0.6, 1.9), rand(0, TAU)], i * 4);

    this.formations = {
      datacenter: new DatacenterFormation(n),
      galaxy: new GalaxyFormation(n),
      network: new NetworkFormation(n, (info, x, y) => hooks.onHover(info, x, y)),
      radar: new RadarFormation(n, (s) => hooks.onRadarStats(s)),
    };

    this.mode = mode;
    this.modeSince = performance.now() / 1000;
    this.unbind = this.bindInput();
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  setMode(mode: SceneMode) {
    if (mode === this.mode) return;
    this.formations[this.mode].reset?.();
    this.mode = mode;
    this.modeSince = performance.now() / 1000;
  }

  setAccent(accent: Accent) {
    this.accent = accent;
  }

  trigger(kind: FxKind) {
    this.fxAt[kind] = performance.now() / 1000;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.unbind();
  }

  private resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer?.resize(this.width, this.height, this.dpr);
    this.overlay.width = Math.round(this.width * this.dpr);
    this.overlay.height = Math.round(this.height * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  private bindInput() {
    const c = this.overlay;
    const down = (e: PointerEvent) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.lastMoveT = performance.now();
      this.vYaw = 0;
      this.vPitch = 0;
      c.setPointerCapture(e.pointerId);
      c.classList.add('dragging');
    };
    const move = (e: PointerEvent) => {
      this.pointer = { x: e.clientX, y: e.clientY };
      if (!this.dragging) return;
      const now = performance.now();
      const dt = Math.max((now - this.lastMoveT) / 1000, 0.008);
      const k = clamp(1 / this.eff, 0.0015, 0.012);
      const dYaw = -(e.clientX - this.lastX) * k;
      const dPitch = -(e.clientY - this.lastY) * k;
      this.yaw += dYaw;
      this.pitch = clamp(this.pitch + dPitch, -1.35, 1);
      this.vYaw = this.vYaw * 0.4 + (dYaw / dt) * 0.6;
      this.vPitch = this.vPitch * 0.4 + (dPitch / dt) * 0.6;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.lastMoveT = now;
      this.lastDrag = now / 1000;
    };
    const up = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      c.classList.remove('dragging');
      if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
      if (performance.now() - this.lastMoveT > 90) {
        this.vYaw = 0;
        this.vPitch = 0;
      }
    };
    const leave = () => (this.pointer = null);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom = clamp(this.zoom * Math.exp(-e.deltaY * 0.0011), 0.6, 1.9);
    };

    c.addEventListener('pointerdown', down);
    c.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.addEventListener('pointerleave', leave);
    window.addEventListener('resize', this.resize);
    return () => {
      c.removeEventListener('pointerdown', down);
      c.removeEventListener('wheel', wheel);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('resize', this.resize);
    };
  }

  private updateCamera(t: number, dt: number) {
    const v = viewFor(this.mode, this.width, this.height);
    const a = 1 - Math.exp(-dt * 2.2);
    if (!this.scale) {
      this.cx = v.cx * this.width;
      this.cy = v.cy * this.height;
      this.scale = v.size;
    }
    this.cx += (v.cx * this.width - this.cx) * a;
    this.cy += (v.cy * this.height - this.cy) * a;
    this.scale += (v.size - this.scale) * a;
    this.backDim += (v.backDim - this.backDim) * a;

    if (!this.dragging) {
      const spin = this.reducedMotion ? 0 : v.spin;
      this.yaw += this.vYaw * dt;
      this.pitch = clamp(this.pitch + this.vPitch * dt, -1.35, 1);
      this.vYaw += (-spin - this.vYaw) * Math.min(1, dt * 1.2);
      this.vPitch *= Math.exp(-dt * 3);
      if (t - this.lastDrag > 2.5) this.pitch += (v.pitch - this.pitch) * Math.min(1, dt * 1.1);
    }

    // Dalış: merkeze yaklaşıp geri çekilen kamera
    const dive = t - this.fxAt.dive;
    let diveZoom = 1;
    if (dive < 1.8) {
      const p = dive / 1.8;
      const s = Math.sin(Math.PI * p);
      diveZoom = 1 + s * s * 1.15;
      this.yaw += dt * 1.6 * s;
    }
    this.eff = this.scale * this.zoom * diveZoom;

    this.host.style.setProperty('--cx', `${this.cx}px`);
    this.host.style.setProperty('--cy', `${this.cy}px`);
    this.host.style.setProperty('--r', `${this.eff * 2.6}px`);
    this.host.style.setProperty('--aura', v.aura);
  }

  private frame = (ms: number) => {
    const t = ms / 1000;
    const dt = this.last ? Math.min(0.05, t - this.last) : 0.016;
    this.last = t;

    this.updateCamera(t, dt);

    const cyw = Math.cos(this.yaw);
    const syw = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const { cx, cy, eff } = this;
    const project = (x: number, y: number, z: number, out: Projected = { x: 0, y: 0, k: 1, z: 0 }) => {
      const X = x * cyw + z * syw;
      const Z1 = -x * syw + z * cyw;
      const Y = y * cp - Z1 * sp;
      const Z = y * sp + Z1 * cp;
      const k = D / Math.max(0.2, D + Z);
      out.x = cx + X * eff * k;
      out.y = cy - Y * eff * k;
      out.k = k;
      out.z = Z;
      return out;
    };
    const f: FrameInfo = {
      t,
      dt,
      width: this.width,
      height: this.height,
      cx,
      cy,
      scale: eff,
      pointer: this.dragging ? null : this.pointer,
      accent: this.accent,
      project,
      fxAge: (kind) => t - this.fxAt[kind],
    };

    const formation = this.formations[this.mode];
    formation.write(this.targets, f);
    this.drawParticles(t, dt, cyw, syw, cp, sp);

    const g = this.g;
    g.clearRect(0, 0, this.width, this.height);
    g.globalAlpha = smoothstep(0.4, 1.6, t - this.modeSince);
    formation.overlay?.(g, f);
    g.globalAlpha = 1;

    this.raf = requestAnimationFrame(this.frame);
  };

  private drawParticles(t: number, dt: number, cyw: number, syw: number, cp: number, sp: number) {
    const r = this.renderer;
    if (!r) return;
    const out = r.data;
    const { pos, col, size, off, rateLvl, n } = this;
    const T = this.targets;
    const { cx, cy, eff, backDim } = this;

    // Biçim değişince önce yavaş ve dağınık, sonra sıkı takip
    const m = t - this.modeSince;
    const base = Math.min(40, 1.3 + m * m * 5);
    for (let l = 0; l < RATE_LEVELS; l++) this.lerp[l] = 1 - Math.exp(-dt * base * (0.55 + (l / (RATE_LEVELS - 1)) * 0.9));
    const offK = 1 - Math.exp(-dt * 9);

    const px = this.pointer && !this.dragging ? this.pointer.x : -1e5;
    const py = this.pointer && !this.dragging ? this.pointer.y : -1e5;
    const rr2 = REPEL_RADIUS * REPEL_RADIUS;
    const sizeScale = clamp(eff / 290, 0.75, 1.5);

    let o = 0;
    for (let i = 0; i < n; i++) {
      const la = this.lerp[rateLvl[i]];
      const p = i * 3;
      const q = i * 4;
      pos[p] += (T.pos[p] - pos[p]) * la;
      pos[p + 1] += (T.pos[p + 1] - pos[p + 1]) * la;
      pos[p + 2] += (T.pos[p + 2] - pos[p + 2]) * la;
      col[q] += (T.col[q] - col[q]) * la;
      col[q + 1] += (T.col[q + 1] - col[q + 1]) * la;
      col[q + 2] += (T.col[q + 2] - col[q + 2]) * la;
      col[q + 3] += (T.col[q + 3] - col[q + 3]) * la;
      size[i] += (T.size[i] - size[i]) * la;

      const x = pos[p];
      const y = pos[p + 1];
      const z = pos[p + 2];
      const X = x * cyw + z * syw;
      const Z1 = -x * syw + z * cyw;
      const Y = y * cp - Z1 * sp;
      const Z = y * sp + Z1 * cp;
      const k = D / Math.max(0.2, D + Z);
      let sx = cx + X * eff * k;
      let sy = cy - Y * eff * k;

      // İmlecin etrafındaki parçacıklar yumuşakça kenara çekilir
      const dx = sx - px;
      const dy = sy - py;
      const d2 = dx * dx + dy * dy;
      let tx = 0;
      let ty = 0;
      let hot = 0;
      if (d2 < rr2) {
        const d = Math.sqrt(d2) || 1;
        hot = 1 - d / REPEL_RADIUS;
        const push = hot * hot * 26;
        tx = (dx / d) * push;
        ty = (dy / d) * push;
      }
      off[i * 2] += (tx - off[i * 2]) * offK;
      off[i * 2 + 1] += (ty - off[i * 2 + 1]) * offK;
      sx += off[i * 2];
      sy += off[i * 2 + 1];

      const depth = Z < -0.08 ? 1 : Z > 0.14 ? backDim : 1 + (backDim - 1) * ((Z + 0.08) / 0.22);
      out[o++] = sx;
      out[o++] = sy;
      out[o++] = size[i] * k * sizeScale * (1 + hot * 0.7);
      out[o++] = col[q];
      out[o++] = col[q + 1];
      out[o++] = col[q + 2];
      out[o++] = Math.min(1, col[q + 3] * depth * (1 + hot * 0.8));
    }

    // Arka plan yıldızları
    const s = this.stars;
    const drift = this.yaw * 12;
    for (let i = 0; i < STARS; i++) {
      const j = i * 4;
      out[o++] = ((((s[j] * this.width + drift) % this.width) + this.width) % this.width);
      out[o++] = s[j + 1] * this.height;
      out[o++] = s[j + 2];
      out[o++] = 0.72;
      out[o++] = 0.8;
      out[o++] = 1;
      out[o++] = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.1 + s[j + 3]));
    }

    r.draw(o / STRIDE);
  }
}
