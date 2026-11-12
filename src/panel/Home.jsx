import { getHorarioDia } from '../api/endpoints.js';
import { ChevronIcon } from '../components/icons.jsx';
import { firstName, formatToday } from '../lib/format.js';
import { useAsync } from '../lib/useAsync.js';
import { toHash } from '../lib/route.js';
import { SECTIONS } from './sections.jsx';

// Estado del día solo como información: el panel nunca se bloquea por no haber clases.
function TodayChip() {
	const { data } = useAsync(() => getHorarioDia(), []);
	if (!data) return null;
	if (data.hay_clases) {
		return (
			<p className="chip"><span className="dot dot--green" aria-hidden="true" />
				Hoy hay clases{data.hora_entrada && data.hora_salida ? ` de ${data.hora_entrada} a ${data.hora_salida}` : ''}
			</p>
		);
	}
	return <p className="chip chip--muted"><span className="dot dot--yellow" aria-hidden="true" />{data.motivo || 'Hoy no hay clases'}</p>;
}

export default function Home({ user, onLogout }) {
	return (
		<main className="page page--wide home">
			<div className="home__top">
				<p className="eyebrow">{formatToday()}</p>
				<button type="button" className="button button--plain button--compact" onClick={onLogout}>Cerrar sesión</button>
			</div>
			<header className="home__header">
				<div className="home__brand">
					<img src="/logo-telebachillerato.png" alt="Telebachillerato Comunitario" width="534" height="534" />
				</div>
				<div className="home__heading">
					<h1 className="title">Hola{user?.nombre ? `, ${firstName(user.nombre)}` : ''}</h1>
				</div>
			</header>

			<TodayChip />

			<nav aria-label="Secciones">
				<ul className="tiles">
					{SECTIONS.map(({ id, title, description, Icon }) => (
						<li key={id}>
							<a className="tile" href={toHash(id)}>
								<span className="tile__icon"><Icon /></span>
								<span className="tile__text">
									<span className="tile__title">{title}</span>
									<span className="tile__description">{description}</span>
								</span>
								<span className="tile__chevron"><ChevronIcon /></span>
							</a>
						</li>
					))}
				</ul>
			</nav>
		</main>
	);
}
