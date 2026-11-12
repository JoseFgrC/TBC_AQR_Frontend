import { useRef, useState } from 'react';
import {
	actualizarConfiguracion, eliminarDiaEspecial, getHorarios, guardarDiaEspecial, guardarSemana, listDiasEspeciales,
} from '../api/endpoints.js';
import { useConfirm } from '../components/Dialog.jsx';
import { Switch, TextField } from '../components/Field.jsx';
import { BackIcon, ChevronIcon, PlusIcon } from '../components/icons.jsx';
import { describeApiError, fieldErrors } from '../lib/apiErrors.js';
import { formatLongDate, isoDate } from '../lib/format.js';
import {
	configChanges, DIAS, dayStatus, daysInMonth, diaFromField, monthGrid, semanaChanges, semanaToForm, shiftMonth, toIso,
	validateDiaEspecial, validateSemana, validateTolerancia,
} from '../lib/horarios.js';
import { toHash } from '../lib/route.js';
import { navigate } from '../lib/useHashRoute.js';
import { useAsync } from '../lib/useAsync.js';
import { usePanel } from './context.js';
import PanelPage, { LoadError, Loading } from './PanelPage.jsx';
import { SIN_DIAS_ESPECIALES } from '../lib/textos.js';

export default function Horarios({ params }) {
	const [first, second] = params;
	if (first === 'dias') {
		if (second === 'nuevo') return <DiaEspecialForm key="nuevo" />;
		if (/^\d{4}-\d{2}-\d{2}$/.test(second || '')) return <DiaEspecialForm key={second} fecha={second} />;
		return <DiasEspeciales />;
	}
	return <HorarioSemanal />;
}

const TIPO_LABEL = { sin_clases: 'Sin clases', horario_especial: 'Horario distinto' };
const describeEspecial = dia => (dia.tipo === 'horario_especial' ? `Clases de ${dia.hora_entrada} a ${dia.hora_salida}` : 'Sin clases');

