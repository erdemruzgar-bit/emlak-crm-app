# Hassas Veri Erişim Kontrolü (KVKK)

Müşterilerin **telefon**, **e-posta** ve **TC Kimlik No** bilgilerine kim, ne zaman, neden eriştiği artık kayıt altına alınıyor. Bu doküman özelliğin nasıl çalıştığını kısaca anlatır.

---

## Kim Etkileniyor?

| Rol | Davranış |
|-----|----------|
| **AGENT (Danışman)** | Hassas alanlar varsayılan olarak **maskelenir** (`5** *** ** 23` gibi). Görmek için gerekçe modalından geçmek zorunda. |
| **MANAGER (Şube Müdürü)** | Tüm bilgiler her zaman açık görünür. Sadece raporlama için kayıt tutulur. |
| **ADMIN (Sistem Yöneticisi)** | Tüm bilgiler her zaman açık görünür. Tam denetim yetkisi vardır. |

---

## AGENT İçin Akış

### 1. Maskeli Görünüm
Müşteri detayını açtığında telefon/email/TC alanları maskelenmiş görünür ve yanlarında **`Göster`** butonu vardır.

### 2. Gerekçe Modalı
`Göster` butonuna tıklayınca açılan modalda iki alan zorunludur:

- **Gerekçe Kategorisi** (dropdown):
  - Görüşme / Arama
  - Takip / Hatırlatma
  - Teklif Hazırlama
  - Sözleşme İşlemi
  - Diğer
- **Açıklama** (en az 3 karakter): *"Yarın gösterimi teyit etmek için arıyorum"* gibi serbest metin.

`Gerekçeyi Onayla & Aç` butonuna basıldığında:
- Bilgi açılır
- **Erişim oturumu** başlar (DB'de `CustomerAccessSession` kaydı)
- Ek alan istenirse aynı oturuma eklenir, yeni kayıt açılmaz

### 3. Sonuç Notu (Çıkışta Zorunlu)
Müşteri sayfasından ayrılırken (geri butonu, tab kapatma, sayfa yenileme):

- Bir not modalı açılır: *"Ne konuşuldu / ne yapıldı?"*
- En az 3 karakter not yazılmadan çıkış yapılamaz
- Not, müşterinin **Notlar** sekmesine ve oturum kaydına kaydedilir
- Tarayıcı zorla kapatılırsa oturum **`Notsuz Kapandı`** olarak işaretlenir; yönetici raporunda görünür

---

## YÖNETİCİ İçin: Erişim Logları Sayfası

Sol menüden **`Erişim Logları`** (sadece ADMIN/MANAGER görür).

### Görünüm
- **Özet kartları:** Aktif / Tamamlandı / Notsuz Kapandı sayıları
- **Filtreler:** Kullanıcı, durum, gerekçe kategorisi, tarih aralığı
- **Liste:** Her kayıt → kullanıcı, müşteri, gerekçe, erişilen alanlar, başlangıç/bitiş, IP, sonuç notu

### Hangi Sorulara Cevap Verir?
- *"Kim, hangi müşteriye, ne zaman bakmış?"*
- *"Hangi danışman gereksiz yere müşteri verisi açıyor?"*
- *"Notsuz kapatılan oturumlar var mı?"* (kötüye kullanım göstergesi)
- *"Belirli bir müşteriye son 1 ayda kimler erişti?"*

Müşteri detayında ayrıca **`Erişim Geçmişi`** sekmesi vardır — sadece o müşteriyi gören oturumları gösterir.

---

## Teknik Notlar

- **Maskeleme API tarafında yapılır.** Frontend'i bypass etmek faydasız; AGENT, oturum açmadan asla açık değer alamaz.
- **PUT (güncelleme)** isteğinde de kapı kontrolü vardır: AGENT, hassas bir alanı sadece o alanı reveal eden aktif oturumla güncelleyebilir.
- Tüm hassas alan erişimleri ayrıca **`AuditLog`** tablosuna ham log olarak yazılır (raw forensic).
- Veri modeli: `CustomerAccessSession` (id, customerId, userId, reasonCategory, reason, fields[], status, startedAt, endedAt, exitNoteId, ipAddress, userAgent).
- Migration: `20260429110653_add_customer_access_session`.

---

## Kötüye Kullanım Göstergeleri (Yöneticiye İpuçları)

| Sinyal | Anlamı |
|--------|--------|
| Aynı kullanıcı, kısa sürede çok sayıda farklı müşteriye erişim | Toplu veri çekme şüphesi |
| Yüksek oranda **`Notsuz Kapandı`** | Süreç ciddiye alınmıyor veya kasıtlı atlatma |
| `Diğer` kategori sıklığı yüksek | Gerekçe netleştirilmeli |
| Geç saatlerde / mesai dışı erişim | İncelemeye değer |

---

## Sürüm
- **Eklendiği tarih:** 2026-04-30
- **İlgili dosyalar:** `prisma/schema.prisma`, `src/lib/access-control.ts`, `src/app/api/customers/[id]/access-sessions/`, `src/app/api/access-logs/`, `src/app/(dashboard)/access-logs/`, `src/app/(dashboard)/customers/[id]/page.tsx`
