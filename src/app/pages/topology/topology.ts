import { Component, inject, signal } from '@angular/core';
import { SceneState } from '../../core/scene-state';
import { CI_EDGES, CI_NODES, CI_TYPES } from '../../scene/topology-data';

@Component({
  selector: 'oc-topology',
  template: `
    <section class="page" style="--accent: #7edbff">
      <div class="scenehead">
        <div class="badge rise">⬡ &nbsp;ONECORE / TOPOLOJİ</div>
        <h2 class="rise" style="--d: 100">Her şey<br /><em>birbirine bağlı.</em></h2>
        <p class="rise" style="--d: 220">
          Sunucular, veritabanları, uygulamalar ve ağ katmanları: hepsinin ilişkilerini üç boyutlu bir altyapı haritasında
          keşfedin. Veri her bağlantıdan çekirdeğe akar.
        </p>
        <div class="statline rise" style="--d: 320">
          <div class="stat"><b>{{ nodes }}</b><span>ÖRNEK CI</span></div>
          <div class="stat"><b>{{ edges }}</b><span>BAĞLANTI</span></div>
          <div class="stat"><b>{{ layers }}</b><span>KATMAN</span></div>
        </div>
        <div class="rise" style="--d: 420">
          <button class="primary" type="button" (click)="cascade()">
            {{ ran() ? 'Analizi tekrarla' : 'Etki analizini başlat' }} <span class="arrow">{{ ran() ? '↻' : '↗' }}</span>
          </button>
        </div>
        <div class="micro rise" style="--d: 520">DEMO VERİLERİ · GERÇEK CMDB BAĞLANTISI YOK</div>
      </div>
      <div class="cursorhint">DÜĞÜMLERİN ÜZERİNE GELİN &nbsp;·&nbsp; SÜRÜKLE / DÖNDÜR</div>
    </section>
  `,
})
export class Topology {
  private readonly scene = inject(SceneState);
  protected readonly nodes = CI_NODES.length;
  protected readonly edges = CI_EDGES.length;
  protected readonly layers = String(CI_TYPES.length).padStart(2, '0');
  protected readonly ran = signal(false);

  protected cascade() {
    this.scene.trigger('cascade');
    this.ran.set(true);
  }
}
