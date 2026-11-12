import { describe, expect, it } from 'vitest';
import { trapTab } from './focusTrap.js';

describe('trapTab', () => {
	const items = ['cerrar', 'inicio', 'alumnos', 'salir'];
	it('en medio deja que el navegador avance', () => {
		expect(trapTab(items, 'inicio')).toBeNull();
		expect(trapTab(items, 'alumnos', true)).toBeNull();
	});
	it('del último vuelve al primero y del primero (Shift+Tab) al último', () => {
		expect(trapTab(items, 'salir')).toBe('cerrar');
		expect(trapTab(items, 'cerrar', true)).toBe('salir');
	});
	it('si el foco quedó fuera del menú lo regresa', () => {
		expect(trapTab(items, 'boton-de-la-pagina')).toBe('cerrar');
		expect(trapTab(items, 'boton-de-la-pagina', true)).toBe('salir');
	});
	it('sin elementos no hace nada', () => {
		expect(trapTab([], 'x')).toBeNull();
	});
});
