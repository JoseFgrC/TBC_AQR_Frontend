import { describe, expect, it } from 'vitest';
import { parseRoute, toHash } from './route.js';

const SECTIONS = ['alumnos', 'credenciales', 'escanear'];

describe('parseRoute', () => {
	it.each(['', '#', '#/', '#/desconocida', '#/alumnos-x'])('%s -> inicio', hash => {
		expect(parseRoute(hash, SECTIONS)).toEqual({ section: 'inicio', params: [] });
	});
	it('sección con parámetros', () => {
		expect(parseRoute('#/alumnos/12', SECTIONS)).toEqual({ section: 'alumnos', params: ['12'] });
		expect(parseRoute('#alumnos/nuevo/', SECTIONS)).toEqual({ section: 'alumnos', params: ['nuevo'] });
	});
	it('decodifica y tolera % mal formados', () => {
		expect(parseRoute('#/credenciales/3%20B', SECTIONS).params).toEqual(['3 B']);
		expect(parseRoute('#/credenciales/%E0', SECTIONS).params).toEqual(['%E0']);
	});
});

describe('toHash', () => {
	it('arma y codifica', () => {
		expect(toHash()).toBe('#/');
		expect(toHash('alumnos', 12)).toBe('#/alumnos/12');
		expect(toHash('credenciales', '3/B')).toBe('#/credenciales/3%2FB');
		expect(toHash('alumnos', '', null)).toBe('#/alumnos');
	});
	it('ida y vuelta', () => {
		expect(parseRoute(toHash('alumnos', 'a b'), SECTIONS)).toEqual({ section: 'alumnos', params: ['a b'] });
	});
});
