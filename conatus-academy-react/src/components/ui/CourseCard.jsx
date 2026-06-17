import { Link } from 'react-router-dom';
import { Badge } from './Badge';

/** Nível padrão quando o curso não define um. */
function courseLevel(curso) {
  if (curso.nivel) return curso.nivel;
  if (curso.tipo === 'interno') return 'Avançado';
  return curso.gratuito ? 'Introdutório' : 'Profissional';
}

/**
 * Card de curso usado no catálogo, na home (carousel) e no dashboard.
 * `enrollment` (opcional): { progresso, status } — quando presente, mostra
 * barra de progresso e troca o CTA para "Continuar curso".
 */
export function CourseCard({ curso, variant = 'catalog', enrollment = null }) {
  const isFree = curso.gratuito;
  const isInternal = curso.tipo === 'interno';
  const nivel = courseLevel(curso);
  const progresso = enrollment ? Math.min(100, enrollment.progresso || 0) : null;
  const concluido = progresso === 100;

  const image = (
    <img
      src={`/${curso.image || 'images/datacenter-hero.png'}`}
      alt={curso.nome}
      className="card-image"
      loading="lazy"
      onError={(e) => { e.target.src = '/images/datacenter-hero.png'; }}
    />
  );

  const badges = (
    <div className="ccard-badges">
      {isFree && <Badge variant="free">Gratuito</Badge>}
      {isInternal && <Badge variant="internal">Interno</Badge>}
      {enrollment && (
        <span className={`ccard-status ${concluido ? 'done' : 'progress'}`}>
          {concluido ? '✓ Concluído' : 'Em andamento'}
        </span>
      )}
    </div>
  );

  const meta = (
    <div className="ccard-meta">
      <span className="ccard-meta-item" title="Carga horária">🕐 {curso.duracao || '—'}</span>
      <span className="ccard-meta-item" title="Nível">📊 {nivel}</span>
    </div>
  );

  const progressBar = enrollment && (
    <div className="ccard-progress">
      <div className="ccard-progress-labels">
        <span>Progresso</span>
        <strong>{progresso}%</strong>
      </div>
      <div className="ccard-progress-bar">
        <div className="ccard-progress-fill" style={{ width: `${progresso}%` }} />
      </div>
    </div>
  );

  // Variante compacta para o carousel da home
  if (variant === 'carousel') {
    return (
      <div className="program-card">
        {image}
        <div className="program-info">
          <h3>{curso.nome}</h3>
          {badges}
          {meta}
          <Link to={`/cursos/${curso.id}`} className="btn-small">Detalhes do Curso →</Link>
        </div>
      </div>
    );
  }

  return (
    <article className="card ccard">
      <Link to={`/cursos/${curso.id}`} className="ccard-image-link" aria-label={curso.nome}>
        {image}
      </Link>
      <div className="card-content">
        {badges}
        <h3><Link to={`/cursos/${curso.id}`}>{curso.nome}</Link></h3>
        {curso.descricao && <p className="ccard-desc">{curso.descricao}</p>}
        {meta}
        {progressBar}
        <div className="card-buttons">
          {enrollment ? (
            <Link to={`/cursos/${curso.id}/sala-de-aula`} className="btn-card btn-fill">
              {concluido ? 'Revisar curso' : 'Continuar curso'}
            </Link>
          ) : (
            <>
              <Link to={`/cursos/${curso.id}`} className="btn-card btn-outline">Saiba Mais</Link>
              <Link to={`/cursos/${curso.id}#matricular`} className="btn-card btn-fill">
                {isInternal ? 'Acessar curso' : 'Matricular-se'}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
