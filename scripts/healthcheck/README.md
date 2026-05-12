# Pre-deploy & Sağlık Kontrol Sistemi

Emlak CRM canlı bir servis. Her geliştirme sonrası gözle test yerine, deploy
öncesi bu zinciri çalıştırarak en yaygın bug'ları yakalarsınız:

- TypeScript hataları (yanlış tip, eksik field)
- React hook bug'ları (eksik dependency → tıklamayan butonlar)
- Eksik / kırık import'lar
- DB şeması ile kod uyumsuzluğu
- Yetim veri / kırık migration
- HTTP servisinin auth + temel endpoint'lerinin çalışıyor olması

## Hızlı komutlar

| Komut | Ne yapar | Süre |
|---|---|---|
| `npm run typecheck` | Sadece `tsc --noEmit` | ~10s |
| `npm run lint` | ESLint | ~5s |
| `npm run healthcheck:db` | DB bağlantı + tablo sayım + tutarlılık | ~3s |
| `npm run healthcheck:http` | Canlı servisin HTTP smoke testi | ~5s |
| **`npm run check`** | **Tam pre-deploy zinciri (typecheck → lint → build → db-check → http-smoke)** | ~2-3 dk |
| **`npm run deploy`** | **`check` + migrate + restart + post-restart smoke** | ~3-4 dk |

## Zincir adımları

### `npm run check` (pre-deploy)

1. **TypeScript** — `tsc --noEmit`. Tip hataları varsa burada düşer.
2. **Lint** — `eslint`. `react-hooks/exhaustive-deps` gibi runtime
   bug habercileri burada yakalanır (tıklamayan buton tipik).
3. **Build** — `next build`. Dead route, eksik import, sunucu
   bileşeninde client-only kullanım gibi hataları yakalar.
4. **DB sağlık** — [`db-check.ts`](./db-check.ts):
   - DB bağlantısı
   - Bekleyen/hatalı migration
   - Temel tabloların sayımı (User > 0, ListingTypeCatalog > 0, …)
   - En az 1 aktif ADMIN kullanıcı
   - Property sorgu hızı (< 1s)
   - Veri tutarlılığı: `listingTypes` dolu, `price > 0`,
     yetim Block yok
   - `public/uploads/` erişilebilir
5. **HTTP smoke** — [`http-smoke.sh`](./http-smoke.sh):
   - `/` 307 (login redirect)
   - `/login` 200
   - `/api/auth/csrf` 200
   - Korunan endpoint'ler (auth yokken) 307/401 — bypass yok

### `npm run deploy` (full deploy)

`check`'in üstüne:

6. **`prisma migrate deploy`** — bekleyen şema değişikliklerini uygular
7. **`sudo systemctl restart emlak-crm`** — servis yeniden başlatılır
8. **Servis bekle** — `/api/auth/csrf` 200 dönene kadar (max 30s)
9. **Post-restart HTTP smoke** — yeni kod gerçekten çalışıyor mu

Herhangi adım fail ise script durur, çıkış kodu 1 olur. Sonraki adım çalışmaz.

## Adım atlama

Geliştirme sırasında bazı adımları atlayabilirsiniz:

```bash
SKIP_BUILD=1 npm run check    # build'i atla (typecheck zaten yapıyor)
SKIP_HTTP=1 npm run check     # HTTP smoke'u atla (servis kapalıyken)
DRY_RUN=1 npm run deploy      # migrate/restart YAPMA, sadece pre-deploy
```

`deploy.sh` HTTP smoke'u her zaman atlar pre-deploy aşamasında, çünkü
restart sonrası zaten yeniden koşacak.

## Yeni bir kontrol nasıl eklenir?

**DB / data tutarlılık kontrolü:**
[`db-check.ts`](./db-check.ts) sonuna bir blok ekleyin:

```ts
try {
  const x = await prisma.someThing.count({ where: { /* ... */ } });
  record("Kontrol adı", x === 0, x === 0 ? "OK" : `${x} sorunlu`);
} catch (e) {
  record("Kontrol adı", false, String(e));
}
```

**HTTP smoke:**
[`http-smoke.sh`](./http-smoke.sh) içinde:

```bash
check "Yeni endpoint" "$BASE/api/yeni-endpoint" "200,307"
```

## İleride eklenebilir

- **Playwright E2E**: Login + portföy aç + "Yeni İlan" butonuna tıkla + form
  açıldı mı. Buton-davranış bug'larını yakalar. `npm install -D @playwright/test`
- **Görsel regression**: Storybook + Chromatic
- **Performance budget**: Lighthouse CI, bundle boyutu
- **DB query plan analizi**: Slow query log → otomatik index önerisi

Şu an temel zincir yeterli — kullandıkça eksik gördüklerinizi ekleyin.
