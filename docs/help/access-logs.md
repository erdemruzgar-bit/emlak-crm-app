## Bu sayfa ne işe yarar

KVKK gereği — danışmanların (AGENT) **başka birinin eklediği müşterinin** hassas verisine (telefon, e-posta, TC) ne zaman, hangi gerekçeyle ve hangi sonuçla baktığını gösteren denetim ekranı. Yalnızca **ADMIN** ve **MANAGER** erişebilir.

## Bu sayfa hangi sorulara cevap verir?

- *"Kim, hangi müşteriye, ne zaman bakmış?"*
- *"Hangi danışman gereksiz veri açıyor?"*
- *"Notsuz kapatılan oturumlar var mı?"* (kötüye kullanım göstergesi)
- *"Belirli bir müşteriye son 1 ayda kimler erişti?"*

## Özet kartları

- **Aktif** — Şu an bir kullanıcı müşteri detayında, oturum açık
- **Tamamlandı** — Sayfadan ayrılırken sonuç notu yazılmış (sağlıklı kapanış)
- **Notsuz Kapandı** — Tarayıcı zorla kapatılmış / ağ kesilmiş; sürecin atlatılma şüphesi olabilir

## Filtreler

- **Kullanıcı** — Belirli bir danışmanın tüm oturumları
- **Durum** — Aktif / Tamamlandı / Notsuz Kapandı
- **Gerekçe Kategorisi** — Görüşme / Takip / Teklif / Sözleşme / Diğer
- **Tarih aralığı** — Başlangıç ↔ Bitiş

## Kötüye kullanım göstergeleri (yöneticiye)

| Sinyal | Anlamı |
|--------|--------|
| Aynı kullanıcı kısa sürede çok farklı müşteriye erişim | Toplu veri çekme şüphesi |
| Yüksek "Notsuz Kapandı" oranı | Süreç ciddiye alınmıyor / kasıtlı atlatma |
| "Diğer" kategorisi sıklığı | Gerekçe netleştirilmeli |
| Mesai dışı erişim | İncelemeye değer |

## Sık sorulan

- **MANAGER ne kadarını görür?** Yalnızca yetkili olduğu şubelerin (ana + ek) kullanıcılarına ait kayıtlar. ADMIN şirket genelini görür.
- **Bir kayıt sileyim mi?** Hayır — denetim izi silinmez. Anonimleştirme müşteri detayında yapılır, log'lar olduğu gibi kalır.
- **Sonuç notu nerede yazıyor?** Liste satırında "Sonuç Notu" sütunu; tıklayınca tam metin görünür. Müşteri detayındaki **Erişim Geçmişi** sekmesinde de aynı oturum görünür.

## Detaylı kılavuz

[docs/KVKK-Hassas-Veri-Erisimi.md — Tam Doküman](/docs/KVKK-Hassas-Veri-Erisimi.md) · [KULLANIM.md § 11 — Hassas Veri Erişimi](/KULLANIM.md)
