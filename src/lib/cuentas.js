// Reglas de auth.schemas.js: nombre ≤ 100, email válido ≤ 150, contraseña de 8 a 100.
export const validatePassword = value => {
	const text = String(value || '');
	if (!text) return 'Escribe una contraseña.';
	if (text.length < 8) return 'Usa al menos 8 caracteres.';
	if (text.length > 100) return 'Usa como máximo 100 caracteres.';
	return null;
};

export const validateCuenta = ({ nombre, email, password }) => {
	const errors = {};
	if (!String(nombre || '').trim()) errors.nombre = 'Escribe el nombre de la persona o del puesto.';
	else if (nombre.length > 100) errors.nombre = 'Usa como máximo 100 caracteres.';
	if (!/^\S+@\S+\.\S+$/.test(String(email || '').trim())) errors.email = 'Escribe un correo completo, por ejemplo entrada@escuela.com.';
	else if (email.length > 150) errors.email = 'Usa como máximo 150 caracteres.';
	const password_ = validatePassword(password);
	if (password_) errors.password = password_;
	return errors;
};

export const validateCambioPassword = ({ actual, nueva, confirmar }) => {
	const errors = {};
	if (!actual) errors.actual = 'Escribe tu contraseña actual.';
	const nueva_ = validatePassword(nueva);
	if (nueva_) errors.nueva = nueva_;
	else if (nueva !== confirmar) errors.confirmar = 'No coincide con la contraseña nueva.';
	return errors;
};

export const isActiva = cuenta => cuenta?.activo === true || Number(cuenta?.activo) === 1;
