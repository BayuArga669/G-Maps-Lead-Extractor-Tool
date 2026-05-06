Product Requirement Document (PRD)
Project Name: G-Maps Lead Extractor Tool

Document Status: Draft / v1.0

Target Platform: CLI (Command Line Interface) / Internal Tool

1. Latar Belakang & Tujuan Bisnis (Background & Objectives)
Proses pencarian prospek (leads) secara manual di Google Maps memakan waktu yang sangat lama dan tidak efisien. Diperlukan sebuah otomatisasi untuk mengumpulkan data kontak bisnis publik secara massal.

Tujuan Utama: Membangun tool internal untuk mengekstrak data nama bisnis dan nomor telepon dari Google Maps berdasarkan kata kunci dan lokasi spesifik.

Use Case: Mendukung strategi outbound marketing. Contohnya, mengekstrak kontak wedding organizer atau vendor lokal untuk di-B2B-kan dengan platform seperti AxiomSite.

2. Pengguna Sasaran (Target Audience)
Pengguna Internal: Developer atau tim marketing yang akan menjalankan tool ini melalui terminal/CLI.

3. Fitur Utama (Functional Requirements)
Keyword Input: Pengguna dapat memasukkan kata kunci pencarian secara fleksibel (contoh: "Percetakan di Surabaya").

Automated Lazy-Load Scrolling: Sistem mampu menavigasi sidebar hasil pencarian dan melakukan scroll otomatis hingga seluruh daftar tempat dalam satu area termuat sepenuhnya.

Data Extraction: Sistem mengekstrak dua data points utama dari setiap kartu hasil pencarian:

Nama Tempat Bisnis

Nomor Telepon (jika tersedia)

Data Export: Hasil ekstraksi diubah dan disimpan secara otomatis ke dalam format yang mudah dibaca, yaitu .csv atau .json.

4. Kebutuhan Non-Fungsional (Non-Functional Requirements)
Anti-Bot Mitigation: Sistem harus memiliki delay acak (jeda waktu dinamis) di setiap aksi (klik, scroll) untuk meniru perilaku manusia agar terhindar dari blokir IP atau trigger CAPTCHA Google.

Error Handling: Sistem tidak boleh crash (berhenti total) jika ada tempat yang tidak memiliki nomor telepon; sistem harus mencatat nilainya sebagai "Tidak Tersedia" atau "N/A" dan lanjut ke urutan berikutnya.

Headless Operation: Script dapat dijalankan di latar belakang tanpa membuka jendela browser secara visual (opsi headless: true) untuk menghemat memori.

5. Alur Pengguna (User Flow)
Pengguna membuka terminal (VS Code / Command Prompt).

Pengguna menjalankan perintah: node scraper.js "Kata Kunci Pencarian".

Sistem memberikan log di terminal: [Memulai pencarian untuk: "Kata Kunci Pencarian"...]

Sistem melakukan otomatisasi di latar belakang (simulasi scroll dan ekstraksi).

Sistem memberikan notifikasi: [Selesai! 45 data ditemukan. Tersimpan di leads.csv]

Pengguna membuka file leads.csv untuk melihat hasilnya.

6. Spesifikasi Teknis (Tech Specs)
Environment: Node.js

Automation Engine: Playwright

Output Handler: fs (File System) untuk JSON, atau library csv-writer untuk export ke CSV.

7. Batasan & Risiko (Constraints & Risks)
Perubahan Struktur DOM: Google Maps sering mengubah nama class HTML mereka secara dinamis. Perawatan (maintenance) script secara berkala diperlukan untuk memperbarui selector elemen.

Limitasi Area: Pencarian Google Maps membatasi hasil yang ditampilkan dalam satu area (biasanya mentok di 100-120 hasil). Untuk data yang lebih masif, script perlu dimodifikasi agar bisa menggeser koordinat peta secara otomatis (pengembangan fase 2).