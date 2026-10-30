import { Component, input } from '@angular/core';
import { OneCoreApp } from '../../core/app-registry';

/** Uygulama kartlarında kullanılan hareketli simgeler */
@Component({
  selector: 'oc-app-icon',
  template: `
    <svg viewBox="0 0 48 48" aria-hidden="true" [style.color]="color()">
      @switch (icon()) {
        @case ('radar') {
          <circle cx="24" cy="24" r="20" class="line" />
          <circle cx="24" cy="24" r="13" class="line faint" />
          <circle cx="24" cy="24" r="6" class="line faint" />
          <g class="sweep">
            <path d="M24 24 L24 4 A20 20 0 0 1 41.3 14 Z" fill="currentColor" opacity="0.28" />
            <line x1="24" y1="24" x2="24" y2="4" stroke="currentColor" stroke-width="1.5" />
          </g>
          <circle cx="32" cy="15" r="2" fill="currentColor" class="blip" />
          <circle cx="15" cy="30" r="1.6" fill="currentColor" class="blip b2" />
        }
        @case ('topology') {
          <g class="edges">
            <line x1="24" y1="24" x2="10" y2="12" />
            <line x1="24" y1="24" x2="38" y2="10" />
            <line x1="24" y1="24" x2="40" y2="32" />
            <line x1="24" y1="24" x2="12" y2="38" />
            <line x1="10" y1="12" x2="12" y2="38" />
            <line x1="38" y1="10" x2="40" y2="32" />
          </g>
          <circle cx="24" cy="24" r="5" fill="currentColor" class="core" />
          <circle cx="10" cy="12" r="3" fill="currentColor" class="node" />
          <circle cx="38" cy="10" r="3" fill="currentColor" class="node n2" />
          <circle cx="40" cy="32" r="3" fill="currentColor" class="node n3" />
          <circle cx="12" cy="38" r="3" fill="currentColor" class="node n4" />
        }
        @case ('config') {
          <rect x="8" y="10" width="32" height="8" rx="2" class="line" />
          <rect x="8" y="22" width="32" height="8" rx="2" class="line" />
          <rect x="8" y="34" width="32" height="6" rx="2" class="line faint" />
          <circle cx="13" cy="14" r="1.6" fill="currentColor" />
          <circle cx="13" cy="26" r="1.6" fill="currentColor" />
        }
        @case ('asset') {
          <path d="M24 6 L40 15 L40 33 L24 42 L8 33 L8 15 Z" class="line" />
          <path d="M8 15 L24 24 L40 15 M24 24 L24 42" class="line faint" />
        }
        @case ('change') {
          <path d="M12 18 A13 13 0 0 1 36 16" class="line" />
          <path d="M36 30 A13 13 0 0 1 12 32" class="line" />
          <path d="M36 9 L36 16 L29 16" class="line" />
          <path d="M12 39 L12 32 L19 32" class="line" />
        }
        @case ('itsm') {
          <path d="M10 12 H38 V32 H22 L14 39 V32 H10 Z" class="line" />
          <line x1="16" y1="20" x2="32" y2="20" class="line faint" />
          <line x1="16" y1="25" x2="27" y2="25" class="line faint" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      width: 48px;
      height: 48px;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .faint {
      opacity: 0.45;
    }
    .edges line {
      stroke: currentColor;
      stroke-width: 1.2;
      opacity: 0.45;
      stroke-dasharray: 3 3;
      animation: flow 1.6s linear infinite;
    }
    .sweep {
      transform-origin: 24px 24px;
      animation: spin 3s linear infinite;
    }
    .blip {
      animation: blink 3s ease-in-out infinite;
    }
    .b2 {
      animation-delay: 1.4s;
    }
    .core {
      transform-origin: 24px 24px;
      animation: pulse 2.4s ease-in-out infinite;
    }
    .node {
      animation: blink 2.4s ease-in-out infinite;
    }
    .n2 {
      animation-delay: 0.6s;
    }
    .n3 {
      animation-delay: 1.2s;
    }
    .n4 {
      animation-delay: 1.8s;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes blink {
      0%,
      100% {
        opacity: 0.25;
      }
      15% {
        opacity: 1;
      }
    }
    @keyframes pulse {
      50% {
        transform: scale(1.25);
      }
    }
    @keyframes flow {
      to {
        stroke-dashoffset: -12;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
      }
    }
  `,
})
export class AppIcon {
  readonly icon = input.required<OneCoreApp['icon']>();
  readonly color = input('currentColor');
}
