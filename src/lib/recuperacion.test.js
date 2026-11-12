import { describe, expect, it } from 'vitest';
import { describeRecoveryError, isTelegramLink, normalizeCode, validateCorreo, validateRecuperacion } from './recuperacion.js';

describe('recuperar contraseña', () => {
	it('el código pegado de Telegram se queda solo con 6 números', () => {
		expect(normalizeCode('123 456')).toBe('123456');
		expect(normalizeCode('123-4567')).toBe('123456');
		expect(normalizeCode('abc')).toBe('');
		expect(normalizeCode(null)).toBe('');
	});

	it('correo', () => {
		expect(validateCorreo('')).toMatch(/correo completo/);
		expect(validateCorreo('directora@')).toMatch(/correo completo/);
		expect(validateCorreo(' directora@escuela.com ')).toBeNull();
		expect(validateCorreo(`${'a'.repeat(140)}@escuela.com`)).toMatch(/150/);
	});

	it('código, contraseña nueva y su repetición', () => {
		expect(validateRecuperacion({ codigo: '12345', nueva: 'Nueva1234', confirmar: 'Nueva1234' })).toEqual({ codigo: 'Escribe los 6 números del código.' });
		expect(validateRecuperacion({ codigo: '012345', nueva: 'corta', confirmar: 'corta' })).toEqual({ nueva: 'Usa al menos 8 caracteres.' });
		expect(validateRecuperacion({ codigo: '012345', nueva: 'Nueva1234', confirmar: 'Nueva123' })).toEqual({ confirmar: 'No coincide con la contraseña nueva.' });
		expect(validateRecuperacion({ codigo: '012345', nueva: 'Nueva1234', confirmar: 'Nueva1234' })).toEqual({});
	});

	it('errores en lenguaje humano', () => {
		expect(describeRecoveryError({ kind: 'network' }).message).toMatch(/Sin conexión/);
		expect(describeRecoveryError({ kind: 'http', status: 429 })).toEqual({ field: null, message: expect.stringMatching(/varios intentos/) });
		expect(describeRecoveryError({ kind: 'http', status: 400, message: 'El código no es válido o ya venció. Pide uno nuevo.' }).field).toBe('codigo');
		expect(describeRecoveryError({ kind: 'http', status: 400, message: 'Errores de validación' })).toEqual({ field: null, message: 'Revisa los datos marcados.' });
		expect(describeRecoveryError({ kind: 'http', status: 500, message: 'x' }).message).toMatch(/intenta de nuevo/);
	});

	it('solo acepta enlaces de t.me con el prefijo de cuentas', () => {
		expect(isTelegramLink('https://t.me/AvisosBot?start=adm_Xb3k-9_q')).toBe(true);
		expect(isTelegramLink('https://t.me/AvisosBot?start=Xb3k')).toBe(false);
		expect(isTelegramLink('javascript:alert(1)')).toBe(false);
		expect(isTelegramLink('https://evil.com/?start=adm_x')).toBe(false);
		expect(isTelegramLink(null)).toBe(false);
	});
});
