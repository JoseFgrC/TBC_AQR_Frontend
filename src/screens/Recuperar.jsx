import { useEffect, useRef, useState } from 'react';
import { confirmarRecuperacion, solicitarCodigoRecuperacion } from '../api/endpoints.js';
import { PasswordField, TextField } from '../components/Field.jsx';
import {
	CODE_REQUIRED, REQUEST_MESSAGE, RESEND_SECONDS, describeRecoveryError, normalizeCode, validateCorreo, validateRecuperacion,
} from '../lib/recuperacion.js';
import { PASSWORD_HINT } from '../lib/textos.js';

// Recuperar la contraseña sin sesión: 1) correo, 2) código del bot + contraseña nueva.
// onDone(email) vuelve al login con el correo ya escrito.
export default function Recuperar({ onDone }) {
	const [step, setStep] = useState('correo');
	const [email, setEmail] = useState('');
	const titleRef = useRef(null);

	// Al cambiar de paso el foco va al título, para que el lector de pantalla anuncie la nueva pantalla.
	useEffect(() => { if (step !== 'correo') titleRef.current?.focus(); }, [step]);

	return (
		<main className="login recuperar">
			<a className="button button--plain recuperar__back" href="#/">‹ Iniciar sesión</a>
			<h1 className="title" ref={titleRef} tabIndex={-1}>{step === 'correo' ? 'Recuperar contraseña' : 'Revisa tu Telegram'}</h1>
			{step === 'correo'
				? <PasoCorreo email={email} setEmail={setEmail} onSent={() => setStep('codigo')} />
				: <PasoCodigo email={email.trim()} onChangeEmail={() => setStep('correo')} onDone={() => onDone(email.trim())} />}
		</main>
	);
}

// Mueve el foco al primer campo con error después de un envío fallido.
const useFocusFirstError = (formRef, attempt) => {
	useEffect(() => {
		if (attempt) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
	}, [attempt, formRef]);
};

function PasoCorreo({ email, setEmail, onSent }) {
	const formRef = useRef(null);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);
	const [attempt, setAttempt] = useState(0);
	useFocusFirstError(formRef, attempt);

	const submit = async event => {
		event.preventDefault();
		const problem = validateCorreo(email);
		setError(problem || '');
		setMessage('');
		if (problem) { setAttempt(n => n + 1); return; }
		setBusy(true);
		try {
			await solicitarCodigoRecuperacion(email.trim());
			onSent();
		} catch (err) {
			// Un 400 aquí solo puede ser el formato del correo (la respuesta normal es siempre la misma).
			if (err.status === 400) setError(validateCorreo(''));
			else setMessage(describeRecoveryError(err).message);
			setAttempt(n => n + 1);
			setBusy(false);
		}
	};

	return (
		<>
			<p className="login__lead">Te mandaremos un código por Telegram.</p>
			<form className="card form" ref={formRef} onSubmit={submit} noValidate>
				<TextField label="Correo" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck="false"
					maxLength={150} value={email} placeholder="tu@escuela.com" error={error} onChange={event => setEmail(event.target.value)} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar código'}</button>
			</form>
			<p className="muted recuperar__help">¿Usas la cuenta del escáner? Pide a la directora que restablezca tu contraseña.</p>
		</>
	);
}

function PasoCodigo({ email, onChangeEmail, onDone }) {
	const formRef = useRef(null);
	const [form, setForm] = useState({ codigo: '', nueva: '', confirmar: '' });
	const [errors, setErrors] = useState({});
	const [message, setMessage] = useState('');
	const [status, setStatus] = useState('');
	const [busy, setBusy] = useState(false);
	const [attempt, setAttempt] = useState(0);
	const [wait, setWait] = useState(RESEND_SECONDS);
	const set = key => event => setForm({ ...form, [key]: key === 'codigo' ? normalizeCode(event.target.value) : event.target.value });
	useFocusFirstError(formRef, attempt);

	useEffect(() => {
		if (wait <= 0) return undefined;
		const timer = setTimeout(() => setWait(seconds => seconds - 1), 1000);
		return () => clearTimeout(timer);
	}, [wait]);

	const fail = err => {
		const { field, message: text } = describeRecoveryError(err);
		const fields = {};
		for (const detail of err.details || []) {
			if (detail.field === 'codigo') fields.codigo = CODE_REQUIRED;
			if (detail.field === 'password') fields.nueva = 'Usa de 8 a 100 caracteres.';
		}
		if (field) fields[field] = text;
		setErrors(fields);
		setMessage(field ? '' : text);
		setAttempt(n => n + 1);
	};

	const submit = async event => {
		event.preventDefault();
		const local = validateRecuperacion(form);
		setErrors(local);
		setMessage('');
		setStatus('');
		if (Object.keys(local).length) { setAttempt(n => n + 1); return; }
		setBusy(true);
		try {
			await confirmarRecuperacion({ email, codigo: form.codigo, password: form.nueva });
			onDone();
		} catch (err) {
			fail(err);
			setBusy(false);
		}
	};

	const resend = async () => {
		setMessage('');
		setStatus('');
		setWait(RESEND_SECONDS);
		try {
			await solicitarCodigoRecuperacion(email);
			setForm(current => ({ ...current, codigo: '' }));
			setErrors({});
			setStatus('Te mandamos otro código; el anterior ya no sirve.');
		} catch (err) {
			setMessage(describeRecoveryError(err).message);
		}
	};

	return (
		<>
			<div className="notice" role="status">
				<p>{REQUEST_MESSAGE}</p>
			</div>
			<p className="muted recuperar__email">
				Para <strong>{email}</strong>{' '}
				<button type="button" className="button button--plain button--compact" onClick={onChangeEmail}>Cambiar correo</button>
			</p>
			<form className="card form" ref={formRef} onSubmit={submit} noValidate>
				<input type="email" autoComplete="username" value={email} readOnly hidden />
				<TextField label="Código de 6 dígitos" className="recuperar__codigo" value={form.codigo} inputMode="numeric" autoComplete="one-time-code"
					pattern="[0-9]*" maxLength={7} placeholder="000000" hint="Vence en 10 minutos y sirve una sola vez."
					error={errors.codigo} onChange={set('codigo')} />
				<PasswordField label="Contraseña nueva" value={form.nueva} maxLength={100} autoComplete="new-password" hint={PASSWORD_HINT}
					error={errors.nueva} onChange={set('nueva')} />
				<PasswordField label="Repite la contraseña nueva" value={form.confirmar} maxLength={100} autoComplete="new-password"
					error={errors.confirmar} onChange={set('confirmar')} />
				{message && <p className="form__error" role="alert">{message}</p>}
				<button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
			</form>
			<div className="recuperar__resend">
				<button type="button" className="button button--plain" onClick={resend} disabled={wait > 0}>
					{wait > 0 ? `Pedir otro código (en ${wait} s)` : 'Pedir otro código'}
				</button>
				<p className="field__hint" aria-live="polite">{status}</p>
			</div>
		</>
	);
}
