# Runbook Deploy Hermes ke Tencent VPS

Runbook ini adalah acuan tunggal untuk **instalasi bersih** Hermes pada VPS Tencent
Cloud CVM yang sudah ada. Targetnya Ubuntu 24.04 LTS, Mac M1 sebagai komputer
operator, tanpa Docker, dan deployment manual lewat SSH + Git.

Jalankan bagian secara berurutan. Jangan mencampur command lama dari chat, nama key
lama (`tencent-hermes`), atau metode instalasi lain dengan runbook ini.

Sebelum mulai, isi informasi non-rahasia dan lokasi secret pada
`info-vps.txt` berdasarkan [template](info-vps.template.txt). File itu adalah catatan
pribadi lokal; jangan commit atau tempelkan password/token ke chat.

> **IP pada runbook ini:** `43.157.229.102`. Jika Tencent mengganti public IP VPS,
> perbarui `info-vps.txt` dan nilai `HostName` pada konfigurasi SSH di Bagian 3
> sebelum menjalankan command koneksi berikutnya.

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

Arah akses remote pada runbook ini hanya **Mac → VPS**. VPS tidak diberi akses SSH
masuk ke Mac dan Mac tidak perlu membuka port ke internet.

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

## Peta user dan aturan berpindah shell

Panduan ini memakai tiga user Linux yang berbeda. Jangan menganggap command `hermes`
di nama user berarti semua command harus dijalankan dengan user tersebut.

| User | Fungsi | Boleh `sudo`? | Command utama |
| --- | --- | --- | --- |
| `ubuntu` | User admin awal dari Tencent dan jalur recovery | biasanya ya | audit, membuat user, recovery |
| `hermes` | Deploy repository, API, package sistem, dan kontrol systemd | ya | `git`, `bun`, `apt`, `systemctl`, `journalctl` |
| `hermes-agent` | Runtime Hermes Agent, skill, dan Telegram gateway | tidak | `hermes`, `hermes doctor`, konfigurasi Agent |

Role PostgreSQL `hermes` berbeda dari user Linux `hermes`. Nama boleh sama, tetapi
keduanya punya password dan izin yang berbeda.

Cara mengenali user aktif:

```bash
whoami
```

Jika prompt menunjukkan `hermes-agent@...`, jalankan command Hermes tanpa `sudo`.
Untuk kembali ke shell sebelumnya, ketik perintah berikut **sendiri**, lalu tekan
Enter:

```bash
exit
```

Setelah prompt berubah menjadi `hermes@...`, barulah jalankan command administratif
dengan `sudo`. `exit` hanya keluar dari shell saat ini; command itu tidak menghentikan
service.

Password yang perlu dibedakan:

- password `sudo` ditentukan oleh user Linux yang sedang menjalankan `sudo`;
- password database berada di `DATABASE_URL` dan dipakai role PostgreSQL;
- password/passphrase SSH key berasal dari Mac dan bukan password VPS;
- token Telegram dan API key model adalah secret aplikasi, bukan password Linux.

Untuk melihat daftar user normal di VPS tanpa menampilkan data sensitif:

```bash
getent passwd | awk -F: '$3 >= 1000 && $3 < 65534 {print $1, "UID=" $3, "HOME=" $6}'
```

User `hermes-agent` memang tidak perlu menjadi anggota group `sudo`.

### Cara membaca label command

Sebelum menjalankan command, lihat prompt dan label konteksnya:

```text
Mac lokal       garin@garin ~ %
VPS admin       ubuntu@VM-0-10-ubuntu:~$
VPS aplikasi    hermes@VM-0-10-ubuntu:~$
VPS Agent       hermes-agent@VM-0-10-ubuntu:~$
```

Command yang diawali `sudo -iu hermes-agent` dijalankan dari user admin (`ubuntu` atau
`hermes`). Setelah prompt berubah menjadi `hermes-agent@...`, command berikutnya
dijalankan tanpa `sudo` sampai ada instruksi `exit`.

### Urutan pengerjaan ringkas

| Fase | Bagian | Tempat / user yang dipakai |
| --- | --- | --- |
| Bootstrap | 1–4 | Mac, lalu `ubuntu`, lalu `hermes` |
| API | 5–10 | VPS sebagai `hermes` |
| Hermes Agent | 11–12 | Buat user dari `hermes`; install Agent sebagai `hermes-agent` |
| Telegram dan skill | 13–15 | Telegram + VPS sebagai `hermes-agent` |
| Service gateway | 16 | VPS sebagai `hermes` (service berjalan sebagai `hermes-agent`) |
| Operasional | 17–20 | Ikuti label user pada masing-masing bagian |

Selesaikan satu fase dan verifikasinya sebelum berpindah ke fase berikutnya. Jangan
menjalankan Bagian 16 sebelum Bagian 13–15 berhasil; gateway service tidak akan
berfungsi tanpa konfigurasi Agent, Telegram, dan skill.

---

## 1. Verifikasi VPS Tencent yang bersih

> **Jalankan di VPS melalui VNC/WebShell Tencent sebagai user awal `ubuntu`.**

Runbook ini mengasumsikan CVM sudah ada, tetapi sistemnya baru di-install ulang dan
belum menyimpan aplikasi atau data yang harus dipertahankan. Jika VPS ternyata masih
menjalankan service/data lain, berhenti di sini: audit, backup, atau reinstall lebih
dulu. Jangan mencampur instalasi lama dengan runbook instalasi bersih ini.

Di Tencent Cloud Console, catat ke `info-vps.txt`: instance ID, region, public IP,
vCPU/RAM/disk, Security Group, dan username awal (`ubuntu`). Lalu verifikasi kondisi
OS dari VNC/WebShell:

