---
title: "ART CRM — Ürün Sunumu"
---

# ART CRM

**Profesyonel Emlak Ofisleri için Uçtan Uca Müşteri ve Portföy Yönetimi**

Modern, hızlı, KVKK uyumlu. Bir emlak ofisinin günlük iş akışını tek ekrandan yönetmek için tasarlandı.

![Dashboard](docs/screenshots/02-dashboard.png)

---

## Neden Bu Sistem?

Emlak sektöründe en büyük kayıp, **takipsiz kalmış müşteri** ve **unutulmuş portföy**. Ofis çalışanlarının not defteri, WhatsApp grupları ve Excel dosyalarıyla çalıştığı bir ortamda:

- Aynı müşteri 3 farklı danışman tarafından aranıyor
- Satılmış ilan hâlâ listede görünüyor
- Yeni gelen alıcıya uygun ilan önerisi yapılamıyor
- KVKK denetiminde hangi verinin nerede olduğu bilinmiyor
- Ekipte kim hangi müşteriye ne zaman bakmış belirsiz

ART CRM, bu sorunların hepsini çözer.

---

## Modüller — Faz 1 (Canlı)

| Modül | Özet |
|-------|------|
| **Müşteri Yönetimi** | Zengin talep profili, otomatik ilan eşleştirme, tek tıkla iletişim kaydı, Excel import/export |
| **Portföy Yönetimi** | Fotoğraf/video galerisi, sahip-kiracı ilişkisi, durum takibi, Tapu bilgileri (ada/pafta/parsel), Vatandaşlığa Uygun bayrağı, Excel import/export |
| **Proje / Blok Hiyerarşisi** | Toplu konut projeleri için Proje → Blok → Daire yapısı |
| **Otomatik Eşleştirme** | Bütçe, şehir, tip, m² kriterlerine göre skorlu eşleşme |
| **Takvim & Randevu** | Gösterim, toplantı, tamamlama ve iptal akışları |
| **Görev Yönetimi** | Kendine ve ekibe atama, öncelik, son tarih |
| **Hatırlatmalar** | Müşteri/ilan/sözleşme/randevu için zamanlı hatırlatmalar |
| **Sözleşme Yönetimi** | KIRA / SATIS / KOMISYON sözleşmeleri, ekler, otomatik komisyon hesaplama |
| **Komisyon Politikası & Hesaplayıcı** | Şirket/danışman/ko-broker payı yönetimi + interaktif hesaplayıcı |
| **Finans** | Sözleşme bazlı ciro, tahsilat takibi, aylık özet |
| **Raporlama** | Dashboard, aylık trendler, danışman performansı, kaynak analizi, ciro raporları |
| **Hassas Veri Erişim Denetimi (KVKK)** | Telefon/email/TC maskeleme + gerekçeli açma + sonuç notu zorunluluğu |
| **Kullanıcı Yönetimi** | 3 seviyeli rol, fotoğraflı profil, Excel izinleri, aktif/pasif toggle |
| **Katalog Yönetimi** | Müşteri tipi, ilan tipi, oda tipi, komisyon politikası — UI'dan düzenlenir |

## Faz 2 — Yakında

| Modül | Açıklama |
|-------|----------|
| **İletişim Merkezi (Messages)** | WhatsApp Business API entegrasyonu, toplu kampanya, müşteri sohbet geçmişi |
| **Otomasyon Kuralları** | Sözleşme bitimi, soğuyan müşteri, takip gecikmesi tetikleyicileri |
| **Mobil Uygulama (PWA)** | Sahada gösterimde kullanmak için |

---

## 1. Müşteri Yönetimi

### Listeleme ve Filtreleme
- **Liste görünümü:** Sütunlu tablo — ad, aşama, tip, bütçe, aciliyet, son iletişim, danışman
- **Kart görünümü:** Portföy-benzeri görsel kartlar, fotoğraf destekli
- **Canlı arama:** Ad, soyad, e-posta, telefon
- **Gelişmiş filtreler:** Tip, aşama, aciliyet, kaynak
- **Sıralama:** Ad, aşama, tip, kayıt tarihi
- **Excel:** Filtreli dışa aktarma + toplu içe aktarma (yetki bazlı)

