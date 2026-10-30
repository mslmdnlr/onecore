import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ONECORE_APPS } from '../../core/app-registry';
import { NavLink } from '../../core/navigation';
import { AppIcon } from '../app-icon/app-icon';

export interface NavItem {
  url: string;
  label: string;
  color: string;
  icon: 'home' | 'apps' | (typeof ONECORE_APPS)[number]['icon'];
}

/** Ana gezinme hedefleri; sıra 1-4 klavye kısayollarıyla da kullanılır */
export const NAV_ITEMS: NavItem[] = [
  { url: '/', label: 'OneCore', color: '#a5e4ff', icon: 'home' },
  { url: '/uygulamalar', label: 'Uygulamalar', color: '#9ddcff', icon: 'apps' },
  ...ONECORE_APPS.filter((a) => a.status === 'active').map((a) => ({
    url: a.route,
    label: a.name,
    color: a.color,
    icon: a.icon,
  })),
];

/**
 * Ana gezinme. Masaüstünde üst barın ortasında sekme grubu,
 * tablette yalnızca simgeler, telefonda başparmak bölgesinde alt çubuk.
 * Aktif sekmenin vurgusu sekmeler arasında kayarak yer değiştirir.
 */
@Component({
  selector: 'oc-main-nav',
  imports: [NavLink, AppIcon],
  template: `
    <nav class="nav" #nav aria-label="Ana gezinme">
      <span class="indicator" #indicator aria-hidden="true" [style.--c]="activeColor()"></span>
      @for (item of items; track item.url; let i = $index) {
        @if (i === 2) {
          <span class="sep" aria-hidden="true"></span>
        }
        <a
          class="item"
          [ocNav]="item.url"
          [class.active]="active() === item.url"
          [attr.aria-current]="active() === item.url ? 'page' : null"
          [style.--c]="item.color"
        >
          <span class="ico">
            @switch (item.icon) {
              @case ('home') {
                <svg viewBox="0 0 40 40" aria-hidden="true">
                  <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5" />
                  <ellipse cx="20" cy="20" rx="14" ry="5" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-25 20 20)" />
                  <circle cx="20" cy="20" r="4.5" fill="currentColor" />
                </svg>
              }
              @case ('apps') {
                <svg viewBox="0 0 40 40" aria-hidden="true">
                  @for (p of grid; track $index) {
                    <rect [attr.x]="p[0]" [attr.y]="p[1]" width="9" height="9" rx="2.5" fill="none" stroke="currentColor" stroke-width="2" />
                  }
                </svg>
              }
              @default {
                <oc-app-icon [icon]="$any(item.icon)" [color]="item.color" />
              }
            }
          </span>
          <span class="label">{{ item.label }}</span>
          <span class="tip" aria-hidden="true">{{ item.label }} <kbd>{{ i + 1 }}</kbd></span>
        </a>
      }
    </nav>
  `,
  styleUrl: './main-nav.scss',
})
export class MainNav {
  private readonly router = inject(Router);
  private readonly navRef = viewChild.required<ElementRef<HTMLElement>>('nav');
  private readonly indicatorRef = viewChild.required<ElementRef<HTMLElement>>('indicator');

  protected readonly items = NAV_ITEMS;
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
  protected readonly activeColor = computed(() => NAV_ITEMS.find((i) => i.url === this.active())?.color ?? '#9ddcff');

  /** Yeniden boyutlanma ve font yüklenmesinde vurguyu yeniden ölçmek için */
  private readonly layoutTick = signal(0);

  constructor() {
    const bump = () => this.layoutTick.update((v) => v + 1);
    window.addEventListener('resize', bump);
    document.fonts?.ready.then(bump);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', bump));

    afterRenderEffect(() => {
      this.active();
      this.layoutTick();
      this.placeIndicator();
    });
  }

  private placeIndicator() {
    const nav = this.navRef().nativeElement;
    const ind = this.indicatorRef().nativeElement;
    const el = nav.querySelector<HTMLElement>('.item.active');
    if (!el) {
      ind.style.opacity = '0';
      return;
    }
    ind.style.opacity = '1';
    ind.style.transform = `translateX(${el.offsetLeft}px)`;
    ind.style.width = `${el.offsetWidth}px`;
    // İlk yerleşim animasyonsuz; sonrakiler kayarak
    if (!ind.classList.contains('ready')) requestAnimationFrame(() => ind.classList.add('ready'));
  }
}
