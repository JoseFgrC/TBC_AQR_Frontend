import { useEffect, useState } from 'react';

export const useHash = () => {
	const [hash, setHash] = useState(() => location.hash);
	useEffect(() => {
		const update = () => setHash(location.hash);
		window.addEventListener('hashchange', update);
		return () => window.removeEventListener('hashchange', update);
	}, []);
	return hash;
};

// Cada cambio crea una entrada en el historial (el "atrás" del celular regresa a la anterior).
export const navigate = hash => {
	const target = hash.startsWith('#') ? hash : `#${hash}`;
	if (location.hash !== target) location.hash = target;
};

// Al cerrar sesión: limpia el hash sin dejar una entrada que regrese al panel.
export const clearHash = () => {
	if (location.hash) history.replaceState(null, '', location.pathname + location.search);
};
