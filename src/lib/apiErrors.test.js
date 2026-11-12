import { describe, expect, it } from 'vitest';
import { describeApiError, fieldErrors, humanizeFieldMessage } from './apiErrors.js';
import { ALGO_SALIO_MAL } from './textos.js';

const http = (status, message, details) => ({ kind: 'http', status, message, details });

describe('fieldErrors', () => {
	it('mapea details[].field al campo, en palabras humanas', () => {
		const error = http(400, 'Errores de validación', [
			{ field: 'email', message: 'Email inválido' },
			{ field: 'password', message: 'Mínimo 8 caracteres' },
		]);
		expect(fieldErrors(error)).toEqual({ email: 'Revisa el correo; parece incompleto.', password: 'Escribe al menos 8 caracteres.' });
	});
	it('usa alias cuando el formulario nombra distinto el campo', () => {
		const error = http(400, 'Errores de validación', [{ field: 'id_padre', message: 'Campo requerido' }]);
		expect(fieldErrors(error, { id_padre: 'padre' })).toEqual({ padre: 'Este dato es obligatorio.' });
	});
	it('se queda con el primer error de cada campo', () => {
		const error = http(400, '', [{ field: 'nombre', message: 'Campo requerido' }, { field: 'nombre', message: 'Debe ser texto' }]);
		expect(fieldErrors(error)).toEqual({ nombre: 'Este dato es obligatorio.' });
	});
	it('sin details (producción) -> {}', () => {
		expect(fieldErrors(http(400, 'Errores de validación'))).toEqual({});
		expect(fieldErrors(null)).toEqual({});
	});
});

describe('humanizeFieldMessage', () => {
	it.each([
		['Máximo 150 caracteres', 'Usa como máximo 150 caracteres.'],
		['Formato HH:MM (24 horas)', 'Escribe la hora completa, por ejemplo 13:00.'],
		['Formato YYYY-MM-DD', 'Elige una fecha válida.'],
		['Debe ser un entero entre 0 y 240', 'Escribe un número entero entre 0 y 240.'],
		['Algo nuevo del backend', 'Algo nuevo del backend'],
		['', 'Revisa este dato.'],
	])('%s', (input, expected) => expect(humanizeFieldMessage(input)).toBe(expected));
});

describe('describeApiError', () => {
	it('red, permisos, límite y servidor', () => {
		expect(describeApiError({ kind: 'network' })).toMatch(/Sin conexión/);
		expect(describeApiError(http(403, 'Acceso denegado'))).toMatch(/no tiene permiso/);
		expect(describeApiError(http(429, ''))).toMatch(/espera unos minutos/);
		expect(describeApiError(http(500, 'Error interno del servidor'))).toBe(ALGO_SALIO_MAL);
	});
	it('validación -> pide revisar los campos marcados', () => {
		expect(describeApiError(http(400, 'Errores de validación', [{ field: 'nombre', message: 'Campo requerido' }]))).toBe('Revisa los datos marcados.');
	});
	it('reescribe mensajes técnicos conocidos', () => {
		// Llega con 503: no debe quedar tapado por el mensaje genérico de error del servidor.
		expect(describeApiError(http(503, 'Telegram no está configurado (falta TELEGRAM_BOT_TOKEN)'))).toMatch(/^Telegram no está disponible/);
		expect(describeApiError(http(409, 'El registro ya existe (valor duplicado)'))).toMatch(/ya está registrado/);
		expect(describeApiError(http(404, 'No hay alumnos activos para imprimir'))).toMatch(/No hay alumnos activos/);
	});
	it('deja pasar los mensajes claros del backend', () => {
		expect(describeApiError(http(400, 'La foto debe ser JPG o PNG'))).toBe('La foto debe ser JPG o PNG');
		expect(describeApiError(http(404, 'Alumno no encontrado'))).toBe('Alumno no encontrado');
	});
});
