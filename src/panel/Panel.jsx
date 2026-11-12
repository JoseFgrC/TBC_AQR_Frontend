import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmProvider } from '../components/Dialog.jsx';
import { parseRoute, toHash } from '../lib/route.js';
import { navigate, useHash } from '../lib/useHashRoute.js';
import Scanner from '../screens/Scanner.jsx';
import { PanelContext } from './context.js';
import Home from './Home.jsx';
import PanelMenu from './PanelMenu.jsx';
import { SECTION_IDS, SECTIONS } from './sections.jsx';

export default function Panel({ user, onLogout }) {
	const hash = useHash();
	const route = parseRoute(hash, SECTION_IDS);
	const [notice, setNotice] = useState(null);
	const lastHash = useRef(hash);
	const contentRef = useRef(null);

	// Al cambiar de página: arriba del todo y el aviso anterior se descarta.
	useEffect(() => {
		if (lastHash.current === hash) return;
		lastHash.current = hash;
		window.scrollTo(0, 0);
		setNotice(current => (current && current.hash === (hash || '#/') ? current : null));
	}, [hash]);

	const notify = useCallback((text, tone = 'success') => setNotice({ text, tone, hash: location.hash || '#/' }), []);
	const go = useCallback((target, text, tone = 'success') => {
		if (text) setNotice({ text, tone, hash: target });
		navigate(target);
	}, []);

	const context = useMemo(() => ({ user, hash: hash || '#/', notice, notify, go }), [user, hash, notice, notify, go]);

	let content;
	if (route.section === 'escanear') {
		content = <Scanner rol="directora" onBack={() => navigate(toHash())} onLogout={onLogout} />;
	} else if (route.section === 'inicio') {
		content = <Home user={user} onLogout={onLogout} />;
	} else {
		const { Component } = SECTIONS.find(section => section.id === route.section);
		content = <Component params={route.params} />;
	}

	// "Escanear" ocupa toda la pantalla y regresa con su botón "← Panel": sin menú.
	return (
		<PanelContext.Provider value={context}>
			<ConfirmProvider>
				{route.section === 'escanear' ? content : (
					<div className="shell">
						<PanelMenu current={route.section} user={user} onLogout={onLogout} contentRef={contentRef} />
						<div className="shell__main" ref={contentRef}>{content}</div>
					</div>
				)}
			</ConfirmProvider>
		</PanelContext.Provider>
	);
}
