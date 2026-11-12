import { isDate } from './validators.js';
import { compareGrado } from './format.js';

const n = value => Number(value) || 0; // los SUM de MySQL pueden llegar como texto

// Mismas reglas que el backend (asistencias.service.js): desde <= hasta y máximo un año (366 días).
export const validateRango = ({ desde, hasta }, { maxDays = null } = {}) => {
	const errors = {};
	if (desde && !isDate(desde)) errors.desde = 'Elige una fecha válida.';
	if (hasta && !isDate(hasta)) errors.hasta = 'Elige una fecha válida.';
	if (!errors.desde && !errors.hasta && desde && hasta) {
		if (desde > hasta) errors.hasta = 'Debe ser igual o posterior a la fecha "Desde".';
		else if (maxDays && (Date.parse(hasta) - Date.parse(desde)) / 86_400_000 > maxDays) errors.hasta = 'El rango máximo es de un año.';
	}
	return errors;
};

// El backend no filtra por grado: se filtra aquí con el campo grado de cada fila.
export const byGrado = (rows, grado) => (grado ? (rows || []).filter(row => String(row.grado ?? '').trim() === grado) : rows || []);

// Historial (más reciente primero) -> [{ fecha, entradas, salidas, retardos, anticipadas, items }]
// estado y hora_programada vienen de sp_historial_asistencias aunque el txt no los documente.
export const groupByDay = rows => {
	const days = [];
	for (const row of rows || []) {
		const fecha = String(row.fecha_hora || '').slice(0, 10);
		let day = days[days.length - 1];
		if (!day || day.fecha !== fecha) days.push(day = { fecha, entradas: 0, salidas: 0, retardos: 0, anticipadas: 0, items: [] });
		day.items.push(row);
		if (row.estado === 'retardo') day.retardos++;
		if (row.estado === 'anticipada') day.anticipadas++;
		if (row.tipo === 'entrada') day.entradas++;
		else if (row.tipo === 'salida') day.salidas++;
	}
	return days;
};

export const parseFechas = text => String(text || '').split(/[,\s]+/).filter(isDate);

export const porcentaje = (parte, total) => (n(total) ? Math.round((n(parte) / n(total)) * 100) : null);

export const resumenReporte = alumnos => {
	const total = { alumnos: 0, dias_clase: 0, asistencias: 0, retardos: 0, faltas: 0, salidas_anticipadas: 0, conFaltas: 0 };
	for (const alumno of alumnos || []) {
		total.alumnos++;
		for (const key of ['dias_clase', 'asistencias', 'retardos', 'faltas', 'salidas_anticipadas']) total[key] += n(alumno[key]);
		if (n(alumno.faltas)) total.conFaltas++;
	}
	return { ...total, porcentaje: porcentaje(total.asistencias, total.dias_clase) };
};

const SORTS = {
	faltas: (a, b) => n(b.faltas) - n(a.faltas) || n(b.retardos) - n(a.retardos),
	retardos: (a, b) => n(b.retardos) - n(a.retardos) || n(b.faltas) - n(a.faltas),
	nombre: () => 0,
	grado: (a, b) => compareGrado(a.grado, b.grado),
};

export const sortReporte = (alumnos, by = 'faltas') =>
	[...(alumnos || [])].sort((a, b) => (SORTS[by] || SORTS.faltas)(a, b) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
