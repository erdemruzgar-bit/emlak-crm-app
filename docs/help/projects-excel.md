## Bu sayfa ne işe yarar

Müşterinin kendi çalışma defterini (Excel/CSV) bu projeye toplu olarak yüklemek için. Şablon Türkçe başlıklarla hazır gelir; ilk sefer şablonu indirip kendi verinize göre düzenleyebilir veya direkt kendi dosyanızı yükleyebilirsiniz.

## Beklenen kolonlar

| Kolon | Açıklama |
|-------|---------|
| **Blok** | Bloğun adı (örn. "A1 BLOK"). Yoksa otomatik oluşturulur. |
| **Daire** | Daire numarası (örn. "1", "071") |
| **M2** | Brüt metrekare. "0" veya boş ise atlanır |
| **KAT** | Bulunduğu kat (-1, 0, 1, ...) |
| **MANZARA** | Proje-spesifik kod (örn. "PEYZAJ", "ARMONI") — serbest metin |
| **MUTFAK** | "AÇIK" / "KAPALI" |
| **ODA SAYISI** | "2+1", "1+1 ( TERASLI )" — parantez içi "TERASLI/BALKON" otomatik algılanır |
| **Malik / Kiracı** | "Kat Maliki" → Ev Sahibi, "Kiracı" → Kiracı |
| **Adı Soyadı** | Sahibin tam adı (ilk kelime ad, gerisi soyad) |
| **E-Posta** | Opsiyonel |
| **Telefon** | "Cep: 0532 ... / Diğer: 0212 ..." formatı desteklenir. Bu sütun **Türkiye numaraları** içindir — yurt dışı numaralar için aşağıdaki uyarıya bakın |
| **DURUM** | "KENDİSİ OTURUYOR", "KİRALIYOR", "BOŞ" gibi standart ifadeler **otomatik tanınır** ve sakin durumu olarak yazılır. Tanınmayan metinler operasyonel not olarak saklanır |
| **GÖRÜŞME NOTU** | Tüm görüşme tarihçesi — ayrı bir görüşme kaydına yazılır |

## Akış

1. **Şablon İndir** — örnek satırlı Excel açılır
2. **Dosya Seç** — kendi dosyanızı yükleyin → otomatik **önizleme** çıkar
3. Önizlemede her satırın **Yeni / Güncelle / Atla** durumunu görürsünüz; uyarılar ve hatalar listelenir
4. **Uygula** butonuna basınca **transaction içinde** uygulanır: bloklar oluşturulur, müşteriler dedupe ile bulunur veya eklenir, daireler güncellenir, görüşme notları biriktirilir

## Önemli

- **Aynı dosyayı tekrar yüklerseniz:** mevcut daireler güncellenir (silinmez), GÖRÜŞME NOTU her seferinde **yeni bir not olarak biriktirilir** (geçmişi kaybetmemek için kasıtlı).
- **Dedupe**: eşleştirme telefonun **son 10 hanesi** ile yapılır; eşleşen müşteri varsa yeni kayıt açılmaz, mevcut müşteriye bağlanır. Telefon yoksa her satır yeni müşteri olur.
- **Dedupe'un sınırı**: arama, sistemdeki numaranın yazılışına duyarlıdır. Kayıtlı numara boşluklu duruyorsa (örn. `0532 123 45 67`) eşleşme bulunamaz ve aynı kişi ikinci kez oluşturulabilir. Yükleme sonrası mükerrer kayıt için müşteri listesini kontrol etmek iyi olur.
- **KVKK**: Excel ile içeri aktarılan müşterilerin telefon/e-posta'sı AGENT için **maskelidir** — kapı atlanmaz.
- **Atlanan satırlar**: "Blok" veya "Daire" boşsa o satır işlenmez; preview'da kırmızı işaretlenir.
- **Yurt dışı numaralar (dikkat)**: Excel yolu, Yeni Müşteri formundaki telefon denetimini **kullanmaz**; hücredeki numarayı Türkiye kalıbına göre çevirmeye çalışır. `+7 916 074 41 63` → baştaki `+` düşerek `79160744163` olarak kaydedilir; ilk hanesi 2–5 olan 10 haneli bir yurt dışı numarasının başına yanlışlıkla `+90` eklenebilir. **Yurt dışı numaralı sahipleri Excel'den sonra müşteri kartından elle düzeltin.**

## Sık sorulan

- **Şablon dışı kolon ekleyebilir miyim?** Hayır — sistem yalnızca yukarıdaki başlıkları okur.
- **Önizlemeyi iptal etmek için?** Sayfa yenilemek yeterli; "Uygula" basılmadıkça veritabanı değişmez.
