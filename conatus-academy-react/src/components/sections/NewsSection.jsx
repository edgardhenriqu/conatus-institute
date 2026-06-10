export function NewsSection() {
  return (
    <section id="news" className="section news-section">
      <div className="section-header">
        <h2>Notícias & Eventos Acadêmicos</h2>
      </div>
      <div className="news-grid">
        <article className="news-card">
          <div className="news-date">15 MAIO 2026</div>
          <h3>Simpósio Internacional de Refrigeração Líquida</h3>
          <p>Pesquisadores do Conatus apresentam novas métricas de eficiência térmica em ambientes de alta densidade.</p>
        </article>
        <article className="news-card">
          <div className="news-date">22 ABR 2026</div>
          <h3>Nova Parceria com Fabricantes de Geradores</h3>
          <p>Inauguração do laboratório de testes de continuidade de energia e sistemas UPS de última geração.</p>
        </article>
        <article className="news-card">
          <div className="news-date">10 ABR 2026</div>
          <h3>Turma de 2025 Bate Recorde de Colocação</h3>
          <p>98% dos graduados empregados em menos de 3 meses após a conclusão dos programas de certificação.</p>
        </article>
      </div>
    </section>
  );
}
