# Panduan Deploy Hermes ke Tencent VPS (untuk Pemula)

Target: server Ubuntu 24.04 LTS di Tencent Cloud CVM, diakses dari Mac M1, tanpa
Docker, deployment manual lewat SSH dan Git.

**Arsitektur akhir:**

```text
Hermes Agent -> HTTPS -> Nginx -> API Bun/Hono (127.0.0.1:3000) -> PostgreSQL
```

`apps/web` belum dideploy sebagai frontend publik di panduan ini. Vite dev server
tidak boleh dibuka ke internet; frontend production butuh desain autentikasi/BFF
tersendiri, di luar cakupan dokumen ini.

**Aturan yang berlaku di semua langkah:**

- Repository: `git@github.com:ooogarin/hermes-assistant.git`, branch awal
  `feat/modules` (ganti kalau branch production sudah ditentukan).
- API selalu bind ke `127.0.0.1:3000` saja, PostgreSQL hanya menerima koneksi lokal.
  Keduanya **tidak pernah** dibuka ke internet.
- Jangan pernah commit password, private key, token, API key, atau file `.env`
  production ke Git.

---

## 0. Istilah yang perlu kamu tahu dulu

- **VPS** — komputer server di cloud, diakses lewat SSH seperti Terminal jarak jauh.
- **SSH key pair** — dua file kunci: *private key* tetap di Mac kamu (jangan pernah
  dikirim ke mana pun), *public key* dipasang di server. Dengan ini kamu login tanpa
  password.
- **User `hermes`** — akun Linux khusus (bukan root) yang menjalankan aplikasi. Dibuat
  demi keamanan, supaya root tidak dipakai sehari-hari.
- **systemd** — sistem Ubuntu yang menjaga API tetap hidup dan otomatis restart kalau
  crash, mirip "PM2" tapi bawaan OS.
- **Nginx** — reverse proxy: menerima trafik HTTPS dari internet di port 443, lalu
  meneruskannya ke API yang jalan di `127.0.0.1:3000`.

Perintah dengan awalan `sudo` butuh hak admin. Perintah tanpa `sudo` yang saya tandai
"sebagai user `hermes`" harus dijalankan setelah kamu pindah ke user itu — caranya ada
di Bagian 5.

---

## 1. Siapkan SSH Key di Mac (lakukan ini duluan)

Buat key baru khusus untuk project ini:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tencent-hermes -C "hermes-tencent-vps"
chmod 600 ~/.ssh/tencent-hermes
chmod 644 ~/.ssh/tencent-hermes.pub
cat ~/.ssh/tencent-hermes.pub
```

Perintah terakhir menampilkan isi public key — salin seluruh baris yang muncul
(dimulai dengan `ssh-ed25519 ...`). Ini yang akan kamu tempel ke Tencent di langkah
berikutnya.

> Kenapa bikin key dulu sebelum bikin VPS? Karena saat membuat instance, Tencent akan
> minta kamu memilih/mengupload SSH key untuk dipasang otomatis di server. Kalau
> key-nya sudah siap duluan, kamu tinggal upload — tidak perlu bongkar-pasang lagi
> setelah server jalan.

---

## 2. Buat VPS di Tencent Cloud Console

1. Buka **Cloud Virtual Machine (CVM)** → **Create Instance**.
2. Pilih region yang paling dekat/relevan (memengaruhi latency dan biaya).
3. Pilih image **Ubuntu Server 24.04 LTS 64-bit**.
4. Pilih ukuran instance. Minimal disarankan **2 vCPU / 2GB RAM** untuk Bun +
   PostgreSQL + Nginx sekaligus. Kalau kamu ambil yang 1GB RAM, wajib tambah swap
   (ada di Bagian 4) atau Postgres berisiko gagal saat beban naik. Kamu selalu bisa
   upgrade ukuran nanti setelah lihat pemakaian resource sebenarnya.
5. Saat diminta SSH key pair: **upload public key** yang kamu salin di Bagian 1
   (`~/.ssh/tencent-hermes.pub`). Jangan pilih opsi "generate key baru dari Tencent"
   di langkah ini — cukup satu sumber key supaya tidak bingung nanti.
6. Aktifkan Elastic IP, atau catat public IP instance dari halaman detail.
7. Di **Security Group**, atur:
   - Port `22` (SSH): izinkan **hanya dari IP publik Mac kamu**. Cek IP kamu di
     `https://ifconfig.me`. Kalau IP rumah/kantormu sering berubah, kamu bisa
     mengizinkan rentang IP ISP, atau andalkan `fail2ban` (opsional, Bagian 4) sebagai
     lapisan tambahan.
   - Port `80` dan `443` (HTTP/HTTPS): izinkan dari semua (`0.0.0.0/0`) — ini nanti
     dipakai Nginx untuk trafik publik.
   - **Jangan** buka port `3000` (API) atau `5432` (PostgreSQL) ke internet sama
     sekali. Keduanya cukup diakses dari `127.0.0.1` di dalam server sendiri.

