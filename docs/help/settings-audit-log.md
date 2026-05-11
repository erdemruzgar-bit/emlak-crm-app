# Denetim Kayıtları (Audit Log)

Sistemde gerçekleşen tüm önemli işlemlerin (kayıt oluşturma, güncelleme, silme, erişim) zaman çizelgesi.

## Görüntülenen alanlar
- **Zaman** — UTC + yerel saat
- **Kullanıcı** — işlemi yapan
- **İşlem** — CREATE / READ / UPDATE / DELETE / DENIED_*
- **Varlık** — Customer, Property, Contract, vb.
- **Kayıt ID** — tıklanırsa varlık detayına gider
- **IP adresi** — isteğin geldiği IP

## Filtreler
- Tarih aralığı
- Kullanıcı
- Varlık tipi
- İşlem tipi

## Saklama
Audit kayıtları **silinmez**. KVKK denetimi ve adli süreçler için referans verisi olarak saklanır.

## İlişkili sayfalar
- **Erişim Logları** (sol menü) — sadece KVKK hassas veri erişim oturumlarını detaylı gösterir
- Müşteri detayındaki **Etkinlik** sekmesi — o müşteriye özel audit kayıtları
