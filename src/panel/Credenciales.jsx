import { useState } from 'react';
import {
	descargarCredencialPdf, descargarLotePdf, getAlumno, getCredencial, historialCredencial, listAllAlumnos, regenerarCredencial,
} from '../api/endpoints.js';
import { safeImageDataUrl } from '../api/client.js';
import { useConfirm } from '../components/Dialog.jsx';
import { SelectField } from '../components/Field.jsx';
import { DownloadIcon, RefreshIcon } from '../components/icons.jsx';
import { filterAlumnos, gradosDe, isActive } from '../lib/alumnos.js';
import { describeApiError } from '../lib/apiErrors.js';
import { formatDateTime } from '../lib/format.js';
import { toHash } from '../lib/route.js';
import { useAsync } from '../lib/useAsync.js';
import { AlumnoFilters, AlumnoRows } from './AlumnoList.jsx';
import { usePanel } from './context.js';
import PanelPage, { LoadError, Loading } from './PanelPage.jsx';
import { useDownload } from './useDownload.js';

const PRINT_HINT = 'Al imprimir elige "Tamaño real" o 100 %, no "Ajustar a la página".';

export default function Credenciales({ params }) {
	const [first] = params;
	if (/^\d+$/.test(first || '')) return <CredencialDetalle key={first} id={first} />;
	return <ListaCredenciales />;
}

let savedFilters = { search: '', grado: '', estado: 'activos' };

function ListaCredenciales() {
	const { data, error, loading, reload } = useAsync(listAllAlumnos, []);
	const [filters, setFilters] = useState(savedFilters);
	const update = next => { savedFilters = next; setFilters(next); };

	return (
		<PanelPage title="Credenciales" wide>
			<div className="columns columns--aside">
				<LoteCard grados={gradosDe((data || []).filter(isActive))} />
				<section className="stack" aria-labelledby="por-alumno">
					<h2 className="section-title" id="por-alumno">Credencial de un alumno</h2>
					<AlumnoFilters filters={filters} onChange={update} grados={gradosDe(data)} />
					{error && <LoadError message={describeApiError(error)} onRetry={reload} />}
					{loading && !data && <Loading />}
					{data && <AlumnoRows alumnos={filterAlumnos(data, filters)} section="credenciales" />}
				</section>
			</div>
		</PanelPage>
	);
}

function LoteCard({ grados }) {
	const [grado, setGrado] = useState('');
	const { download, busy, error } = useDownload();
	return (
		<section className="card form" aria-labelledby="lote-title">
			<h2 className="card__title" id="lote-title">Imprimir un grupo</h2>
			<p className="muted">8 por hoja carta, solo alumnos activos.</p>
			<SelectField label="Grupo" value={grado} onChange={event => setGrado(event.target.value)}>
				<option value="">Todos los alumnos activos</option>
				{grados.map(item => <option key={item} value={item}>Grado {item}</option>)}
			</SelectField>
			<button type="button" className="button button--primary" disabled={busy}
				onClick={() => download(() => descargarLotePdf(grado), grado ? `credenciales-${grado}.pdf` : 'credenciales.pdf')}>
				<DownloadIcon />{busy ? 'Preparando PDF…' : 'Descargar PDF'}
			</button>
			<p className="field__hint">{PRINT_HINT}</p>
			{error && <p className="form__error" role="alert">{error}</p>}
		</section>
	);
}

const loadDetalle = async id => {
	const [alumno, credencial, historial] = await Promise.all([getAlumno(id), getCredencial(id), historialCredencial(id)]);
	return { alumno, credencial, historial };
};

function CredencialDetalle({ id }) {
	const { notify } = usePanel();
	const confirm = useConfirm();
	const { data, error, loading, reload, setData } = useAsync(() => loadDetalle(id), [id]);
	const { download, busy: downloading, error: downloadError } = useDownload();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');

	if (!data) {
		return (
			<PanelPage title="Credencial" back={toHash('credenciales')} backLabel="Credenciales">
				{error ? <LoadError message={describeApiError(error)} onRetry={error.status === 404 ? null : reload} /> : loading && <Loading />}
			</PanelPage>
		);
	}

	const { alumno, credencial, historial } = data;
	const qr = safeImageDataUrl(credencial?.qrDataUrl);

	const regenerate = async () => {
		const answer = await confirm({
			title: '¿Regenerar el QR?',
			message: `La credencial actual de ${alumno.nombre} dejará de funcionar y tendrás que imprimir una nueva.`,
			input: { label: 'Motivo (opcional)', placeholder: 'Credencial extraviada', maxLength: 255 },
			confirmLabel: 'Regenerar QR',
			danger: true,
		});
		if (!answer) return;
		setBusy(true);
		setMessage('');
		try {
			const nueva = await regenerarCredencial(alumno.id, answer.value);
			const nuevoHistorial = await historialCredencial(alumno.id).catch(() => historial);
			setData(current => ({ ...current, credencial: nueva, historial: nuevoHistorial }));
			notify('QR nuevo listo; imprime la credencial otra vez, la anterior ya no sirve.');
		} catch (err) {
			if (err.status !== 401) setMessage(describeApiError(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<PanelPage title={alumno.nombre} eyebrow={alumno.grado ? `Credencial · grado ${alumno.grado}` : 'Credencial'}
			back={toHash('credenciales')} backLabel="Credenciales" wide>
			{!isActive(alumno) && (
				<p className="notice notice--warning">Alumno dado de baja: su QR no registra asistencia.</p>
			)}
			<div className="columns">
				<section className="card qr-card" aria-labelledby="qr-title">
					<h2 className="card__title" id="qr-title">QR actual</h2>
					{qr
						? <img className="qr-card__image" src={qr} alt={`Código QR de la credencial de ${alumno.nombre}`} width="240" height="240" />
						: <p className="muted">No se pudo mostrar el QR; recarga la página.</p>}
					<div className="button-row">
						<button type="button" className="button button--primary button--small" disabled={downloading}
							onClick={() => download(() => descargarCredencialPdf(alumno.id), `credencial-${alumno.id}.pdf`)}>
							<DownloadIcon />{downloading ? 'Preparando…' : 'Descargar PDF'}
						</button>
						<button type="button" className="button button--danger-outline button--small" disabled={busy} onClick={regenerate}>
							<RefreshIcon />{busy ? 'Regenerando…' : 'Regenerar QR'}
						</button>
					</div>
					<p className="field__hint">{PRINT_HINT}</p>
					{(downloadError || message) && <p className="form__error" role="alert">{downloadError || message}</p>}
				</section>

				<section className="card" aria-labelledby="historial-title">
					<h2 className="card__title" id="historial-title">Historial de QR</h2>
					{historial?.length ? (
						<ul className="list list--plain">
							{historial.map(item => (
								<li key={item.id} className="row row--static">
									<span className="row__text">
										<span className="row__title">{formatDateTime(item.fecha)}</span>
										<span className="row__meta">{item.motivo || 'Sin motivo'} · QR anterior terminado en {String(item.qr_token_anterior || '').slice(-4) || '—'}</span>
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className="muted">Es el QR original.</p>
					)}
				</section>
			</div>
		</PanelPage>
	);
}
