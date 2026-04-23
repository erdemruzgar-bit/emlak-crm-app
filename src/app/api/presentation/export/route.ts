/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor, isAdmin } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

// Kurumsal renkler
const C = {
  primary: "0051D5",
  primaryLight: "E8F0FE",
  tertiary: "924700",
  tertiaryLight: "FFDCC2",
  success: "16A34A",
  successLight: "DCFCE7",
  error: "DC2626",
  text: "191C1E",
  textSoft: "505F76",
  bg: "F7F9FB",
  white: "FFFFFF",
  gray: "E0E3E5",
};

// Slayt master'ı — alt bar + branding
function setupMaster(pres: pptxgen) {
  pres.defineSlideMaster({
    title: "BASE",
    background: { color: C.white },
    objects: [
      { rect: { x: 0, y: 7.15, w: 13.33, h: 0.35, fill: { color: C.primary } } },
      { text: {
        text: "ART CRM · Profesyonel Gayrimenkul Yönetimi",
        options: { x: 0.4, y: 7.2, w: 6, h: 0.25, fontSize: 9, color: C.white, fontFace: "Calibri", bold: true },
      }},
    ],
  });
}

function addHeader(slide: any, title: string, subtitle?: string) {
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: C.primary } });
  slide.addText(title, { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 32, bold: true, color: C.primary, fontFace: "Calibri" });
  if (subtitle) slide.addText(subtitle, { x: 0.5, y: 1.0, w: 12, h: 0.4, fontSize: 14, color: C.textSoft, fontFace: "Calibri" });
}

function addStatCard(slide: any, x: number, y: number, value: string, label: string, color = C.primary) {
  slide.addShape("roundRect", { x, y, w: 2.5, h: 1.3, fill: { color: C.bg }, line: { color: C.gray, width: 1 }, rectRadius: 0.1 });
  slide.addText(value, { x, y: y + 0.2, w: 2.5, h: 0.6, fontSize: 32, bold: true, color, fontFace: "Calibri", align: "center" });
  slide.addText(label, { x, y: y + 0.8, w: 2.5, h: 0.35, fontSize: 11, color: C.textSoft, fontFace: "Calibri", align: "center", bold: true });
}

function addFeatureCard(slide: any, x: number, y: number, w: number, h: number, icon: string, title: string, desc: string, color = C.primary) {
  slide.addShape("roundRect", { x, y, w, h, fill: { color: C.white }, line: { color: C.gray, width: 1 }, rectRadius: 0.15 });
  slide.addShape("ellipse", { x: x + 0.25, y: y + 0.25, w: 0.7, h: 0.7, fill: { color }, line: { type: "none" } });
  slide.addText(icon, { x: x + 0.25, y: y + 0.25, w: 0.7, h: 0.7, fontSize: 26, color: C.white, fontFace: "Calibri", align: "center", valign: "middle", bold: true });
  slide.addText(title, { x: x + 1.1, y: y + 0.3, w: w - 1.3, h: 0.4, fontSize: 15, bold: true, color: C.text, fontFace: "Calibri" });
  slide.addText(desc, { x: x + 1.1, y: y + 0.75, w: w - 1.3, h: h - 0.9, fontSize: 11, color: C.textSoft, fontFace: "Calibri", valign: "top" });
}

