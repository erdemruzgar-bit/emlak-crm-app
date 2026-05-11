# ART CRM — Kullanım Kılavuzu

> Bu kılavuz sistemin tüm özelliklerini step-by-step anlatır. Görsel placeholder'lar (`![...]` satırları) `docs/screenshots/` klasöründeki ekran görüntülerine işaret eder; bkz. [docs/screenshots/README.md](docs/screenshots/README.md).

---

## Giriş

Sisteme giriş adresi: **https://crm.artinvertsment.com**

İlk giriş için varsayılan yönetici hesabı:
- **E-posta:** `admin@emlakcrm.com`
- **Şifre:** `123456`

> **Önemli:** İlk girişten sonra mutlaka şifrenizi değiştirin. Ayarlar → Kullanıcılar menüsünden kendi hesabınızı düzenleyebilirsiniz.

![Giriş ekranı](docs/screenshots/01-login.png)

---

## Ana Sayfa (Dashboard)

Giriş yaptığınızda karşınıza çıkan ekrandır. Özet bilgileri gösterir:
- Toplam müşteri, ilan, randevu ve görev sayıları
- Bu ay kapanan satışlar
- Takibi geciken müşteriler
- Son eklenen ilanlar

![Dashboard](docs/screenshots/02-dashboard.png)

---

## 1. Müşteri Yönetimi

### 1.1 Müşteri Ekleme
1. Sol menüden **Müşteriler** → sağ üstte **Yeni Müşteri** butonuna tıklayın.
2. Zorunlu alanlar: **Ad, Soyad, Müşteri Tipi** (Alıcı/Satıcı/Kiracı/Ev Sahibi vb. — `Ayarlar → Müşteri Tipleri` üzerinden katalog yönetilir).
3. İsteğe bağlı: Telefon, e-posta, TC Kimlik No (otomatik AES-256 ile şifrelenir), adres.
4. **KVKK Rızaları** bölümünde en az "Açık Rıza" ve "Aydınlatma" seçili olmalıdır.
5. **Kaydet** butonuna basın.