```bash
whoami
cat /etc/os-release
uname -m
nproc
free -h
df -hT
lsblk
sudo ss -lntup
sudo systemctl --type=service --state=running --no-pager
```

Target panduan ini adalah Ubuntu 24.04 LTS 64-bit. Output yang diharapkan adalah
`whoami` = `ubuntu` dan `uname -m` = `x86_64`. Mac M1 tetap dapat mengakses server
x86_64 melalui SSH. Jika OS bukan Ubuntu 24.04, jangan lanjutkan command instalasi
tanpa menyesuaikan paketnya.

Minimum yang disarankan adalah 2 vCPU dan 2 GB RAM. Untuk RAM 2 GB atau kurang,
aktifkan swap pada Bagian 4. Pastikan disk memiliki ruang kosong yang cukup untuk
PostgreSQL, dependency Hermes Agent, log, dan backup.

Periksa Security Group Tencent:

- TCP `22`: batasi ke IP publik Mac/office yang diperlukan.
- TCP `80`/`443`: tutup untuk deployment Telegram-only; buka hanya jika Bagian 10
  benar-benar dipakai.
- TCP `3000` dan `5432`: harus tertutup dari internet.
- Outbound HTTPS dan DNS harus diizinkan agar VPS dapat mengakses GitHub, provider
  model, Telegram Bot API, repository paket, dan update keamanan.

## 2. Buat SSH key Hermes di Mac

> **Jalankan di Mac lokal, bukan di VPS. Prompt biasanya berakhiran `%`.**

### Bersihkan konfigurasi SSH Hermes lama di Mac (bila ada)

Jika `~/.ssh` hanya dipakai untuk Hermes, hapus key lama dan konfigurasi lama yang
memang tidak akan digunakan lagi:

```bash
rm -i ~/.ssh/tencent-hermes
rm -i ~/.ssh/tencent-hermes.pub
rm -i ~/.ssh/config
rm -i ~/.ssh/known_hosts
rm -i ~/.ssh/known_hosts.old
```

Jawab `y` hanya untuk file yang memang ingin dihapus. Pesan `No such file or
directory` berarti file itu memang sudah tidak ada dan aman diabaikan. Jangan hapus
`config` atau `known_hosts` secara utuh jika Mac juga dipakai untuk server lain.
Dalam kasus itu, hapus hanya blok `Host hermes-vps`/key Hermes lama dan bersihkan
fingerprint VPS secara spesifik:

```bash
ssh-keygen -R 43.157.229.102
```

Buat kembali directory SSH dengan permission yang benar:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

Periksa dulu agar tidak menimpa key yang sudah ada:

```bash
ls -l ~/.ssh/hermes-vps ~/.ssh/hermes-vps.pub 2>/dev/null
```

Jika kedua file belum ada, buat key khusus project:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hermes-vps -C "hermes-mac-to-vps"
chmod 600 ~/.ssh/hermes-vps
chmod 644 ~/.ssh/hermes-vps.pub
cat ~/.ssh/hermes-vps.pub
```

Jika file sudah ada, jangan jalankan `ssh-keygen` lagi karena dapat menimpa key.
Gunakan key existing setelah memastikan kamu mengetahui asal dan fungsinya. Private
key tetap hanya di Mac; hanya isi file `.pub` yang boleh dipasang di VPS.

Jika command `ls` sebelumnya tidak menampilkan apa pun, kedua file belum ada dan kamu
boleh lanjut membuat key. Jika command menampilkan path file, berhenti dan periksa key
tersebut dulu.

## 3. Pasang public key ke VPS dan uji login

Gunakan pemasangan manual sebagai jalur utama. Ini jelas, tidak bergantung pada editor
terminal VNC, dan tidak mengubah key lama tanpa sengaja.

1. Di **Mac**, tampilkan lalu salin satu baris public key:

```bash
cat ~/.ssh/hermes-vps.pub
```

Perintah ini harus dijalankan di Mac. File `.pub` tidak otomatis ada di VPS.

2. Di **VNC/WebShell Tencent** atau sesi SSH lama pada VPS, sebagai user target
   (contoh Ubuntu: `ubuntu`), periksa key yang sudah ada:

```bash
whoami
cat ~/.ssh/authorized_keys
```

3. Jika output masih hanya berisi key lama (misalnya berakhiran
   `hermes-tencent-vps`), **ganti baris lama tersebut** dengan public key baru dari
   Mac. Jangan menghapus folder `~/.ssh` dan jangan memakai `rm -rf`.

   Buka file secara manual:

```bash
TERM=xterm nano ~/.ssh/authorized_keys
```

   Di `nano`, hapus seluruh baris lama dengan `Ctrl-K`, tempel satu baris dari
   `cat ~/.ssh/hermes-vps.pub` di Mac, lalu simpan dengan `Ctrl-O`, `Enter`, dan
   keluar dengan `Ctrl-X`. Pada instalasi bersih, hasil akhirnya hanya satu key baru
   yang berakhiran `hermes-mac-to-vps`.

4. Jika `authorized_keys` belum ada atau kosong, buat folder dan file SSH secara
   manual:

```bash
umask 077
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

5. Jika file baru saja dibuat atau masih kosong, buka file dengan editor lalu tempel
   satu baris public key dari Mac:

```bash
TERM=xterm nano ~/.ssh/authorized_keys
```

`TERM=xterm` diperlukan pada VNC Tencent ketika terminal melaporkan
`xterm-ghostty`, yang dapat membuat `nano` menolak dibuka. Di `nano`, pindah ke baris
kosong paling bawah, tempel **seluruh satu baris** output `cat
~/.ssh/hermes-vps.pub` dari Mac, kemudian:

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