// Canlı istatistikleri topla
async function collectLiveStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCustomers,
    totalProperties,
    activeProperties,
    soldThisMonth,
    rentedThisMonth,
    totalAppointments,
    upcomingAppointments,
    totalUsers,
    totalBranches,
    totalConsents,
    anonymizedCustomers,
    matches,
  ] = await Promise.all([
    prisma.customer.count({ where: { isAnonymized: false } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.property.count({ where: { status: "SOLD", updatedAt: { gte: monthStart } } }),
    prisma.property.count({ where: { status: "RENTED", updatedAt: { gte: monthStart } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { startDate: { gte: now }, status: "PLANNED" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.branch.count(),
    prisma.customerConsent.count({ where: { isGranted: true } }),
    prisma.customer.count({ where: { isAnonymized: true } }),
    prisma.propertyMatch.count(),
  ]);

  return {
    generatedAt: now,
    totalCustomers,
    totalProperties,
    activeProperties,
    soldThisMonth,
    rentedThisMonth,
    totalAppointments,
    upcomingAppointments,
    totalUsers,
    totalBranches,
    totalConsents,
    anonymizedCustomers,
    matches,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "Sunumu sadece sistem yöneticisi oluşturabilir" }, { status: 403 });
  }

  try {
  const stats = await collectLiveStats();

  const pres = new pptxgen();
  pres.title = "ART CRM — Ürün Sunumu";
  pres.author = "ART CRM";
  pres.company = "ART CRM";
  pres.subject = "Profesyonel Emlak Ofisi Yönetim Sistemi";
  pres.layout = "LAYOUT_WIDE";
  setupMaster(pres);

  // ---- SLIDE 1: KAPAK ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    s.addShape("rect", { x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.primary } });
    s.addShape("rect", { x: 7, y: 0, w: 6.33, h: 7.5, fill: { color: C.white } });

    s.addText("EMLAK CRM", { x: 0.7, y: 2.2, w: 6, h: 0.8, fontSize: 48, bold: true, color: C.white, fontFace: "Calibri", charSpacing: -2 });
    s.addText("Profesyonel Gayrimenkul\nOfis Yönetim Sistemi", { x: 0.7, y: 3.1, w: 6, h: 1.4, fontSize: 24, color: C.white, fontFace: "Calibri", charSpacing: -1 });

    s.addShape("roundRect", { x: 0.7, y: 5.0, w: 1.6, h: 0.5, fill: { color: "FFFFFF", transparency: 80 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText("✓ KVKK Uyumlu", { x: 0.7, y: 5.05, w: 1.6, h: 0.4, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

    s.addShape("roundRect", { x: 2.4, y: 5.0, w: 1.5, h: 0.5, fill: { color: "FFFFFF", transparency: 80 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText("✓ Bulut Tabanlı", { x: 2.4, y: 5.05, w: 1.5, h: 0.4, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

    s.addShape("roundRect", { x: 4.0, y: 5.0, w: 1.3, h: 0.5, fill: { color: "FFFFFF", transparency: 80 }, line: { type: "none" }, rectRadius: 0.1 });
    s.addText("✓ Mobil Uyumlu", { x: 4.0, y: 5.05, w: 1.3, h: 0.4, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

    s.addShape("roundRect", { x: 8.5, y: 2.5, w: 3, h: 3, fill: { color: C.primaryLight }, line: { type: "none" }, rectRadius: 0.4 });
    s.addText("🏢", { x: 8.5, y: 2.5, w: 3, h: 3, fontSize: 120, align: "center", valign: "middle" });

    const dateStr = stats.generatedAt.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
    s.addText(`Hazırlanma tarihi: ${dateStr}`, { x: 7.5, y: 6.5, w: 5.5, h: 0.3, fontSize: 14, color: C.primary, align: "right", fontFace: "Calibri", italic: true });
  }

  // ---- SLIDE 2: CANLI İSTATİSTİKLER (YENİ — gerçek veri) ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Sisteminizin Güncel Durumu", `${stats.generatedAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} itibarıyla`);

    // Üst sıra — ana metrikler
    addStatCard(s, 0.5, 1.9, String(stats.totalCustomers), "Müşteri", C.primary);
    addStatCard(s, 3.3, 1.9, String(stats.totalProperties), "İlan", C.tertiary);
    addStatCard(s, 6.1, 1.9, String(stats.activeProperties), "Aktif İlan", C.success);
    addStatCard(s, 8.9, 1.9, String(stats.matches), "Eşleşme", "9333EA");

    // Orta sıra — ekip/şube
    addStatCard(s, 0.5, 3.4, String(stats.totalUsers), "Aktif Kullanıcı", C.primary);
    addStatCard(s, 3.3, 3.4, String(stats.totalBranches), "Şube", C.tertiary);
    addStatCard(s, 6.1, 3.4, String(stats.upcomingAppointments), "Planlı Randevu", C.success);
    addStatCard(s, 8.9, 3.4, String(stats.totalAppointments), "Toplam Randevu", "9333EA");

    // Bu ay özeti
    s.addShape("roundRect", { x: 0.5, y: 5.0, w: 12.3, h: 1.8, fill: { color: C.primaryLight }, line: { type: "none" }, rectRadius: 0.2 });
    s.addText("BU AY", { x: 0.8, y: 5.15, w: 12, h: 0.4, fontSize: 14, bold: true, color: C.primary, fontFace: "Calibri", charSpacing: 2 });

    s.addText(`${stats.soldThisMonth}`, { x: 0.8, y: 5.55, w: 2, h: 0.8, fontSize: 48, bold: true, color: C.primary, fontFace: "Calibri" });
    s.addText("Satış kapanışı", { x: 0.8, y: 6.4, w: 2, h: 0.3, fontSize: 11, color: C.textSoft, fontFace: "Calibri", bold: true });

    s.addText(`${stats.rentedThisMonth}`, { x: 3.5, y: 5.55, w: 2, h: 0.8, fontSize: 48, bold: true, color: C.tertiary, fontFace: "Calibri" });
    s.addText("Kira kapanışı", { x: 3.5, y: 6.4, w: 2, h: 0.3, fontSize: 11, color: C.textSoft, fontFace: "Calibri", bold: true });

    s.addText(`${stats.totalConsents}`, { x: 6.2, y: 5.55, w: 3, h: 0.8, fontSize: 48, bold: true, color: C.success, fontFace: "Calibri" });
    s.addText("Toplam KVKK Rızası", { x: 6.2, y: 6.4, w: 3, h: 0.3, fontSize: 11, color: C.textSoft, fontFace: "Calibri", bold: true });

    s.addText(`${stats.anonymizedCustomers}`, { x: 9.5, y: 5.55, w: 3, h: 0.8, fontSize: 48, bold: true, color: C.error, fontFace: "Calibri" });
    s.addText("Anonimleştirilmiş (Unutulma H.)", { x: 9.5, y: 6.4, w: 3.3, h: 0.3, fontSize: 11, color: C.textSoft, fontFace: "Calibri", bold: true });
  }

  // ---- SLIDE 3: NEDEN CRM? ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Neden ART CRM?", "Emlak sektöründe kayıp müşteri ve unutulmuş portföy en büyük gelir kaybıdır");

    const problems = [
      { icon: "❌", title: "Aynı müşteri, 3 danışman", desc: "Ekip içinde takip dağınık. Müşteri 3 kez farklı kişi tarafından aranıyor." },
      { icon: "❌", title: "Satılmış ilan hâlâ listede", desc: "Durum güncellemesi geç kalıyor. Müşteriye olmayan ilan gösteriliyor." },
      { icon: "❌", title: "Uygun ilan önerilemiyor", desc: "Yeni alıcı geldiğinde manuel arama. Fırsat kaçıyor." },
      { icon: "❌", title: "KVKK belirsizliği", desc: "Denetimde veri nerede, kim gördü, rıza alındı mı — cevap yok." },
    ];

    problems.forEach((p, i) => {
      const x = 0.5 + (i % 2) * 6.4;
      const y = 1.8 + Math.floor(i / 2) * 2.3;
      s.addShape("roundRect", { x, y, w: 6, h: 2.0, fill: { color: "FEF2F2" }, line: { color: "FCA5A5", width: 1 }, rectRadius: 0.15 });
      s.addText(p.icon, { x: x + 0.2, y: y + 0.3, w: 0.8, h: 0.8, fontSize: 36, align: "center" });
      s.addText(p.title, { x: x + 1.1, y: y + 0.3, w: 4.7, h: 0.5, fontSize: 16, bold: true, color: C.text, fontFace: "Calibri" });
      s.addText(p.desc, { x: x + 1.1, y: y + 0.85, w: 4.7, h: 1.0, fontSize: 12, color: C.textSoft, fontFace: "Calibri", valign: "top" });
    });

    s.addText("→ ART CRM bu 4 sorunun hepsini tek ekrandan çözer.", {
      x: 0.5, y: 6.5, w: 12, h: 0.4,
      fontSize: 16, bold: true, color: C.primary, fontFace: "Calibri", align: "center", italic: true,
    });
  }

  // ---- SLIDE 4: ÇÖZÜM ÖZETİ ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Tek Platform, Tüm İhtiyaçlar", "Bir emlak ofisinin günlük iş akışı: müşteri, portföy, randevu, görev, finans, raporlama");

    const modules = [
      { icon: "👥", title: "Müşteri Yönetimi", desc: "Zengin talep profili, 7 sekmeli detay, hızlı iletişim kaydı" },
      { icon: "🏠", title: "Portföy Yönetimi", desc: "Fotoğraf/video galeri, durum takibi, sahip-kiracı ilişkisi" },
      { icon: "⚡", title: "Otomatik Eşleştirme", desc: "Bütçe, şehir, tip kriterleriyle skorlu öneri" },
      { icon: "📅", title: "Takvim & Randevu", desc: "Gösterim planı, durum akışı, ajanda" },
      { icon: "✓", title: "Görev Yönetimi", desc: "Atama, öncelik, Kanban benzeri takip" },
      { icon: "📊", title: "Raporlama", desc: "Aylık trendler, danışman performansı, şube karşılaştırma" },
      { icon: "🔐", title: "KVKK Uyumluluğu", desc: "Rıza, şifreleme, denetim kayıtları, unutulma hakkı" },
      { icon: "👤", title: "Kullanıcı Yönetimi", desc: "3 seviyeli rol (Yönetici/Müdür/Danışman), fotoğraflı profil" },
    ];

    modules.forEach((m, i) => {
      const x = 0.5 + (i % 4) * 3.15;
      const y = 1.9 + Math.floor(i / 4) * 2.5;
      addFeatureCard(s, x, y, 3, 2.3, m.icon, m.title, m.desc);
    });
  }

  // ---- SLIDE 5: MÜŞTERİ YÖNETİMİ ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Müşteri Yönetimi", "Yeni gelen alıcıdan, anahtar tesliminden sonraya kadar kayıp kalmadan takip");

    s.addShape("roundRect", { x: 0.5, y: 1.8, w: 5.5, h: 5.0, fill: { color: C.primaryLight }, line: { type: "none" }, rectRadius: 0.2 });
    s.addText("7 SEKMELİ MÜŞTERİ DETAY", { x: 0.8, y: 2.0, w: 5, h: 0.4, fontSize: 12, bold: true, color: C.primary, fontFace: "Calibri", charSpacing: 2 });
    const tabs = [
      "📋 Bilgiler — ad, telefon, e-posta, TC (şifreli)",
      "🎯 Talep Profili — bütçe, tercihler, aşama, aciliyet",
      "📝 Notlar — serbest metin, imzalı",
      "💬 İletişim — arama, e-posta, WhatsApp kaydı",
      "📅 Randevular — müşteriye ait tüm gösterim/toplantı",
      "🏠 İlgili İlanlar — otomatik öneri + manuel bağlama",
      "🔐 KVKK Rızaları — açık rıza, aydınlatma, pazarlama",
    ];
    tabs.forEach((t, i) => {
      s.addText(t, { x: 0.8, y: 2.5 + i * 0.55, w: 5, h: 0.4, fontSize: 13, color: C.text, fontFace: "Calibri" });
    });

    s.addText("ÖZELLİK ÖZETİ", { x: 6.5, y: 2.0, w: 6.5, h: 0.4, fontSize: 12, bold: true, color: C.primary, fontFace: "Calibri", charSpacing: 2 });

    addStatCard(s, 6.5, 2.5, "2", "Görünüm (Liste + Kart)", C.primary);
    addStatCard(s, 9.3, 2.5, "4", "Hızlı İletişim Tuşu", C.tertiary);
    addStatCard(s, 6.5, 4.0, "∞", "Etiket ve Segment", C.success);
    addStatCard(s, 9.3, 4.0, "AES-256", "TC Şifreleme", C.error);

    s.addShape("rect", { x: 6.5, y: 5.6, w: 6.3, h: 1.2, fill: { color: C.primary }, line: { type: "none" } });
    s.addText("Liste ekranında her satırda tek tıkla", { x: 6.7, y: 5.7, w: 6, h: 0.4, fontSize: 13, color: C.white, bold: true, fontFace: "Calibri" });
    s.addText("Telefon · WhatsApp · E-posta iletişim kaydı", { x: 6.7, y: 6.1, w: 6, h: 0.4, fontSize: 12, color: C.white, fontFace: "Calibri" });
    s.addText("Danışman ayrı form doldurmaz — iz otomatik kalır", { x: 6.7, y: 6.45, w: 6, h: 0.3, fontSize: 10, color: C.primaryLight, fontFace: "Calibri", italic: true });
  }

  // ---- SLIDE 6: PORTFÖY YÖNETİMİ ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Portföy Yönetimi", "Fotoğraf, video, durum, sahip ilişkisi — tüm ilan bilgisi tek noktada");

    s.addShape("roundRect", { x: 0.5, y: 1.9, w: 6, h: 5.1, fill: { color: C.primaryLight }, line: { type: "none" }, rectRadius: 0.2 });
    s.addText("3", { x: 0.5, y: 2.1, w: 1.5, h: 1.5, fontSize: 96, bold: true, color: C.primary, align: "center", fontFace: "Calibri" });
    s.addText("FARKLI GÖRÜNÜM", { x: 2.0, y: 2.6, w: 4.5, h: 0.4, fontSize: 16, bold: true, color: C.primary, fontFace: "Calibri", charSpacing: 2 });
    s.addText("Grid, kompakt grid ve liste — her duruma uygun.", { x: 2.0, y: 3.0, w: 4.5, h: 0.6, fontSize: 12, color: C.textSoft, fontFace: "Calibri" });

    s.addShape("line", { x: 0.8, y: 4.0, w: 5.4, h: 0, line: { color: C.primary, width: 1 } });

    s.addText("4 DURUM", { x: 0.8, y: 4.2, w: 5, h: 0.4, fontSize: 14, bold: true, color: C.primary, fontFace: "Calibri", charSpacing: 2 });
    const statuses = [
      { label: "Aktif", color: "16A34A", desc: "Satışa/kiraya açık" },
      { label: "Satıldı", color: C.primary, desc: "İşlem tamamlandı" },
      { label: "Kiralandı", color: C.tertiary, desc: "Kira yapıldı" },
      { label: "Pasif", color: "6B7280", desc: "Görünürlükten çıktı" },
    ];
    statuses.forEach((st, i) => {
      const y = 4.7 + i * 0.4;
      s.addShape("roundRect", { x: 0.8, y, w: 1.3, h: 0.3, fill: { color: st.color }, line: { type: "none" }, rectRadius: 0.05 });
      s.addText(st.label, { x: 0.8, y, w: 1.3, h: 0.3, fontSize: 10, bold: true, color: C.white, align: "center", fontFace: "Calibri", valign: "middle" });
      s.addText(st.desc, { x: 2.3, y, w: 4, h: 0.3, fontSize: 11, color: C.textSoft, fontFace: "Calibri", valign: "middle" });
    });

    const features = [
      { icon: "📸", t: "Medya Galerisi", d: "JPG/PNG/WEBP + MP4/MOV · 100 MB'a kadar sürükle-bırak" },
      { icon: "🔍", t: "Gelişmiş Filtre", d: "Başlık, şehir, ilçe, fiyat aralığı, m², oda, durum" },
      { icon: "👤", t: "İlan Sahibi Bağı", d: "Müşteri kaydına tek tıkla bağlanır — tel ve e-posta yerinde" },
      { icon: "⚡", t: "Tek Tıkla İletişim", d: "Sahibini ara · E-posta gönder · Paylaş (link kopyala)" },
    ];
    features.forEach((f, i) => {
      const y = 1.95 + i * 1.3;
      addFeatureCard(s, 6.8, y, 6.1, 1.15, f.icon, f.t, f.d);
    });
  }

  // ---- SLIDE 7: OTOMATİK EŞLEŞTİRME ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Otomatik Eşleştirme Motoru", "Her yeni müşteri veya ilan eklendiğinde sistem uygun eşleşmeyi skorla hesaplar");

    s.addShape("roundRect", { x: 0.5, y: 1.9, w: 6.3, h: 4.8, fill: { color: C.bg }, line: { color: C.gray, width: 1 }, rectRadius: 0.15 });
    s.addText("SKORLAMA KURALLARI", { x: 0.8, y: 2.1, w: 6, h: 0.4, fontSize: 14, bold: true, color: C.primary, charSpacing: 2, fontFace: "Calibri" });

    const rules = [
      { criterion: "Bütçe uyumu (±%10)", point: "+40", hard: true },
      { criterion: "Mülk tipi uyumu", point: "+30", hard: false },
      { criterion: "Şehir uyumu", point: "+20", hard: true },
      { criterion: "İlçe uyumu (bonus)", point: "+5", hard: false },
      { criterion: "m² uyumu", point: "+10", hard: false },
    ];
    rules.forEach((r, i) => {
      const y = 2.7 + i * 0.55;
      s.addText(r.criterion, { x: 0.8, y, w: 4.2, h: 0.4, fontSize: 13, color: C.text, fontFace: "Calibri", valign: "middle" });
      s.addShape("roundRect", { x: 5.1, y: y + 0.05, w: 0.9, h: 0.3, fill: { color: r.hard ? C.error : C.success }, line: { type: "none" }, rectRadius: 0.05 });
      s.addText(r.point, { x: 5.1, y: y + 0.05, w: 0.9, h: 0.3, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri", valign: "middle" });
      if (r.hard) s.addText("kritik", { x: 6.0, y, w: 0.8, h: 0.4, fontSize: 9, color: C.error, italic: true, fontFace: "Calibri", valign: "middle" });
    });
    s.addText("Minimum eşleşme skoru: %30", { x: 0.8, y: 5.7, w: 6, h: 0.3, fontSize: 11, color: C.textSoft, italic: true, fontFace: "Calibri" });
    s.addText(`Sisteminizde şu an aktif eşleşme sayısı: ${stats.matches}`, { x: 0.8, y: 6.0, w: 6, h: 0.3, fontSize: 10, color: C.primary, bold: true, fontFace: "Calibri" });

    s.addText("İŞLEYİŞ", { x: 7.2, y: 2.1, w: 5.5, h: 0.4, fontSize: 14, bold: true, color: C.primary, charSpacing: 2, fontFace: "Calibri" });

    const steps = [
      { n: "1", t: "⚡ Öneri (Otomatik)", d: "Sistem skorla önermiş. Danışman değerlendirir." },
      { n: "2", t: "✓ İlgileniyor", d: "Danışman onaylar. Üste taşınır, takibe girer." },
      { n: "3", t: "✗ Reddet", d: "Bir daha önerilmez. Liste temiz kalır." },
      { n: "+", t: "Manuel Ekleme", d: "Sistem önermese bile tek tıkla bağlama." },
    ];
    steps.forEach((st, i) => {
      const y = 2.7 + i * 0.95;
      s.addShape("ellipse", { x: 7.2, y, w: 0.5, h: 0.5, fill: { color: C.primary }, line: { type: "none" } });
      s.addText(st.n, { x: 7.2, y, w: 0.5, h: 0.5, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri" });
      s.addText(st.t, { x: 7.85, y: y - 0.05, w: 5, h: 0.4, fontSize: 13, bold: true, color: C.text, fontFace: "Calibri" });
      s.addText(st.d, { x: 7.85, y: y + 0.3, w: 5, h: 0.5, fontSize: 10, color: C.textSoft, fontFace: "Calibri" });
    });
  }

  // ---- SLIDE 8: KVKK ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "KVKK Uyumluluğu", "Emlak sektörü kişisel veri yoğundur — denetimde ilk bakılan yer CRM'dir");

    const kvkkFeatures = [
      { icon: "✍️", t: "Üç Ayrı Rıza Kaydı", d: "Her müşteri için Açık Rıza, Aydınlatma Metni, Pazarlama İzni ayrı ayrı. Tarih, IP, metin versiyonu saklı." },
      { icon: "🔒", t: "AES-256 Şifreleme", d: "TC Kimlik Numarası veritabanında şifreli saklanır. Veritabanı kopyalansa bile okunamaz." },
      { icon: "📋", t: "Denetim Kayıtları (Audit)", d: "Kim ne zaman hangi müşteriyi gördü / değiştirdi / sildi. IP adresiyle birlikte saklanır." },
      { icon: "🗑️", t: "Unutulma Hakkı", d: "Müşteri talep ederse veriler anonimleştirilir. Rapor bütünlüğü korunur." },
      { icon: "🔐", t: "İzinsiz Erişim Uyarıları", d: "Yetkisiz düzenleme denemeleri otomatik DENIED_EDIT olarak audit log'a düşer." },
      { icon: "🌐", t: "Çapraz Şube Şeffaflık", d: "Aydınlatma metninde 'verileriniz tüm şubelerce görülebilir' açık yazar." },
    ];

    kvkkFeatures.forEach((f, i) => {
      const x = 0.5 + (i % 3) * 4.25;
      const y = 1.9 + Math.floor(i / 3) * 2.55;
      addFeatureCard(s, x, y, 4.1, 2.35, f.icon, f.t, f.d, C.primary);
    });
  }

  // ---- SLIDE 9: TEKNOLOJİ ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    addHeader(s, "Teknoloji Altyapısı", "Modern, ölçeklenebilir ve güvenli stack — bugünün standartları");

    const techs = [
      { cat: "Frontend", items: ["Next.js 16", "React 19", "Tailwind CSS"], color: C.primary },
      { cat: "Backend", items: ["Node.js", "Next.js API Routes"], color: C.success },
      { cat: "Veritabanı", items: ["PostgreSQL 16", "Prisma 7 ORM"], color: C.tertiary },
      { cat: "Kimlik Doğrulama", items: ["NextAuth v5 (JWT)", "bcrypt şifre hash"], color: "9333EA" },
      { cat: "Güvenlik", items: ["AES-256 şifreleme", "HTTPS / TLS"], color: C.error },
      { cat: "Deploy", items: ["Docker Compose", "Vercel / self-hosted"], color: "0EA5E9" },
    ];

    techs.forEach((tc, i) => {
      const x = 0.5 + (i % 3) * 4.25;
      const y = 1.9 + Math.floor(i / 3) * 2.55;
      s.addShape("roundRect", { x, y, w: 4.1, h: 2.35, fill: { color: C.white }, line: { color: tc.color, width: 2 }, rectRadius: 0.15 });
      s.addShape("rect", { x, y, w: 4.1, h: 0.5, fill: { color: tc.color }, line: { type: "none" } });
      s.addText(tc.cat, { x: x + 0.2, y: y + 0.05, w: 3.7, h: 0.4, fontSize: 14, bold: true, color: C.white, fontFace: "Calibri" });
      tc.items.forEach((it, j) => {
        s.addText("• " + it, { x: x + 0.3, y: y + 0.7 + j * 0.45, w: 3.7, h: 0.4, fontSize: 13, color: C.text, fontFace: "Calibri" });
      });
    });
  }

  // ---- SLIDE 10: KAPANIŞ ----
  {
    const s = pres.addSlide({ masterName: "BASE" });
    s.background = { color: C.primary };

    s.addShape("ellipse", { x: -2, y: -2, w: 5, h: 5, fill: { color: "FFFFFF", transparency: 90 }, line: { type: "none" } });
    s.addShape("ellipse", { x: 10, y: 5, w: 6, h: 6, fill: { color: "FFFFFF", transparency: 92 }, line: { type: "none" } });

    s.addText("Teşekkürler", { x: 0.5, y: 1.5, w: 12, h: 1.5, fontSize: 72, bold: true, color: C.white, align: "center", fontFace: "Calibri", charSpacing: -2 });
    s.addText("ART CRM — ofisinizin günlük işini yalınlaştıran dijital çözüm", { x: 0.5, y: 3.2, w: 12, h: 0.6, fontSize: 20, color: C.white, align: "center", fontFace: "Calibri" });

    s.addShape("roundRect", { x: 3, y: 4.5, w: 7.33, h: 1.8, fill: { color: "FFFFFF", transparency: 85 }, line: { color: C.white, width: 1 }, rectRadius: 0.2 });
    s.addText("Soru & Demo Talebi", { x: 3, y: 4.65, w: 7.33, h: 0.4, fontSize: 14, bold: true, color: C.white, align: "center", fontFace: "Calibri", charSpacing: 2 });
    s.addText("📧  destek@emlakcrm.com", { x: 3, y: 5.15, w: 7.33, h: 0.4, fontSize: 16, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText("📱  +90 XXX XXX XX XX", { x: 3, y: 5.55, w: 7.33, h: 0.4, fontSize: 16, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText("🌐  www.emlakcrm.com", { x: 3, y: 5.95, w: 7.33, h: 0.4, fontSize: 16, color: C.white, align: "center", fontFace: "Calibri" });
  }

  // Buffer oluştur
  const buffer = await pres.write({ outputType: "nodebuffer" }) as Buffer;

  // Audit log
  await createAuditLog({
    userId: actor.id,
    action: "READ",
    entity: "Presentation",
    newValue: { generatedAt: stats.generatedAt.toISOString(), customers: stats.totalCustomers, properties: stats.totalProperties },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  const dateStr = stats.generatedAt.toISOString().slice(0, 10);
  const filename = `Emlak-CRM-Sunum-${dateStr}.pptx`;
  const encoded = encodeURIComponent(filename);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
    },
  });
  } catch (e) {
    console.error("[presentation/export] Error:", e);
    return NextResponse.json({
      error: "Sunum üretilirken hata oluştu",
      detail: e instanceof Error ? e.message : String(e),
    }, { status: 500 });
  }
}
