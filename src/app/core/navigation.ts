import { Directive, Injectable, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SceneState } from './scene-state';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sayfa geçişleri: içerik önce kaybolur, sahne biçim değiştirirken yeni sayfa gelir.
 * "dive" seçeneği kamerayı merkeze daldırıp bir aşama ilerleme çubuğu gösterir.
 */
@Injectable({ providedIn: 'root' })
export class Nav {
  private readonly router = inject(Router);
  private readonly scene = inject(SceneState);

  readonly leaving = signal(false);
  readonly progress = signal(false);

  async go(url: string, opts: { dive?: boolean } = {}) {
    if (this.leaving() || this.router.url === url) return;
    this.leaving.set(true);
    if (opts.dive) {
      this.progress.set(true);
      this.scene.trigger('dive');
    }
    await wait(opts.dive ? 850 : 240);
    await this.router.navigateByUrl(url);
    this.leaving.set(false);
    this.progress.set(false);
  }
}

/** Animasyonlu geçişle gezinen bağlantı: <a ocNav="/radar"> */
@Directive({
  selector: 'a[ocNav]',
  host: {
    '[attr.href]': 'ocNav()',
    '(click)': 'onClick($event)',
  },
})
export class NavLink {
  readonly ocNav = input.required<string>();
  readonly dive = input(false);
  private readonly nav = inject(Nav);

  protected onClick(e: MouseEvent) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    this.nav.go(this.ocNav(), { dive: this.dive() });
  }
}
