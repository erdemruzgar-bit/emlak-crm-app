---
title: "ART CRM — Hızlı Başlangıç"
---

# ART CRM — Hızlı Başlangıç Kılavuzu

> Tek sayfada günlük iş akışı. Detay için: tam [Kullanım Kılavuzu](KULLANIM.md).

## Giriş
**https://crm.artinvertsment.com** — admin hesabı: `admin@emlakcrm.com` / `123456` (ilk girişten sonra şifrenizi mutlaka değiştirin).

---

## 3 Roller — Kim Neyi Görür?

| Rol | Görür | Düzenler |
|-----|-------|----------|
| **Yönetici (ADMIN)** | Her şey | Her şey |
| **Şube Müdürü (MANAGER)** | Tüm şubeler | Yetkili olduğu şubeler (ana + ek) |
| **Danışman (AGENT)** | Tüm müşteriler (telefon/email maskeli) + yetkili olduğu şubelerin ilanları | Kendine atanmış kayıtlar |

> **Ek Yetkili Şubeler:** Bir kullanıcı ana şubesi dışında başka şubelerde de yetkilendirilebilir (Ayarlar → Kullanıcılar → Düzenle → "Ek Yetkili Olduğu Şubeler"). Düzenleme/erişim yetkisi otomatik genişler.

> **AGENT için KVKK kuralı:** Başka birinin eklediği müşterinin telefonuna bakmak için **gerekçe** vermek zorunda; sayfadan çıkarken **sonuç notu** yazmadan ayrılamaz.

---

## Günlük Akış — 7 Temel İşlem

### 1. Müşteri Ekle
**Müşteriler → Yeni Müşteri** → Ad, Soyad, Tip, KVKK rızaları (Açık Rıza + Aydınlatma zorunlu).
Detayda **Talep Profili**: bütçe, mülk tipi, şehir, oda, etiketler.

### 2. İlan Ekle
**Portföy → Yeni İlan** → Başlık, Tip (Satılık/Kiralık), Mülk Tipi, Fiyat. Tapu (ada/pafta/parsel), proje/blok, sahibi, fotoğraf.

### 3. Müşteri ↔ İlan Eşleştirme
Sistem otomatik öneri yapar (skor 0–105). Müşteri sayfasında **İlgili İlanlar**, ilan sayfasında **İlgili Müşteriler**. **✓ İlgileniyor / ✗ Reddet** ile işaret koyun, manuel ekleme de mümkün.

### 4. Randevu / Görev
**Takvim → Yeni Randevu** → Gösterim/Toplantı, müşteri+ilan seçilir. Tamamlanınca durumu işaretleyin.
**Görevler** → kendinize/ekibe iş atayın, öncelik + son tarih.

### 5. Hızlı İletişim Kaydı
Müşteri liste kartında **Telefon / WhatsApp / E-posta** ikonları → tek tıkla "iletişim geçmişi"ne kayıt düşer. Form yok.

### 6. Sözleşme İmzalama (otomatik portföy senkron)
**Sözleşmeler → Yeni Sözleşme** → Tip (Kira/Satış/Komisyon), müşteri, sahip, ilan, tutar, vade.
Durum **"İmzalandı (Aktif)"** seçili kaydederseniz **ilan otomatik Kiralandı/Satıldı olur**, müşteri tipi de güncellenir.

### 7. Hatırlatmalar
**Hatırlatmalar** menüsünden müşteri/ilan/sözleşme/randevu için tarihli hatırlatma kurun → tarih geldiğinde panel + bildirim ikonunda görünür.

---

## Hassas Veri Erişimi (KVKK) — AGENT için

Kendinin eklemediği müşterinin **telefon/e-posta/TC** alanları maskelidir (`5** *** ** 23`).

1. **"Göster"** butonuna tıkla
2. Açılan modalda **gerekçe kategorisi** + **kısa açıklama** ver (Görüşme/Takip/Teklif/Sözleşme/Diğer)
3. Bilgi açılır, oturum başlar
4. Sayfadan çıkarken **sonuç notu** yaz (zorunlu)

> Yöneticiler tüm bunları **Erişim Logları** menüsünden raporlar.

---

## Yönetici İşleri (ADMIN/MANAGER)

| İşlem | Konum |
|-------|-------|
| Yeni çalışan | Ayarlar → Kullanıcılar → Yeni Kullanıcı |
| Pasife alma / aktife alma | Ayarlar → Kullanıcılar → satır sonu ikonlar (kırmızı/yeşil) |
| Excel izni ver | Düzenle → "Excel İçeri/Dışarı Aktarma" checkbox |
| Şube ekle | Ayarlar → Şubeler |
| Müşteri/İlan/Oda tipleri | Ayarlar → ilgili katalog sayfası |
| Komisyon politikası | Ayarlar → Komisyon |
| Erişim logları | Sol menü → **Erişim Logları** |
| Denetim kayıtları | Ayarlar → Denetim Kayıtları |
| KVKK Anonimleştirme | Müşteri detayında sağ üst → "Veriyi Anonimleştir" |

---

## Sık Sorulan

| Sorun | Çözüm |
|-------|-------|
| Telefon `***` görünüyor | AGENT iseniz normal — "Göster" → gerekçe verin |
| "Düzenle" yok | Müşteri/ilan size atanmamış. Müdür/yönetici düzenler |
| Excel butonu yok | ADMIN'den `canExport`/`canImport` izni isteyin |
| Sözleşme kaydedildi ama ilan değişmedi | Sözleşme **Taslak** kalmış olabilir; detayında **Aktif** yapın |
| İlan diğer şubelerden görünmüyor | AGENT yalnızca yetkili olduğu şubelerin ilanlarını görür; başka şubeye erişim için ADMIN/MANAGER "Ek Yetkili Olduğu Şubeler"e ekler |
| Şifre sıfırlama | ADMIN/MANAGER → Ayarlar → Kullanıcılar → kalem → şifre alanını yeniden gir |

---

## Klavye Kısayolları

| Tuş | İşlem |
|-----|-------|
| `?` | Tüm kısayolları gösteren popup |
| `Ctrl+K` (`⌘K`) | Komut paleti — sayfa ara, hızlı eylem |
| `/` | Üst arama kutusuna git |
| `N` | Liste sayfasında yeni kayıt formu |
| `Ctrl+B` | Sidebar aç/kapa (mobilde drawer) |
| `D` | Koyu/açık mod değiştir |
| `Esc` | Açık modal/popup kapat |
| `←` `→` | İlan galerisi: önceki/sonraki foto |

> Üst barda **klavye ikonu** ile aynı yardım menüsünü açabilirsin.

---

## Yedek & Sürüm
Her sürümde otomatik yedek `/home/crmadmin/backups/<TAG>/` ve Google Drive'a alınır.
**Geri al:** `~/emlak-crm-app/scripts/rollback.sh <TAG>`

---

**Destek:** destek@artinvertsment.com
