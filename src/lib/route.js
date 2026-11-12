// Navegación por hash (#/alumnos/12) para que el botón "atrás" del celular funcione sin router.
export const parseRoute = (hash, sections) => {
	const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(part => {
		try { return decodeURIComponent(part); } catch { return part; }
	});
	const [section, ...params] = parts;
	if (!section || !sections.includes(section)) return { section: 'inicio', params: [] };
	return { section, params };
};

export const toHash = (...parts) => `#/${parts.filter(part => part !== undefined && part !== null && part !== '').map(part => encodeURIComponent(String(part))).join('/')}`;