Jika Ghostty mengirim `TERM=xterm-ghostty` dan command terminal seperti `clear` atau
`nano` bermasalah, gunakan nilai terminal Ubuntu yang kompatibel pada shell tersebut:

```bash
export TERM=xterm-256color
clear
```

Untuk membuka `nano` sekali saja tanpa mengubah environment permanen:

```bash
TERM=xterm nano ~/.ssh/authorized_keys
```

6. Di **Mac**, buat dan buka konfigurasi SSH:

```bash
mkdir -p ~/.ssh
touch ~/.ssh/config
chmod 600 ~/.ssh/config
nano ~/.ssh/config
```

Tambahkan blok berikut di bagian paling bawah file:

```sshconfig
Host hermes-vps
    HostName 43.157.229.102
    User ubuntu
    IdentityFile ~/.ssh/hermes-vps
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

7. Uji **key-only** dari Mac. Opsi ini melarang SSH fallback ke password, sehingga
   hasil sukses benar-benar membuktikan key yang dipakai:

```bash
ssh -o PasswordAuthentication=no \
  -o KbdInteractiveAuthentication=no \
  -o IdentitiesOnly=yes \
  -i ~/.ssh/hermes-vps \
  ubuntu@43.157.229.102
```

Untuk instalasi bersih ini, user awalnya harus `ubuntu`. Jika command masih meminta
password, atau gagal dengan `Permission denied (publickey)`, key belum terbaca oleh
server; jangan lanjut hardening dan tetap gunakan VNC/WebShell untuk memperbaikinya.

Pada koneksi pertama, verifikasi fingerprint host melalui console Tencent sebelum
menjawab `yes`. Hanya setelah key-only test berhasil, reset password atau nonaktifkan
password SSH pada Bagian 4.

Jangan menjalankan command yang menambahkan public key melalui pipe jika kamu sudah
memakai langkah manual di atas. Menjalankan keduanya dapat memasukkan key yang sama
berulang kali ke `authorized_keys`. Metode manual di atas adalah jalur deployment yang
dipakai panduan ini.

Jika tidak mempunyai akses SSH lama maupun VNC/WebShell, reset password melalui
Tencent Console adalah opsi pemulihan terakhir. Pada instance yang masih running,
Tencent dapat melakukan forced shutdown; buat snapshot dan jadwalkan downtime dahulu.

---

## 4. Hardening awal dan user aplikasi

Bagian ini memiliki dua tahap. Tahap pertama dijalankan sebagai `ubuntu`; setelah user
`hermes` terbentuk dan login diuji, semua tahap berikutnya memakai user `hermes`.

### 4.1 Sebagai `ubuntu`: update awal dan buat user `hermes`

> **Jalankan di VPS sebagai `ubuntu`, setelah key-only test di Bagian 3 berhasil.**

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git rsync ufw unattended-upgrades
```

Buat user khusus untuk aplikasi dan berikan hak `sudo`:

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
ssh -i ~/.ssh/hermes-vps hermes@43.157.229.102
```

Jika test di atas berhasil tanpa password, edit `~/.ssh/config` di Mac dan ubah satu
baris pada blok `Host hermes-vps` dari `User ubuntu` menjadi `User hermes`. Lalu pada
terminal Mac ketiga, verifikasi alias dan user aktif:

```bash
ssh hermes-vps
whoami
```

Output `whoami` harus `hermes`. Biarkan sesi `ubuntu` lama tetap terbuka sebagai jalur
recovery sampai Bagian 4 selesai.

### 4.2 Sebagai `hermes`: kunci akses SSH dan aktifkan firewall

> **Jalankan semua command berikut di VPS sebagai `hermes`.**

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
printf '%s\n' \
  'PasswordAuthentication no' \
  'KbdInteractiveAuthentication no' \
  'PermitRootLogin no' \
  | sudo tee /etc/ssh/sshd_config.d/00-hermes-hardening.conf >/dev/null
sudo sshd -t
sudo systemctl restart ssh
```

Command `printf` membuat file SSH hardening tanpa editor atau heredoc, sehingga aman
untuk terminal VNC/WebShell yang mudah salah menerima paste. `sudo sshd -t` mengecek
validitas config sebelum restart — kalau ada error, SSH tidak akan direstart dan kamu
tidak akan terkunci.

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

