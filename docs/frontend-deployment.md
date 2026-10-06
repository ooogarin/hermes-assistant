# Panduan Deploy Frontend Hermes di VPS Ubuntu dengan Caddy

Panduan ini menjelaskan deploy React frontend Hermes ke VPS Ubuntu yang sudah menjalankan Hermes API dan Hermes Bot. Caddy menyajikan hasil build frontend melalui HTTPS dan meneruskan request `/api` ke API yang sudah berjalan.

Keputusan deployment: gunakan VPS yang sudah ada dengan Caddy sebagai web server dan reverse proxy. Domain publik, port lokal API, serta nama service API masih perlu dikonfirmasi dari VPS. Panduan ini belum membuktikan bahwa deployment produksi telah berhasil; verifikasi di bagian 9 harus dilakukan pada server sebenarnya.

Semua perintah shell di bawah dijalankan melalui SSH ke VPS, kecuali langkah yang secara eksplisit menyebut browser, pengelola DNS, atau panel provider VPS.

Jalankan perintah bertahap dan periksa hasilnya. Jika ada command yang gagal, hentikan langkah berikutnya sampai penyebabnya diselesaikan; jangan menyalin seluruh panduan sebagai satu script. Command administrasi dan pengujian di dokumen ini adalah petunjuk untuk operator, bukan script otomatis yang dipasang pada aplikasi.

## 1. Cara kerja deployment

```text
Browser
  │
  │ https://hermes-project.ooogarin.my.id
  ▼
Caddy pada VPS, port 80 dan 443
  ├── /api dan /api/* → Hermes API pada alamat lokal
  └── halaman dan aset frontend → /srv/hermes/web/current

Hermes API → PostgreSQL
Hermes Bot → Hermes API menggunakan INTERNAL_API_KEY
```

Frontend meminta API menggunakan URL relatif seperti `/api/v1/auth/status`. Browser akan mengakses frontend dan API melalui satu origin, yaitu gabungan protokol, hostname, dan port yang sama.

Origin browser deployment ini adalah `https://hermes-project.ooogarin.my.id`. Request API browser juga menuju `https://hermes-project.ooogarin.my.id/api/v1/...`; Caddy meneruskannya ke API lokal. Login menggunakan cookie HttpOnly, sedangkan Hermes Bot menggunakan kredensial Agent yang sudah ada.

Proxy pada `apps/web/vite.config.ts` hanya berlaku saat development. Hasil build Vite berisi file statis; Caddy menjalankan fungsi penyajian file dan proxy pada produksi. Tidak perlu menjalankan `bun run dev:web` atau `vite preview` sebagai server produksi.

Referensi kontrak aplikasi: [arsitektur](architecture.md), [frontend](frontend.md), dan [desain autentikasi](auth-design.md).

## 2. Yang harus disiapkan

| Kebutuhan | Cara memastikan |
| --- | --- |
| Akses SSH dan `sudo` | Bisa masuk ke VPS dan menjalankan perintah administratif |
| Domain atau subdomain | Bisa mengubah DNS untuk hostname yang akan dipakai frontend |
| IP publik VPS | Ambil dari panel provider; gunakan IP publik, bukan IP jaringan privat |
| Port lokal API | Ditemukan pada listener `127.0.0.1:3000`; verifikasi endpoint `/health` sebelum deploy |
| Cara menjalankan API | Ketahui apakah API memakai systemd, Docker, atau process manager lain |
| Sumber environment API | Ketahui file atau konfigurasi yang benar-benar dibaca service API |
| Repo frontend pada versi yang diinginkan | Contoh lokasi yang sudah digunakan: `/opt/hermes/app` |
| Bun dan dependency | VPS melaporkan Bun `1.4.2`; README saat ini mensyaratkan Bun 1.4 atau lebih baru |
| Ruang disk dan memori | VPS melaporkan disk `/opt` dan `/srv` tersedia 26 GiB, RAM total 1.9 GiB (1.2 GiB available), swap 3.9 GiB |
| Firewall | Port publik TCP 80 dan 443 dapat dijangkau dari internet |

Isi nilai berikut sebelum menjalankan contoh yang bergantung padanya:

| Nilai | Contoh dalam panduan | Ganti dengan |
| --- | --- | --- |
| Hostname frontend | `hermes-project.ooogarin.my.id` | Domain dari Sumopod yang diberikan untuk deployment ini |
| Direktori repo | `/opt/hermes/app` | Lokasi checkout repo di VPS |
| Alamat API lokal | `127.0.0.1:3000` | Sudah terdeteksi; ganti hanya jika pemeriksaan health membuktikan alamat berbeda |
| Nama service API | `hermes-api.service` | Terlihat active/running di systemd |

