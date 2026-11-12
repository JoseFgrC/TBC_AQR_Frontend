import { describe, expect, it } from 'vitest';
import { filterPadres, telegramStatus, validateChatId, validatePadre } from './tutores.js';

const padres = [
	{ id: 1, nombre: 'María López', telefono: '2281234567', telegram_vinculado: 1, notificaciones_activas: 1 },
	{ id: 2, nombre: 'José Pérez', telefono: null, telegram_vinculado: 0, notificaciones_activas: 1 },
	{ id: 3, nombre: 'Guadalupe Torres', telefono: null, telegram_vinculado: 1, notificaciones_activas: 0 },
];

describe('tutores', () => {
	it('estado de Telegram', () => {
		expect(padres.map(p => telegramStatus(p).kind)).toEqual(['activo', 'sin', 'pausado']);
	});
	it('filtra por nombre/teléfono sin acentos y por estado', () => {
		expect(filterPadres(padres, { search: 'jose' }).map(p => p.id)).toEqual([2]);
		expect(filterPadres(padres, { search: '228123' }).map(p => p.id)).toEqual([1]);
		expect(filterPadres(padres, { telegram: 'pausado' }).map(p => p.id)).toEqual([3]);
	});
	it('valida alta y chat ID con las reglas del backend', () => {
		expect(validatePadre({ nombre: ' ', telefono: '' })).toEqual({ nombre: 'Escribe el nombre del tutor.' });
		expect(validatePadre({ nombre: 'Ana', telefono: '1'.repeat(21) })).toEqual({ telefono: 'Usa como máximo 20 caracteres.' });
		expect(validateChatId('')).toMatch(/chat ID/);
		expect(validateChatId('x'.repeat(51))).toMatch(/50/);
		expect(validateChatId(' 123 ')).toBeNull();
	});
});
