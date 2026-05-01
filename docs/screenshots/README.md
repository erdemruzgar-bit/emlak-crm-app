# Ekran Görüntüleri Rehberi

`KULLANIM.md` ve `SUNUM.md` dosyaları aşağıdaki PNG dosyalarına referans verir. Her dosya 1600px genişlikte (Full HD ölçeğinde) önerilir; PNG formatı tercih edin (JPG da kabul edilir).

## Yakalanacak Ekranlar

| Dosya | Sayfa / Akış | Notlar |
|-------|--------------|--------|
| `01-login.png` | `/login` | Default state, fields boş |
| `02-dashboard.png` | `/dashboard` | İçinde veri olan dashboard |
| `03-customer-new.png` | `/customers/new` | Form açık, KVKK rızaları görünür |
| `04-customer-demand.png` | `/customers/[id]` → "Talep Profili" tabı | Bütçe + tercihler dolu |
| `05-customer-notes.png` | `/customers/[id]` → "Notlar" tabı | En az 2-3 not yazılmış |
| `06-customer-excel.png` | `/customers` üst bar | Dışa Aktar / İçe Aktar / Şablon İndir butonları görünür |
| `07-property-new.png` | `/properties/new` | Form açık, fotoğraf yükleme alanı görünür |
| `08-projects.png` | `/settings/projects` | En az 1 proje + 1 blok |
| `09-matching.png` | `/properties/[id]` → "İlgili Müşteriler" widget | Skorlu öneriler görünür |
| `10-calendar.png` | `/calendar` | Aylık görünüm, randevuları olan |
| `11-reminders.png` | `/reminders` | En az 2 hatırlatma |
| `12-contract-new.png` | `/contracts/new` | Tip seçili, müşteri dolu |
| `13-finance.png` | `/finance` | Ciro/komisyon paneli |
| `14-users.png` | `/settings/users` | En az 3 kullanıcı (1 aktif + 1 pasif) — "Aktife Al" / "Pasife Al" butonları görünmeli |
| `15-access-reveal.png` | Müşteri detayı, "Göster" tıklanmış halde modal açık | AGENT hesabıyla |
| `16-access-exit.png` | Müşteri detayı, geri tuşu → çıkış notu modalı | AGENT hesabıyla |
| `17-access-logs.png` | `/access-logs` | Filtreler + en az 5 kayıt görünür |

## Yakalama İpuçları

1. **Browser:** Chrome/Edge — DevTools ile `1600x1000` viewport (Toggle device toolbar)
2. **Tarayıcı eklentisi:** "Awesome Screenshot" / "GoFullPage" ile sayfanın tamamını yakalayın
3. **Veri:** Demo gibi görünmesi için seed verisi yerine birkaç gerçekçi müşteri/ilan girin
4. **Hassas veriler:** Maskeleyici tarafından zaten örtüldüğü için screenshot sırasında temizlik gerekmez. ADMIN ile çekilen ekranlarda gerçek telefon görünmesin diye fake numaralar (`5551112233`) önerilir.
5. **Boyut:** PNG sıkıştırması için <https://tinypng.com/> önerilir.

## PDF / DOCX Üretimi

`KULLANIM.md` ve `SUNUM.md` Markdown'dır. PDF/DOCX üretimi için:

```bash
# Gerekirse pandoc + ek araçları yükle:
sudo apt install pandoc texlive-xetex texlive-lang-other

# Üretim:
cd ~/emlak-crm-app
pandoc KULLANIM.md -o ART-CRM-Kullanim-Kilavuzu.pdf \
  --pdf-engine=xelatex --toc --variable mainfont="Liberation Sans" \
  --variable geometry:margin=2cm

pandoc KULLANIM.md -o ART-CRM-Kullanim-Kilavuzu.docx --toc

pandoc SUNUM.md -o ART-CRM-Sunum.pdf \
  --pdf-engine=xelatex --variable geometry:margin=2cm

pandoc SUNUM.md -o ART-CRM-Sunum.docx
```

**Eski Word/PDF dosyaları (`Emlak-CRM-Kullanim-Kilavuzu.docx/.pdf`, `Emlak-CRM-Sunum.docx/.pdf`) güncel değildir** — Markdown'dan yeniden üretmek tavsiye edilir. Yeniden ürettikten sonra eski dosyaları silebilirsiniz.
