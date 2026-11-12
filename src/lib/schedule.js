import { nowMinutes, toMinutes } from './format.js';

// Antes del punto medio entre entrada y salida se reciben entradas; después, salidas.
export const currentMode = (horario, date = new Date()) => {
	const entrada = toMinutes(horario?.hora_entrada);
	const salida = toMinutes(horario?.hora_salida);
	if (entrada === null || salida === null) return 'entradas';
	return nowMinutes(date) < (entrada + salida) / 2 ? 'entradas' : 'salidas';
};
