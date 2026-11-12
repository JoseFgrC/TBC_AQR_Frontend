import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { session } from './client.js';
import * as api from './endpoints.js';

let fetchMock;
const ok = (data = null) => new Response(JSON.stringify({ success: true, message: 'ok', data }), { status: 200, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
	localStorage.clear();
	session.save('tok', { rol: 'directora' });
	fetchMock = vi.fn(async () => ok());
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const lastCall = () => {
	const [url, init] = fetchMock.mock.calls.at(-1);
	return { url, method: init.method, headers: init.headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body };
};

// [nombre, llamada, método, URL, cuerpo JSON esperado]
const CASES = [
	['registrarEscaner', () => api.registrarEscaner({ nombre: 'Portero', email: 'p@e.com', password: 'Entrada123' }), 'POST', '/api/auth/registro', { nombre: 'Portero', email: 'p@e.com', password: 'Entrada123' }],
	['listUsuarios', () => api.listUsuarios(), 'GET', '/api/auth/usuarios', undefined],
	['setEstadoUsuario', () => api.setEstadoUsuario(7, false), 'PATCH', '/api/auth/usuarios/7/estado', { activo: false }],
	['restablecerPassword', () => api.restablecerPassword(7, 'Nueva1234'), 'PATCH', '/api/auth/usuarios/7/password', { password: 'Nueva1234' }],
	['cambiarPassword', () => api.cambiarPassword('a', 'b'), 'PATCH', '/api/auth/password', { password_actual: 'a', password_nueva: 'b' }],
	['getMiTelegram', () => api.getMiTelegram(), 'GET', '/api/auth/telegram', undefined],
	['crearEnlaceMiTelegram', () => api.crearEnlaceMiTelegram('Actual123'), 'POST', '/api/auth/telegram/enlace', { password: 'Actual123' }],
	['desvincularMiTelegram', () => api.desvincularMiTelegram(), 'DELETE', '/api/auth/telegram', undefined],

	['listPadres', () => api.listPadres(), 'GET', '/api/padres', undefined],
	['getPadre', () => api.getPadre(3), 'GET', '/api/padres/3', undefined],
	['createPadre sin teléfono', () => api.createPadre({ nombre: 'María', telefono: '' }), 'POST', '/api/padres', { nombre: 'María' }],
	['createPadre con teléfono', () => api.createPadre({ nombre: 'María', telefono: '555' }), 'POST', '/api/padres', { nombre: 'María', telefono: '555' }],
	['setNotificacionesPadre', () => api.setNotificacionesPadre(1, false), 'PATCH', '/api/padres/1/notificaciones', { activo: false }],
	['crearEnlaceTelegram', () => api.crearEnlaceTelegram(1), 'POST', '/api/padres/1/telegram/enlace', undefined],
	['vincularTelegram', () => api.vincularTelegram(1, '123'), 'PATCH', '/api/padres/1/telegram', { telegram_chat_id: '123' }],
	['desvincularTelegram', () => api.desvincularTelegram(1), 'DELETE', '/api/padres/1/telegram', undefined],

	['listAlumnos', () => api.listAlumnos({ search: 'ana', page: 2, limit: 50 }), 'GET', '/api/alumnos?search=ana&page=2&limit=50', undefined],
	['listAlumnos sin filtros', () => api.listAlumnos(), 'GET', '/api/alumnos', undefined],
	['getAlumno', () => api.getAlumno(5), 'GET', '/api/alumnos/5', undefined],
	['createAlumno sin grado ni tutores', () => api.createAlumno({ nombre: 'Ana', grado: '', tutores: [] }), 'POST', '/api/alumnos', { nombre: 'Ana' }],
	['createAlumno completo', () => api.createAlumno({ nombre: 'Ana', grado: '3B', tutores: [{ id_padre: 1, parentesco: 'mamá' }] }), 'POST', '/api/alumnos',
		{ nombre: 'Ana', grado: '3B', tutores: [{ id_padre: 1, parentesco: 'mamá' }] }],
	['updateAlumno', () => api.updateAlumno(5, { activo: false }), 'PUT', '/api/alumnos/5', { activo: false }],
	['asignarTutor (id del select como número)', () => api.asignarTutor(5, { id_padre: '2', parentesco: 'tía' }), 'POST', '/api/alumnos/5/tutores', { id_padre: 2, parentesco: 'tía' }],
	['asignarTutor sin parentesco', () => api.asignarTutor(5, { id_padre: 2, parentesco: '' }), 'POST', '/api/alumnos/5/tutores', { id_padre: 2 }],
	['quitarTutor', () => api.quitarTutor(5, 2), 'DELETE', '/api/alumnos/5/tutores/2', undefined],

	['getCredencial', () => api.getCredencial(5), 'GET', '/api/credenciales/5', undefined],
	['regenerarCredencial con motivo', () => api.regenerarCredencial(5, 'Extraviada'), 'POST', '/api/credenciales/5/regenerar', { motivo: 'Extraviada' }],
	['regenerarCredencial sin motivo', () => api.regenerarCredencial(5, ''), 'POST', '/api/credenciales/5/regenerar', {}],
	['historialCredencial', () => api.historialCredencial(5), 'GET', '/api/credenciales/5/historial', undefined],

	['getHistorial', () => api.getHistorial({ desde: '2026-10-01', hasta: '2026-10-31', alumnoId: 1 }), 'GET', '/api/asistencias/historial?desde=2026-10-01&hasta=2026-10-31&alumnoId=1', undefined],
	['getHistorial sin filtros', () => api.getHistorial({ desde: '', alumnoId: null }), 'GET', '/api/asistencias/historial', undefined],
	['getReporte', () => api.getReporte({ desde: '2026-10-01' }), 'GET', '/api/asistencias/reporte?desde=2026-10-01', undefined],

	['getHorarioDia hoy', () => api.getHorarioDia(), 'GET', '/api/horarios/dia', undefined],
	['getHorarioDia fecha', () => api.getHorarioDia('2026-10-30'), 'GET', '/api/horarios/dia?fecha=2026-10-30', undefined],
	['getHorarios', () => api.getHorarios(), 'GET', '/api/horarios', undefined],
	['guardarSemana', () => api.guardarSemana({ lunes: { entrada: '13:00', salida: '18:00' }, sabado: null }), 'PUT', '/api/horarios/semana',
		{ lunes: { entrada: '13:00', salida: '18:00' }, sabado: null }],
	['actualizarConfiguracion', () => api.actualizarConfiguracion({ tolerancia_minutos: 20 }), 'PATCH', '/api/horarios/configuracion', { tolerancia_minutos: 20 }],
	['listDiasEspeciales', () => api.listDiasEspeciales({ desde: '2026-11-01', hasta: '2026-11-30' }), 'GET', '/api/horarios/dias-especiales?desde=2026-11-01&hasta=2026-11-30', undefined],
	['guardarDiaEspecial horario especial', () => api.guardarDiaEspecial('2026-10-10', { tipo: 'horario_especial', hora_entrada: '15:00', hora_salida: '17:00' }),
		'PUT', '/api/horarios/dias-especiales/2026-10-10', { tipo: 'horario_especial', hora_entrada: '15:00', hora_salida: '17:00' }],
	['guardarDiaEspecial sin clases (no manda horas)', () => api.guardarDiaEspecial('2026-11-16', { tipo: 'sin_clases', hora_entrada: '15:00', descripcion: 'Revolución' }),
		'PUT', '/api/horarios/dias-especiales/2026-11-16', { tipo: 'sin_clases', descripcion: 'Revolución' }],
	['eliminarDiaEspecial', () => api.eliminarDiaEspecial('2026-11-16'), 'DELETE', '/api/horarios/dias-especiales/2026-11-16', undefined],
];

describe('armado de las peticiones', () => {
	it.each(CASES)('%s', async (_name, call, method, url, body) => {
		await call();
		const sent = lastCall();
		expect(sent.method).toBe(method);
		expect(sent.url).toBe(url);
		expect(sent.headers.Authorization).toBe('Bearer tok');
		expect(sent.body).toEqual(body);
		if (body === undefined) expect(sent.headers['Content-Type']).toBeUndefined();
		else expect(sent.headers['Content-Type']).toBe('application/json');
	});

	it('los ids y fechas se codifican en la URL', async () => {
		await api.getAlumno('1/../../auth');
		expect(lastCall().url).toBe('/api/alumnos/1%2F..%2F..%2Fauth');
	});
});

describe('recuperar contraseña (sin token)', () => {
	it('solicitar manda solo el correo y no el token de una sesión vieja', async () => {
		await api.solicitarCodigoRecuperacion('directora@escuela.com');
		const sent = lastCall();
		expect([sent.method, sent.url]).toEqual(['POST', '/api/auth/recuperar/solicitar']);
		expect(sent.body).toEqual({ email: 'directora@escuela.com' });
		expect(sent.headers.Authorization).toBeUndefined();
	});

	it('confirmar manda correo, código y contraseña sin token', async () => {
		await api.confirmarRecuperacion({ email: 'd@e.com', codigo: '012345', password: 'Nueva1234' });
		const sent = lastCall();
		expect([sent.method, sent.url]).toEqual(['POST', '/api/auth/recuperar/confirmar']);
		expect(sent.body).toEqual({ email: 'd@e.com', codigo: '012345', password: 'Nueva1234' });
		expect(sent.headers.Authorization).toBeUndefined();
	});

	it('un 400 (código inválido) no cierra la sesión ni avisa 401', async () => {
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: 'El código no es válido o ya venció. Pide uno nuevo.' }), { status: 400 }));
		await expect(api.confirmarRecuperacion({ email: 'd@e.com', codigo: '000000', password: 'Nueva1234' })).rejects.toMatchObject({ status: 400 });
		expect(session.token).toBe('tok');
	});
});

