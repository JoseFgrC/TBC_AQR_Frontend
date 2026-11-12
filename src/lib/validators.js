// Validación en el navegador con las mismas reglas del backend. Hace falta porque en producción
// el backend no manda "details" y no se sabría qué campo corregir.
export const isTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
export const isDate = value => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const required = (value, message = 'Este dato es obligatorio.') => (String(value ?? '').trim() ? null : message);
const max = (value, n) => (String(value ?? '').length > n ? `Usa como máximo ${n} caracteres.` : null);

const collect = rules => {
	const errors = {};
	for (const [field, checks] of Object.entries(rules)) {
		const message = checks.find(Boolean);
		if (message) errors[field] = message;
	}
	return errors;
};

export const validateAlumno = ({ nombre, grado }) => collect({
	nombre: [required(nombre, 'Escribe el nombre del alumno.'), max(nombre, 150)],
	grado: [max(grado, 20)],
});

export const validateTutorAsignado = ({ padre, parentesco }) => collect({
	padre: [required(padre, 'Elige un tutor.')],
	parentesco: [max(parentesco, 30)],
});

export const validateHorarioEspecial = ({ hora_entrada, hora_salida }) => {
	const errors = collect({
		hora_entrada: [required(hora_entrada, 'Escribe la hora de entrada.'), isTime(hora_entrada) || !hora_entrada ? null : 'Escribe la hora completa, por ejemplo 13:00.'],
		hora_salida: [required(hora_salida, 'Escribe la hora de salida.'), isTime(hora_salida) || !hora_salida ? null : 'Escribe la hora completa, por ejemplo 18:00.'],
	});
	if (!errors.hora_entrada && !errors.hora_salida && hora_entrada >= hora_salida) errors.hora_salida = 'La salida debe ser después de la entrada.';
	return errors;
};

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const validatePhoto = file => {
	if (!file) return 'Elige una foto.';
	if (!/^image\/(jpeg|png)$/.test(file.type)) return 'La foto debe ser JPG o PNG.';
	if (file.size > MAX_PHOTO_BYTES) return 'La foto pesa más de 5 MB. Elige una más ligera.';
	return null;
};
