# Panduan Deploy Hermes ke Tencent VPS (untuk Pemula)

Target: server Ubuntu 24.04 LTS di Tencent Cloud CVM, diakses dari Mac M1, tanpa
Docker, deployment manual lewat SSH dan Git.

**Arsitektur akhir yang direkomendasikan:**

```text
Telegram
   |
   | koneksi keluar melalui Telegram Bot API
   v
Hermes Gateway + Hermes Agent (user hermes-agent)
   |
   | http://127.0.0.1:3000 + internal API key
   v
API Bun/Hono (user hermes) -> PostgreSQL (localhost)
```

Hermes Agent, API, dan PostgreSQL berjalan di VPS yang sama. Karena itu, API tidak
perlu dibuka ke internet untuk penggunaan Telegram. Nginx, domain, serta HTTPS hanya
diperlukan jika kelak ada client lain yang harus mengakses API dari luar VPS.

`apps/web` belum dideploy sebagai frontend publik di panduan ini. Vite dev server
tidak boleh dibuka ke internet; frontend production butuh desain autentikasi/BFF
tersendiri, di luar cakupan dokumen ini.

**Aturan yang berlaku di semua langkah:**

- Repository: `git@github.com:ooogarin/hermes-assistant.git`, branch deployment
  `main`.
- Hermes memakai provider/model cloud melalui API atau OAuth. Menjalankan model LLM
  lokal tidak termasuk panduan ini dan tidak realistis pada VPS kecil 2 GB.
- API selalu bind ke `127.0.0.1:3000` dan PostgreSQL hanya menerima koneksi lokal.
  Keduanya **tidak pernah** dibuka ke internet.
- User `hermes` dipakai untuk SSH, pull repository, migrasi, dan service API. Runtime
  AI memakai user terpisah, `hermes-agent`, tanpa akses `sudo`, deploy key, password
  database, atau file `.env` API.
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

## 1. Audit VPS Tencent yang sudah ada

Panduan ini mengasumsikan CVM sudah dibuat sebelumnya. Jangan melakukan **Reinstall
System**, **Terminate**, format disk, atau perubahan Security Group sebelum kondisi
server dicatat dan data lama diamankan.

Di Tencent Cloud Console, buka detail instance lalu catat:

- instance ID, region, public IP, dan status instance;
- image/OS, jumlah vCPU, RAM, ukuran serta penggunaan disk;
- username login awal dan key/password yang saat ini dipakai;
- Security Group yang terpasang dan semua port inbound yang terbuka;
- aplikasi, database, domain, atau data lama yang masih menggunakan VPS tersebut.

Jika VPS berisi data atau service lain, buat snapshot Tencent terlebih dahulu dan
pastikan owner data menyetujui perubahan. Snapshot bukan pengganti backup database,
tetapi memberi titik pemulihan sebelum hardening dan instalasi.

Masuk menggunakan akses lama atau Tencent WebShell/VNC, lalu audit sistem tanpa
mengubah apa pun:

```bash
cat /etc/os-release
uname -m
nproc
free -h
df -hT
lsblk
sudo ss -lntup
sudo systemctl --type=service --state=running --no-pager
```

Target panduan ini adalah Ubuntu 24.04 LTS 64-bit. `uname -m` pada Tencent VPS
umumnya `x86_64`; Mac M1 tetap dapat mengaksesnya melalui SSH. Jika OS bukan Ubuntu
24.04, jangan langsung menjalankan command instalasi berikutnya—adaptasikan paketnya
atau rencanakan reinstall setelah seluruh data lama dibackup.

Minimum yang disarankan adalah 2 vCPU dan 2 GB RAM. Untuk RAM 2 GB atau kurang,
aktifkan swap pada Bagian 4. Pastikan disk memiliki ruang kosong yang cukup untuk
PostgreSQL, dependency Hermes Agent, log, dan backup.

Periksa Security Group existing:

- TCP `22`: batasi ke IP publik Mac/office yang diperlukan.
- TCP `80`/`443`: tutup untuk deployment Telegram-only; buka hanya jika Bagian 10
  benar-benar dipakai.
- TCP `3000` dan `5432`: harus tertutup dari internet.
- Outbound HTTPS dan DNS harus diizinkan agar VPS dapat mengakses GitHub, provider
  model, Telegram Bot API, repository paket, dan update keamanan.

## 2. Buat SSH key Hermes di Mac

