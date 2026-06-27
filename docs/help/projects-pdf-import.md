## Bu sayfa ne işe yarar

Meydan Başakşehir gibi büyük dükkan/daire listelerini **PDF'ten çıkarılmış veriyle toplu olarak** yeni bir projeye aktarmak için. Akış şu sırayla işler: önce PDF'ten çıkarılan JSON'u yapıştırırsınız, satırlar tabloya dolar, gerekirse elle düzeltirsiniz, sonra tek tıkla proje + bloklar + dükkanlar oluşur.

> **Fiyatlar zaten +%20 (×1,20) yansımış varsayılır.** Bu sayfadaki "Fiyat" alanı doğrudan mülkün `price` değerine yazılır; sistem ayrıca bir kez daha çarpmaz. Aylık kira boş bırakılırsa fiyat ÷ 180 (180 ay = 15 yıllık kira modeli) olarak otomatik hesaplanır.

## Sık yapılan

1. **JSON yapıştır:** "JSON yapıştır (extract.ts çıktısı)" bölümünü açın, `npx tsx scripts/pdf-import/extract.ts /yol/dosya.pdf` çıktısını yapıştırıp **Uygula** deyin. Satırlar, proje adı/kodu ve varsa vaziyet planı görselleri otomatik dolar.
2. **Proje bilgilerini doldur:** Proje adı (zorunlu), kısa kod, müteahhit, şehir, ilçe, açıklama. JSON'dan gelen değerleri burada düzenleyebilirsiniz.
3. **Satırları düzelt / ekle:** Tablodaki her satır bir dükkandır. Blok, birim no ve fiyat zorunludur; bunlardan biri eksik satır "geçersiz" sayılıp aktarılmaz. Eksik satırı **Satır ekle** ile, fazlasını çöp ikonuyla silebilirsiniz.
4. **Vaziyet planı yükle:** Görsel/PDF dosyalarını yükleyip projeye iliştirin.
5. **İçe aktar:** "N dükkanı içe aktar" butonu sadece geçerli satırları işler; sonuç kartında kaç dükkan/blok oluştuğu, kaç satırın atlandığı görünür.

## Sık sorulan

- **Aylık kira nereye yazılıyor?** Mülkün `price` alanına satış/liste fiyatı yazılır; aylık kira `operationalNote` içine not olarak eklenir (price ≠ aylık kira). Boş bırakırsanız fiyat ÷ 180 ile otomatik doldurulur.
- **Aynı dükkan zaten varsa?** (Proje, blok, birim no) üçlüsü zaten varsa o satır **atlanır**, mevcut kayıt üzerine yazılmaz. Atlanan sayısı sonuç kartında belirtilir.
- **JSON parse hatası alıyorum.** Yapıştırdığınız metin geçerli bir JSON olmalı ve içinde bir `rows` dizisi (veya doğrudan dizi) bulunmalı. extract.ts çıktısını eksiksiz kopyalayın.
- **PDF'i doğrudan yükleyebilir miyim?** Hayır; PDF, sunucu tarafındaki `extract.ts` betiğiyle JSON'a çevrilir, bu sayfa o JSON'u alır. Tek tek satır girmek isterseniz tabloyu elle de doldurabilirsiniz.
