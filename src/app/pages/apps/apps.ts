import { Component, DestroyRef, inject } from '@angular/core';
import { ONECORE_APPS, OneCoreApp } from '../../core/app-registry';
import { NavLink } from '../../core/navigation';
import { SceneState } from '../../core/scene-state';
import { AppIcon } from '../../shared/app-icon/app-icon';

@Component({
  selector: 'oc-apps',
  imports: [NavLink, AppIcon],
  templateUrl: './apps.html',
  styleUrl: './apps.scss',
})
export class Apps {
  private readonly scene = inject(SceneState);
  protected readonly active = ONECORE_APPS.filter((a) => a.status === 'active');
  protected readonly upcoming = ONECORE_APPS.filter((a) => a.status === 'soon');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.scene.accent.set(null));
  }

  /** Kartın üzerine gelinince galaksi uygulamanın rengine bürünür */
  protected hover(app: OneCoreApp | null) {
    this.scene.accent.set(app ? (app.id === 'radar' ? 'radar' : 'topology') : null);
  }

  /** İmleci takip eden ışık */
  protected track(event: PointerEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }
}
