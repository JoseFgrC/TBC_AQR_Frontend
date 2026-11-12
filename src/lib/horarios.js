import { isDate, isTime } from './validators.js';

export const DIAS = [
	{ id: 'lunes', label: 'Lunes' },
	{ id: 'martes', label: 'Martes' },
	{ id: 'miercoles', label: 'Miércoles' },
	{ id: 'jueves', label: 'Jueves' },
	{ id: 'viernes', label: 'Viernes' },
	{ id: 'sabado', label: 'Sábado' },
	{ id: 'domingo', label: 'Domingo' },
];

// semana de GET /api/horarios -> { lunes: { on, entrada, salida }, ... }
export const semanaToForm = semana => Object.fromEntries(DIAS.map(({ id }) => {
	const dia = (semana || []).find(item => item.dia === id);
	return [id, { on: Boolean(dia?.hay_clases), entrada: dia?.hora_entrada || '', salida: dia?.hora_salida || '' }];
}));

// Solo los días que cambiaron, con la forma de PUT /semana (null = sin clases).
export const semanaChanges = (original, form) => {
	const changes = {};
	for (const { id } of DIAS) {
		const before = original[id];
		const after = form[id];
		if (!after.on) {
			if (before.on) changes[id] = null;
		} else if (!before.on || before.entrada !== after.entrada || before.salida !== after.salida) {
			changes[id] = { entrada: after.entrada, salida: after.salida };
		}
	}
	return changes;
};

// Errores por día: { lunes: 'La salida debe ser después de la entrada.' }
export const validateSemana = form => {
	const errors = {};
	for (const { id } of DIAS) {
		const dia = form[id];
		if (!dia.on) continue;
		if (!isTime(dia.entrada) || !isTime(dia.salida)) errors[id] = 'Escribe la hora de entrada y la de salida, por ejemplo 13:00 y 18:00.';
		else if (dia.entrada >= dia.salida) errors[id] = 'La salida debe ser después de la entrada.';
	}
	return errors;
};

// details del backend ('lunes.entrada', 'lunes') -> error por día.
export const diaFromField = field => String(field || '').split('.')[0];

export const validateTolerancia = value => {
	const text = String(value ?? '').trim();
	if (!/^\d+$/.test(text) || Number(text) > 240) return 'Escribe un número entero de minutos, entre 0 y 240.';
	return null;
};

// Solo los ajustes que cambiaron, con la forma de PATCH /configuracion.
export const configChanges = (original, form) => {
	const changes = {};
	const tolerancia = Number(form.tolerancia_minutos);
	if (tolerancia !== original.tolerancia_minutos) changes.tolerancia_minutos = tolerancia;
	for (const key of ['consejo_tecnico_ultimo_viernes', 'aviso_no_llego']) {
		if (Boolean(form[key]) !== Boolean(original[key])) changes[key] = Boolean(form[key]);
	}
	return changes;
};

export const validateDiaEspecial = ({ fecha, tipo, hora_entrada, hora_salida, descripcion }) => {
	const errors = {};
	if (!isDate(fecha)) errors.fecha = 'Elige una fecha.';
	if (tipo === 'horario_especial') {
		if (!isTime(hora_entrada)) errors.hora_entrada = 'Escribe la hora de entrada, por ejemplo 15:00.';
		if (!isTime(hora_salida)) errors.hora_salida = 'Escribe la hora de salida, por ejemplo 17:00.';
		if (!errors.hora_entrada && !errors.hora_salida && hora_entrada >= hora_salida) errors.hora_salida = 'La salida debe ser después de la entrada.';
	}
	if (String(descripcion || '').length > 150) errors.descripcion = 'Usa como máximo 150 caracteres.';
	return errors;
};

// ---------- Calendario ----------
const pad = n => String(n).padStart(2, '0');
export const toIso = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;
export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
// 1 = lunes ... 7 = domingo
export const weekday = iso => ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

// Semanas del mes empezando en lunes; los huecos son null.
export const monthGrid = (year, month) => {
	const cells = Array(weekday(toIso(year, month, 1)) - 1).fill(null);
	for (let day = 1; day <= daysInMonth(year, month); day++) cells.push(toIso(year, month, day));
	while (cells.length % 7) cells.push(null);
	const weeks = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
};

export const shiftMonth = ({ year, month }, delta) => {
	const index = year * 12 + (month - 1) + delta;
	return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

export const isLastFriday = iso => weekday(iso) === 5 && Number(iso.slice(8, 10)) + 7 > daysInMonth(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)));

// Qué pasa un día, con el mismo orden que el backend (sección 9 del txt):
// día especial > Consejo Técnico (último viernes, si la regla está activa) > horario semanal.
export const dayStatus = (iso, { especiales = [], semana = [], configuracion = {} }) => {
	const especial = especiales.find(item => item.fecha === iso);
	if (especial) return { kind: especial.tipo, especial };
	if (configuracion.consejo_tecnico_ultimo_viernes && isLastFriday(iso)) return { kind: 'consejo' };
	const dia = semana.find(item => item.dia_semana === weekday(iso));
	return dia?.hay_clases ? { kind: 'clases', dia } : { kind: 'sin_horario' };
};
