import { Component, inject, signal } from '@angular/core';
import { SceneState } from '../../core/scene-state';

@Component({
  selector: 'oc-radar',
  template: `
    <section class="page" style="--accent: #ffc48d">
      <div class="scenehead">
        <div class="badge rise">◉ &nbsp;ONECORE / RADAR</div>
        <h2 class="rise" style="--d: 100">Sinyali<br /><em>yakala.</em></h2>
        <p class="rise" style="--d: 220">
          Değişiklikleri, olayları ve kritik altyapı hareketlerini tek bir merkezden izleyin. Gürültünün içinden anlamlı
          sinyalleri ortaya çıkarın.
        </p>
        <div class="statline rise" style="--d: 320">
          <div class="stat"><b>{{ stats().events }}</b><span>TESPİT EDİLEN</span></div>
          <div class="stat"><b>{{ stats().alarms }}</b><span>ALARM</span></div>
          <div class="stat"><b>{{ stats().correlations }}</b><span>KORELASYON</span></div>
        </div>
        <div class="rise" style="--d: 420">
          <button class="primary" type="button" (click)="scan()">
            {{ scanned() ? 'Yeniden tara' : 'Radar taramasını başlat' }} <span class="arrow">{{ scanned() ? '↻' : '↗' }}</span>
          </button>
        </div>
        <div class="micro rise" style="--d: 520">CANLANDIRMA DEMODUR · GERÇEK ZAMANLI VERİ YOK</div>
      </div>
      <div class="cursorhint">SÜRÜKLE / DÖNDÜR &nbsp;·&nbsp; KAYDIR / YAKINLAŞ</div>
    </section>
  `,
})
export class Radar {
  private readonly scene = inject(SceneState);
  protected readonly stats = this.scene.radarStats;
  protected readonly scanned = signal(false);

  protected scan() {
    this.scene.trigger('scan');
    this.scanned.set(true);
  }
}
