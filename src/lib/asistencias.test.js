import { describe, expect, it } from 'vitest';
import { byGrado, groupByDay, parseFechas, porcentaje, resumenReporte, sortReporte, validateRango } from './asistencias.js';

describe('validateRango (reglas de asistencias.service.js)', () => {
	it('vacío o correcto -> sin errores', () => {
		expect(validateRango({ desde: '', hasta: '' })).toEqual({});
		expect(validateRango({ desde: '2026-10-01', hasta: '2026-10-01' })).toEqual({});
	});
	it('desde después de hasta', () => {
		expect(validateRango({ desde: '2026-10-09', hasta: '2026-10-01' })).toEqual({ hasta: 'Debe ser igual o posterior a la fecha "Desde".' });
	});
	it('máximo un año solo en el reporte', () => {
		expect(validateRango({ desde: '2025-01-01', hasta: '2026-10-01' }, { maxDays: 366 }).hasta).toMatch(/un año/);
		expect(validateRango({ desde: '2025-10-01', hasta: '2026-10-01' }, { maxDays: 366 })).toEqual({});
		expect(validateRango({ desde: '2025-01-01', hasta: '2026-10-01' })).toEqual({});
	});
	it('fecha inexistente', () => {
		expect(validateRango({ desde: '2026-02-31', hasta: '' })).toEqual({ desde: 'Elige una fecha válida.' });
	});
});

describe('historial', () => {
	const rows = [
		{ id: 4, alumno: 'Ana', grado: '3B', tipo: 'salida', estado: 'anticipada', fecha_hora: '2026-10-09 16:01:00' },
		{ id: 3, alumno: 'Luis', grado: '5A', tipo: 'entrada', estado: 'retardo', fecha_hora: '2026-10-09 13:22:00' },
		{ id: 2, alumno: 'Ana', grado: '3B', tipo: 'entrada', fecha_hora: '2026-10-09 12:58:00' },
		{ id: 1, alumno: 'Ana', grado: '3B', tipo: 'entrada', fecha_hora: '2026-10-08 12:55:00' },
	];
	it('agrupa por día conservando el orden y cuenta entradas/salidas', () => {
		const days = groupByDay(rows);
		expect(days.map(d => [d.fecha, d.entradas, d.salidas, d.items.length])).toEqual([['2026-10-09', 2, 1, 3], ['2026-10-08', 1, 0, 1]]);
		expect(days.map(d => [d.retardos, d.anticipadas])).toEqual([[1, 1], [0, 0]]);
	});
	it('filtro de grado en el navegador', () => {
		expect(byGrado(rows, '5A').map(r => r.id)).toEqual([3]);
		expect(byGrado(rows, '')).toHaveLength(4);
		expect(byGrado(null, '3B')).toEqual([]);
	});
});

describe('reporte', () => {
	const alumnos = [
		{ id: 1, nombre: 'Beto', grado: '5A', dias_clase: '7', asistencias: '6', retardos: '1', faltas: '1', salidas_anticipadas: '0', fechas_falta: '2026-10-05' },
		{ id: 2, nombre: 'Ana', grado: '3B', dias_clase: 7, asistencias: 7, retardos: 3, faltas: 0, salidas_anticipadas: 1, fechas_falta: null },
		{ id: 3, nombre: 'Carla', grado: '10A', dias_clase: 7, asistencias: 4, retardos: 0, faltas: 3, salidas_anticipadas: 0, fechas_falta: '2026-10-01, 2026-10-02, 2026-10-06' },
	];
	it('fechas_falta (GROUP_CONCAT con ", ")', () => {
		expect(parseFechas('2026-10-01, 2026-10-02,2026-10-06')).toEqual(['2026-10-01', '2026-10-02', '2026-10-06']);
		expect(parseFechas(null)).toEqual([]);
	});
	it('resumen suma números aunque lleguen como texto', () => {
		expect(resumenReporte(alumnos)).toMatchObject({ alumnos: 3, dias_clase: 21, asistencias: 17, retardos: 4, faltas: 4, salidas_anticipadas: 1, conFaltas: 2, porcentaje: 81 });
		expect(resumenReporte([]).porcentaje).toBeNull();
	});
	it('orden', () => {
		expect(sortReporte(alumnos, 'faltas').map(a => a.id)).toEqual([3, 1, 2]);
		expect(sortReporte(alumnos, 'retardos').map(a => a.id)).toEqual([2, 1, 3]);
		expect(sortReporte(alumnos, 'nombre').map(a => a.nombre)).toEqual(['Ana', 'Beto', 'Carla']);
		expect(sortReporte(alumnos, 'grado').map(a => a.grado)).toEqual(['3B', '5A', '10A']);
	});
	it('porcentaje', () => {
		expect(porcentaje(6, 7)).toBe(86);
		expect(porcentaje(0, 0)).toBeNull();
	});
});