API pada VPS ini berjalan sebagai `hermes-api.service`; Hermes Agent Gateway berjalan sebagai `hermes-gateway.service`. Port API `3000`, `/health`, dan `/health/ready` sudah dikonfirmasi berhasil. Endpoint readiness mengembalikan HTTP 200 dan status `ok`.

## 3. Periksa kondisi VPS dan API

### 3.1. Periksa listener dan tool yang terpasang

```sh
sudo ss -ltnp
command -v caddy
command -v nginx
bun --version
df -h /opt /srv
free -h
```

Pada pemeriksaan VPS yang dibagikan untuk panduan ini:

| Listener atau sumber daya | Keadaan yang teramati |
| --- | --- |
| API | `127.0.0.1:3000`, proses `bun` |
| PostgreSQL | `127.0.0.1:5432`, proses `postgres` |
| Unit systemd aplikasi | `hermes-api.service` dan `hermes-gateway.service`, keduanya active/running |
| API health | `/health` dan `/health/ready` mengembalikan HTTP 200; readiness berstatus `ok` |
| Caddy dan Nginx | Tidak ditemukan oleh `command -v` |
| Port publik yang sedang listen | Hanya SSH pada port `22`; tidak ada listener `80`/`443` |
| UFW | Aktif; inbound `22/tcp`, `80/tcp`, dan `443/tcp` diizinkan untuk IPv4 dan IPv6 |
| DNS frontend | Record A Sumopod `hermes-project.ooogarin.my.id` → `43.157.229.102`, TTL `1800`; lookup DNS dan IP publik VPS yang dilaporkan `curl -4 https://api.ipify.org` sama-sama `43.157.229.102` |
| Bun | `1.4.2` |
| Disk `/opt` dan `/srv` | 40 GiB total, 13 GiB terpakai, 26 GiB tersedia |
| Memori | 1.9 GiB total, 1.2 GiB available, swap 3.9 GiB |

Angka ini adalah snapshot saat pemeriksaan, bukan jaminan kondisi selanjutnya. Periksa lagi ketika melakukan deployment.

Jika port 80 atau 443 sekarang dipakai proses lain, identifikasi proses tersebut sebelum memasang atau mengaktifkan Caddy.

### 3.2. Pastikan alamat lokal API

Output listener yang dibagikan menunjukkan API pada `127.0.0.1:3000` dan PostgreSQL pada `127.0.0.1:5432`. Binding lokal PostgreSQL sudah sesuai untuk koneksi lokal; Caddy hanya perlu meneruskan request ke port API, bukan database.

`/health` dan `/health/ready` sudah diuji dan mengembalikan HTTP 200. Respons readiness lengkap adalah `{"success":true,"data":{"status":"ok"}}`; API dapat terhubung ke PostgreSQL.

```sh
curl --show-error --silent --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:3000/health
curl --show-error --silent --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:3000/health/ready
```

Keduanya harus mengembalikan HTTP 200 dengan envelope JSON sukses. `/health` memeriksa proses aplikasi; `/health/ready` juga memeriksa koneksi PostgreSQL. Jika readiness gagal, selesaikan masalah API/database sebelum melanjutkan.

Jika port API berbeda, ganti `3000` pada seluruh contoh. Jangan berasumsi port API adalah `3000` hanya karena itu nilai default repo.

### 3.3. Kenali service API

Daftar service yang dibagikan menunjukkan `hermes-api.service` dan `hermes-gateway.service` active/running. Unit API yang dikelola systemd adalah `hermes-api.service`; gunakan nama ini untuk operasi API setelah memastikan perubahan environment dilakukan pada sumber yang benar.

Untuk melihat service systemd yang sedang berjalan:

```sh
systemctl list-units --type=service --state=running --no-pager
```

Jika menggunakan Docker, lihat container dan port publiknya:

```sh
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
```

Perintah Docker hanya relevan jika Docker memang dipakai. Jika akun SSH belum memiliki akses Docker, gunakan mekanisme akses administratif yang sudah digunakan pada VPS.

Pada API yang berjalan langsung di host, Caddy dapat meneruskan request ke listener `127.0.0.1`. Jika API berjalan di container dan Caddy dipasang di host, API harus memiliki port yang dapat dijangkau dari host, misalnya publikasi port `127.0.0.1:3000:3000`. Di dalam container, aplikasi biasanya perlu mendengarkan pada `0.0.0.0`; alamat itu berbeda dari alamat publikasi port pada host.

