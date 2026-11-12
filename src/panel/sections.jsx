import { ChecklistIcon, ClockIcon, KeyIcon, QrIcon, ScanIcon, StudentsIcon, TutorsIcon } from '../components/icons.jsx';
import Alumnos from './Alumnos.jsx';
import Asistencias from './Asistencias.jsx';
import Credenciales from './Credenciales.jsx';
import Cuentas from './Cuentas.jsx';
import Horarios from './Horarios.jsx';
import Tutores from './Tutores.jsx';

// Tarjetas del inicio, en orden.
export const SECTIONS = [
	{ id: 'alumnos', title: 'Alumnos', description: 'Altas, fotos, grupos y tutores', Icon: StudentsIcon, Component: Alumnos },
	{ id: 'tutores', title: 'Tutores', description: 'Contactos y avisos por Telegram', Icon: TutorsIcon, Component: Tutores },
	{ id: 'credenciales', title: 'Credenciales', description: 'QR, PDF para imprimir y reposición', Icon: QrIcon, Component: Credenciales },
	{ id: 'asistencias', title: 'Asistencias', description: 'Historial, retardos y faltas', Icon: ChecklistIcon, Component: Asistencias },
	{ id: 'horarios', title: 'Horarios', description: 'Semana, tolerancia y días sin clases', Icon: ClockIcon, Component: Horarios },
	{ id: 'cuentas', title: 'Cuentas', description: 'Personal de entrada y contraseñas', Icon: KeyIcon, Component: Cuentas },
	{ id: 'escanear', title: 'Escanear', description: 'Registrar entradas y salidas', Icon: ScanIcon, scanner: true },
];

export const SECTION_IDS = SECTIONS.map(section => section.id);
