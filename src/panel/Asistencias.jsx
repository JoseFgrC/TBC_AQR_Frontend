import { useState } from 'react';
import { getHistorial, getReporte, listAllAlumnos } from '../api/endpoints.js';
import { SelectField, TextField } from '../components/Field.jsx';
import { gradosDe } from '../lib/alumnos.js';
import { describeApiError } from '../lib/apiErrors.js';
import { byGrado, groupByDay, parseFechas, porcentaje, resumenReporte, sortReporte, validateRango } from '../lib/asistencias.js';
import { addDays, formatDateTime, formatLongDate, isoDate } from '../lib/format.js';
import { describeRegistro, describeRegistroLinea } from '../lib/messages.js';
import { toHash } from '../lib/route.js';
import { useAsync } from '../lib/useAsync.js';
import PanelPage, { LoadError, Loading } from './PanelPage.jsx';

const TABS = [
	{ id: 'reporte', label: 'Retardos y faltas' },
	{ id: 'historial', label: 'Historial' },
];

export default function Asistencias({ params }) {
	const tab = params[0] === 'historial' ? 'historial' : 'reporte';
	const alumnos = useAsync(listAllAlumnos, []);
	return (
		<PanelPage title="Asistencias" wide>
			<nav className="segmented segmented--tabs" aria-label="Vista">
				{TABS.map(({ id, label }) => (
					<a key={id} href={toHash('asistencias', id)} className="segmented__option" aria-current={tab === id ? 'page' : undefined}>{label}</a>
				))}
			</nav>
			{tab === 'reporte' ? <Reporte alumnos={alumnos.data} /> : <Historial alumnos={alumnos.data} />}
		</PanelPage>
	);
}

// Los filtros de cada vista sobreviven al ir y volver entre secciones.
const today = isoDate();
const saved = {
	reporte: { desde: `${today.slice(0, 8)}01`, hasta: today, alumnoId: '', grado: '' },
	historial: { desde: addDays(today, -6), hasta: today, alumnoId: '', grado: '' },
};

function Filtros({ value, onApply, alumnos, maxDays, busy }) {
	const [draft, setDraft] = useState(value);
	const [errors, setErrors] = useState({});
	const set = key => event => setDraft({ ...draft, [key]: event.target.value });
	const grados = gradosDe(alumnos);
	const opciones = (alumnos || []).filter(alumno => !draft.grado || alumno.grado === draft.grado);

	const submit = event => {
		event.preventDefault();
		const local = validateRango(draft, { maxDays });
		setErrors(local);
		if (!Object.keys(local).length) onApply(draft);
	};

	return (
		<form className="card filters" onSubmit={submit} noValidate role="search">
			<TextField label="Desde" type="date" value={draft.desde} max={draft.hasta || undefined} error={errors.desde} onChange={set('desde')} />
			<TextField label="Hasta" type="date" value={draft.hasta} min={draft.desde || undefined} error={errors.hasta} onChange={set('hasta')} />
			<SelectField label="Grado" value={draft.grado} onChange={event => setDraft({ ...draft, grado: event.target.value, alumnoId: '' })}>
				<option value="">Todos</option>
				{grados.map(grado => <option key={grado} value={grado}>{grado}</option>)}
			</SelectField>
			<SelectField label="Alumno" value={draft.alumnoId} onChange={set('alumnoId')} disabled={!alumnos}>
				<option value="">{alumnos ? 'Todos' : 'Cargando…'}</option>
				{opciones.map(alumno => <option key={alumno.id} value={alumno.id}>{alumno.nombre}{alumno.grado ? ` (${alumno.grado})` : ''}</option>)}
			</SelectField>
			<button type="submit" className="button button--primary filters__submit" disabled={busy}>{busy ? 'Consultando…' : 'Consultar'}</button>
		</form>
	);
}