Periksa dulu agar tidak menimpa key yang sudah ada:

```bash
ls -l ~/.ssh/tencent-hermes ~/.ssh/tencent-hermes.pub 2>/dev/null
```

Jika kedua file belum ada, buat key khusus project:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/tencent-hermes -C "hermes-tencent-vps"
chmod 600 ~/.ssh/tencent-hermes
chmod 644 ~/.ssh/tencent-hermes.pub
cat ~/.ssh/tencent-hermes.pub
```

Jika file sudah ada, jangan jalankan `ssh-keygen` lagi karena dapat menimpa key.
Gunakan key existing setelah memastikan kamu mengetahui asal dan fungsinya. Private
key tetap hanya di Mac; hanya isi file `.pub` yang boleh dipasang di VPS.

## 3. Pasang key ke VPS existing dan uji login

Gunakan pemasangan manual sebagai jalur utama. Ini jelas, tidak bergantung pada editor
terminal VNC, dan tidak mengubah key lama tanpa sengaja.

1. Di **Mac**, tampilkan lalu salin satu baris public key:

```bash
cat ~/.ssh/tencent-hermes.pub
```

Perintah ini harus dijalankan di Mac. File `.pub` tidak otomatis ada di VPS.

2. Di **VNC/WebShell Tencent** atau sesi SSH lama pada VPS, sebagai user target
   (contoh Ubuntu: `ubuntu`), periksa key yang sudah ada:

```bash
whoami
cat ~/.ssh/authorized_keys
```

3. Jika belum ada key `hermes-tencent-vps`, buat folder dan file SSH secara manual:

```bash
umask 077
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

4. Buka file dengan editor, lalu tempel satu baris public key dari Mac:

```bash
TERM=xterm nano ~/.ssh/authorized_keys
```

`TERM=xterm` diperlukan pada VNC Tencent ketika terminal melaporkan
`xterm-ghostty`, yang dapat membuat `nano` menolak dibuka. Di `nano`, pindah ke baris
kosong paling bawah, tempel **seluruh satu baris** output `cat
~/.ssh/tencent-hermes.pub` dari Mac, kemudian:

1. Tekan `Ctrl-O` untuk menyimpan.
2. Tekan `Enter` untuk mengonfirmasi nama file.
3. Tekan `Ctrl-X` untuk keluar.

Setelah itu verifikasi permission dan jumlah key:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
wc -l ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

Untuk VPS yang baru dibersihkan, hasil `wc -l` harus `1`. Jangan menutup VNC atau
sesi SSH lama sampai test key baru berhasil.

5. Di **Mac**, buat dan buka konfigurasi SSH:

```bash
mkdir -p ~/.ssh
touch ~/.ssh/config
chmod 600 ~/.ssh/config
nano ~/.ssh/config
```

Tambahkan blok berikut di bagian paling bawah file. Ganti `VPS_PUBLIC_IP` dengan IP
public CVM:

```sshconfig
Host hermes-vps
    HostName VPS_PUBLIC_IP
    User ubuntu
    IdentityFile ~/.ssh/tencent-hermes
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

6. Uji **key-only** dari Mac. Opsi ini melarang SSH fallback ke password, sehingga
   hasil sukses benar-benar membuktikan key yang dipakai:

```bash
ssh -o PasswordAuthentication=no \
  -o KbdInteractiveAuthentication=no \
  -o IdentitiesOnly=yes \
  -i ~/.ssh/tencent-hermes \
  ubuntu@VPS_PUBLIC_IP
```

Ganti `ubuntu` jika user existing berbeda. Jika command ini masih meminta password,
atau gagal dengan `Permission denied (publickey)`, key belum terbaca oleh server;
jangan lanjut hardening dan tetap gunakan VNC/sesi lama untuk memperbaikinya.

Pada koneksi pertama, verifikasi fingerprint host melalui console Tencent sebelum
menjawab `yes`. Hanya setelah key-only test berhasil, reset password atau nonaktifkan
password SSH pada Bagian 4.

**Alternatif otomatis:** jika kamu sudah tahu password OS atau memiliki key lama,
command berikut dapat menambahkan key dari Mac dalam satu langkah. Gunakan hanya jika
kamu memang ingin metode otomatis; hasilnya sama dengan pemasangan manual di atas.

```bash
cat ~/.ssh/tencent-hermes.pub | ssh ubuntu@VPS_PUBLIC_IP \
  'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys'
