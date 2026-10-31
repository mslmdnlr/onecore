import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EventStatus, RadarEvent, SEVERITIES, SEVERITY, STATUS, Severity, ago, duration, stamp } from '../../data/models';
import { RadarStore } from '../../data/radar-store';

type StatusFilter = 'aktif' | EventStatus | 'tumu';
const LIMIT = 150;

const norm = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');

@Component({
  selector: 'oc-radar-events',
  imports: [RouterLink],
  templateUrl: './events.html',
  styleUrl: './events.scss',
  host: { '(document:keydown.escape)': 'selectedId.set(null)' },
})
export class Events {
  protected readonly store = inject(RadarStore);
  protected readonly SEVERITY = SEVERITY;
  protected readonly SEVERITIES = SEVERITIES;
  protected readonly STATUS = STATUS;
  protected readonly ago = ago;
  protected readonly stamp = stamp;
  protected readonly duration = duration;
  protected readonly limit = LIMIT;

  protected readonly query = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('ci') ?? '');
  protected readonly sev = signal<ReadonlySet<Severity>>(new Set());
  protected readonly status = signal<StatusFilter>('aktif');
  protected readonly selectedId = signal<string | null>(null);

  protected readonly statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'aktif', label: 'Aktif' },
    { key: 'acik', label: 'Açık' },
    { key: 'inceleniyor', label: 'İnceleniyor' },
    { key: 'cozuldu', label: 'Çözüldü' },
    { key: 'tumu', label: 'Tümü' },
  ];

  /** Durum + arama süzgeci (önem çipi sayıları bundan hesaplanır) */
  private readonly base = computed(() => {
    const st = this.status();
    const q = norm(this.query().trim());
    return this.store.events().filter((e) => {
      if (st === 'aktif' ? e.status === 'cozuldu' : st !== 'tumu' && e.status !== st) return false;
      return !q || norm(`${e.id} ${e.title} ${e.ci} ${e.source}`).includes(q);
    });
  });

  protected readonly sevCounts = computed(() => {
    const c: Record<Severity, number> = { kritik: 0, yuksek: 0, orta: 0, dusuk: 0 };
    for (const e of this.base()) c[e.severity]++;
    return c;
  });

  protected readonly filtered = computed(() => {
    const s = this.sev();
    return s.size ? this.base().filter((e) => s.has(e.severity)) : this.base();
  });

  protected readonly selected = computed(() => this.store.events().find((e) => e.id === this.selectedId()) ?? null);

  protected readonly change = computed(() => {
    const id = this.selected()?.changeId;
    return id ? this.store.changes().find((c) => c.id === id) : undefined;
  });

  protected toggleSev(s: Severity) {
    this.sev.update((set) => {
      const next = new Set(set);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  protected open(e: RadarEvent) {
    this.selectedId.set(this.selectedId() === e.id ? null : e.id);
  }

  protected openFor(e: RadarEvent) {
    return Math.max(1, ((e.resolvedAt ?? this.store.now()) - e.time) / 60_000);
  }
}
