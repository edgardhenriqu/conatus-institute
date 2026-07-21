import { Link } from 'react-router-dom';
import { Badge } from './Badge';
import { InterestButton } from './InterestButton';
import { formatarPreco, precoVigente } from '../../utils/currency';

/** Nível padrão quando o curso não define um. */
function courseLevel(curso) {
  if (curso.nivel) return curso.nivel;
  if (curso.restrito) return 'Avançado';
  return curso.gratuito ? 'Introdutório' : 'Profissional';
}

/**
 * Card de curso usado no catálogo, na home (carousel) e no dashboard.
 * `enrollment` (opcional): { progresso, status } — quando presente, mostra
 * barra de progresso e troca o CTA para "Continuar curso".
 */
export function CourseCard({ curso, variant = 'catalog', enrollment = null }) {
  const isFree = curso.gratuito;
  const isInternal = curso.restrito;
  const isPaid = curso.pago;
  const isSoon = curso.emBreve;
  const nivel = courseLevel(curso);
  const progresso = enrollment ? Math.min(100, enrollment.progresso || 0) : null;
  const concluido = progresso === 100;

  // Preço no card: só para curso pago que o aluno ainda não possui e sem
  // "ocultar preço" marcado no painel de venda.
  const mostrarPreco = isPaid && !isSoon && !curso.possuiCurso && !enrollment && !curso.ocultar_preco && curso.preco != null;
  const temPromo = mostrarPreco && curso.preco_promocional != null;

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
      {isSoon && <Badge variant="soon">Em Breve</Badge>}
      {!isSoon && isFree && <Badge variant="free">Gratuito</Badge>}
      {!isSoon && isInternal && <Badge variant="internal">Restrito</Badge>}
      {!isSoon && isPaid && <Badge variant="paid">Curso Pago</Badge>}
      {isPaid && curso.destaque_promocao && curso.preco_promocional != null && !curso.possuiCurso && (
        <span className="ccard-promo-tag">Promoção</span>
      )}
      {enrollment && (
        <span className={`ccard-status ${concluido ? 'done' : 'progress'}`}>
          {concluido ? '✓ Concluído' : 'Em andamento'}
        </span>
      )}
    </div>
  );

  const meta = (
    <div className="ccard-meta">
      {curso.duracao && <span className="ccard-meta-item" title="Carga horária">🕐 {curso.duracao}</span>}
      <span className="ccard-meta-item" title="Nível">📊 {nivel}</span>
    </div>
  );

  const priceTag = mostrarPreco && (
    <div className="ccard-preco">
      {temPromo && <s className="ccard-preco-antigo">{formatarPreco(curso.preco, curso.moeda)}</s>}
      <strong className="ccard-preco-atual">{formatarPreco(precoVigente(curso), curso.moeda)}</strong>
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
        {priceTag}
        {progressBar}
        {isSoon && <p className="ccard-soon-hint">🚀 Lançamento em breve</p>}
        <div className="card-buttons">
          {isSoon ? (
            <>
              <Link to={`/cursos/${curso.id}`} className="btn-card btn-outline">Saiba Mais</Link>
              <InterestButton curso={curso} size="md" />
            </>
          ) : enrollment ? (
            <Link to={`/cursos/${curso.id}/sala-de-aula`} className="btn-card btn-fill">
              {concluido ? 'Revisar curso' : 'Continuar curso'}
            </Link>
          ) : isPaid && !curso.possuiCurso ? (
            <>
              <Link to={`/cursos/${curso.id}`} className="btn-card btn-outline">Saiba Mais</Link>
              <Link to={`/cursos/${curso.id}`} className="btn-card btn-fill">Comprar curso</Link>
            </>
          ) : (
            <>
              <Link to={`/cursos/${curso.id}`} className="btn-card btn-outline">Saiba Mais</Link>
              <Link to={`/cursos/${curso.id}#matricular`} className="btn-card btn-fill">
                {isPaid ? 'Continuar curso' : isInternal ? 'Acessar curso' : 'Matricular-se'}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
