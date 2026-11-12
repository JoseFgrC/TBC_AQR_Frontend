import { useCallback, useEffect, useState } from 'react';
import { onUnauthorized, session } from './api/client.js';
import { homeScreen } from './lib/entry.js';
import { RECOVER_HASH } from './lib/recuperacion.js';
import { clearHash, useHash } from './lib/useHashRoute.js';
import Login from './screens/Login.jsx';
import Recuperar from './screens/Recuperar.jsx';
import Scanner from './screens/Scanner.jsx';
import Panel from './panel/Panel.jsx';

const readSession = () => ({ token: session.token, user: session.user });

export default function App() {
	const [auth, setAuth] = useState(readSession);
	const [expired, setExpired] = useState(false);
	// Después de recuperar la contraseña: el login muestra un aviso con el correo ya escrito.
	const [recovered, setRecovered] = useState(null);
	const hash = useHash();

	useEffect(() => onUnauthorized(() => {
		setExpired(true);
		setAuth({ token: null, user: null });
	}), []);

	const logout = useCallback(() => {
		session.clear();
		clearHash();
		setExpired(false);
		setAuth({ token: null, user: null });
	}, []);

	const screen = homeScreen(auth);
	if (screen === 'login') {
		if (hash === RECOVER_HASH) {
			// replace: el "atrás" del celular no regresa al formulario del código ya usado.
			return <Recuperar onDone={email => { setExpired(false); setRecovered({ email }); location.replace('#/'); }} />;
		}
		return <Login expired={expired} recovered={recovered}
			onLoggedIn={() => { setExpired(false); setRecovered(null); setAuth(readSession()); }} />;
	}
	if (screen === 'panel') return <Panel user={auth.user} onLogout={logout} />;
	return <Scanner onLogout={logout} />;
}
