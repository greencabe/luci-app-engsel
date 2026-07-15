# Engsel Patch Memory

> Baca file ini terlebih dahulu setelah `/compact`, context reset, atau pergantian agent. File ini adalah checkpoint pekerjaan audit dan patch yang belum di-commit.

## Tujuan

- Repo utama: `/data/data/com.termux/files/home/luci-app-engsel`
- Referensi upstream Python: `/data/data/com.termux/files/home/me-cli-sunset`
- Tujuan proyek: membawa logic penting upstream ke backend C + LuCI yang lebih sederhana, ringan, cepat, dan cocok untuk OpenWrt tanpa merombak struktur sekarang.
- Baseline repo: `6602dc71beac35c91282610709df9896f167d8ef`
- Baseline upstream: `0e8a06f2b52583b2d91b1fc1a4270b6cf8dfc205`
- Tanggal checkpoint: 2026-07-16, Asia/Makassar.

## Fakta upstream yang menjadi batas desain

- Upstream mengirim settlement balance, QRIS, e-wallet, voucher, point, gift, dan unsubscribe satu kali. Tidak ada generic retry setelah request mutasi dikirim.
- Retry kedua hanya ada sebagai koreksi bisnis khusus response `Bizz-err.Amount.Total` pada flow balance + decoy.
- Read/preflight boleh refresh token dan retry karena tidak membuat transaksi.
- Upstream tidak memiliki response cache; cache di repo C adalah optimasi khusus OpenWrt dan harus diinvalidate saat mutasi.
- Endpoint `pending-transactions` upstream masih placeholder yang memakai profile endpoint. Repo C mempertahankan parity tersebut; jangan menyebutnya endpoint pending final.
- Menu notifikasi aktif upstream mengambil daftar dari `dashboard/api/v8/segments` dengan payload `access_token`, lalu membaca `data.notification.data`.
- Upstream menandai notifikasi sebagai terbaca dengan membuka `api/v8/notification/detail` untuk setiap `notification_id` yang belum dibaca. Endpoint lama `api/v8/notification-non-grouping` ada di client tetapi tidak dipakai menu aktif.

## Patch yang sudah diterapkan

### Dependency dan build

- Menghapus runtime `dlopen`/`dlsym` dan soname mbedTLS yang hard-coded.
- Backend sekarang include header mbedTLS resmi dan link langsung ke `-lmbedcrypto`, kompatibel dengan API mbedTLS 2.x dan 3.x.
- Root Makefile selalu mempertahankan flag/library wajib walau caller mengisi `CFLAGS` atau `LDLIBS`.
- Menghapus `uclient-fetch`/wget fallback; transport hanya memakai `curl`, yang memang sudah dependency.
- Workflow feed memasang `curl`, bukan `uclient-fetch`.
- Package backend dinaikkan ke `1.0.0-r3`; package LuCI ke `1.0.0-r2`; README disesuaikan.

### Transport HTTP

- Menghapus `curl --retry` agar mutasi tidak diulang diam-diam oleh transport.
- Batas response 2 MiB; child curl dibunuh dan di-wait jika melebihi batas.
- Output parsial dari curl dengan exit nonzero selalu ditolak sebagai `HTTP_FETCH_FAILED`.
- Read menangani `EINTR`; waitpid failure juga menjadi error.

### Token dan transaksi

- Settlement/unsubscribe tidak pernah auto-replay setelah auth failure.
- Auth failure pada payment-method preflight menghapus token cache agar invocation berikutnya refresh.
- Auth failure setelah mutasi menghapus token disk dan token live; flow berikutnya dipaksa refresh, bukan mengulang settlement.
- Bizz amount hanya dibaca dari field JSON `message` pada response gagal, lalu retry khusus decoy tetap dipertahankan sesuai upstream.
- Cache akun diinvalidate sebelum dan sesudah mutasi. Store cache juga ikut dibersihkan karena eligibility dapat berubah.

