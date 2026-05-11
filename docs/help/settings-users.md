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

## KVKK
Bir kullanıcı pasife alındığında geçmiş audit ve iletişim kayıtları silinmez — denetim ihtiyacı için saklanır.
