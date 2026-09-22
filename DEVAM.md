---
title: "ART CRM — Çalışma Durumu ve Devam Notu"
---

# Çalışma Durumu — Devam Notu

**Son güncelleme:** 22 Eylül 2026
**Canlı sürüm:** `2026-09-20-v1` · `main` dalı · son commit `a152312`

Bu belge, yarım kalan işin nereden devam edeceğini anlatır. Tamamlanan işler kısa tutulmuştur;
asıl içerik **§3 Devam eden iş**.

---

## 1. Tamamlananlar (canlıda çalışıyor)

### 1.1 Yurt dışı telefon numarası desteği — `2026-09-20-v1`
Müşteri telefon alanı yalnızca Türkiye biçimini kabul ediyordu; `7 916 074 41 63` reddediliyordu.

- Kural [src/lib/validations/customer.ts](src/lib/validations/customer.ts) içinde genişletildi.
  TR kuralı (`trPhoneRegex`) **hiç değişmedi**; yeni kural onun üst kümesi.
- Saklama biçimi **bilinçli olarak** değiştirilmedi — canlı veride 704 telefon 10 farklı yazımda
  duruyor, tek taraflı normalize eski kayıtları yeni kayıtlardan ayırırdı.
- Doğrulama: 704/704 mevcut kayıt hem eski hem yeni kuralı geçiyor (0 regresyon),
  86 unit test, 37 healthcheck vakası.
- Regresyon koruması: [tests/unit/phone-validation.test.ts](tests/unit/phone-validation.test.ts) ve
  [scripts/healthcheck/validation-check.ts](scripts/healthcheck/validation-check.ts).

Aynı sürümde: zod hataları 4 formda ham JSON olarak basılıyordu, ortak bir çeviriciye bağlandı
([src/lib/api-error.ts](src/lib/api-error.ts)).

### 1.2 Dokümantasyon
`docs/help/*.md` dosyaları uygulama tarafından **diskten canlı okunuyor**
([src/app/api/help/[key]/route.ts](src/app/api/help/[key]/route.ts), 5 dk cache) — buraya yazılan
her şey deploy gerektirmeden yayına girer. Telefon biçimi 5 dosyaya işlendi; ayrıca dokümanın
**yanlış anlattığı** 5 şey düzeltildi (ayrıntı: commit `91c0150` ve `a152312`).

### 1.3 ESMA GÜRSOY devrinin geri alınması — 22 Eylül
7 Ağustos 2026'da 251 müşteri Esma'dan Sistem Yöneticisi'ne devredilmişti; sahip talebiyle geri alındı.

- **Uygulamanın kendi devir ekranı kullanılamazdı**: o ekran kaynak kullanıcının *tüm* kayıtlarını
  taşıyor. Admin'de 646 müşteri vardı (269 kendi + 377 üç ayrı devirden), arayüzden yapılsa
  646'sının tamamı taşınırdı. Hedefli SQL ile yalnızca 251 kayıt taşındı.
- Sonuç: Esma 252 müşteri, admin 395. 252/252 kayıt gerçek `canEditCustomer` testinden geçiyor.
- Yedek: `/home/crmadmin/backups/_manual-revert-esma-20260922-190557/` (işlem öncesi tam DB dökümü
  + etkilenen 251 kaydın kimlik listesi).

> **Geri alabilmemizin tek sebebi şanstı.** Devir işlemi hangi kayıtların taşındığını yazmıyor,
> sadece sayı yazıyor. Listeyi `createdById` alanı üzerinden yeniden kurduk ve üç devrin sayıları
> (251/80/46) "ekleyen" kırılımıyla birebir tuttuğu için emin olabildik. Aynı kullanıcı iki kez
> devredilseydi veya araya elle atama değişiklikleri girseydi bu yöntem **çalışmazdı**.
> Aşağıdaki §3 bu yüzden açıldı.

**Geri alınmayanlar (kasıtlı):** ZEYNEP KARTAL (80 müşteri + 2 portföy) ve Oğuzhan Avan
(46 müşteri + 3 portföy) devirleri duruyor; her iki kullanıcı da pasif.

