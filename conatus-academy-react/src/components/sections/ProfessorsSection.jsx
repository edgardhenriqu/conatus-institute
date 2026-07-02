// === PROFESSOR EM DESTAQUE =========================================
// Para usar foto, coloque o arquivo em /public/images/professores/
// e aponte `foto` para o caminho (ex.: '/images/professores/giovanni-silva.jpg').
// Se `foto` ficar vazio, o card mostra as iniciais automaticamente.
const PROFESSOR = {
  nome: 'Giovanni Silva',
  cargo: 'VP of Engineering · Conatus Data Centers',
  subtitulo: 'Engenheiro Eletricista · Especialista em Infraestrutura Crítica de Data Centers',
  foto: '/images/professores/giovanni-silva.jpg',
  linkedin: 'https://www.linkedin.com/in/giovanni-silva-55ab04128/',
  bio: 'Giovanni Silva é VP of Engineering na Conatus Data Centers, com mais de uma década dedicada ao projeto, operação e manutenção da infraestrutura crítica de data centers. Atuou em empresas como Scala Data Centers e green4T, onde coordenou a operação e a manutenção de dezenas de data centers em todo o Brasil. Engenheiro eletricista com mestrado em Engenharia Elétrica pela UTFPR, é também instrutor na ABDC e professor de pós-graduação na Potência Educação, transformando experiência real de campo em conteúdo prático e aplicável.',
  competencias: [
    'Operação e manutenção de ambientes críticos (HVAC, energia, mecânica, geradores, UPS e PDU)',
    'Procedimentos operacionais MOP / SOP / EOP',
    'Gestão e coordenação de projetos de data center',
    'Automação predial, telemetria e sistemas CMMS/DCIM',
    'Confiabilidade e disponibilidade de infraestrutura crítica',
  ],
  atuacao: [
    'VP of Engineering — Conatus Data Centers',
    'Instrutor de Data Center — ABDC',
    'Professor de Pós-graduação — Potência Educação',
    'Ex-Engineering Coordinator — Scala Data Centers',
  ],
  formacao: [
    'Mestrado em Engenharia Elétrica — UTFPR (Universidade Tecnológica Federal do Paraná)',
    'MBA em Infraestrutura de Ambientes Críticos com Ênfase em Data Centers — Instituto BRPÓS',
    'Engenharia Elétrica — Universidade Anhembi Morumbi',
  ],
  certificacoes: [
    'CDCP® — Certified Data Centre Professional (EXIN)',
  ],
};

function iniciais(nome) {
  return nome
    .replace(/^(Eng\.|Dr\.|Dra\.|Prof\.)\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function ProfessorsSection() {
  const p = PROFESSOR;

  return (
    <section id="professores" className="section professors-section">
      <div className="section-header" data-reveal>
        <h2>Professores</h2>
        <p>Quem ensina na Conatus opera de verdade. Conheça o especialista por trás dos nossos cursos.</p>
      </div>

      <div className="professor-feature">
        <div className="professor-feature__media" data-reveal="left">
          {p.foto ? (
            <img className="professor-feature__photo" src={p.foto} alt={p.nome} />
          ) : (
            <div className="professor-feature__avatar" aria-hidden="true">{iniciais(p.nome)}</div>
          )}
        </div>

        <div className="professor-feature__info" data-reveal="right">
          <h3>{p.nome}</h3>
          <span className="professor-feature__role">{p.cargo}</span>
          {p.subtitulo && <span className="professor-feature__sub">{p.subtitulo}</span>}
          <p className="professor-feature__bio">{p.bio}</p>

          {p.competencias?.length > 0 && (
            <ul className="professor-feature__creds">
              {p.competencias.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          {p.linkedin && (
            <a
              className="professor-feature__link"
              href={p.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver perfil no LinkedIn →
            </a>
          )}
        </div>
      </div>

      <div className="professor-extra">
        <article className="professor-extra__card" data-reveal>
          <h4>Atuação atual</h4>
          <ul>
            {p.atuacao.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </article>

        <article className="professor-extra__card" data-reveal style={{ '--reveal-delay': '100ms' }}>
          <h4>Formação</h4>
          <ul>
            {p.formacao.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </article>

        <article className="professor-extra__card" data-reveal style={{ '--reveal-delay': '200ms' }}>
          <h4>Certificações</h4>
          <ul>
            {p.certificacoes.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </article>
      </div>
    </section>
  );
}
