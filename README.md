# FrontEndSkripsi - Hono + React

Dashboard IoT untuk membaca data sensor dari endpoint:
`http://45.126.43.35:5000/api/data`

## Stack
- Backend proxy: Hono (`server/index.js`)
- Frontend: React + Vite (`src/`)

## Cara Run
1. Install dependency
```bash
npm install
```

2. Jalankan frontend + backend sekaligus
```bash
npm run dev
```

3. Buka aplikasi
- React: `http://localhost:5173`
- Hono API: `http://localhost:8000/api/data`

## Endpoint Lokal
- `GET /api/health`
- `GET /api/data` (proxy ke server upstream)