// ---------- Semana y reglas ----------
function HorarioSemanal() {
	const { data, error, loading, reload, setData } = useAsync(getHorarios, []);
	const proximos = useAsync(() => listDiasEspeciales({ desde: isoDate() }), []);

	return (
		<PanelPage title="Horarios" wide>
			{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
			{loading && !data && <Loading />}
			{data && (
				<div className="columns">
					<SemanaCard key={JSON.stringify(data.semana)} semana={data.semana} onSaved={semana => setData(current => ({ ...current, semana }))} />
					<div className="stack">
						<ReglasCard key={JSON.stringify(data.configuracion)} configuracion={data.configuracion}
							onSaved={configuracion => setData(current => ({ ...current, configuracion }))} />
						<section className="card" aria-labelledby="especiales-title">
							<h2 className="card__title" id="especiales-title">Días especiales</h2>
							<p className="muted card__lead">Festivos, suspensiones y horarios distintos.</p>
							{proximos.data?.length ? (
								<ul className="list list--plain">
									{proximos.data.slice(0, 4).map(dia => (
										<li key={dia.fecha}>
											<a className="row" href={toHash('horarios', 'dias', dia.fecha)}>
												<span className="row__text">
													<span className="row__title">{formatLongDate(dia.fecha)}</span>
													<span className="row__meta">{describeEspecial(dia)}{dia.descripcion ? ` · ${dia.descripcion}` : ''}</span>
												</span>
												<span className="row__chevron"><ChevronIcon /></span>
											</a>
										</li>
									))}
								</ul>
							) : proximos.data && <p className="muted">{SIN_DIAS_ESPECIALES}</p>}
							{proximos.error && <p className="form__error" role="alert">{describeApiError(proximos.error)}</p>}
							<div className="button-row">
								<a className="button button--secondary button--small" href={toHash('horarios', 'dias')}>Ver calendario</a>
								<a className="button button--secondary button--small" href={toHash('horarios', 'dias', 'nuevo')}><PlusIcon />Agregar día</a>
							</div>
						</section>
					</div>
				</div>
			)}
		</PanelPage>
	);
}

function SemanaCard({ semana, onSaved }) {
	const { notify } = usePanel();
	const original = useRef(semanaToForm(semana)).current;
	const [form, setForm] = useState(original);
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const changes = semanaChanges(original, form);
	const dirty = Object.keys(changes).length > 0;

	const set = (dia, patch) => setForm(current => ({ ...current, [dia]: { ...current[dia], ...patch } }));

	const submit = async event => {
		event.preventDefault();
		const local = validateSemana(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length || !dirty) {
			if (Object.keys(local).length) setMessage('Revisa los días marcados.');
			return;
		}
		setBusy(true);
		try {
			const saved = await guardarSemana(changes);
			onSaved(saved.semana); // la tarjeta se vuelve a montar con lo guardado
			notify('Horario de la semana guardado.');
		} catch (error) {
			if (error.status === 401) return;
			const byDay = {};
			for (const detail of error.details || []) byDay[diaFromField(detail.field)] ??= Object.values(fieldErrors({ details: [detail] }))[0];
			setErrors(byDay);
			setMessage(describeApiError(error));
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="semana-title">
			<h2 className="card__title" id="semana-title">Semana</h2>
			<form className="form" onSubmit={submit} noValidate>
				<ul className="list list--plain">
					{DIAS.map(({ id, label }) => {
						const dia = form[id];
						return (
							<li key={id} className="day-row">
								<Switch label={label} checked={dia.on}
									description={dia.on ? (dia.entrada && dia.salida ? `De ${dia.entrada} a ${dia.salida}` : 'Con clases') : 'Sin clases'}
									onChange={on => set(id, on && !dia.entrada ? { on, entrada: '13:00', salida: '18:00' } : { on })} />
								{dia.on && (
									<div className="form-grid">
										<TextField label={`Entrada ${label.toLowerCase()}`} type="time" value={dia.entrada}
											onChange={event => set(id, { entrada: event.target.value })} aria-invalid={errors[id] ? true : undefined} />
										<TextField label={`Salida ${label.toLowerCase()}`} type="time" value={dia.salida}
											onChange={event => set(id, { salida: event.target.value })} aria-invalid={errors[id] ? true : undefined} />
									</div>
								)}
								{errors[id] && <p className="field__error">{errors[id]}</p>}
							</li>
						);
					})}
				</ul>
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar'}</button>
			</form>
		</section>
	);
}

function ReglasCard({ configuracion, onSaved }) {
	const { notify } = usePanel();
	const [form, setForm] = useState({ ...configuracion, tolerancia_minutos: String(configuracion.tolerancia_minutos ?? '') });
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const toleranciaError = validateTolerancia(form.tolerancia_minutos);
	const changes = toleranciaError ? {} : configChanges(configuracion, form);
	const dirty = toleranciaError ? String(configuracion.tolerancia_minutos) !== form.tolerancia_minutos : Object.keys(changes).length > 0;

	const submit = async event => {
		event.preventDefault();
		setError(toleranciaError || '');
		setMessage('');
		if (toleranciaError || !dirty) return;
		setBusy(true);
		try {
			onSaved(await actualizarConfiguracion(changes));
			notify('Reglas guardadas.');
		} catch (err) {
			if (err.status === 401) return;
			setError(fieldErrors(err).tolerancia_minutos || '');
			setMessage(describeApiError(err));
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="reglas-title">
			<h2 className="card__title" id="reglas-title">Reglas</h2>
			<form className="form" onSubmit={submit} noValidate>
				<TextField label="Tolerancia de entrada (minutos)" type="number" inputMode="numeric" min="0" max="240" step="1"
					value={form.tolerancia_minutos} error={error}
					hint={`Pasados ${toleranciaError ? 'esos' : Number(form.tolerancia_minutos)} minutos de la entrada, cuenta como retardo.`}
					onChange={event => setForm({ ...form, tolerancia_minutos: event.target.value })} />
				<Switch label="Consejo Técnico el último viernes" checked={form.consejo_tecnico_ultimo_viernes}
					description="El último viernes de cada mes no hay clases."
					onChange={value => setForm({ ...form, consejo_tecnico_ultimo_viernes: value })} />
				<Switch label='Aviso de "no llegó"' checked={form.aviso_no_llego}
					description="Al pasar la tolerancia, avisa por Telegram a los tutores de quien no ha entrado."
					onChange={value => setForm({ ...form, aviso_no_llego: value })} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar'}</button>
			</form>
		</section>
	);
}

// ---------- Días especiales ----------
const MONTH = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthLabel = ({ year, month }) => {
	const text = MONTH.format(new Date(Date.UTC(year, month - 1, 1)));
	return text.charAt(0).toUpperCase() + text.slice(1); // "Octubre de 2026"
};
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const STATUS_TEXT = {
	sin_clases: 'sin clases',
	horario_especial: 'horario distinto',
	consejo: 'Consejo Técnico',
	clases: 'clases normales',
	sin_horario: 'sin clases (fin de semana o día sin horario)',
};

const now = new Date();
let savedMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };

const loadMes = async ({ year, month }) => {
	const desde = toIso(year, month, 1);
	const hasta = toIso(year, month, daysInMonth(year, month));
	const [especiales, horarios, todos] = await Promise.all([
		listDiasEspeciales({ desde, hasta }), getHorarios(), listDiasEspeciales({ desde: isoDate() }),
	]);
	return { especiales, semana: horarios.semana, configuracion: horarios.configuracion, proximos: todos };
};

function DiasEspeciales() {
	const [month, setMonth] = useState(savedMonth);
	const { data, error, loading, reload } = useAsync(() => loadMes(month), [month.year, month.month]);
	const change = delta => { savedMonth = shiftMonth(month, delta); setMonth(savedMonth); };
	const today = isoDate();

	return (
		<PanelPage title="Días especiales" back={toHash('horarios')} backLabel="Horarios" wide
			actions={<a className="button button--primary button--small" href={toHash('horarios', 'dias', 'nuevo')}><PlusIcon />Agregar día</a>}>
			{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
			<div className="columns columns--calendar">
				<section className="card calendar" aria-labelledby="calendar-title">
					<div className="calendar__header">
						<button type="button" className="button button--plain calendar__nav" onClick={() => change(-1)} aria-label="Mes anterior"><BackIcon /></button>
						<h2 className="card__title calendar__title" id="calendar-title" aria-live="polite">{monthLabel(month)}</h2>
						<button type="button" className="button button--plain calendar__nav calendar__nav--next" onClick={() => change(1)} aria-label="Mes siguiente"><BackIcon /></button>
					</div>
					<table className="calendar__grid" aria-labelledby="calendar-title">
						<thead>
							<tr>{WEEKDAYS.map((day, index) => <th key={index} scope="col"><abbr title={WEEKDAY_NAMES[index]}>{day}</abbr></th>)}</tr>
						</thead>
						<tbody>
							{monthGrid(month.year, month.month).map((week, index) => (
								<tr key={index}>
									{week.map((iso, column) => {
										if (!iso) return <td key={column} />;
										const status = data ? dayStatus(iso, data) : { kind: 'clases' };
										return (
											<td key={iso}>
												<button type="button" className={`calendar__day calendar__day--${status.kind} ${iso === today ? 'is-today' : ''}`}
													aria-label={`${formatLongDate(iso)}: ${STATUS_TEXT[status.kind]}${status.especial?.descripcion ? `, ${status.especial.descripcion}` : ''}${iso === today ? ' (hoy)' : ''}`}
													onClick={() => navigate(toHash('horarios', 'dias', iso))}>
													{Number(iso.slice(8))}
												</button>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
					<ul className="legend">
						<li><span className="legend__swatch calendar__day--sin_clases" aria-hidden="true" />Sin clases</li>
						<li><span className="legend__swatch calendar__day--horario_especial" aria-hidden="true" />Horario distinto</li>
						<li><span className="legend__swatch calendar__day--consejo" aria-hidden="true" />Consejo Técnico (regla)</li>
						<li><span className="legend__swatch calendar__day--sin_horario" aria-hidden="true" />Sin horario semanal</li>
					</ul>
					<p className="field__hint">Toca un día para cambiarlo.</p>
				</section>

				<section className="stack" aria-labelledby="lista-title">
					<h2 className="section-title" id="lista-title">Próximos días especiales</h2>
					{loading && !data && <Loading />}
					{data && (data.proximos.length ? (
						<ul className="card list">
							{data.proximos.map(dia => (
								<li key={dia.fecha}>
									<a className="row" href={toHash('horarios', 'dias', dia.fecha)}>
										<span className="row__text">
											<span className="row__title">{formatLongDate(dia.fecha)}</span>
											<span className="row__meta">
												<span className={`dot ${dia.tipo === 'sin_clases' ? 'dot--orange' : 'dot--blue'}`} aria-hidden="true" />
												<span>{describeEspecial(dia)}{dia.descripcion ? ` · ${dia.descripcion}` : ''}</span>
											</span>
										</span>
										<span className="row__chevron"><ChevronIcon /></span>
									</a>
								</li>
							))}
						</ul>
					) : <p className="card muted">{SIN_DIAS_ESPECIALES}</p>)}
				</section>
			</div>
		</PanelPage>
	);
}

function TipoSelector({ value, onChange }) {
	const options = Object.entries(TIPO_LABEL);
	const move = (event, index) => {
		if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
		event.preventDefault();
		const next = options[(index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length][0];
		onChange(next);
		event.currentTarget.parentElement.querySelector(`[data-value="${next}"]`)?.focus();
	};
	return (
		<div className="field">
			<span className="field__label" id="tipo-label">Qué pasa ese día</span>
			<div className="segmented" role="radiogroup" aria-labelledby="tipo-label">
				{options.map(([key, label], index) => (
					<button key={key} type="button" role="radio" data-value={key} aria-checked={value === key} tabIndex={value === key ? 0 : -1}
						className="segmented__option" onClick={() => onChange(key)} onKeyDown={event => move(event, index)}>
						{label}
					</button>
				))}
			</div>
		</div>
	);
}

const loadDia = async fecha => {
	if (!fecha) return null;
	const [existente] = await listDiasEspeciales({ desde: fecha, hasta: fecha });
	return existente || null;
};

function DiaEspecialForm({ fecha: fechaRuta }) {
	const { go } = usePanel();
	const confirm = useConfirm();
	const { data: existente, error: loadError, loading, reload } = useAsync(() => loadDia(fechaRuta), [fechaRuta]);
	const back = toHash('horarios', 'dias');

	if (fechaRuta && loading && existente === null && !loadError) {
		return <PanelPage title={formatLongDate(fechaRuta)} back={back} backLabel="Días especiales"><Loading /></PanelPage>;
	}
	if (loadError) {
		return <PanelPage title={formatLongDate(fechaRuta)} back={back} backLabel="Días especiales"><LoadError message={describeApiError(loadError)} onRetry={reload} /></PanelPage>;
	}
	return <DiaEspecialEditor fechaRuta={fechaRuta} existente={existente} back={back} go={go} confirm={confirm} />;
}

function DiaEspecialEditor({ fechaRuta, existente, back, go, confirm }) {
	const [form, setForm] = useState({
		fecha: fechaRuta || '',
		tipo: existente?.tipo || 'sin_clases',
		hora_entrada: existente?.hora_entrada || '',
		hora_salida: existente?.hora_salida || '',
		descripcion: existente?.descripcion || '',
	});
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState('');

	const submit = async event => {
		event.preventDefault();
		const local = validateDiaEspecial(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy('guardar');
		try {
			const resultado = await guardarDiaEspecial(form.fecha, { ...form, descripcion: form.descripcion.trim() });
			const queda = resultado?.hay_clases
				? `ese día hay clases de ${resultado.hora_entrada} a ${resultado.hora_salida}`
				: 'ese día no hay clases';
			go(back, `Guardado: ${formatLongDate(form.fecha)}, ${queda}.`);
		} catch (error) {
			if (error.status === 401) return;
			setErrors(fieldErrors(error));
			setMessage(describeApiError(error));
			setBusy('');
		}
	};

	const remove = async () => {
		if (!(await confirm({
			title: '¿Eliminar este día especial?',
			message: `${formatLongDate(form.fecha)} volverá a seguir el horario de la semana y las reglas generales.`,
			confirmLabel: 'Eliminar',
			danger: true,
		}))) return;
		setBusy('eliminar');
		setMessage('');
		try {
			const resultado = await eliminarDiaEspecial(form.fecha);
			const queda = resultado?.hay_clases
				? `vuelve a tener clases de ${resultado.hora_entrada} a ${resultado.hora_salida}`
				: `queda sin clases${resultado?.motivo ? ` (${resultado.motivo})` : ''}`;
			go(back, `Día especial eliminado: ${formatLongDate(form.fecha)} ${queda}.`);
		} catch (error) {
			if (error.status !== 401) setMessage(describeApiError(error));
			setBusy('');
		}
	};

	return (
		<PanelPage title={fechaRuta ? formatLongDate(fechaRuta) : 'Agregar día especial'} eyebrow={existente ? 'Día especial registrado' : fechaRuta ? 'Nuevo día especial' : undefined}
			back={back} backLabel="Días especiales">
			<form className="card form" onSubmit={submit} noValidate>
				{!fechaRuta && (
					<TextField label="Fecha" type="date" value={form.fecha} required error={errors.fecha}
						onChange={event => setForm({ ...form, fecha: event.target.value })} />
				)}
				<TipoSelector value={form.tipo} onChange={tipo => setForm({ ...form, tipo })} />
				{form.tipo === 'horario_especial' && (
					<>
						<p className="muted">También sirve para dar clases un día que normalmente no hay.</p>
						<div className="form-grid">
							<TextField label="Hora de entrada" type="time" value={form.hora_entrada} required error={errors.hora_entrada}
								onChange={event => setForm({ ...form, hora_entrada: event.target.value })} />
							<TextField label="Hora de salida" type="time" value={form.hora_salida} required error={errors.hora_salida}
								onChange={event => setForm({ ...form, hora_salida: event.target.value })} />
						</div>
					</>
				)}
				<TextField label="Descripción (opcional)" value={form.descripcion} maxLength={150} autoComplete="off"
					placeholder={form.tipo === 'sin_clases' ? 'Día de la Revolución' : 'Festival de otoño'} error={errors.descripcion}
					onChange={event => setForm({ ...form, descripcion: event.target.value })} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={Boolean(busy)}>{busy === 'guardar' ? 'Guardando…' : 'Guardar'}</button>
				{existente && (
					<button type="button" className="button button--danger-outline" disabled={Boolean(busy)} onClick={remove}>
						{busy === 'eliminar' ? 'Eliminando…' : 'Eliminar día especial'}
					</button>
				)}
			</form>
		</PanelPage>
	);
}
