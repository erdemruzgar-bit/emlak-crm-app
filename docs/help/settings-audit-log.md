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

## Kullanıcı Adli İncelemesi
Sayfanın üstündeki **Kullanıcı Adli İncelemesi** panelinden bir kullanıcı seçip **Analiz Et**'e basın. Tek ekranda:
- Toplam işlem + **Silme / Ekleme / Güncelleme** sayıları (silme varsa kırmızı vurgulu),
- **Silme işlemleri tablosu** (ne, ne zaman, hangi kayıt, hangi IP),
- İlk/son işlem tarihi ve (varsa) pasife alınma tarihi,
- Varlık × işlem dağılımı ve en yoğun günler.

İşten ayrılan bir çalışanın veri silip silmediğini saniyeler içinde kontrol etmek için kullanın. Bu panel yalnızca **Yöneticide** görünür.

> Not: Silme işlemleri artık **tüm** kayıt tiplerinde (müşteri, ilan, görsel, randevu, görev, hatırlatma, eşleşme, blok, şube, kullanıcı, kataloglar) loglanır.

## Saklama
Audit kayıtları **silinmez**. KVKK denetimi ve adli süreçler için referans verisi olarak saklanır.

## İlişkili sayfalar
- **Erişim Logları** (sol menü) — sadece KVKK hassas veri erişim oturumlarını detaylı gösterir
- Müşteri detayındaki **Etkinlik** sekmesi — o müşteriye özel audit kayıtları