---

## 3. Login Pertama ke VPS

Setelah instance aktif dan kamu punya public IP-nya, tambahkan alias di Mac supaya
tidak perlu ketik IP dan flag setiap kali connect. Edit atau buat file
`~/.ssh/config`:

```sshconfig
Host hermes-vps
    HostName VPS_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/tencent-hermes
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Ganti `VPS_PUBLIC_IP` dengan IP asli. Username awal biasanya `ubuntu`, tapi cek di
halaman detail instance Tencent Console kalau ragu (bisa juga `root`).

Uji koneksi:

```bash
ssh hermes-vps
```

Pada koneksi pertama akan muncul pertanyaan konfirmasi fingerprint host. Verifikasi
angkanya lewat menu "Login"/detail instance di Tencent Console sebelum menjawab
`yes`, supaya kamu yakin tersambung ke server yang benar, bukan hasil penyadapan.

---

## 4. Hardening Awal (amankan server sebelum instal apa pun)

Jalankan di terminal VPS (setelah `ssh hermes-vps` berhasil):

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git ufw unattended-upgrades
```

Buat user khusus untuk aplikasi:

```bash
sudo adduser --disabled-password --gecos "" hermes
sudo usermod -aG sudo hermes
sudo install -d -m 700 -o hermes -g hermes /home/hermes/.ssh
sudo cp ~/.ssh/authorized_keys /home/hermes/.ssh/authorized_keys
sudo chown hermes:hermes /home/hermes/.ssh/authorized_keys
sudo chmod 600 /home/hermes/.ssh/authorized_keys
```

Perintah `cp ~/.ssh/authorized_keys` menyalin public key yang sama (yang kamu upload
di Bagian 2) ke user `hermes`, jadi kamu bisa login sebagai `hermes` dengan private
key yang sama tanpa setup key baru.

**Buka terminal Mac kedua** (biarkan sesi pertama tetap terbuka) dan tes login
sebagai `hermes`:

```bash
ssh -i ~/.ssh/tencent-hermes hermes@VPS_PUBLIC_IP
```

