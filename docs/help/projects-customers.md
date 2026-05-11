# Bu Projeyle İlgili Müşteriler

Bu sayfa, talep profilinde **İlgilendiği Projeler** alanına bu projeyi eklemiş tüm müşterileri listeler. Yeni bir daire/dükkan satışı veya ön kayıt başladığında, doğrudan bu projeyle ilgilenenlere ulaşmak için kullanın.

## Müşteri buraya nasıl gelir?

İki yoldan:

1. **Müşteri eklerken** — `Müşteriler → Yeni Müşteri` sayfasında "İlgilendiği Projeler / Siteler" alanından bu projeyi seçilirse;
2. **Mevcut müşteride** — Müşteri detayında **Talep Profili** kartında aynı alandan eklenir, ardından **Talep Profilini Kaydet** ile kaydedilir.

Bir müşteri birden çok projeyle ilgilenebilir; her seçim ayrı bir kayıt oluşturur ve hangi danışmanın eklediği audit log'unda görünür.

## Tablodaki sütunlar

- **Müşteri** — Adı + müşteri tipi (Alıcı/Kiracı vb.). Tıklayınca müşteri detayına gider.
- **İletişim** — Telefon / e-posta. AGENT için gerekirse maskeli görünür (KVKK).
- **Aşama** — Lead / Nitelikli / Aktif / Gösterim / Teklif / Sözleşme / Kapandı.
- **Danışman** — Müşteriye atanmış danışman.
- **Şube** — Müşterinin ait olduğu şube.
- **Eklendi** — Bu projeyle ilgilendiği işaretlenme tarihi + işaretleyen kullanıcı.

## Bağlantılar

Üst sağda **"Müşteri listesinde aç"** butonu vardır — aynı filtre `/customers?interestedProjectId=<projectId>` URL'iyle açılır. Müşteri listesindeki tüm filtreleri (aşama, aciliyet, bütçe, danışman vb.) bu kümeyle birlikte uygulayabilirsiniz.

## Sık sorulan

**Müşteri burada görünmüyor, neden?**
Müşterinin talep profilinde bu proje seçili değildir. Müşteri detayını açıp Talep Profili sekmesinde **İlgilendiği Projeler** alanına bu projeyi ekleyip kaydedin.

**Müşteri anonimleştirilmiş, listede çıkar mı?**
Hayır. KVKK gereği anonimleştirilen müşteriler bu listede görünmez (`isAnonymized=false` filtresi uygulanır).