```

Jika tidak mempunyai akses SSH lama maupun VNC/WebShell, reset password melalui
Tencent Console adalah opsi pemulihan terakhir. Pada instance yang masih running,
Tencent dapat melakukan forced shutdown; buat snapshot dan jadwalkan downtime dahulu.

---

## 4. Hardening Awal (amankan server sebelum instal apa pun)

Jalankan di terminal VPS (setelah `ssh hermes-vps` berhasil):

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git rsync ufw unattended-upgrades
```

Buat user khusus untuk aplikasi:

```bash
sudo adduser --disabled-password --gecos "" hermes
sudo usermod -aG sudo hermes
sudo passwd hermes
sudo install -d -m 700 -o hermes -g hermes /home/hermes/.ssh
sudo cp ~/.ssh/authorized_keys /home/hermes/.ssh/authorized_keys
sudo chown hermes:hermes /home/hermes/.ssh/authorized_keys
sudo chmod 600 /home/hermes/.ssh/authorized_keys
```

Perintah `cp ~/.ssh/authorized_keys` menyalin public key yang dipasang pada Bagian 3
ke user `hermes`, jadi kamu bisa login sebagai `hermes` dengan private key yang sama
tanpa setup key baru. `passwd` digunakan untuk autentikasi `sudo`, bukan login SSH;
simpan password tersebut di password manager.

**Buka terminal Mac kedua** (biarkan sesi pertama tetap terbuka) dan tes login
sebagai `hermes`:

```bash
ssh -i ~/.ssh/tencent-hermes hermes@VPS_PUBLIC_IP
```

Setelah berhasil, ubah `User ubuntu` menjadi `User hermes` pada entry `Host
hermes-vps` di `~/.ssh/config` Mac. Baru kemudian lanjutkan di terminal pertama untuk
menonaktifkan password login dan root login lewat SSH:

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
sudo tee /etc/ssh/sshd_config.d/00-hermes-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
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
sudo ufw enable
sudo ufw status verbose
```

Jangan jalankan `ufw allow 80/tcp` atau `ufw allow 443/tcp` untuk deployment
Telegram-only. Tambahkan aturan tersebut nanti hanya jika Bagian 10 memang dipakai.

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
git clone --branch main git@github-hermes:ooogarin/hermes-assistant.git app
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
database `hermes`. Sebelum menjalankannya, buat password URL-safe dengan
`openssl rand -hex 24`, simpan di password manager, lalu paste pada prompt. Password
ini akan dipakai di `.env` (Bagian 7).

Pastikan PostgreSQL benar-benar hanya bisa diakses secara lokal:

```bash
sudo -u postgres psql -c "SHOW listen_addresses;"
sudo ss -lntp | grep 5432 || true
```

`listen_addresses` idealnya menunjukkan `localhost`. Hasil `ss` boleh menampilkan
`127.0.0.1:5432` dan `[::1]:5432` karena keduanya loopback lokal; tidak boleh ada
`0.0.0.0:5432`, public IP, atau `[::]:5432`.

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
openssl rand -hex 32
```

Secret ini harus minimal 32 karakter, dan nilainya nanti harus **sama persis** dengan
`HERMES_INTERNAL_API_KEY` di sisi Hermes Agent. Karena Agent berjalan di VPS yang
sama, gunakan `HERMES_API_BASE_URL=http://127.0.0.1:3000`. Jangan memakai domain
publik kecuali Agent memang dipindahkan ke mesin lain.

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
set -a
source /opt/hermes/app/.env
set +a
curl --header "Authorization: Bearer ${INTERNAL_API_KEY}" \
  http://127.0.0.1:3000/api/v1/notes
