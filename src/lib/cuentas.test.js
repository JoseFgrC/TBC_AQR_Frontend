import { describe, expect, it } from 'vitest';
import { isActiva, validateCambioPassword, validateCuenta, validatePassword } from './cuentas.js';

describe('cuentas (reglas de auth.schemas.js)', () => {
	it('contraseña de 8 a 100', () => {
		expect(validatePassword('')).toMatch(/Escribe/);
		expect(validatePassword('1234567')).toMatch(/8/);
		expect(validatePassword('x'.repeat(101))).toMatch(/100/);
		expect(validatePassword('12345678')).toBeNull();
	});
	it('nueva cuenta', () => {
		expect(Object.keys(validateCuenta({ nombre: '', email: 'malo', password: '1' }))).toEqual(['nombre', 'email', 'password']);
		expect(validateCuenta({ nombre: 'Portero', email: 'entrada@escuela.com', password: 'Entrada123' })).toEqual({});
	});
	it('cambio de contraseña propia', () => {
		expect(validateCambioPassword({ actual: '', nueva: 'Nueva1234', confirmar: 'Nueva1234' })).toEqual({ actual: 'Escribe tu contraseña actual.' });
		expect(validateCambioPassword({ actual: 'a', nueva: 'Nueva1234', confirmar: 'Nueva12' })).toEqual({ confirmar: 'No coincide con la contraseña nueva.' });
		expect(validateCambioPassword({ actual: 'a', nueva: 'Nueva1234', confirmar: 'Nueva1234' })).toEqual({});
	});
	it('activo puede llegar como booleano o 0/1', () => {
		expect([true, 1, '1', false, 0, null].map(value => isActiva({ activo: value }))).toEqual([true, true, true, false, false, false]);
	});
});
