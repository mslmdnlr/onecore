import { Routes } from '@angular/router';

/**
 * data.scene     → arka plandaki 3B sahnenin biçimi
 * data.back      → "Geri" butonunun hedefi
 * data.workspace → uygulama çalışma alanı (sahne geri plana çekilir, alt bilgi gizlenir)
 */
export const routes: Routes = [
  {
    path: '',
    title: 'OneCore — Tüm veri tek merkezde',
    data: { scene: 'datacenter' },
    loadComponent: () => import('./pages/welcome/welcome').then((m) => m.Welcome),
  },
  {
    path: 'uygulamalar',
    title: 'OneCore — Uygulamalar',
    data: { scene: 'galaxy', back: '/' },
    loadComponent: () => import('./pages/apps/apps').then((m) => m.Apps),
  },
  {
    path: 'radar',
    pathMatch: 'full',
    title: 'OneCore — Radar',
    data: { scene: 'radar', back: '/uygulamalar' },
    loadComponent: () => import('./pages/radar/radar').then((m) => m.Radar),
  },
  {
    // Radar uygulamasının içi: /radar/genel-bakis, /radar/olaylar …
    path: 'radar',
    data: { scene: 'radar', back: '/radar', workspace: true },
    loadChildren: () => import('./apps/radar/radar.routes').then((m) => m.RADAR_ROUTES),
  },
  {
    path: 'topoloji',
    title: 'OneCore — Topoloji',
    data: { scene: 'network', back: '/uygulamalar' },
    loadComponent: () => import('./pages/topology/topology').then((m) => m.Topology),
  },
  { path: '**', redirectTo: '' },
];