---

## 2. Talep

> "ilerleyen zamanlarda sistemde yapılacak tüm işlemler loglanmalı ki bu tarz gelen taleplerde
> düzeltme yapabilelim" — "sadece loglama lazım bi'de işlem loglaması çok da yer kaplamasın"

Yani: **okuma değil, yazma (işlem) logu.** Amaç bir işlem yanlış yapıldığında geri alınabilmesi.
Ek kısıt: log şişmesin.

---

## 3. Devam eden iş — işlem loglaması

### 3.1 Hacim ölçüldü: şişme diye bir sorun yok

| Ölçüm | Değer |
|---|---|
| `AuditLog` kayıt sayısı | 2.333 (19 Nis – 22 Eyl, 5 ay) |
| Tablo boyutu | **928 kB** |
| Veritabanı toplamı | 22 MB |
| Son 3 ay ortalaması | 216 kayıt/ay |
| Yıllık projeksiyon | ~2.600 kayıt ≈ **1 MB/yıl** |

Kayıtların **%34'ü (783 adet) `READ`** — düzeltme yapmaya yaramaz, yalnızca KVKK görüntüleme izi.
Eksik yazma loglarını eklemek yıllık birkaç MB'ı geçmez.

**Sonuç: kısıt hacim değil.** Yine de şişmeyi kalıcı olarak önlemek için §3.4'te saklama süresi önerisi var.

### 3.2 Bulgular (tarama kısmen tamamlandı)

Beş route grubu paralel tarandı; **müşteri** ve **portföy/proje** grupları bitti, diğer üçü
(kullanıcı-yetki, sözleşme-finans, katalog-ayar) **çalışıyordu, sonuçları alınmadı**.

Ortaya çıkan ana desen: **toplu işlemlerin hiçbiri hangi kayıtlara dokunduğunu yazmıyor, hepsi
sadece sayı yazıyor.** `reassign/route.ts:114`'teki boşluk en az 6 ayrı yerde tekrarlanıyor.

#### Yüksek öncelikli (geri alınamaz veya sessiz veri kaybı)

| Dosya:satır | İşlem | Eksik |
|---|---|---|
| `api/customers/[id]/route.ts:284` | Anonimleştirme (KVKK) | `oldValue` **hiç yok**. Ad, soyad, e-posta, telefon, TC, adres kalıcı siliniyor — tek bir eski değer bile yazılmıyor. Sistemdeki tek gerçek veri yok edici işlem. |
| `api/customers/import/route.ts:206` | Excel ile mevcut müşterileri toplu günceller | Döngü içinde hiç log yok; tek özet log sadece sayı. Hangi kayıtlar ezildi bilinmiyor. |
| `api/customers/[id]/route.ts:235` | Müşteri güncelle (tekil) | `oldValue/newValue` yalnız `{firstName, lastName}`. Şema ~30 alan kabul ediyor — **`assignedAgentId`, `branchId`, telefon, bütçe, aşama değişimi loglanmıyor.** Esma tipi bir sorun tekil düzeyde tekrarlanırsa iz kalmaz. |
| `api/properties/import/route.ts:149` | Excel mevcut ilanları günceller | Ne id ne eski değer. 16 alan (fiyat, durum, m², adres…) üzerine yazılıyor. |
| `api/properties/[id]/route.ts:150` | İlan güncelle (tekil) | 62 alandan yalnız `{title, status}`. Fiyat, sahip, **şube ve danışman** değişimi loglanmıyor. |
| `api/properties/[id]/route.ts:205` | İlan sil (ADMIN) | `oldValue` yok; silinen ilanın hiçbir bilgisi kalmıyor. |
| `api/properties/bulk-paste/route.ts:172` | 1000'e kadar ilan üretir | Sadece sayı; oluşan id'ler yok. |
| `api/projects/[id]/properties/import/route.ts:291` | Proje Excel, daireleri günceller | **`ownerId` (malik) üzerine yazılabiliyor**, eski değer tutulmuyor. |
| `api/projects/[id]/properties/import/route.ts:264` | Proje Excel, mevcut müşterinin `altPhone`/e-postasını günceller | Ayrı log yok, eski değer yok — yanlış dosyada müşterinin ikinci telefonu sessizce kaybolur. |
| `api/projects/[id]/properties/import/route.ts:244` | Proje Excel yeni müşteri oluşturur | Oluşan id'ler yok **ve `createdById` bilerek `null`** — yani Esma devrini kurtaran tek alan bu yolda boş. Bu importla gelen müşteriler için aynı kurtarma **mümkün değil**. |
| `api/properties/[id]/images/route.ts:107` | Tüm fotoğrafları silip yenisiyle değiştirir | Silinenlerin URL'i, sırası, kapak bilgisi yazılmıyor. |
| `api/projects/[id]/route.ts:81` | Proje güncelle | Ne `oldValue` ne `newValue`. `branchId` değişimi o şubenin tüm danışmanlarının erişimini etkiliyor. |

