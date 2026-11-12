import { useCallback, useState } from 'react';
import { describeApiError } from '../lib/apiErrors.js';
import { saveBlob } from '../lib/download.js';

// Descarga un PDF con el token y lo guarda; expone el estado para el botón y el error en palabras.
export const useDownload = () => {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	const download = useCallback(async (fetchFile, fallbackName) => {
		setBusy(true);
		setError('');
		try {
			const { blob, filename } = await fetchFile();
			saveBlob(blob, filename || fallbackName);
			return true;
		} catch (err) {
			if (err.status !== 401) setError(describeApiError(err));
			return false;
		} finally {
			setBusy(false);
		}
	}, []);

	return { download, busy, error };
};
