import { useCallback, useEffect, useRef, useState } from 'react';
import { escanear, getHorarioDia, guardarDiaEspecial } from '../api/endpoints.js';
import { describeError, describeSuccess } from '../lib/messages.js';
import { noticeFeedback, successFeedback, unlockAudio } from '../lib/feedback.js';
import { formatToday, isoDate } from '../lib/format.js';
import { scannerScreen } from '../lib/entry.js';
import { currentMode } from '../lib/schedule.js';
import { createScanGate } from '../lib/scanGate.js';
import Viewfinder from '../components/Viewfinder.jsx';
import RecentList from '../components/RecentList.jsx';
import ResultSheet from '../components/ResultSheet.jsx';
import NoClasses from './NoClasses.jsx';

const MAX_RECENT = 5;
// Los tokens de credencial miden 32 caracteres y el backend acepta hasta 100
// (asistencias.schema.js); un QR más largo no es una credencial y no se envía.
const MAX_QR_LENGTH = 100;

// rol 'directora': se abre desde el panel (botón "← Panel") y en días sin clases puede habilitarlas.
export default function Scanner({ onLogout, onBack, rol = 'escaner' }) {
	const [horario, setHorario] = useState(null);
	const [noClasses, setNoClasses] = useState(null);
	const [sheet, setSheet] = useState(null);
	const [recents, setRecents] = useState([]);
	const [, setTick] = useState(0);

	const gateRef = useRef(null);
	gateRef.current ||= createScanGate();
	const sheetId = useRef(0);

	const loadHorario = useCallback(async () => {
		try {
			const data = await getHorarioDia();
			setHorario(data);
			setNoClasses(data.hay_clases ? null : data.motivo || '');
		} catch {
			// Sin horario el escáner sigue funcionando; el backend decide igual.
		}
	}, []);

	useEffect(() => {
		loadHorario();
		const refresh = () => document.visibilityState === 'visible' && loadHorario();
		const clock = setInterval(() => setTick(t => t + 1), 60_000);
		document.addEventListener('visibilitychange', refresh);
		return () => {
			clearInterval(clock);
			document.removeEventListener('visibilitychange', refresh);
		};
	}, [loadHorario]);

	const closeSheet = useCallback(() => {
		setSheet(null);
		gateRef.current.release();
	}, []);

	const handleScan = useCallback(async text => {
		const gate = gateRef.current;
		if (!gate.accept(text)) return;

		if (text.length > MAX_QR_LENGTH) {
			noticeFeedback();
			setSheet({ ...describeError({ kind: 'http', status: 400, message: 'QR no reconocido' }), id: ++sheetId.current });
			gate.settle(text);
			return;
		}

		try {
			const data = await escanear(text);
			const content = describeSuccess(data);
			successFeedback();
			setRecents(list => [
				{ id: data.asistencia.id, nombre: data.alumno.nombre, foto_url: data.alumno.foto_url, tone: content.tone, label: content.recent, time: content.time },
				...list.filter(item => item.id !== data.asistencia.id),
			].slice(0, MAX_RECENT));
			setSheet({ ...content, id: ++sheetId.current });
		} catch (error) {
			if (error.status === 401) { // App ya regresa al login
				gate.release();
				return;
			}
			const content = describeError(error);
			if (content.kind === 'no-classes') {
				gate.release();
				setNoClasses(content.motivo);
				return;
			}
			noticeFeedback();
			setSheet({ ...content, id: ++sheetId.current });
		} finally {
			gate.settle(text);
		}
	}, []);

	// Registra hoy como día con horario especial (9.6) y vuelve a pedir el horario: con hay_clases
	// en true se abre la cámara. La fecha es la del servidor (la que devolvió /horarios/dia).
	const enableToday = useCallback(async ({ hora_entrada, hora_salida }) => {
		await guardarDiaEspecial(horario?.fecha || isoDate(), {
			tipo: 'horario_especial', hora_entrada, hora_salida, descripcion: 'Clases habilitadas desde el escáner',
		});
		await loadHorario();
	}, [horario, loadHorario]);

	const screen = scannerScreen({ noClasses, rol });
	if (screen === 'no-classes') {
		return <NoClasses motivo={noClasses} onRetry={loadHorario} onLogout={onLogout} />;
	}
	if (screen === 'no-classes-directora') {
		return <NoClasses motivo={noClasses} onRetry={loadHorario} onBack={onBack} onEnable={enableToday} diaEspecial={horario?.dia_especial} />;
	}

	const mode = currentMode(horario);

	return (
		<main className="scanner" onPointerDown={unlockAudio}>
			<header className="scanner__header">
				<div>
					<p className="eyebrow">{formatToday()}</p>
					<h1 className="title">{mode === 'entradas' ? 'Entradas' : 'Salidas'}</h1>
				</div>
				{onBack
					? <button type="button" className="button button--plain button--compact" onClick={onBack}>← Panel</button>
					: <button type="button" className="button button--plain button--compact" onClick={onLogout}>Salir</button>}
			</header>

			{mode === 'entradas' && horario?.limite_puntual && (
				<p className="chip"><span className="dot dot--green" aria-hidden="true" />A tiempo hasta las {horario.limite_puntual}</p>
			)}

			<Viewfinder onScan={handleScan} hint="Acerca la credencial." />

			<RecentList items={recents} />

			{sheet && <ResultSheet key={sheet.id} content={sheet} onClose={closeSheet} />}
		</main>
	);
}
