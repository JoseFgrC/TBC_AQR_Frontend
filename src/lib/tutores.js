import { normalize } from './format.js';

export const telegramStatus = padre => {
	if (!Number(padre?.telegram_vinculado)) return { kind: 'sin', label: 'Sin Telegram vinculado' };
	return Number(padre.notificaciones_activas)
		? { kind: 'activo', label: 'Recibe avisos por Telegram' }
		: { kind: 'pausado', label: 'Telegram vinculado, avisos pausados' };
};

export const filterPadres = (padres, { search = '', telegram = '' } = {}) => {
	const term = normalize(search.trim());
	return (padres || []).filter(padre => {
		if (telegram && telegramStatus(padre).kind !== telegram) return false;
		return !term || normalize(`${padre.nombre} ${padre.telefono ?? ''}`).includes(term);
	});
};

export const validatePadre = ({ nombre, telefono }) => {
	const errors = {};
	if (!String(nombre || '').trim()) errors.nombre = 'Escribe el nombre del tutor.';
	else if (nombre.length > 150) errors.nombre = 'Usa como máximo 150 caracteres.';
	if (String(telefono || '').length > 20) errors.telefono = 'Usa como máximo 20 caracteres.';
	return errors;
};

export const validateChatId = value => {
	const text = String(value || '').trim();
	if (!text) return 'Escribe el chat ID de Telegram.';
	if (text.length > 50) return 'Usa como máximo 50 caracteres.';
	return null;
};