### İstatistik Kutuları
- Toplam müşteri / Aktif lead / Takibi gecikmiş / 30+ gün iletişimsiz

### Müşteri Detayı — 8 Sekme
1. **Bilgiler** — Ad, telefon, e-posta, TC (AES-256 şifreli), adres, fotoğraf
2. **Talep Profili** — Aşama, aciliyet, bütçe, mülk tercihleri, finansman, etiketler
3. **Notlar** — Serbest metin
4. **İletişim** — Telefon/e-posta/WhatsApp/Ziyaret kayıtları
5. **Randevular** — Bu müşteriyle ilgili tüm randevular
6. **İlgili İlanlar** — Otomatik öneriler + manuel ekleme
7. **Sözleşmeler** — Bu müşterinin tüm sözleşmeleri
8. **KVKK Rızaları** — İzin geçmişi
9. **Erişim Geçmişi** — Kim, ne zaman, hangi gerekçeyle bakmış

### Hızlı İletişim Kaydı
Liste ekranında her müşteri satırında Telefon / WhatsApp / E-posta ikonu — tıklar tıklamaz "iletişim geçmişi"ne kayıt düşer.

![Müşteri detayı](docs/screenshots/04-customer-demand.png)

---

## 2. Portföy Yönetimi

### Listeleme
- **Grid, kompakt grid, liste** — 3 farklı görünüm
- **Filtreler:** Satılık/Kiralık (ve özel tipler), mülk tipi, durum, fiyat, oda, m², şehir
- **Sıralama:** Fiyat, tarih, m²
- **Excel:** Müşteride olduğu gibi import/export

### Türkiye'ye Özgü
- **Tapu bilgileri:** Ada, pafta, parsel, bağımsız bölüm no, kat mülkiyeti tipi
- **Vatandaşlığa Uygun:** Yabancıya satışta TR vatandaşlık programı uygunluk bayrağı
- **Proje / Blok / Daire No:** Toplu konut için hiyerarşik yapı

### İlan Detayı
- Galeri (lightbox), hızlı bilgi kartları, detaylı özellikler, harita
- **Fiyat kartı:** Sahibini ara (tel:), e-posta gönder
- **İlgili Müşteriler widget'ı:** Skorlu otomatik öneri + manuel ekleme

![Yeni ilan](docs/screenshots/07-property-new.png)

---

## 3. Sözleşme Yönetimi (Yeni)

### Tipler
- **KIRA** — Kiracı + ev sahibi + ilan + tutar + vade
- **SATIS** — Alıcı + satıcı + ilan + tutar
- **KOMISYON** — Tek başına komisyon kaydı (örn. iş bağlama)

### Akış
1. Tip seç → 2. Müşteri/sahip → 3. İlan (ops.) → 4. Tutar/tarih → 5. Komisyon dağılımı (otomatik) → 6. Notlar/Ekler → 7. Kaydet

### Ekler & Durum
- PDF, fotoğraf, dosya ekleyebilirsiniz (sözleşme örneği, makbuz vs.)
- Durum: Taslak → Aktif → Süresi Doldu / Yenilendi / Feshedildi

### Komisyon Hesaplayıcı
Sol menüde **Komisyon Hesapla** — sözleşme oluşturmadan önce neti görmek için.

![Sözleşme](docs/screenshots/12-contract-new.png)

---

## 4. Komisyon Politikası

**Ayarlar → Komisyon** → şirket %, danışman %, ko-broker oranları yönetilir. Her şubeye/iş tipine farklı politika tanımlanabilir.

Sözleşme oluşturulduğunda otomatik dağıtım: kim ne kadar alacak, KDV dahil/hariç hesaplama.

---

## 5. Otomatik Eşleştirme Motoru

Sistem, müşterinin talep profiliyle ilanları karşılaştırır:

| Kriter | Puan |
|--------|------|
| **Bütçe uyumu** (±%10) | +40 (uyum yoksa elenir) |
| **Mülk tipi** | +30 |
| **Şehir** | +20 (uyum yoksa elenir) |
| **İlçe** | +5 |
| **m²** | +10 |

Minimum skor 30 altındakiler önerilmez. Danışman **✓ İlgileniyor** dediği müşteriyi üste taşır; **✗ Reddet** dediklerini bir daha önermez.

