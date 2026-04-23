# ART CRM — Kullanım Kılavuzu

## Giriş

Sisteme giriş adresi: **https://crm.artinvertsment.com**

İlk giriş için varsayılan yönetici hesabı:
- **E-posta:** `admin@emlakcrm.com`
- **Şifre:** `123456`

> **Önemli:** İlk girişten sonra mutlaka şifrenizi değiştirin. Ayarlar → Kullanıcılar menüsünden kendi hesabınızı düzenleyebilirsiniz.

---

## Ana Sayfa (Dashboard)

Giriş yaptığınızda karşınıza çıkan ekrandır. Özet bilgileri gösterir:
- Toplam müşteri, ilan, randevu ve görev sayıları
- Bu ay kapanan satışlar
- Takibi geciken müşteriler
- Son eklenen ilanlar

---

## 1. Müşteri Ekleme

1. Sol menüden **Müşteriler** → sağ üstte **Yeni Müşteri** butonuna tıklayın.
2. Zorunlu alanlar: **Ad, Soyad, Müşteri Tipi** (Alıcı/Satıcı/Kiracı/Ev Sahibi).
3. İsteğe bağlı: Telefon, e-posta, TC Kimlik No (otomatik şifrelenir), adres.
4. **KVKK Rızaları** bölümünde en az "Açık Rıza" ve "Aydınlatma" seçili olmalıdır.
5. **Kaydet** butonuna basın.

### Müşterinin Talep Profilini Doldurma
Müşteri oluşturulduktan sonra detay sayfasında **Talep Profili** sekmesine girin:
- **Bütçe aralığı** (Min - Max)
- **Aşama:** Lead → Nitelikli → Aktif → Gösterim → Teklif → Sözleşme → Kapandı
- **Aciliyet:** Düşük / Orta / Yüksek / Acil
- **Mülk tercihleri:** Tip, şehir, ilçe, oda sayısı, m²
- **Finansman:** Nakit / Kredi / Takas, ön onay durumu
- **Etiketler:** VIP, Yatırımcı, Acil gibi özel etiketler

> Talep profili ne kadar eksiksiz doldurulursa **otomatik ilan eşleştirme** o kadar doğru çalışır.

### Müşteriye Fotoğraf Ekleme
Müşteri detay sayfasında **Bilgiler** sekmesine girin → **Düzenle** → en üstteki fotoğraf alanından "Fotoğraf Yükle" diyerek ekleyin. Hatırlamak istediğiniz özel müşteriler için faydalıdır.

### Not ve İletişim Kaydı
- **Notlar** sekmesi: Serbest metin notları (toplantı özeti, teklif detayı vs.)
- **İletişim** sekmesi: Telefon/e-posta/WhatsApp/Ziyaret kayıtları
- Liste ekranında müşteri satırında bulunan ikonlara tıklayarak tek tıkla hızlı kayıt oluşturabilirsiniz.

---

## 2. İlan (Portföy) Ekleme

1. Sol menüden **Portföy** → sağ üstte **Yeni İlan** butonuna tıklayın.
2. Zorunlu alanlar: **Başlık, Satılık/Kiralık, Mülk Tipi, Fiyat**.
3. İsteğe bağlı: m², oda, banyo, kat, yaş, ısıtma, adres bilgileri, harita konumu.
4. **İlan Sahibi:** Mevcut müşteri listesinden arayarak seçebilirsiniz (isteğe bağlı).
5. **Açıklama** alanına detayları yazın.
6. **Fotoğraf / Video:** Sürükle-bırak ile birden fazla medya yükleyebilirsiniz. İlk yüklediğiniz ana görsel olur.
7. **Kaydet**.

### İlan Durumu Güncelleme
İlan detay sayfasından durumu değiştirebilirsiniz:
- **Aktif** → Satışa/kiraya hazır
- **Satıldı** → Satış tamamlandı
- **Kiralandı** → Kira sözleşmesi yapıldı
- **Pasif** → Görünürlükten kaldırıldı

---

## 3. Otomatik Eşleştirme

Sistem, müşterilerin talep profili ile ilanları otomatik karşılaştırır:
- **İlan detay sayfasında** → "Eşleşen Müşteriler" kutusunda skorla listelenir.
- **Müşteri detay sayfasında** → "Eşleşen İlanlar" sekmesinde skorla listelenir.

Yeşil skor (≥70) = güçlü eşleşme, hemen iletişime geçin.

---

## 4. Randevu Oluşturma (Takvim)

1. Sol menüden **Takvim** → takvim üzerinde bir güne tıklayın **veya** sağ üstte **Yeni Randevu**.
2. Randevu türü: **Gösterim / Toplantı / Diğer**.
3. **Müşteri** ve **İlan** arama kutularından ilgili kayıtları seçin.
4. Tarih, saat, konum bilgilerini girin.
5. Randevu tamamlandığında ilgili karta tıklayıp durumunu **Tamamlandı** veya **İptal** yapabilirsiniz.

---

## 5. Görev Yönetimi

Sol menüden **Görevler**:
- **Yeni Görev** → kendinize veya başka bir danışmana iş ataması yapın.
- Öncelik (Düşük/Orta/Yüksek) ve son tarih belirleyin.
- Durum güncelleme: Yapılacak → Yapılıyor → Tamamlandı.

---

## 6. Kullanıcı (Çalışan) Yönetimi

