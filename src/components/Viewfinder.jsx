import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { FlashIcon } from './icons.jsx';

export default function Viewfinder({ onScan, hint }) {
	const videoRef = useRef(null);
	const scannerRef = useRef(null);
	const onScanRef = useRef(onScan);
	const [status, setStatus] = useState('starting'); // starting | ready | denied
	const [hasFlash, setHasFlash] = useState(false);
	const [flashOn, setFlashOn] = useState(false);
	const [attempt, setAttempt] = useState(0);

	onScanRef.current = onScan;

	useEffect(() => {
		const scanner = new QrScanner(videoRef.current, result => onScanRef.current(result.data), {
			preferredCamera: 'environment',
			maxScansPerSecond: 8,
			returnDetailedScanResult: true,
		});
		scannerRef.current = scanner;
		let cancelled = false;

		scanner.start()
			.then(async () => {
				if (cancelled) return;
				setStatus('ready');
				setHasFlash(await scanner.hasFlash().catch(() => false));
			})
			.catch(() => !cancelled && setStatus('denied'));

		return () => {
			cancelled = true;
			scanner.destroy();
			scannerRef.current = null;
		};
	}, [attempt]);

	const toggleFlash = async () => {
		const scanner = scannerRef.current;
		if (!scanner) return;
		try {
			await scanner.toggleFlash();
			setFlashOn(scanner.isFlashOn());
		} catch {
			setHasFlash(false);
		}
	};

	return (
		<section className="viewfinder" aria-label="Cámara">
			<video ref={videoRef} className="viewfinder__video" muted playsInline />
			<div className="viewfinder__frame" aria-hidden="true">
				<span /><span /><span /><span />
			</div>

			{status === 'denied' && (
				<div className="viewfinder__overlay">
					<p className="viewfinder__overlay-title">Necesitamos la cámara</p>
					<p className="viewfinder__overlay-text">Permite el acceso a la cámara en tu navegador.</p>
					<button type="button" className="button button--secondary" onClick={() => { setStatus('starting'); setAttempt(n => n + 1); }}>
						Intentar de nuevo
					</button>
				</div>
			)}

			{hasFlash && status === 'ready' && (
				<button
					type="button"
					className={`icon-button viewfinder__flash${flashOn ? ' is-on' : ''}`}
					onClick={toggleFlash}
					aria-label={flashOn ? 'Apagar linterna' : 'Encender linterna'}
					aria-pressed={flashOn}
				>
					<FlashIcon on={flashOn} />
				</button>
			)}

			<p className="viewfinder__hint">{hint}</p>
		</section>
	);
}
