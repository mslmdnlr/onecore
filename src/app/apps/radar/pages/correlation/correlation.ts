import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHANGE_STATUS, Correlation, SEVERITIES, SEVERITY, stamp } from '../../data/models';
import { RadarStore } from '../../data/radar-store';

@Component({
  selector: 'oc-radar-correlation',
  imports: [RouterLink],
  template: `
    <div class="ws-page">
      <header class="ws-head">
        <div>
          <div class="ws-crumb"><b>Radar</b> / Korelasyon</div>
          <h1 class="ws-title">Korelasyon</h1>
          <p class="ws-sub">Değişikliklerle, ardından aynı CI üzerinde başlayan olaylar arasındaki olası neden-sonuç ilişkileri.</p>
        </div>
      </header>

      @for (c of store.correlations(); track c.id) {
        <article class="ws-panel corr">
          <div class="conf">
            <span class="c-label">Güven</span>
            <strong>%{{ pct(c) }}</strong>
            <span class="track" role="img" [attr.aria-label]="'Güven yüzde ' + pct(c)"><span [style.width.%]="pct(c)"></span></span>
          </div>

          <div class="cause">
            <span class="c-label">Değişiklik</span>
            <b><span class="mono muted">{{ c.change.id }}</span> {{ c.change.title }}</b>
            <small class="muted">{{ stamp(c.change.start) }} · {{ c.change.owner }} ·
              <span class="pill" [style.--c]="CHANGE_STATUS[c.change.status].color">{{ CHANGE_STATUS[c.change.status].label }}</span>
            </small>
          </div>

          <div class="arrow" aria-hidden="true">
            <span>{{ c.lagMin }} dk sonra</span>
            <svg viewBox="0 0 60 12"><path d="M0 6h56M50 1l6 5-6 5" /></svg>
          </div>

          <div class="effect">
            <span class="c-label">Etki · {{ c.change.ci }}</span>
            <b>{{ c.events.length }} olay</b>
            <div class="sevs">
              @for (s of SEVERITIES; track s) {
                @if (count(c, s); as n) {
                  <span class="sev" [style.--c]="SEVERITY[s].color"><i>{{ SEVERITY[s].icon }}</i>{{ n }} {{ SEVERITY[s].label.toLocaleLowerCase('tr') }}</span>
                }
              }
            </div>
            <small class="muted first">{{ c.events[c.events.length - 1].title }}</small>
          </div>

          <a class="ws-btn" routerLink="../olaylar" [queryParams]="{ ci: c.change.ci }">Olayları incele</a>
        </article>
      } @empty {
        <p class="ws-panel ws-empty">Henüz bir korelasyon tespit edilmedi.</p>
      }

      <p class="note muted">Demo: güven skoru, değişiklik penceresi ile aynı CI üzerindeki olayların zamansal yakınlığı ve önem düzeyinden hesaplanır.</p>
    </div>
  `,
  styles: `
    .corr {
      display: grid;
      grid-template-columns: 110px minmax(0, 1.2fr) 90px minmax(0, 1fr) auto;
      align-items: center;
      gap: 22px;
    }
    .c-label {
      display: block;
      margin-bottom: 4px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #6f8399;
    }
    .conf strong {
      display: block;
      font-size: 26px;
      font-weight: 750;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }
    .track {
      display: block;
      height: 6px;
      margin-top: 6px;
      border-radius: 4px;
      background: #ffffff10;
      span {
        display: block;
        height: 100%;
        border-radius: 4px;
        background: var(--app);
      }
    }
    .cause,
    .effect {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
      b {
        font-size: 14px;
        font-weight: 600;
      }
      small {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: 12px;
      }
    }
    .first {
      display: block !important;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sevs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #8a9bb0;
      white-space: nowrap;
      svg {
        width: 60px;
        height: 12px;
        fill: none;
        stroke: var(--app);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    }
    .note {
      margin: 0;
      font-size: 12px;
    }
    @media (max-width: 1100px) {
      .corr {
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
      }
      .arrow {
        flex-direction: row;
        justify-content: flex-start;
        svg {
          transform: rotate(90deg);
          width: 24px;
        }
      }
      .corr .ws-btn {
        justify-self: start;
      }
    }
  `,
})
export class CorrelationPage {
  protected readonly store = inject(RadarStore);
  protected readonly SEVERITY = SEVERITY;
  protected readonly SEVERITIES = SEVERITIES;
  protected readonly CHANGE_STATUS = CHANGE_STATUS;
  protected readonly stamp = stamp;

  protected pct(c: Correlation) {
    return Math.round(c.confidence * 100);
  }

  protected count(c: Correlation, s: (typeof SEVERITIES)[number]) {
    return c.events.filter((e) => e.severity === s).length;
  }
}
