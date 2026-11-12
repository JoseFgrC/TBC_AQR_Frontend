const dateFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

export const formatToday = (date = new Date()) => dateFormatter.format(date).replace(',', '');

// "2026-10-06 14:26:00" -> "14:26"
export const hhmm = value => {
	const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
	return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
};

export const toMinutes = value => {
	const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
	return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export const nowMinutes = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

export const firstName = fullName => String(fullName || '').trim().split(/\s+/)[0] || '';

export const initials = fullName => {
	const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const longDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Fecha local del dispositivo como YYYY-MM-DD (la que espera la API).
export const isoDate = (date = new Date()) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// "2026-10-06 14:26:01" -> "6 oct 2026, 14:26" (sin conversiones de zona: la BD ya guarda hora local)
export const formatDateTime = value => {
	const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
	if (!match) return String(value || '');
	const [, y, m, d, hh, mm] = match;
	return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}${hh ? `, ${hh}:${mm}` : ''}`;
};

// "2026-11-16" -> "lunes 16 de noviembre de 2026"
export const formatLongDate = value => {
	const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return String(value || '');
	return longDate.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
};

// Orden natural para grados: "2A" < "3B" < "10A".
export const compareGrado = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true, sensitivity: 'base' });

// Búsqueda sin distinguir mayúsculas ni acentos.
export const normalize = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "2026-10-10" + 3 -> "2026-10-13" (calendario, sin zona horaria)
export const addDays = (iso, days) => {
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};