#### Orta öncelikli
`customers/[id]/matches` ve `properties/[id]/matches` (dosyalarda `createdAuditLog` **import'u bile
yok**; `upsert` eski `REJECTED` durumunu sessizce eziyor) · `projects/[id]/blocks` (blok ekleme hiç
loglanmıyor, silmede blok **adı** yazılmıyor) · `customers/[id]/route.ts:216` (ilgilenilen projeler
`deleteMany`+`createMany` ile değişiyor, log yok) · `access-sessions/route.ts:80` (yazma işlemi
`READ` olarak loglanıyor) · proje silme (`onDelete: Cascade` ile bloklar da gidiyor, `oldValue` yok).

### 3.3 Sonraki adım: taramayı tamamla

Üç grup bitmedi. Devam etmek için:

```
Workflow({ scriptPath: "/home/crmadmin/.claude/projects/-home-crmadmin-emlak-crm-app/\
4a0e179f-a175-4764-8b6e-232d40833ce7/workflows/scripts/audit-coverage-map-wf_d181c9a2-859.js",
           resumeFromRunId: "wf_d181c9a2-859" })
```

Biten ajanlar önbellekten döner, yalnız eksikler çalışır. Ham sonuçlar:
`~/.claude/projects/-home-crmadmin/4a0e179f-a175-4764-8b6e-232d40833ce7/subagents/workflows/wf_d181c9a2-859/journal.jsonl`

**Özellikle beklenen kritik nokta:** sözleşme "Taslak → Aktif" yapılınca
[src/lib/contract-effects.ts](src/lib/contract-effects.ts) ilanı otomatik Satıldı/Kiralandı yapıyor
ve müşteri tipini değiştiriyor. Bu **yan etkinin** ayrı bir audit satırı yazıp yazmadığı
doğrulanmadı — yazmıyorsa ilan durumu iz bırakmadan değişiyor demektir.

### 3.4 Önerilen tasarım (henüz uygulanmadı, onay bekliyor)

Tek tek route'lara dağılmış düzeltme yerine **yardımcıyı güçlendirmek** daha az riskli:

1. **`logDiff()` yardımcısı** — [src/lib/audit.ts](src/lib/audit.ts) içine. Eski ve yeni nesneyi alıp
   **yalnızca değişen alanları** yazar. Hem kompakt hem geri alma için yeterli; bugünkü
   "elle iki alan seç" yaklaşımının tüm boşluklarını tek noktadan kapatır.
2. **Toplu işlemler için `entityIds`** — etkilenen kayıt kimlikleri diziye yazılır.
   251 kimlik ≈ 6 kB; bu işlemler nadir, maliyet ihmal edilebilir.
3. **`createdById` boşluğu kapatılsın** — `projects/[id]/properties/import/route.ts:253`'te bilerek
   `null` bırakılıyor. Doldurulursa Esma tipi kurtarma bu yol için de mümkün olur.
