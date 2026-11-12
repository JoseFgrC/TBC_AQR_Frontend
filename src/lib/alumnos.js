import { compareGrado, normalize } from './format.js';

export const isActive = alumno => Boolean(Number(alumno?.activo));

// Grados distintos de la lista, en orden natural; los vacíos se omiten.
export const gradosDe = alumnos => [...new Set((alumnos || []).map(alumno => String(alumno.grado ?? '').trim()).filter(Boolean))].sort(compareGrado);

// Igual que la búsqueda del backend (nombre, grado y tutores) pero sin acentos; más grado y estado.
export const filterAlumnos = (alumnos, { search = '', grado = '', estado = 'activos' } = {}) => {
	const term = normalize(search.trim());
	return (alumnos || []).filter(alumno => {
		if (estado === 'activos' && !isActive(alumno)) return false;
		if (estado === 'inactivos' && isActive(alumno)) return false;
		if (grado && String(alumno.grado ?? '').trim() !== grado) return false;
		return !term || normalize(`${alumno.nombre} ${alumno.grado ?? ''} ${alumno.tutores ?? ''}`).includes(term);
	});
};

// Cambios de un formulario frente al alumno actual (PUT solo con lo que cambió).
export const alumnoChanges = (alumno, { nombre, grado }) => {
	const changes = {};
	if (nombre.trim() !== alumno.nombre) changes.nombre = nombre.trim();
	const nuevoGrado = grado.trim() || null;
	if (nuevoGrado !== (alumno.grado || null)) changes.grado = nuevoGrado;
	return changes;
};
