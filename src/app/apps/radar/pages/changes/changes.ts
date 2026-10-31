import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHANGE_STATUS, RISK, RadarChange, clock, stamp } from '../../data/models';
import { RadarStore } from '../../data/radar-store';

@Component({
  selector: 'oc-radar-changes',
  imports: [RouterLink],
  template: `
    <div class="ws-page">
      <header class="ws-head">
        <div>
          <div class="ws-crumb"><b>Radar</b> / Değişiklikler</div>
          <h1 class="ws-title">Değişiklikler</h1>
          <p class="ws-sub">Planlanan ve uygulanan değişiklikler; olay ürettiği tespit edilenler işaretlenir.</p>
        </div>
      </header>

      @for (g of groups(); track g.label) {
        @if (g.items.length) {
          <section class="ws-panel">
            <div class="ws-panel-head">
              <h2>{{ g.label }}</h2>
              <span class="meta">{{ g.items.length }} değişiklik</span>
            </div>
            @for (c of g.items; track c.id) {
              <div class="row">
                <div class="when">
                  <b>{{ clock(c.start) }}</b>
                  <small>{{ day(c.start) }}</small>
                </div>
                <div class="body">
                  <span class="title"><span class="mono muted">{{ c.id }}</span> {{ c.title }}</span>
                  <small class="muted">{{ c.ci }} · {{ c.owner }} · {{ clock(c.start) }}–{{ clock(c.end) }}</small>
                </div>
                <span class="sev" [style.--c]="RISK[c.risk].color"><i>{{ RISK[c.risk].icon }}</i>{{ RISK[c.risk].label }}</span>
                <span class="pill" [style.--c]="CHANGE_STATUS[c.status].color">{{ CHANGE_STATUS[c.status].label }}</span>
                @if (linked().get(c.id); as n) {
                  <a class="linked" routerLink="../korelasyon">{{ n }} olayla ilişkili →</a>
                } @else {
                  <span class="linked none">—</span>
                }
              </div>
            }
          </section>
        }
      }
    </div>
  `,
  styles: `
    .row {
      display: grid;
      grid-template-columns: 70px minmax(0, 1fr) 118px 120px 150px;
      align-items: center;
      gap: 14px;
      padding: 12px 0;
      border-top: 1px solid #ffffff0d;
      font-size: 13px;
    }
    .ws-panel-head + .row {
      border-top: 0;
    }
    .when {
      display: flex;
      flex-direction: column;
      font-variant-numeric: tabular-nums;
      b {
        font-size: 14px;
      }
      small {
        font-size: 11px;
        color: #7f93a8;
      }
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      small {
        font-size: 12px;
      }
    }
    .title {
      overflow: hidden;
      font-weight: 600;
      color: #e8f0f8;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .linked {
      justify-self: end;
      font-size: 12px;
      font-weight: 600;
      color: var(--app);
      text-decoration: none;
      white-space: nowrap;
      &:hover {
        text-decoration: underline;
      }
      &.none {
        color: #4f6177;
      }
    }
    @media (max-width: 1100px) {
      .row {
        grid-template-columns: 60px minmax(0, 1fr) auto;
      }
      .row .sev,
      .linked {
        display: none;
      }
    }
  `,
})
export class Changes {
  protected readonly store = inject(RadarStore);
  protected readonly CHANGE_STATUS = CHANGE_STATUS;
  protected readonly RISK = RISK;
  protected readonly clock = clock;

  protected readonly groups = computed(() => {
    const all = this.store.changes();
    const by = (pred: (c: RadarChange) => boolean, dir: 1 | -1) => all.filter(pred).sort((a, b) => (a.start - b.start) * dir);
    return [
      { label: 'Uygulanıyor', items: by((c) => c.status === 'uygulaniyor', 1) },
      { label: 'Planlanan', items: by((c) => c.status === 'planlandi', 1) },
      { label: 'Tamamlanan', items: by((c) => c.status === 'tamamlandi' || c.status === 'basarisiz', -1) },
    ];
  });

  protected readonly linked = computed(() => {
    const m = new Map<string, number>();
    for (const e of this.store.events()) if (e.changeId) m.set(e.changeId, (m.get(e.changeId) ?? 0) + 1);
    return m;
  });

  protected day(ms: number) {
    const d = Math.round((new Date(ms).setHours(0, 0, 0, 0) - new Date(this.store.now()).setHours(0, 0, 0, 0)) / 86_400_000);
    return d === 0 ? 'Bugün' : d === -1 ? 'Dün' : d === 1 ? 'Yarın' : stamp(ms).split(' ').slice(0, 2).join(' ');
  }
}