> **Penting:** jangan menutup sesi `ubuntu` sampai kamu sudah membuka terminal Mac
> baru dan berhasil `ssh hermes-vps` sebagai `hermes` tanpa password. Kalau ada salah
> konfigurasi, sesi `ubuntu` yang masih terbuka adalah jalur pemulihan.

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
sudo apt install -y unzip
curl -fsSL https://bun.com/install | bash
source ~/.bashrc
bun --version
```

Jalankan installer tanpa `sudo`: Bun dipasang per-user ke `/home/hermes/.bun` dan
masuk ke PATH user `hermes`. Jangan menjalankan command ini sebagai `root`, `ubuntu`,
atau `hermes-agent`, karena hasilnya akan masuk ke home user tersebut dan tidak
otomatis tersedia untuk service API `hermes`. Dokumentasi resmi Bun juga menempatkan
binary pada `~/.bun/bin` dan menyarankan verifikasi dengan `bun --version`.

Pastikan versinya `1.4` atau lebih baru. Repository ini menyediakan command berikut
di root `/opt/hermes/app`; gunakan nama tersebut apa adanya pada bagian berikutnya:

```text
bun run db:migrate  # menjalankan migration
bun run db:status   # melihat status migration
bun run start:api   # menjalankan API
```

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

> **Jalankan semua command di bagian ini di VPS sebagai user `hermes`.**

Repository ini sudah menyediakan `.env.example`. Dari `/opt/hermes/app`, salin lalu
edit file production:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Isi minimal yang dibutuhkan:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
READINESS_TIMEOUT_MS=2000
DATABASE_URL=postgresql://hermes:DB_PASSWORD@127.0.0.1:5432/hermes
INTERNAL_API_KEY=RANDOM_SECRET_MINIMUM_32_CHARACTERS
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

`API_PROXY_TARGET` milik Vite development dan tidak diperlukan untuk API production
karena frontend publik tidak dideploy oleh runbook ini.

### Verifikasi koneksi PostgreSQL sebelum migration

`bun install` yang berhasil hanya membuktikan dependency terpasang; itu belum menguji
database. Tes `DATABASE_URL` yang baru dibuat menggunakan driver Bun tanpa mencetak
URL atau password:

```bash
cd /opt/hermes/app
bun --env-file=.env -e '
const sql = new Bun.SQL(Bun.env.DATABASE_URL!);
try {
  await sql`SELECT 1`;
  console.log("PostgreSQL connection OK");
} finally {
  await sql.close();
}
'
```

Jika muncul `password authentication failed for user "postgres"`, `.env` masih
mengarah ke contoh `postgres:postgres` atau password-nya salah. Jika muncul role atau
database `hermes` tidak ada, ulangi pembuatan role/database di Bagian 6. Pesan
`PostgresError` dari `db:status` sengaja ringkas; tes langsung di atas menunjukkan
masalah koneksi tanpa membocorkan secret.

---

## 8. Install Dependency dan Smoke Test

> **Jalankan di VPS sebagai user `hermes`, dari directory `/opt/hermes/app`.**

```bash
cd /opt/hermes/app
bun install --frozen-lockfile
bun run db:migrate
bun run db:status
bun run start:api
```

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

> **Jalankan di VPS sebagai user `hermes`. `sudo` dipakai hanya untuk mendaftarkan dan
> mengontrol service systemd.**

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

> **Jika bagian ini dipakai, jalankan command di VPS sebagai user `hermes`.**

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

> **Jalankan di VPS sebagai user `hermes`, karena pembuatan user membutuhkan `sudo`.**

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

Sebelum berpindah ke `hermes-agent`, pasang dependency sistem sebagai user `hermes`.
Installer Hermes Agent tidak membutuhkan akses root, tetapi fitur browser/search/voice
memakai package sistem berikut:

```bash
sudo apt update
sudo apt install -y build-essential ripgrep ffmpeg
command -v g++
command -v rg
command -v ffmpeg
```

`sudo apt update` hanya memperbarui daftar paket; command itu tidak memasang `g++`.
`build-essential` pada command di ataslah yang memasang compiler tersebut.

Jika installer sebelumnya menampilkan `hermes-agent is not in the sudoers file`, itu
normal dan bukan alasan untuk memasukkan user Agent ke group `sudo`. Pasang package
sistem dari user `hermes`, lalu ulangi installer sebagai `hermes-agent`.

> **Sampai titik ini command dijalankan sebagai `hermes`.**

Masuk ke shell user runtime:

```bash
sudo -iu hermes-agent
```

> **Setelah command di atas selesai, prompt harus berubah menjadi `hermes-agent@...`.
> Mulai baris berikutnya, jalankan semua command tanpa `sudo` sebagai `hermes-agent`.**

Install Hermes Agent menggunakan installer resmi:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc
hermes --version
```

Installer per-user menaruh kode di `~/.hermes/hermes-agent`, command di
`~/.local/bin/hermes`, dan data runtime di `~/.hermes`. Jangan menjalankan installer
ini dengan `sudo`.

Command `hermes` hanya masuk ke PATH user `hermes-agent`. Karena itu command berikut
berhasil di shell Agent tetapi `hermes` biasa akan menghasilkan `command not found`
di shell user `hermes`:

```bash
whoami
command -v hermes
hermes --version
```

Jika user `hermes` mencoba membaca `/home/hermes-agent/.local/bin/hermes` tanpa
`sudo`, hasil `Permission denied` juga normal karena home Agent sengaja private.
Jalankan CLI sebagai Agent dengan `sudo -iu hermes-agent`, bukan dengan membuka
permission home Agent untuk user lain.

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

Kirim satu prompt sederhana, pastikan ada respons normal, lalu keluar dengan `Ctrl-C`.
Setelah itu jalankan:

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

> **Pembuatan bot dan group dilakukan di aplikasi Telegram. Command VPS pada bagian
> ini dijalankan sebagai `hermes-agent`.**

1. Chat dengan akun resmi `@BotFather`, kirim `/newbot`, lalu simpan bot token di
   password manager.
2. Cari Telegram numeric user ID melalui `@userinfobot`; jangan gunakan username
   Telegram sebagai allowlist.
3. Buat satu private Telegram group, aktifkan **Topics**, lalu buat topic sesuai
   peta yang akan dipakai. Untuk VPS ini, peta yang disepakati adalah:

   | Topic | `thread_id` | Peran |
   | --- | ---: | --- |
   | General | 1 | Q&A umum, tanpa data aplikasi |
   | Speaking | 2 | Latihan percakapan, tanpa record progres |
   | Finance | 3 | Finance API |
   | Grammar | 4 | Grammar API |
   | Reading | 5 | Reading API |
   | Writing | 6 | Writing API |
   | Listening | 26 | Q&A listening, tanpa record progres |
   | General English | 27 | Q&A English singkat |
   | Notes | 32 | Notes API |
   | Junk | 34 | Junk API |
   | Service Info | 52 | Status/cron bot; bukan ruang percakapan |
4. Tambahkan bot ke group.
5. Agar bot dapat menerima pesan biasa, pilih salah satu:
   - jadikan bot admin group; atau
   - di BotFather buka `/mybots` → bot → **Bot Settings** → **Group Privacy** →
     **Turn off**, kemudian remove dan add kembali bot ke group.
