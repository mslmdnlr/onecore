import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SEVERITY, ago } from '../../data/models';
import { RadarStore } from '../../data/radar-store';

@Component({
  selector: 'oc-radar-alarms',
  imports: [RouterLink],
  template: `
    <div class="ws-page">
      <header class="ws-head">
        <div>
          <div class="ws-crumb"><b>Radar</b> / Alarmlar</div>
          <h1 class="ws-title">Alarmlar</h1>
          <p class="ws-sub">Kritik ve yüksek önemli açık olaylar, CI bazında gruplanır. Onaydan sonra gelen yeni olay alarmı yeniden açar.</p>
        </div>
        <div class="ws-chips" role="radiogroup" aria-label="Alarm görünümü">
          <button type="button" class="ws-chip" role="radio" [class.on]="tab() === 'bekleyen'" [attr.aria-checked]="tab() === 'bekleyen'" (click)="tab.set('bekleyen')">
            Onay bekleyen <small>{{ pending().length }}</small>
          </button>
          <button type="button" class="ws-chip" role="radio" [class.on]="tab() === 'onaylanan'" [attr.aria-checked]="tab() === 'onaylanan'" (click)="tab.set('onaylanan')">
            Onaylanan <small>{{ acked().length }}</small>
          </button>
        </div>
      </header>

      <div class="grid">
        @for (a of (tab() === 'bekleyen' ? pending() : acked()); track a.ci) {
          <article class="ws-panel alarm" [class.acked]="a.ack" [style.--c]="SEVERITY[a.severity].color">
            <div class="top">
              <span class="sev" [style.--c]="SEVERITY[a.severity].color"><i>{{ SEVERITY[a.severity].icon }}</i>{{ SEVERITY[a.severity].label }}</span>
              <span class="muted when">{{ ago(a.time, store.now()) }}</span>
            </div>
            <h2>{{ a.title }}</h2>
            <p class="ci"><b>{{ a.ci }}</b> · {{ a.ciType }}</p>
            <p class="rule muted">Kural: {{ a.rule }}</p>
            <div class="foot">
              <a class="ws-btn" routerLink="../olaylar" [queryParams]="{ ci: a.ci }">{{ a.eventIds.length }} olayı gör</a>
              @if (a.ack) {
                <span class="pill" style="--c: #62e6b4">{{ a.ack.by }} · {{ ago(a.ack.at, store.now()) }} onayladı</span>
              } @else {
                <button type="button" class="ws-btn solid" (click)="store.acknowledge(a.ci)">Onayla</button>
              }
            </div>
          </article>
        } @empty {
          <p class="ws-panel ws-empty">{{ tab() === 'bekleyen' ? 'Onay bekleyen alarm yok. Her şey kontrol altında.' : 'Henüz onaylanan alarm yok.' }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 14px;
    }
    .alarm {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: hidden;
      &::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 3px;
        background: var(--c);
      }
      &.acked {
        opacity: 0.75;
        &::before {
          background: #62e6b4;
        }
      }
      h2 {
        margin: 4px 0 0;
        font-size: 15px;
        font-weight: 650;
        line-height: 1.35;
      }
      p {
        margin: 0;
        font-size: 13px;
      }
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .when {
      font-size: 12px;
    }
    .ci b {
      font-weight: 600;
    }
    .rule {
      font-size: 12px !important;
    }
    .foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: auto;
      padding-top: 10px;
    }
  `,
})
export class Alarms {
  protected readonly store = inject(RadarStore);
  protected readonly SEVERITY = SEVERITY;
  protected readonly ago = ago;
  protected readonly tab = signal<'bekleyen' | 'onaylanan'>('bekleyen');
  protected readonly pending = computed(() => this.store.alarms().filter((a) => !a.ack));
  protected readonly acked = computed(() => this.store.alarms().filter((a) => a.ack));
}
