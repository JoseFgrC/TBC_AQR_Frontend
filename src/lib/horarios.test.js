import { describe, expect, it } from 'vitest';
import {
	configChanges, dayStatus, diaFromField, isLastFriday, monthGrid, semanaChanges, semanaToForm, shiftMonth,
	validateDiaEspecial, validateSemana, validateTolerancia, weekday,
} from './horarios.js';

const semana = [
	{ dia: 'lunes', dia_semana: 1, hay_clases: true, hora_entrada: '13:00', hora_salida: '18:00' },
	{ dia: 'martes', dia_semana: 2, hay_clases: true, hora_entrada: '13:00', hora_salida: '18:00' },
	{ dia: 'miercoles', dia_semana: 3, hay_clases: true, hora_entrada: '13:00', hora_salida: '18:00' },
	{ dia: 'jueves', dia_semana: 4, hay_clases: true, hora_entrada: '13:00', hora_salida: '18:00' },
	{ dia: 'viernes', dia_semana: 5, hay_clases: true, hora_entrada: '13:00', hora_salida: '17:00' },
	{ dia: 'sabado', dia_semana: 6, hay_clases: false, hora_entrada: null, hora_salida: null },
	{ dia: 'domingo', dia_semana: 7, hay_clases: false, hora_entrada: null, hora_salida: null },
];

describe('semana -> PUT /semana', () => {
	const original = semanaToForm(semana);
	it('sin cambios -> {}', () => expect(semanaChanges(original, original)).toEqual({}));
	it('solo manda los días que cambian; null = sin clases', () => {
		const form = { ...original, lunes: { ...original.lunes, entrada: '13:30' }, viernes: { ...original.viernes, on: false }, sabado: { on: true, entrada: '09:00', salida: '12:00' } };
		expect(semanaChanges(original, form)).toEqual({ lunes: { entrada: '13:30', salida: '18:00' }, viernes: null, sabado: { entrada: '09:00', salida: '12:00' } });
	});
	it('apagar un día que ya no tenía clases no manda nada', () => {
		expect(semanaChanges(original, { ...original, domingo: { on: false, entrada: '10:00', salida: '' } })).toEqual({});
	});
	it('valida horas y orden por día', () => {
		const form = { ...original, lunes: { on: true, entrada: '18:00', salida: '13:00' }, martes: { on: true, entrada: '', salida: '18:00' } };
		const errors = validateSemana(form);
		expect(errors.lunes).toMatch(/después de la entrada/);
		expect(errors.martes).toMatch(/hora de entrada/);
		expect(Object.keys(errors)).toEqual(['lunes', 'martes']);
	});
	it('details del backend -> día', () => {
		expect(diaFromField('lunes.entrada')).toBe('lunes');
		expect(diaFromField('miercoles')).toBe('miercoles');
	});
});

describe('configuración', () => {
	const original = { tolerancia_minutos: 15, consejo_tecnico_ultimo_viernes: true, aviso_no_llego: true };
	it('solo cambios, tolerancia como número', () => {
		expect(configChanges(original, { ...original, tolerancia_minutos: '15' })).toEqual({});
		expect(configChanges(original, { ...original, tolerancia_minutos: '20', aviso_no_llego: false }))
			.toEqual({ tolerancia_minutos: 20, aviso_no_llego: false });
	});
	it.each([['', true], ['-1', true], ['241', true], ['2.5', true], ['0', false], ['240', false]])('tolerancia %s inválida: %s', (value, invalid) => {
		expect(Boolean(validateTolerancia(value))).toBe(invalid);
	});
});

describe('día especial', () => {
	it('sin clases solo pide fecha', () => {
		expect(validateDiaEspecial({ fecha: '2026-11-16', tipo: 'sin_clases' })).toEqual({});
		expect(validateDiaEspecial({ fecha: '2026-02-31', tipo: 'sin_clases' })).toEqual({ fecha: 'Elige una fecha.' });
	});
	it('horario distinto pide horas en orden', () => {
		expect(Object.keys(validateDiaEspecial({ fecha: '2026-11-13', tipo: 'horario_especial' }))).toEqual(['hora_entrada', 'hora_salida']);
		expect(validateDiaEspecial({ fecha: '2026-11-13', tipo: 'horario_especial', hora_entrada: '17:00', hora_salida: '15:00' }))
			.toEqual({ hora_salida: 'La salida debe ser después de la entrada.' });
	});
});

describe('calendario', () => {
	it('weekday: 1 = lunes, 7 = domingo', () => {
		expect(weekday('2026-10-12')).toBe(1);
		expect(weekday('2026-10-10')).toBe(6);
		expect(weekday('2026-10-11')).toBe(7);
	});
	it('monthGrid de octubre 2026 empieza en jueves y tiene semanas completas', () => {
		const weeks = monthGrid(2026, 10);
		expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
		expect(weeks.every(week => week.length === 7)).toBe(true);
		expect(weeks.flat().filter(Boolean)).toHaveLength(31);
	});
	it('shiftMonth cruza años', () => {
		expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
		expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
	});
	it('último viernes del mes', () => {
		expect(isLastFriday('2026-10-30')).toBe(true);
		expect(isLastFriday('2026-10-23')).toBe(false);
		expect(isLastFriday('2026-10-31')).toBe(false);
	});
	it('dayStatus: día especial > Consejo Técnico > semana', () => {
		const configuracion = { consejo_tecnico_ultimo_viernes: true };
		const especiales = [{ fecha: '2026-10-30', tipo: 'horario_especial', hora_entrada: '15:00', hora_salida: '17:00' }];
		expect(dayStatus('2026-10-30', { especiales, semana, configuracion }).kind).toBe('horario_especial');
		expect(dayStatus('2026-10-30', { especiales: [], semana, configuracion }).kind).toBe('consejo');
		expect(dayStatus('2026-10-30', { especiales: [], semana, configuracion: { consejo_tecnico_ultimo_viernes: false } }).kind).toBe('clases');
		expect(dayStatus('2026-10-10', { especiales: [], semana, configuracion }).kind).toBe('sin_horario');
	});
});
