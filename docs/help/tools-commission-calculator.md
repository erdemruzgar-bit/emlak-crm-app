# Komisyon Hesaplayıcı

İlan + müşteri eşleştirip komisyonu hesaplar, payları danışman/ofis/partner arasında dağıtır ve isterseniz tek tıkla **taslak (DRAFT) sözleşmeye** dönüştürür.

## Bu sayfa ne işe yarar

Bir satış veya kira işleminde toplam komisyonu (brüt + KDV) bulur, paylaşım şablonuna göre kalemlere böler ve sonucu sözleşmeye taşımanızı sağlar. Oranların ve KDV'nin başlangıç değerleri **Ayarlar → Komisyon** politikasından gelir; bu sayfada işleme özel düzenleyebilirsiniz.

## Sık yapılan

1. **Eşleştir:** İlanı arayıp seçin; ilan seçilince işlem tipi (Satış/Kira), tutar ve atanmış danışman otomatik dolar. Alıcı/Kiracı'yı, gerekiyorsa Mülk Sahibi'ni seçin.
2. **İşlem tipi ve oranlar:** **Satış** için Alıcı %/Satıcı %, **Kira** için Kiracı %/Mülk Sahibi % girilir. "KDV dahil" kutusu ve KDV oranı toplam komisyonu etkiler.
3. **Paylaşım şablonu seç:** Dört şablon vardır:
   - **CLASSIC (Klasik):** Tek ofis, tek danışman.
   - **COBROKER (Co-broker):** İki ofis (bizim + partner), tek danışman bizim tarafta.
   - **DOUBLE_AGENT (Çift Danışman):** Tek ofis, alıcı tarafı + satıcı tarafı iki danışman.
   - **COBROKER_DOUBLE (Co-broker + Çift):** Hem iki ofis hem de bizim tarafta iki danışman.
   Şablon, paylaşım kalemlerinin **başlangıç değerlerini** üretir; danışmanları seçtikçe kalemler güncellenir.
4. **Kalemleri düzenle:** Her satırın etiketini, tipini (% veya ₺ sabit) ve değerini değiştirebilir; Ofis/Partner Ofis/Danışman/Referans/Boş kalem ekleyip silebilirsiniz.
5. **Sözleşmeye dönüştür:** İlan ve müşteri seçiliyse "Sözleşme Olarak Kaydet (DRAFT)" ile taslak sözleşme oluşur ve detayına yönlendirilirsiniz.

## Sık sorulan

- **Paylaşım nasıl hesaplanıyor?** Önce **sabit (₺) tutarlı kalemler** brüt komisyondan düşülür; kalan tutar üzerinden **yüzdeli kalemler** dağıtılır. Yüzdelerin toplamı **%100** olmalıdır, aksi halde uyarı çıkar.
- **"Dağıtılmayan kalan" / "Aşım" ne demek?** Yüzdeler %100'ü tutmuyorsa ya dağıtılmamış bir bakiye kalır ya da sabit tutarlar brütü aşar (negatif kalan). Kalemleri düzeltin.
- **Şablon değerlerini bozmadan değiştirebilir miyim?** Evet, şablon yalnızca başlangıç kalemlerini üretir; üzerine her türlü düzenleme yapabilirsiniz.
- **DRAFT sözleşme ne zaman gerçek olur?** Taslak kaydedilir; sözleşmeyi onayladığınızda mülk ve müşteri durumu otomatik güncellenir. Paylaşım dağılımı sözleşme notuna JSON olarak yazılır.
- **Oranlar nereden geliyor?** Açılışta **Komisyon Politikası**'ndan; "Politika ayarı" bağlantısıyla varsayılanları değiştirebilirsiniz (geçmiş sözleşmeleri etkilemez).
