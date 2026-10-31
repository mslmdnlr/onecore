import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppIcon } from '../../../shared/app-icon/app-icon';
import { RadarStore } from '../data/radar-store';

type MenuIcon = 'overview' | 'events' | 'alarms' | 'changes' | 'correlation' | 'reports' | 'rules' | 'settings';
type BadgeKey = 'open' | 'alarms' | 'changes' | 'corr';

interface MenuItem {
  label: string;
  icon: MenuIcon;
  path?: string;
  badge?: BadgeKey;
  soon?: boolean;
}

const MENU: { label: string; items: MenuItem[] }[] = [
  {
    label: 'İzleme',
    items: [
      { path: 'genel-bakis', label: 'Genel Bakış', icon: 'overview' },
      { path: 'olaylar', label: 'Olaylar', icon: 'events', badge: 'open' },
      { path: 'alarmlar', label: 'Alarmlar', icon: 'alarms', badge: 'alarms' },
    ],
  },
  {
    label: 'Analiz',
    items: [
      { path: 'degisiklikler', label: 'Değişiklikler', icon: 'changes', badge: 'changes' },
      { path: 'korelasyon', label: 'Korelasyon', icon: 'correlation', badge: 'corr' },
      { label: 'Raporlar', icon: 'reports', soon: true },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { label: 'Kurallar', icon: 'rules', soon: true },
      { label: 'Ayarlar', icon: 'settings', soon: true },
    ],
  },
];

/** Radar çalışma alanı: uygulamaya özel sol menü + içerik alanı */
@Component({
  selector: 'oc-radar-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, AppIcon],
  templateUrl: './radar-shell.html',
  styleUrl: './radar-shell.scss',
})
export class RadarShell {
  protected readonly store = inject(RadarStore);
  protected readonly menu = MENU;
  protected readonly collapsed = signal(false);

  private readonly badges = computed<Record<BadgeKey, number>>(() => ({
    open: this.store.openEvents().length,
    alarms: this.store.alarms().filter((a) => !a.ack).length,
    changes: this.store.changes().filter((c) => c.status === 'uygulaniyor').length,
    corr: this.store.correlations().length,
  }));

  constructor() {
    this.store.start();
    inject(DestroyRef).onDestroy(() => this.store.stop());
  }

  protected badge(key: BadgeKey | undefined) {
    return key ? this.badges()[key] : 0;
  }
}
