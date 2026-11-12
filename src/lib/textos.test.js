import { describe, expect, it } from 'vitest';
import * as textos from './textos.js';

// Mensajes compartidos: una sola oración, cortos y sin espacios sobrantes.
describe('textos compartidos', () => {
	it.each(Object.entries(textos))('%s', (_name, text) => {
		expect(text).toBe(text.trim());
		expect(text.length).toBeLessThanOrEqual(80);
		expect(text.match(/[.!?…](?=\s)/g) ?? []).toHaveLength(text.startsWith('Sin conexión.') ? 1 : 0);
	});
});
