import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos al montar (y cuando cambian deps). Ignora respuestas viejas si se recarga antes.
export const useAsync = (load, deps) => {
	const [state, setState] = useState({ loading: true, data: null, error: null });
	const latest = useRef(0);

	const reload = useCallback(async () => {
		const id = ++latest.current;
		setState(current => ({ ...current, loading: true, error: null }));
		try {
			const data = await load();
			if (id === latest.current) setState({ loading: false, data, error: null });
		} catch (error) {
			if (id === latest.current) setState(current => ({ loading: false, data: current.data, error }));
		}
	}, deps);

	useEffect(() => {
		reload();
		return () => { latest.current++; };
	}, [reload]);

	const setData = useCallback(update => setState(current => ({
		...current, data: typeof update === 'function' ? update(current.data) : update,
	})), []);

	return { ...state, reload, setData };
};
