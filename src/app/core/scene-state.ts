import { Injectable, signal } from '@angular/core';
import { Accent, FxKind, RadarStats, SceneMode } from '../scene/types';

/** Sayfalar ile kalıcı 3B sahne arasındaki ortak durum */
@Injectable({ providedIn: 'root' })
export class SceneState {
  readonly mode = signal<SceneMode>('datacenter');
  readonly accent = signal<Accent>(null);
  /** Uygulama çalışma alanlarında sahne geri plana çekilir */
  readonly dim = signal(false);
  readonly radarStats = signal<RadarStats>({ events: 0, alarms: 0, correlations: 0 });
  /** Tek seferlik sahne efektleri (dalış, tarama, etki analizi) */
  readonly fx = signal<{ kind: FxKind; at: number } | null>(null);

  trigger(kind: FxKind) {
    this.fx.set({ kind, at: performance.now() });
  }
}
