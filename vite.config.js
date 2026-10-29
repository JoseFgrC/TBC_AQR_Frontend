import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';
import { webcrypto } from 'node:crypto';

// Node 18 no expone globalThis.crypto y serialize-javascript (lo carga workbox) lo usa al importarse.
// En Node 20+ esta línea no hace nada.
globalThis.crypto ??= webcrypto;

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const backend = env.BACKEND_URL || 'http://localhost:3000';
	// El celular solo habla con Vite (HTTPS); Vite reenvía al backend por la red local.
	const proxy = {
		// xfwd: manda X-Forwarded-For con la IP real del celular. El backend solo lo lee con
		// TRUST_PROXY=loopback (ver su .env.example); así el rate limit no ve a todos como 127.0.0.1.
		'/api': { target: backend, changeOrigin: true, xfwd: true },
		'/uploads': { target: backend, changeOrigin: true },
	};

	return {
		plugins: [
			react(),
			basicSsl(),
			VitePWA({
				registerType: 'autoUpdate',
				// sw.js sin minificar: terser corre en un worker donde el ajuste de crypto de arriba no llega
				// (Node 18). El service worker pesa unos KB, minificarlo no aporta.
				mode: 'development',
				includeAssets: ['icon.svg', 'logo-telebachillerato.png', 'favicon.ico', 'favicon-tbc.png', 'apple-touch-icon-180x180.png'],
				manifest: {
					name: 'Escáner de asistencia',
					short_name: 'Asistencia',
					description: 'Registra entradas y salidas con la credencial QR.',
					lang: 'es',
					start_url: '/',
					display: 'standalone',
					orientation: 'portrait',
					background_color: '#f3f7ef',
					theme_color: '#008544',
					icons: [
						{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
						{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
						{ src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
					],
				},
				workbox: {
					// Solo se guarda el cascarón; la API y las fotos siempre van a la red.
					navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
					globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
				},
			}),
		],
		test: {
			environment: 'jsdom',
			include: ['src/**/*.test.js'],
		},
		server: { host: true, port: 5173, proxy },
		preview: { host: true, port: 4173, proxy },
	};
});