unset INTERNAL_API_KEY DATABASE_URL
```

Jangan paste nilai `INTERNAL_API_KEY` langsung ke command karena akan masuk shell
history. Perintah di atas mengambilnya dari `.env`, lalu menghapus variable sensitif
dari shell setelah test.

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

## 10. Nginx dan HTTPS (opsional; lewati untuk Telegram-only)

Untuk target awal—Hermes dan API pada VPS yang sama—langsung lanjut ke Bagian 11.
Tidak ada alasan membuka API ke internet. Gunakan bagian ini hanya jika ada client
eksternal yang benar-benar membutuhkan endpoint API.

Sebelum melanjutkan, buka TCP `80` dan `443` di Tencent Security Group lalu jalankan:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

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

## 11. Buat user terpisah untuk Hermes Agent

Hermes Agent mempunyai terminal tool. Jangan menjalankannya sebagai user `hermes`
yang memiliki repository, deploy key, `.env` API, dan akses `sudo`. Buat user runtime
tanpa akses administratif:

```bash
sudo adduser --disabled-password --gecos "" hermes-agent
sudo chmod 700 /home/hermes-agent
```

Jangan masukkan `hermes-agent` ke group `sudo` dan jangan salin deploy key GitHub ke
home user ini. Hasil yang diinginkan:

```bash
id hermes-agent
sudo -l -U hermes-agent
```

`id` tidak boleh menampilkan group `sudo`. Perintah kedua seharusnya menyatakan user
tidak mempunyai izin sudo.

## 12. Install dan konfigurasi Hermes Agent

Masuk ke shell user runtime:

```bash
sudo -iu hermes-agent
```

Install Hermes Agent menggunakan installer resmi:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc
hermes --version
```

Installer per-user menaruh kode di `~/.hermes/hermes-agent`, command di
`~/.local/bin/hermes`, dan data runtime di `~/.hermes`. Jangan menjalankan installer
ini dengan `sudo`.

Pilih provider dan model LLM:

```bash
hermes model
```

Provider/model dan kredensialnya adalah keputusan pengguna; panduan ini tidak
menebak API provider yang dipakai. Ikuti wizard, simpan API key sebagai secret, lalu
uji percakapan biasa sebelum menambah Telegram atau skill:

```bash
hermes
```

Kirim satu prompt sederhana, pastikan ada respons normal, lalu keluar dengan
`Ctrl-C`. Setelah itu jalankan:

```bash
hermes doctor
hermes status --all
hermes config set terminal.backend local
hermes config set terminal.cwd /home/hermes-agent
```

Backend terminal `local` sesuai keputusan tanpa Docker. Konsekuensinya, command dari
Agent berjalan langsung sebagai Linux user `hermes-agent`; pemisahan user pada
Bagian 11 adalah batas keamanannya.

## 13. Buat bot dan forum Topics di Telegram

1. Chat dengan akun resmi `@BotFather`, kirim `/newbot`, lalu simpan bot token di
   password manager.
2. Cari Telegram numeric user ID melalui `@userinfobot`; jangan gunakan username
   Telegram sebagai allowlist.
3. Buat satu private Telegram group, aktifkan **Topics**, lalu buat topic:
   `Finance`, `Notes`, `Junk`, `General English`, `Grammar`, `Reading`, dan `Writing`.
4. Tambahkan bot ke group.
5. Agar bot dapat menerima pesan biasa, pilih salah satu:
   - jadikan bot admin group; atau
   - di BotFather buka `/mybots` → bot → **Bot Settings** → **Group Privacy** →
     **Turn off**, kemudian remove dan add kembali bot ke group.
6. Jangan menambahkan user lain sebelum aturan akses benar-benar diuji.

Kembali ke VPS sebagai `hermes-agent`, lalu jalankan wizard gateway:

```bash
hermes gateway setup
```

Pilih Telegram, masukkan bot token dan numeric user ID pada allowed users. Secret
akan disimpan di `~/.hermes/.env`; pastikan permission-nya ketat:

```bash
chmod 700 ~/.hermes
chmod 600 ~/.hermes/.env
```

Jalankan gateway sementara di foreground:

```bash
hermes gateway
```

Kirim pesan ke bot melalui DM dan salah satu topic group. Jika bot tidak merespons,
lihat log dari shell lain:

```bash
sudo -iu hermes-agent
hermes logs gateway -n 100
```

Hentikan gateway foreground dengan `Ctrl-C` setelah pengujian berhasil.

## 14. Pasang skill project dan hubungkan ke API

Sebagai `hermes-agent`, salin skill lengkap dari checkout deployment:

```bash
mkdir -p ~/.hermes/skills/hermes-personal-assistant
rsync -a --delete \
  /opt/hermes/app/hermes/skills/hermes-personal-assistant/ \
  ~/.hermes/skills/hermes-personal-assistant/
chmod 700 ~/.hermes/skills/hermes-personal-assistant/scripts/api.sh
hermes skills list
```

Pastikan `hermes-personal-assistant` muncul. Copy seluruh folder, bukan hanya
`SKILL.md`, karena skill membutuhkan `references/` dan `scripts/api.sh`.

