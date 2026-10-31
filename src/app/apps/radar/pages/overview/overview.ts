import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bar, BarChart } from '../../../../shared/charts/bar-chart';
import { Sparkline } from '../../../../shared/charts/sparkline';
import { CHANGE_STATUS, RISK, SEVERITY, ago, clock, duration } from '../../data/models';
import { RadarStore } from '../../data/radar-store';

const HOUR = 3_600_000;
const MTTR_TARGET = 60;

@Component({
  selector: 'oc-radar-overview',
  imports: [RouterLink, BarChart, Sparkline],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  protected readonly store = inject(RadarStore);
  protected readonly SEVERITY = SEVERITY;
  protected readonly CHANGE_STATUS = CHANGE_STATUS;
  protected readonly RISK = RISK;
  protected readonly ago = ago;
  protected readonly clock = clock;
  protected readonly target = MTTR_TARGET;

  protected readonly bars = computed<Bar[]>(() =>
    this.store.hourly().map((b, i) => ({
      label: `${clock(b.start)} – ${clock(b.start + HOUR)}`,
      tick: i % 4 === 0 ? clock(b.start) : undefined,
      value: b.total,
      detail: `${b.critical} kritik`,
    })),
  );

  protected readonly kpi = computed(() => {
    const s = this.store;
    const now = s.now();
    const alarms = s.alarms().filter((a) => !a.ack);
    const changes = s.changes();
    const recent = changes.filter((c) => c.start <= now && c.start > now - 24 * HOUR);
    const next = changes.filter((c) => c.start > now).sort((a, b) => a.start - b.start)[0];
    const mttr = s.mttrMin();
    return {
      open: s.openEvents().length,
      lastHour: s.events().filter((e) => e.time > now - HOUR).length,
      alarms: alarms.length,
      critical: alarms.filter((a) => a.severity === 'kritik').length,
      changes: recent.length,
      running: changes.filter((c) => c.status === 'uygulaniyor').length,
      next,
      nextIn: next ? Math.round((next.start - now) / HOUR) : 0,
      mttr: duration(mttr),
      mttrOk: mttr <= MTTR_TARGET,
    };
  });

  protected readonly spark = computed(() => ({
    total: this.store.hourly().map((b) => b.total),
    critical: this.store.hourly().map((b) => b.critical),
  }));

  protected readonly alarms = computed(() => this.store.alarms().filter((a) => !a.ack).slice(0, 5));

  protected readonly recentChanges = computed(() =>
    [...this.store.changes()]
      .filter((c) => c.start <= this.store.now())
      .sort((a, b) => b.start - a.start)
      .slice(0, 5),
  );

  protected readonly topMax = computed(() => Math.max(1, ...this.store.topCis().map((c) => c.value)));
}
