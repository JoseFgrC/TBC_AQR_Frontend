import { useEffect, useRef } from 'react';
import { BackIcon } from '../components/icons.jsx';
import { usePanel } from './context.js';

// Marco de cada sección: botón para volver, título, acciones y el aviso de la última operación.
// El foco va al título al entrar, para que el lector de pantalla anuncie la página nueva.
export default function PanelPage({ title, eyebrow, back = '#/', backLabel = 'Inicio', actions, children, wide = false }) {
	const { notice, hash } = usePanel();
	const headingRef = useRef(null);

	useEffect(() => {
		headingRef.current?.focus({ preventScroll: true });
	}, [title]);

	return (
		<main className={`page ${wide ? 'page--wide' : ''}`}>
			<nav className="page__nav" aria-label="Navegación">
				<a className="button button--plain page__back" href={back}><BackIcon />{backLabel}</a>
			</nav>
			<header className="page__header">
				<div className="page__heading">
					{eyebrow && <p className="eyebrow">{eyebrow}</p>}
					<h1 className="title page__title" ref={headingRef} tabIndex={-1}>{title}</h1>
				</div>
				{actions && <div className="page__actions">{actions}</div>}
			</header>
			<div role="status" className="page__status">
				{notice && notice.hash === hash && <p className={`notice notice--${notice.tone}`}>{notice.text}</p>}
			</div>
			{children}
		</main>
	);
}

// Estados comunes de carga y error dentro de una sección.
export function Loading({ label = 'Cargando…' }) {
	return <p className="muted" role="status">{label}</p>;
}

export function LoadError({ message, onRetry }) {
	return (
		<div className="card load-error" role="alert">
			<p>{message}</p>
			{onRetry && <button type="button" className="button button--secondary" onClick={onRetry}>Reintentar</button>}
		</div>
	);
}
