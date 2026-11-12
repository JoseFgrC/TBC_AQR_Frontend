import { useEffect, useRef, useState } from 'react';
import { safeImageDataUrl, session } from '../api/client.js';
import {
	cambiarPassword, crearEnlaceMiTelegram, desvincularMiTelegram, getMiTelegram, listUsuarios, registrarEscaner, restablecerPassword, setEstadoUsuario,
} from '../api/endpoints.js';
import { useConfirm } from '../components/Dialog.jsx';
import { PasswordField, Switch, TextField } from '../components/Field.jsx';
import { ChevronIcon, PlusIcon } from '../components/icons.jsx';
import { describeApiError, fieldErrors } from '../lib/apiErrors.js';
import { isActiva, validateCambioPassword, validateCuenta, validatePassword } from '../lib/cuentas.js';
import { copyText } from '../lib/clipboard.js';
import { formatDateTime, hhmm } from '../lib/format.js';
import { isTelegramLink } from '../lib/recuperacion.js';
import { toHash } from '../lib/route.js';
import { useAsync } from '../lib/useAsync.js';
import { usePanel } from './context.js';
import PanelPage, { LoadError, Loading } from './PanelPage.jsx';
import { NO_SE_PUDO_COPIAR, PASSWORD_CAMBIADA, PASSWORD_HINT } from '../lib/textos.js';

export default function Cuentas({ params }) {
	const [first] = params;
	if (first === 'nueva') return <NuevaCuenta />;
	if (first === 'mi-cuenta') return <MiCuenta />;
	if (/^\d+$/.test(first || '')) return <CuentaDetalle key={first} id={Number(first)} />;
	return <ListaCuentas />;
}

