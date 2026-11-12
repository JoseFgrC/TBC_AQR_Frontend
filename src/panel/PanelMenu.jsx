import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon, HomeIcon, LogoutIcon, MenuIcon } from '../components/icons.jsx';
import { trapTab } from '../lib/focusTrap.js';
import { toHash } from '../lib/route.js';
import { SECTIONS } from './sections.jsx';

// Debe coincidir con el @media de .shell en panel.css: desde aquí el menú es una barra lateral fija.
const DESKTOP = '(min-width: 1024px)';
const ITEMS = [{ id: 'inicio', title: 'Inicio', Icon: HomeIcon }, ...SECTIONS];
const FOCUSABLE = 'a[href], button:not([disabled])';

const useMedia = query => {
	const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
	useEffect(() => {
		const list = window.matchMedia?.(query);
		if (!list) return undefined;
		const update = () => setMatches(list.matches);
		update();
		list.addEventListener('change', update);
		return () => list.removeEventListener('change', update);
	}, [query]);
	return matches;
};

// Celular y tableta: botón ☰ en la barra superior que abre un cajón lateral.
// Computadora: el mismo menú queda fijo a la izquierda y el botón se oculta.
// contentRef: el resto del panel, que queda inerte mientras el cajón está abierto.
export default function PanelMenu({ current, user, onLogout, contentRef }) {
	const desktop = useMedia(DESKTOP);
	const [open, setOpen] = useState(false);
	const buttonRef = useRef(null);
	const barRef = useRef(null);
	const drawerRef = useRef(null);
	const restoreFocus = useRef(false);
	const modal = open && !desktop;

	// El foco vuelve al botón ☰ hasta que la barra deja de estar inerte (limpieza del efecto de abajo).
	const close = useCallback(() => {
		restoreFocus.current = true;
		setOpen(false);
	}, []);

	// Al cambiar de sección (o con el "atrás" del celular) el cajón se cierra; el foco lo toma el
	// título de la página nueva (PanelPage).
	useEffect(() => { setOpen(false); }, [current]);
	useEffect(() => { if (desktop) setOpen(false); }, [desktop]);

	useEffect(() => {
		if (!modal) return undefined;
		const drawer = drawerRef.current;
		const focusables = () => [...drawer.querySelectorAll(FOCUSABLE)];
		(drawer.querySelector('[aria-current="page"]') || focusables()[0])?.focus();

		const onKeyDown = event => {
			if (event.key === 'Escape') {
				event.preventDefault();
				close();
			} else if (event.key === 'Tab') {
				const target = trapTab(focusables(), document.activeElement, event.shiftKey);
				if (target) {
					event.preventDefault();
					target.focus();
				}
			}
		};
		const outside = [contentRef?.current, barRef.current].filter(Boolean);
		for (const element of outside) element.inert = true;
		restoreFocus.current = false;
		const overflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.body.style.overflow = overflow;
			for (const element of outside) element.inert = false;
			if (restoreFocus.current) buttonRef.current?.focus();
			restoreFocus.current = false;
		};
	}, [modal, close, contentRef]);

	// Elegir la sección donde ya estás no cambia el hash: se cierra y el foco vuelve al botón.
	const choose = id => {
		if (id === current) close();
	};

	return (
		<>
			<header className="panel-bar" ref={barRef}>
				<button ref={buttonRef} type="button" className="icon-button panel-bar__menu" aria-label="Abrir menú"
					aria-expanded={open} aria-controls="panel-menu" onClick={() => setOpen(true)}>
					<MenuIcon />
				</button>
				<a className="panel-bar__brand" href={toHash()}>
					<img src="/logo-telebachillerato.png" alt="" width="534" height="534" />
					<span>Panel de la dirección</span>
				</a>
			</header>

			{modal && <div className="drawer-backdrop" aria-hidden="true" onClick={() => close()} />}

			<nav id="panel-menu" ref={drawerRef} className={`drawer${open ? ' is-open' : ''}`} aria-label="Menú del panel">
				<div className="drawer__head">
					<span className="drawer__brand">
						<img src="/logo-telebachillerato.png" alt="" width="534" height="534" />
						<span>Panel de la dirección</span>
					</span>
					<button type="button" className="icon-button drawer__close" aria-label="Cerrar menú" onClick={() => close()}>
						<CloseIcon />
					</button>
				</div>
				<ul className="drawer__list">
					{ITEMS.map(({ id, title, Icon }) => (
						<li key={id}>
							<a className="drawer__link" href={id === 'inicio' ? toHash() : toHash(id)}
								aria-current={id === current ? 'page' : undefined} onClick={() => choose(id)}>
								<span className="drawer__icon"><Icon /></span>
								<span className="drawer__label">{title}</span>
							</a>
						</li>
					))}
				</ul>
				<div className="drawer__foot">
					{user?.nombre && (
						<p className="drawer__user">
							<span className="drawer__user-name">{user.nombre}</span>
							{user.email && <span className="drawer__user-email">{user.email}</span>}
						</p>
					)}
					<button type="button" className="button button--secondary drawer__logout" onClick={onLogout}>
						<LogoutIcon />Cerrar sesión
					</button>
				</div>
			</nav>
		</>
	);
}