Catat alamat API, nama service, dan sumber environment. Panduan ini tidak mengasumsikan nama service atau tata letak Docker tertentu.

## 4. Siapkan DNS dan firewall

### 4.1. Arahkan domain ke VPS

Di pengelola DNS, tambahkan record:

| Type | Name | Value |
| --- | --- | --- |
| `A` | Hostname yang dipilih, misalnya `hermes` | IPv4 publik VPS |

Isi kolom `Name` mengikuti aturan pengelola DNS. Sebagian panel menerima `hermes`, sebagian menerima hostname lengkap. Buat record `AAAA` hanya jika IPv6 publik VPS benar-benar berfungsi. Record IPv6 yang salah dapat membuat sebagian koneksi atau validasi sertifikat gagal.

Untuk domain ini, screenshot Sumopod menunjukkan record A `hermes-project.ooogarin.my.id` menuju `43.157.229.102` dengan TTL `1800`. Lookup DNS dan hasil `curl -4 https://api.ipify.org` dari VPS sama-sama menunjukkan `43.157.229.102`; IP DNS sudah cocok dengan IPv4 publik VPS. Lookup DNS tidak mengembalikan record AAAA. Jangan mengubah record domain lain yang tidak terkait deployment ini.

Jika layanan DNS menyediakan mode proxy/CDN, mulai dengan koneksi DNS langsung ke VPS agar penerbitan sertifikat dan jalur request mudah diuji. Saat mengaktifkan proxy/CDN nanti, pastikan `/api/*` tidak di-cache dan HTTPS dari proxy ke VPS tetap valid.

Periksa DNS menggunakan panel DNS atau tool lookup dari komputer di luar VPS. Jika `dig` sudah tersedia:

```sh
dig +short A hermes-project.ooogarin.my.id
dig +short AAAA hermes-project.ooogarin.my.id
```

Alamat yang keluar harus sesuai dengan IP publik VPS. Tunggu sampai resolusi DNS sudah benar sebelum mengandalkan penerbitan sertifikat.

### 4.2. Buka port web

Pada firewall/security group provider VPS, izinkan inbound TCP `80` dan `443`. Pertahankan akses SSH pada port yang sedang digunakan. UDP `443` dapat dibuka untuk HTTP/3, tetapi HTTPS biasa tetap dapat berjalan melalui TCP `443`.

UFW VPS yang diperiksa dalam sesi ini sudah aktif dan mengizinkan `22/tcp`, `80/tcp`, serta `443/tcp` untuk IPv4 dan IPv6. Karena aturan provider VPS belum diperiksa, pastikan inbound TCP `80` dan `443` juga diizinkan pada panel provider. Jika akses IPv6 belum disiapkan, verifikasi DNS `AAAA` dan hapus record yang tidak sesuai daripada mengandalkan aturan IPv6 saja.

Periksa firewall Ubuntu:

```sh
sudo ufw status verbose
```

Jika UFW aktif, tambahkan aturan web:

```sh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status verbose
```

Jika UFW tidak aktif, jangan mengaktifkannya sebelum memastikan port SSH sebenarnya sudah diizinkan. Firewall provider dan firewall OS adalah dua lapisan berbeda; jika keduanya aktif, keduanya harus mengizinkan trafik web.

