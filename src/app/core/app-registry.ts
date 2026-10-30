/**
 * OneCore uygulama kaydı.
 * Yeni bir modül eklemek için bu listeye bir kayıt eklemek ve
 * (varsa) app.routes.ts içine rotasını tanımlamak yeterlidir.
 */
export type AppStatus = 'active' | 'soon';

export interface OneCoreApp {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Kartın altındaki kısa slogan */
  motto: string;
  route: string;
  /** Kartta ve sahnede kullanılan vurgu rengi */
  color: string;
  icon: 'radar' | 'topology' | 'config' | 'asset' | 'change' | 'itsm';
  status: AppStatus;
}

export const ONECORE_APPS: OneCoreApp[] = [
  {
    id: 'radar',
    name: 'Radar',
    tagline: 'Olay ve değişiklik izleme',
    description: 'Değişiklikler, olaylar ve akıllı korelasyon.',
    motto: 'SİNYALİ YAKALA',
    route: '/radar',
    color: '#ffb065',
    icon: 'radar',
    status: 'active',
  },
  {
    id: 'topoloji',
    name: 'Topoloji',
    tagline: 'Altyapı haritası',
    description: 'Altyapı haritası, servis ve CI bağımlılıkları.',
    motto: 'BAĞLANTILARI KEŞFET',
    route: '/topoloji',
    color: '#71deff',
    icon: 'topology',
    status: 'active',
  },
  {
    id: 'konfigurasyon',
    name: 'Konfigürasyon',
    tagline: 'CMDB',
    description: 'Konfigürasyon öğeleri ve ilişkileri.',
    motto: '',
    route: '',
    color: '#8fa8ff',
    icon: 'config',
    status: 'soon',
  },
  {
    id: 'asset',
    name: 'Asset',
    tagline: 'Varlık yönetimi',
    description: 'Donanım, yazılım ve lisans envanteri.',
    motto: '',
    route: '',
    color: '#ffd17c',
    icon: 'asset',
    status: 'soon',
  },
  {
    id: 'change',
    name: 'Change',
    tagline: 'Değişiklik yönetimi',
    description: 'Planlı ve acil değişikliklerin yaşam döngüsü.',
    motto: '',
    route: '',
    color: '#ff8fa8',
    icon: 'change',
    status: 'soon',
  },
  {
    id: 'itsm',
    name: 'ITSM',
    tagline: 'Servis yönetimi',
    description: 'Olay, talep ve problem süreçleri.',
    motto: '',
    route: '',
    color: '#69e7bf',
    icon: 'itsm',
    status: 'soon',
  },
];
