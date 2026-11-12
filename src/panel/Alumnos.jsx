import { useState } from 'react';
import {
	asignarTutor, createAlumno, descargarCredencialPdf, getAlumno, listAllAlumnos, listPadres, quitarTutor, updateAlumno, uploadFotoAlumno,
} from '../api/endpoints.js';
import Avatar from '../components/Avatar.jsx';
import { useConfirm } from '../components/Dialog.jsx';
import { SelectField, Switch, TextField } from '../components/Field.jsx';
import { CameraIcon, DownloadIcon, PlusIcon } from '../components/icons.jsx';
import { alumnoChanges, filterAlumnos, gradosDe, isActive } from '../lib/alumnos.js';
import { describeApiError, fieldErrors } from '../lib/apiErrors.js';
import { toHash } from '../lib/route.js';
import { useAsync } from '../lib/useAsync.js';
import { validateAlumno, validatePhoto, validateTutorAsignado } from '../lib/validators.js';
import { AlumnoFilters, AlumnoRows } from './AlumnoList.jsx';
import { usePanel } from './context.js';
import PanelPage, { LoadError, Loading } from './PanelPage.jsx';
import { useDownload } from './useDownload.js';

const PARENTESCOS = ['mamá', 'papá', 'abuela', 'abuelo', 'tía', 'tío', 'hermana', 'hermano', 'tutor legal'];

// Los filtros sobreviven al ir y volver del detalle de un alumno.
let savedFilters = { search: '', grado: '', estado: 'activos' };

export default function Alumnos({ params }) {
	const [first] = params;
	if (first === 'nuevo') return <NuevoAlumno />;
	// key: al pasar de un alumno a otro, los formularios empiezan de cero (no heredan datos del anterior).
	if (/^\d+$/.test(first || '')) return <AlumnoDetalle key={first} id={first} />;
	return <ListaAlumnos />;
}