Tambahkan dua nilai berikut ke `~/.hermes/.env` memakai `nano`. Salin API key dari
password manager—jangan membaca file `.env` API sebagai user Agent:

```dotenv
HERMES_API_BASE_URL=http://127.0.0.1:3000
HERMES_INTERNAL_API_KEY=NILAI_YANG_SAMA_DENGAN_INTERNAL_API_KEY_API
```

Kemudian:

```bash
chmod 600 ~/.hermes/.env
hermes tools
```

Pada UI `hermes tools`, aktifkan toolset **terminal** untuk Telegram dan cron.
Skill project memang mendeklarasikan kebutuhan terminal karena semua request API
melewati wrapper `scripts/api.sh`. Jangan aktifkan toolset lain yang belum dibutuhkan.

Uji koneksi terautentikasi tanpa mencetak nilai key:

```bash
set -a
source ~/.hermes/.env
set +a
~/.hermes/skills/hermes-personal-assistant/scripts/api.sh \
  GET /api/v1/notes --query limit 5
```

Setelah berhasil, uji skill lewat CLI:

```bash
hermes
```

Di dalam chat Hermes, jalankan:

```text
/hermes-personal-assistant tampilkan 5 catatan terakhir
```

## 15. Bind semua Telegram topic ke skill

Untuk setiap topic, buka Telegram Desktop/Web dan lihat URL berbentuk
`https://t.me/c/1234567890/5`. Angka terakhir adalah `thread_id`. Supergroup
`chat_id` adalah angka group dengan prefix `-100`, misalnya `-1001234567890`.

Edit `~/.hermes/config.yaml` sebagai `hermes-agent` dan **gabungkan** konfigurasi
berikut dengan key `gateway` yang sudah dibuat wizard. Jangan membuat key YAML
`gateway`, `platforms`, atau `telegram` kedua karena duplicate key dapat menimpa
konfigurasi sebelumnya.

```yaml
gateway:
  platforms:
    telegram:
      extra:
        group_topics:
          - chat_id: -100GANTI_DENGAN_GROUP_ID
            topics:
              - name: Finance
                thread_id: GANTI_THREAD_ID_FINANCE
                skill: hermes-personal-assistant
              - name: Notes
                thread_id: GANTI_THREAD_ID_NOTES
                skill: hermes-personal-assistant
              - name: Junk
                thread_id: GANTI_THREAD_ID_JUNK
                skill: hermes-personal-assistant
              - name: General English
                thread_id: GANTI_THREAD_ID_GENERAL_ENGLISH
                skill: hermes-personal-assistant
              - name: Grammar
                thread_id: GANTI_THREAD_ID_GRAMMAR
                skill: hermes-personal-assistant
              - name: Reading
                thread_id: GANTI_THREAD_ID_READING
                skill: hermes-personal-assistant
              - name: Writing
                thread_id: GANTI_THREAD_ID_WRITING
                skill: hermes-personal-assistant
```

Topic menentukan domain. Khusus `Notes` dan `Junk`, Hermes tidak boleh menebak atau
memindahkan data antar-domain berdasarkan isi pesan. Setelah mengedit konfigurasi:

```bash
hermes doctor
```

## 16. Jalankan Hermes Gateway sebagai service

Keluar dari shell `hermes-agent` kembali ke user `hermes`:

```bash
exit
whoami
```

Install gateway sebagai system service yang mulai saat VPS boot tetapi tetap berjalan
sebagai user non-root `hermes-agent`:

```bash
sudo /home/hermes-agent/.local/bin/hermes gateway install \
  --system --run-as-user hermes-agent
sudo /home/hermes-agent/.local/bin/hermes gateway start --system
sudo /home/hermes-agent/.local/bin/hermes gateway status --system
```

Jangan memasang user service dan system service sekaligus. Untuk VPS selalu gunakan
system service di atas. Periksa service dan log:

```bash
sudo systemctl status hermes-gateway --no-pager
sudo journalctl -u hermes-gateway -n 100 --no-pager
```

Nama service default adalah `hermes-gateway`. Jika output installer menunjukkan
nama lain, gunakan nama yang ditampilkan itu pada `systemctl`/`journalctl`.

Setelah mengubah `~/.hermes/.env`, `config.yaml`, tools, atau skill, restart:

```bash
sudo /home/hermes-agent/.local/bin/hermes gateway restart --system
```

## 17. Buat jadwal latihan (opsional sampai jadwal ditentukan)

