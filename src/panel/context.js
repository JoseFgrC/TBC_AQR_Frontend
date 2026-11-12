import { createContext, useContext } from 'react';

// notify(texto, tono): aviso en la página actual. go(hash, aviso): navega y muestra el aviso allá.
export const PanelContext = createContext({ user: null, hash: '', notice: null, notify: () => {}, go: () => {} });
export const usePanel = () => useContext(PanelContext);