6. Jangan menambahkan user lain sebelum aturan akses benar-benar diuji.

Bedakan ID Telegram berikut:

- `TELEGRAM_ALLOWED_USERS` berisi numeric ID akun manusia yang boleh memakai bot;
- `TELEGRAM_HOME_CHANNEL` berisi chat tujuan notifikasi/cron, yaitu ID DM kamu atau
  ID group;
- ID group/supergroup Topics biasanya negatif dan berbentuk `-100...`;
- jangan gunakan numeric ID bot sebagai allowed user atau home channel.

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

Setelah wizard selesai dan gateway sudah dapat berjalan, buka chat Telegram tujuan
lalu kirim:

```text
/sethome
```

Untuk DM, kirim `/start` atau pesan pertama ke bot terlebih dahulu. Untuk group Topics,
jalankan `/sethome` di group yang memang akan menerima notifikasi. Jangan menebak
destination ID dari username atau memakai ID bot.

Jalankan gateway sementara di foreground:

```bash
hermes gateway
```

Kirim pesan ke bot melalui DM dan salah satu topic group. Jika bot tidak merespons,
buka terminal Mac lain, login sebagai `hermes`, lalu lihat log sebagai user
`hermes-agent`:

```bash
ssh hermes-vps
sudo -iu hermes-agent
hermes logs gateway -n 100
```

Hentikan gateway foreground dengan `Ctrl-C` setelah pengujian berhasil.

Jika log menampilkan `Connected to Telegram (polling mode)`, koneksi ke Telegram sudah
berhasil. Jika ada `the bot can't send messages to the bot`, koneksi tetap berhasil,
tetapi `home channel` menunjuk ke ID bot atau chat yang salah. Perbaiki dengan
`/sethome`, lalu ulangi pengujian.

## 14. Pasang skill project, persona, dan hubungkan ke API

> **Jalankan di VPS sebagai `hermes-agent`.**

Sebagai `hermes-agent`, salin seluruh skill project dari checkout deployment. Hanya
`hermes-personal-assistant` yang memakai REST API; tiga skill Q&A tidak memanggil API
dan tidak menyimpan record aplikasi.

```bash
for skill in \
  hermes-personal-assistant \
  hermes-general-qna \
  hermes-speaking-qna \
  hermes-listening-qna; do
  mkdir -p "$HOME/.hermes/skills/$skill"
  rsync -a --delete \
    "/opt/hermes/app/hermes/skills/$skill/" \
    "$HOME/.hermes/skills/$skill/"
done
chmod 700 ~/.hermes/skills/hermes-personal-assistant/scripts/api.sh
hermes skills list
hermes skills check
```

Pastikan keempat skill muncul. Copy seluruh folder, bukan hanya `SKILL.md`, karena
`hermes-personal-assistant` membutuhkan `references/` dan `scripts/api.sh`.

Pasang baseline persona dan memory. Command ini tidak menimpa file yang sudah ada;
jika file tujuan sudah ada, baca dan gabungkan isinya secara sadar, jangan overwrite
secara buta:

```bash
mkdir -p ~/.hermes/memories
cp -n /opt/hermes/app/hermes/profile-template/SOUL.md ~/.hermes/SOUL.md
cp -n /opt/hermes/app/hermes/profile-template/USER.md ~/.hermes/memories/USER.md
cp -n /opt/hermes/app/hermes/profile-template/MEMORY.md ~/.hermes/memories/MEMORY.md
chmod 600 ~/.hermes/SOUL.md ~/.hermes/memories/USER.md ~/.hermes/memories/MEMORY.md
```

`SOUL.md` menentukan gaya global Hermes. `USER.md` menyimpan preferensi Garin,
sedangkan `MEMORY.md` berisi fakta ringkas tentang lingkungan Agent. Ketiganya tidak
boleh berisi password, token, private key, connection string, log panjang, transaksi,
atau data belajar. Data permanen tetap berada di API/PostgreSQL.

Buka `~/.hermes/config.yaml`, lalu gabungkan policy berikut. Jangan membuat key YAML
`memory`, `skills`, atau `display` kedua apabila key tersebut sudah ada.

```bash
nano ~/.hermes/config.yaml
```

```yaml
memory:
  write_approval: true

skills:
  write_approval: true

display:
  memory_notifications: verbose
```

Dengan policy ini, perubahan memory dan skill yang diusulkan Hermes harus kamu review
terlebih dahulu. Di Telegram, gunakan `/memory pending`, `/memory approve <id>`,
`/memory reject <id>`, `/skills pending`, dan `/skills diff <id>`. Setelah menyetujui
atau mengubah persona/memory, kirim `/new` pada topic terkait supaya sesi berikutnya
memuat snapshot terbaru.

Tambahkan dua nilai berikut ke `~/.hermes/.env`. Salin API key dari password
manager—jangan membaca file `.env` API sebagai user Agent:

```bash
nano ~/.hermes/.env
```

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
`hermes-personal-assistant` memang mendeklarasikan kebutuhan terminal karena semua
request API melewati wrapper `scripts/api.sh`. Tiga skill Q&A tidak memakai terminal,
API, atau database. Jangan aktifkan toolset lain yang belum dibutuhkan.

Uji koneksi terautentikasi tanpa mencetak nilai key:

```bash
set -a
source ~/.hermes/.env
set +a
~/.hermes/skills/hermes-personal-assistant/scripts/api.sh \
  GET /api/v1/notes --query limit 5
unset HERMES_API_BASE_URL HERMES_INTERNAL_API_KEY
```

Setelah berhasil, uji skill lewat CLI:

```bash
hermes
```

Di dalam chat Hermes, jalankan:

```text
/hermes-personal-assistant tampilkan 5 catatan terakhir
```

