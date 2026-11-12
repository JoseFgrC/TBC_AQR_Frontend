// Copia texto; en HTTP sin clipboard API (o si el navegador la niega) usa un textarea temporal.
export const copyText = async text => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const area = document.createElement('textarea');
		area.value = text;
		area.setAttribute('readonly', '');
		area.style.position = 'fixed';
		area.style.opacity = '0';
		document.body.append(area);
		area.select();
		let copied = false;
		try { copied = document.execCommand('copy'); } catch { copied = false; }
		area.remove();
		return copied;
	}
};