function ListaCuentas() {
	const { user } = usePanel();
	const { data, error, loading, reload } = useAsync(listUsuarios, []);
	const escaneres = (data || []).filter(cuenta => cuenta.rol === 'escaner');

	return (
		<PanelPage title="Cuentas" wide
			actions={<a className="button button--primary button--small" href={toHash('cuentas', 'nueva')}><PlusIcon />Nueva cuenta</a>}>
			<div className="columns columns--aside">
				<div className="stack">
					<section className="card" aria-labelledby="mi-cuenta-title">
						<h2 className="card__title" id="mi-cuenta-title">Mi cuenta</h2>
						<p className="row__title">{user?.nombre}</p>
						<p className="muted card__lead">{user?.email}</p>
						<a className="button button--secondary button--small" href={toHash('cuentas', 'mi-cuenta')}>Cambiar mi contraseña</a>
					</section>
					<MiTelegram />
				</div>
				<section className="stack" aria-labelledby="personal-title">
					<h2 className="section-title" id="personal-title">Personal de entrada</h2>
					<p className="muted">Solo pueden escanear y ver el horario del día.</p>
					{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
					{loading && !data && <Loading />}
					{data && (escaneres.length ? (
						<ul className="card list">
							{escaneres.map(cuenta => (
								<li key={cuenta.id}>
									<a className="row" href={toHash('cuentas', cuenta.id)}>
										<span className="row__text">
											<span className="row__title">{cuenta.nombre}</span>
											<span className="row__meta">
												<span>{cuenta.email}</span>
												{!isActiva(cuenta) && <span className="badge">Desactivada</span>}
											</span>
										</span>
										<span className="row__chevron"><ChevronIcon /></span>
									</a>
								</li>
							))}
						</ul>
					) : <p className="card muted">Aún no hay cuentas de personal de entrada.</p>)}
				</section>
			</div>
		</PanelPage>
	);
}

function NuevaCuenta() {
	const { go } = usePanel();
	const [form, setForm] = useState({ nombre: '', email: '', password: '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const set = key => event => setForm({ ...form, [key]: event.target.value });

	const submit = async event => {
		event.preventDefault();
		const local = validateCuenta(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy(true);
		try {
			const created = await registrarEscaner({ nombre: form.nombre.trim(), email: form.email.trim(), password: form.password });
			go(toHash('cuentas', created.id), `Cuenta creada; comparte con la persona el correo ${form.email.trim()} y la contraseña.`);
		} catch (error) {
			if (error.status === 401) return;
			const fields = fieldErrors(error);
			if (error.status === 409) fields.email = 'Ya existe una cuenta con ese correo.';
			setErrors(fields);
			setMessage(describeApiError(error));
			setBusy(false);
		}
	};

	return (
		<PanelPage title="Nueva cuenta de escáner" back={toHash('cuentas')} backLabel="Cuentas">
			<form className="card form" onSubmit={submit} noValidate>
				<TextField label="Nombre" value={form.nombre} maxLength={100} autoComplete="off" error={errors.nombre}
					placeholder="Portero turno vespertino" onChange={set('nombre')} />
				<TextField label="Correo" type="email" inputMode="email" autoCapitalize="none" spellCheck="false" value={form.email} maxLength={150}
					autoComplete="off" error={errors.email} onChange={set('email')} />
				<PasswordField label="Contraseña" value={form.password} maxLength={100} autoComplete="new-password"
					hint={PASSWORD_HINT} error={errors.password} onChange={set('password')} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Creando…' : 'Crear'}</button>
			</form>
		</PanelPage>
	);
}

const POLL_MS = 4000;
const LINK_MINUTES = 15;
const LINKED_MESSAGE = 'Listo, tu Telegram quedó vinculado.';

// Telegram de la directora: donde le llegan los códigos para recuperar su contraseña desde el login.
function MiTelegram() {
	const { notify, user } = usePanel();
	const confirm = useConfirm();
	const { data, error, loading, reload, setData } = useAsync(getMiTelegram, []);
	const [enlace, setEnlace] = useState(null);
	const [copied, setCopied] = useState(false);
	const [busy, setBusy] = useState('');
	const [actionError, setActionError] = useState('');
	// Para generar el enlace se confirma la contraseña (una sesión robada no basta para vincular otro Telegram).
	const [asking, setAsking] = useState(false);
	const [password, setPassword] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const notifyRef = useRef(notify);
	notifyRef.current = notify;
	const linked = Boolean(data?.vinculado);
	const url = isTelegramLink(enlace?.url) ? enlace.url : null;
	const qr = safeImageDataUrl(enlace?.qrDataUrl);

	const linkedNow = current => {
		setData(current);
		setEnlace(null);
		notifyRef.current(LINKED_MESSAGE);
	};

	// Mientras el enlace está a la vista se revisa cada pocos segundos si ya tocó "Iniciar" en Telegram.
	useEffect(() => {
		if (!url || linked) return undefined;
		const until = Date.now() + LINK_MINUTES * 60_000;
		const timer = setInterval(async () => {
			if (Date.now() > until) { clearInterval(timer); return; }
			if (document.visibilityState !== 'visible') return;
			try {
				const current = await getMiTelegram();
				if (current?.vinculado) linkedNow(current);
			} catch { /* se reintenta en la siguiente vuelta; un 401 ya lo maneja App */ }
		}, POLL_MS);
		return () => clearInterval(timer);
	}, [url, linked]);

	const run = async (kind, action) => {
		setBusy(kind);
		setActionError('');
		try {
			await action();
		} catch (err) {
			if (err.status !== 401) setActionError(describeApiError(err));
		} finally {
			setBusy('');
		}
	};

	const generate = event => {
		event.preventDefault();
		if (!password) { setPasswordError('Escribe tu contraseña.'); return; }
		setPasswordError('');
		run('enlace', async () => {
			try {
				const created = await crearEnlaceMiTelegram(password);
				setCopied(false);
				setPassword('');
				setAsking(false);
				setEnlace(created);
			} catch (err) {
				if (/contraseña actual no es correcta/i.test(err.message || '')) { setPasswordError('La contraseña no es correcta.'); return; }
				throw err;
			}
		});
	};

	// Generar otro reemplaza el código en el backend: el anterior deja de servir.
	const regenerate = async () => {
		if (!(await confirm({
			title: '¿Generar otro enlace?',
			message: 'El enlace anterior dejará de funcionar. Te pediremos tu contraseña otra vez.',
			confirmLabel: 'Generar otro',
		}))) return;
		setEnlace(null);
		setAsking(true);
	};

	const copy = async () => {
		const ok = await copyText(url);
		setCopied(ok);
		if (!ok) setActionError(NO_SE_PUDO_COPIAR);
	};

	const unlink = async () => {
		if (!(await confirm({
			title: '¿Desvincular tu Telegram?',
			message: 'Ya no podrás recuperar tu contraseña con Telegram hasta que lo vuelvas a vincular.',
			confirmLabel: 'Desvincular',
			danger: true,
		}))) return;
		run('desvincular', async () => {
			await desvincularMiTelegram();
			setData({ vinculado: false, vinculado_en: null });
			notify('Telegram desvinculado.');
		});
	};

	let body;
	if (!data) {
		body = error ? <LoadError message={describeApiError(error)} onRetry={reload} /> : loading && <Loading />;
	} else if (linked) {
		body = (
			<>
				<p><span className="dot dot--green" aria-hidden="true" /> Vinculado{data.vinculado_en ? ` desde el ${formatDateTime(data.vinculado_en)}` : ''}.</p>
				<p className="muted">Si olvidas tu contraseña, el bot te mandará un código.</p>
				<div className="button-row">
					<button type="button" className="button button--danger-outline button--small" disabled={busy === 'desvincular'} onClick={unlink}>
						{busy === 'desvincular' ? 'Desvinculando…' : 'Desvincular'}
					</button>
				</div>
			</>
		);
	} else {
		body = (
			<>
				<p className="muted">Vincúlalo para recuperar tu contraseña si la olvidas.</p>
				{url ? (
					<div className="link-box">
						<p>Ábrelo en tu celular o escanea el QR, y toca <strong>Iniciar</strong> en Telegram.</p>
						{qr && <img className="qr-card__image" src={qr} alt="Código QR del enlace para vincular tu Telegram" width="200" height="200" />}
						<div className="button-row">
							<a className="button button--primary button--small" href={url} target="_blank" rel="noopener noreferrer">Abrir Telegram</a>
							<button type="button" className="button button--secondary button--small" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar enlace'}</button>
							<button type="button" className="button button--secondary button--small" onClick={regenerate} disabled={busy === 'enlace'}>Generar otro</button>
						</div>
						<p className="field__hint">
							Sirve una sola vez y vence {enlace.expira ? `a las ${hhmm(enlace.expira)}` : `en ${LINK_MINUTES} minutos`}.
						</p>
						<p className="muted" role="status">Esperando a que toques "Iniciar" en Telegram…</p>
					</div>
				) : asking ? (
					<form className="form" onSubmit={generate} noValidate>
						<input type="email" autoComplete="username" value={user?.email || ''} readOnly hidden />
						<PasswordField label="Confirma tu contraseña" value={password} maxLength={100} autoComplete="current-password"
							error={passwordError} onChange={event => setPassword(event.target.value)} />
						<div className="button-row">
							<button type="submit" className="button button--primary button--small" disabled={busy === 'enlace'}>
								{busy === 'enlace' ? 'Generando…' : 'Generar enlace'}
							</button>
							<button type="button" className="button button--secondary button--small" onClick={() => { setAsking(false); setPassword(''); setPasswordError(''); }}>Cancelar</button>
						</div>
					</form>
				) : (
					<div className="button-row">
						<button type="button" className="button button--primary button--small" onClick={() => setAsking(true)}>Vincular</button>
					</div>
				)}
			</>
		);
	}

	return (
		<section className="card form" aria-labelledby="mi-telegram-title">
			<h2 className="card__title" id="mi-telegram-title">Telegram</h2>
			{body}
			{actionError && <p className="form__error" role="alert">{actionError}</p>}
		</section>
	);
}

// No hay GET de una sola cuenta: se busca en la lista.
const loadCuenta = async id => {
	const cuenta = (await listUsuarios()).find(item => item.id === id);
	if (!cuenta) throw Object.assign(new Error('Cuenta no encontrada'), { kind: 'http', status: 404, message: 'Cuenta no encontrada' });
	return cuenta;
};

function CuentaDetalle({ id }) {
	const { user } = usePanel();
	const { data: cuenta, error, loading, reload, setData } = useAsync(() => loadCuenta(id), [id]);
	const back = toHash('cuentas');

	if (!cuenta) {
		return (
			<PanelPage title="Cuenta" back={back} backLabel="Cuentas">
				{error ? <LoadError message={describeApiError(error)} onRetry={error.status === 404 ? null : reload} /> : loading && <Loading />}
			</PanelPage>
		);
	}
	if (cuenta.id === user?.id || cuenta.rol === 'directora') {
		return (
			<PanelPage title={cuenta.nombre} back={back} backLabel="Cuentas">
				<p className="card muted">Las cuentas de directora no se editan desde el panel.</p>
			</PanelPage>
		);
	}

	return (
		<PanelPage title={cuenta.nombre} eyebrow="Personal de entrada" back={back} backLabel="Cuentas" wide>
			<div className="columns">
				<div className="stack">
					<section className="card" aria-labelledby="datos-cuenta">
						<h2 className="card__title" id="datos-cuenta">Datos</h2>
						<dl className="facts">
							<div><dt>Correo</dt><dd>{cuenta.email}</dd></div>
							<div><dt>Creada</dt><dd>{formatDateTime(cuenta.creado_en)}</dd></div>
							<div><dt>Contraseña cambiada</dt><dd>{cuenta.password_cambiado_en ? formatDateTime(cuenta.password_cambiado_en) : 'Nunca'}</dd></div>
						</dl>
					</section>
					<EstadoCuenta cuenta={cuenta} onSaved={activo => setData(current => ({ ...current, activo }))} />
				</div>
				<RestablecerCard cuenta={cuenta} />
			</div>
		</PanelPage>
	);
}

function EstadoCuenta({ cuenta, onSaved }) {
	const { notify } = usePanel();
	const confirm = useConfirm();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const active = isActiva(cuenta);

	const change = async next => {
		if (!next && !(await confirm({
			title: `¿Desactivar la cuenta de ${cuenta.nombre}?`,
			message: 'Su sesión se cierra al momento y ya no podrá entrar al escáner. Puedes volver a activarla cuando quieras.',
			confirmLabel: 'Desactivar',
			danger: true,
		}))) return;
		setBusy(true);
		setError('');
		try {
			await setEstadoUsuario(cuenta.id, next);
			onSaved(next);
			notify(next ? 'Cuenta activada. Ya puede iniciar sesión.' : 'Cuenta desactivada.');
		} catch (err) {
			if (err.status !== 401) setError(describeApiError(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="estado-cuenta">
			<h2 className="card__title" id="estado-cuenta">Estado</h2>
			<Switch label={active ? 'Activa' : 'Desactivada'} checked={active} disabled={busy} onChange={change}
				description={active ? 'Puede iniciar sesión y escanear.' : 'No puede iniciar sesión.'} />
			{error && <p className="form__error" role="alert">{error}</p>}
		</section>
	);
}

function RestablecerCard({ cuenta }) {
	const { notify } = usePanel();
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	const submit = async event => {
		event.preventDefault();
		const problem = validatePassword(password);
		setError(problem || '');
		setMessage('');
		if (problem) return;
		setBusy(true);
		try {
			await restablecerPassword(cuenta.id, password);
			setPassword('');
			notify(`Contraseña restablecida. Compártela con ${cuenta.nombre}; sus sesiones abiertas se cerraron.`);
		} catch (err) {
			if (err.status === 401) return;
			setError(fieldErrors(err).password || '');
			setMessage(describeApiError(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="restablecer-title">
			<h2 className="card__title" id="restablecer-title">Restablecer contraseña</h2>
			<form className="form" onSubmit={submit} noValidate>
				<p className="muted">Escribe una nueva y compártela con la persona; se cerrarán sus sesiones.</p>
				<PasswordField label="Contraseña nueva" value={password} maxLength={100} autoComplete="new-password"
					hint={PASSWORD_HINT} error={error} onChange={event => setPassword(event.target.value)} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Guardando…' : 'Restablecer'}</button>
			</form>
		</section>
	);
}

function MiCuenta() {
	const { go, user } = usePanel();
	const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const set = key => event => setForm({ ...form, [key]: event.target.value });

	const submit = async event => {
		event.preventDefault();
		const local = validateCambioPassword(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy(true);
		try {
			const data = await cambiarPassword(form.actual, form.nueva);
			// El token anterior deja de servir: se guarda el nuevo para seguir con la sesión.
			session.save(data.accessToken, data.user);
			go(toHash('cuentas'), PASSWORD_CAMBIADA);
		} catch (error) {
			if (error.status === 401) return;
			const fields = fieldErrors(error, { password_actual: 'actual', password_nueva: 'nueva' });
			if (/contraseña actual no es correcta/i.test(error.message)) fields.actual = 'La contraseña actual no es correcta.';
			setErrors(fields);
			setMessage(fields.actual && Object.keys(fields).length === 1 ? '' : describeApiError(error));
			setBusy(false);
		}
	};

	return (
		<PanelPage title="Cambiar mi contraseña" eyebrow={user?.email} back={toHash('cuentas')} backLabel="Cuentas">
			<form className="card form" onSubmit={submit} noValidate>
				<input type="text" autoComplete="username" value={user?.email || ''} readOnly hidden />
				<PasswordField label="Contraseña actual" value={form.actual} autoComplete="current-password" error={errors.actual} onChange={set('actual')} />
				<PasswordField label="Contraseña nueva" value={form.nueva} maxLength={100} autoComplete="new-password" hint={PASSWORD_HINT}
					error={errors.nueva} onChange={set('nueva')} />
				<PasswordField label="Repite la contraseña nueva" value={form.confirmar} maxLength={100} autoComplete="new-password"
					error={errors.confirmar} onChange={set('confirmar')} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
			</form>
		</PanelPage>
	);
}