Jangan membuat jadwal dengan waktu atau destination ID tebakan. Tentukan terlebih
dahulu jadwal Grammar, Reading, dan Writing serta `chat_id`/`thread_id` masing-masing.

Sebagai `hermes-agent`, set timezone dan ikuti template yang tersimpan di repository:

```bash
sudo -iu hermes-agent
hermes config set timezone Asia/Jakarta
sed -n '1,200p' \
  /opt/hermes/app/hermes/skills/hermes-personal-assistant/references/scheduling.md
```

Ganti placeholder pada template, buat tiga job, lalu validasi:

```bash
hermes cron list
hermes cron status
hermes cron run daily-grammar
hermes cron run daily-reading
hermes cron run daily-writing
hermes cron doctor
```

Pastikan hasil manual masing-masing job masuk ke topic Telegram yang tepat sebelum
mengandalkan jadwal otomatis. Scheduler berjalan di dalam gateway, sehingga gateway
service wajib aktif terus. Setelah selesai, jalankan `exit` untuk kembali ke user
operator `hermes`.

## 18. Uji end-to-end sampai siap dipakai

Lakukan semua pengujian berikut:

1. Reboot VPS: `sudo reboot`, lalu login kembali setelah server hidup.
2. Pastikan `postgresql`, `hermes-api`, dan `hermes-gateway` berstatus active.
3. Pastikan `/health` dan `/health/ready` berhasil melalui `127.0.0.1`.
4. Kirim satu request baca dari setiap Telegram topic.
5. Buat satu data percobaan melalui topic Finance, Notes, atau Junk; pastikan balasan
   menyertakan referensi stabil dan data benar-benar dapat dibaca kembali.
6. Uji Grammar, Reading, dan Writing secara manual sebelum mengaktifkan cron.
7. Jalankan `hermes doctor`, `hermes status --all`, dan `hermes cron doctor`.
8. Pastikan user `hermes-agent` tidak dapat membaca `/opt/hermes/app/.env`, private
   deploy key, atau menjalankan `sudo`.
9. Uji backup dan restore sesuai Bagian 20.

Deployment dinyatakan siap pakai hanya jika semua langkah di atas berhasil.

---

## 19. Update / Deploy Ulang

Setiap kali ada perubahan kode yang mau dideploy:

```bash
ssh hermes-vps
sudo -iu hermes   # kalau login awal bukan sebagai hermes
cd /opt/hermes/app
git status --short
git fetch origin
git pull --ff-only origin main
bun install --frozen-lockfile
bun run db:migrate
sudo systemctl restart hermes-api
sudo systemctl status hermes-api --no-pager
curl http://127.0.0.1:3000/health/ready
```

Jika folder `hermes/skills/hermes-personal-assistant` ikut berubah pada deployment,
sinkronkan juga copy runtime dan restart gateway:

```bash
sudo -u hermes-agent rsync -a --delete \
  /opt/hermes/app/hermes/skills/hermes-personal-assistant/ \
  /home/hermes-agent/.hermes/skills/hermes-personal-assistant/
sudo /home/hermes-agent/.local/bin/hermes gateway restart --system
sudo /home/hermes-agent/.local/bin/hermes gateway status --system
```

`--ff-only` mencegah Git membuat merge commit otomatis di server — kalau history di
server dan di GitHub sudah menyimpang, pull akan gagal dan menampilkan pesan error,
bukan diam-diam menggabungkan history dengan cara yang tidak kamu duga.

Kalau pull gagal karena ada perubahan lokal di server atau branch menyimpang,
periksa dulu dengan `git status` dan `git log`. **Jangan** langsung pakai
`git reset --hard` tanpa memahami apa yang akan hilang. Perintah `db:rollback` (kalau
ada) berisiko menghapus data dan harus ditinjau dulu sebelum dijalankan, jangan
dipakai reflex saat panik.

Update Hermes Agent adalah proses terpisah dari `git pull` project. Jalankan manual,
setelah membaca release notes dan memastikan ada backup:

```bash
sudo -iu hermes-agent
hermes update --check
hermes backup --quick --label pre-upgrade
hermes update --backup
exit
sudo /home/hermes-agent/.local/bin/hermes gateway restart --system
sudo /home/hermes-agent/.local/bin/hermes gateway status --system
```

Jangan membuat auto-update Hermes Agent; perubahan versi dapat mengubah konfigurasi,
tool permission, gateway, atau format skill dan perlu diuji manual.

