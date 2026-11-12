# Escáner de asistencia (frontend)

PWA con dos entradas según el rol de la cuenta (backend en `../TBC_AQR_Backend`):

- `escaner`: lee la credencial QR en la puerta y registra entradas/salidas.
- `directora`: panel de administración (`src/panel/`, navegación por hash `#/alumnos/12`);
  "Escanear" abre el mismo escáner.

```bash
npm install
cp .env.example .env     # VITE_API_URL vacío = usa el proxy de Vite
npm run dev              # https://localhost:5173 y https://<IP-LAN>:5173
npm run build            # genera dist/ con service worker
npm run icons            # regenera los PNG de la PWA desde public/icon.svg
```

Vite reenvía `/api` y `/uploads` a `BACKEND_URL` (por defecto `http://localhost:3000`), así que
el celular solo habla HTTPS con Vite y no hace falta cambiar CORS en el backend.

Probado con Node 18; ver el comentario de `globalThis.crypto` en `vite.config.js`.

## Pruebas

- `npm test`: pruebas unitarias (Vitest).
