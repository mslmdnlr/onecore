import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Nav, NavLink } from './core/navigation';
import { SceneState } from './core/scene-state';
import { Scene } from './scene/scene';
import { SceneMode } from './scene/types';
import { MainNav, NAV_ITEMS } from './shared/main-nav/main-nav';
import { Palette } from './shared/palette/palette';

/** Kökten en derin rotaya kadar tüm rota verilerini birleştirir (alt rota üstündekini ezer) */
const mergedData = (r: ActivatedRouteSnapshot | null, acc: Data = {}): Data =>
  r ? mergedData(r.firstChild, { ...acc, ...r.data }) : acc;

@Component({
  imports: [RouterOutlet, Scene, NavLink, MainNav, Palette],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
})
export class App {
  private readonly router = inject(Router);
  private readonly scene = inject(SceneState);
  protected readonly nav = inject(Nav);

  private readonly data = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => mergedData(this.router.routerState.snapshot.root)),
    ),
    { initialValue: {} as Data },
  );
  protected readonly back = computed(() => this.data()['back'] as string | undefined);
  protected readonly workspace = computed(() => !!this.data()['workspace']);

  constructor() {
    effect(() => this.scene.mode.set((this.data()['scene'] as SceneMode) ?? 'datacenter'));
    effect(() => this.scene.dim.set(this.workspace()));
  }

  /** Esc: bir önceki ekran · 1-4: ana gezinmedeki hedefe doğrudan geçiş */
  protected onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (this.nav.paletteOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (el.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'Escape') {
      // Çalışma alanında Esc panelleri kapatır; sayfadan çıkarmaz
      if (this.workspace()) return;
      const back = this.back();
      if (back) this.nav.go(back);
      return;
    }
    const item = NAV_ITEMS[Number(e.key) - 1];
    if (item) this.nav.go(item.url);
  }
}
