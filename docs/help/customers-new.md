## Bu sayfa ne işe yarar

Yeni müşteri kaydı oluşturma formu. Doğru doldurulduğunda otomatik ilan eşleştirme motoru bu müşteri için uygun ilanları **anında** öneri olarak çıkarmaya başlar.

## Doldurma sırası (önerilen)

1. **Kimlik bilgileri:** Ad, soyad, telefon, e-posta. TC Kimlik No isteğe bağlıdır; girilirse **AES-256** ile şifreli saklanır.
2. **Müşteri tipi:** Alıcı / Satıcı / Kiracı / Ev Sahibi (Ayarlar → Müşteri Tipleri ile genişletilebilir).
3. **KVKK rızaları:** **Açık Rıza** ve **Aydınlatma** zorunludur; pazarlama izni opsiyonel. Kaydedemiyorsanız bu kutucuklar boştur.
4. **Talep profili (sonrası):** Kayıttan sonra detay sayfasında bütçe, mülk tipi, şehir, oda, etiketler doldurulur — eşleştirme motoru bunlara göre çalışır.

## Sık sorulan

- **TC Kimlik girmek zorunda mıyım?** Hayır. Sözleşme aşamasına gelince gerekir; ön görüşmede boş bırakabilirsiniz.
- **"Aynı telefonla başka müşteri var" uyarısı.** Sistem mükerrer kayıt riskini bildirir; mevcut kaydın detayına gitmek mantıklıdır.
- **Müşteri kaydedildi ama hassas alanlar maskeli görünüyor.** **Sizin eklediğiniz** müşterilerde hassas alanlar açıktır. Maskeli görünüyorsa sayfayı tazeleyin; oturumunuzda gecikme olmuş olabilir.

## Klavye kısayolları

- `Esc` — Formu iptal et (değişiklikler kaybolur)
- `Tab` — Sonraki alan
- `Ctrl+Enter` (form içinde) — Kaydet

## Detaylı kılavuz

[KULLANIM.md § 1.1 — Müşteri Ekleme](/KULLANIM.md) · [§ 11 — KVKK Hassas Veri](/docs/KVKK-Hassas-Veri-Erisimi.md)