Caddy menggunakan DNS dan konektivitas publik untuk mengurus sertifikat HTTPS. Detail persyaratannya ada pada [Automatic HTTPS](https://caddyserver.com/docs/automatic-https).

Jangan tutup endpoint/port API lama sebelum memastikan cara Hermes Bot mengakses API. Jika bot berjalan pada VPS yang sama, endpoint lokal bisa digunakan. Jika bot berada di mesin lain, verifikasi aksesnya melalui endpoint HTTPS dengan kredensial Agent sebelum menutup port lama. PostgreSQL tidak perlu dibuka ke internet untuk deploy frontend ini.

## 5. Siapkan environment API produksi

Browser menggunakan cookie yang diterbitkan API. Nilai `WEB_AUTH_ORIGIN` harus sama persis dengan origin frontend, tanpa path atau trailing slash.

Contoh pengaturan non-rahasia untuk API yang berjalan langsung di host:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
WEB_AUTH_ORIGIN=https://hermes-project.ooogarin.my.id
```

`HOST=127.0.0.1` sesuai untuk proses API di host yang diakses Caddy lokal. Sesuaikan jika API berjalan di container atau masih memiliki caller yang memerlukan alamat jaringan lain. Jangan mengubah binding sampai jalur akses Bot/Agent sudah diketahui.

Environment API juga membutuhkan `DATABASE_URL`, `INTERNAL_API_KEY`, `WEB_AUTH_PASSWORD_HASH`, dan `WEB_AUTH_JWT_SECRET`. Pertahankan nilai yang sudah benar pada backend. Deployment frontend tidak mengharuskan mengganti kredensial Agent atau signing secret.

Jika pengaturan auth belum ada, ikuti [konfigurasi auth](auth-design.md#server-configuration) dan [setup repo](../README.md#local-setup). Hash password harus Argon2id yang valid; signing secret harus 64 karakter hex lowercase. Pada file dotenv Bun, setiap `$` literal dalam hash harus di-escape sebagai `\$`, termasuk jika nilai dibungkus tanda kutip. Environment variable langsung dari secret manager memakai hash asli tanpa escape dotenv.

Jangan memasukkan kredensial tersebut ke variabel `VITE_*`, Caddyfile, kode frontend, atau hasil build. Caddy tidak perlu mengetahui password, JWT secret, atau Agent API key.

Script API repo membaca `.env` di root workspace. Service produksi bisa menggunakan environment dari sumber lain, sehingga perubahan harus dilakukan pada sumber yang benar-benar dibaca proses API. Hindari menampilkan seluruh `.env` atau environment process ke terminal/chat.

Setelah mengubah environment, restart **service API yang sebenarnya** menggunakan process manager yang sudah digunakan. Untuk systemd, contoh berikut hanya dijalankan setelah nama unit diganti:

```sh
sudo systemctl restart hermes-api.service
sudo systemctl status hermes-api.service --no-pager
```

Untuk Docker atau process manager lain, gunakan alur pembaruan environment yang sesuai dengan setup tersebut. Jangan menjalankan instance API tambahan secara manual jika API sudah dikelola sebagai service.

Ulangi pemeriksaan `/health` dan `/health/ready`. Perubahan environment yang memerlukan restart dapat menyebabkan jeda singkat pada API; lakukan pada waktu yang sesuai. JWT lama tetap berlaku jika signing secret tidak berubah.

`API_PROXY_TARGET` hanya untuk proxy development Vite. Frontend produksi saat ini tidak membutuhkan `VITE_API_URL` karena semua request API memakai path relatif.

## 6. Pasang Caddy pada Ubuntu

Gunakan paket stable resmi. Paket ini menyiapkan user `caddy` dan service systemd `caddy` secara otomatis. Perintah berikut mengikuti [instruksi instalasi resmi](https://caddyserver.com/docs/install):

```sh
sudo apt update
sudo apt install --yes debian-keyring debian-archive-keyring apt-transport-https curl gnupg rsync

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list

sudo apt update
sudo apt install --yes caddy
```

Jalankan instalasi repository ini satu kali. Jika file key atau source sudah ada dari instalasi sebelumnya, periksa konfigurasi yang ada sebelum mengulanginya.

Periksa hasil instalasi:

```sh
caddy version
sudo systemctl status caddy --no-pager
```

Service dapat langsung menyajikan halaman default paket sebelum Caddyfile diganti. Halaman default bukan frontend Hermes; lanjutkan ke build dan konfigurasi berikut.

## 7. Build dan siapkan rilis frontend pertama

### 7.1. Build versi repo yang akan dideploy

Jika source frontend belum tersedia pada checkout VPS, ambil versi yang sudah ditinjau melalui alur Git yang digunakan proyek. Untuk memperbarui branch yang sedang digunakan, periksa perubahan lokal dan fetch dahulu:

```sh
cd /opt/hermes/app
git status --short
git branch --show-current
git fetch origin
```

Setelah memastikan checkout bersih, nama branch benar, dan versi baru sesuai dengan backend yang memakai checkout ini, gunakan pembaruan fast-forward. Ganti placeholder branch sebelum menjalankan:

```sh
git pull --ff-only origin NAMA_BRANCH_YANG_AKAN_DIRILIS
```

Jika branch tidak bisa di-fast-forward, tinjau penyebabnya; jangan memaksa reset. Jika backend harus tetap menggunakan source dan dependency versi lama, build frontend dari checkout terpisah atau unggah hasil `dist` yang dibangun dari versi frontend yang diinginkan. Salin hasil tersebut ke direktori rilis menggunakan alur bagian 7.2; sesuaikan path sumber `apps/web/dist` dengan lokasi hasil build.

```sh
cd /opt/hermes/app
git status --short
git rev-parse --short HEAD
bun install --frozen-lockfile
bun run --filter @hermes/web build
```

Pastikan checkout berisi versi frontend yang ingin dirilis. Jika ada perubahan lokal yang belum di-commit, tinjau dulu; jangan memakai `git reset --hard` untuk membersihkan VPS. Catat commit yang dideploy agar dapat ditelusuri kembali.

Build menjalankan TypeScript check frontend dan menghasilkan file statis di `apps/web/dist`. Lanjutkan hanya jika command build selesai tanpa error dan file berikut tersedia:

```sh
test -f apps/web/dist/index.html
ls -lh apps/web/dist
```

Jalankan Bun sebagai akun aplikasi, bukan melalui `sudo`. VPS melaporkan RAM total sekitar 2 GiB dengan 1.2 GiB available. Build frontend dapat dilakukan di VPS, tetapi jika memori menipis atau API/Bot terasa lambat, build di mesin development dan unggah hanya `apps/web/dist` ke VPS. Instalasi dependency pada workspace bisa memengaruhi dependency backend yang digunakan ketika API berikutnya restart; deploy dari versi repo yang memang sesuai dengan backend atau gunakan hasil build dari checkout terpisah jika hanya frontend yang akan dirilis.

### 7.2. Salin hasil build ke direktori rilis

Panduan memakai `/srv/hermes/web` agar Caddy hanya membaca hasil build. Repo, `.env`, dan file runtime Bot tetap berada di lokasinya sendiri. Contoh struktur setelah rilis pertama:

```text
/srv/hermes/web/
├── releases/
│   └── <waktu-rilis>-<commit>/
│       ├── index.html
│       └── assets/
└── current → releases/<waktu-rilis>-<commit>
```

Jalankan pada shell yang sama setelah build:

```sh
hermes_release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
hermes_release_path="/srv/hermes/web/releases/$hermes_release_id"

sudo install -d -o root -g caddy -m 0755 /srv/hermes /srv/hermes/web /srv/hermes/web/releases "$hermes_release_path"
sudo rsync -a --chown=root:caddy --chmod=D755,F644 apps/web/dist/ "$hermes_release_path/"

sudo -u caddy test -r "$hermes_release_path/index.html"
```

Jika pemeriksaan izin gagal, perbaiki izin baca/traversal direktori sebelum mengaktifkan rilis. Caddy tidak membutuhkan akses tulis ke file frontend.

Aktifkan rilis melalui pergantian symlink:

```sh
sudo ln -sfnT "$hermes_release_path" /srv/hermes/web/current.next
sudo mv -Tf /srv/hermes/web/current.next /srv/hermes/web/current

readlink -f /srv/hermes/web/current
sudo -u caddy test -r /srv/hermes/web/current/index.html
```

Langkah ini mengasumsikan `current` adalah symlink atau belum ada. Jika lokasi tersebut sudah menjadi direktori biasa dari deployment sebelumnya, pindahkan dan tinjau isinya sebelum memakai alur symlink ini. Timestamp rilis memakai UTC sebagai identitas teknis.

## 8. Konfigurasikan dan aktifkan Caddy

### 8.1. Simpan konfigurasi sebelumnya

```sh
sudo cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-hermes
sudo nano /etc/caddy/Caddyfile
```

Backup ini dibuat saat setup awal. Pada perubahan berikutnya, gunakan nama backup lain agar konfigurasi lama tidak tertimpa.

### 8.2. Isi Caddyfile

Ganti domain dan alamat API dengan nilai yang sudah diverifikasi:

```caddyfile
hermes-project.ooogarin.my.id {
    root * /srv/hermes/web/current
    encode zstd gzip

    @api path /api /api/*
    handle @api {
        reverse_proxy 127.0.0.1:3000
    }

    handle /assets/* {
        header Cache-Control "public, max-age=31536000, immutable"
        file_server
    }

    handle {
        route {
            try_files {path} /index.html
            header /index.html Cache-Control "no-cache, must-revalidate"
            file_server
        }
    }
}
```

Bagian konfigurasi tersebut memiliki fungsi berikut:

| Bagian | Fungsi |
| --- | --- |
| Hostname | Menentukan website publik dan HTTPS yang dikelola Caddy |
| `root` | Menyajikan rilis yang ditunjuk symlink `current` |
| `encode` | Mengompresi respons yang sesuai |
| `handle @api` | Meneruskan semua request `/api` dan `/api/*` ke API, termasuk respons error |
| `handle /assets/*` | Menyajikan aset Vite dengan cache panjang; file yang tidak ada tetap 404 |
| `try_files` | Mengembalikan `index.html` untuk rute React seperti `/finance` dan `/notes` |
| Header `index.html` | Meminta browser memvalidasi ulang HTML agar mendapat rilis terbaru |

Gunakan `handle`, bukan `handle_path`, pada API. Backend membutuhkan prefix `/api/v1`; `handle_path` akan menghapus prefix yang cocok. Pola pemisahan SPA dan API didasarkan pada [panduan Caddy](https://caddyserver.com/docs/caddyfile/patterns).

Proxy ini tidak menambahkan header `Authorization` atau Agent API key. Cookie, `Set-Cookie`, dan `Origin` diteruskan melalui proxy; backend tetap memvalidasi autentikasi dan origin. Jangan menambahkan cache API atau mengarahkan respons API yang gagal ke `index.html`. Perilaku proxy didokumentasikan dalam [reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Konfigurasi ini menyajikan health endpoint hanya melalui alamat lokal API. URL publik `/health` tidak diproxy dan akan masuk ke fallback frontend. Gunakan pemeriksaan health lokal dari bagian 3, serta pemeriksaan auth publik dari bagian 9.

### 8.3. Validasi dan reload

```sh
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Jika validasi gagal, perbaiki Caddyfile terlebih dahulu. Setelah valid:

```sh
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
sudo journalctl -u caddy -n 80 --no-pager
```

Reload menerapkan perubahan konfigurasi tanpa harus menghentikan service. Caddy mengurus penerbitan serta perpanjangan sertifikat; penyimpanan state/certificate service harus dipertahankan. Referensi pengoperasian service: [Keep Caddy Running](https://caddyserver.com/docs/running).

## 9. Verifikasi sebelum dipakai

### 9.1. Periksa HTTPS dan routing dari luar VPS

Jalankan dari komputer lain atau cek melalui browser. Jangan menggunakan `curl -k`, karena itu mengabaikan validasi sertifikat yang justru perlu diperiksa.

```sh
curl -I http://hermes-project.ooogarin.my.id
curl -I https://hermes-project.ooogarin.my.id/login
curl -I https://hermes-project.ooogarin.my.id/finance
curl -i https://hermes-project.ooogarin.my.id/api/v1/auth/status
curl -i https://hermes-project.ooogarin.my.id/api/v1/__deployment_missing
curl -I https://hermes-project.ooogarin.my.id/assets/__deployment_missing.js
```

Hasil yang diharapkan:

| Pemeriksaan | Hasil |
| --- | --- |
| HTTP | Redirect ke HTTPS, biasanya 308 |
| HTTPS `/login` dan `/finance` | 200, HTML frontend, sertifikat dipercaya |
| Auth status tanpa cookie | 401 dengan JSON Hermes |
| Path API yang tidak ada | JSON error 401 tanpa auth, atau 404 setelah auth; tidak mengembalikan HTML frontend |
| Aset yang tidak ada | 404; tidak mengembalikan HTML frontend sebagai JavaScript |
| Respons API | `Cache-Control: private, no-store` |

`/finance` bisa mengembalikan HTML 200 meskipun belum login. Pengamanan data dilakukan oleh API, dan frontend kemudian mengarahkan browser ke login.

### 9.2. Periksa login dan cookie melalui browser

1. Buka `https://hermes-project.ooogarin.my.id/login` pada private/incognito window.
2. Login menggunakan password web yang sudah dikonfigurasi.
3. Pada DevTools, periksa cookie `__Host-hermes_auth`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, dan tanpa atribut Domain eksplisit. Jangan menyalin atau membagikan nilai cookie/JWT.
4. Periksa bahwa `GET /api/v1/auth/status` setelah login menghasilkan 200.
5. Buka `/finance` atau `/notes` secara langsung, lalu refresh. Halaman harus tetap dapat dimuat.
6. Periksa bahwa request browser memakai domain frontend yang sama dan tidak membawa Agent bearer key.
7. Coba simpan dan edit data uji non-sensitif, misalnya satu Notes yang akan dihapus setelah verifikasi. Pastikan operasi berhasil dan response tetap JSON.
8. Logout. Cookie harus dihapus, UI kembali ke login, dan auth status berikutnya menghasilkan 401.

Request browser yang mengubah data harus membawa `Origin: https://hermes-project.ooogarin.my.id`. Pemeriksaan origin login dan logout tetap berlaku meskipun belum memiliki cookie.

Untuk memastikan origin asing ditolak tanpa menyertakan kredensial:

```sh
curl -i -X POST https://hermes-project.ooogarin.my.id/api/v1/auth/logout -H 'Origin: https://example.invalid'
```

Hasil yang diharapkan adalah 403 `FORBIDDEN`. Jangan mengirim password atau token melalui command line untuk pengujian login; gunakan browser.

### 9.3. Periksa API dan Bot yang sudah berjalan

Ulangi health lokal dan satu operasi Bot yang biasa digunakan. Pastikan Bot masih bisa mengakses API dengan kredensial Agent yang sama. Jika menyesuaikan binding atau menutup port API lama, lakukan setelah jalur akses Bot berhasil diverifikasi.

Deploy frontend ini tidak membutuhkan migrasi database dengan sendirinya. Jika versi backend ikut berubah, ikuti kebutuhan migrasi rilis backend tersebut secara terpisah.

Catat hostname, commit frontend, waktu rilis, dan hasil verifikasi tanpa mencatat secret. Deployment dinyatakan siap setelah HTTPS, cookie login, routing SPA, operasi API, dan akses Bot berhasil diverifikasi.

## 10. Memperbarui frontend

Gunakan checkout versi repo yang ingin dirilis. Hindari pembaruan otomatis ke branch yang belum ditinjau pada server yang juga menjalankan API.

```sh
cd /opt/hermes/app
git status --short
git rev-parse --short HEAD
bun install --frozen-lockfile
bun run --filter @hermes/web build
```

Setelah build berhasil, siapkan rilis baru dan catat rilis sebelumnya:

```sh
hermes_previous_release=$(readlink -f /srv/hermes/web/current)
hermes_release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)"
hermes_release_path="/srv/hermes/web/releases/$hermes_release_id"

sudo install -d -o root -g caddy -m 0755 "$hermes_release_path"
sudo rsync -a --chown=root:caddy --chmod=D755,F644 apps/web/dist/ "$hermes_release_path/"
sudo rsync -a --ignore-existing --chown=root:caddy --chmod=D755,F644 "$hermes_previous_release/assets/" "$hermes_release_path/assets/"

sudo -u caddy test -r "$hermes_release_path/index.html"
```

Hentikan alur jika salah satu command gagal. Penyalinan aset rilis lama membantu tab browser yang masih terbuka menyelesaikan pemuatan chunk JavaScript setelah rilis berganti. `index.html` tetap berasal dari build baru. Karena aset lama disalin ke rilis baru, penggunaan disk bertambah; bersihkan setelah periode dukungan tab lama selesai dan rilis rollback yang diperlukan sudah disimpan.

Aktifkan rilis baru:

```sh
sudo ln -sfnT "$hermes_release_path" /srv/hermes/web/current.next
sudo mv -Tf /srv/hermes/web/current.next /srv/hermes/web/current
readlink -f /srv/hermes/web/current
```

Pergantian symlink berlangsung setelah seluruh file rilis tersedia. Caddyfile masih menunjuk path yang sama, sehingga update file frontend ini tidak membutuhkan reload Caddy atau restart API. Ulangi pemeriksaan browser dari bagian 9.

## 11. Rollback frontend dan konfigurasi

### 11.1. Rollback rilis frontend

Jika masih berada pada shell update yang sama, `hermes_previous_release` berisi path rilis sebelumnya. Jika memakai shell baru, lihat direktori rilis, lalu tetapkan variabel ke path rilis yang sudah diketahui baik:

```sh
ls -1 /srv/hermes/web/releases
readlink -f /srv/hermes/web/current
```

Contoh berikut harus diganti dengan direktori rilis yang benar-benar ada:

```sh
hermes_previous_release='/srv/hermes/web/releases/GANTI_DENGAN_RILIS_SEBELUMNYA'
sudo -u caddy test -r "$hermes_previous_release/index.html"
```

Hanya setelah pemeriksaan file berhasil, aktifkan rilis tersebut:

```sh
sudo ln -sfnT "$hermes_previous_release" /srv/hermes/web/current.next
sudo mv -Tf /srv/hermes/web/current.next /srv/hermes/web/current
readlink -f /srv/hermes/web/current
```

Minta browser refresh setelah rollback. Tab yang masih menjalankan frontend baru dapat meminta aset yang tidak ada pada rilis lama. Rollback frontend tidak mengembalikan versi backend atau schema database; pilih rilis yang masih kompatibel dengan API saat ini.

### 11.2. Pulihkan Caddyfile

Jika perubahan Caddyfile menyebabkan masalah, edit berdasarkan backup konfigurasi terakhir yang diketahui baik, validasi, lalu reload. Backup `Caddyfile.before-hermes` dari setup awal dapat berisi halaman default paket; memulihkannya tidak memulihkan frontend Hermes.

```sh
sudo nano /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Jalankan reload hanya setelah validasi berhasil. Jangan menghapus state Caddy atau sertifikat untuk menyelesaikan masalah routing.

## 12. Troubleshooting

| Gejala | Yang perlu diperiksa |
| --- | --- |
| Domain tidak dapat dibuka | DNS A/AAAA, IP publik, firewall provider/UFW, dan status Caddy |
| Sertifikat belum berhasil diterbitkan | Resolusi DNS publik, akses TCP 80/443, record IPv6, serta pesan ACME di journal Caddy |
| HTTPS bekerja tetapi muncul halaman default Caddy | Caddyfile yang dipakai, hostname yang cocok, serta apakah reload berhasil |
| 502 pada `/api/*` | Port API pada Caddyfile, service API, dan hasil `curl` health lokal |
| 403 saat login atau simpan | `WEB_AUTH_ORIGIN` harus persis origin browser; periksa header Origin dan environment yang benar-benar dibaca API |
| Login berhasil tetapi status terus 401 | Cookie `Secure`/HttpOnly, penggunaan HTTPS, forwarding `Set-Cookie`/Cookie, dan signing secret yang konsisten |
| 429 saat login | Batas login API: tunggu sesuai `Retry-After`; jangan melakukan percobaan berulang cepat |
| 404 saat refresh rute frontend | Fallback `try_files` berada di handler frontend dan menunjuk `index.html` |
| API mengembalikan HTML | Handler API harus cocok sebelum fallback SPA; prefix `/api/v1` harus tetap diteruskan |
| File frontend 403 | User `caddy` harus dapat membaca file dan melewati setiap direktori pada path rilis |
| Tampilan lama setelah update | Target symlink, header cache HTML, serta refresh browser |
| Chunk JavaScript gagal setelah update | Build terunggah lengkap, handler `/assets/*`, dan aset rilis lama yang masih dibutuhkan tab terbuka |
| Build kehabisan memori | Periksa `free -h`; build di checkout/mesin lain lalu unggah hanya `dist`, agar proses API/Bot tetap memiliki resource |
| Bot gagal sesudah binding/firewall diubah | Endpoint yang dipakai Bot, alamat listener API, dan port/jalur akses yang masih diperlukan |

Perintah diagnosis yang tidak memerlukan secret:

```sh
sudo systemctl status caddy --no-pager
sudo journalctl -u caddy -n 100 --no-pager
sudo ss -ltnp
sudo -u caddy test -r /srv/hermes/web/current/index.html
readlink -f /srv/hermes/web/current
curl --fail --show-error --silent http://127.0.0.1:3000/health/ready
```

Tinjau isi log sebelum membagikannya. Jangan membagikan `.env`, password, cookie/JWT, `DATABASE_URL`, atau `INTERNAL_API_KEY`.

## 13. Checklist penyelesaian

- [ ] Hostname dan port API aktual sudah dicatat.
- [ ] DNS menunjuk IP publik VPS dan record IPv6 sesuai jika digunakan.
- [ ] TCP 80/443 terbuka pada firewall yang aktif; akses SSH tetap tersedia.
- [ ] API lokal dan PostgreSQL readiness berhasil.
- [ ] Environment auth produksi valid dan `WEB_AUTH_ORIGIN` sama persis dengan origin frontend.
- [ ] Caddy berjalan sebagai service dan Caddyfile sudah tervalidasi.
- [ ] Hanya hasil build frontend yang disajikan dari `/srv/hermes/web/current`.
- [ ] HTTPS dipercaya browser dan HTTP dialihkan ke HTTPS.
- [ ] Refresh rute React berhasil; path API tidak masuk ke fallback HTML.
- [ ] Cookie login, auth status, operasi simpan/edit, dan logout berhasil.
- [ ] Origin asing ditolak dan API mengirim `Cache-Control: private, no-store`.
- [ ] Hermes Bot masih dapat mengakses API melalui jalur yang digunakan.
- [ ] Rilis sebelumnya disimpan untuk rollback; backup data produksi mengikuti setup backend yang sudah ada.

## Referensi

- [Hermes Architecture](architecture.md)
- [Hermes Report Frontend](frontend.md)
- [Personal Web Authentication Design](auth-design.md)
- [Instalasi Caddy resmi](https://caddyserver.com/docs/install)
- [Pengoperasian service Caddy](https://caddyserver.com/docs/running)
- [Pola konfigurasi SPA dan API](https://caddyserver.com/docs/caddyfile/patterns)
- [Reverse proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Automatic HTTPS Caddy](https://caddyserver.com/docs/automatic-https)
