# Otomasyon

Belirli koşullarda otomatik olarak hatırlatma, görev veya bildirim oluşturan kural motoru.

> Bu modül şu an çerçeve olarak hazır; örnek kurallar arka planda çalışıyor (sözleşme bitimi, soğuyan müşteri). Kullanıcı tarafından düzenlenebilir kural editörü Faz 2'de planlıdır — TESLIM-SONRASI.md'de detay var.

## Şu an aktif kurallar (sistem)
- Sözleşme bitimine **30/15/7/1 gün** kala otomatik hatırlatma açılır
- Müşterinin **son iletişim** tarihinden 30 gün geçmişse "soğuyan müşteri" raporuna düşer
- Atanmış görevin **son tarihi** geçtiyse her gün hatırlatma yenilenir

## Faz 2'de gelecek
- Kullanıcı kendi koşulu + aksiyon: "Eğer X olursa Y yap"
- E-posta / SMS / WhatsApp bildirim tetikleyici
- Müşteri segmentasyonuyla toplu otomasyon
