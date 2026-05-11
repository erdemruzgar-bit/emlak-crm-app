---
title: "ART CRM — Teslim Sonrası Geliştirme Listesi (Faz 2+)"
---

# ART CRM — Teslim Sonrası Yol Haritası

Bu belge, **Faz 1 teslim sonrası** müşteriye sunulacak ücretli ek geliştirme alanlarını listeler. Her madde için tahmini efor (S/M/L/XL) ve müşteri için iş değeri özetlenmiştir. Sıralama bir öncelik göstermez — müşteri ihtiyaç ve bütçesine göre paket olarak veya tekil seçilir.

> **Faz 1 (Teslim Edilen):** Müşteri yönetimi, portföy, projeler & bloklar, müşteri↔proje ilişkisi, toplu mülk üretme (aralık + liste), sözleşmeler, randevu, görev, hatırlatma, raporlama, KVKK hassas veri erişim denetimi, RBAC, audit log, komisyon, tüm sayfalar için yardım kılavuzu.

---

## A. İletişim Merkezi (Messages modülü)

Şu an placeholder olarak duran modülün tam entegrasyonu.

- **WhatsApp Business API entegrasyonu** — Çift yönlü konuşma, şablonlu toplu kampanya, müşteri kartında konuşma geçmişi. **Efor:** XL.
- **SMS sağlayıcı entegrasyonu** — İletimerkezi / Netgsm / Twilio API. **Efor:** M.
- **E-posta gönderim altyapısı** — SMTP veya transactional servis (Postmark/SES); şablon yöneticisi. **Efor:** M.
- **Müşteri kartına entegrasyon** — Tek bir tab altında tüm iletişim kanalları (telefon notu + WhatsApp + SMS + e-posta) zaman çizelgesi. **Efor:** M.

**İş değeri:** Tek noktadan müşteri iletişimi → tepki süresi azalır, kayıt tutmak otomatikleşir.

---

## B. Otomasyon Kuralları Motoru

Şu an arkada sabit kurallar var. Kullanıcı düzenleyebilir kural editörü:

- **Tetikleyici → Koşul → Aksiyon** UI (no-code) — Örn. "Müşteri 30 gündür temasta değilse danışmanına hatırlatma oluştur".
- **Kurallar:** segmentasyon, e-posta/SMS/WhatsApp tetikleme, görev oluşturma, statü değişikliği.
- **Test / önizleme** modu — kural canlıya alınmadan önce dry-run.

**Efor:** XL. **İş değeri:** Manuel takip yükünü azaltır.

---

## C. Finans Modülü Geliştirmesi

Şu an temel ciro/komisyon var. Detaylı finans:

- **Ödeme planı** — kira sözleşmesinde aylık taksit takvimi otomatik üretilir, vadesi gelen tahsilat dashboard'da uyarır.
- **Tahsilat takip** — ödeme alındı/alınmadı, kısmi tahsilat, gecikme hesabı.
- **Gider takibi** — şirket gideri kategorize (kira, maaş, reklam, vergi).
- **Banka entegrasyonu / IBAN tarama** — opsiyonel API entegrasyonu (BTransfer veya açık bankacılık).
- **Aylık nakit akışı raporu** — gelir vs gider grafik.

**Efor:** L. **İş değeri:** Şirketin finansal durumunu CRM içinden görmek, ek muhasebe yazılımı bağımlılığını azaltmak.

---

## D. Mobil Uygulama (PWA / React Native)