### Cache performa LuCI

- Cache per akun di `/tmp/engsel-cache`:
  - dashboard balance/quota: 15 detik;
  - tiering: 30 detik;
  - store segments/packages/family-list: 300 detik.
- Maksimum file cache 1 MiB dan hanya response JSON sukses dengan bentuk endpoint yang sesuai yang disimpan.
- Nama cache memuat fingerprint seluruh konfigurasi relevan, sehingga perubahan env tidak memakai response lama.
- Epoch per akun mencegah request read lama menulis cache stale setelah transaksi berjalan.
- Logout, delete akun, perubahan subscription type, transaksi, redeem, dan unsubscribe menghapus cache terkait.

### Penyimpanan akun

- `accounts.tsv` hanya ditulis jika ada perubahan.
- Write tetap atomic dan memakai lock.
- Save melakukan merge record dirty dengan snapshot disk terbaru agar dua request LuCI untuk akun berbeda tidak saling menimpa.
- Delete memakai tombstone dan tidak menghapus update akun lain.
- Record lama yang dihapus tab lain tidak dapat muncul kembali dari stale dirty save; hanya login akun baru yang boleh insert.
- Parser TSV memakai delimiter-preserving parser, sehingga subscriber ID/subscription type kosong tidak membuat akun hilang.
- Delete dari menu interaktif sekarang memakai jalur delete yang sama dengan CLI/JSON, termasuk invalidasi token/cache.

### Wrapper dan packaging OpenWrt

- Wrapper tidak lagi menjalankan belasan `uci get` pada setiap command.
- Perubahan `/etc/config/engsel` dideteksi dengan `sha256sum` BusyBox; fallback mtime tetap ada jika applet tidak tersedia.
- UCI ditulis ke `/etc/engsel/.env` secara atomic, mode privat, trap signal keluar dengan benar, dan optional DECOY key boleh tidak ada.
- Semua UCI key kosong menghasilkan env kosong (fail closed), bukan memakai secret lama atau resync terus-menerus.
- Perubahan config membersihkan response cache.
- Postinst memakai canonical `.env` sebagai prioritas atas legacy `/etc/engsel.env`, mengecek kegagalan copy/set/commit/write/move, dan membuat stamp SHA-256.
- Conffiles terdaftar untuk `/etc/config/engsel`, `/etc/engsel/.env`, dan `/etc/engsel.env`, sehingga upgrade tidak menimpa konfigurasi pengguna.

### Notifikasi upstream di LuCI

- Menambah tab top-level `Notifikasi` setelah `Riwayat` dan sebelum `Settings` melalui order 4/5.
- Halaman baru memuat status READ/UNREAD, brief message, full message, timestamp, total, dan jumlah unread dari bentuk data upstream.
- Tombol `Mark as Read` dan `Read All Unread` memanggil notification detail, sama seperti mekanisme upstream.
- Batch maksimal 64 ID per proses backend; UI otomatis membagi batch berikutnya bila jumlah lebih besar. Ini menghindari startup binary/UCI berulang untuk tiap item.
- Daftar notifikasi boleh melakukan satu refresh-token retry karena read-only. Aksi menandai baca tidak auto-replay setelah auth failure; pengguna dapat mengulang secara eksplisit.
- Input notification ID dibatasi 256 byte tanpa whitespace/control character dan selalu di-escape sebelum menjadi JSON.
- Tidak ada dependency baru dan daftar notifikasi sengaja tidak memakai response cache agar status baca segera terlihat setelah refresh.

## File kerja yang berubah

- `.github/workflows/openwrt-apk.yml`
- `Makefile`
- `README.md`
- `package/luci-app-engsel/Makefile`
- `package/luci-app-engsel/htdocs/luci-static/resources/view/engsel/notifikasi.js` (baru)
- `package/luci-app-engsel/root/usr/share/luci/menu.d/luci-app-engsel.json`
- `package/openwrt/Makefile`
- `package/openwrt/files/engsel.wrapper`
- `src/engsel.c`
- `memory.md` (file checkpoint ini)

