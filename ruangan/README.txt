SEKAWAN JAYA — PROTOTIPE VISUALISASI KERAMIK & GRANIT (FOTO RUANGAN)

ISI FILE
- index.html            : halaman utama.
- styles.css            : tampilan responsif desktop & HP.
- app.js                : katalog contoh, filter, pencarian, dan mesin penggantian lantai.
- rooms.js              : data ruangan: poligon lantai, perkiraan perspektif kamera.
- assets/ruang-tamu.js  : foto ruangan (tertanam sebagai data, supaya tetap jalan saat file dibuka langsung dari komputer).
- assets/tekstur-*.js: foto tekstur asli motif Luxor Grey, Morocco Gris, dan Miquel Gold (512x512, tertanam). Motif lain masih urat gambaran.

CARA MENJALANKAN
1. Ekstrak ZIP (jangan dibuka dari dalam ZIP).
2. Klik dua kali index.html. Tanpa server, tanpa build, tanpa internet (font Google opsional).
3. Pilih motif atau cari (contoh: "60x60", "60 × 60 cm", "marble"), lalu tekan kartu produk.
4. "Lihat lantai asli" menampilkan foto aslinya sebagai pembanding.

CARA KERJA SINGKAT
- Lantai pada foto ditandai dengan poligon (rooms.js > floor). Furniture, karpet, dan kabinet TV dikecualikan.
- Ubin digambar dengan perspektif sesuai ukuran (cm), lalu dicampur dengan bayangan dan pantulan foto asli.
  Warna ubin dijaga setia ke motif (tanpa nuansa hangat ruangan; eksposur dikoreksi agar rata-rata warna sama
  dengan motif). Kilau "Glossy" sedang dan pantulan terang dibatasi supaya tidak menutupi urat motif;
  "Matt" memantul lebih lemah. Atur di fungsi composite (app.js): nilai g dan pengali .6.
- Garis nat lama di foto dihapus otomatis (closeRadius), lalu diganti nat ubin yang dipilih.
- Motif bertanda seamless:true (Miquel Gold) dipasang tanpa diputar/dicermin supaya urat menyambung antar ubin.
- Motif dengan foto tekstur asli (properti texture di app.js) dipetakan per piksel mengikuti perspektif lantai; tiap ubin memakai salah satu dari 4 variasi (cermin) agar tidak terlihat identik.
- Katalog contoh hanya memuat ukuran 50x50 dan 60x60. Nat dibuat tipis tetapi terlihat (lebih gelap pada ubin terang, lebih terang pada ubin gelap) supaya ukuran ubin terbaca.

PENYESUAIAN (rooms.js > camera)
- height : tinggi kamera (cm). Naikkan = ubin tampak lebih kecil, turunkan = lebih besar.
- f      : panjang fokus. Naikkan = ubin tampak lebih pipih, turunkan = lebih mendekati persegi.
  (Nilai sekarang: height 70, f 700, horizon 290. Sengaja dibuat sedikit lebih besar dari skala furnitur
  supaya ubin terasa besar di ruangan luas; skala murni terhadap sofa/meja kopi sekitar height 90.)
- vx, horizon : titik hilang garis lantai. Ubah hanya jika arah nat terlihat miring.

CATATAN JUJUR
- Skala ubin adalah perkiraan (foto ini bukan hasil ukur). Gunakan sebagai gambaran, bukan perhitungan jumlah dus; untuk itu pakai kalkulator.
- Warna layar bisa berbeda dari warna keramik asli. Hanya Luxor Grey, Morocco Gris, dan Miquel Gold yang memakai foto produk asli; motif lain masih ilustrasi.
- Untuk menambah motif berfoto asli: siapkan foto 1 ubin utuh (persegi, tanpa nat/tepi), lalu minta ditambahkan.
- Foto menggantikan ruangan ilustrasi; hanya 1 ruangan saat ini. rooms.js sudah berbentuk daftar untuk ruangan tambahan.
- Hosting gratis: unggah semua file ke Cloudflare Pages atau GitHub Pages (situs statis).

CATATAN TAMPILAN (UPGRADE VISUAL)
- Hanya index.html dan styles.css yang diubah. app.js, rooms.js, dan folder assets tidak disentuh, jadi cara kerja visualisasi sama persis.
- Font: Bricolage Grotesque (judul) dan Instrument Sans (isi) dari Google Fonts. Tanpa internet, otomatis memakai font bawaan perangkat.
