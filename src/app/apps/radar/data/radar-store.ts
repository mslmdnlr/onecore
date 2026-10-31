import { Injectable, computed, signal } from '@angular/core';
import { CI_NODES, CI_TYPES } from '../../../scene/topology-data';
import { Correlation, EventStatus, RadarAlarm, RadarChange, RadarEvent, SEVERITY, Severity } from './models';

const MIN = 60_000;
const HOUR = 60 * MIN;
const SOURCES = ['Zabbix', 'Prometheus', 'SCOM', 'Elastic APM', 'Syslog'];
const OWNERS = ['A. Yılmaz', 'M. Demir', 'S. Kaya', 'E. Çelik', 'Z. Arslan'];

/** CI tipine göre olay şablonları; {p} yüzde, {n} ms, {s} saniye, {q} küçük yüzde, {d} gün */
const TEMPLATES: string[][] = [
  ['Yanıt süresi eşiği aşıldı ({n} ms)', 'HTTP 5xx hata oranı %{q}', 'Oturum sayısında ani düşüş', 'Kimlik doğrulama hataları arttı'],
  ['Yüksek CPU kullanımı (%{p})', 'Bellek kullanımı %{p}', 'Disk doluluk oranı %{p}', 'Pod yeniden başlatma döngüsü'],
  ['Replikasyon gecikmesi {s} sn', 'Bağlantı havuzu tükendi', 'Kilitlenme (deadlock) tespit edildi', 'Yedekleme başarısız'],
  ['Paket kaybı %{q}', 'Sertifika süresi doluyor ({d} gün)', 'Arayüz bağlantısı koptu', 'Oturum tablosu %{p} dolu'],
];

/** Değişiklik planı: başlangıç (saat, şimdiye göre), süre ve ardından gelen olay patlaması */
const CHANGE_PLAN: { title: string; ci: string; risk: RadarChange['risk']; startH: number; durH: number; status: RadarChange['status']; burst: number }[] = [
  { title: 'K8S-CLUSTER sürüm yükseltme 1.29 → 1.30', ci: 'K8S-CLUSTER', risk: 'yuksek', startH: -2, durH: 3, status: 'uygulaniyor', burst: 5 },
  { title: 'MSSQL-PRD toplu güvenlik yaması', ci: 'MSSQL-PRD', risk: 'yuksek', startH: -5.5, durH: 1, status: 'tamamlandi', burst: 6 },
  { title: 'F5 LTM sertifika yenileme', ci: 'F5 LTM', risk: 'orta', startH: -9, durH: 0.5, status: 'tamamlandi', burst: 3 },
  { title: 'APP-WEB-01 uygulama dağıtımı v4.12', ci: 'APP-WEB-01', risk: 'orta', startH: -14, durH: 0.75, status: 'basarisiz', burst: 7 },
  { title: 'FIREWALL kural seti güncellemesi', ci: 'FIREWALL', risk: 'yuksek', startH: -20, durH: 1, status: 'tamamlandi', burst: 2 },
  { title: 'API Gateway hız sınırı ayarı', ci: 'API Gateway', risk: 'dusuk', startH: -26, durH: 0.25, status: 'tamamlandi', burst: 2 },
  { title: 'ORACLE-RAC indeks bakımı', ci: 'ORACLE-RAC', risk: 'dusuk', startH: -30, durH: 2, status: 'tamamlandi', burst: 0 },
  { title: 'LINUX-01 çekirdek güncellemesi', ci: 'LINUX-01', risk: 'orta', startH: -40, durH: 1, status: 'tamamlandi', burst: 0 },
  { title: 'CMDB Portal arayüz güncellemesi v2.3', ci: 'CMDB Portal', risk: 'dusuk', startH: -50, durH: 0.5, status: 'tamamlandi', burst: 0 },
  { title: 'POSTGRES-01 sürüm yükseltme 15 → 16', ci: 'POSTGRES-01', risk: 'yuksek', startH: 8, durH: 2, status: 'planlandi', burst: 0 },
  { title: 'WIN-SRV-02 aylık yama', ci: 'WIN-SRV-02', risk: 'dusuk', startH: 20, durH: 1.5, status: 'planlandi', burst: 0 },
  { title: 'F5 GSLB yük dengeleme politikası', ci: 'F5 GSLB', risk: 'orta', startH: 30, durH: 1, status: 'planlandi', burst: 0 },
];

/** Tekrarlanabilir demo veri için küçük tohumlu rastgele sayı üreteci */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CIS = CI_NODES.slice(1).map((c) => ({ name: c.name, type: c.type, typeLabel: CI_TYPES[c.type] }));

/**
 * Radar demo veri deposu. Gerçek bir olay kaynağına bağlanana kadar
 * tutarlı (tohumlu) geçmiş veri ve canlı bir olay akışı üretir.
 */
@Injectable({ providedIn: 'root' })
export class RadarStore {
  private rnd = mulberry32(20261031);
  private seq = 4100;
  private timer?: ReturnType<typeof setTimeout>;
  private clockTimer?: ReturnType<typeof setInterval>;

