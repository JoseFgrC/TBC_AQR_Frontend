// Decide si una lectura de la cámara se envía al backend:
// - nunca mientras hay una petición en curso o una hoja abierta (busy);
// - el mismo QR se ignora durante repeatWindow ms, contados desde que terminó su petición.
export const createScanGate = ({ repeatWindow = 4000, now = () => Date.now() } = {}) => {
	let busy = false;
	let last = { text: null, at: -Infinity };

	return {
		accept(text) {
			if (busy) return false;
			if (text === last.text && now() - last.at < repeatWindow) return false;
			busy = true;
			last = { text, at: now() };
			return true;
		},
		settle(text) {
			last = { text, at: now() };
		},
		release() {
			busy = false;
		},
	};
};
