import { Component } from '@angular/core';
import { NavLink } from '../../core/navigation';

@Component({
  selector: 'oc-welcome',
  imports: [NavLink],
  template: `
    <section class="page">
      <div class="copy">
        <div class="kicker rise">● DİJİTAL ALTYAPININ MERKEZİ</div>
        <h1 class="rise" style="--d: 120">One<em>Core.</em></h1>
        <p class="slogan rise" style="--d: 260">Tüm veri tek merkezde.</p>
        <p class="lead rise" style="--d: 380">
          Tüm sistemler. Tüm ilişkiler. Tüm değişiklikler. Konfigürasyon, varlık, değişiklik ve servis yönetimi tek bir
          dijital evrende buluşuyor.
        </p>
        <div class="buttons rise" style="--d: 500">
          <a class="primary" ocNav="/uygulamalar" [dive]="true">Uygulamalara git <span class="arrow">↗</span></a>
        </div>
        <div class="micro rise" style="--d: 620">SÜRÜKLE / DÖNDÜR &nbsp;·&nbsp; KAYDIR / YAKINLAŞ</div>
      </div>
    </section>
  `,
  styles: `
    .copy {
      position: absolute;
      top: 50%;
      left: clamp(27px, 8vw, 130px);
      max-width: 540px;
      transform: translateY(-46%);
    }
    h1 {
      margin: 0 0 18px;
      font-size: clamp(58px, 7.6vw, 118px);
      font-weight: 780;
      line-height: 0.96;
      letter-spacing: -0.085em;
      em {
        font-style: normal;
        background: linear-gradient(105deg, #d2f5ff, #91b9ff 55%, #ccb6f9);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
    }
    .slogan {
      margin: 0 0 22px;
      font-size: clamp(20px, 2vw, 27px);
      font-weight: 500;
      letter-spacing: -0.02em;
      color: #d6e6f6;
    }
    @media (max-width: 850px) {
      .copy {
        top: 15%;
        left: 26px;
        max-width: calc(100% - 52px);
        transform: none;
      }
      h1 {
        font-size: 60px;
      }
      .lead {
        font-size: 13px;
        margin-bottom: 22px;
      }
    }
  `,
})
export class Welcome {}
