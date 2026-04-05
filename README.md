# GOON - Gas OdOr detectioN

Aplikasi monitoring IoT dengan arsitektur:
- Backend proxy: Hono
- Frontend: React + Vite

## Fitur Utama
- Landing page modern dengan branding GOON.
- Navbar global untuk navigasi `Landing` dan `Dashboard`.
- Animasi transisi halaman dan elemen menggunakan Framer Motion.
- Dynamic background animatif + cursor trail (desktop).
- Dashboard sensor interaktif (NH3 MICS, NH3 MEMS, H2S, NO2, CO, MQ135).
- Dark mode / light mode dengan penyimpanan preferensi.
- Filter data:
  - Berdasarkan jumlah data (preset + custom)
  - Custom by waktu (start/end datetime + quick range 1/6/24 jam)
- Integrasi ikon dari Untitled UI (`@untitledui/icons-react`).

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
