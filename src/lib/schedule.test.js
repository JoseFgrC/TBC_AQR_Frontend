import { describe, expect, it } from 'vitest';
import { currentMode } from './schedule.js';

const at = hhmm => { const [h, m] = hhmm.split(':').map(Number); return new Date(2026, 9, 10, h, m); };
const horario = { hora_entrada: '13:00', hora_salida: '18:00' }; // punto medio 15:30

describe('Entradas / Salidas según la hora', () => {
	it.each([
		['06:00', 'entradas'],
		['13:00', 'entradas'],
		['15:29', 'entradas'],
		['15:30', 'salidas'],
		['18:00', 'salidas'],
		['23:30', 'salidas'],
	])('a las %s -> %s', (time, mode) => {
		expect(currentMode(horario, at(time))).toBe(mode);
	});

	it('horario de mañana (07:30-13:30)', () => {
		const manana = { hora_entrada: '07:30', hora_salida: '13:30' };
		expect(currentMode(manana, at('10:29'))).toBe('entradas');
		expect(currentMode(manana, at('10:30'))).toBe('salidas');
	});

	it('sin horario (aún cargando o sin clases) muestra Entradas', () => {
		expect(currentMode(null, at('17:00'))).toBe('entradas');
		expect(currentMode({ hora_entrada: null, hora_salida: null }, at('17:00'))).toBe('entradas');
	});
});
