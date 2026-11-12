import { useState } from 'react';
import { formatToday } from '../lib/format.js';
import { CalendarIcon } from '../components/icons.jsx';
import { TextField } from '../components/Field.jsx';
import { describeApiError, fieldErrors } from '../lib/apiErrors.js';
import { validateHorarioEspecial } from '../lib/validators.js';

const pad = n => String(n).padStart(2, '0');

// Propuesta inicial: la hora actual redondeada al cuarto de hora anterior y 5 horas de clase.
const suggestedTimes = (date = new Date()) => {
	const start = Math.floor((date.getHours() * 60 + date.getMinutes()) / 15) * 15;
	const end = Math.min(start + 5 * 60, 23 * 60 + 45);
	const clock = minutes => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
	return { hora_entrada: clock(start), hora_salida: clock(end > start ? end : 23 * 60 + 59) };
};

// Escáner: solo "Volver a revisar" y "Cerrar sesión".
// Directora (onEnable): además "Volver al panel" y "Habilitar clases hoy".
export default function NoClasses({ motivo, onRetry, onLogout, onBack, onEnable, diaEspecial }) {
	const [enabling, setEnabling] = useState(false);

	if (enabling) {
		return <EnableClasses motivo={motivo} diaEspecial={diaEspecial} onEnable={onEnable} onCancel={() => setEnabling(false)} />;
	}

	return (
		<main className="empty">
			<p className="eyebrow">{formatToday()}</p>
			<div className="empty__body">
				<span className="empty__icon"><CalendarIcon /></span>
				<h1 className="title">Hoy no hay clases</h1>
				{motivo && <p className="empty__text">{motivo}</p>}
			</div>
			<div className="empty__actions">
				{onEnable && <button type="button" className="button button--primary" onClick={() => setEnabling(true)}>Habilitar clases hoy</button>}
				{onBack && <button type="button" className="button button--secondary" onClick={onBack}>Volver al panel</button>}
				<button type="button" className={`button ${onBack ? 'button--plain' : 'button--secondary'}`} onClick={onRetry}>Volver a revisar</button>
				{onLogout && <button type="button" className="button button--plain" onClick={onLogout}>Cerrar sesión</button>}
			</div>
		</main>
	);
}

function EnableClasses({ motivo, diaEspecial, onEnable, onCancel }) {
	const [form, setForm] = useState(suggestedTimes);
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	const submit = async event => {
		event.preventDefault();
		const local = validateHorarioEspecial(form);
		setErrors(local);
		setMessage('');
		if (Object.keys(local).length) return;
		setBusy(true);
		try {
			await onEnable(form); // si sale bien, el escáner abre la cámara y este formulario desaparece
		} catch (error) {
			if (error.status === 401) return;
			setErrors(fieldErrors(error));
			setMessage(describeApiError(error));
			setBusy(false);
		}
	};

	return (
		<main className="empty">
			<p className="eyebrow">{formatToday()}</p>
			<form className="empty__form" onSubmit={submit} noValidate>
				<h1 className="title">Habilitar clases hoy</h1>
				<div className="notice notice--warning">
					<p>Hoy contará como día con clases: quien no llegue tendrá falta y, si el aviso de "no llegó" está activo, su familia lo recibirá.</p>
					{diaEspecial === 'sin_clases' && <p>Reemplaza el día sin clases registrado{motivo ? ` (${motivo})` : ''}.</p>}
					<p>Puedes deshacerlo en Horarios › Días especiales.</p>
				</div>
				<div className="form-grid">
					<TextField label="Hora de entrada" type="time" value={form.hora_entrada} required error={errors.hora_entrada}
						onChange={event => setForm({ ...form, hora_entrada: event.target.value })} />
					<TextField label="Hora de salida" type="time" value={form.hora_salida} required error={errors.hora_salida}
						onChange={event => setForm({ ...form, hora_salida: event.target.value })} />
				</div>
				{message && <p className="form__error" role="alert">{message}</p>}
				<div className="empty__actions">
					<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Habilitando…' : 'Habilitar'}</button>
					<button type="button" className="button button--secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
				</div>
			</form>
		</main>
	);
}
