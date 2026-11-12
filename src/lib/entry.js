// Qué pantalla ve cada cuenta. Un rol desconocido (o una sesión vieja sin rol) va al escáner,
// que es lo que menos permisos necesita; el backend responde 403 a todo lo demás de todas formas.
export const homeScreen = ({ token, user }) => {
	if (!token) return 'login';
	return user?.rol === 'directora' ? 'panel' : 'scanner';
};

// Dentro del escáner: la cámara, o la pantalla de "Hoy no hay clases".
// noClasses es el motivo (texto, puede ser '') o null si hay clases.
// La directora además puede volver al panel o habilitar clases ese día.
export const scannerScreen = ({ noClasses, rol }) => {
	if (noClasses === null || noClasses === undefined) return 'camera';
	return rol === 'directora' ? 'no-classes-directora' : 'no-classes';
};