## 15. Bind setiap Telegram topic ke skill yang tepat

> **Jalankan command file/configuration di VPS sebagai `hermes-agent`. Pengambilan
> `chat_id` dan `thread_id` dilakukan dari Telegram Desktop/Web.**

Untuk setiap topic, buka Telegram Desktop/Web dan lihat URL berbentuk
`https://t.me/c/1234567890/5`. Angka terakhir adalah `thread_id`. Supergroup
`chat_id` adalah angka group dengan prefix `-100`, misalnya `-1001234567890`.

Edit `~/.hermes/config.yaml` sebagai `hermes-agent` dan **gabungkan** konfigurasi
berikut dengan key `platforms.telegram.extra` yang sudah dibuat wizard. Jangan membuat
key YAML `platforms`, `telegram`, atau `extra` kedua karena duplicate key dapat
menimpa konfigurasi sebelumnya.

```bash
nano ~/.hermes/config.yaml
```

```yaml
platforms:
  telegram:
    extra:
      ignored_threads:
        - 52 # Service Info: status/cron only, ignore incoming conversation
      group_topics:
        - chat_id: -1003982488692
          topics:
            - name: General
              thread_id: 1
              skill: hermes-general-qna
            - name: Speaking
              thread_id: 2
              skill: hermes-speaking-qna
            - name: Finance
              thread_id: 3
              skill: hermes-personal-assistant
            - name: Grammar
              thread_id: 4
              skill: hermes-personal-assistant
            - name: Reading
              thread_id: 5
              skill: hermes-personal-assistant
            - name: Writing
              thread_id: 6
              skill: hermes-personal-assistant
            - name: Listening
              thread_id: 26
              skill: hermes-listening-qna
            - name: General English
              thread_id: 27
              skill: hermes-personal-assistant
            - name: Notes
              thread_id: 32
              skill: hermes-personal-assistant
            - name: Junk
              thread_id: 34
              skill: hermes-personal-assistant
```

`Service Info` (`thread_id: 52`) sengaja tidak dimasukkan ke `group_topics`. Nilai pada
`ignored_threads` membuat Hermes diam untuk pesan masuk pada topic itu; cron tetap dapat
mengirim hasil ke topic tersebut jika kamu nantinya memilih `52` sebagai
`TELEGRAM_CRON_THREAD_ID`.

Topic menentukan domain. `General`, `Speaking`, dan `Listening` adalah Q&A biasa:
skillnya dilarang memanggil API atau membuat record. Khusus `Notes` dan `Junk`, Hermes
tidak boleh menebak atau memindahkan data antar-domain berdasarkan isi pesan. Setelah
mengedit konfigurasi:

> Hermes tetap dapat menyimpan riwayat sesi Telegram sebagai kemampuan runtime-nya.
> “Tanpa record” pada tiga topic Q&A berarti skill tidak menulis data aplikasi,
> progress belajar, atau database tambahan dari percakapan biasa. Preferensi pribadi
> yang eksplisit diminta user tetap boleh diajukan sebagai global memory dan harus
> melewati approval.

Pada topic API-backed, kamu juga dapat meminta mode preview kapan saja. Contoh di
topic Finance:

```text
Jangan call API. Preview catat kopi 25 di kantor.
```

Hermes wajib menampilkan interpretasi, endpoint, payload, asumsi, dan status `Belum
tersimpan` tanpa memanggil API—termasuk tanpa `GET` kategori atau data lama. Untuk
melanjutkan, gunakan perintah eksplisit seperti `simpan transaksi ini`, `jalankan`,
atau `call API`. Balasan `oke` saja tidak dianggap izin menulis.

```bash
hermes doctor
```

## 16. Jalankan Hermes Gateway sebagai service

Keluar dari shell `hermes-agent` kembali ke user `hermes`:

```bash
exit
whoami
```

> **Setelah `exit`, prompt harus berubah menjadi `hermes@...`. Semua command systemd
> di bagian ini dijalankan sebagai `hermes`, bukan `hermes-agent`.**

Install gateway sebagai system service yang mulai saat VPS boot tetapi tetap berjalan
sebagai user non-root `hermes-agent`:

Sebelum memasang service, pastikan proses foreground pada Bagian 13 sudah dihentikan
dengan `Ctrl-C`. Jangan menjalankan gateway foreground dan system service bersamaan.
Jika perlu, cek dari user `hermes`:

```bash
ps -u hermes-agent -o pid,ppid,stat,cmd
```

Jika masih ada proses gateway, masuk sebentar ke user Agent dan hentikan dengan bersih:

```bash
sudo -iu hermes-agent
hermes gateway stop
exit
```

Jalankan instalasi dari user `hermes`, bukan `hermes-agent`:

```bash
sudo /home/hermes-agent/.local/bin/hermes gateway install \
  --system --run-as-user hermes-agent
```

Jika installer menanyakan dua hal berikut, jawab `y` lalu tekan Enter untuk masing-masing
prompt. Jangan menempelkan command berikutnya ke prompt installer:

```text
Start the gateway now after installing the service? [Y/n]: y
Start the gateway automatically on login/boot with systemd? [Y/n]: y
```

Installer biasanya langsung menyalakan service. Jika belum, jalankan:

```bash
sudo /home/hermes-agent/.local/bin/hermes gateway start --system
```

Jangan memasang user service dan system service sekaligus. Untuk VPS selalu gunakan
system service di atas. Periksa service dan log:

```bash
sudo systemctl status hermes-gateway --no-pager
sudo journalctl -u hermes-gateway -n 100 --no-pager
```

Verifikasi user yang menjalankan service dan bedakan dua status systemd:

```bash
sudo systemctl show hermes-gateway -p User
sudo systemctl is-enabled hermes-gateway
sudo systemctl is-active hermes-gateway
```

