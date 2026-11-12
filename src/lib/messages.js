import { firstName, hhmm, toMinutes } from './format.js';

const tutoresLabel = asistencia => {
	const count = Number(asistencia.tutores_notificados) || 0;
	if (count === 0) return 'Sin tutores con Telegram';
	return `Enviado a ${count} ${count === 1 ? 'tutor' : 'tutores'}`;
};

// Color y etiqueta de un registro según tipo y estado. La usan el escáner (Recientes) y el historial
// del panel, para que un retardo o una salida anticipada se vean igual en los dos lugares.
export const describeRegistro = ({ tipo, estado }) => {
	if (tipo === 'entrada') return estado === 'retardo' ? { tone: 'orange', label: 'Retardo' } : { tone: 'green', label: 'Entrada' };
	return estado === 'anticipada' ? { tone: 'blue', label: 'Salida anticipada' } : { tone: 'blue', label: 'Salida' };
};

// "Retardo · 13:23, entrada 13:00" / "Entrada · 12:58" (la hora programada solo cuando hay algo que explicar)
export const describeRegistroLinea = ({ tipo, estado, fecha_hora, hora_programada }) => {
	const { label } = describeRegistro({ tipo, estado });
	const time = hhmm(fecha_hora);
	const programada = hhmm(hora_programada);
	const explica = (estado === 'retardo' || estado === 'anticipada') && programada;
	return `${label} · ${time}${explica ? `, ${tipo === 'entrada' ? 'entrada' : 'salida'} ${programada}` : ''}`;
};

// Respuesta 201 de /asistencias/escanear -> contenido de la hoja de resultado.
export const describeSuccess = ({ alumno, asistencia }) => {
	const name = firstName(alumno.nombre);
	const time = hhmm(asistencia.fecha_hora);
	const programada = hhmm(asistencia.hora_programada);
	const { tone, label } = describeRegistro(asistencia);
	const base = { kind: 'success', alumno, notice: tutoresLabel(asistencia), time, tone, recent: label };

	if (asistencia.tipo === 'entrada') {
		if (asistencia.estado === 'retardo') {
			const diff = toMinutes(time) - toMinutes(programada);
			return {
				...base,
				title: `¡Hola, ${name}!`,
				subtitle: `Llegó con retardo · ${time}`,
				detail: diff > 0 ? `${diff} min después de las ${programada}` : null,
			};
		}
		return { ...base, title: `¡Hola, ${name}!`, subtitle: `Entró a tiempo · ${time}` };
	}

	if (asistencia.estado === 'anticipada') {
		return {
			...base,
			title: `¡Hasta mañana, ${name}!`,
			subtitle: `Salió antes de su horario · ${time}`,
			detail: programada ? `Su salida es a las ${programada}` : null,
		};
	}
	return { ...base, title: `¡Hasta mañana, ${name}!`, subtitle: `Salió · ${time}` };
};

// Errores de la API -> lenguaje humano. Si el QR es de un alumno, el backend manda
// data.alumno y data.salida_permitida_desde; el mensaje solo se usa para saber qué pasó.
export const describeError = error => {
	const message = error?.message || '';
	const alumno = error?.data?.alumno || null;
	const who = alumno ? firstName(alumno.nombre) : 'Este alumno';
	const notice = (title, subtitle) => ({ kind: 'notice', tone: 'yellow', alumno, title, subtitle });

	if (error?.kind === 'network') return notice('Sin conexión', 'Reintenta en un momento.');

	const noClasses = message.match(/Hoy no hay clases\s*\((.+)\)/i);
	if (noClasses) return { kind: 'no-classes', motivo: noClasses[1] };

	if (/Entrada ya registrada/i.test(message)) {
		const desde = error.data?.salida_permitida_desde;
		return notice(`${who} ya entró hoy`, desde ? `Su salida se puede marcar a partir de las ${desde}.` : 'Su salida se podrá marcar en unos minutos.');
	}
	if (/ya registró su entrada y su salida/i.test(message)) {
		return notice(`${who} ya completó su día`, 'Su entrada y su salida ya están registradas.');
	}
	if (/QR no reconocido/i.test(message)) return notice('No reconocemos esta credencial', 'Puede ser una versión anterior.');
	if (/Alumno inactivo/i.test(message)) return notice('Credencial sin alumno activo', 'El alumno está dado de baja.');
	if (error?.status === 429) return notice('Vas muy rápido', 'Espera un momento.');
	if (error?.status === 400) return notice('No pudimos leer esta credencial', 'Acércala de nuevo a la cámara.');
	return notice('Algo no salió bien', 'Intenta de nuevo en un momento.');
};
