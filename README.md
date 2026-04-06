# GOD - Garbage Odor Detection

Aplikasi monitoring IoT dengan arsitektur:
- Backend proxy: Hono
- Frontend: React + Vite

## Fitur Utama
- Landing page modern dengan branding GOD.
- Navbar global untuk navigasi `Landing` dan `Dashboard`.
- Dynamic background + cursor trail (aktif di device normal).
- Dashboard sensor interaktif (NH3 MICS, NH3 MEMS, H2S, NO2, CO, MQ135).
- Dark mode / light mode dengan penyimpanan preferensi.
- Filter data:
  - Berdasarkan jumlah data (preset + custom)
  - Custom by waktu (start/end datetime + quick range 1/6/24 jam)
- UI ditingkatkan dengan komponen reusable (`Button`, `Card`, `Input`, `Badge`, `Separator`).

## Optimasi 1 Core / 2GB
- Auto low-power mode berdasarkan:
  - `navigator.hardwareConcurrency <= 2`
  - `navigator.deviceMemory <= 2`
  - `prefers-reduced-motion: reduce`
- Efek berat dimatikan di mode ini (route transition, cursor trail, animasi intensif).
- Polling API adaptif:
  - Normal: 5 detik
  - Low-power: 12 detik
- Polling otomatis pause saat tab tidak aktif.
- Routing halaman menggunakan lazy loading untuk menurunkan beban awal.

## Endpoint Data
Sumber data upstream:
`http://45.126.43.35:5000/api/data`

Proxy lokal Hono:
- `GET /api/health`
- `GET /api/data`

## Cara Menjalankan
1. Install dependency
```bash
npm install
```

2. Jalankan backend + frontend
```bash
npm run dev
```

3. Buka aplikasi
- Frontend: `http://localhost:5173`
- Hono API: `http://localhost:8000/api/data`

## Build Production
```bash
npm run build
npm run preview
```
