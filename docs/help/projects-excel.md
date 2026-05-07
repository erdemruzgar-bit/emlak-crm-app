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
| **Telefon** | "Cep: 0532 ... / Diğer: 0212 ..." formatı desteklenir |
| **DURUM** | "KENDİSİ OTURUYOR", "KİRALIYOR", "BOŞ" gibi standart ifadeler **otomatik tanınır** ve sakin durumu olarak yazılır. Tanınmayan metinler operasyonel not olarak saklanır |
| **GÖRÜŞME NOTU** | Tüm görüşme tarihçesi — ayrı bir görüşme kaydına yazılır |

## Akış

1. **Şablon İndir** — örnek satırlı Excel açılır
2. **Dosya Seç** — kendi dosyanızı yükleyin → otomatik **önizleme** çıkar
3. Önizlemede her satırın **Yeni / Güncelle / Atla** durumunu görürsünüz; uyarılar ve hatalar listelenir
4. **Uygula** butonuna basınca **transaction içinde** uygulanır: bloklar oluşturulur, müşteriler dedupe ile bulunur veya eklenir, daireler güncellenir, görüşme notları biriktirilir

## Önemli

- **Aynı dosyayı tekrar yüklerseniz:** mevcut daireler güncellenir (silinmez), GÖRÜŞME NOTU her seferinde **yeni bir not olarak biriktirilir** (geçmişi kaybetmemek için kasıtlı).
- **Dedupe**: aynı telefon numarası varsa müşteri tekrar oluşturulmaz, mevcut müşteriye bağlanır. Telefon yoksa her satır yeni müşteri olur.
- **KVKK**: Excel ile içeri aktarılan müşterilerin telefon/e-posta'sı AGENT için **maskelidir** — kapı atlanmaz.
- **Atlanan satırlar**: "Blok" veya "Daire" boşsa o satır işlenmez; preview'da kırmızı işaretlenir.

## Sık sorulan

- **Şablon dışı kolon ekleyebilir miyim?** Hayır — sistem yalnızca yukarıdaki başlıkları okur.
- **Önizlemeyi iptal etmek için?** Sayfa yenilemek yeterli; "Uygula" basılmadıkça veritabanı değişmez.