Checkpoint ini dibuat sebelum commit/build/router validation. Jangan reset atau menimpa perubahan yang belum tercatat di Git.

## Validasi yang sudah lulus

- `git diff --check`.
- JSON menu dan ACL lolos parser.
- `node --check` untuk view `notifikasi.js`.
- Syntax C notifikasi lulus dengan dan tanpa json-c memakai shim mbedTLS sementara yang sudah dibuang.
- Runtime stub memvalidasi versi `1.0.0-r3` serta JSON error untuk no-active-account, missing ID, dan invalid ID.
- Runtime mock notifikasi memvalidasi list sukses, read-all hanya mengirim ID unread, aksi mark-read tidak direplay saat auth failure, dan list read-only boleh tepat satu auth retry.
- `sh -n package/openwrt/files/engsel.wrapper`.
- Syntax postinst setelah ekspansi escape Makefile.
- Dry-run root Makefile dengan override `CFLAGS`/`LDLIBS`; library wajib tetap ada.
- Clang syntax dengan mbedTLS 3.x + json-c.
- Clang syntax dengan mbedTLS 2.x + fallback JSON tanpa json-c.
- Clang static analyzer tanpa finding.
- Runtime regression harness lulus:
  - merge update akun paralel;
  - akun terhapus tidak resurrect;
  - TSV field kosong;
  - fingerprint config cache;
  - epoch menolak stale cache writer dan menerima current writer;
  - parser Bizz hanya membaca message;
  - token disk/live dibuang pada auth failure;
  - output curl parsial ditolak.
- Wrapper harness lulus:
  - sync pertama membaca UCI;
  - command berikutnya tidak membaca UCI lagi;
  - perubahan config dengan mtime sama tetap terdeteksi;
  - optional DECOY key boleh hilang;
  - semua key kosong fail closed;
  - cache dibersihkan saat config berubah.
- Harness paralel OTP dua akun mempertahankan kedua record akun; merge/lock tidak kehilangan update.
- Baseline-versus-current harness memastikan transport retry dan generic settlement retry lama sudah dihapus, direct mbedTLS aktif, response cache aktif, notifikasi tersedia, dan mutation tidak auto-replay.
- Tiga review agent menyatakan tidak ada Critical/High/blocker tersisa setelah temuan mereka dipatch.

## Batas validasi

- Belum melakukan transaksi nyata, OTP, redeem, unsubscribe, atau mark-read notifikasi pada akun nyata agar tidak menimbulkan side effect/tagihan/perubahan status.
- Belum menjalankan full OpenWrt SDK build secara lokal karena host Termux tidak memiliki header/library mbedTLS. Syntax diuji memakai header shim 2.x/3.x yang sudah dibuang setelah test.
- GitHub workflow adalah jalur build SDK lintas arsitektur berikutnya. Jangan klaim artifact OpenWrt sudah dibangun sebelum workflow benar-benar hijau.
- Workflow APK ditargetkan ke OpenWrt 25.12.5 agar sama dengan router validasi Linksys EA6350v3 (`ipq40xx/generic`, ARMv7).
- Race sangat kecil saat proses lama menghapus token cache baru dari proses lain hanya menyebabkan refresh tambahan, bukan replay transaksi atau kehilangan refresh token akun.

## Cara melanjutkan

```sh
cd /data/data/com.termux/files/home/luci-app-engsel
cat memory.md
git status --short
git diff --check
git diff --stat
```

Sebelum commit/release, jalankan workflow SDK untuk IPK/APK. Pertahankan aturan utama: read/preflight boleh retry auth, tetapi settlement/unsubscribe tidak boleh auto-replay; Bizz retry hanya exception bisnis khusus decoy.
