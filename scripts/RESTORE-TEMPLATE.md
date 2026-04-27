# Sıfırdan Yeni Sunucuya Kurulum (Disaster Recovery)

Bu yedek klasörü, **bir sunucuda hiçbir şey olmasa bile** Emlak CRM'i ayağa kaldırmak için yeterlidir.

## 0. Yeni sunucu ön gereksinimleri

Ubuntu 22.04 + 4GB RAM + 30GB disk yeterli. SSH erişimi olan bir kullanıcı (örn. `crmadmin`) açın.

```bash
sudo apt update && sudo apt install -y curl git nginx docker.io docker-compose
sudo usermod -aG docker $USER
# Node.js 22+ kur (Next.js 16 için)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
```

## 1. Bu yedek klasörünü yeni sunucuya indir

Drive'dan tüm `__TAG__/` klasörünü `/home/crmadmin/restore/`'a kopyala (rclone veya web indirme):

```bash
mkdir -p /home/crmadmin/restore && cd /home/crmadmin/restore
# Drive'dan rclone ile (rclone config kurduktan sonra):
rclone copy drive:emlak-crm-backups/__TAG__ .
```

## 2. Kaynak kodu aç

İki seçenek var:

**A) Hızlı (sadece HEAD anlık görüntüsü):**
```bash
mkdir -p /home/crmadmin/emlak-crm-app
tar xzf /home/crmadmin/restore/source.tar.gz -C /home/crmadmin/emlak-crm-app
```

**B) Tüm git geçmişiyle (rollback için):**
```bash
cd /home/crmadmin
git clone /home/crmadmin/restore/git-history.bundle emlak-crm-app
cd emlak-crm-app
git checkout main
```

## 3. Sistem dosyalarını yerleştir

```bash
cd /home/crmadmin/emlak-crm-app
cp /home/crmadmin/restore/dotenv .env
chmod 600 .env
cp /home/crmadmin/restore/docker-compose.yml .

sudo cp /home/crmadmin/restore/emlak-crm.service /etc/systemd/system/
sudo cp /home/crmadmin/restore/nginx-emlak-crm.conf /etc/nginx/sites-available/emlak-crm
sudo ln -s /etc/nginx/sites-available/emlak-crm /etc/nginx/sites-enabled/
```

## 4. PostgreSQL (Docker) ayağa kaldır

```bash
cd /home/crmadmin/emlak-crm-app
sudo docker compose up -d
# DB hazır mı bekle:
until sudo docker exec emlak-crm-db pg_isready -U emlak; do sleep 1; done
```

## 5. Veritabanı dump'ını yükle

```bash
sudo docker exec -i emlak-crm-db psql -U emlak -d emlak_crm < /home/crmadmin/restore/db.sql
```

## 6. Uploads klasörünü yerine koy

```bash
cd /home/crmadmin/emlak-crm-app
mkdir -p public
tar xzf /home/crmadmin/restore/uploads.tar.gz -C public/
```

## 7. Bağımlılıkları kur, Prisma, build

```bash
cd /home/crmadmin/emlak-crm-app
npm install
set -a; source .env; set +a
npx prisma generate
npx prisma migrate deploy   # zaten uygulanmış migration'lar atlanır
npm run build
```

## 8. Servisi başlat

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now emlak-crm
sudo systemctl status emlak-crm
```

## 9. Nginx + SSL

```bash
sudo nginx -t && sudo systemctl reload nginx
# Let's Encrypt yenile (eski sertifikayı kullanmıyoruz):
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d crm.artinvertsment.com
```

DNS'in yeni sunucu IP'sine bakıyor olması gerekir. Aksi halde önce Cloudflare A kaydını yeni IP'ye çevir, beklemeden yapacaksan `--standalone` kullan.

## 10. Doğrulama

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/login   # 200 olmalı
sudo systemctl is-active emlak-crm                                      # active
sudo docker exec emlak-crm-db psql -U emlak -d emlak_crm -c "SELECT COUNT(*) FROM \"Customer\";"
```

## Bu yedekte ne var, ne yok

| Bileşen | Durum |
|---|---|
| Veritabanı (db.sql) | ✅ Tam |
| Yüklenen fotoğraflar (uploads.tar.gz) | ✅ Tam |
| Kaynak kod (source.tar.gz) | ✅ HEAD anlık |
| Tüm git geçmişi (git-history.bundle) | ✅ Tüm tag/commit |
| Ortam değişkenleri (.env / dotenv) | ✅ DB şifresi, NEXTAUTH_SECRET dahil |
| nginx config | ✅ |
| systemd service | ✅ |
| docker-compose.yml | ✅ |
| Schema snapshot (schema.prisma) | ✅ |
| Migration listesi | ✅ |
| Kurulu paket listesi (referans) | ✅ |
| Let's Encrypt sertifikası | ❌ Yenisi alınır (certbot adım 9) |
| DNS / Cloudflare ayarları | ❌ Manuel (A kaydı yeni IP'ye) |
| Sunucu güvenlik politikası (fail2ban, SSH key, port) | ❌ Yeniden kur |
