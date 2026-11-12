import { describe, expect, it } from 'vitest';
import { alumnoChanges, filterAlumnos, gradosDe } from './alumnos.js';

const alumnos = [
	{ id: 1, nombre: 'Ana Sofía Torres', grado: '3B', activo: 1, tutores: 'Guadalupe Torres' },
	{ id: 2, nombre: 'Luis Hernández', grado: '10A', activo: 1, tutores: null },
	{ id: 3, nombre: 'Jorge Salas', grado: '3B', activo: 0, tutores: 'María López' },
	{ id: 4, nombre: 'Sin Grado', grado: null, activo: 1, tutores: null },
];

describe('filterAlumnos', () => {
	it('por defecto solo activos', () => {
		expect(filterAlumnos(alumnos).map(a => a.id)).toEqual([1, 2, 4]);
	});
	it('grado exacto y estado', () => {
		expect(filterAlumnos(alumnos, { grado: '3B', estado: 'todos' }).map(a => a.id)).toEqual([1, 3]);
		expect(filterAlumnos(alumnos, { estado: 'inactivos' }).map(a => a.id)).toEqual([3]);
	});
	it('busca en nombre, grado y tutores sin acentos ni mayúsculas', () => {
		expect(filterAlumnos(alumnos, { search: 'sofia' }).map(a => a.id)).toEqual([1]);
		expect(filterAlumnos(alumnos, { search: 'LOPEZ', estado: 'todos' }).map(a => a.id)).toEqual([3]);
		expect(filterAlumnos(alumnos, { search: '10a' }).map(a => a.id)).toEqual([2]);
	});
});

describe('gradosDe', () => {
	it('únicos, sin vacíos y en orden natural', () => {
		expect(gradosDe(alumnos)).toEqual(['3B', '10A']);
		expect(gradosDe(null)).toEqual([]);
	});
});

describe('alumnoChanges (PUT solo con lo que cambió)', () => {
	const alumno = { nombre: 'Ana', grado: '3B' };
	it('nada cambió', () => expect(alumnoChanges(alumno, { nombre: ' Ana ', grado: '3B' })).toEqual({}));
	it('nombre y grado', () => expect(alumnoChanges(alumno, { nombre: 'Ana María', grado: '4A' })).toEqual({ nombre: 'Ana María', grado: '4A' }));
	it('grado vacío se manda como null', () => expect(alumnoChanges(alumno, { nombre: 'Ana', grado: '  ' })).toEqual({ grado: null }));
	it('sin grado antes y después: sin cambios', () => expect(alumnoChanges({ nombre: 'Ana', grado: null }, { nombre: 'Ana', grado: '' })).toEqual({}));
});