**Yalnızca Yönetici ve Şube Müdürleri** erişebilir:

Sol menüden **Ayarlar → Kullanıcılar**:

### Yeni çalışan ekleme
1. **Yeni Kullanıcı** butonuna basın.
2. **Fotoğraf yükle** — Çalışanın kim olduğunun kolayca görünmesi için önerilir.
3. Ad, e-posta, şifre (en az 6 karakter), rol ve şube girin.
4. **Rol seçimi:**
   - **Yönetici (ADMIN):** Tüm sisteme erişim
   - **Şube Müdürü (MANAGER):** Yalnızca kendi şubesi
   - **Danışman (AGENT):** Yalnızca kendine atanmış müşteri ve ilanlar
5. **Oluştur**.

### Çalışanı pasife alma
Listede kullanıcının sağındaki kırmızı ikon → "Pasife Al" butonu ile sisteme erişimi kapatılır.
(Çalışan verileri silinmez, sadece erişim engellenir.)

### Çalışanı düzenleme
Kalem ikonuyla tıklayın → ad, e-posta, fotoğraf, şube güncelleyebilirsiniz. Şifreyi boş bırakırsanız eski şifre korunur.

---

## 7. Şube Yönetimi

**Ayarlar → Şubeler** → şube ekleme, düzenleme.

---

## 8. Görünürlük ve Yetkiler (RBAC)

Sistem 3 rol, iki farklı veri kapsamı ile çalışır:

| Varlık | Danışman | Şube Müdürü | Yönetici |
|--------|----------|-------------|----------|
| **Müşteri** (liste + detay) | **Tüm şubelerdeki** müşteriler görünür | Tümü | Tümü |
| **Müşteri düzenleme** | Sadece kendisine atanmış müşteri | Herhangi müşteri | Tümü |
| **Müşteri notu / iletişim kaydı** | Her müşteriye ekleyebilir | Her müşteriye ekleyebilir | Tümü |
| **İlan** (liste + detay) | Sadece **kendi şubesinin** ilanları | Kendi şubesi | Tümü |
| **İlan düzenleme** | Sadece kendine atanmış ilan | Şubesindeki tüm ilanlar | Tümü |
| **Randevu / Görev görüntüleme** | Kendisine ait | Şubesindeki tüm danışmanların | Tümü |
| **Randevu / Görev düzenleme** | Kendi kayıtları | Şubesindeki tüm kayıtlar | Tümü |

**Özet mantık:** Müşteriler grubun ortak varlığıdır (aynı kişi iki farklı şubeden ev alabilir). İlan ve portföy şubeye özeldir. Düzenleme yetkisi her zaman atanmış danışman, aynı şubenin müdürü ve yönetici ile sınırlıdır.

İzinsiz düzenleme denemeleri otomatik olarak **Denetim Kayıtları**'na (`DENIED_EDIT` olarak) düşer.

---

## 9. KVKK Uyumluluğu

### Müşteri Rızası
Her müşteriye ait açık rıza, aydınlatma ve pazarlama izinleri müşteri detay sayfasındaki **KVKK** sekmesinde tutulur.

Aydınlatma metni, müşterinin verilerinin **grubun tüm şubelerindeki** yetkili danışmanlar tarafından hizmet amacıyla görüntülenebileceği konusunda bilgilendirme içerir.

### Veriyi Anonimleştirme (Unutulma Hakkı)
Müşteri detay sayfasının sağ üstündeki **Veriyi Anonimleştir** butonu → müşteri verisi silinmez, yerine "Anonim Kullanıcı" yazılır; kişisel bilgiler boşaltılır. Bu işlem geri alınamaz.

### Denetim Kayıtları
**Ayarlar → Denetim Kayıtları** → kimin ne zaman hangi müşteriyi/ilan'ı gördüğünü, düzenlediğini görebilirsiniz. KVKK denetimi için gerekli.

---

## 10. Raporlar

Sol menüden **Raporlar**:
- Aylık müşteri/ilan/satış trendleri
- Danışman performansı
- Şubelere göre dağılım
- Kaynak analizi (hangi reklam kanalı daha verimli?)

---

## Sık Karşılaşılan Durumlar

| Durum | Yapılacak |
|-------|-----------|
| Şifremi unuttum | Yöneticiden sıfırlatın (Ayarlar → Kullanıcılar → Düzenle) |
| Müşteri liste ekranında yok | "Durum: Pasif" filtresine veya aktif filtrelere bakın. Müşteriler tüm rolelere gösterilir; danışmansanız düzenleyemezsiniz ama görebilirsiniz |
| İlan liste ekranında yok | Sadece kendi şubenizin ilanları görünür. Başka şubenin ilanı için yöneticiye başvurun |
| "Düzenle" butonu görünmüyor | Müşteri size atanmamışsa yetki yoktur. Müdürünüz veya yönetici düzenleyebilir |
| İlan görseli yüklenmiyor | Dosya boyutu 100 MB'dan küçük olmalı. JPG, PNG, WEBP, MP4 destekli |
| Takvimde randevu kaydedilmiyor | Müşteri ve saat seçili olmalı |

---

## Yedekleme

Veritabanı günlük yedek alınmaktadır *(sistem yöneticisi tarafından)*. Yedekler son 30 gün tutulur.

---

## Destek

Teknik sorun veya özellik talebi için: **destek@ornek.com**
