## Bu sayfa ne işe yarar

Tüm sözleşmelerin (kira, satış, komisyon) listelendiği ekran. Durum, tip, müşteri, tarih aralığı bazında filtrelenir; PDF eklenmiş kayıtlar burada toplanır.

## Sözleşme tipleri

| Tip | Ne için |
|-----|---------|
| **KIRA** | Kira sözleşmesi (kiracı + ev sahibi + ilan + tutar + vade) |
| **SATIS** | Alım-satım sözleşmesi |
| **KOMISYON** | Tek başına komisyon kaydı (örn. iş bağlama, danışmanlık) |

## Sözleşme durumu (yaşam döngüsü)

**Taslak → Aktif → Süresi Doldu / Yenilendi / Feshedildi**

Aktif duruma geçince:
- **KIRA**: bağlı ilanın durumu otomatik **Kiralandı**'ya, müşteri tipi **Kiracı**'ya geçer
- **SATIS**: ilan durumu **Satıldı**'ya, müşteri tipi **Ev Sahibi**'ne geçer
- **KOMISYON**: otomatik değişiklik yok

## Sık sorulan

- **Sözleşme oluşturdum ama ilan durumu değişmedi.** Sözleşme **Taslak** kalmış olabilir; detayında **Aktif** yapın → otomatik senkron başlar.
- **Komisyon nasıl hesaplandı?** Ayarlar → **Komisyon Politikası** ile tanımlanan oranlar (şirket/danışman/ko-broker payı + KDV) kullanılır. Sözleşme oluştururken oranı override edebilirsiniz.
- **PDF/eklerim güvende mi?** Ekler `public/uploads/contracts/` altında saklanır, audit log her yükleme/silme için kayıt tutar.
- **Sözleşme silebiliyor muyum?** Sadece ADMIN. Diğerleri "Feshedildi" durumuna geçirir — denetim izi korunur.

## Klavye kısayolları

- `N` — Yeni sözleşme
- `Ctrl+K` — Komut paleti

## Detaylı kılavuz

[KULLANIM.md § 7 — Sözleşme Yönetimi](/KULLANIM.md)