// ---------- Reporte ----------
function Reporte({ alumnos }) {
	const [filters, setFilters] = useState(saved.reporte);
	const [sort, setSort] = useState('faltas');
	const { data, error, loading, reload } = useAsync(
		() => getReporte({ desde: filters.desde, hasta: filters.hasta, alumnoId: filters.alumnoId }),
		[filters.desde, filters.hasta, filters.alumnoId],
	);
	const apply = next => { saved.reporte = next; setFilters(next); };
	const rows = sortReporte(byGrado(data?.alumnos, filters.grado), sort);
	const total = resumenReporte(rows);

	return (
		<>
			<Filtros value={filters} onApply={apply} alumnos={alumnos} maxDays={366} busy={loading} />
			<p className="muted">Cuenta solo días con clases, desde el alta de cada alumno.</p>
			{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
			{loading && !data && <Loading />}
			{data && (
				<>
					<section className="stats" aria-label="Resumen">
						<Stat label="Asistencia" value={total.porcentaje === null ? '—' : `${total.porcentaje} %`} />
						<Stat label="Faltas" value={total.faltas} detail={`${total.conFaltas} ${total.conFaltas === 1 ? 'alumno' : 'alumnos'}`} tone="orange" />
						<Stat label="Retardos" value={total.retardos} tone="yellow" />
						<Stat label="Salidas anticipadas" value={total.salidas_anticipadas} tone="blue" />
					</section>
					<div className="list-toolbar">
						<p className="muted" aria-live="polite">
							{formatLongDate(data.desde)} al {formatLongDate(data.hasta)} · {rows.length} {rows.length === 1 ? 'alumno' : 'alumnos'}
						</p>
						<SelectField label="Ordenar por" value={sort} onChange={event => setSort(event.target.value)} className="list-toolbar__sort">
							<option value="faltas">Más faltas</option>
							<option value="retardos">Más retardos</option>
							<option value="nombre">Nombre</option>
							<option value="grado">Grado</option>
						</SelectField>
					</div>
					{rows.length ? (
						<ul className="card list">
							{rows.map(alumno => <ReporteRow key={alumno.id} alumno={alumno} />)}
						</ul>
					) : <p className="card muted">No hay alumnos con esos filtros.</p>}
				</>
			)}
		</>
	);
}

function Stat({ label, value, detail, tone }) {
	return (
		<div className={`stat ${tone ? `stat--${tone}` : ''}`}>
			<span className="stat__label">{label}</span>
			<span className="stat__value">{value}</span>
			{detail && <span className="stat__detail">{detail}</span>}
		</div>
	);
}

const plural = (count, one, many) => `${Number(count) || 0} ${Number(count) === 1 ? one : many}`;

function ReporteRow({ alumno }) {
	const [open, setOpen] = useState(false);
	const fechas = parseFechas(alumno.fechas_falta);
	const pct = porcentaje(alumno.asistencias, alumno.dias_clase);
	const id = `faltas-${alumno.id}`;
	return (
		<li className="report-row">
			<div className="report-row__head">
				<span className="row__text">
					<a className="row__title row__link" href={toHash('alumnos', alumno.id)}>{alumno.nombre}</a>
					<span className="row__meta">
						{alumno.grado ? `Grado ${alumno.grado} · ` : ''}{plural(alumno.asistencias, 'asistencia', 'asistencias')} de {plural(alumno.dias_clase, 'día', 'días')}
						{pct !== null && ` (${pct} %)`}
					</span>
				</span>
			</div>
			<ul className="pills" aria-label="Detalle">
				<li className={`pill ${Number(alumno.faltas) ? 'pill--orange' : ''}`}>{plural(alumno.faltas, 'falta', 'faltas')}</li>
				<li className={`pill ${Number(alumno.retardos) ? 'pill--yellow' : ''}`}>{plural(alumno.retardos, 'retardo', 'retardos')}</li>
				<li className={`pill ${Number(alumno.salidas_anticipadas) ? 'pill--blue' : ''}`}>{plural(alumno.salidas_anticipadas, 'salida anticipada', 'salidas anticipadas')}</li>
			</ul>
			{fechas.length > 0 && (
				<>
					<button type="button" className="button button--plain button--small report-row__toggle" aria-expanded={open} aria-controls={id}
						onClick={() => setOpen(value => !value)}>
						{open ? 'Ocultar fechas de falta' : 'Ver fechas de falta'}
					</button>
					{open && (
						<ul className="report-row__dates" id={id}>
							{fechas.map(fecha => <li key={fecha}>{formatLongDate(fecha)}</li>)}
						</ul>
					)}
				</>
			)}
		</li>
	);
}

// ---------- Historial ----------
const PAGE = 150;

function Historial({ alumnos }) {
	const [filters, setFilters] = useState(saved.historial);
	const [shown, setShown] = useState(PAGE);
	const { data, error, loading, reload } = useAsync(
		() => getHistorial({ desde: filters.desde, hasta: filters.hasta, alumnoId: filters.alumnoId }),
		[filters.desde, filters.hasta, filters.alumnoId],
	);
	const apply = next => { saved.historial = next; setFilters(next); setShown(PAGE); };
	const rows = byGrado(data, filters.grado);
	const days = groupByDay(rows.slice(0, shown));

	return (
		<>
			<Filtros value={filters} onApply={apply} alumnos={alumnos} busy={loading} />
			{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
			{loading && !data && <Loading />}
			{data && (
				<>
					<p className="muted" aria-live="polite">
						{rows.length} {rows.length === 1 ? 'registro' : 'registros'}
						{filters.desde || filters.hasta ? ` del ${filters.desde ? formatDateTime(filters.desde) : 'inicio'} al ${filters.hasta ? formatDateTime(filters.hasta) : 'hoy'}` : ''}
					</p>
					{days.length ? days.map(day => (
						<section key={day.fecha} className="card" aria-labelledby={`dia-${day.fecha}`}>
							<h2 className="card__title day-title" id={`dia-${day.fecha}`}>
								<span>{formatLongDate(day.fecha)}</span>
								<span className="muted">
									{plural(day.entradas, 'entrada', 'entradas')}{day.retardos ? ` (${plural(day.retardos, 'retardo', 'retardos')})` : ''}
									{' · '}{plural(day.salidas, 'salida', 'salidas')}{day.anticipadas ? ` (${plural(day.anticipadas, 'anticipada', 'anticipadas')})` : ''}
								</span>
							</h2>
							<ul className="list list--plain">
								{day.items.map(item => (
									<li key={item.id} className="row row--static history-row">
										<span className="row__text">
											<span className="row__title">{item.alumno}</span>
											<span className="row__meta">
												<span className={`dot dot--${describeRegistro(item).tone}`} aria-hidden="true" />
												<span>{describeRegistroLinea(item)}{item.grado ? ` · Grado ${item.grado}` : ''}</span>
											</span>
										</span>
									</li>
								))}
							</ul>
						</section>
					)) : <p className="card muted">No hay registros con esos filtros.</p>}
					{rows.length > shown && (
						<button type="button" className="button button--secondary" onClick={() => setShown(count => count + PAGE)}>
							Mostrar más ({rows.length - shown} restantes)
						</button>
					)}
				</>
			)}
		</>
	);
}