---

## 20. Backup dan Monitoring Minimum

Checklist rutin:

- Aktifkan snapshot terjadwal di Tencent Cloud Console.
- Buat backup PostgreSQL terpisah **dan** uji proses restore-nya secara berkala —
  backup yang tidak pernah dicoba di-restore sering ternyata rusak saat baru
  dibutuhkan.
- Pantau disk, RAM, CPU, status service (`hermes-api`, `hermes-gateway`,
  `postgresql`), dan masa berlaku sertifikat TLS jika Nginx dipakai.
- Kalau health check gagal, langkah pertama selalu: `sudo journalctl -u hermes-api
  -n 100 --no-pager`.
- Kalau bot berhenti merespons, periksa `hermes gateway status --system`,
  `hermes logs gateway`, dan `journalctl -u hermes-gateway`.
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
sudo -u postgres createdb --owner=hermes hermes_restore_test
sudo -u hermes pg_restore \
  --dbname=hermes_restore_test /var/backups/hermes/hermes-TANGGAL.dump
sudo -u postgres dropdb hermes_restore_test
```

State Hermes Agent juga harus dibackup karena berisi config, skill, session, memory,
dan cron. Backup ini **mengandung secret** dari `~/.hermes/.env`; simpan secara privat
dan enkripsi sebelum dipindahkan ke luar VPS:

```bash
sudo install -d -m 700 -o hermes-agent -g hermes-agent /var/backups/hermes-agent
sudo -u hermes-agent /home/hermes-agent/.local/bin/hermes backup \
  -o /var/backups/hermes-agent/hermes-backup-$(date +%F).zip
```

Untuk backup harian pukul 02:30, edit crontab `hermes-agent`:

```bash
sudo -u hermes-agent crontab -e
```

Tambahkan:

```cron
30 2 * * * /home/hermes-agent/.local/bin/hermes backup -o /var/backups/hermes-agent/hermes-backup-$(date +\%F).zip && find /var/backups/hermes-agent -name 'hermes-backup-*.zip' -mtime +7 -delete
```

Untuk restore, hentikan gateway terlebih dahulu, jalankan `hermes import` sebagai
`hermes-agent`, lalu hidupkan gateway dan ulangi test end-to-end. Jangan menguji
restore dengan menimpa profile production; gunakan VPS/profile uji terpisah.

---

## Checklist Akhir

- [ ] Kondisi VPS existing, service lama, port, resource, dan disk sudah diaudit.
- [ ] Snapshot dibuat sebelum perubahan jika VPS berisi data/service lain.
- [ ] SSH key Hermes di Mac tidak menimpa key existing dan sudah dipasang ke VPS.
- [ ] Security Group: `22` dibatasi ke IP tertentu; `3000`/`5432` tertutup total.
- [ ] Untuk Telegram-only, `80`/`443` juga tertutup; buka hanya jika Bagian 10 dipakai.
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
- [ ] User `hermes-agent` tidak memiliki sudo, deploy key, atau akses baca `.env` API.
- [ ] Hermes Agent terpasang; provider/model lolos percakapan CLI dan `hermes doctor`.
- [ ] Telegram bot dibatasi dengan numeric user ID dan merespons di private forum group.
- [ ] Semua topic terikat ke `hermes-personal-assistant` dengan `chat_id`/`thread_id` yang benar.
- [ ] Toolset terminal aktif untuk Telegram/cron; wrapper skill dapat memanggil API lokal.
- [ ] `hermes-gateway` aktif sebagai system service setelah reboot.
- [ ] `/health` dan `/health/ready` sukses lewat `127.0.0.1`.
- [ ] Jika Bagian 10 dipakai: domain HTTPS berhasil, Nginx/Certbot aktif, dan TLS valid.
- [ ] Request baca/tulis end-to-end berhasil dari setiap Telegram topic.
- [ ] Cron Grammar/Reading/Writing berhasil manual sebelum jadwal otomatis diandalkan.
- [ ] Backup PostgreSQL terjadwal via cron, ditambah snapshot Tencent.
- [ ] Backup Hermes Agent dibuat dan disimpan privat karena mengandung secret.
- [ ] Restore PostgreSQL dan Hermes sudah pernah diuji di environment terpisah.

---

## Referensi resmi

- [Hermes Agent Quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart)
- [Telegram setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram)
- [Messaging gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)
- [CLI commands](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
