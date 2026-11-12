import { useId, useState } from 'react';

// Campo con etiqueta, ayuda y error ligados por aria-describedby.
// children recibe las props de accesibilidad para el control: {(props) => <input {...props} />}
export function Field({ label, hint, error, children, className = '' }) {
	const id = useId();
	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const control = children({
		id,
		'aria-invalid': error ? true : undefined,
		'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
	});
	return (
		<div className={`field ${error ? 'field--error' : ''} ${className}`}>
			<label className="field__label" htmlFor={id}>{label}</label>
			{control}
			{hint && <p className="field__hint" id={hintId}>{hint}</p>}
			{error && <p className="field__error" id={errorId}>{error}</p>}
		</div>
	);
}

export function TextField({ label, hint, error, className, ...input }) {
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			{props => <input {...props} {...input} />}
		</Field>
	);
}

export function SelectField({ label, hint, error, className, children, ...select }) {
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			{props => <select {...props} {...select}>{children}</select>}
		</Field>
	);
}

// Interruptor de toda la fila (objetivo táctil grande). checked/onChange como un checkbox.
export function Switch({ label, description, checked, onChange, disabled }) {
	const id = useId();
	return (
		<button
			type="button"
			role="switch"
			className="switch"
			aria-checked={checked}
			aria-describedby={description ? `${id}-desc` : undefined}
			disabled={disabled}
			onClick={() => onChange(!checked)}
		>
			<span className="switch__text">
				<span className="switch__label">{label}</span>
				{description && <span className="switch__description" id={`${id}-desc`}>{description}</span>}
			</span>
			<span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
		</button>
	);
}

// Contraseña con botón "Mostrar" (útil para dictar una contraseña temporal).
export function PasswordField({ label, hint, error, className, ...input }) {
	const [visible, setVisible] = useState(false);
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			{props => (
				<span className="password">
					<input {...props} {...input} type={visible ? 'text' : 'password'} spellCheck="false" autoCapitalize="none" />
					<button type="button" className="button button--plain password__toggle" aria-pressed={visible}
						aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
						onClick={() => setVisible(value => !value)}>
						{visible ? 'Ocultar' : 'Mostrar'}
					</button>
				</span>
			)}
		</Field>
	);
}
