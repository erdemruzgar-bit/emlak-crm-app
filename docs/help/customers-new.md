## Bu sayfa ne işe yarar

Yeni müşteri kaydı oluşturma formu. Doğru doldurulduğunda otomatik ilan eşleştirme motoru bu müşteri için uygun ilanları **anında** öneri olarak çıkarmaya başlar.

## Doldurma sırası (önerilen)

1. **Kimlik bilgileri:** Ad, soyad, telefon, e-posta. Telefon zorunlu değildir. TC Kimlik No isteğe bağlıdır; girilirse **AES-256** ile şifreli saklanır.
   - **Telefon biçimi:** Türkiye numarasını 10 haneli yazın — `0532 123 45 67`, `0212 555 12 34` (`+90 532 123 45 67` da kabul edilir).
   - **Yurt dışı müşteri:** Numarayı **ülke koduyla** yazın — `+7 916 074 41 63`, `+49 151 23456789`, `+971 50 123 4567`. `+` koymazsanız numaranın en az **11 haneli** olması gerekir (`7 916 074 41 63` kabul edilir).
   - Numara **yazdığınız gibi** saklanır; sistem biçimini değiştirmez.
2. **Müşteri tipi:** Alıcı / Satıcı / Kiracı / Ev Sahibi (Ayarlar → Müşteri Tipleri ile genişletilebilir).
3. **KVKK rızaları:** **Açık Rıza** ve **Aydınlatma** zorunludur; pazarlama izni opsiyonel. Kaydedemiyorsanız bu kutucuklar boştur.
4. **Talep profili (sonrası):** Kayıttan sonra detay sayfasında bütçe, mülk tipi, şehir, oda, etiketler doldurulur — eşleştirme motoru bunlara göre çalışır.

## Sık sorulan

- **TC Kimlik girmek zorunda mıyım?** Hayır. Sözleşme aşamasına gelince gerekir; ön görüşmede boş bırakabilirsiniz.
- **"Geçersiz telefon formatı" hatası alıyorum.** Numara eksik haneli veya tanınmayan bir biçimdedir. Türkiye numarası 10 hane olmalıdır — `532320859` (9 hane) reddedilir. `+90` ile başlayan numara **her zaman** Türkiye kuralına göre denetlenir, yani `+90 532 320 85 9` gibi eksik haneli bir numara kabul edilmez. Yurt dışı numarayı ülke koduyla yazın; `+` koymazsanız numaranın en az 11 haneli olması gerekir.
- **Aynı telefonla ikinci kayıt açılır mı?** Evet, açılır — sistem mükerrer telefonu engellemez ve bir uyarı göstermez. Kaydetmeden önce müşteri listesinden kontrol edin. Arama kutusu numarayı **yazdığınız gibi** arar; numaralar da kayıtta farklı biçimlerde durduğu için `0532 123 45 67` gibi boşluklu bir parça çoğu kaydı bulamaz. Numaranın **baştaki parçasıyla** (`0532`) veya ad-soyad ile aramak daha güvenilirdir.
- **Müşteri kaydedildi ama hassas alanlar maskeli görünüyor.** **Sizin eklediğiniz** müşterilerde hassas alanlar açıktır. Maskeli görünüyorsa sayfayı tazeleyin; oturumunuzda gecikme olmuş olabilir.

## Klavye kısayolları

- `Esc` — Formu iptal et (değişiklikler kaybolur)
- `Tab` — Sonraki alan
- `Ctrl+Enter` (form içinde) — Kaydet

## Detaylı kılavuz

[KULLANIM.md § 1.1 — Müşteri Ekleme](/KULLANIM.md) · [§ 11 — KVKK Hassas Veri](/docs/KVKK-Hassas-Veri-Erisimi.md)
