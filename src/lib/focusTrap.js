// Foco atrapado (menú lateral abierto): a qué elemento mover el foco al presionar Tab.
// items: elementos enfocables en orden; active: el que tiene el foco ahora.
// Devuelve el elemento al que hay que saltar, o null si el navegador puede avanzar solo.
export const trapTab = (items, active, shift = false) => {
	if (!items.length) return null;
	const index = items.indexOf(active);
	if (index === -1) return shift ? items[items.length - 1] : items[0]; // el foco se salió: regresa
	if (shift && index === 0) return items[items.length - 1];
	if (!shift && index === items.length - 1) return items[0];
	return null;
};
