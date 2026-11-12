import { useState } from 'react';
import {
	createPadre, crearEnlaceTelegram, desvincularTelegram, getPadre, listPadres, setNotificacionesPadre, vincularTelegram,
} from '../api/endpoints.js';
import { safeImageDataUrl } from '../api/client.js';
import { useConfirm } from '../components/Dialog.jsx';
import { SelectField, Switch, TextField } from '../components/Field.jsx';
import { ChevronIcon, PlusIcon } from '../components/icons.jsx';
import { describeApiError, fieldErrors } from '../lib/apiErrors.js';
import { copyText } from '../lib/clipboard.js';
import { formatDateTime } from '../lib/format.js';
import { toHash } from '../lib/route.js';
import { filterPadres, telegramStatus, validateChatId, validatePadre } from '../lib/tutores.js';
import { useAsync } from '../lib/useAsync.js';
import { usePanel } from './context.js';
import PanelPage, { LoadError, Loading } from './PanelPage.jsx';
import { NO_SE_PUDO_COPIAR } from '../lib/textos.js';

let savedFilters = { search: '', telegram: '' };

export default function Tutores({ params }) {
	const [first] = params;
	if (first === 'nuevo') return <NuevoTutor />;
	if (/^\d+$/.test(first || '')) return <TutorDetalle key={first} id={first} />;
	return <ListaTutores />;
}

const alumnosLabel = total => {
	const n = Number(total) || 0;
	return n ? `${n} ${n === 1 ? 'alumno' : 'alumnos'}` : 'Sin alumnos asignados';
};

