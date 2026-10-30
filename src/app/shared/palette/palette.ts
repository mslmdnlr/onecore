import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ONECORE_APPS } from '../../core/app-registry';
import { Nav } from '../../core/navigation';
import { SceneState } from '../../core/scene-state';
import { FxKind } from '../../scene/types';
import { AppIcon } from '../app-icon/app-icon';
import { NAV_ITEMS } from '../main-nav/main-nav';

interface Command {
  id: string;
  group: 'Gezinme' | 'Eylemler' | 'Yakında';
  label: string;
  hint: string;
  color: string;
  icon: (typeof ONECORE_APPS)[number]['icon'] | 'home' | 'apps';
  keywords: string;
  disabled?: boolean;
  url?: string;
  fx?: FxKind;
}

const norm = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');

const COMMANDS: Command[] = [
  ...NAV_ITEMS.map(
    (d, i): Command => ({
      id: `go-${d.url}`,
      group: 'Gezinme',
      label: d.label,
      hint: String(i + 1),
      color: d.color,
      icon: d.icon,
      keywords: d.url,
      url: d.url,
    }),
  ),
  { id: 'scan', group: 'Eylemler', label: 'Radar taramasını başlat', hint: 'Radar', color: '#ffb065', icon: 'radar', keywords: 'tara olay alarm sinyal', url: '/radar', fx: 'scan' },
  { id: 'cascade', group: 'Eylemler', label: 'Etki analizini başlat', hint: 'Topoloji', color: '#71deff', icon: 'topology', keywords: 'bagimlilik ci etki', url: '/topoloji', fx: 'cascade' },
  ...ONECORE_APPS.filter((a) => a.status === 'soon').map(
    (a): Command => ({
      id: `soon-${a.id}`,
      group: 'Yakında',
      label: a.name,
      hint: a.tagline,
      color: a.color,
      icon: a.icon,
      keywords: a.description,
      disabled: true,
    }),
  ),
];

/** Ctrl+K: OneCore'un her yerine ve eylemlerine aramayla ulaşma */
@Component({
  selector: 'oc-palette',
  imports: [AppIcon],
  templateUrl: './palette.html',
  styleUrl: './palette.scss',
  host: { '(document:keydown)': 'onGlobalKey($event)' },
})
export class Palette {
  protected readonly nav = inject(Nav);
  private readonly scene = inject(SceneState);
  private readonly router = inject(Router);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly query = signal('');
  protected readonly active = signal(0);

  protected readonly results = computed(() => {
    const q = norm(this.query().trim());
    return q ? COMMANDS.filter((c) => norm(`${c.label} ${c.hint} ${c.keywords}`).includes(q)) : COMMANDS;
  });

  /** Grup başlıklarıyla birlikte görüntülenecek satırlar */
  protected readonly groups = computed(() => {
    const out: { name: string; items: { cmd: Command; index: number }[] }[] = [];
    this.results().forEach((cmd, index) => {
      const last = out[out.length - 1];
      if (last?.name === cmd.group) last.items.push({ cmd, index });
      else out.push({ name: cmd.group, items: [{ cmd, index }] });
    });
    return out;
  });

  constructor() {
    effect(() => {
      if (!this.nav.paletteOpen()) return;
      this.query.set('');
      this.active.set(0);
      queueMicrotask(() => this.input()?.nativeElement.focus());
    });
  }

  protected onGlobalKey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.nav.paletteOpen.update((v) => !v);
    }
  }

  protected onInput(value: string) {
    this.query.set(value);
    this.active.set(this.firstEnabled(0, 1));
  }

  protected onKey(e: KeyboardEvent) {
    const n = this.results().length;
    if (!n && e.key !== 'Escape') return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.move(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this.run(this.results()[this.active()]);
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  protected close() {
    this.nav.paletteOpen.set(false);
  }

  protected async run(cmd: Command | undefined) {
    if (!cmd || cmd.disabled) return;
    this.close();
    if (cmd.url && this.router.url !== cmd.url) await this.nav.go(cmd.url);
    if (cmd.fx) this.scene.trigger(cmd.fx);
  }

  protected hover(index: number) {
    if (!this.results()[index]?.disabled) this.active.set(index);
  }

  private move(step: number) {
    const n = this.results().length;
    this.active.set(this.firstEnabled((this.active() + step + n) % n, step));
    queueMicrotask(() =>
      this.list()?.nativeElement.querySelector('.active')?.scrollIntoView({ block: 'nearest' }),
    );
  }

  /** Devre dışı (yakında) satırları atlayarak ilk seçilebilir satır */
  private firstEnabled(from: number, step: number) {
    const list = this.results();
    for (let k = 0; k < list.length; k++) {
      const i = (from + k * step + list.length * 2) % list.length;
      if (!list[i].disabled) return i;
    }
    return 0;
  }
}
