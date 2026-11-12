import { describe, expect, it } from 'vitest';
import { homeScreen, scannerScreen } from './entry.js';

describe('homeScreen (pantalla según la sesión)', () => {
	it('sin token -> login', () => {
		expect(homeScreen({ token: null, user: { rol: 'directora' } })).toBe('login');
	});
	it('directora -> panel', () => {
		expect(homeScreen({ token: 't', user: { rol: 'directora' } })).toBe('panel');
	});
	it('escaner -> escáner', () => {
		expect(homeScreen({ token: 't', user: { rol: 'escaner' } })).toBe('scanner');
	});
	it.each([null, {}, { rol: 'admin' }, { rol: 'DIRECTORA' }])('rol desconocido %j -> escáner (mínimo permiso)', user => {
		expect(homeScreen({ token: 't', user })).toBe('scanner');
	});
});

describe('scannerScreen (hay_clases dentro de "Escanear")', () => {
	it('con clases: cámara para ambos roles', () => {
		expect(scannerScreen({ noClasses: null, rol: 'escaner' })).toBe('camera');
		expect(scannerScreen({ noClasses: null, rol: 'directora' })).toBe('camera');
	});
	it('sin clases, escaner: pantalla "Hoy no hay clases" de siempre', () => {
		expect(scannerScreen({ noClasses: 'Consejo Técnico Escolar', rol: 'escaner' })).toBe('no-classes');
		expect(scannerScreen({ noClasses: '', rol: undefined })).toBe('no-classes');
	});
	it('sin clases, directora: con "Volver al panel" y "Habilitar clases hoy"', () => {
		expect(scannerScreen({ noClasses: '', rol: 'directora' })).toBe('no-classes-directora');
		expect(scannerScreen({ noClasses: 'Sábado', rol: 'directora' })).toBe('no-classes-directora');
	});
});
