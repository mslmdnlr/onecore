import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, viewChild } from '@angular/core';
import { SceneState } from '../core/scene-state';
import { SceneEngine } from './engine';
import { HoverInfo } from './types';

@Component({
  selector: 'oc-scene',
  host: { '[class.dim]': 'dim()' },
  template: `
    <div class="aura"></div>
    <canvas #gl></canvas>
    <canvas #overlay class="overlay" aria-label="Sürükleyerek döndürülebilen, OneCore 3B parçacık sahnesi"></canvas>
    <div #tip class="tip" hidden>
      <i></i>
      <div>
        <strong></strong>
        <small></small>
      </div>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      display: block;
      transition:
        opacity 0.8s ease,
        filter 0.8s ease;
    }
    /* Çalışma alanında veri ekranları okunsun diye sahne geri planda kalır */
    :host(.dim) {
      opacity: 0.28;
      filter: saturate(0.7);
      pointer-events: none;
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    .overlay {
      cursor: grab;
      touch-action: none;
    }
    .overlay.dragging {
      cursor: grabbing;
    }
    .aura {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle var(--r, 600px) at var(--cx, 70%) var(--cy, 50%), rgba(var(--aura, 50, 110, 220), 0.16), transparent 70%);
      transition: background 1.2s ease;
    }
    .tip {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 20;
      display: flex;
      gap: 0.7rem;
      align-items: flex-start;
      min-width: 180px;
      padding: 0.85rem 1rem;
      border: 1px solid #ffffff23;
      border-radius: 14px;
      background: #07121edb;
      backdrop-filter: blur(14px);
      pointer-events: none;
      &[hidden] {
        display: none;
      }
      i {
        width: 8px;
        height: 8px;
        margin-top: 5px;
        border-radius: 50%;
        background: var(--c);
        box-shadow: 0 0 12px var(--c);
      }
      strong {
        display: block;
        font-size: 13px;
      }
      small {
        color: #88a4bd;
        font-size: 11px;
      }
    }
  `,
})
export class Scene {
  private readonly state = inject(SceneState);
  protected readonly dim = this.state.dim;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly glRef = viewChild.required<ElementRef<HTMLCanvasElement>>('gl');
  private readonly overlayRef = viewChild.required<ElementRef<HTMLCanvasElement>>('overlay');
  private readonly tipRef = viewChild.required<ElementRef<HTMLElement>>('tip');
  private engine?: SceneEngine;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.engine = new SceneEngine(
        this.host,
        this.glRef().nativeElement,
        this.overlayRef().nativeElement,
        {
          onHover: (info, x, y) => this.showTip(info, x, y),
          onRadarStats: (s) => {
            const cur = this.state.radarStats();
            if (cur.events !== s.events || cur.alarms !== s.alarms || cur.correlations !== s.correlations) {
              this.state.radarStats.set(s);
            }
          },
        },
        this.state.mode(),
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
      destroyRef.onDestroy(() => this.engine?.destroy());
    });

    // Sinyaller önce okunur; motor henüz yokken de effect bağımlılığını kaydetsin
    effect(() => {
      const mode = this.state.mode();
      this.engine?.setMode(mode);
    });
    effect(() => {
      const accent = this.state.accent();
      this.engine?.setAccent(accent);
    });
    effect(() => {
      const fx = this.state.fx();
      if (fx) this.engine?.trigger(fx.kind);
    });
  }

  private lastTitle = '';

  private showTip(info: HoverInfo | null, x: number, y: number) {
    const tip = this.tipRef().nativeElement;
    if (!info) {
      tip.hidden = true;
      this.lastTitle = '';
      return;
    }
    if (info.title !== this.lastTitle) {
      this.lastTitle = info.title;
      tip.querySelector('strong')!.textContent = info.title;
      tip.querySelector('small')!.textContent = info.subtitle;
      tip.style.setProperty('--c', info.color);
    }
    tip.hidden = false;
    const left = Math.min(window.innerWidth - 240, x + 22);
    tip.style.transform = `translate(${left}px, ${Math.max(70, y - 70)}px)`;
  }
}