**Manuel ekleme:** Otomatik önerilmese bile, müşteri sayfasından ilan, ilan sayfasından müşteri manuel bağlanabilir.

---

## 6. Takvim & Randevu

- Aylık, haftalık, günlük görünüm
- Tür: Gösterim / Toplantı / Diğer
- Müşteri ve ilan bağlantısı (dropdown arama ile)
- Durum akışı: Planlandı → Tamamlandı / İptal
- Kenar ajanda: bugünün tüm randevuları

---

## 7. Görev Yönetimi

- Atama (kendinize / ekibe), öncelik, son tarih
- 3 sütunlu Kanban: Yapılacak / Devam Ediyor / Tamamlandı
- Atayan / atanan kim açık görünür

---

## 8. Hatırlatmalar (Yeni)

Her hedef tipi için (müşteri, ilan, sözleşme, randevu, görev) zamanlı hatırlatma kurulabilir. Tarih geldiğinde:
- Sağ üstte bildirim ikonunda görünür
- Dashboard'da "Bugün" listesinde
- E-posta bildirimi (opsiyonel, Faz 2)

---

## 9. Finans (Yeni)

Sözleşme verilerini kullanarak otomatik beslenir:
- Tahsil edilen / bekleyen komisyonlar
- Kira tahsilat takvimi
- Aylık ciro özeti
- Sözleşme bazında gelir görünümü

Manuel veri girişi gerektirmez — sözleşme imzaladığınız anda finans tablosuna düşer.

---

## 10. Dashboard & Raporlar

- **Dashboard:** Günlük özet — toplam müşteri, aktif ilan, bu ay kapanan satış, bu haftaki randevular
- **Raporlar:**
  - Aylık müşteri/ilan/satış trendleri
  - Danışman performans karşılaştırması
  - Şubelere göre dağılım
  - Kaynak analizi
  - **Ciro raporları** (sözleşme tipine göre)

---

## 11. KVKK Uyumluluk (Genişletildi)

Emlak sektöründe kişisel veri fazlasıyla işleniyor — KVKK denetiminde ilk bakılan sistemlerden biri CRM olur.

### Standart Koruma
- **Açık Rıza / Aydınlatma / Pazarlama** izinleri ayrı ayrı tutulur
- TC Kimlik Numarası **AES-256** ile şifreli saklanır — DB kopyalansa bile okunamaz
- **Denetim Kayıtları (AuditLog):** Kim, ne zaman, hangi müşterinin verisini görüntüledi/değiştirdi/sildi? IP adresi dahil
- **Unutulma Hakkı:** Anonimleştirme

### Hassas Veri Erişim Denetimi (Yeni)
Standart denetim kayıtlarının ötesinde, **AGENT** (danışman) rolü için aktif kontrol katmanı:

- **Telefon / E-posta / TC** alanları varsayılan olarak **maskelenir** (`5** *** ** 23`)
- Görmek isteyen danışman **gerekçe + kategori** vermek zorundadır (Görüşme / Takip / Teklif / Sözleşme / Diğer)
- Sayfadan ayrılırken **sonuç notu zorunlu** (*"Ne konuşuldu / ne yapıldı?"*)
- Notsuz tab kapatma → oturum **"Notsuz Kapandı"** olarak işaretlenir
- **Yönetici raporu** (`/access-logs`) → kim, ne zaman, hangi gerekçeyle, hangi sonuçla?

**Kötüye kullanım göstergeleri** (yöneticiye uyarı):
- Aynı kullanıcı kısa sürede çok farklı müşteriye erişim
- Yüksek "Notsuz Kapandı" oranı
- "Diğer" kategorisi sıklığı

> **Önemli:** AGENT, kendi eklediği (veya atanan) müşterilerin hassas verisini gerekçe vermeden açık görür. Bu kural, danışmanın kendi portföyüne sürtüşmesiz erişimini sağlar; başka danışmanın müşterisine yetkisiz bakışı engeller.

![Erişim logları](docs/screenshots/17-access-logs.png)

---

## 12. Rol Tabanlı Yetkilendirme (RBAC)

