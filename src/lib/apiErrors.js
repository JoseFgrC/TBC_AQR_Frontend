// Errores de la API del panel -> lenguaje humano (el escáner usa messages.js).
import { ALGO_SALIO_MAL, DEMASIADOS_INTENTOS, SESION_TERMINO, SIN_CONEXION } from './textos.js';

// Mensajes de validación del backend (validate.middlewares.js) en palabras más amables.
const FIELD_MESSAGES = [
	[/^Campo requerido$/i, 'Este dato es obligatorio.'],
	[/^Email inválido$/i, 'Revisa el correo; parece incompleto.'],
	[/^Mínimo (\d+) caracteres$/i, (_, n) => `Escribe al menos ${n} caracteres.`],
	[/^Máximo (\d+) caracteres$/i, (_, n) => `Usa como máximo ${n} caracteres.`],
	[/^Formato HH:MM/i, 'Escribe la hora completa, por ejemplo 13:00.'],
	[/^Formato YYYY-MM-DD|^Fecha inválida/i, 'Elige una fecha válida.'],
	[/^Debe ser un entero entre (\d+) y (\d+)$/i, (_, a, b) => `Escribe un número entero entre ${a} y ${b}.`],
	[/^Debe ser un entero positivo$/i, 'Elige una opción de la lista.'],
	[/^ID inválido$/i, 'Elige una opción de la lista.'],
	[/hora de entrada debe ser anterior/i, 'La entrada debe ser antes que la salida.'],
];

export const humanizeFieldMessage = message => {
	const text = String(message || '').trim();
	for (const [pattern, replacement] of FIELD_MESSAGES) {
		const match = text.match(pattern);
		if (match) return typeof replacement === 'function' ? replacement(...match) : replacement;
	}
	return text || 'Revisa este dato.';
};

// details: [{ field: 'tutores[0].id_padre', message }] -> { 'tutores[0].id_padre': 'Este dato…' }
// aliases traduce el nombre del backend al del formulario cuando no coinciden
// (p. ej. { 'lunes.entrada': 'lunes' } o { id_padre: 'padre' }).
export const fieldErrors = (error, aliases = {}) => {
	const result = {};
	for (const detail of error?.details || []) {
		if (!detail?.field) continue;
		const field = aliases[detail.field] ?? detail.field;
		result[field] ??= humanizeFieldMessage(detail.message);
	}
	return result;
};

// Mensajes del backend que vale la pena reescribir; el resto ya está en español claro
// ("Alumno no encontrado", "La foto debe ser JPG o PNG", "La contraseña actual no es correcta").
const KNOWN = [
	[/Telegram no está configurado/i, 'Telegram no está disponible; avisa al administrador del sistema.'],
	[/valor duplicado/i, 'Ese dato ya está registrado en otro lugar.'],
	[/El email ya está registrado/i, 'Ya existe una cuenta con ese correo.'],
	[/Referencia inválida/i, 'Uno de los datos elegidos ya no existe. Recarga la página.'],
	[/está en uso por otros datos/i, 'No se puede borrar porque otros registros lo usan.'],
	[/No hay alumnos activos para imprimir/i, 'No hay alumnos activos en ese grupo para imprimir.'],
	[/Envía una imagen JPG o PNG/i, 'Elige una foto JPG o PNG.'],
	[/Para tu propia cuenta usa/i, 'Para tu propia cuenta usa "Cambiar mi contraseña".'],
];

export const describeApiError = error => {
	if (!error) return '';
	if (error.kind === 'network') return SIN_CONEXION;
	const status = error.status;
	const message = String(error.message || '');
	if (status === 401) return SESION_TERMINO;
	if (status === 403) return 'Tu cuenta no tiene permiso para hacer esto.';
	if (status === 429) return DEMASIADOS_INTENTOS;
	// Antes que el genérico de 5xx: "Telegram no está configurado" llega con 503.
	for (const [pattern, text] of KNOWN) if (pattern.test(message)) return text;
	if (status >= 500 || !status) return ALGO_SALIO_MAL;
	if (/^Errores de validación$/i.test(message) || error.details?.length) return 'Revisa los datos marcados.';
	if (status === 404 && /Ruta no encontrada/i.test(message)) return 'Esta función no está disponible en el servidor.';
	return message || 'No se pudo completar. Revisa los datos e intenta de nuevo.';
};