Baru kalau login kedua ini **berhasil**, lanjutkan di terminal pertama untuk
menonaktifkan password login dan root login lewat SSH:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sshd -t
sudo systemctl restart ssh
```

`sudo sshd -t` mengecek validitas config sebelum restart — kalau ada error, SSH tidak
akan direstart dan kamu tidak akan terkunci.

Aktifkan firewall:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Aktifkan update keamanan otomatis:

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Perintah ini membuka layar biru interaktif menanyakan "Automatically download and
install stable updates?" — pilih **Yes**, ini normal.

> **Penting:** jangan tutup terminal pertama sampai kamu membuka **terminal ketiga**
> dan berhasil `ssh hermes-vps` lagi dari awal (sebagai user `hermes`, tanpa
> password). Kalau ada yang salah, sesi lama yang masih terbuka adalah jalan
> keluarmu untuk memperbaiki tanpa perlu rebuild instance dari nol.

**Opsional — disarankan kalau IP Mac kamu sering berubah:**

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

`fail2ban` otomatis memblokir sementara IP yang berkali-kali gagal login SSH.

**Opsional — wajib kalau RAM VPS ≤ 2GB:**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

Ini mencegah server hang/OOM saat Postgres dan Bun jalan bersamaan di RAM kecil.

---

## 5. Siapkan Akses VPS ke GitHub

Mulai dari sini, kerjakan **sebagai user `hermes`**. Kalau kamu masih login sebagai
`ubuntu`/`root`, pindah dulu:

```bash
sudo -iu hermes
whoami
```

Pastikan outputnya `hermes` sebelum lanjut.

Untuk repository private, buat deploy key read-only khusus VPS ini (bukan personal
access token, bukan key pribadimu):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-hermes -C "hermes-vps-github-readonly"
chmod 600 ~/.ssh/github-hermes
cat ~/.ssh/github-hermes.pub
```

Salin outputnya, lalu di GitHub buka repository `ooogarin/hermes-assistant` →
**Settings** → **Deploy keys** → **Add deploy key**. Beri nama
`hermes-vps-readonly`, tempel public key, dan **jangan** centang "Allow write
access" — server ini hanya perlu menarik (pull) kode, tidak pernah mendorong (push).

Buat alias khusus GitHub supaya `git clone`/`pull` otomatis pakai key ini:

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

Perintah terakhir akan menampilkan pesan sukses dari GitHub (bukan shell login,
memang begitu untuk Git over SSH).

Clone repository ke direktori aplikasi:

```bash
sudo mkdir -p /opt/hermes
sudo chown hermes:hermes /opt/hermes
cd /opt/hermes
git clone --branch feat/modules git@github-hermes:ooogarin/hermes-assistant.git app
cd /opt/hermes/app
```

---

## 6. Install Bun dan PostgreSQL

Masih sebagai user `hermes`:

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

Pastikan versinya `1.4` atau lebih baru.

Sebelum lanjut ke langkah instalasi dependency nanti, cek dulu script apa saja yang
benar-benar ada di project ini — jangan asumsikan nama seperti `db:status` atau
`start:api` pasti tersedia:

```bash
cat package.json | grep -A 30 '"scripts"'
```

Catat nama script yang sesuai (migrate, start, dsb.) untuk dipakai di Bagian 8 dan 9.

Install PostgreSQL:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
sudo -u postgres createuser --pwprompt hermes
sudo -u postgres createdb --owner=hermes hermes
```

Saat `createuser --pwprompt`, kamu akan diminta membuat password baru untuk user
database `hermes` — catat password ini, akan dipakai di `.env` (Bagian 7).

Pastikan PostgreSQL benar-benar hanya bisa diakses secara lokal:

```bash
sudo -u postgres psql -c "SHOW listen_addresses;"
sudo ss -lntp | grep 5432 || true
```

`listen_addresses` idealnya menunjukkan `localhost`, dan hasil `ss` tidak boleh
menampilkan alamat selain `127.0.0.1`.

---

## 7. Buat `.env` Production

Di `/opt/hermes/app`:

```bash
ls -la .env.example
```

Kalau file itu ada:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Kalau `.env.example` **tidak ada** di repo, buat file `.env` kosong dan isi manual
berdasarkan variabel yang dibaca kode (biasanya ada di folder `src/config` atau
sejenisnya).

Isi minimal yang dibutuhkan:

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

Ganti `DB_PASSWORD` dengan password yang kamu buat saat `createuser --pwprompt` di
Bagian 6.

Untuk `INTERNAL_API_KEY`, generate secret acak lalu tempel ke `.env`:

```bash
openssl rand -base64 48
```

Secret ini harus minimal 32 karakter, dan nilainya nanti harus **sama persis** dengan
`HERMES_INTERNAL_API_KEY` di sisi Hermes Agent. `HERMES_API_BASE_URL` di sisi Agent
harus mengarah ke origin API publik, misalnya `https://api.example.com` (domain yang
akan kamu setup di Bagian 10).