function ListaAlumnos() {
	const { data, error, loading, reload } = useAsync(listAllAlumnos, []);
	const [filters, setFilters] = useState(savedFilters);
	const update = next => { savedFilters = next; setFilters(next); };
	const alumnos = filterAlumnos(data, filters);

	return (
		<PanelPage
			title="Alumnos"
			wide
			actions={<a className="button button--primary button--small" href={toHash('alumnos', 'nuevo')}><PlusIcon />Nuevo alumno</a>}
		>
			<AlumnoFilters filters={filters} onChange={update} grados={gradosDe(data)} />
			{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
			{loading && !data && <Loading />}
			{data && (
				<>
					<p className="muted" aria-live="polite">{alumnos.length} {alumnos.length === 1 ? 'alumno' : 'alumnos'}</p>
					<AlumnoRows alumnos={alumnos} empty={data.length ? 'No hay alumnos con esos filtros.' : 'Aún no hay alumnos.'} />
				</>
			)}
		</PanelPage>
	);
}

function NuevoAlumno() {
	const { go } = usePanel();
	const { data } = useAsync(listAllAlumnos, []);
	const [form, setForm] = useState({ nombre: '', grado: '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	const submit = async event => {
		event.preventDefault();
		const local = validateAlumno(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy(true);
		try {
			const created = await createAlumno({ nombre: form.nombre.trim(), grado: form.grado.trim() });
			go(toHash('alumnos', created.id), 'Alumno creado; ya puedes agregar su foto y sus tutores.');
		} catch (error) {
			if (error.status === 401) return;
			setErrors(fieldErrors(error));
			setMessage(describeApiError(error));
			setBusy(false);
		}
	};

	return (
		<PanelPage title="Nuevo alumno" back={toHash('alumnos')} backLabel="Alumnos">
			<form className="card form" onSubmit={submit} noValidate>
				<TextField label="Nombre completo" value={form.nombre} maxLength={150} autoComplete="off" required
					error={errors.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} />
				<TextField label="Grado y grupo (opcional)" value={form.grado} maxLength={20} list="grados" autoComplete="off"
					hint="Por ejemplo, 3A." error={errors.grado}
					onChange={event => setForm({ ...form, grado: event.target.value })} />
				<datalist id="grados">{gradosDe(data).map(grado => <option key={grado} value={grado} />)}</datalist>
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Creando…' : 'Crear'}</button>
			</form>
		</PanelPage>
	);
}

function AlumnoDetalle({ id }) {
	const { data: alumno, error, loading, reload, setData } = useAsync(() => getAlumno(id), [id]);

	if (!alumno) {
		return (
			<PanelPage title="Alumno" back={toHash('alumnos')} backLabel="Alumnos">
				{error ? <LoadError message={describeApiError(error)} onRetry={error.status === 404 ? null : reload} /> : loading && <Loading />}
			</PanelPage>
		);
	}

	return (
		<PanelPage title={alumno.nombre} eyebrow={alumno.grado ? `Alumno · grado ${alumno.grado}` : 'Alumno'} back={toHash('alumnos')} backLabel="Alumnos" wide>
			<div className="columns">
				<div className="stack">
					<DatosCard alumno={alumno} onSaved={setData} />
					<EstadoCard alumno={alumno} onSaved={setData} />
				</div>
				<div className="stack">
					<TutoresCard alumno={alumno} onSaved={setData} />
					<CredencialCard alumno={alumno} />
				</div>
			</div>
		</PanelPage>
	);
}

function DatosCard({ alumno, onSaved }) {
	const { notify } = usePanel();
	const [form, setForm] = useState({ nombre: alumno.nombre, grado: alumno.grado || '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const changes = alumnoChanges(alumno, form);
	const dirty = Object.keys(changes).length > 0;

	const submit = async event => {
		event.preventDefault();
		const local = validateAlumno(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length || !dirty) return;
		setBusy(true);
		try {
			const updated = await updateAlumno(alumno.id, changes);
			onSaved(updated);
			setForm({ nombre: updated.nombre, grado: updated.grado || '' });
			notify('Cambios guardados.');
		} catch (error) {
			if (error.status === 401) return;
			setErrors(fieldErrors(error));
			setMessage(describeApiError(error));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="datos-title">
			<h2 className="card__title" id="datos-title">Datos</h2>
			<FotoUploader alumno={alumno} onSaved={onSaved} />
			<form className="form" onSubmit={submit} noValidate>
				<TextField label="Nombre completo" value={form.nombre} maxLength={150} autoComplete="off" required
					error={errors.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} />
				<TextField label="Grado y grupo" value={form.grado} maxLength={20} autoComplete="off" hint="Déjalo vacío si no aplica."
					error={errors.grado} onChange={event => setForm({ ...form, grado: event.target.value })} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy || !dirty}>{busy ? 'Guardando…' : 'Guardar'}</button>
			</form>
		</section>
	);
}

function FotoUploader({ alumno, onSaved }) {
	const { notify } = usePanel();
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	const pick = async event => {
		const file = event.target.files?.[0];
		event.target.value = ''; // permite volver a elegir el mismo archivo
		if (!file) return;
		const problem = validatePhoto(file);
		setError(problem || '');
		if (problem) return;
		setBusy(true);
		try {
			onSaved(await uploadFotoAlumno(alumno.id, file));
			notify('Foto actualizada. Saldrá en la próxima credencial que imprimas.');
		} catch (err) {
			if (err.status !== 401) setError(describeApiError(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="photo">
			<Avatar name={alumno.nombre} src={alumno.foto_url} size={88} key={alumno.foto_url || 'sin-foto'} />
			<div className="photo__actions">
				<label className={`button button--secondary button--small file-button ${busy ? 'is-busy' : ''}`}>
					<CameraIcon />
					{busy ? 'Subiendo…' : alumno.foto_url ? 'Cambiar foto' : 'Subir foto'}
					<input type="file" accept="image/jpeg,image/png" onChange={pick} disabled={busy} aria-describedby="foto-hint" />
				</label>
				<p className="field__hint" id="foto-hint">JPG o PNG, máximo 5 MB.</p>
				{error && <p className="form__error" role="alert">{error}</p>}
			</div>
		</div>
	);
}

function EstadoCard({ alumno, onSaved }) {
	const { notify } = usePanel();
	const confirm = useConfirm();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const active = isActive(alumno);

	const change = async next => {
		if (!next && !(await confirm({
			title: `¿Dar de baja a ${alumno.nombre}?`,
			message: 'Su credencial dejará de funcionar y no contará en los reportes; puedes reactivarlo cuando quieras.',
			confirmLabel: 'Dar de baja',
			danger: true,
		}))) return;
		setBusy(true);
		setError('');
		try {
			onSaved(await updateAlumno(alumno.id, { activo: next }));
			notify(next ? 'Alumno activado. Su credencial vuelve a funcionar.' : 'Alumno dado de baja.');
		} catch (err) {
			if (err.status !== 401) setError(describeApiError(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card" aria-labelledby="estado-title">
			<h2 className="card__title" id="estado-title">Estado</h2>
			<Switch
				label={active ? 'Activo' : 'Dado de baja'}
				description={active ? 'Puede registrar entradas y salidas.' : 'Su credencial no registra asistencia.'}
				checked={active}
				disabled={busy}
				onChange={change}
			/>
			{error && <p className="form__error" role="alert">{error}</p>}
		</section>
	);
}

const telegramLabel = tutor => {
	if (!Number(tutor.telegram_vinculado)) return 'Sin Telegram vinculado';
	return Number(tutor.notificaciones_activas) ? 'Recibe avisos por Telegram' : 'Avisos pausados';
};

function TutoresCard({ alumno, onSaved }) {
	const { notify } = usePanel();
	const confirm = useConfirm();
	const padres = useAsync(listPadres, []);
	const [form, setForm] = useState({ padre: '', parentesco: '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	const assigned = new Set(alumno.tutores.map(tutor => tutor.id));
	const available = (padres.data || []).filter(padre => !assigned.has(padre.id));

	const assign = async event => {
		event.preventDefault();
		const local = validateTutorAsignado(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy(true);
		try {
			onSaved(await asignarTutor(alumno.id, { id_padre: form.padre, parentesco: form.parentesco.trim() }));
			setForm({ padre: '', parentesco: '' });
			notify('Tutor asignado.');
		} catch (error) {
			if (error.status === 401) return;
			setErrors(fieldErrors(error, { id_padre: 'padre' }));
			setMessage(describeApiError(error));
		} finally {
			setBusy(false);
		}
	};

	const remove = async tutor => {
		if (!(await confirm({
			title: `¿Quitar a ${tutor.nombre}?`,
			message: `Dejará de recibir avisos de ${alumno.nombre}; puedes volver a asignarlo cuando quieras.`,
			confirmLabel: 'Quitar tutor',
			danger: true,
		}))) return;
		setMessage('');
		try {
			onSaved(await quitarTutor(alumno.id, tutor.id));
			notify('Tutor quitado.');
		} catch (error) {
			if (error.status !== 401) setMessage(describeApiError(error));
		}
	};

	return (
		<section className="card" aria-labelledby="tutores-title">
			<h2 className="card__title" id="tutores-title">Tutores</h2>
			{alumno.tutores.length ? (
				<ul className="list list--plain">
					{alumno.tutores.map(tutor => (
						<li key={tutor.id} className="row row--static">
							<span className="row__text">
								<a className="row__title row__link" href={toHash('tutores', tutor.id)}>{tutor.nombre}{tutor.parentesco ? ` (${tutor.parentesco})` : ''}</a>
								<span className="row__meta">{telegramLabel(tutor)}{tutor.telefono ? ` · ${tutor.telefono}` : ''}</span>
							</span>
							<button type="button" className="button button--plain button--small" onClick={() => remove(tutor)}
								aria-label={`Quitar a ${tutor.nombre}`}>Quitar</button>
						</li>
					))}
				</ul>
			) : (
				<p className="muted">Nadie recibe avisos de este alumno.</p>
			)}

			<form className="form form--inline-title" onSubmit={assign} noValidate>
				<h3 className="subtitle">Asignar tutor</h3>
				{padres.error && <p className="form__error" role="alert">{describeApiError(padres.error)}</p>}
				{padres.data && !padres.data.length ? (
					<>
						<p className="muted">Aún no hay tutores registrados.</p>
						<a className="button button--secondary button--small" href={toHash('tutores', 'nuevo')}><PlusIcon />Nuevo tutor</a>
					</>
				) : (
					<>
						<SelectField label="Tutor" value={form.padre} error={errors.padre} disabled={!padres.data}
							onChange={event => setForm({ ...form, padre: event.target.value })}>
							<option value="">{padres.data ? (available.length ? 'Elige un tutor' : 'Todos los tutores ya están asignados') : 'Cargando…'}</option>
							{available.map(padre => <option key={padre.id} value={padre.id}>{padre.nombre}{padre.telefono ? ` · ${padre.telefono}` : ''}</option>)}
						</SelectField>
						<TextField label="Parentesco (opcional)" value={form.parentesco} maxLength={30} list="parentescos" autoComplete="off"
							error={errors.parentesco} onChange={event => setForm({ ...form, parentesco: event.target.value })} />
						<datalist id="parentescos">{PARENTESCOS.map(item => <option key={item} value={item} />)}</datalist>
						<button type="submit" className="button button--secondary" disabled={busy || !available.length}>{busy ? 'Asignando…' : 'Asignar'}</button>
					</>
				)}
				{message && <p className="form__error" role="alert">{message}</p>}
			</form>
		</section>
	);
}

function CredencialCard({ alumno }) {
	const { download, busy, error } = useDownload();
	return (
		<section className="card" aria-labelledby="credencial-title">
			<h2 className="card__title" id="credencial-title">Credencial</h2>
			<div className="button-row">
				<a className="button button--secondary button--small" href={toHash('credenciales', alumno.id)}>Ver QR e historial</a>
				<button type="button" className="button button--secondary button--small" disabled={busy}
					onClick={() => download(() => descargarCredencialPdf(alumno.id), `credencial-${alumno.id}.pdf`)}>
					<DownloadIcon />{busy ? 'Preparando…' : 'Descargar PDF'}
				</button>
			</div>
			{error && <p className="form__error" role="alert">{error}</p>}
		</section>
	);
}
