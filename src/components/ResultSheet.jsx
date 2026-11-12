import { useEffect, useRef } from 'react';
import Avatar from './Avatar.jsx';
import { BellIcon, InfoIcon } from './icons.jsx';

export const SHEET_DURATION = 3000;

export default function ResultSheet({ content, onClose }) {
	const buttonRef = useRef(null);

	useEffect(() => {
		const timer = setTimeout(onClose, SHEET_DURATION);
		buttonRef.current?.focus({ preventScroll: true });
		return () => clearTimeout(timer);
	}, [content, onClose]);

	const { tone, title, subtitle, detail, alumno, notice } = content;

	return (
		<div className="sheet-layer">
			<div className={`sheet sheet--${tone}`} role="dialog" aria-modal="false" aria-labelledby="sheet-title" aria-live="polite">
				{/* Enfocable para poder desplazarla con teclado cuando el texto es grande. */}
				<div className="sheet__body" tabIndex={0} role="region" aria-label="Detalle del registro">
					<div className="sheet__grabber" aria-hidden="true" />

					<div className="sheet__header">
						{alumno ? (
							<Avatar name={alumno.nombre} src={alumno.foto_url} size={72} />
						) : (
							<span className="sheet__icon" aria-hidden="true"><InfoIcon /></span>
						)}
						<div className="sheet__heading">
							<h2 id="sheet-title" className="sheet__title">{title}</h2>
							<p className="sheet__subtitle">{subtitle}</p>
							{detail && <p className="sheet__detail">{detail}</p>}
						</div>
					</div>

					{alumno && (
						<dl className="sheet__rows">
							<div className="sheet__row">
								<dt>Alumno</dt>
								<dd>{alumno.nombre}</dd>
							</div>
							<div className="sheet__row">
								<dt>Grado</dt>
								<dd>{alumno.grado || '—'}</dd>
							</div>
							{notice && (
								<div className="sheet__row">
									<dt><BellIcon /> Aviso a la familia</dt>
									<dd>{notice}</dd>
								</div>
							)}
						</dl>
					)}
				</div>

				<div className="sheet__footer">
					<div className="sheet__progress" aria-hidden="true">
						<span style={{ animationDuration: `${SHEET_DURATION}ms` }} />
					</div>
					<button ref={buttonRef} type="button" className="button button--sheet" onClick={onClose}>
						Siguiente
					</button>
				</div>
			</div>
		</div>
	);
}
