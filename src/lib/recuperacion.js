import { validatePassword } from './cuentas.js';
import { ALGO_SALIO_MAL, DEMASIADOS_INTENTOS, SIN_CONEXION } from './textos.js';

// Recuperar la contraseña con un código del bot de Telegram (ENDPOINTS_POSTMAN 10.x).
// El backend responde lo mismo exista o no la cuenta; la pantalla repite ese texto tal cual.
export const REQUEST_MESSAGE = 'Si la cuenta existe y tiene Telegram, te llegó un código. ¿No te llegó? Pide ayuda al administrador del sistema.';
export const RECOVER_HASH = '#/recuperar';
export const CODE_LENGTH = 6;
export const CODE_REQUIRED = 'Escribe los 6 números del código.';
// Para no topar con el límite del backend (3 códigos por correo cada 15 min).
export const RESEND_SECONDS = 30;

// "123 456" o "123-456" pegado desde Telegram -> "123456"
export const normalizeCode = value => String(value ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH);

export const validateCorreo = value => {
	const email = String(value ?? '').trim();
	if (!/^\S+@\S+\.\S+$/.test(email)) return 'Escribe tu correo completo, por ejemplo directora@escuela.com.';
	if (email.length > 150) return 'Usa como máximo 150 caracteres.';
	return null;
};

export const validateRecuperacion = ({ codigo, nueva, confirmar }) => {
	const errors = {};
	if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(codigo || '')) errors.codigo = CODE_REQUIRED;
	const password = validatePassword(nueva);
	if (password) errors.nueva = password;
	else if (nueva !== confirmar) errors.confirmar = 'No coincide con la contraseña nueva.';
	return errors;
};

// Errores de 10.4 y 10.5 -> { field, message }: field dice qué campo marcar (o null para el aviso general).
export const describeRecoveryError = error => {
	if (error?.kind === 'network') return { field: null, message: SIN_CONEXION };
	if (error?.status === 429) return { field: null, message: DEMASIADOS_INTENTOS };
	if (error?.status === 400 && /código no es válido|ya venció/i.test(error.message || '')) {
		return { field: 'codigo', message: 'Ese código no es válido o ya venció; revísalo o pide otro.' };
	}
	if (error?.status === 400) return { field: null, message: 'Revisa los datos marcados.' };
	return { field: null, message: ALGO_SALIO_MAL };
};

// Enlace del backend para vincular el Telegram de la cuenta: solo https://t.me/...
export const isTelegramLink = url => typeof url === 'string' && /^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=adm_[A-Za-z0-9_-]+$/.test(url);
