# Müşteri Detay Sayfası

Tek bir müşterinin tüm bilgilerini, talep profilini, etkileşim geçmişini ve ilgili kayıtlarını içeren ana sayfa. Sekmeli yapı sayesinde aradığınız bilgiye hızlı ulaşırsınız.

## Sekmeler

### Bilgiler
- Ad, soyad, telefon, e-posta, TC Kimlik No (AES-256 ile şifreli), adres, fotoğraf
- Müşteri tipi (Alıcı/Satıcı/Kiracı/Ev Sahibi vb.), kaynak (Referans/İnternet vb.)
- **Atanan Danışman** ve **Şube** — yetki kontrolü için kritik
- **Düzenle** butonu, müşteri size atanmışsa (veya yönetici iseniz) görünür

### Talep Profili
- Bütçe aralığı, aşama, aciliyet, istenen taşınma tarihi
- Mülk tercihleri: tip (Daire/Dükkan/Villa/...), şehir, ilçe, m², oda, özellikler (otopark, asansör vs.)
- **İlgilendiği Projeler / Siteler** — çoklu seçim. Buraya eklenen projeler, proje sayfasının **İlgili Müşteriler** sekmesinde bu müşteriyi gösterir.
- Finansman: Nakit/Kredi/Takas + ön onay durumu + peşinat %
- Etiketler (VIP, Yatırımcı vb.)
- Sonraki takip tarihi
- **Talep Profilini Kaydet** butonu — değişiklikleri tek seferde uygular

### Notlar
Serbest metin notlar — toplantı özetleri, teklif detayları vb. Her not yazara ve zaman damgasına sahiptir.

### İletişim
Telefon / E-posta / WhatsApp / Ziyaret geçmişi. Liste ekranındaki tek-tık ikonlardan veya buradan kayıt eklenir.

### Randevular
Bu müşteriyle ilgili tüm randevular (Gösterim / Toplantı / Diğer). Tamamlandı/iptal durumları işaretlenir.

### İlgili İlanlar
Sistem otomatik öneriler (skor 0–105) + manuel ekleme. **✓ İlgileniyor** veya **✗ Reddet** ile işaret koyarak süreci yönetin.

### Sözleşmeler
Bu müşterinin tüm Kira / Satış / Komisyon sözleşmeleri. Aktif sözleşmenin durumu burada güncellenebilir.

### KVKK Rızaları
Açık Rıza, Aydınlatma, Pazarlama izinlerinin verildiği/iptal edildiği zamanlar.

### Erişim Geçmişi (KVKK)
Bu müşterinin hassas verilerine kim, ne zaman, hangi gerekçeyle bakmış. AGENT için her erişim oturumu sonuç notuyla kapatılır.

## Hassas Veri Erişimi (KVKK kapısı)

**Sizin eklemediğiniz** bir müşterinin telefon/e-posta/TC alanları AGENT iseniz maskelidir (`5** *** ** 23`).

1. **"Göster"** butonuna tıklayın
2. Açılan modalda **gerekçe kategorisi** (Görüşme/Takip/Teklif/Sözleşme/Diğer) + kısa açıklama girin
3. Bilgi açılır, oturum başlar
4. Sayfadan çıkarken **sonuç notu** zorunludur — yazmadan ayrılırsanız oturum `ABANDONED` olarak işaretlenir

Yöneticiler tüm bu oturumları **Erişim Logları** menüsünden raporlar.

## İşlemler

- **Veriyi Anonimleştir** (sadece ADMIN) — KVKK "Unutulma Hakkı" gereği müşteri kişisel verilerini siler, ilişkiler korunur
- **Müşteri Atama Değiştir** — ADMIN/MANAGER kullanıcıyı başka bir danışmana devreder
- **Yeni Randevu / Sözleşme** — sağ üst kısayollardan

## Sık sorulan

**Talep profilini neden kaydedemiyorum?**
Bu müşteri size atanmamıştır. Müdür/yönetici düzenler veya size devretmesini isteyin.

**İlgilendiği projeleri ekledim, neden listede görünmüyor?**
**Talep Profilini Kaydet** butonuna basmadıysanız değişiklikler kalıcı olmaz. Kaydedince proje sayfasının **İlgili Müşteriler** sekmesinde görünür.