4. **Saklama süresi (şişmeye karşı kalıcı önlem):** `READ` kayıtları 12 ay, yazma kayıtları 5 yıl
   sonra silinsin. [scripts/daily-backup.sh](scripts/daily-backup.sh) zaten günlük çalışıyor,
   oraya eklenebilir. Bugünkü hızla 5 yıllık yazma logu ~5 MB.
5. **Dayanıklılık:** `createAuditLog` hata fırlatırsa asıl işlemin de patlayıp patlamadığı
   **kontrol edilmedi** — tarama bunu kapsıyordu, sonucu alınmadı. Log yazılamadı diye müşteri
   kaydı başarısız olmamalı.

> Uygulama sırası önerisi: önce (1) ve (2) — asıl değeri onlar veriyor. (4) ayrı ve bağımsız.

---

## 4. Bilinen, dokunulmamış açıklar

Sahip "şimdilik karıştırma" dediği için bırakıldı; kayıt altına alınıyor:

1. **KVKK maskeleme müşteri listesinde hiç uygulanmıyor.** `GET /api/customers`
   `applyAccessMask` çağırmıyor ve `limit` üst sınırı yok — AGENT tek istekte tüm tabanın ham
   telefonlarını gerekçesiz, oturumsuz, audit'siz alabiliyor. Aynı boşluk `dashboard`, `matches`,
   `contracts` route'larında da var.
2. **Kaydet sonrası maske kapısı atlanıyor.** PUT cevabı maskesiz ham satır döndürüyor, sayfa
   state'e merge edince telefon açılıyor.
3. **Excel yolunda telefon bozulması.** [src/lib/phone.ts:26](src/lib/phone.ts#L26) `normalizeTrPhone`
   ilk hanesi 2–5 olan 10 haneli yabancı numaraya `+90` ekliyor; `phoneDedupeKey` son 10 haneye
   baktığı için ABD `+1 212 555 1234` ile İstanbul `0212 555 12 34` **aynı anahtarı** üretiyor ve iki
   müşteri birleşebiliyor. Yardım sayfasına uyarı yazıldı, kod düzeltilmedi (DB'ye yazılan değeri
   değiştirdiği için ayrı sürüm olmalı).
4. **Google Drive yedeği alınmıyor.** Sunucuda `rclone` kurulu değil; `release.sh` adımı atlıyor.
   Kaynak kod GitHub'a gidiyor ama **DB yedeği ve yüklenen dosyalar yalnızca bu sunucuda.**
   Kurulum: `sudo apt install rclone` → `rclone config`.
5. **`public/docs/` altındaki 3 PDF 2 Mayıs tarihli** — uygulamadaki "Kılavuz" butonu bunları açıyor,
   yani kullanıcı eski telefon bilgisini görüyor. Üretim betiği repoda yok.
6. **`db-check` 2 maddede başarısız** (116 ilanın fiyatı 0 ve `listingTypes` boş) — toplu üretilen
   placeholder kayıtlar, telefon işinden önce de böyleydi. `deploy.sh` Aşama 1'de takılır;
   `release.sh` doğrudan çalıştırılarak geçildi.

---

## 5. Deploy hakkında bilinmesi gerekenler

- **`deploy.sh` şu an takılıyor** (§4.6). Sürüm `release.sh` doğrudan çağrılarak çıkarıldı.
- **`release.sh` build'i canlı `.next` üzerine yapıyor** ve başarısız olursa eskisini geri yüklemiyor.
  Makinede **3.8 GB RAM var ve swap yok**; build canlı servisle aynı bellekte çalışıyor. Deploy
  öncesi `.next` klasörünü elle yedeklemek iyi olur.
- Sürüm öncesi `release.sh` tam DB dökümü + uploads yedeği alıyor (`/home/crmadmin/backups/<TAG>/`).
- Geri dönüş: `./scripts/rollback.sh <TAG>` · listeleme: `./scripts/releases.sh`

---

**Destek:** destek@artinvertsment.com
