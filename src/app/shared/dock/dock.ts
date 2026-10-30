import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ONECORE_APPS } from '../../core/app-registry';
import { NavLink } from '../../core/navigation';
import { AppIcon } from '../app-icon/app-icon';

export interface DockItem {
  url: string;
  label: string;
  color: string;
  icon: 'home' | 'apps' | (typeof ONECORE_APPS)[number]['icon'];
}

/** Dock'taki hedefler; sıra 1-4 klavye kısayollarıyla da kullanılır */
export const DOCK_ITEMS: DockItem[] = [
  { url: '/', label: 'OneCore', color: '#a5e4ff', icon: 'home' },
  { url: '/uygulamalar', label: 'Uygulamalar', color: '#9ddcff', icon: 'apps' },
  ...ONECORE_APPS.filter((a) => a.status === 'active').map((a) => ({
    url: a.route,
    label: a.name,
    color: a.color,
    icon: a.icon,
  })),
];

/** Her sayfada duran, OneCore ile uygulamalar arasında tek tıkla geçiş çubuğu */
@Component({
  selector: 'oc-dock',
  imports: [NavLink, AppIcon],
  template: `
    <nav class="dock" aria-label="Hızlı geçiş">
      @for (item of items; track item.url; let i = $index) {
        @if (i === 2) {
          <span class="sep" aria-hidden="true"></span>
        }
        <a
          class="item"
          [ocNav]="item.url"
          [class.active]="active() === item.url"
          [attr.aria-current]="active() === item.url ? 'page' : null"
          [attr.aria-label]="item.label"
          [style.--c]="item.color"
        >
          @switch (item.icon) {
            @case ('home') {
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.5" />
                <ellipse cx="20" cy="20" rx="14" ry="5" fill="none" stroke="currentColor" stroke-width="1.6" transform="rotate(-25 20 20)" />
                <circle cx="20" cy="20" r="4.5" fill="currentColor" />
              </svg>
            }
            @case ('apps') {
              <svg viewBox="0 0 40 40" aria-hidden="true">
                @for (p of grid; track $index) {
                  <rect [attr.x]="p[0]" [attr.y]="p[1]" width="9" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                }
              </svg>
            }
            @default {
              <oc-app-icon [icon]="$any(item.icon)" [color]="item.color" />
            }
          }
          <span class="tip">{{ item.label }} <kbd>{{ i + 1 }}</kbd></span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: 16px;
      z-index: 12;
      transform: translateX(-50%);
      animation: dock-in 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s both;
    }
    .dock {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px;
      border: 1px solid #ffffff1f;
      border-radius: 18px;
      background: #0a1424c7;
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 50px -20px #000c;
    }
    .sep {
      width: 1px;
      height: 26px;
      margin: 0 4px;
      background: #ffffff1f;
    }
    .item {
      position: relative;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      color: #8fa3b8;
      transition:
        background 0.25s,
        color 0.25s,
        transform 0.25s;
      svg,
      oc-app-icon {
        width: 24px;
        height: 24px;
      }
      &::after {
        content: '';
        position: absolute;
        bottom: 3px;
        left: 50%;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--c);
        box-shadow: 0 0 8px var(--c);
        transform: translateX(-50%) scale(0);
        transition: transform 0.3s;
      }
      &:hover {
        background: #ffffff10;
        color: #e4eef8;
        transform: translateY(-3px);
        .tip {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      &:focus-visible {
        outline: 2px solid var(--c);
        outline-offset: 2px;
      }
      &.active {
        background: color-mix(in srgb, var(--c) 16%, transparent);
        color: var(--c);
        &::after {
          transform: translateX(-50%) scale(1);
        }
      }
    }
    .tip {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      padding: 6px 9px;
      border: 1px solid #ffffff1f;
      border-radius: 8px;
      background: #07121ef0;
      color: #dce9f6;
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, 4px);
      transition:
        opacity 0.2s,
        transform 0.2s;
      kbd {
        margin-left: 6px;
        padding: 1px 5px;
        border: 1px solid #ffffff2a;
        border-radius: 4px;
        font: 600 9px var(--font);
        color: #8fa3b8;
      }
    }
    @keyframes dock-in {
      from {
        opacity: 0;
        transform: translate(-50%, 30px);
      }
    }
    @media (hover: none) {
      .tip {
        display: none;
      }
    }
  `,
})
export class Dock {
  private readonly router = inject(Router);
  protected readonly items = DOCK_ITEMS;
  protected readonly grid = [
    [9, 9],
    [22, 9],
    [9, 22],
    [22, 22],
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly active = computed(() => this.url().split(/[?#]/)[0] || '/');
}
