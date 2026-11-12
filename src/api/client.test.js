import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, buildQuery, onUnauthorized, request, resolveAssetUrl, safeImageDataUrl, session } from './client.js';

const respond = (status, body, contentType = 'application/json') => vi.fn(async () => new Response(
	typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } },
));

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
	it('envía el token como Bearer y devuelve data', async () => {
		session.save('abc.def', { nombre: 'Puerta' });
		const fetchMock = respond(200, { success: true, message: 'ok', data: { hay_clases: true } });
		vi.stubGlobal('fetch', fetchMock);

		await expect(request('/api/horarios/dia')).resolves.toEqual({ hay_clases: true });
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/horarios/dia');
		expect(init.headers.Authorization).toBe('Bearer abc.def');
	});

	it('no manda Authorization en el login (auth: false)', async () => {
		session.save('viejo', {});
		const fetchMock = respond(200, { success: true, data: {} });
		vi.stubGlobal('fetch', fetchMock);
		await request('/api/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' }, auth: false });
		expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
		expect(fetchMock.mock.calls[0][1].body).toBe('{"email":"a@b.c","password":"x"}');
	});

	it('401 borra la sesión y avisa a la app (logout)', async () => {
		session.save('vencido', { nombre: 'Puerta' });
		vi.stubGlobal('fetch', respond(401, { success: false, message: 'Token inválido o expirado' }));
		const listener = vi.fn();
		const unsubscribe = onUnauthorized(listener);

		await expect(request('/api/asistencias/escanear', { method: 'POST', body: { token: 'x' } }))
			.rejects.toMatchObject({ kind: 'http', status: 401 });
		expect(listener).toHaveBeenCalledOnce();
		expect(session.token).toBeNull();
		expect(session.user).toBeNull();
		unsubscribe();
	});

	it('401 del login (credenciales malas) no dispara el logout global', async () => {
		vi.stubGlobal('fetch', respond(401, { success: false, message: 'Credenciales inválidas' }));
		const listener = vi.fn();
		const unsubscribe = onUnauthorized(listener);
		await expect(request('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toBeInstanceOf(ApiError);
		expect(listener).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('5xx sin JSON (el proxy no llega al backend apagado) -> error de red "Sin conexión"', async () => {
		// Vite responde 500 vacío en text/plain; nginx, 502/504 con HTML.
		vi.stubGlobal('fetch', respond(500, '', 'text/plain'));
		await expect(request('/api/padres')).rejects.toMatchObject({ kind: 'network', message: 'Sin conexión' });
		vi.stubGlobal('fetch', respond(502, '<html>Bad Gateway</html>', 'text/html'));
		await expect(request('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({ kind: 'network' });
		vi.stubGlobal('fetch', respond(500, '', 'text/plain'));
		await expect(request('/api/credenciales/1/pdf', { responseType: 'blob' })).rejects.toMatchObject({ kind: 'network' });
	});

	it('5xx con el JSON del backend sigue siendo error del servidor', async () => {
		vi.stubGlobal('fetch', respond(500, { success: false, message: 'Error interno del servidor' }));
		await expect(request('/api/padres')).rejects.toMatchObject({ kind: 'http', status: 500 });
		vi.stubGlobal('fetch', respond(503, { success: false, message: 'Telegram no está configurado' }));
		await expect(request('/api/padres/1/telegram/enlace', { method: 'POST' })).rejects.toMatchObject({ kind: 'http', status: 503 });
	});

	it('respuesta sin JSON (429 en texto plano) -> ApiError con status, sin romperse', async () => {
		vi.stubGlobal('fetch', respond(429, 'Too many requests, please try again later.', 'text/plain'));
		await expect(request('/api/asistencias/escanear', { method: 'POST', body: {} }))
			.rejects.toMatchObject({ kind: 'http', status: 429, message: '' });
	});

	it('fetch que falla -> ApiError de red', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
		await expect(request('/api/horarios/dia')).rejects.toMatchObject({ kind: 'network' });
	});

	it('conserva data del error (alumno del QR)', async () => {
		const data = { alumno: { nombre: 'Ana' }, salida_permitida_desde: '08:05' };
		vi.stubGlobal('fetch', respond(400, { success: false, message: 'Entrada ya registrada a las 07:55', data }));
		await expect(request('/api/asistencias/escanear', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 400, data });
	});
});

describe('request: validación y consultas', () => {
	it('conserva details de validación para marcar cada campo', async () => {
		const details = [{ field: 'nombre', message: 'Campo requerido' }];
		vi.stubGlobal('fetch', respond(400, { success: false, message: 'Errores de validación', details }));
		await expect(request('/api/alumnos', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 400, details });
	});

	it('sin details (producción) -> details null', async () => {
		vi.stubGlobal('fetch', respond(400, { success: false, message: 'Errores de validación' }));
		await expect(request('/api/alumnos', { method: 'POST', body: {} })).rejects.toMatchObject({ details: null });
	});

	it('PDF que no llega completo (red cortada) -> ApiError de red', async () => {
		const broken = new Response('x', { status: 200 });
		broken.blob = () => Promise.reject(new TypeError('network'));
		vi.stubGlobal('fetch', vi.fn(async () => broken));
		await expect(request('/api/credenciales/1/pdf', { responseType: 'blob' })).rejects.toMatchObject({ kind: 'network' });
	});
});

describe('buildQuery', () => {
	it('omite vacíos y codifica', () => {
		expect(buildQuery({ a: '', b: null, c: undefined })).toBe('');
		expect(buildQuery({ search: 'José Pérez', page: 1 })).toBe('?search=Jos%C3%A9+P%C3%A9rez&page=1');
		expect(buildQuery({ activo: false, n: 0 })).toBe('?activo=false&n=0');
	});
});

describe('safeImageDataUrl', () => {
	it('acepta PNG en base64', () => {
		expect(safeImageDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
	});
	it.each(['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'https://evil.com/qr.png', 'data:image/png;base64,"><script>', null])('rechaza %s', value => {
		expect(safeImageDataUrl(value)).toBeNull();
	});
});

describe('session', () => {
	it('clear borra token y usuario', () => {
		session.save('t', { nombre: 'x' });
		session.clear();
		expect(session.token).toBeNull();
		expect(localStorage.length).toBe(0);
	});
});

describe('resolveAssetUrl', () => {
	it('reescribe localhost:3000/uploads a ruta relativa (pasa por el proxy)', () => {
		expect(resolveAssetUrl('http://localhost:3000/uploads/alumnos/a.png')).toBe('/uploads/alumnos/a.png');
		expect(resolveAssetUrl('http://127.0.0.1:3000/uploads/alumnos/a.png')).toBe('/uploads/alumnos/a.png');
		expect(resolveAssetUrl('/uploads/alumnos/a.png')).toBe('/uploads/alumnos/a.png');
	});

	it('acepta http(s) externos (Cloudinary)', () => {
		expect(resolveAssetUrl('https://res.cloudinary.com/x/alumno-1.jpg')).toBe('https://res.cloudinary.com/x/alumno-1.jpg');
	});

	it.each([
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		' javascript:alert(1)',
		'data:image/svg+xml,<svg onload=alert(1)>',
		'vbscript:x',
		'file:///etc/passwd',
		'//evil.com/x.png',
		'/api/auth/me',
		'foto.png',
		'',
		null,
		42,
	])('rechaza %s', value => {
		expect(resolveAssetUrl(value)).toBeNull();
	});
});