function ListaTutores() {
	const { data, error, loading, reload } = useAsync(listPadres, []);
	const [filters, setFilters] = useState(savedFilters);
	const update = key => event => { savedFilters = { ...filters, [key]: event.target.value }; setFilters(savedFilters); };
	const padres = filterPadres(data, filters);

	return (
		<PanelPage title="Tutores" wide
			actions={<a className="button button--primary button--small" href={toHash('tutores', 'nuevo')}><PlusIcon />Nuevo tutor</a>}>
			<div className="card filters" role="search">
				<TextField label="Buscar" type="search" value={filters.search} onChange={update('search')}
					placeholder="Nombre o teléfono" autoComplete="off" className="filters__search" />
				<SelectField label="Telegram" value={filters.telegram} onChange={update('telegram')}>
					<option value="">Todos</option>
					<option value="activo">Recibe avisos</option>
					<option value="pausado">Avisos pausados</option>
					<option value="sin">Sin Telegram</option>
				</SelectField>
			</div>
			{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
			{loading && !data && <Loading />}
			{data && (
				<>
					<p className="muted" aria-live="polite">{padres.length} {padres.length === 1 ? 'tutor' : 'tutores'}</p>
					{padres.length ? (
						<ul className="card list">
							{padres.map(padre => {
								const status = telegramStatus(padre);
								return (
									<li key={padre.id}>
										<a className="row" href={toHash('tutores', padre.id)}>
											<span className="row__text">
												<span className="row__title">{padre.nombre}</span>
												<span className="row__meta">
													<span className={`dot dot--${status.kind === 'activo' ? 'green' : status.kind === 'pausado' ? 'orange' : 'yellow'}`} aria-hidden="true" />
													<span>{status.label} · {alumnosLabel(padre.total_alumnos)}{padre.telefono ? ` · ${padre.telefono}` : ''}</span>
												</span>
											</span>
											<span className="row__chevron"><ChevronIcon /></span>
										</a>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="card muted">{data.length ? 'No hay tutores con esos filtros.' : 'Aún no hay tutores.'}</p>
					)}
				</>
			)}
		</PanelPage>
	);
}

function NuevoTutor() {
	const { go } = usePanel();
	const [form, setForm] = useState({ nombre: '', telefono: '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	const submit = async event => {
		event.preventDefault();
		const local = validatePadre(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy(true);
		try {
			const created = await createPadre({ nombre: form.nombre.trim(), telefono: form.telefono.trim() });
			go(toHash('tutores', created.id), 'Tutor creado; ahora genera su enlace de Telegram.');
		} catch (error) {
			if (error.status === 401) return;
			setErrors(fieldErrors(error));
			setMessage(describeApiError(error));
			setBusy(false);
		}
	};

	return (
		<PanelPage title="Nuevo tutor" back={toHash('tutores')} backLabel="Tutores">
			<form className="card form" onSubmit={submit} noValidate>
				<TextField label="Nombre completo" value={form.nombre} maxLength={150} autoComplete="off" required error={errors.nombre}
					onChange={event => setForm({ ...form, nombre: event.target.value })} />
				<TextField label="Teléfono (opcional)" type="tel" inputMode="tel" value={form.telefono} maxLength={20} autoComplete="off"
					error={errors.telefono} onChange={event => setForm({ ...form, telefono: event.target.value })} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Creando…' : 'Crear'}</button>
			</form>
		</PanelPage>
	);
}

function TutorDetalle({ id }) {
	const { data: padre, error, loading, reload, setData } = useAsync(() => getPadre(id), [id]);

	if (!padre) {
		return (
			<PanelPage title="Tutor" back={toHash('tutores')} backLabel="Tutores">
				{error ? <LoadError message={describeApiError(error)} onRetry={error.status === 404 ? null : reload} /> : loading && <Loading />}
			</PanelPage>
		);
	}

	return (
		<PanelPage title={padre.nombre} eyebrow={padre.telefono ? `Tutor · ${padre.telefono}` : 'Tutor'} back={toHash('tutores')} backLabel="Tutores" wide>
			<div className="columns">
				<div className="stack">
					<TelegramCard padre={padre} onChanged={changes => setData(current => ({ ...current, ...changes }))} />
				</div>
				<div className="stack">
					<AvisosCard padre={padre} onChanged={changes => setData(current => ({ ...current, ...changes }))} />
					<AlumnosDelTutor padre={padre} />
				</div>
			</div>
		</PanelPage>
	);
}

function AvisosCard({ padre, onChanged }) {
	const { notify } = usePanel();
	const confirm = useConfirm();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const active = Boolean(Number(padre.notificaciones_activas));
	const linked = Boolean(Number(padre.telegram_vinculado));

	const change = async next => {
		if (!next && !(await confirm({
			title: '¿Pausar los avisos?',
			message: `${padre.nombre} dejará de recibir avisos hasta que los vuelvas a activar.`,
			confirmLabel: 'Pausar avisos',
			danger: true,
		}))) return;
		setBusy(true);
		setError('');
		try {
			await setNotificacionesPadre(padre.id, next);
			onChanged({ notificaciones_activas: next ? 1 : 0 });
			notify(next ? 'Avisos activados.' : 'Avisos pausados.');
		} catch (err) {
			if (err.status !== 401) setError(describeApiError(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="avisos-title">
			<h2 className="card__title" id="avisos-title">Avisos</h2>
			<Switch
				label={active ? 'Avisos activos' : 'Avisos pausados'}
				description={linked
					? (active ? 'Recibe entradas, salidas y "no llegó" por Telegram.' : 'No recibe mensajes.')
					: 'Se enviarán cuando vincule su Telegram.'}
				checked={active}
				disabled={busy}
				onChange={change}
			/>
			{error && <p className="form__error" role="alert">{error}</p>}
		</section>
	);
}

function TelegramCard({ padre, onChanged }) {
	const { notify } = usePanel();
	const confirm = useConfirm();
	const [enlace, setEnlace] = useState(null);
	const [copied, setCopied] = useState(false);
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');
	const [chatId, setChatId] = useState('');
	const [chatError, setChatError] = useState('');
	const [manual, setManual] = useState(false);
	const linked = Boolean(Number(padre.telegram_vinculado));
	const qr = safeImageDataUrl(enlace?.qrDataUrl);

	const run = async (kind, action) => {
		setBusy(kind);
		setError('');
		try {
			await action();
		} catch (err) {
			if (err.status !== 401) setError(describeApiError(err));
		} finally {
			setBusy('');
		}
	};

	// Generar otro reemplaza el código en el backend (createTelegramLink): el anterior deja de servir.
	const regenerate = async () => {
		if (!(await confirm({
			title: '¿Generar otro enlace?',
			message: 'El anterior dejará de funcionar; si ya lo enviaste, manda el nuevo.',
			confirmLabel: 'Generar otro',
		}))) return;
		generate();
	};

	const generate = () => run('enlace', async () => {
		setCopied(false);
		setEnlace(await crearEnlaceTelegram(padre.id));
	});

	const copy = async () => {
		const ok = await copyText(enlace.url);
		setCopied(ok);
		if (!ok) setError(NO_SE_PUDO_COPIAR);
	};

	const link = event => {
		event.preventDefault();
		const problem = validateChatId(chatId);
		setChatError(problem || '');
		if (problem) return;
		run('manual', async () => {
			try {
				await vincularTelegram(padre.id, chatId.trim());
			} catch (err) {
				if (err.status === 409) { setChatError('Ese chat ID ya está vinculado a otro tutor.'); return; }
				const fields = fieldErrors(err);
				if (fields.telegram_chat_id) { setChatError(fields.telegram_chat_id); return; }
				throw err;
			}
			onChanged({ telegram_vinculado: 1, telegram_chat_id: chatId.trim() });
			setChatId('');
			setEnlace(null);
			notify('Telegram vinculado.');
		});
	};

	const unlink = async () => {
		if (!(await confirm({
			title: '¿Desvincular Telegram?',
			message: `${padre.nombre} dejará de recibir avisos. Para volver a vincularlo necesitará un enlace nuevo.`,
			confirmLabel: 'Desvincular',
			danger: true,
		}))) return;
		run('desvincular', async () => {
			await desvincularTelegram(padre.id);
			onChanged({ telegram_vinculado: 0, telegram_chat_id: null });
			notify('Telegram desvinculado.');
		});
	};

	return (
		<section className="card form" aria-labelledby="telegram-title">
			<h2 className="card__title" id="telegram-title">Telegram</h2>
			{linked ? (
				<>
					<p><span className="dot dot--green" aria-hidden="true" /> Vinculado.</p>
					<div className="button-row">
						<button type="button" className="button button--danger-outline button--small" disabled={busy === 'desvincular'} onClick={unlink}>
							{busy === 'desvincular' ? 'Desvinculando…' : 'Desvincular'}
						</button>
					</div>
				</>
			) : (
				<>
					<p className="muted">Comparte el enlace con el tutor: lo abre, toca "Iniciar" y queda vinculado.</p>
					{enlace ? (
						<div className="link-box">
							<TextField label="Enlace de vinculación" value={enlace.url} readOnly onFocus={event => event.target.select()} />
							<div className="button-row">
								<button type="button" className="button button--primary button--small" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar enlace'}</button>
								<button type="button" className="button button--secondary button--small" onClick={regenerate} disabled={busy === 'enlace'}>Generar otro</button>
							</div>
							<p className="field__hint">Sirve una sola vez{enlace.expira ? ` y vence el ${formatDateTime(enlace.expira)}` : ''}.</p>
							{qr && <img className="qr-card__image" src={qr} alt="Código QR del enlace de Telegram, para escanearlo con el celular del tutor" width="200" height="200" />}
						</div>
					) : (
						<div className="button-row">
							<button type="button" className="button button--primary button--small" onClick={generate} disabled={busy === 'enlace'}>
								{busy === 'enlace' ? 'Generando…' : 'Generar enlace'}
							</button>
						</div>
					)}

					<div className="disclosure">
						<button type="button" className="button button--plain disclosure__toggle" aria-expanded={manual} aria-controls="vincular-manual"
							onClick={() => setManual(open => !open)}>
							{manual ? 'Ocultar vinculación manual' : 'Vincular a mano con el chat ID'}
						</button>
						{manual && (
							<form className="form" id="vincular-manual" onSubmit={link} noValidate>
								<TextField label="Chat ID de Telegram" value={chatId} maxLength={50} inputMode="numeric" autoComplete="off" error={chatError}
									onChange={event => setChatId(event.target.value)} />
								<button type="submit" className="button button--secondary" disabled={busy === 'manual'}>{busy === 'manual' ? 'Vinculando…' : 'Vincular'}</button>
							</form>
						)}
					</div>
				</>
			)}
			{error && <p className="form__error" role="alert">{error}</p>}
		</section>
	);
}

function AlumnosDelTutor({ padre }) {
	const alumnos = padre.alumnos || [];
	return (
		<section className="card" aria-labelledby="alumnos-tutor-title">
			<h2 className="card__title" id="alumnos-tutor-title">Alumnos</h2>
			{alumnos.length ? (
				<ul className="list list--plain">
					{alumnos.map(alumno => (
						<li key={alumno.id}>
							<a className="row" href={toHash('alumnos', alumno.id)}>
								<span className="row__text">
									<span className="row__title">{alumno.nombre}</span>
									<span className="row__meta">
										{[alumno.parentesco, alumno.grado ? `grado ${alumno.grado}` : null].filter(Boolean).join(' · ') || 'Sin parentesco'}
										{!Number(alumno.activo) && <span className="badge">Dado de baja</span>}
									</span>
								</span>
								<span className="row__chevron"><ChevronIcon /></span>
							</a>
						</li>
					))}
				</ul>
			) : (
				<p className="muted">Aún no tiene alumnos; asígnalo desde la página del alumno.</p>
			)}
		</section>
	);
}