  readonly now = signal(Date.now());
  readonly live = signal(true);
  readonly events = signal<RadarEvent[]>([]);
  readonly changes = signal<RadarChange[]>([]);
  /** Yeni gelen olaylar kısa süre vurgulanır */
  readonly fresh = signal<ReadonlySet<string>>(new Set());
  private readonly acks = signal<Record<string, { by: string; at: number }>>({});

  constructor() {
    this.seed();
  }

  // ——— Türetilmiş görünümler ———

  readonly openEvents = computed(() => this.events().filter((e) => e.status !== 'cozuldu'));

  /** Açık, kritik/yüksek olaylar CI bazında alarma dönüşür; onaydan sonra gelen yeni olay alarmı yeniden açar */
  readonly alarms = computed<RadarAlarm[]>(() => {
    const acks = this.acks();
    const byCi = new Map<string, RadarEvent[]>();
    for (const e of this.openEvents()) {
      if (e.severity !== 'kritik' && e.severity !== 'yuksek') continue;
      byCi.set(e.ci, [...(byCi.get(e.ci) ?? []), e]);
    }
    return [...byCi.entries()]
      .map(([ci, list]) => {
        const worst = list.reduce((a, b) => (SEVERITY[b.severity].rank > SEVERITY[a.severity].rank ? b : a));
        const latest = Math.max(...list.map((e) => e.time));
        const ack = acks[ci];
        return {
          ci,
          ciType: worst.ciType,
          title: worst.title,
          severity: worst.severity,
          time: latest,
          eventIds: list.map((e) => e.id),
          rule: `${worst.ciType} · ${worst.severity === 'kritik' ? 'kritik eşik' : 'uyarı eşiği'} · 5 dk pencere`,
          ack: ack && ack.at >= latest ? ack : undefined,
        };
      })
      .sort((a, b) => SEVERITY[b.severity].rank - SEVERITY[a.severity].rank || b.time - a.time);
  });

  readonly correlations = computed<Correlation[]>(() => {
    const events = this.events();
    return this.changes()
      .map((change) => {
        const linked = events.filter((e) => e.changeId === change.id);
        if (!linked.length) return null;
        const first = Math.min(...linked.map((e) => e.time));
        const lagMin = Math.max(1, Math.round((first - change.start) / MIN));
        const crit = linked.filter((e) => e.severity === 'kritik' || e.severity === 'yuksek').length;
        const confidence = Math.min(0.97, 0.52 + linked.length * 0.045 + crit * 0.03 - lagMin * 0.003);
        return { id: `KOR-${change.id.slice(4)}`, change, events: linked, confidence, lagMin };
      })
      .filter((c): c is Correlation => !!c)
      .sort((a, b) => b.confidence - a.confidence);
  });

  /** Son 24 saat, tam saatlere hizalı kovalar (sonuncusu içinde bulunulan saat) */
  readonly hourly = computed(() => {
    const now = this.now();
    const start = Math.floor(now / HOUR) * HOUR - 23 * HOUR;
    const bins = Array.from({ length: 24 }, (_, i) => ({ start: start + i * HOUR, total: 0, critical: 0 }));
    for (const e of this.events()) {
      const i = Math.floor((e.time - start) / HOUR);
      if (i < 0 || i > 23) continue;
      bins[i].total++;
      if (e.severity === 'kritik') bins[i].critical++;
    }
    return bins;
  });

  readonly mttrMin = computed(() => {
    const since = this.now() - 24 * HOUR;
    const done = this.events().filter((e) => e.resolvedAt && e.resolvedAt > since);
    if (!done.length) return 0;
    return done.reduce((s, e) => s + (e.resolvedAt! - e.time), 0) / done.length / MIN;
  });

