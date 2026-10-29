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

## Desarrollo y pruebas

- **Modo demo** (solo `npm run dev`): abre `https://localhost:5173/?demo=1`. La API se simula y el
  botón "Demo" lanza cada caso (entrada, retardo, errores, 401, 429, 500…). Un correo que contenga
  "directora" (o el selector "Entrar como") entra al panel, y "Hoy sin clases" simula un día sin clases.
  Los datos del panel viven en memoria (`src/demo/admin.js`). No entra en el build.
- `npm test`: pruebas unitarias (Vitest).
- `npm run screenshots -- <carpeta>`: capturas y revisiones de responsive/accesibilidad con
  Playwright + axe en `screenshots/<carpeta>/` (usa Google Chrome; `PW_CHANNEL=` para el Chromium
  de Playwright). Playwright está fijado en 1.55.1 porque las versiones nuevas exigen Node 20.
  Cubre de 280 px (plegable) a 1920 px, tabletas, texto y zoom al 200 %, y el menú ☰ abierto y
  cerrado. `SHOTS_ONLY=390x844,1024x768 npm run screenshots -- x` corre solo esos tamaños.
- `npm run e2e`: pruebas de punta a punta contra el backend real (`../TBC_AQR_Backend`) en una BD
  solo de pruebas (`asistencia_escolar_test`, se crea y se borra sola) y sin token de Telegram.
  Capturas y PDF en `screenshots/e2e/`. Ver el encabezado de `scripts/e2e.mjs`.
