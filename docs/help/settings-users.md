# Kullanıcı (Çalışan) Yönetimi

Sisteme erişebilen çalışanları (ADMIN / MANAGER / AGENT) ekleyin, düzenleyin, pasife alın.

## Yeni kullanıcı
- **Ad-Soyad, e-posta, telefon** — temel bilgi
- **Şifre** — ilk şifre; kullanıcı sonra değiştirebilir
- **Rol:**
  - **ADMIN** — her şeyi görür ve yönetir
  - **MANAGER** — atandığı + ek yetkili olduğu şubelerde tam yönetim
  - **AGENT** — kendisine atanmış müşteri/ilanları yönetir, hassas verilerde KVKK kapısı uygulanır
- **Ana Şube** — kullanıcının ait olduğu şube (RBAC için kritik)
- **Ek Yetkili Olduğu Şubeler** — MANAGER/AGENT için: ana şubesi dışında çalışabileceği şubeler
- **Excel İçeri/Dışarı Aktarma** — opsiyonel yetki

## İşlemler
- **Düzenle** kalem ikonu — rol, şube, ad, e-posta değiştir
- **Şifre sıfırla** — düzenleme penceresinde yeni şifre gir
- **Pasife al / Aktife al** — satır sonundaki renkli ikon. Pasif kullanıcı login olamaz ama kayıtlarda görünür.
- **Devret** (çift ok ikonu) — kullanıcının üzerindeki atanmış **müşteri ve portföyü** başka bir aktif danışmana toplu aktarır. Yalnızca atanmış kaydı olan kullanıcılarda görünür.

## Kayıtları devretme
Bir kullanıcının üzerinde atanmış müşteri/ilan varken **Pasife Al** derseniz, sistem doğrudan pasife almaz; bir **Devir** penceresi açar:
- **Yeni Danışman** seçin → **Devret ve Pasife Al**: kayıtlar seçilen danışmana geçer, ardından kullanıcı pasife alınır.
- **Devretmeden Pasife Al**: kayıtlar eski (pasif) danışmanda kalır; bu kayıtlar **"yetkisiz danışmanda"** sayılır ve düzenlenemez (satırda kırmızı uyarı çıkar).
- Daha sonra bu boşta kalan kayıtları, ilgili kullanıcının satırındaki **Devret** ikonuyla istediğiniz zaman aktarabilirsiniz.

**Notlar:**
- Devirde yalnızca **danışman** değişir; kayıtların **şubesi değişmez**.
- **ADMIN** tüm kullanıcıları devredebilir. **MANAGER** yalnızca kendi şubesindeki danışmanların kayıtlarını, yine kendi şubesindeki bir danışmana devredebilir.
- KVKK gereği **anonimleştirilmiş** müşteriler devir kapsamına alınmaz.
- Her devir işlemi denetim kaydına (audit log) yazılır.

## KVKK
Bir kullanıcı pasife alındığında geçmiş audit ve iletişim kayıtları silinmez — denetim ihtiyacı için saklanır.
