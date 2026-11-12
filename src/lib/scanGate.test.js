import { describe, expect, it } from 'vitest';
import { createScanGate } from './scanGate.js';

const setup = () => {
	let time = 0;
	const gate = createScanGate({ repeatWindow: 4000, now: () => time });
	return { gate, advance: ms => { time += ms; } };
};

describe('bloqueo del mismo QR', () => {
	it('ignora el mismo QR durante 4 s desde que terminó su petición', () => {
		const { gate, advance } = setup();
		expect(gate.accept('A')).toBe(true);
		advance(300);
		gate.settle('A'); // terminó la petición
		gate.release(); // se cerró la hoja
		advance(3999);
		expect(gate.accept('A')).toBe(false);
		advance(1);
		expect(gate.accept('A')).toBe(true);
	});

	it('mientras hay una petición u hoja abierta no acepta nada, ni otro QR', () => {
		const { gate, advance } = setup();
		expect(gate.accept('A')).toBe(true);
		advance(10_000);
		expect(gate.accept('B')).toBe(false);
		gate.release();
		expect(gate.accept('B')).toBe(true);
	});

	it('un QR distinto se acepta en cuanto se libera', () => {
		const { gate, advance } = setup();
		gate.accept('A');
		gate.settle('A');
		gate.release();
		advance(100);
		expect(gate.accept('B')).toBe(true);
	});

	it('el mismo QR frente a la cámara: una vez en 4 s y de nuevo al cumplirse', () => {
		const { gate, advance } = setup();
		const accepted = [];
		for (let t = 0; t <= 5000; t += 125) { // 8 lecturas/s durante 5 s; la hoja se cierra a los 3 s
			if (gate.accept('A')) { accepted.push(t); gate.settle('A'); }
			if (t === 3000) gate.release();
			advance(125);
		}
		expect(accepted).toEqual([0, 4000]);
	});
});
