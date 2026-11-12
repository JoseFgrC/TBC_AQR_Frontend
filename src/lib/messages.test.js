import { describe, expect, it } from 'vitest';
import { describeError, describeRegistro, describeRegistroLinea, describeSuccess } from './messages.js';

const alumno = { id: 1, nombre: 'Juan Pérez López', grado: '3B', foto_url: null };
const http = (message, data, status = 400) => ({ kind: 'http', status, message, data });

describe('describeError', () => {
	it('entrada ya registrada: usa el nombre y salida_permitida_desde de data', () => {
		const result = describeError(http('Entrada ya registrada a las 14:26. La salida se permite después de 10 minutos',
			{ alumno, entrada: '14:26', salida: null, salida_permitida_desde: '14:36' }));
		expect(result).toMatchObject({ kind: 'notice', tone: 'yellow', alumno, title: 'Juan ya entró hoy' });
		expect(result.subtitle).toBe('Su salida se puede marcar a partir de las 14:36.');
	});

	it('entrada ya registrada sin data (backend anterior): no inventa la hora', () => {
		const result = describeError(http('Entrada ya registrada a las 14:26. La salida se permite después de 10 minutos'));
		expect(result.title).toBe('Este alumno ya entró hoy');
		expect(result.subtitle).not.toMatch(/\d{2}:\d{2}/);
	});

	it('día completo', () => {
		const result = describeError(http('El alumno ya registró su entrada y su salida hoy', { alumno, entrada: '07:50', salida: '14:00', salida_permitida_desde: null }));
		expect(result.title).toBe('Juan ya completó su día');
		expect(result.tone).toBe('yellow');
	});

	it('QR no reconocido', () => {
		const result = describeError(http('QR no reconocido'));
		expect(result).toMatchObject({ title: 'No reconocemos esta credencial', subtitle: 'Puede ser una versión anterior.', alumno: null });
	});

	it('alumno inactivo', () => {
		expect(describeError(http('Alumno inactivo', { alumno })).subtitle).toBe('El alumno está dado de baja.');
	});

	it('hoy no hay clases -> pantalla completa con el motivo', () => {
		expect(describeError(http('Hoy no hay clases (Consejo Técnico Escolar)'))).toEqual({ kind: 'no-classes', motivo: 'Consejo Técnico Escolar' });
	});

	it('sin red', () => {
		expect(describeError({ kind: 'network', message: 'Sin conexión' })).toMatchObject({ title: 'Sin conexión', subtitle: 'Reintenta en un momento.' });
	});

	it('429, validación (400 genérico) y 500 no muestran textos técnicos', () => {
		const cases = [
			describeError(http('', null, 429)),
			describeError(http('Errores de validación', null, 400)),
			describeError(http('Error interno del servidor', null, 500)),
		];
		expect(cases.map(item => item.title)).toEqual(['Vas muy rápido', 'No pudimos leer esta credencial', 'Algo no salió bien']);
		for (const item of cases) {
			expect(item.tone).toBe('yellow');
			expect(`${item.title} ${item.subtitle}`).not.toMatch(/\b(4\d\d|5\d\d)\b|error|validación|interno/i);
		}
	});
});

describe('describeSuccess', () => {
	const asistencia = (tipo, estado, extra = {}) => ({
		id: 1, tipo, estado, hora_programada: tipo === 'entrada' ? '13:00' : '18:00',
		fecha_hora: '2026-10-06 13:40:00', tutores_notificados: 2, ...extra,
	});

	it('entrada puntual: verde y saludo con el primer nombre', () => {
		expect(describeSuccess({ alumno, asistencia: asistencia('entrada', 'puntual') }))
			.toMatchObject({ tone: 'green', title: '¡Hola, Juan!', subtitle: 'Entró a tiempo · 13:40', notice: 'Enviado a 2 tutores' });
	});

	it('retardo: naranja con minutos de diferencia', () => {
		expect(describeSuccess({ alumno, asistencia: asistencia('entrada', 'retardo') }))
			.toMatchObject({ tone: 'orange', subtitle: 'Llegó con retardo · 13:40', detail: '40 min después de las 13:00' });
	});

	it('salida y salida anticipada: azul', () => {
		expect(describeSuccess({ alumno, asistencia: asistencia('salida', 'puntual') })).toMatchObject({ tone: 'blue', title: '¡Hasta mañana, Juan!' });
		expect(describeSuccess({ alumno, asistencia: asistencia('salida', 'anticipada') })).toMatchObject({ tone: 'blue', detail: 'Su salida es a las 18:00' });
	});

	it('tutores: singular y sin Telegram', () => {
		expect(describeSuccess({ alumno, asistencia: asistencia('entrada', 'puntual', { tutores_notificados: 1 }) }).notice).toBe('Enviado a 1 tutor');
		expect(describeSuccess({ alumno, asistencia: asistencia('entrada', 'puntual', { tutores_notificados: 0 }) }).notice).toBe('Sin tutores con Telegram');
	});
});

describe('describeRegistro / describeRegistroLinea (escáner e historial)', () => {
	it.each([
		[{ tipo: 'entrada', estado: 'puntual' }, 'green', 'Entrada'],
		[{ tipo: 'entrada', estado: 'retardo' }, 'orange', 'Retardo'],
		[{ tipo: 'salida', estado: 'puntual' }, 'blue', 'Salida'],
		[{ tipo: 'salida', estado: 'anticipada' }, 'blue', 'Salida anticipada'],
		[{ tipo: 'entrada' }, 'green', 'Entrada'], // backend sin estado
	])('%j', (registro, tone, label) => expect(describeRegistro(registro)).toEqual({ tone, label }));

	it('mismo color y texto que la hoja del escáner', () => {
		const asistencia = { tipo: 'entrada', estado: 'retardo', hora_programada: '13:00', fecha_hora: '2026-10-06 13:23:00' };
		const hoja = describeSuccess({ alumno, asistencia });
		expect({ tone: hoja.tone, label: hoja.recent }).toEqual(describeRegistro(asistencia));
	});

	it('línea del historial: explica la hora programada solo en retardo y salida anticipada', () => {
		expect(describeRegistroLinea({ tipo: 'entrada', estado: 'retardo', fecha_hora: '2026-10-09 13:23:00', hora_programada: '13:00' }))
			.toBe('Retardo · 13:23, entrada 13:00');
		expect(describeRegistroLinea({ tipo: 'salida', estado: 'anticipada', fecha_hora: '2026-10-09 16:12:00', hora_programada: '18:00' }))
			.toBe('Salida anticipada · 16:12, salida 18:00');
		expect(describeRegistroLinea({ tipo: 'entrada', estado: 'puntual', fecha_hora: '2026-10-09 12:58:00', hora_programada: '13:00' }))
			.toBe('Entrada · 12:58');
		expect(describeRegistroLinea({ tipo: 'entrada', estado: 'retardo', fecha_hora: '2026-10-09 13:23:00', hora_programada: null }))
			.toBe('Retardo · 13:23');
	});
});