- **PWA** (mevcut web'i mobile uyumlu hale getirme + offline cache + push notification) — **Efor:** M. Düşük maliyetli.
- **Native iOS/Android (React Native)** — App Store / Play Store mağazalarında yer almak için. **Efor:** XL.

**İş değeri:** Danışmanların sahada gösterimde hızlı erişim, push bildirimle hatırlatma.

---

## E. KPS / TC Doğrulama Entegrasyonu

- **NVI Kimlik Doğrulama Servisi (KPS)** — TC + Ad/Soyad/Doğum tarihi ile gerçek kişi doğrulaması. **Efor:** S (sertifika ve sözleşme).
- **MERSIS** entegrasyonu — tüzel kişi (şirket sahibi) doğrulaması.

**İş değeri:** Sahte/yanlış kimlik girilmesini engeller, sözleşme öncesi resmi doğrulama.

---

## F. E-İmza ve Doküman Entegrasyonu

- **e-imza** (KamuSM veya özel CA üzerinden) — Sözleşme/teklif belgelerini PDF olarak imzalama. **Efor:** L.
- **Şablonlu sözleşme üretimi** — Word/PDF template'leri, müşteri/ilan bilgileri otomatik doldurulur. **Efor:** M.
- **DocuSign / Yousign** entegrasyonu — uluslararası standart e-imza. **Efor:** M.

**İş değeri:** Kağıtsız ofis, sözleşme süresi günden saatlere iner.

---

## G. İlan Pazaryeri Entegrasyonu

- **Sahibinden / Hepsiemlak / Emlakjet** ile API senkronu — CRM'deki ilan otomatik pazaryerinde yayınlanır, görüntülenme + müşteri talepleri CRM'e geri yansır. **Efor:** XL (her platform için ayrı).
- **Tek tıkla yayınla / kaldır** kontrolü.
- **Performans karşılaştırma** raporu (hangi platform daha çok lead getirdi).

**İş değeri:** Manuel ilan girme/silme yükünü ortadan kaldırır, lead'i tek yerden yönetir.

---

## H. Gelişmiş Eşleştirme (Smart Matching)

Şu an skorlu kural-tabanlı. Geliştirme:

- **Makine öğrenmesi tabanlı öneri** — müşterinin geçmiş ilgilendiği ilanlarla benzerlik. **Efor:** XL.
- **Negatif eşleştirme** — "asla bu kriterde gösterme" notu.
- **Çok seçenekli portföy önerisi** — müşteriye hazır 5-10 mülklük seçili paket çıkar (PDF/web).

**Efor:** L (ML olmadan kural tabanlı genişletme), XL (ML ile). **İş değeri:** Daha hızlı doğru eşleşme.

---

## I. Public API & Webhook Sistemi

- **REST API** dış sistemler için (örn. muhasebe yazılımı, web site, çağrı merkezi).
- **Webhook** olayları — `customer.created`, `contract.signed`, `appointment.completed`.
- **API anahtarı + rate limit yönetimi** Ayarlar altında.

**Efor:** L. **İş değeri:** Üçüncü taraf entegrasyonları için altyapı.

---

## J. Çoklu Dil Desteği

- Şu an: Türkçe.
- Ekleme: İngilizce + Arapça (yabancı yatırımcı portföyü için).
- **Efor:** M.

---

## K. Ek Raporlar ve Dashboard Geliştirmeleri

- Danışman bazlı performans grafikleri (target vs actual).
- Müşteri yaşam döngüsü raporu (sourceing → kapanma süresi).
- Mahalle/bölge bazlı talep ısı haritası.
- Excel export'a görsel rapor (PDF) eklemesi.
- **Efor:** M-L.

---

## L. Toplu Yapıştırmada Tip Karışımı

Şu an tek toplu yüklemede tek mülk tipi var. İleri seçenek: satır bazlı tip sütunu ekleyerek aynı yüklemede karışık tip (daire + dükkan).

- **Efor:** M. **İş değeri:** Karma projelerde tek seferde kayıt.

---

## M. Performans ve Ölçek

- **Read replica DB** + connection pooling — 10K+ müşteri/ilan üzeri.
- **Tam metin arama** (Postgres tsvector veya Meilisearch) — şu anki LIKE filtresi yerine.
- **Redis cache** — sık okunan tablolar (ayarlar, katalog).
- **Yedek + felaket kurtarma** — şu anki günlük tar.gz yedeklere ek olarak point-in-time recovery.
- **Efor:** L.

---

## N. Güvenlik ve Compliance

- **İki faktörlü kimlik doğrulama (2FA)** — TOTP veya SMS.
- **Cihaz/Oturum yönetimi** — aktif oturumlar, uzak çıkış.
- **SSO** — şirket Google Workspace / Microsoft 365 ile tek-tıkla giriş.
- **Penetrasyon testi** ve düzenli güvenlik denetimi.
- **Efor:** L.

---

## O. Mikro İyileştirme Paketi

- Hızlı arama (Ctrl+K) komut paletini zenginleştirme (eylem önerileri).
- Klavye kısayolu yönetim sayfası.
- Bildirim merkezi sayfası (geçmiş bildirimler).
- Müşteri/ilan dışa aktarma seçeneklerini zenginleştirme (PDF kartvizit, ilan broşürü).
- Toplu işlem (bulk select + tek seferde durum değişikliği).
- **Efor:** M (paket olarak).

---

## Önerilen Paketler

| Paket | Kapsam | Yaklaşık efor |
|-------|--------|---------------|
| **Faz 2 Temel** | A (WhatsApp/SMS/E-posta) + K (raporlar) | 4-6 hafta |
| **Faz 2 İleri** | A + B (otomasyon) + C (finans) | 8-10 hafta |
| **Şirket-Hazır** | D (PWA) + E (KPS) + F (e-imza) + N (2FA/SSO) | 10-12 hafta |
| **Pazar Lideri** | G (pazaryeri) + H (smart matching) + I (API) | 12-16 hafta |

---

## Yedek & Sürüm

Her yeni sürümde:
- Otomatik yedek: `/home/crmadmin/backups/<TAG>/`
- Google Drive yedek
- Geri al: `~/emlak-crm-app/scripts/rollback.sh <TAG>`

---

**İletişim:** destek@artinvertsment.com
