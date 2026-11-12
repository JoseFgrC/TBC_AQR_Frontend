import { request } from './client.js';

// Segmento de URL seguro para ids y fechas.
const seg = value => encodeURIComponent(String(value));

// ---------- Auth y cuentas (ENDPOINTS_POSTMAN 2.x) ----------
export const login = (email, password) =>
	request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });

export const registrarEscaner = ({ nombre, email, password }) =>
	request('/api/auth/registro', { method: 'POST', body: { nombre, email, password } });

export const listUsuarios = () => request('/api/auth/usuarios');

export const setEstadoUsuario = (id, activo) =>
	request(`/api/auth/usuarios/${seg(id)}/estado`, { method: 'PATCH', body: { activo } });

export const restablecerPassword = (id, password) =>
	request(`/api/auth/usuarios/${seg(id)}/password`, { method: 'PATCH', body: { password } });

// Devuelve { accessToken, user }: el token anterior deja de servir y hay que guardar el nuevo.
export const cambiarPassword = (passwordActual, passwordNueva) =>
	request('/api/auth/password', { method: 'PATCH', body: { password_actual: passwordActual, password_nueva: passwordNueva } });

// ---------- Recuperar contraseña por Telegram (10.x) ----------
// Sin token: se usan desde el login. La respuesta de solicitar es la misma exista o no la cuenta.
export const solicitarCodigoRecuperacion = email =>
	request('/api/auth/recuperar/solicitar', { method: 'POST', body: { email }, auth: false });

export const confirmarRecuperacion = ({ email, codigo, password }) =>
	request('/api/auth/recuperar/confirmar', { method: 'POST', body: { email, codigo, password }, auth: false });

// Telegram de la propia cuenta (solo directora): { vinculado, vinculado_en }
export const getMiTelegram = () => request('/api/auth/telegram');

// Pide la contraseña actual. { url: https://t.me/<bot>?start=adm_<código>, qrDataUrl, expira }: un solo uso, 15 min.
export const crearEnlaceMiTelegram = password => request('/api/auth/telegram/enlace', { method: 'POST', body: { password } });

export const desvincularMiTelegram = () => request('/api/auth/telegram', { method: 'DELETE' });

// ---------- Tutores (3.x) ----------
export const listPadres = () => request('/api/padres');

export const getPadre = id => request(`/api/padres/${seg(id)}`);

export const createPadre = ({ nombre, telefono }) =>
	request('/api/padres', { method: 'POST', body: { nombre, ...(telefono ? { telefono } : {}) } });

export const setNotificacionesPadre = (id, activo) =>
	request(`/api/padres/${seg(id)}/notificaciones`, { method: 'PATCH', body: { activo } });

export const crearEnlaceTelegram = id => request(`/api/padres/${seg(id)}/telegram/enlace`, { method: 'POST' });

export const vincularTelegram = (id, chatId) =>
	request(`/api/padres/${seg(id)}/telegram`, { method: 'PATCH', body: { telegram_chat_id: chatId } });

export const desvincularTelegram = id => request(`/api/padres/${seg(id)}/telegram`, { method: 'DELETE' });

// ---------- Alumnos (4.x) ----------
export const listAlumnos = ({ search, page, limit } = {}) => request('/api/alumnos', { query: { search, page, limit } });

// El backend no filtra por grado ni por estado: se trae la lista completa (páginas de 100, su máximo)
// y la búsqueda y los filtros se hacen en el navegador.
export const listAllAlumnos = async () => {
	const items = [];
	for (let page = 1; ; page++) {
		const data = await listAlumnos({ page, limit: 100 });
		items.push(...(data?.items || []));
		if (!data?.items?.length || items.length >= (data.total ?? 0)) return items;
	}
};

export const getAlumno = id => request(`/api/alumnos/${seg(id)}`);

export const createAlumno = ({ nombre, grado, tutores }) =>
	request('/api/alumnos', { method: 'POST', body: { nombre, ...(grado ? { grado } : {}), ...(tutores?.length ? { tutores } : {}) } });

// Solo los campos que cambian: nombre, grado, activo.
export const updateAlumno = (id, changes) => request(`/api/alumnos/${seg(id)}`, { method: 'PUT', body: changes });

export const uploadFotoAlumno = (id, file) => {
	const form = new FormData();
	form.append('foto', file);
	return request(`/api/alumnos/${seg(id)}/foto`, { method: 'POST', body: form });
};

export const asignarTutor = (id, { id_padre, parentesco }) =>
	request(`/api/alumnos/${seg(id)}/tutores`, { method: 'POST', body: { id_padre: Number(id_padre), ...(parentesco ? { parentesco } : {}) } });

export const quitarTutor = (id, padreId) =>
	request(`/api/alumnos/${seg(id)}/tutores/${seg(padreId)}`, { method: 'DELETE' });

// ---------- Credenciales (5.x) ----------
export const getCredencial = alumnoId => request(`/api/credenciales/${seg(alumnoId)}`);

export const descargarCredencialPdf = alumnoId =>
	request(`/api/credenciales/${seg(alumnoId)}/pdf`, { responseType: 'blob' });

// Sin grado: todos los alumnos activos.
export const descargarLotePdf = grado =>
	request('/api/credenciales/lote/pdf', { query: { grado }, responseType: 'blob' });

export const regenerarCredencial = (alumnoId, motivo) =>
	request(`/api/credenciales/${seg(alumnoId)}/regenerar`, { method: 'POST', body: motivo ? { motivo } : {} });

export const historialCredencial = alumnoId => request(`/api/credenciales/${seg(alumnoId)}/historial`);

// ---------- Asistencias (6.x) ----------
export const escanear = token =>
	request('/api/asistencias/escanear', { method: 'POST', body: { token } });

// Cada fila trae id, alumno, grado, tipo, estado, hora_programada y fecha_hora (sp_historial_asistencias;
// el txt solo documenta los primeros cuatro y la fecha).
export const getHistorial = ({ desde, hasta, alumnoId } = {}) =>
	request('/api/asistencias/historial', { query: { desde, hasta, alumnoId } });

export const getReporte = ({ desde, hasta, alumnoId } = {}) =>
	request('/api/asistencias/reporte', { query: { desde, hasta, alumnoId } });

// ---------- Horarios (9.x) ----------
export const getHorarioDia = fecha => request('/api/horarios/dia', { query: { fecha } });

export const getHorarios = () => request('/api/horarios');

// { lunes: { entrada, salida } | null, ... } solo con los días que cambian.
export const guardarSemana = semana => request('/api/horarios/semana', { method: 'PUT', body: semana });

export const actualizarConfiguracion = changes => request('/api/horarios/configuracion', { method: 'PATCH', body: changes });

export const listDiasEspeciales = ({ desde, hasta } = {}) =>
	request('/api/horarios/dias-especiales', { query: { desde, hasta } });

export const guardarDiaEspecial = (fecha, { tipo, hora_entrada, hora_salida, descripcion }) =>
	request(`/api/horarios/dias-especiales/${seg(fecha)}`, {
		method: 'PUT',
		body: {
			tipo,
			...(tipo === 'horario_especial' ? { hora_entrada, hora_salida } : {}),
			...(descripcion ? { descripcion } : {}),
		},
	});

export const eliminarDiaEspecial = fecha =>
	request(`/api/horarios/dias-especiales/${seg(fecha)}`, { method: 'DELETE' });
