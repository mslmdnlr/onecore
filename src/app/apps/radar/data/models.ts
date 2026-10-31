export type Severity = 'kritik' | 'yuksek' | 'orta' | 'dusuk';
export type EventStatus = 'acik' | 'inceleniyor' | 'cozuldu';
export type ChangeStatus = 'planlandi' | 'uygulaniyor' | 'tamamlandi' | 'basarisiz';
export type Risk = 'yuksek' | 'orta' | 'dusuk';

export interface RadarEvent {
  id: string;
  title: string;
  ci: string;
  ciType: string;
  severity: Severity;
  status: EventStatus;
  source: string;
  /** İlk görülme (ms) */
  time: number;
  resolvedAt?: number;
  /** Aynı olayın tekrar sayısı */
  count: number;
  changeId?: string;
  log: { at: number; text: string }[];
}

export interface RadarChange {
  id: string;
  title: string;
  ci: string;
  risk: Risk;
  status: ChangeStatus;
  start: number;
  end: number;
  owner: string;
}

export interface RadarAlarm {
  ci: string;
  ciType: string;
  title: string;
  severity: Severity;
  time: number;
  eventIds: string[];
  rule: string;
  ack?: { by: string; at: number };
}

export interface Correlation {
  id: string;
  change: RadarChange;
  events: RadarEvent[];
  confidence: number;
  /** Değişiklik başlangıcından ilk olaya kadar geçen dakika */
  lagMin: number;
}

interface Meta {
  label: string;
  color: string;
}

export const SEVERITY: Record<Severity, Meta & { icon: string; rank: number }> = {
  kritik: { label: 'Kritik', color: '#ff5d5d', icon: '◆', rank: 3 },
  yuksek: { label: 'Yüksek', color: '#ff9f43', icon: '▲', rank: 2 },
  orta: { label: 'Orta', color: '#f5c451', icon: '●', rank: 1 },
  dusuk: { label: 'Düşük', color: '#5cc8ff', icon: '○', rank: 0 },
};
export const SEVERITIES = Object.keys(SEVERITY) as Severity[];

export const STATUS: Record<EventStatus, Meta> = {
  acik: { label: 'Açık', color: '#ff9f43' },
  inceleniyor: { label: 'İnceleniyor', color: '#a5b4ff' },
  cozuldu: { label: 'Çözüldü', color: '#62e6b4' },
};

export const CHANGE_STATUS: Record<ChangeStatus, Meta> = {
  planlandi: { label: 'Planlandı', color: '#8fa3b8' },
  uygulaniyor: { label: 'Uygulanıyor', color: '#a5b4ff' },
  tamamlandi: { label: 'Tamamlandı', color: '#62e6b4' },
  basarisiz: { label: 'Başarısız', color: '#ff5d5d' },
};

export const RISK: Record<Risk, Meta & { icon: string }> = {
  yuksek: { label: 'Yüksek risk', color: SEVERITY.yuksek.color, icon: SEVERITY.yuksek.icon },
  orta: { label: 'Orta risk', color: SEVERITY.orta.color, icon: SEVERITY.orta.icon },
  dusuk: { label: 'Düşük risk', color: SEVERITY.dusuk.color, icon: SEVERITY.dusuk.icon },
};

// ——— Biçimlendirme ———
const clockFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const stampFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const clock = (ms: number) => clockFmt.format(ms);
export const stamp = (ms: number) => stampFmt.format(ms);

export function ago(ms: number, now: number) {
  const m = Math.round((now - ms) / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return stamp(ms);
}

export function duration(min: number) {
  if (min < 60) return `${Math.round(min)} dk`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}
