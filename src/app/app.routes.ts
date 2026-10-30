import { Routes } from '@angular/router';

/**
 * data.scene → arka plandaki 3B sahnenin biçimi
 * data.stage → üst bardaki aşama başlığı
 * data.back  → "Geri" butonunun hedefi
 */
export const routes: Routes = [
  {
    path: '',
    title: 'OneCore — Tüm veri tek merkezde',
    data: { scene: 'datacenter', stage: 'CORE EXPERIENCE / 01' },
    loadComponent: () => import('./pages/welcome/welcome').then((m) => m.Welcome),
  },
  {
    path: 'uygulamalar',
    title: 'OneCore — Uygulamalar',
    data: { scene: 'galaxy', stage: 'UYGULAMA MERKEZİ / 02', back: '/' },
    loadComponent: () => import('./pages/apps/apps').then((m) => m.Apps),
  },
  {
    path: 'radar',
    title: 'OneCore — Radar',
    data: { scene: 'radar', stage: 'RADAR / 03', back: '/uygulamalar' },
    loadComponent: () => import('./pages/radar/radar').then((m) => m.Radar),
  },
  {
    path: 'topoloji',
    title: 'OneCore — Topoloji',
    data: { scene: 'network', stage: 'TOPOLOJİ / 04', back: '/uygulamalar' },
    loadComponent: () => import('./pages/topology/topology').then((m) => m.Topology),
  },
  { path: '**', redirectTo: '' },
];
