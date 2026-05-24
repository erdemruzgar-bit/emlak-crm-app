// Modül tanımları — Settings → Users edit formunda kullanıcı bazlı yetkilendirme için.
// Her modül bir veya birden fazla URL prefix'iyle eşleşir; middleware bu listeyi
// path-match için kullanır.
//
// Tasarım: NEGATIVE permission.
//   - User.disabledModules boş → tüm modüller açık (varsayılan, geriye uyumlu).
//   - User.disabledModules = ["FINANCE", "REPORTS"] → o iki modül kapalı.
//   - ADMIN için disabledModules HİÇ KONTROL EDİLMEZ (her zaman tam erişim).

export type ModuleKey =
  | "DASHBOARD"
  | "CUSTOMERS"
  | "PROPERTIES"
  | "PROJECTS"
  | "MESSAGES"
  | "CONTRACTS"
  | "FINANCE"
  | "CALENDAR"
  | "TASKS"
  | "REMINDERS"
  | "AUTOMATION"
  | "REPORTS"
  | "TOOLS"
  | "ACCESS_LOGS"
  | "SETTINGS";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  description: string;
  // URL prefix(ler)i — middleware path eşleştirmesi için. Her prefix'in başında "/" olur.
  // Bir path birden fazla modül prefix'i eşleştirebilirse en uzun prefix kazanır (en spesifik).
  paths: string[];
  // Kapatılamaz mı? (Dashboard her kullanıcı için gerekli — açılış sayfası.)
  required?: boolean;
}

export const MODULES: ModuleDef[] = [
  {
    key: "DASHBOARD",
    label: "Panel (Dashboard)",
    description: "Anasayfa özetleri. Kapatılamaz — açılış sayfasıdır.",
    paths: ["/dashboard"],
    required: true,
  },
  {
    key: "CUSTOMERS",
    label: "Müşteriler",
    description: "Müşteri listesi, detay, talep profili, KVKK rıza yönetimi",
    paths: ["/customers"],
  },
  {
    key: "PROPERTIES",
    label: "Portföy",
    description: "İlan listesi, detay, yeni ilan, toplu yapıştırma",
    paths: ["/properties"],
  },
  {
    key: "PROJECTS",
    label: "Projeler",
    description: "Toplu konut projeleri, bloklar, daire ilişkileri",
    paths: ["/projects"],
  },
  {
    key: "MESSAGES",
    label: "İletişim Merkezi",
    description: "WhatsApp/SMS/E-posta (Faz 2). Şu anda placeholder.",
    paths: ["/messages"],
  },
  {
    key: "CONTRACTS",
    label: "Sözleşmeler",
    description: "Kira / Satış / Komisyon sözleşmeleri, ekler, durum yönetimi",
    paths: ["/contracts"],
  },
  {
    key: "FINANCE",
    label: "Finans",
    description: "Sözleşme bazlı ciro, tahsilat, komisyon dağılımı",
    paths: ["/finance"],
  },
  {
    key: "CALENDAR",
    label: "Takvim & Randevular",
    description: "Gösterim/toplantı randevuları, aylık/haftalık görünüm",
    paths: ["/calendar", "/appointments"],
  },
  {
    key: "TASKS",
    label: "Görevler",
    description: "Kanban tarzı görev yönetimi, atama, son tarih",
    paths: ["/tasks"],
  },
  {
    key: "REMINDERS",
    label: "Hatırlatmalar",
    description: "Müşteri/ilan/sözleşme için zamanlı hatırlatmalar",
    paths: ["/reminders"],
  },
  {
    key: "AUTOMATION",
    label: "Otomasyon",
    description: "Tetikleyici-koşul-aksiyon kuralları (Faz 2).",
    paths: ["/automation"],
  },
  {
    key: "REPORTS",
    label: "Raporlar",
    description: "Aylık trend, danışman performansı, ciro, şube karşılaştırma",
    paths: ["/reports"],
  },
  {
    key: "TOOLS",
    label: "Hesaplama Araçları",
    description: "Komisyon hesaplayıcı + Vatandaşlık hesaplayıcı",
    paths: ["/tools"],
  },
  {
    key: "ACCESS_LOGS",
    label: "Erişim Logları (KVKK)",
    description: "AGENT'ların hassas veriye erişim oturumları. Sadece ADMIN/MANAGER görür.",
    paths: ["/access-logs"],
  },
  {
    key: "SETTINGS",
    label: "Ayarlar",
    description: "Kullanıcılar, şubeler, projeler, kataloglar, komisyon politikası, denetim",
    paths: ["/settings"],
  },
];

const MODULE_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.key, m])
);

// Bir path için hangi modül? Birden fazla prefix eşleşirse en uzun olanı seç.
export function moduleForPath(pathname: string): ModuleDef | null {
  let best: { mod: ModuleDef; len: number } | null = null;
  for (const mod of MODULES) {
    for (const p of mod.paths) {
      if (pathname === p || pathname.startsWith(p + "/")) {
        if (!best || p.length > best.len) {
          best = { mod, len: p.length };
        }
      }
    }
  }
  return best?.mod ?? null;
}

export function getModuleByKey(key: string): ModuleDef | null {
  return MODULE_BY_KEY[key] ?? null;
}
