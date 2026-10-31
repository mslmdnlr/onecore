import { Component, computed, input } from '@angular/core';

/** Stat kutuları için küçük eğilim çizgisi (tek seri, dekoratif; değer kutuda yazılı) */
@Component({
  selector: 'oc-sparkline',
  template: `
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <path class="area" [attr.d]="area()" />
      <path class="line" [attr.d]="line()" vector-effect="non-scaling-stroke" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      height: 32px;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: var(--c, #9fddff);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .area {
      fill: color-mix(in srgb, var(--c, #9fddff) 12%, transparent);
    }
  `,
})
export class Sparkline {
  readonly values = input.required<number[]>();

  private readonly points = computed(() => {
    const v = this.values();
    const max = Math.max(1, ...v);
    const step = 100 / Math.max(1, v.length - 1);
    return v.map((y, i) => [i * step, 30 - (y / max) * 26] as const);
  });

  protected readonly line = computed(() => this.points().map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(''));
  protected readonly area = computed(() => {
    const p = this.points();
    return p.length ? `${this.line()}L100,32L0,32Z` : '';
  });
}
