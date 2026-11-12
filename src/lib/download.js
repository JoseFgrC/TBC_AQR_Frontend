// Guarda un Blob (PDF) como archivo. No se puede usar <a href="/api/..."> directo porque la
// petición necesita el header Authorization; el PDF se descarga con fetch y luego se guarda.
export const saveBlob = (blob, filename) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.rel = 'noopener';
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
