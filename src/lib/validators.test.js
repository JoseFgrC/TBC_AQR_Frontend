import { describe, expect, it } from 'vitest';
import { isDate, isTime, validateAlumno, validateHorarioEspecial, validatePhoto, validateTutorAsignado } from './validators.js';

describe('validadores (mismas reglas que el backend)', () => {
	it('alumno', () => {
		expect(validateAlumno({ nombre: '  ', grado: '' })).toEqual({ nombre: 'Escribe el nombre del alumno.' });
		expect(validateAlumno({ nombre: 'Ana', grado: 'x'.repeat(21) })).toEqual({ grado: 'Usa como máximo 20 caracteres.' });
		expect(validateAlumno({ nombre: 'Ana', grado: '3B' })).toEqual({});
	});
	it('tutor asignado', () => {
		expect(validateTutorAsignado({ padre: '', parentesco: '' })).toEqual({ padre: 'Elige un tutor.' });
		expect(validateTutorAsignado({ padre: '2', parentesco: 'mamá' })).toEqual({});
	});
	it('horario especial: horas completas y entrada antes que salida', () => {
		expect(validateHorarioEspecial({ hora_entrada: '', hora_salida: '18:00' })).toEqual({ hora_entrada: 'Escribe la hora de entrada.' });
		expect(validateHorarioEspecial({ hora_entrada: '9:00', hora_salida: '18:00' }).hora_entrada).toMatch(/hora completa/);
		expect(validateHorarioEspecial({ hora_entrada: '18:00', hora_salida: '13:00' })).toEqual({ hora_salida: 'La salida debe ser después de la entrada.' });
		expect(validateHorarioEspecial({ hora_entrada: '13:00', hora_salida: '18:00' })).toEqual({});
	});
	it('foto: JPG/PNG de hasta 5 MB', () => {
		expect(validatePhoto(null)).toBe('Elige una foto.');
		expect(validatePhoto({ type: 'image/gif', size: 10 })).toMatch(/JPG o PNG/);
		expect(validatePhoto({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
		expect(validatePhoto({ type: 'image/jpeg', size: 1000 })).toBeNull();
	});
	it('isTime / isDate', () => {
		expect(isTime('23:59')).toBe(true);
		expect(isTime('24:00')).toBe(false);
		expect(isDate('2026-02-28')).toBe(true);
		expect(isDate('2026-02-31')).toBe(false);
	});
});
