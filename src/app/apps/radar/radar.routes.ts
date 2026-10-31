import { Routes } from '@angular/router';
import { RadarShell } from './shell/radar-shell';

export const RADAR_ROUTES: Routes = [
  {
    path: '',
    component: RadarShell,
    children: [
      {
        path: 'genel-bakis',
        title: 'Genel Bakış · Radar · OneCore',
        loadComponent: () => import('./pages/overview/overview').then((m) => m.Overview),
      },
      {
        path: 'olaylar',
        title: 'Olaylar · Radar · OneCore',
        loadComponent: () => import('./pages/events/events').then((m) => m.Events),
      },
      {
        path: 'alarmlar',
        title: 'Alarmlar · Radar · OneCore',
        loadComponent: () => import('./pages/alarms/alarms').then((m) => m.Alarms),
      },
      {
        path: 'degisiklikler',
        title: 'Değişiklikler · Radar · OneCore',
        loadComponent: () => import('./pages/changes/changes').then((m) => m.Changes),
      },
      {
        path: 'korelasyon',
        title: 'Korelasyon · Radar · OneCore',
        loadComponent: () => import('./pages/correlation/correlation').then((m) => m.CorrelationPage),
      },
      { path: '**', redirectTo: 'genel-bakis' },
    ],
  },
];