Targetnya adalah `User=hermes-agent`, `enabled`, dan `active`. `enabled` hanya berarti
service akan dimulai saat boot; `active` berarti service sedang berjalan.

Jika muncul `Unit hermes-gateway.service could not be found`, service belum dipasang.
Jika log berbunyi `Gateway already running (PID ...)`, masih ada gateway foreground
atau instance lama; hentikan instance itu sebelum menjalankan service systemd.

Nama service default adalah `hermes-gateway`. Jika output installer menunjukkan
nama lain, gunakan nama yang ditampilkan itu pada `systemctl`/`journalctl`.

Setelah mengubah `~/.hermes/.env`, `config.yaml`, tools, atau skill, restart:

```bash
sudo /home/hermes-agent/.local/bin/hermes gateway restart --system
```

## 17. Buat jadwal latihan (opsional sampai jadwal ditentukan)

Jangan membuat jadwal dengan waktu atau destination ID tebakan. Tentukan terlebih
dahulu jadwal Grammar, Reading, dan Writing serta `chat_id`/`thread_id` masing-masing.

Masuk ke shell Agent dari user `hermes`, lalu jalankan konfigurasi berikut sebagai
`hermes-agent`:

```bash
sudo -iu hermes-agent
hermes config set timezone Asia/Jakarta
sed -n '1,200p' \
  /opt/hermes/app/hermes/skills/hermes-personal-assistant/references/scheduling.md
```

> **Setelah `sudo -iu hermes-agent`, jangan memakai `sudo` lagi pada command cron.
> Jalankan `exit` setelah selesai agar kembali ke user `hermes`.**

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

> **Pengecekan service, PostgreSQL, API, dan log dijalankan sebagai `hermes`.
> Command Agent dijalankan setelah `sudo -iu hermes-agent`. Pengujian pesan dilakukan
> di Telegram.**

Lakukan semua pengujian berikut:

1. Reboot VPS: `sudo reboot`, lalu login kembali setelah server hidup.
2. Pastikan `postgresql`, `hermes-api`, dan `hermes-gateway` berstatus active.
3. Pastikan `/health` dan `/health/ready` berhasil melalui `127.0.0.1`.
4. Kirim satu request baca dari setiap API-backed topic; uji General/Speaking/Listening
   dengan Q&A biasa dan pastikan tidak ada record aplikasi; pastikan Service Info diam.
5. Buat satu data percobaan melalui topic Finance, Notes, atau Junk; pastikan balasan
   menyertakan referensi stabil dan data benar-benar dapat dibaca kembali.
6. Uji Grammar, Reading, dan Writing secara manual sebelum mengaktifkan cron.
7. Dari `hermes`, jalankan `sudo -iu hermes-agent`, kemudian `hermes doctor`,
   `hermes status --all`, dan `hermes cron doctor`; setelah itu jalankan `exit`.
8. Pastikan user `hermes-agent` tidak dapat membaca `/opt/hermes/app/.env`, private
   deploy key, atau menjalankan `sudo`.
9. Uji backup dan restore sesuai Bagian 20.

Deployment dinyatakan siap pakai hanya jika semua langkah di atas berhasil.

---

## 19. Update / Deploy Ulang

> **Workflow deploy API dijalankan di VPS sebagai user `hermes`. Jika sudah login
> sebagai `hermes`, tidak perlu menjalankan `sudo -iu hermes` lagi.**

Setiap kali ada perubahan kode yang mau dideploy, mulai dari Mac:

```bash
ssh hermes-vps
whoami
```

Output `whoami` harus `hermes`. Baru jalankan command deployment berikut di VPS:

```bash
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

Jika folder `hermes/skills/` atau konfigurasi persona ikut berubah pada deployment,
sinkronkan copy skill runtime dan restart gateway. Jangan menimpa memory yang sudah
dikurasi secara otomatis; template persona/memory perlu digabungkan manual bila
berubah.

> **Command berikut dijalankan sebagai `hermes`. `sudo -u hermes-agent` hanya membuat
> operasi penyalinan berjalan dengan ownership Agent yang benar.**

```bash
for skill in \
  hermes-personal-assistant \
  hermes-general-qna \
  hermes-speaking-qna \
  hermes-listening-qna; do
  sudo -u hermes-agent mkdir -p "/home/hermes-agent/.hermes/skills/$skill"
  sudo -u hermes-agent rsync -a --delete \
    "/opt/hermes/app/hermes/skills/$skill/" \
    "/home/hermes-agent/.hermes/skills/$skill/"
done
sudo -u hermes-agent /home/hermes-agent/.local/bin/hermes skills check
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

> **Command `hermes update` dan `hermes backup` dijalankan sebagai `hermes-agent`.
> Setelah `exit`, command restart/status dijalankan kembali sebagai `hermes`.**

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

> **Monitoring service, backup PostgreSQL, dan crontab user `hermes` dijalankan sebagai
> `hermes` dengan `sudo` jika diperlukan. Backup state Hermes Agent dijalankan memakai
> command `sudo -u hermes-agent` dari user `hermes`.**

Checklist rutin:

- Aktifkan snapshot terjadwal di Tencent Cloud Console.
- Buat backup PostgreSQL terpisah **dan** uji proses restore-nya secara berkala —
  backup yang tidak pernah dicoba di-restore sering ternyata rusak saat baru
  dibutuhkan.
- Pantau disk, RAM, CPU, status service (`hermes-api`, `hermes-gateway`,
  `postgresql`), dan masa berlaku sertifikat TLS jika Nginx dipakai.
- Kalau health check gagal, langkah pertama selalu: `sudo journalctl -u hermes-api
  -n 100 --no-pager`.
