import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

export interface Bar {
  /** Tooltip başlığı (ör. "14:00–15:00") */
  label: string;
  /** Eksen etiketi; boşsa gösterilmez */
  tick?: string;
  value: number;
  /** Tooltip'te değerin altındaki açıklama */
  detail?: string;
}

const PAD = { top: 10, right: 4, bottom: 24, left: 30 };

/**
 * Tek serili, zaman ekseninde çubuk grafik.
 * İnce çubuklar, üstte 4px yuvarlak uç, silik ızgara, her çubukta tooltip.
 */
@Component({
  selector: 'oc-bar-chart',
  template: `
    <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="summary()">
      @for (g of grid(); track g.value) {
        <line class="grid" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="g.y" [attr.y2]="g.y" />
        <text class="axis" [attr.x]="pad.left - 8" [attr.y]="g.y + 4" text-anchor="end">{{ g.value }}</text>
      }
      @for (b of bars(); track $index) {
        <path class="bar" [class.dim]="active() !== null && active() !== $index" [attr.d]="b.d" />
        @if (b.tick) {
          <text class="axis" [attr.x]="b.cx" [attr.y]="height() - 6" text-anchor="middle">{{ b.tick }}</text>
        }
        <rect
          class="hit"
          [attr.x]="b.x - b.gap / 2"
          [attr.y]="pad.top"
          [attr.width]="b.w + b.gap"
          [attr.height]="plotH()"
          tabindex="0"
          [attr.aria-label]="b.label + ': ' + b.value + (b.detail ? ', ' + b.detail : '')"
          (pointerenter)="active.set($index)"
          (pointerleave)="active.set(null)"
          (focus)="active.set($index)"
          (blur)="active.set(null)"
        />
      }
    </svg>

    @if (tip(); as t) {
      <div class="tip" [style.left.px]="t.x" [style.top.px]="t.y">
        <span class="t-label">{{ t.label }}</span>
        <strong>{{ t.value }} {{ unit() }}</strong>
        @if (t.detail) {
          <span class="t-detail">{{ t.detail }}</span>
        }
      </div>
    }

    <table class="sr-only">
      <caption>{{ summary() }}</caption>
      <tbody>
        @for (b of data(); track $index) {
          <tr><th scope="row">{{ b.label }}</th><td>{{ b.value }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      height: 220px;
    }
    svg {
      display: block;
      overflow: visible;
    }
    .grid {
      stroke: #ffffff10;
      stroke-width: 1;
    }
    .axis {
      fill: #6f8399;
      font: 500 10.5px var(--font);
      font-variant-numeric: tabular-nums;
    }
    .bar {
      fill: var(--c, #9fddff);
      transition: opacity 0.2s;
    }
    .bar.dim {
      opacity: 0.4;
    }
    .hit {
      fill: transparent;
      outline: none;
      cursor: default;
    }
    .hit:focus-visible {
      stroke: var(--c, #9fddff);
      stroke-width: 1;
    }
    .tip {
      position: absolute;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 120px;
      padding: 8px 11px;
      border: 1px solid #ffffff1f;
      border-radius: 10px;
      background: #07121ef2;
      box-shadow: 0 12px 30px -12px #000;
      font-size: 12px;
      pointer-events: none;
      transform: translate(-50%, calc(-100% - 10px));
      white-space: nowrap;
    }
    .t-label,
    .t-detail {
      color: #8fa3b8;
      font-size: 11px;
    }
    strong {
      color: #f3f7ff;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class BarChart {
  readonly data = input.required<Bar[]>();
  readonly unit = input('');
  readonly summary = input('Çubuk grafik');

  protected readonly pad = PAD;
  protected readonly active = signal<number | null>(null);
  protected readonly width = signal(600);
  protected readonly height = signal(220);
  protected readonly plotH = computed(() => this.height() - PAD.top - PAD.bottom);

  /** Okunur bir üst sınır ve 3 ızgara çizgisi */
  private readonly scaleMax = computed(() => {
    const max = Math.max(1, ...this.data().map((d) => d.value));
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => s * 2 >= max) ?? max;
    return Math.max(nice * 2, 2);
  });

  protected readonly grid = computed(() => {
    const max = this.scaleMax();
    return [0, max / 2, max].map((value) => ({ value, y: PAD.top + this.plotH() * (1 - value / max) }));
  });

  protected readonly bars = computed(() => {
    const data = this.data();
    const plotW = this.width() - PAD.left - PAD.right;
    const slot = plotW / Math.max(1, data.length);
    const gap = Math.max(2, Math.min(8, slot * 0.3));
    const w = Math.max(2, slot - gap);
    const max = this.scaleMax();
    const base = PAD.top + this.plotH();
    return data.map((d, i) => {
      const x = PAD.left + i * slot + gap / 2;
      const h = (d.value / max) * this.plotH();
      const r = Math.min(4, w / 2, h);
      const top = base - h;
      // Üst köşeleri yuvarlak, tabana oturan çubuk
      const path = h <= 0 ? '' : `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
      return { ...d, x, w, gap, cx: x + w / 2, top, d: path };
    });
  });

  protected readonly tip = computed(() => {
    const i = this.active();
    if (i === null) return null;
    const b = this.bars()[i];
    return { label: b.label, value: b.value, detail: b.detail, x: b.cx, y: Math.min(b.top, PAD.top + this.plotH() - 4) };
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ro = new ResizeObserver(([entry]) => {
        this.width.set(Math.max(200, Math.floor(entry.contentRect.width)));
        this.height.set(Math.max(120, Math.floor(entry.contentRect.height)));
      });
      ro.observe(host);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }
}
