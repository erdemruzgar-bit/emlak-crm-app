# Toplu Mülk Üret

Bu sayfa daire, dükkan, villa ve müstakil ev kayıtlarını **toplu** oluşturmanın iki yolunu sunar. Her iki yöntem de aynı sayfada, üstteki sekmelerden seçilir.

## İki yöntem

### 1) Aralık ile Üret — tek proje, ardışık numaralar

Bir projedeki tek bir bloka ardışık birim numaralarıyla mülk oluşturur. Örnek: A1 bloğunda 1'den 30'a kadar 30 daire.

**Alanlar:**
- **Proje** ve **Blok** (dropdown'lardan seçilir)
- **Başlangıç No** – **Bitiş No** (sayısal)
- **Önek** (opsiyonel — örn. `A1-`)
- **Hane (padding)** (örn. `3` → `001, 002, …`)

**Buton:** "X dükkan üret" / "X daire üret" — seçilen mülk tipine göre etiket otomatik değişir.

Tek seferde en fazla **500 birim** üretilebilir. Mevcut birim numaraları otomatik atlanır.

> İpucu: Proje detay sayfasındaki **"Bu projeye toplu birim ekle"** linkiyle bu sekmeye gelirseniz proje önceden seçili olur.

### 2) Liste ile Üret — birden çok proje, yapıştırılabilir

Excel/Sheets'ten kopyala-yapıştır akışıdır. Her satırda **proje (ad veya kısa kod)**, **blok adı**, **birim no** — TAB veya çoklu boşlukla ayrılmış.

```
2124              A1    21
2124              A1    22
MEYDAN BAŞAKŞEHİR A1    23
2125              B1    33
```

**Proje sütununa ne yazabilirim?**
- **Kısa kod** (örn. `2124`) — Ayarlar → Projeler ekranında her projeye verdiğiniz kod
- **Veya tam proje adı** (örn. `MEYDAN BAŞAKŞEHİR`) — büyük/küçük harf duyarsız tam eşleşme

Kısa kod isteğe bağlıdır; kodsuz da proje adıyla çalışır. Kısa kod yine de tavsiye edilir çünkü daha pratiktir.

**Blok adı**: Var olan blok adıyla eşleşmelidir (büyük/küçük harf duyarsız). Bulunmazsa, **"Eksik blokları otomatik oluştur"** seçeneğini açarsanız onay sırasında otomatik yaratılır.

**Akış:**
1. Mülk tipini seç (üstte, ortak alan)
2. Listeyi yapıştır
3. **Önizle** → kaç satır geçerli, kaç çakışma, kaç eksik proje/blok göreceksiniz
4. Eksik proje varsa Ayarlar → Projeler'e gidip kodları atayın, sonra tekrar önizleyin
5. Yeşilse **N mülk üret** ile onaylayın — tüm satırlar **tek transaction** içinde yazılır; bir hata olursa hiçbir kayıt eklenmez

Tek seferde en fazla **1000 satır** işlenebilir.

## Hangi yöntemi ne zaman?

- **Aralık** → tek proje + tek blok + ardışık numaralar. Bir blokta 1-30 daire üretmek gibi.
- **Liste** → birden çok proje veya seyrek (sparse) numaralar. Örn. 250 satırlık dükkan listesi, üç farklı projeden, her blok için farklı birim numara aralıkları.

## Sık sorulan

**Birim numarası 0'la başlayan formatta (örn. `001`, `02`) — sorun olur mu?**
Hayır. Birim numarası metin olarak saklanır; verdiğiniz format aynen korunur.

**Yetki?**
ADMIN ve MANAGER rolleri toplu üretim yapabilir. MANAGER ise atanmış bir şubeye sahip olmalıdır.

## Sonraki adım

Üretilen mülklerin fiyat, m², oda, manzara vb. detaylarını portföy listesinden tek tek ya da Proje → Excel akışı üzerinden toplu güncelleyebilirsiniz.