- Kalau bot berhenti merespons, dari user `hermes` periksa `sudo systemctl status
  hermes-gateway --no-pager` dan `sudo journalctl -u hermes-gateway -n 100
  --no-pager`. Untuk log CLI Agent, masuk lebih dulu dengan `sudo -iu hermes-agent`.
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

- [ ] VPS bersih sudah diverifikasi: user awal `ubuntu`, Ubuntu 24.04, dan arsitektur `x86_64`.
- [ ] `info-vps.txt` sudah diisi tanpa menaruh private key atau secret di Git/chat.
- [ ] SSH key Hermes di Mac tidak menimpa key existing dan sudah dipasang ke VPS.
- [ ] Security Group: `22` dibatasi ke IP tertentu; `3000`/`5432` tertutup total.
- [ ] Untuk Telegram-only, `80`/`443` juga tertutup; buka hanya jika Bagian 10 dipakai.
- [ ] SSH dari Mac dengan key berhasil.
- [ ] User `hermes` bisa login; login password dan root SSH sudah nonaktif (dicek dari sesi kedua yang masih terbuka sebelum sesi lama ditutup).
- [ ] UFW aktif dan statusnya benar (`sudo ufw status verbose`).
- [ ] (Opsional) fail2ban aktif kalau IP Mac dinamis.
- [ ] (Opsional) swap aktif kalau RAM ≤ 2GB.
- [ ] GitHub deploy key read-only berhasil connect (`ssh -T github-hermes`).
- [ ] Command `bun run db:migrate`, `bun run db:status`, dan `bun run start:api` berhasil dijalankan.
- [ ] Bun ≥ 1.4 dan PostgreSQL terpasang; Postgres hanya `listen_addresses = localhost`.
- [ ] Migration database berhasil dijalankan.
- [ ] `.env` production permission `600`, isinya secret asli (bukan placeholder), dan `DATABASE_URL` memakai role PostgreSQL `hermes`.
- [ ] `hermes-api.service` aktif, `EnvironmentFile` mengarah ke `.env`, restart otomatis terverifikasi (`systemctl status`).
- [ ] User `hermes-agent` tidak memiliki sudo, deploy key, atau akses baca `.env` API.
- [ ] Hermes Agent terpasang; provider/model lolos percakapan CLI dan `hermes doctor`.
- [ ] Telegram bot dibatasi dengan numeric user ID dan merespons di private forum group.
- [ ] Mapping topic benar: Finance/Notes/Junk/General English/Grammar/Reading/Writing ke `hermes-personal-assistant`; General/Speaking/Listening ke skill Q&A non-persisten; Service Info diabaikan.
- [ ] Toolset terminal aktif untuk Telegram/cron; wrapper skill dapat memanggil API lokal.
- [ ] `hermes-gateway` aktif sebagai system service setelah reboot.
- [ ] `/health` dan `/health/ready` sukses lewat `127.0.0.1`.
- [ ] Jika Bagian 10 dipakai: domain HTTPS berhasil, Nginx/Certbot aktif, dan TLS valid.
- [ ] Request baca/tulis end-to-end berhasil dari setiap API-backed topic; General/Speaking/Listening teruji sebagai Q&A tanpa record; Service Info tetap diam untuk pesan masuk.
- [ ] Cron Grammar/Reading/Writing berhasil manual sebelum jadwal otomatis diandalkan.
- [ ] Backup PostgreSQL terjadwal via cron, ditambah snapshot Tencent.
- [ ] Backup Hermes Agent dibuat dan disimpan privat karena mengandung secret.
- [ ] Restore PostgreSQL dan Hermes sudah pernah diuji di environment terpisah.

## Lampiran A — Reset atau uninstall Hermes Agent saja

Bagian ini hanya menghapus Hermes Agent dan Telegram Gateway. User `hermes`, API di
`/opt/hermes/app`, PostgreSQL, dan database tidak ikut dihapus.

> **Jalankan semua command pada lampiran ini sebagai user `hermes`. Jangan menjalankan
> `sudo` dari shell `hermes-agent`; user tersebut memang tidak memiliki akses admin.**

```bash
sudo systemctl stop hermes-gateway
sudo systemctl disable hermes-gateway
sudo loginctl disable-linger hermes-agent
ps -u hermes-agent -o pid,ppid,stat,cmd
```

Jika output `ps` masih berisi proses gateway, hentikan dulu dengan `hermes gateway
stop` sebagai `hermes-agent`, atau kirim `SIGTERM` hanya ke PID gateway yang sudah
diverifikasi. Jangan menggunakan `pkill -u` tanpa melihat daftar proses terlebih dahulu.

Setelah tidak ada proses Agent, hapus unit service dan reload systemd:

```bash
sudo rm -f /etc/systemd/system/hermes-gateway.service
sudo systemctl daemon-reload
sudo systemctl reset-failed hermes-gateway
```

Hapus user beserta seluruh home directory-nya:

```bash
sudo userdel -r hermes-agent
```

Perintah tersebut menghapus `~/.hermes`, token Telegram, konfigurasi model, session,
cron, skill runtime, dan executable Hermes Agent. Verifikasi:

```bash
getent passwd hermes-agent
test ! -e /home/hermes-agent && echo "Hermes Agent sudah dihapus"
sudo systemctl is-active hermes-api
```

Output kosong dari `getent passwd hermes-agent` dan `active` untuk `hermes-api` berarti
Agent sudah dihapus sementara API tetap berjalan. Log lama pada `journalctl` boleh
masih terlihat karena journal systemd menyimpan riwayat; itu bukan bukti service masih
aktif.

---

## Referensi resmi

- [Hermes Agent Quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart)
- [Telegram setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram)
- [Messaging gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)
- [CLI commands](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