  readonly topCis = computed(() => {
    const counts = new Map<string, number>();
    for (const e of this.openEvents()) counts.set(e.ci, (counts.get(e.ci) ?? 0) + 1);
    return [...counts.entries()]
      .map(([ci, value]) => ({ ci, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  });

  // ——— Eylemler ———

  start() {
    this.stop();
    this.clockTimer = setInterval(() => this.now.set(Date.now()), 30_000);
    this.schedule();
  }

  stop() {
    clearTimeout(this.timer);
    clearInterval(this.clockTimer);
  }

  toggleLive() {
    this.live.update((v) => !v);
  }

  acknowledge(ci: string) {
    this.acks.update((a) => ({ ...a, [ci]: { by: 'Siz', at: Date.now() } }));
  }

  setStatus(id: string, status: EventStatus) {
    const now = Date.now();
    this.events.update((list) =>
      list.map((e) =>
        e.id === id && e.status !== status
          ? {
              ...e,
              status,
              resolvedAt: status === 'cozuldu' ? now : undefined,
              log: [...e.log, { at: now, text: `Durum “${status === 'acik' ? 'Açık' : status === 'inceleniyor' ? 'İnceleniyor' : 'Çözüldü'}” olarak değiştirildi · Siz` }],
            }
          : e,
      ),
    );
  }

  // ——— Demo veri üretimi ———

  private pick<T>(list: T[], r = this.rnd) {
    return list[Math.floor(r() * list.length)];
  }

  private severity(r: () => number, boost = 0): Severity {
    const x = r() - boost;
    return x < 0.12 ? 'kritik' : x < 0.37 ? 'yuksek' : x < 0.75 ? 'orta' : 'dusuk';
  }

  private makeEvent(r: () => number, time: number, ci: (typeof CIS)[number], severity: Severity, changeId?: string): RadarEvent {
    const fill = (t: string) =>
      t
        .replace('{p}', String(85 + Math.floor(r() * 15)))
        .replace('{n}', String(800 + Math.floor(r() * 3200)))
        .replace('{s}', String(12 + Math.floor(r() * 108)))
        .replace('{q}', String(2 + Math.floor(r() * 8)))
        .replace('{d}', String(3 + Math.floor(r() * 12)));
    const source = this.pick(SOURCES, r);
    return {
      id: `OLY-${this.seq++}`,
      title: fill(this.pick(TEMPLATES[ci.type], r)),
      ci: ci.name,
      ciType: ci.typeLabel,
      severity,
      status: 'acik',
      source,
      time,
      count: 1 + Math.floor(r() * r() * 14),
      changeId,
      log: [{ at: time, text: `${source} tarafından oluşturuldu` }],
    };
  }

  /** Olayın yaşına göre gerçekçi bir durum ve çözüm zamanı atar */
  private age(e: RadarEvent, now: number, r: () => number): RadarEvent {
    const hours = (now - e.time) / HOUR;
    const x = r();
    const resolved = hours > 6 ? x < 0.82 : hours > 1 ? x < 0.4 : x < 0.08;
    if (resolved) {
      const at = Math.min(now - MIN, e.time + (8 + r() * 110) * MIN);
      return { ...e, status: 'cozuldu', resolvedAt: at, log: [...e.log, { at, text: 'Otomatik çözüldü · metrik normale döndü' }] };
    }
    if (x < 0.62) {
      const at = Math.min(now - MIN, e.time + (3 + r() * 30) * MIN);
      return { ...e, status: 'inceleniyor', log: [...e.log, { at, text: `${this.pick(OWNERS, r)} incelemeye aldı` }] };
    }
    return e;
  }

  private seed() {
    const r = this.rnd;
    const now = Date.now();

    const changes = CHANGE_PLAN.map((p, i) => ({
      id: `CHG-${2031 + i}`,
      title: p.title,
      ci: p.ci,
      risk: p.risk,
      status: p.status,
      start: now + p.startH * HOUR,
      end: now + (p.startH + p.durH) * HOUR,
      owner: OWNERS[i % OWNERS.length],
    }));

    const events: RadarEvent[] = [];
    // Arka plan gürültüsü: son 24 saat, gündüz saatlerine doğru yoğunlaşan
    for (let i = 0; i < 150; i++) {
      const t = now - Math.pow(r(), 1.15) * 24 * HOUR;
      events.push(this.makeEvent(r, t, this.pick(CIS, r), this.severity(r)));
    }
    // Değişiklik sonrası olay patlamaları (korelasyonun kaynağı)
    CHANGE_PLAN.forEach((p, i) => {
      const ci = CIS.find((c) => c.name === p.ci)!;
      for (let k = 0; k < p.burst; k++) {
        const t = changes[i].start + (4 + k * 3 + r() * 6) * MIN;
        if (t < now) events.push(this.makeEvent(r, t, ci, this.severity(r, 0.2), changes[i].id));
      }
    });

    this.changes.set(changes);
    this.events.set(events.map((e) => this.age(e, now, r)).sort((a, b) => b.time - a.time));
  }

  /** Canlı akış: birkaç saniyede bir yeni olay, ara sıra bir çözülme */
  private schedule() {
    this.timer = setTimeout(() => {
      if (this.live()) this.tick();
      this.schedule();
    }, 3500 + Math.random() * 4500);
  }

  private tick() {
    const now = Date.now();
    const e = this.makeEvent(Math.random, now, this.pick(CIS, Math.random), this.severity(Math.random));
    this.now.set(now);
    this.events.update((list) => {
      let next = [e, ...list];
      if (Math.random() < 0.35) {
        const candidates = next.filter((x) => x.status !== 'cozuldu' && now - x.time > 20 * MIN);
        const done = candidates[Math.floor(Math.random() * candidates.length)];
        if (done) {
          next = next.map((x) =>
            x === done ? { ...x, status: 'cozuldu', resolvedAt: now, log: [...x.log, { at: now, text: 'Otomatik çözüldü · metrik normale döndü' }] } : x,
          );
        }
      }
      return next;
    });
    this.fresh.update((s) => new Set(s).add(e.id));
    setTimeout(() => this.fresh.update((s) => {
      const n = new Set(s);
      n.delete(e.id);
      return n;
    }), 4000);
  }
}