> Yeni eklediğiniz müşteri otomatik olarak size **"ekleyen"** olarak atanır — hassas verilerini her zaman açık görürsünüz (bkz. [§ 11. Hassas Veri Erişim Kontrolü](#11-hassas-veri-erişim-kontrolü-kvkk)).

![Yeni müşteri formu](docs/screenshots/03-customer-new.png)

### 1.2 Müşterinin Talep Profilini Doldurma
Müşteri oluşturulduktan sonra detay sayfasında **Talep Profili** sekmesine girin:
- **Bütçe aralığı** (Min - Max, currency seçilebilir)
- **Aşama:** Lead → Nitelikli → Aktif → Gösterim → Teklif → Sözleşme → Kapandı
- **Aciliyet:** Düşük / Orta / Yüksek / Acil
- **Mülk tercihleri:** Tip, şehir, ilçe, oda sayısı, m²
- **İlgilendiği Projeler / Siteler:** Müşterinin spesifik olarak ilgilendiği projeleri çoklu seçimle ekleyin (örn. Marina Park, Sun City). Daha sonra **Müşteriler listesi → İlgilendiği Proje filtresi** veya proje sayfasındaki **İlgili Müşteriler** sekmesinden bu müşterileri bulabilirsiniz.
- **Finansman:** Nakit / Kredi / Takas, ön onay durumu, peşinat %
- **Etiketler:** VIP, Yatırımcı, Acil gibi özel etiketler
- **Sonraki takip tarihi:** Otomatik hatırlatma için kritik

> Talep profili ne kadar eksiksiz doldurulursa **otomatik ilan eşleştirme** o kadar doğru çalışır.

![Talep profili](docs/screenshots/04-customer-demand.png)

### 1.3 Müşteriye Fotoğraf Ekleme
Müşteri detay sayfasında **Bilgiler** sekmesine girin → **Düzenle** → en üstteki fotoğraf alanından "Fotoğraf Yükle" diyerek ekleyin.

### 1.4 Not ve İletişim Kaydı
- **Notlar** sekmesi: Serbest metin notları (toplantı özeti, teklif detayı vs.)
- **İletişim** sekmesi: Telefon / e-posta / WhatsApp / Ziyaret kayıtları
- Liste ekranında müşteri satırındaki ikonlara tıklayarak tek tıkla hızlı kayıt oluşturabilirsiniz.

![Notlar ve iletişim](docs/screenshots/05-customer-notes.png)

### 1.5 Müşteri Excel İşlemleri
**Müşteriler** sayfasının üstündeki **Dışa Aktar** ve **İçe Aktar** butonları:

- **Dışa Aktar:** Mevcut filtreye uyan müşterileri Excel olarak indirir.
- **İçe Aktar:** Toplu kayıt için. Önce **Şablon İndir** ile boş şablon alın, doldurup yükleyin.
- **Yetki:** Bu butonlar sadece `canExport` / `canImport` izni olan kullanıcıda görünür (Ayarlar → Kullanıcılar → Düzenle).

![Excel import/export](docs/screenshots/06-customer-excel.png)

---

## 2. Portföy (İlan) Yönetimi

### 2.1 İlan Ekleme
1. Sol menüden **Portföy** → sağ üstte **Yeni İlan** butonuna tıklayın.
2. Zorunlu alanlar: **Başlık, İlan Tipi (Satılık/Kiralık/...), Mülk Tipi, Fiyat**.
3. İsteğe bağlı: m², oda, banyo, kat, yaş, ısıtma, adres, harita konumu.
4. **Tapu Bilgileri (Türkiye'ye özel):** Ada, pafta, parsel, bağımsız bölüm no, kat mülkiyeti tipi.
5. **Vatandaşlığa Uygun?** Yabancıya satışta TR vatandaşlık programı için işaretlenir.
6. **Proje / Blok / Daire No:** Toplu konut projesindeyse seçin (Ayarlar → Projeler'den oluşturulur).
7. **İlan Sahibi:** Müşteri listesinden arayarak seçin (opsiyonel).
8. **Fotoğraf / Video:** Sürükle-bırak ile yükleyin. İlk yüklediğiniz ana görsel olur.
9. **Kaydet**.

![Yeni ilan](docs/screenshots/07-property-new.png)

### 2.2 İlan Durumu Güncelleme
İlan detay sayfasından **iki ayrı durumu** yönetirsiniz:

**İlan Durumu (sistem)** — sözleşme veya manuel güncellemeyle değişir:
- **Aktif** → Satışa/kiraya hazır
- **Satıldı** → Satış sözleşmesi imzalandı
- **Kiralandı** → Kira sözleşmesi imzalandı
- **Pasif** → Görünürlükten kaldırıldı

**Sakin Durumu (operasyonel)** — günlük süreci yansıtır, **Ayarlar → Sakin Durumları** üzerinden katalog büyütülür:
- **Sahibi Oturuyor / Kiracılı / Boş** → mülkün fiili kullanım durumu
- **Kapora Alındı / Sözleşme Alındı** → satış sürecindeki ara aşamalar
- **Arşiv** → süreç dışı bırakılan kayıt

> İlan ve sakin durumu kataloglarının ikisi de **Ayarlar** altından genişletilebilir; yeni durum ekleyince formdaki dropdown otomatik güncellenir.

### 2.3 Proje / Blok Yönetimi (Toplu Konut)
**Ayarlar → Projeler** sayfasında:
1. **Yeni Proje** → ad, **kısa kod** (örn. `2124` — toplu yapıştırmada kullanılır), müteahhit, şehir (dropdown), ilçe (dropdown), bloklar
2. Mevcut bir projede kısa kodu yoksa **+ Kısa Kod** butonuyla atayın
3. Proje detayında **Blok ekle** → her bloğa kat sayısı, daire/kat
4. İlan oluştururken **Proje + Blok + Daire No** seçilir → otomatik konum/özellik miras alınır

> **Kısa kod (Project.code)** zorunlu değildir; sadece toplu yapıştırma akışını kullanacağınız projelerde gerekir (§ 2.5).

**Proje detay sayfası sekmeleri:**
- **Daireler & Sahipleri** — projedeki tüm birimler ve ilan sahipleri. Sağ üstte **"Bu projeye toplu birim ekle"** butonu, sizi Aralık modunda toplu üretim sayfasına götürür.
- **İlgili Müşteriler** — bu projeyle ilgilendiğini işaretlemiş tüm müşteriler (müşteri talep profilinden eklenir). Üstte **Müşteri listesinde aç** linki aynı filtreyi `/customers?interestedProjectId=...` üzerinden açar.
- **Excel** — projeye özel Excel içe/dışa aktarma

![Proje yönetimi](docs/screenshots/08-projects.png)

### 2.4 İlan Excel İşlemleri
Müşteride olduğu gibi **Dışa Aktar / İçe Aktar / Şablon İndir** butonları vardır. İçe aktarımda kılavuz modal'ı açılır — kolon adlarına dikkat.

### 2.5 Toplu Mülk Üretme (Portföy → Toplu Mülk Üret)
Tek seferde çok sayıda placeholder daire/dükkan/villa kaydı oluşturmak için. Portföy sayfasında üstteki **Toplu Mülk Üret** butonuyla erişilir. İki mod var, üstte sekme olarak seçilir.

**Önce hazırlık:** Üst kısımdaki ortak alanlar her iki mod için geçerlidir:
- **Mülk Tipi**: İşyeri/Dükkan, Daire, Villa, Müstakil Ev (zorunlu — buton ve mesaj etiketlerine yansır)
- **İlan Tipi**: Satılık / Kiralık
- **Varsayılan Fiyat**: 0 bırakılabilir, sonra tek tek düzenlenir

#### Mod 1 — Aralık ile Üret (tek proje, ardışık numaralar)
Bir projede bir bloğa ardışık numaralarla birim üretir.
1. **Proje** ve **Blok** seç
2. **Başlangıç No / Bitiş No** gir (max 500 birim/işlem)
3. İsteğe bağlı **Önek** (örn. `A1-`) ve **Hane / padding** (`3` → `001, 002, …`)
4. **N dükkan üret** butonuna bas — mevcut numaralar otomatik atlanır

> İpucu: Proje detay → Daireler sayfasındaki **"Bu projeye toplu birim ekle"** linkiyle bu moda gelirseniz proje önceden seçilidir.

#### Mod 2 — Liste ile Üret (çoklu proje, yapıştırılabilir)
Excel/Sheets'ten doğrudan kopyala-yapıştır. Sparse numaralar ve birden çok proje desteklenir.

Her satırda 3 sütun, TAB veya boşlukla ayrılmış:

```
2124    A1    21
2124    A1    22
2125    B1    33
```

1. Listeyi textarea'ya yapıştır
2. İsteğe bağlı: **Eksik blokları otomatik oluştur** (default: kapalı)
3. **Önizle** → kaç yeni / kaç çakışma / kaç eksik proje veya blok göreceksiniz
4. Eksik proje varsa **Ayarlar → Projeler**'de kısa kodu atayın, sonra tekrar önizleyin
5. **N mülk üret** ile onaylayın — tüm satırlar tek transaction'da yazılır; bir hata olursa hiçbir kayıt eklenmez

Tek seferde **max 1000 satır** işlenir. Yetki: ADMIN ve MANAGER (MANAGER atanmış şubeye sahip olmalıdır).

---

## 3. Otomatik Eşleştirme

Sistem, müşterilerin talep profili ile ilanları otomatik karşılaştırır:
- **İlan detay sayfasında** → "Eşleşen Müşteriler" kutusunda skorla listelenir.
- **Müşteri detay sayfasında** → "İlgili İlanlar" sekmesinde skorla listelenir.

**Skor algoritması:**

| Kriter | Puan |
|--------|------|
| Bütçe uyumu (±%10 tolerans) | +40 (uyum yoksa elenir) |
| Mülk tipi uyumu | +30 |
| Şehir uyumu | +20 (uyum yoksa elenir) |
| İlçe uyumu | +5 |
| m² uyumu | +10 |

Yeşil skor (≥70) = güçlü eşleşme. **✓ İlgileniyor / ✗ Reddet** ile danışman müşteri ilgisini işaretler. Manuel ilan/müşteri eklemek de mümkündür.

![Eşleşmeler](docs/screenshots/09-matching.png)

---

## 4. Takvim ve Randevu

1. Sol menüden **Takvim** → güne tıklayın veya sağ üstte **Yeni Randevu**.
2. Randevu türü: **Gösterim / Toplantı / Diğer**.
3. **Müşteri** ve **İlan** arama kutularından kayıtları seçin.
4. Tarih, saat, konum.
5. Tamamlandığında karta tıklayıp **Tamamlandı** veya **İptal** yapın.

![Takvim](docs/screenshots/10-calendar.png)

---

## 5. Görev Yönetimi

Sol menüden **Görevler**:
- **Yeni Görev** → kendinize veya başka bir danışmana atayın.
- Öncelik (Düşük/Orta/Yüksek) ve son tarih belirleyin.
- Durum güncelleme: Yapılacak → Yapılıyor → Tamamlandı.

---

## 6. Hatırlatmalar

Sol menüden **Hatırlatmalar**:
- Müşteri, ilan, sözleşme, randevu gibi her hedef tipi için zamanlı hatırlatma.
- Tarih geldiğinde panel + sağ üstte bildirim ikonunda görünür.
- Tamamlandığında listeden kaldırabilirsiniz.

![Hatırlatmalar](docs/screenshots/11-reminders.png)

---

## 7. Sözleşme Yönetimi

Sol menüden **Sözleşmeler** → **Yeni Sözleşme** ile başlayın.

### 7.1 Sözleşme Tipleri
- **KIRA** — Kira sözleşmesi (kiracı + ev sahibi + ilan)
- **SATIS** — Alım-satım sözleşmesi
- **KOMISYON** — Tek başına komisyon kaydı

### 7.2 Adımlar
1. **Tip seçin** (Kira / Satış / Komisyon)
2. **Müşteri ve sahip** alanlarını doldurun (mevcut müşterilerden arama)
3. **İlan seçin** (opsiyonel ama tavsiye edilir)
4. **Tutar, para birimi, başlangıç–bitiş tarihi**
5. **Komisyon dağılımı:** Şirket/danışman/ko-broker yüzdeleri otomatik hesaplanır (CommissionPolicy ayarına göre)
6. **Notlar** ve **Ekler** (PDF, fotoğraf, vb.)
7. **Kaydet**

### 7.3 Sözleşme Durumu
Taslak → Aktif → Süresi Doldu / Yenilendi / Feshedildi.

![Sözleşme oluşturma](docs/screenshots/12-contract-new.png)

### 7.4 Komisyon Hesaplayıcı
Sol menüde **Komisyon Hesapla** → tutar + tip + ko-broker durumuna göre net komisyonu önceden hesaplayabilirsiniz.

---

## 8. Finans

Sol menüden **Finans** sekmesinde:
- Tahsil edilen / bekleyen komisyonlar
- Kira tahsilat takibi
- Aylık ciro özeti
- Sözleşme bazında gelir görünümü

> Finans modülü, sözleşme verilerini kullanarak otomatik beslenir; manuel giriş gerektirmez.

![Finans](docs/screenshots/13-finance.png)

---

## 9. Otomasyon

Sol menüden **Otomasyon**:
- Sözleşme süresi dolmadan önce hatırlatma kuralları
- Takip tarihi geçen müşteriler için bildirim
- Sözleşme imzalandığında otomatik görev oluşturma

> Faz 2 modülü; bazı kurallar planlama aşamasında.

---

## 10. Kullanıcı (Çalışan) Yönetimi

**Yalnızca Yönetici ve Şube Müdürleri** erişebilir.

Sol menüden **Ayarlar → Kullanıcılar**:

### 10.1 Yeni Çalışan Ekleme
1. **Yeni Kullanıcı** butonuna basın.
2. **Fotoğraf yükle** — Çalışanın kim olduğunun kolayca görünmesi için önerilir.
3. Ad, e-posta, şifre (en az 8 karakter), rol, ana şube ve ek yetkili şubeler girin.
4. **Rol seçimi:**
   - **Yönetici (ADMIN):** Tüm sisteme erişim
   - **Şube Müdürü (MANAGER):** Yalnızca kendi şubesi
   - **Danışman (AGENT):** Yalnızca kendine atanmış müşteri ve ilanlar
5. **Excel İzinleri:** `canExport` / `canImport` checkbox'ları (sadece ADMIN değiştirebilir).
6. **Oluştur**.

![Kullanıcı yönetimi](docs/screenshots/14-users.png)

### 10.2 Çalışanı Pasife Alma / Tekrar Aktif Etme
- Listede kullanıcının yanındaki **kırmızı ikon (UserX)** → "Pasife Al"
- **Yeşil tik ikon (UserCheck)** → pasif kullanıcıyı **"Aktife Al"**

> Pasif kullanıcı sisteme giremez ama verileri ve geçmişi silinmez.

### 10.3 Çalışanı Düzenleme
Kalem ikonu → ad, e-posta, fotoğraf, rol, şube ve Excel izinlerini güncelleyebilirsiniz. Şifreyi boş bırakırsanız eski şifre korunur.

---

## 11. Hassas Veri Erişim Kontrolü (KVKK)

> **Yeni:** AGENT (Danışman) rolündeki kullanıcılar için telefon, e-posta ve TC Kimlik No varsayılan olarak maskelenir. Görmek isteyen danışman önce gerekçe vermek zorundadır.

### 11.1 Kim Etkilenir?

| Rol | Davranış |
|-----|----------|
| **AGENT (Danışman)** | Hassas alanlar maskelenir (`5** *** ** 23`). **Kendi eklediği** müşterileri açık görür; başkasının eklediği müşteride gerekçe ister. |
| **MANAGER (Şube Müdürü)** | Tüm bilgiler her zaman açık. |
| **ADMIN (Sistem Yöneticisi)** | Tüm bilgiler her zaman açık. |

### 11.2 Gerekçe Modalı (AGENT için)
1. Maskeli alanın yanındaki **"Göster"** butonuna tıklayın.
2. Açılan modalda:
   - **Gerekçe Kategorisi:** Görüşme / Takip / Teklif / Sözleşme / Diğer
   - **Açıklama** (en az 3 karakter): *"Yarın gösterimi teyit etmek için arıyorum"* gibi
3. **Gerekçeyi Onayla & Aç** → bilgi açılır, erişim oturumu başlar.

![Hassas veri modalı](docs/screenshots/15-access-reveal.png)

### 11.3 Sayfadan Çıkışta Sonuç Notu (Zorunlu)
Müşteri sayfasından ayrılırken (geri butonu, tab kapatma):
- Modal: *"Ne konuşuldu / ne yapıldı?"*
- En az 3 karakter sonuç notu yazılmadan çıkış yapılamaz
- Not, **Notlar** sekmesine ve oturum kaydına işlenir
- Tarayıcı zorla kapatılırsa oturum **"Notsuz Kapandı"** olarak işaretlenir

![Çıkış notu](docs/screenshots/16-access-exit.png)

### 11.4 Müşteri Detayında "Erişim Geçmişi" Sekmesi
Her müşterinin kartında **Erişim Geçmişi** sekmesi vardır → kim, ne zaman, hangi gerekçeyle bilgileri görüntülemiş, sonuç notu nedir.

### 11.5 Yöneticiye Özel: `Erişim Logları` Sayfası
Sol menüde sadece ADMIN/MANAGER görür: **Erişim Logları**.
- **Özet kartları:** Aktif / Tamamlandı / Notsuz Kapandı sayıları
- **Filtreler:** Kullanıcı, durum, gerekçe kategorisi, tarih aralığı
- **Liste:** Tüm sistem genelindeki erişim oturumları + sonuç notları

![Erişim logları](docs/screenshots/17-access-logs.png)

> Detaylı bilgi için: [docs/KVKK-Hassas-Veri-Erisimi.md](docs/KVKK-Hassas-Veri-Erisimi.md)

---

## 12. Şube Yönetimi

**Ayarlar → Şubeler** → şube ekleme, düzenleme, telefon, adres.

---

## 13. Katalog Ayarları

Sistem genelinde dropdown'larda kullanılan katalog değerleri:

| Katalog | Konum | Örnek |
|---------|-------|-------|
| **Müşteri Tipleri** | Ayarlar → Müşteri Tipleri | Alıcı, Satıcı, Kiracı, Ev Sahibi |
| **İlan Tipleri** | Ayarlar → İlan Tipleri | Satılık, Kiralık, Devren Kiralık, Devren Satılık, Arşiv |
| **Sakin Durumları** | Ayarlar → Sakin Durumları | Sahibi Oturuyor, Kiracılı, Boş, Kapora Alındı, Sözleşme Alındı, Arşiv |
| **Oda Tipleri** | Ayarlar → Oda Tipleri | 1+0, 1+1, 2+1, 3+1, 4+1 |
| **Komisyon Politikası** | Ayarlar → Komisyon | Şirket %, danışman %, ko-broker % |

> Yöneticiler bu katalogları büyütüp küçültebilir; sistem yeniden başlatılmasına gerek yoktur.

---

## 14. Görünürlük ve Yetkiler (RBAC)

Sistem 3 rol, iki farklı veri kapsamı ile çalışır:

| Varlık | Danışman | Şube Müdürü | Yönetici |
|--------|----------|-------------|----------|
| **Müşteri** (liste + detay) | Tümü görünür (hassas alanlar maskeli) | Tümü açık | Tümü açık |
| **Müşteri düzenleme** | Sadece kendisine atanmış | Herhangi müşteri | Tümü |
| **Müşteri hassas veri** | Sadece kendi eklediği müşteri açık; diğerlerinde gerekçe modalı | Tümü açık | Tümü açık |
| **İlan** (liste + detay) | Yetkili olduğu şubelerin ilanları (ana + ek) | Tüm şubeler görünür | Tümü |
| **İlan düzenleme** | Kendine atanmış ilan | Yetkili olduğu şubelerin tüm ilanları (ana + ek) | Tümü |
| **Randevu / Görev** | Kendi kayıtları | Yetkili şubelerindeki tüm kayıtlar | Tümü |
| **Sözleşme oluşturma** | Kendi müşteri/ilanları | Yetkili olduğu şubeler | Tümü |
| **Erişim Logları** | ❌ | Yetkili şubeleri içi | Tümü |
| **Excel İzinleri** | İzni varsa | İzni varsa | Tümü |

> **Ek Yetkili Şubeler:** Bir kullanıcının ana şubesinin yanında **ek yetkili şubeler** atanabilir (Ayarlar → Kullanıcılar → Düzenle → "Ek Yetkili Olduğu Şubeler"). Bu liste hem MANAGER hem AGENT için geçerlidir; düzenleme/erişim yetkisi ana şube + ek şubeleri kapsar.

İzinsiz düzenleme denemeleri otomatik olarak **Denetim Kayıtları**'na (`DENIED_EDIT` olarak) düşer.

---

## 15. KVKK Uyumluluğu (Genel)

### Müşteri Rızası
Her müşteriye ait **Açık Rıza**, **Aydınlatma**, **Pazarlama** izinleri müşteri detay sayfasındaki **KVKK Rızaları** sekmesinde tutulur.

### Veriyi Anonimleştirme (Unutulma Hakkı)
Müşteri detayının sağ üstündeki **Veriyi Anonimleştir** butonu → veri silinmez, "Anonim Kullanıcı" yazılır; kişisel bilgiler boşaltılır. Geri alınamaz.

### Denetim Kayıtları
**Ayarlar → Denetim Kayıtları** → kim ne zaman hangi müşteriyi/ilan'ı görüntüledi/düzenledi. Her erişim IP adresiyle birlikte kayıt altına alınır.

### Hassas Veri Erişim Oturumu
Yukarıdaki § 11 — bu, denetim kayıtlarından **bir adım öteye** giderek danışmanın gerekçe vermesini ve sonuç notu bırakmasını zorunlu kılar.

---

## 16. Raporlar

Sol menüden **Raporlar**:
- Aylık müşteri/ilan/satış trendleri
- Danışman performansı
- Şubelere göre dağılım
- Kaynak analizi (hangi reklam kanalı daha verimli?)
- **Ciro raporları:** Sözleşme tipine göre aylık/yıllık gelir grafikleri

---

## 17. Klavye Kısayolları

Sistem hızlı kullanım için aşağıdaki kısayolları destekler. Form/input alanına yazarken kısayollar devre dışıdır.

### Genel

| Tuş | İşlem |
|-----|-------|
| `?` | Tüm kısayolları gösteren yardım popup'ı |
| `Ctrl+K` (Mac: `⌘K`) | **Komut paleti** — sayfa ara, hızlı eylem (Yeni Müşteri, Yeni İlan, vb.) |
| `Ctrl+B` (`⌘B`) | Sidebar (sol menü) aç/kapa — özellikle mobilde drawer |
| `D` | Koyu/açık mod değiştir |
| `/` | Üst sağdaki arama kutusuna fokus |
| `Esc` | Açık modal/popup kapat |

### Liste Sayfaları (Müşteriler / Portföy / Sözleşmeler)

| Tuş | İşlem |
|-----|-------|
| `N` | Yeni kayıt formunu aç (sayfa bağlamına göre Müşteri/İlan/Sözleşme) |

### İlan Detayı — Galeri

| Tuş | İşlem |
|-----|-------|
| `←` | Önceki foto/video |
| `→` | Sonraki foto/video |
| `Esc` | Lightbox (büyütülmüş görünüm) kapat |

### Komut Paleti İçinde (Ctrl+K)

| Tuş | İşlem |
|-----|-------|
| `↑` `↓` | Listede gez |
| `Enter` | Seçili komutu çalıştır |
| Yazma | Hızlı arama |

> **İpucu:** Üst bardaki klavye ikonuna tıklayarak da yardım popup'ını açabilirsiniz.

---

## 18. Yedekleme ve Sürüm Yönetimi

Sistem her release'de otomatik olarak `/home/crmadmin/backups/<TAG>/` altına yedek alır:
- DB dump (`db.sql`)
- Schema (`schema.prisma`)
- Yüklü dosyalar (`uploads.tar.gz`)
- Migrations listesi
- Git history bundle
- Sistem dosyaları (`docker-compose.yml`, `nginx-emlak-crm.conf`, `emlak-crm.service`, `dotenv`)

**Yedekleri listele:** `~/emlak-crm-app/scripts/releases.sh`
**Geri al (rollback):** `~/emlak-crm-app/scripts/rollback.sh <TAG>`

---

## Sık Karşılaşılan Durumlar

| Durum | Yapılacak |
|-------|-----------|
| Şifremi unuttum | Yöneticiden sıfırlatın (Ayarlar → Kullanıcılar → Düzenle) |
| Telefon numarası `***` görünüyor | Danışmansanız bu normal — "Göster" butonuna tıklayıp gerekçe verin |
| "Aktife Al" butonu pasif kullanıcıda görünmüyor | Yetki kontrol edin — sadece ADMIN/MANAGER aktife alabilir |
| Excel butonları görünmüyor | ADMIN'den `canExport` / `canImport` izni isteyin |
| Müşteri liste ekranında yok | Filtre kontrol edin (durum, aşama, danışman) |
| İlan liste ekranında yok | Sadece kendi şubenizin ilanları görünür |
| "Düzenle" butonu görünmüyor | Müşteri size atanmamışsa yetki yoktur. Müdürünüz veya yönetici düzenleyebilir |
| Görsel yüklenmiyor | Dosya 100 MB altı olmalı; JPG/PNG/WEBP/MP4 destekli |
| Sözleşme oluşturulmuyor | Müşteri + sahip + tutar zorunlu; en az birini boş bıraktıysanız form bunu işaretler |

---

## Destek

Teknik sorun veya özellik talebi için: **destek@artinvertsment.com**
