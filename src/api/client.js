const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'aqr.token';
const USER_KEY = 'aqr.user';

const unauthorizedListeners = new Set();

export const session = {
	get token() {
		try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
	},
	get user() {
		try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; }
	},
	save(token, user) {
		try {
			localStorage.setItem(TOKEN_KEY, token);
			localStorage.setItem(USER_KEY, JSON.stringify(user));
		} catch { /* sin almacenamiento: la sesión dura lo que la pestaña */ }
	},
	clear() {
		try {
			localStorage.removeItem(TOKEN_KEY);
			localStorage.removeItem(USER_KEY);
		} catch { /* nada que limpiar */ }
	},
};

// App se suscribe aquí para volver al login en cuanto la API responda 401.
export const onUnauthorized = listener => {
	unauthorizedListeners.add(listener);
	return () => unauthorizedListeners.delete(listener);
};

export class ApiError extends Error {
	constructor(kind, message, status = 0, data = null, details = null) {
		super(message);
		this.kind = kind; // 'network' | 'http'
		this.status = status;
		this.data = data; // contexto que el backend adjunta al error (p. ej. el alumno del QR)
		this.details = details; // errores de validación [{ field, message }]; el backend los omite en producción
	}
}

// { search: 'ana', page: 1, grado: '' } -> "?search=ana&page=1" (se omiten los vacíos)
export const buildQuery = (params = {}) => {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
	}
	const text = query.toString();
	return text ? `?${text}` : '';
};

// Content-Disposition: inline; filename="credencial-3.pdf" -> "credencial-3.pdf"
const filenameFrom = header => {
	const match = String(header || '').match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
	if (!match) return null;
	try { return decodeURIComponent(match[1]); } catch { return match[1]; }
};

// body: objeto (JSON) o FormData (archivos; el navegador pone el Content-Type con su boundary).
// responseType 'blob': devuelve { blob, filename } (PDF); los errores siguen llegando en JSON.
export const request = async (path, { method = 'GET', body, auth = true, query, responseType = 'json' } = {}) => {
	const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
	const headers = { Accept: responseType === 'blob' ? 'application/pdf, application/json' : 'application/json' };
	if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
	if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;

	let response;
	try {
		response = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, {
			method,
			headers,
			body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
		});
	} catch {
		throw new ApiError('network', 'Sin conexión');
	}

	if (response.ok && responseType === 'blob') {
		try {
			return { blob: await response.blob(), filename: filenameFrom(response.headers.get('Content-Disposition')) };
		} catch {
			throw new ApiError('network', 'Sin conexión');
		}
	}

	const json = await response.json().catch(() => null);
	// El backend siempre contesta JSON; un 5xx sin JSON lo genera el proxy (Vite, nginx…) porque no
	// pudo llegar al backend (apagado o caído): para quien usa la app es lo mismo que no tener red.
	if (!json && response.status >= 500) throw new ApiError('network', 'Sin conexión');
	const payload = json || {};

	if (response.status === 401 && auth) {
		session.clear();
		unauthorizedListeners.forEach(listener => listener());
	}
	if (!response.ok || payload.success === false) {
		throw new ApiError('http', payload.message || '', response.status, payload.data || null, Array.isArray(payload.details) ? payload.details : null);
	}
	return payload.data;
};

// foto_url viene de la base: solo se aceptan rutas /uploads/ y URLs http(s); nunca javascript:, data:, etc.
// El backend la arma con su propio host (http://localhost:3000/uploads/...), que no existe desde el
// celular, así que esas se reescriben a ruta relativa para que pasen por el proxy.
export const resolveAssetUrl = url => {
	if (typeof url !== 'string' || !url) return null;
	const local = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/\S*)$/i);
	if (local) return `${BASE_URL}${local[1]}`;
	if (url.startsWith('/uploads/')) return `${BASE_URL}${url}`;
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
	} catch {
		return null;
	}
};

// qrDataUrl del backend: solo imágenes en base64 (PNG, JPEG o SVG).
export const safeImageDataUrl = url =>
	typeof url === 'string' && /^data:image\/(?:png|jpeg|svg\+xml);base64,[A-Za-z0-9+/]+=*$/.test(url) ? url : null;