---

## 8. Install Dependency dan Smoke Test

```bash
cd /opt/hermes/app
bun install --frozen-lockfile
bun run db:migrate
bun run start:api
```

(Sesuaikan nama script dengan yang kamu catat di Bagian 6 kalau berbeda.)

Biarkan proses ini berjalan di terminal. Buka **terminal lain**, login lagi sebagai
`hermes`, dan uji API-nya:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/health/ready
curl -H 'Authorization: Bearer NILAI_INTERNAL_API_KEY_ASLI' http://127.0.0.1:3000/api/v1/notes
```

Ganti `NILAI_INTERNAL_API_KEY_ASLI` dengan isi `INTERNAL_API_KEY` sungguhan dari
`.env` kamu (bukan teks placeholder).

Kalau ketiganya merespons wajar (bukan connection refused / 500), berarti API dan
koneksi database sudah benar. Hentikan proses foreground dengan `Ctrl-C` — mulai
Bagian 9, API akan dijalankan lewat systemd, bukan manual seperti ini.

---

## 9. Jalankan API dengan systemd

Buat service file (butuh `sudo`):

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
EnvironmentFile=/opt/hermes/app/.env
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

`EnvironmentFile=/opt/hermes/app/.env` memastikan systemd memuat semua variabel di
`.env` kamu, jadi API tidak perlu bergantung pada apakah kodenya sendiri sudah
auto-load dotenv atau belum.

`ProtectSystem=strict` + `ReadWritePaths` membatasi service ini hanya boleh menulis
ke folder aplikasinya sendiri, sebagai lapisan keamanan tambahan kalau ada bug atau
serangan.

Uji ulang lewat localhost, sekarang tanpa proses foreground:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/health/ready
```

Kalau API sempat kamu ubah/update `.env` di kemudian hari, jangan lupa
`sudo systemctl restart hermes-api` supaya perubahan terbaca.

---

## 10. Nginx dan HTTPS

Arahkan DNS domain kamu (`api.example.com`) ke Elastic IP VPS lewat panel DNS
provider domain kamu. Tunggu propagasi (cek dengan `dig api.example.com` atau situs
seperti dnschecker.org) sebelum lanjut, biasanya beberapa menit sampai beberapa jam.

Install Nginx dan Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Buat konfigurasi reverse proxy:

```bash
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
```

Ganti `api.example.com` di file config dengan domain asli kamu sebelum lanjut.

Aktifkan HTTPS:

```bash
sudo certbot --nginx -d api.example.com
```

Certbot otomatis menambahkan blok `listen 443 ssl` dan redirect HTTP→HTTPS ke config
di atas — kamu tidak perlu menuliskannya manual. Certbot juga otomatis pasang cron
untuk perpanjangan sertifikat.

Tes dari luar:

```bash
curl https://api.example.com/health
curl https://api.example.com/health/ready
```

HTTPS di sini hanya mengenkripsi koneksi — tidak menggantikan autentikasi. Semua
request ke `/api/v1/...` tetap wajib menyertakan header `Authorization: Bearer
<INTERNAL_API_KEY>`.

---

## 11. Update / Deploy Ulang

Setiap kali ada perubahan kode yang mau dideploy:

```bash
ssh hermes-vps
sudo -iu hermes   # kalau login awal bukan sebagai hermes
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

`--ff-only` mencegah Git membuat merge commit otomatis di server — kalau history di
server dan di GitHub sudah menyimpang, pull akan gagal dan menampilkan pesan error,
bukan diam-diam menggabungkan history dengan cara yang tidak kamu duga.

Kalau pull gagal karena ada perubahan lokal di server atau branch menyimpang,
periksa dulu dengan `git status` dan `git log`. **Jangan** langsung pakai
`git reset --hard` tanpa memahami apa yang akan hilang. Perintah `db:rollback` (kalau
ada) berisiko menghapus data dan harus ditinjau dulu sebelum dijalankan, jangan
dipakai reflex saat panik.

---

## 12. Backup dan Monitoring Minimum

Checklist rutin:

- Aktifkan snapshot terjadwal di Tencent Cloud Console.
- Buat backup PostgreSQL terpisah **dan** uji proses restore-nya secara berkala —
  backup yang tidak pernah dicoba di-restore sering ternyata rusak saat baru
  dibutuhkan.
- Pantau disk, RAM, CPU, status service (`hermes-api`, `postgresql`), dan masa
  berlaku sertifikat TLS.
- Kalau health check gagal, langkah pertama selalu: `sudo journalctl -u hermes-api
  -n 100 --no-pager`.
- Backup yang disimpan di VPS yang sama **bukan** perlindungan dari kehilangan
  seluruh instance (misalnya kalau instance-nya terhapus). Kirim salinan ke tempat
  lain — object storage Tencent COS, atau di-download manual secara berkala.

Backup manual sekali jalan:

```bash
sudo install -d -m 700 -o hermes -g hermes /var/backups/hermes
sudo -u hermes pg_dump --format=custom --file=/var/backups/hermes/hermes-$(date +%F).dump hermes
```

Otomatiskan dengan cron supaya tidak lupa (contoh: jalan tiap hari jam 02:00, hapus
yang lebih tua dari 7 hari):

```bash
sudo -u hermes crontab -e
```

Tambahkan baris berikut di editor yang terbuka:

```cron
0 2 * * * pg_dump --format=custom --file=/var/backups/hermes/hermes-$(date +\%F).dump hermes && find /var/backups/hermes -name '*.dump' -mtime +7 -delete
```

Cara menguji bahwa backup memang bisa dipulihkan (lakukan ini sekali sebagai
latihan, jangan tunggu sampai butuh sungguhan):

```bash
sudo -u postgres createdb hermes_restore_test
pg_restore --dbname=hermes_restore_test /var/backups/hermes/hermes-TANGGAL.dump
sudo -u postgres dropdb hermes_restore_test
```

---

## Checklist Akhir

- [ ] SSH key dibuat di Mac **sebelum** instance dibuat, dan sudah diupload saat create instance.
- [ ] Security Group: `22` dibatasi ke IP tertentu, `80`/`443` terbuka untuk publik, `3000`/`5432` tertutup total.
- [ ] SSH dari Mac dengan key berhasil.
- [ ] User `hermes` bisa login; login password dan root SSH sudah nonaktif (dicek dari sesi kedua yang masih terbuka sebelum sesi lama ditutup).
- [ ] UFW aktif dan statusnya benar (`sudo ufw status verbose`).
- [ ] (Opsional) fail2ban aktif kalau IP Mac dinamis.
- [ ] (Opsional) swap aktif kalau RAM ≤ 2GB.
- [ ] GitHub deploy key read-only berhasil connect (`ssh -T github-hermes`).
- [ ] Script di `package.json` (migrate, start, dsb.) sudah dicek memang ada dan namanya sesuai yang dipakai di dokumen.
- [ ] Bun ≥ 1.4 dan PostgreSQL terpasang; Postgres hanya `listen_addresses = localhost`.
- [ ] Migration database berhasil dijalankan.
- [ ] `.env` production permission `600`, isinya secret asli (bukan placeholder), `DB_PASSWORD` cocok dengan user Postgres.
- [ ] `hermes-api.service` aktif, `EnvironmentFile` mengarah ke `.env`, restart otomatis terverifikasi (`systemctl status`).
- [ ] `/health` dan `/health/ready` sukses lewat `127.0.0.1` **dan** lewat domain HTTPS.
- [ ] Nginx + Certbot aktif, sertifikat TLS valid.
- [ ] Backup PostgreSQL terjadwal via cron, ditambah snapshot Tencent.
- [ ] Proses restore backup sudah pernah dites minimal satu kali dan berhasil.
