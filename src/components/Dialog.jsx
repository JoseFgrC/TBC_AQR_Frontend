import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

// Diálogo modal nativo: atrapa el foco, cierra con Esc y devuelve el foco al botón que lo abrió.
export function Dialog({ title, children, onClose, role = 'dialog' }) {
	const ref = useRef(null);
	const titleId = useId();

	useEffect(() => {
		const dialog = ref.current;
		if (dialog && !dialog.open) dialog.showModal?.();
		return () => dialog?.open && dialog.close();
	}, []);

	return (
		<dialog
			ref={ref}
			className="dialog"
			role={role}
			aria-labelledby={titleId}
			onCancel={event => { event.preventDefault(); onClose(); }}
		>
			<h2 className="dialog__title" id={titleId}>{title}</h2>
			{children}
		</dialog>
	);
}

const ConfirmContext = createContext(() => Promise.resolve(false));

// const confirm = useConfirm();
// await confirm({ title, message, confirmLabel, danger, input: { label, placeholder, maxLength } })
//   -> false si cancela; true (o { value } si pidió un dato) si confirma.
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
	const [request, setRequest] = useState(null);
	const [value, setValue] = useState('');

	const confirm = useCallback(options => new Promise(resolve => {
		setValue('');
		setRequest({ ...options, resolve });
	}), []);

	const finish = result => {
		request?.resolve(result);
		setRequest(null);
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{request && (
				<Dialog title={request.title} role="alertdialog" onClose={() => finish(false)}>
					<form method="dialog" className="dialog__body" onSubmit={event => { event.preventDefault(); finish(request.input ? { value: value.trim() } : true); }}>
						{request.message && <p className="dialog__message">{request.message}</p>}
						{request.input && (
							<div className="field">
								<label className="field__label" htmlFor="confirm-input">{request.input.label}</label>
								<input id="confirm-input" value={value} maxLength={request.input.maxLength} placeholder={request.input.placeholder}
									onChange={event => setValue(event.target.value)} />
							</div>
						)}
						<div className="dialog__actions">
							<button type="button" className="button button--secondary" onClick={() => finish(false)} autoFocus>
								{request.cancelLabel || 'Cancelar'}
							</button>
							<button type="submit" className={`button ${request.danger ? 'button--danger' : 'button--primary'}`}>
								{request.confirmLabel || 'Confirmar'}
							</button>
						</div>
					</form>
				</Dialog>
			)}
		</ConfirmContext.Provider>
	);
}
