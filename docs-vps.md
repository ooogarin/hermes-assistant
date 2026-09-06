# Deployment Hermes ke Tencent VPS

Panduan ini untuk setup Hermes dari nol di Tencent Cloud CVM dengan Ubuntu 24.04 LTS,
Mac M1, tanpa Docker, dan deployment manual melalui SSH dan Git.

## Arsitektur

```text
Hermes Agent -> HTTPS -> Nginx -> API Bun/Hono (127.0.0.1:3000) -> PostgreSQL
```

`apps/web` belum dideploy sebagai frontend publik. Vite dev server tidak boleh dibuka
ke internet; frontend production membutuhkan desain autentikasi/BFF tersendiri.

## Asumsi dan aturan

- Gunakan Ubuntu Server 24.04 LTS 64-bit pada Tencent CVM.
- Repository: `git@github.com:ooogarin/hermes-assistant.git`.
- Branch awal: `feat/modules`; ganti jika branch production sudah ditentukan.
- API memakai `127.0.0.1:3000`; PostgreSQL hanya menerima koneksi lokal.
- Jangan simpan password, private key, token, API key, atau `.env` production di Git.

## 1. Buat VPS Tencent

Di Tencent Cloud Console:

1. Pilih **Cloud Virtual Machine (CVM)** -> **Create Instance**.
2. Pilih region yang sesuai dengan latency dan biaya.
3. Pilih image **Ubuntu Server 24.04 LTS 64-bit**.
4. Pilih ukuran kecil yang cukup untuk Bun dan PostgreSQL; upgrade setelah monitoring.
5. Buat/pilih SSH key pair dan simpan private key hanya di Mac.
6. Beri Elastic IP atau catat public IP VPS.
7. Pada Security Group, izinkan TCP `22` dari IP yang diperlukan, serta `80`/`443`
   jika API akan memakai domain HTTPS.
8. Jangan buka TCP `3000` atau `5432` ke internet.

## 2. Akses VPS dari Mac M1 melalui SSH

Mac M1 tidak memerlukan langkah khusus. Gunakan key khusus Hermes.

Jika Tencent memberikan file key:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
chmod 600 ~/.ssh/tencent-hermes.pem
```

Atau buat key baru:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tencent-hermes -C "hermes-tencent-vps"
chmod 600 ~/.ssh/tencent-hermes
chmod 644 ~/.ssh/tencent-hermes.pub
```

Tambahkan alias ke `~/.ssh/config` (sesuaikan IP dan username):

```sshconfig
Host hermes-vps
    HostName VPS_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/tencent-hermes
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Username awal Tencent dapat berupa `ubuntu` atau `root`. Uji koneksi:

```bash
ssh hermes-vps
```

Pada koneksi pertama, verifikasi fingerprint host melalui console Tencent sebelum
menjawab `yes`.

## 3. Hardening awal VPS

Jalankan di terminal VPS:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git ufw unattended-upgrades
sudo adduser --disabled-password --gecos "" hermes
sudo usermod -aG sudo hermes
sudo install -d -m 700 -o hermes -g hermes /home/hermes/.ssh
sudo cp ~/.ssh/authorized_keys /home/hermes/.ssh/authorized_keys
sudo chown hermes:hermes /home/hermes/.ssh/authorized_keys
sudo chmod 600 /home/hermes/.ssh/authorized_keys
```

Uji login baru dari terminal Mac kedua:

```bash
ssh -i ~/.ssh/tencent-hermes hermes@VPS_PUBLIC_IP
```

Setelah berhasil, nonaktifkan password dan root SSH. Jangan menutup sesi lama sebelum
login baru teruji:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sshd -t
sudo systemctl restart ssh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 4. Siapkan akses VPS ke GitHub

Untuk repository private, buat deploy key read-only sebagai user `hermes` di VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-hermes -C "hermes-vps-github-readonly"
chmod 600 ~/.ssh/github-hermes
cat ~/.ssh/github-hermes.pub
```

Di GitHub: repository `ooogarin/hermes-assistant` -> **Settings** -> **Deploy keys**
-> **Add deploy key**. Gunakan nama `hermes-vps-readonly` dan jangan aktifkan write access.

Konfigurasi alias GitHub:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-hermes
    HostName github.com
    User git
    IdentityFile ~/.ssh/github-hermes
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh-keyscan github.com >> ~/.ssh/known_hosts
ssh -T github-hermes
```

Clone repository:

```bash
sudo mkdir -p /opt/hermes
sudo chown hermes:hermes /opt/hermes
cd /opt/hermes
git clone --branch feat/modules git@github-hermes:ooogarin/hermes-assistant.git app
cd /opt/hermes/app
```

## 5. Install Bun dan PostgreSQL

Sebagai user `hermes`, install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