describe('foto (multipart)', () => {
	it('manda FormData con el campo "foto" y sin Content-Type (lo pone el navegador)', async () => {
		const file = new File(['x'], 'ana.png', { type: 'image/png' });
		await api.uploadFotoAlumno(5, file);
		const sent = lastCall();
		expect(sent.url).toBe('/api/alumnos/5/foto');
		expect(sent.method).toBe('POST');
		expect(sent.body).toBeInstanceOf(FormData);
		expect(sent.body.get('foto')).toBeInstanceOf(File);
		expect(sent.body.get('foto').name).toBe('ana.png');
		expect(sent.headers['Content-Type']).toBeUndefined();
		expect(sent.headers.Authorization).toBe('Bearer tok');
	});
});

describe('PDF (blob con token)', () => {
	// Con Node 22+ el Blob de jsdom no trae .text(); FileReader funciona en cualquier versión.
	const readBlob = blob => new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob);
	});
	const pdfResponse = filename => new Response('%PDF-1.4', {
		status: 200, headers: { 'Content-Type': 'application/pdf', ...(filename ? { 'Content-Disposition': `inline; filename="${filename}"` } : {}) },
	});

	it('credencial de un alumno: Authorization y { blob, filename }', async () => {
		fetchMock.mockResolvedValueOnce(pdfResponse('credencial-5.pdf'));
		const result = await api.descargarCredencialPdf(5);
		const sent = lastCall();
		expect(sent.url).toBe('/api/credenciales/5/pdf');
		expect(sent.headers.Authorization).toBe('Bearer tok');
		expect(sent.headers.Accept).toMatch(/application\/pdf/);
		expect(result.filename).toBe('credencial-5.pdf');
		expect(await readBlob(result.blob)).toBe('%PDF-1.4');
	});

	it('lote por grado (y sin grado = todos)', async () => {
		fetchMock.mockResolvedValueOnce(pdfResponse('credenciales-3B.pdf'));
		await api.descargarLotePdf('3B');
		expect(lastCall().url).toBe('/api/credenciales/lote/pdf?grado=3B');
		fetchMock.mockResolvedValueOnce(pdfResponse());
		const result = await api.descargarLotePdf('');
		expect(lastCall().url).toBe('/api/credenciales/lote/pdf');
		expect(result.filename).toBeNull();
	});

	it('error del PDF llega como JSON -> ApiError con el mensaje', async () => {
		fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, message: 'No hay alumnos activos para imprimir' }), { status: 404 }));
		await expect(api.descargarLotePdf('9Z')).rejects.toMatchObject({ status: 404, message: 'No hay alumnos activos para imprimir' });
	});
});

describe('listAllAlumnos', () => {
	it('pide páginas de 100 hasta completar el total', async () => {
		const page = (n, total, count) => ok({ total, page: n, limit: 100, items: Array.from({ length: count }, (_, i) => ({ id: (n - 1) * 100 + i + 1 })) });
		fetchMock.mockResolvedValueOnce(page(1, 150, 100)).mockResolvedValueOnce(page(2, 150, 50));
		const items = await api.listAllAlumnos();
		expect(items).toHaveLength(150);
		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/alumnos?page=1&limit=100', '/api/alumnos?page=2&limit=100']);
	});
	it('lista vacía: una sola petición', async () => {
		fetchMock.mockResolvedValueOnce(ok({ total: 0, page: 1, limit: 100, items: [] }));
		expect(await api.listAllAlumnos()).toEqual([]);
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
