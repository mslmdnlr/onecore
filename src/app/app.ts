import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Nav, NavLink } from './core/navigation';
import { SceneState } from './core/scene-state';
import { Scene } from './scene/scene';
import { SceneMode } from './scene/types';
import { DOCK_ITEMS, Dock } from './shared/dock/dock';

const deepest = (r: ActivatedRouteSnapshot): ActivatedRouteSnapshot => (r.firstChild ? deepest(r.firstChild) : r);

@Component({
  imports: [RouterOutlet, Scene, NavLink, Dock],
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
      map(() => deepest(this.router.routerState.snapshot.root).data),
    ),
    { initialValue: {} as Data },
  );
  protected readonly stage = computed(() => (this.data()['stage'] as string) ?? '');
  protected readonly back = computed(() => this.data()['back'] as string | undefined);

  constructor() {
    effect(() => this.scene.mode.set((this.data()['scene'] as SceneMode) ?? 'datacenter'));
  }

  /** Esc: bir önceki ekran · 1-4: dock'taki hedefe doğrudan geçiş */
  protected onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (e.ctrlKey || e.metaKey || e.altKey || el.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'Escape') {
      const back = this.back();
      if (back) this.nav.go(back);
      return;
    }
    const item = DOCK_ITEMS[Number(e.key) - 1];
    if (item) this.nav.go(item.url);
  }
}