Versi Bun harus `1.4` atau lebih baru. Install PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
sudo -u postgres createuser --pwprompt hermes
sudo -u postgres createdb --owner=hermes hermes
```

Pastikan PostgreSQL tidak dibuka ke internet:

```bash
sudo -u postgres psql -c "SHOW listen_addresses;"
sudo ss -lntp | grep 5432 || true
```

## 6. Buat `.env` production

Di `/opt/hermes/app`, buat file yang tidak di-commit:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Gunakan nilai berikut dan ganti semua placeholder:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
READINESS_TIMEOUT_MS=2000
DATABASE_URL=postgresql://hermes:DB_PASSWORD@127.0.0.1:5432/hermes
INTERNAL_API_KEY=RANDOM_SECRET_MINIMUM_32_CHARACTERS
API_PROXY_TARGET=http://127.0.0.1:3000
```

Buat secret API, lalu salin hasilnya ke `.env`:

```bash
openssl rand -base64 48
```

`INTERNAL_API_KEY` harus minimal 32 karakter dan nanti sama dengan
`HERMES_INTERNAL_API_KEY` pada Hermes Agent. `HERMES_API_BASE_URL` mengarah ke origin
API, misalnya `https://api.example.com`.

## 7. Install dependency dan jalankan smoke test

```bash
cd /opt/hermes/app
bun install --frozen-lockfile
bun run db:status
bun run db:migrate
bun run start:api
```

Dari terminal VPS lain, uji:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/health/ready
curl -H 'Authorization: Bearer INTERNAL_API_KEY' http://127.0.0.1:3000/api/v1/notes
```

Jika berhasil, hentikan proses foreground dengan `Ctrl-C`.

## 8. Jalankan API dengan systemd

Buat service sebagai user sudo:

```bash
sudo tee /etc/systemd/system/hermes-api.service >/dev/null <<'EOF'
[Unit]
Description=Hermes API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=hermes
Group=hermes
WorkingDirectory=/opt/hermes/app
ExecStart=/home/hermes/.bun/bin/bun run start:api
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/hermes/app

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now hermes-api
sudo systemctl status hermes-api --no-pager
sudo journalctl -u hermes-api -n 100 --no-pager
```

Uji ulang `health` dan `health/ready` melalui localhost.

## 9. Nginx dan HTTPS (saat domain siap)

Arahkan DNS `api.example.com` ke Elastic IP VPS, lalu:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo tee /etc/nginx/sites-available/hermes-api >/dev/null <<'EOF'
server {
    listen 80;
    server_name api.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/hermes-api /etc/nginx/sites-enabled/hermes-api
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.example.com
curl https://api.example.com/health
curl https://api.example.com/health/ready
```

HTTPS tidak menggantikan API key. Route aplikasi tetap memakai header Bearer.

## 10. Update manual

```bash
ssh hermes-vps
cd /opt/hermes/app
git status --short
git fetch origin
git pull --ff-only origin feat/modules
bun install --frozen-lockfile
bun run db:migrate
sudo systemctl restart hermes-api
sudo systemctl status hermes-api --no-pager
curl http://127.0.0.1:3000/health/ready
```

`--ff-only` mencegah merge commit otomatis di server. Jika pull gagal karena perubahan
lokal atau branch menyimpang, periksa Git; jangan memakai `git reset --hard` tanpa
keputusan eksplisit. `db:rollback` berisiko menghapus data dan harus ditinjau dahulu.

## 11. Backup dan monitoring minimum

- Aktifkan snapshot terjadwal Tencent.
- Buat backup PostgreSQL terpisah dan uji restore.
- Pantau disk, RAM, CPU, status service, PostgreSQL, dan masa berlaku TLS.
- Periksa `journalctl -u hermes-api` ketika health check gagal.
- Backup pada VPS yang sama bukan perlindungan dari kehilangan seluruh instance.

Contoh backup manual:

```bash
sudo install -d -m 700 -o hermes -g hermes /var/backups/hermes
sudo -u hermes pg_dump --format=custom --file=/var/backups/hermes/hermes-$(date +%F).dump hermes
```

## Checklist

- [ ] Security Group hanya membuka port yang diperlukan.
- [ ] SSH dari Mac dengan key berhasil.
- [ ] User `hermes` dapat login; root/password SSH nonaktif.
- [ ] UFW aktif.
- [ ] GitHub deploy key read-only berhasil.
- [ ] Bun dan PostgreSQL terpasang.
- [ ] Migration berhasil.
- [ ] `.env` production permission `600` dan secret nyata.
- [ ] `hermes-api.service` aktif dan restart otomatis.
- [ ] `/health` dan `/health/ready` berhasil.
- [ ] Nginx/HTTPS aktif jika API diakses dari internet.
- [ ] Backup PostgreSQL dan snapshot Tencent direncanakan.
