import { useState } from 'react';
import { login } from '../api/endpoints.js';
import { session } from '../api/client.js';
import { unlockAudio } from '../lib/feedback.js';
import { RECOVER_HASH } from '../lib/recuperacion.js';
import { ALGO_SALIO_MAL, DEMASIADOS_INTENTOS, PASSWORD_CAMBIADA, SESION_TERMINO, SIN_CONEXION } from '../lib/textos.js';

const describeLoginError = error => {
	if (error.kind === 'network') return SIN_CONEXION;
	if (error.status === 429) return DEMASIADOS_INTENTOS;
	if (error.status === 401 || error.status === 400) return 'Revisa tu correo y contraseña e inténtalo de nuevo.';
	return ALGO_SALIO_MAL;
};

// recovered: { email } cuando viene de recuperar la contraseña.
export default function Login({ onLoggedIn, expired, recovered }) {
	const [email, setEmail] = useState(recovered?.email ?? '');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(expired ? SESION_TERMINO : '');

	const submit = async event => {
		event.preventDefault();
		unlockAudio();
		setBusy(true);
		setError('');
		try {
			const data = await login(email.trim(), password);
			session.save(data.accessToken, data.user);
			onLoggedIn();
		} catch (err) {
			setError(describeLoginError(err));
			setBusy(false);
		}
	};

	return (
		<main className="login">
			<div className="login__brand">
				<img src="/logo-telebachillerato.png" alt="Telebachillerato Comunitario" width="534" height="534" />
			</div>
			<h1 className="title">Asistencia</h1>
			{recovered && !error && (
				<p className="notice" role="status">{PASSWORD_CAMBIADA}</p>
			)}

			<form className="card form" onSubmit={submit} noValidate>
				<label className="field">
					<span className="field__label">Correo</span>
					<input
						type="email"
						inputMode="email"
						autoComplete="username"
						autoCapitalize="none"
						spellCheck="false"
						value={email}
						onChange={e => setEmail(e.target.value)}
						placeholder="tu@escuela.com"
						required
					/>
				</label>
				<label className="field">
					<span className="field__label">Contraseña</span>
					<input
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						placeholder="Tu contraseña"
						required
					/>
				</label>
				{error && <p className="form__error" role="alert">{error}</p>}
				<button type="submit" className="button button--primary" disabled={busy || !email || !password}>
					{busy ? 'Entrando…' : 'Entrar'}
				</button>
			</form>
			<a className="button button--plain login__link" href={RECOVER_HASH}>¿Olvidaste tu contraseña?</a>
		</main>
	);
}
