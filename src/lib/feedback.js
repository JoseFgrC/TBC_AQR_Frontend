let audioContext;

// Un "tin" corto y suave generado al vuelo; no requiere archivos de audio.
const chime = () => {
	try {
		audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
		if (audioContext.state === 'suspended') audioContext.resume();
		const now = audioContext.currentTime;
		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(880, now);
		oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(0.25, now + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
		oscillator.connect(gain).connect(audioContext.destination);
		oscillator.start(now);
		oscillator.stop(now + 0.2);
	} catch { /* sin audio disponible */ }
};

// iOS Safari exige un gesto del usuario para habilitar el audio; se llama desde el login/primer toque.
export const unlockAudio = () => {
	try {
		audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
		if (audioContext.state === 'suspended') audioContext.resume();
	} catch { /* sin audio disponible */ }
};

export const successFeedback = () => {
	navigator.vibrate?.(40);
	chime();
};

export const noticeFeedback = () => {
	navigator.vibrate?.([20, 60, 20]);
};
