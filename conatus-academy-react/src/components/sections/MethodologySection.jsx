const PILARES = [
  {
    icone: '🎯',
    titulo: 'Aprendizado Baseado em Casos Reais',
    texto: 'Conteúdo construído a partir de procedimentos e incidentes reais de operação em data centers — sem teoria genérica.',
  },
  {
    icone: '🛠️',
    titulo: 'Prática em Ambientes Simulados',
    texto: 'Laboratórios e simulações de cenários Tier III e Tier IV para treinar decisões sob pressão sem risco operacional.',
  },
  {
    icone: '📋',
    titulo: 'Padronização Conatus',
    texto: 'Todo procedimento segue um padrão único (MOP/SOP/EOP) com análise de risco, plano de rollback e checklist de qualidade.',
  },
  {
    icone: '✅',
    titulo: 'Avaliação e Certificação',
    texto: 'Trilha com avaliação teórica e nota mínima, garantindo domínio real do conteúdo antes da emissão do certificado.',
  },
];

const ETAPAS = [
  {
    titulo: 'Fundamentar',
    texto: 'Base técnica dos sistemas críticos: energia, refrigeração, proteção e redes.',
  },
  {
    titulo: 'Aplicar',
    texto: 'Elaboração de procedimentos reais com mentoria de especialistas do setor.',
  },
  {
    titulo: 'Validar',
    texto: 'Revisão técnica, dry run e simulação em ambiente controlado.',
  },
  {
    titulo: 'Certificar',
    texto: 'Avaliação final e emissão de certificado reconhecido e validável.',
  },
];

const PADROES = ['Uptime Institute', 'BICSI', 'ASHRAE'];

export function MethodologySection() {
  return (
    <section id="metodologia" className="section methodology-section">
      <div className="section-header" data-reveal>
        <h2>Nossa Metodologia</h2>
        <p>Como formamos profissionais prontos para operar a infraestrutura mais crítica do mundo.</p>
      </div>

      {/* Pilares */}
      <div className="methodology-grid">
        {PILARES.map((p, i) => (
          <article
            className="methodology-card"
            key={i}
            data-reveal
            style={{ '--reveal-delay': `${i * 90}ms` }}
          >
            <div className="methodology-card__icon" aria-hidden="true">{p.icone}</div>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </article>
        ))}
      </div>

      {/* Ciclo de aprendizagem */}
      <div className="methodology-cycle" data-reveal>
        <h3 className="methodology-cycle__title">O Ciclo de Aprendizagem Conatus</h3>
        <p className="methodology-cycle__lead">Padronização · Confiabilidade · Excelência Operacional</p>
        <div className="methodology-steps">
          {ETAPAS.map((e, i) => (
            <div
              className="methodology-step"
              key={i}
              data-reveal
              style={{ '--reveal-delay': `${i * 100}ms` }}
            >
              <span className="methodology-step__num">{i + 1}</span>
              <h4>{e.titulo}</h4>
              <p>{e.texto}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Padrões internacionais */}
      <div className="methodology-standards" data-reveal="fade">
        <span className="methodology-standards__label">Alinhado aos padrões internacionais</span>
        <div className="methodology-standards__list">
          {PADROES.map((nome) => (
            <span className="methodology-badge" key={nome}>{nome}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
