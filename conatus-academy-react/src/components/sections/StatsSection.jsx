const STATS = [
  { valor: '98%', rotulo: 'Taxa de Empregabilidade' },
  { valor: '150+', rotulo: 'Parceiros da Indústria' },
  { valor: '100%', rotulo: 'Online & Interativo' },
];

export function StatsSection() {
  return (
    <section id="stats" className="stats-section">
      <div className="stats-container">
        {STATS.map((s, i) => (
          <div
            className="stat-item"
            key={s.rotulo}
            data-reveal
            style={{ '--reveal-delay': `${i * 100}ms` }}
          >
            <h3>{s.valor}</h3>
            <p>{s.rotulo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
