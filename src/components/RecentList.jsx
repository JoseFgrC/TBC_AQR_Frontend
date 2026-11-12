import Avatar from './Avatar.jsx';

export default function RecentList({ items }) {
	return (
		<section className="card recent" aria-labelledby="recent-title">
			<h2 id="recent-title" className="card__title">Recientes</h2>
			{items.length === 0 ? (
				<p className="recent__empty">Aquí verás a los últimos alumnos que registres.</p>
			) : (
				<ul className="recent__list">
					{items.map(item => (
						<li key={item.id} className="recent__item">
							<Avatar name={item.nombre} src={item.foto_url} size={40} />
							<div className="recent__text">
								<span className="recent__name">{item.nombre}</span>
								<span className="recent__meta">
									<span className={`dot dot--${item.tone}`} aria-hidden="true" />
									{item.label} · {item.time}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
