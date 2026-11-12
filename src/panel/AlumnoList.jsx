import Avatar from '../components/Avatar.jsx';
import { ChevronIcon } from '../components/icons.jsx';
import { SelectField, TextField } from '../components/Field.jsx';
import { isActive } from '../lib/alumnos.js';
import { toHash } from '../lib/route.js';

export function AlumnoFilters({ filters, onChange, grados, showEstado = true }) {
	const set = key => event => onChange({ ...filters, [key]: event.target.value });
	return (
		<div className="card filters" role="search">
			<TextField label="Buscar" type="search" value={filters.search} onChange={set('search')}
				placeholder="Nombre, grado o tutor" autoComplete="off" className="filters__search" />
			<SelectField label="Grado" value={filters.grado} onChange={set('grado')}>
				<option value="">Todos los grados</option>
				{grados.map(grado => <option key={grado} value={grado}>{grado}</option>)}
			</SelectField>
			{showEstado && (
				<SelectField label="Estado" value={filters.estado} onChange={set('estado')}>
					<option value="activos">Activos</option>
					<option value="inactivos">Dados de baja</option>
					<option value="todos">Todos</option>
				</SelectField>
			)}
		</div>
	);
}

const tutoresLabel = alumno => {
	const total = Number(alumno.total_tutores) || 0;
	if (!total) return 'Sin tutores';
	return `${total} ${total === 1 ? 'tutor' : 'tutores'}`;
};

export function AlumnoRows({ alumnos, section = 'alumnos', empty = 'No hay alumnos con esos filtros.' }) {
	if (!alumnos.length) return <p className="card muted">{empty}</p>;
	return (
		<ul className="card list">
			{alumnos.map(alumno => (
				<li key={alumno.id}>
					<a className="row" href={toHash(section, alumno.id)}>
						<Avatar name={alumno.nombre} src={alumno.foto_url} size={44} />
						<span className="row__text">
							<span className="row__title">{alumno.nombre}</span>
							<span className="row__meta">
								{alumno.grado ? `Grado ${alumno.grado}` : 'Sin grado'} · {tutoresLabel(alumno)}
								{!isActive(alumno) && <span className="badge">Dado de baja</span>}
							</span>
						</span>
						<span className="row__chevron"><ChevronIcon /></span>
					</a>
				</li>
			))}
		</ul>
	);
}
