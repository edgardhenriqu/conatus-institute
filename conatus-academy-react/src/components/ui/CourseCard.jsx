import { Link } from 'react-router-dom';
import { Badge } from './Badge';

export function CourseCard({ curso, variant = 'catalog' }) {
  const isFree = curso.gratuito;
  const isInternal = curso.tipo === 'interno';

  // For homepage carousel
  if (variant === 'carousel') {
    return (
      <div className="program-card">
        <img 
          src={`/${curso.image || 'images/datacenter-hero.png'}`} 
          alt={curso.nome} 
          className="card-image"
          onError={(e) => { e.target.src = '/images/datacenter-hero.png' }}
        />
        <div className="program-info">
          <h3>{curso.nome}</h3>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Badge variant="certification">Certificação Profissional</Badge>
            {isFree && <Badge variant="free">Gratuito</Badge>}
            {isInternal && <Badge variant="internal">Interno</Badge>}
          </div>
          
          <p>Carga horária: {curso.duracao}</p>
          <Link to={`/cursos/${curso.id}`} className="btn-small">Detalhes do Curso</Link>
        </div>
      </div>
    );
  }

  // Default catalog variant
  return (
    <div className="card">
      <Link to={`/cursos/${curso.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <img 
          src={`/${curso.image || 'images/datacenter-hero.png'}`} 
          alt={curso.nome} 
          className="card-image"
          style={{ cursor: 'pointer' }}
          onError={(e) => { e.target.src = '/images/datacenter-hero.png' }}
        />
      </Link>
      <div className="card-content">
        <h3>{curso.nome}</h3>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <Badge variant="certification">Certificação Profissional</Badge>
          {isFree && <Badge variant="free">Gratuito</Badge>}
          {isInternal && <Badge variant="internal">Interno</Badge>}
        </div>

        <p>Carga horária: <strong>{curso.duracao}</strong></p>
        
        <div className="card-buttons">
          <Link to={`/cursos/${curso.id}`} className="btn-card btn-outline">Saiba Mais</Link>
          <Link to={`/cursos/${curso.id}#matricular`} className="btn-card btn-fill">Matricular-se</Link>
        </div>
      </div>
    </div>
  );
}