| Rol | Kapsam |
|-----|--------|
| **Yönetici (ADMIN)** | Tüm sistem, kullanıcı yönetimi, denetim ve erişim logları |
| **Şube Müdürü (MANAGER)** | Kendi şubesindeki tüm müşteri/ilanlar, danışman atama, şube içi erişim logları |
| **Danışman (AGENT)** | Tüm müşterileri görür (hassas veri maskeli), kendi şubesinin ilanları, atanmış kayıtlarını düzenler |

Bu sayede danışmanlar başka danışmanın müşterisine dokunamaz, şube müdürleri başka şubenin verilerini düzenleyemez, hassas veri sorumluluğu kayıtlı kalır.

---

## 13. Kullanıcı Deneyimi Detayları

- **Fotoğraflı çalışan profili** — tabloda, navigasyon barında, her atamada görünür
- **Üst arama barı** tüm sayfalarda
- **Tek tıkla eylemler** — müşteri listesinden arama/WhatsApp/e-posta kaydetme
- **Mobil uyumlu** responsive tasarım
- **Yardım merkezi** — kullanım kılavuzu PDF'i tek tıkla açılır
- **Aktif/Pasif kullanıcı** — Tek tıkla kullanıcıyı pasife alın veya geri aktif edin

---

## 14. Teknoloji Altyapısı

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS, motion/react |
| Backend | Next.js App Router API, Node.js |
| Veritabanı | PostgreSQL 16 |
| ORM | Prisma 7 |
| Kimlik Doğrulama | NextAuth v5 (JWT) |
| Şifreleme | AES-256 (TC Kimlik), bcrypt (şifre) |
| Medya | Yerel dosya sistemi (cloud'a taşınabilir) |
| Deploy | Docker Compose + systemd + nginx (self-hosted) |
| SSL | Let's Encrypt (otomatik yenileme) |

---

## 15. Teslim Paketi

- Kaynak kod (Git repo)
- Production build — deploy edilmiş, çalışır halde
- Kullanım kılavuzu (Markdown + üretilebilir PDF/DOCX)
- Admin hesabı — ilk girişten sonra şifre değiştirilir
- 2 örnek şube + 4 örnek kullanıcı + 5 örnek müşteri + 3 örnek ilan (seed data)
- Veritabanı şeması ve migration dosyaları
- **Yedekleme sistemi:** Her release otomatik yedek (`/home/crmadmin/backups/<TAG>/`) — DB, schema, uploads, sistem dosyaları
- **Geri alma (rollback):** Tek komutla önceki sürüme dön
- **Disaster recovery:** Her yedek içinde RESTORE-TEMPLATE.md kılavuzu

---

## 16. Canlı Demo Akışı (Sunum Önerisi)

1. **Panel'e giriş** — günün özetine bakalım
2. **Yeni müşteri oluştur** — talep profili dolduralım, "ekleyen siz" oldunuz
3. **Müşterinin "İlgili İlanlar" sekmesi** — sistem zaten otomatik önermiş
4. **AGENT olarak** başka danışmanın müşterisine bakalım — telefon maskeli, "Göster" tıklayalım, gerekçe verelim
5. **Sayfadan çıkış** — sonuç notu zorunlu modal
6. **İlan detayına geçiş** — sahibiyle tek tıkla iletişim
7. **Yeni sözleşme** — KIRA seçelim, komisyon otomatik hesaplandı
8. **Finans sekmesi** — sözleşme imzalanır imzalanmaz ciroda göründü
9. **ADMIN olarak** Erişim Logları sayfası — tüm gerekçe ve sonuç notlarını görelim
10. **Ayarlar → Kullanıcılar** — yeni danışman ekleme, Excel izni, pasifi geri aktife alma

---

## Son Söz

Sistem, gerçek bir ofisin günlük akışını yalınlaştırmak için tasarlandı — **yeni müşteri geldiğinde**, **ilan satıldığında**, **sözleşme imzalandığında**, **bir danışman başka birinin müşterisine baktığında** hangi tuşa basılacağının belirsizliği ortadan kalkar.

Teknik bilgiye sahip olmayan danışmanlar bile 15 dakikalık bir tanıtımla sistemi kullanabilir.

Teslim günü destek hizmetimiz **30 gün** dahildir; ilk hafta ayrıca ofise gelip ekibe eğitim verilir.
