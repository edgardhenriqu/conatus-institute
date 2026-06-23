import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { staticCourses, normalizeDbCourse } from '../data/courses';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/PageLoader';
import { useToast } from '../components/ui/Toast';
import { mopCourseContent } from '../data/mopCourseContent';
import { calcLessonStats, quizStatus, isCertEligible, getStaticEnrollments, saveStaticEnrollments } from '../utils/mopProgress';
import { canAccessInternalCourse } from '../utils/permissions';

const INTERNAL_DENIED_MSG =
  'Este curso é exclusivo para funcionários autorizados da Conatus. Solicite liberação ao administrador.';

export function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);

  // MOP progress (only computed when viewing mop-interno)
  const isMopCourse = id === 'mop-interno' || id === '6';
  const allMopLessons = useMemo(() =>
    isMopCourse ? mopCourseContent.modules.flatMap(m => m.lessons) : [],
    [isMopCourse]);
  const mopStats = useMemo(() => calcLessonStats(allMopLessons), [allMopLessons]);
  const mopQuiz  = useMemo(() => quizStatus(), []);
  const mopCertOk = useMemo(() => isCertEligible(mopStats.pct), [mopStats.pct]);

  const isAlreadyEnrolled = useMemo(() => {
    if (!isMopCourse) return false;
    const se = getStaticEnrollments();
    return !!(se['mop-interno'] || se['6']);
  }, [isMopCourse]);

  useEffect(() => {
    async function loadCourse() {
      const staticCourse = staticCourses.find(c => c.id === id);
      if (staticCourse) {
        setCurso(staticCourse);
        setLoading(false);
        return;
      }

      try {
        const dbCourse = await api.getCurso(id);
        if (dbCourse.erro) {
          toast.error('Curso não encontrado.');
          navigate('/cursos');
          return;
        }
        setCurso(normalizeDbCourse(dbCourse));
      } catch (err) {
        if (err.message?.includes('exclusivo')) {
          setRestricted(true);
        } else {
          navigate('/cursos');
        }
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [id, navigate, toast]);

  useEffect(() => {
    if (location.hash === '#matricular' && curso) {
      handleMatricular();
    }
  }, [location, curso]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMatricular = async () => {
    if (!user) {
      toast.warning('Você precisa estar logado para se matricular.');
      navigate('/login');
      return;
    }

    if (curso.tipo === 'interno') {
      if (!canAccessInternalCourse(user)) {
        toast.error(INTERNAL_DENIED_MSG, 7000);
        return;
      }
      // If already enrolled — go straight to classroom
      if (isAlreadyEnrolled) {
        navigate(`/cursos/${id}/sala-de-aula`);
        return;
      }
    }

    if (curso.id === 'mop-interno' || curso.id === 6) {
      const staticEnrollments = getStaticEnrollments();
      if (!staticEnrollments[curso.id]) {
        staticEnrollments[curso.id] = {
          curso_id: curso.id,
          nome_curso: curso.nome,
          duracao: curso.duracao,
          image: curso.image,
          status: 'em_andamento',
          progresso: 0,
          data_matricula: new Date().toISOString(),
          tipo: 'estatico',
        };
        saveStaticEnrollments(staticEnrollments);
      }
      navigate(`/cursos/${id}/sala-de-aula`);
      return;
    }

    try {
      const data = await api.matricular(curso.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Matrícula realizada com sucesso! Bons estudos. 🎓');
      navigate(`/cursos/${curso.id}/sala-de-aula`);
    } catch (err) {
      if (err.message?.includes('já está matriculado')) {
        navigate(`/cursos/${curso.id}/sala-de-aula`);
        return;
      }
      toast.error(err.message || 'Erro ao realizar matrícula. Tente novamente.');
    }
  };

  if (loading || authLoading) return <PageLoader message="Carregando informações do curso..." />;

  if (restricted) {
    return (
      <div className="cert-page">
        <div className="cert-locked">
          <div className="cert-locked-icon">🔒</div>
          <h2>Acesso Restrito</h2>
          <p>{INTERNAL_DENIED_MSG}</p>
          <Link to="/cursos" className="btn-cert-print">← Voltar ao Catálogo</Link>
        </div>
      </div>
    );
  }

  if (!curso) return <PageLoader message="Carregando informações do curso..." />;

  const isFree = curso.gratuito;
  const isInternal = curso.tipo === 'interno';

  if (isInternal && !user) {
    navigate('/login', { state: { from: `/cursos/${id}` } });
    return null;
  }
  const canAccess = !isInternal || canAccessInternalCourse(user);

  return (
    <div className="curso-detalhe-body">
      <div className="curso-hero">
        <div className="curso-hero-container">
          <div className="curso-hero-info">
            <Link to="/cursos" className="back-link">← Voltar aos Cursos</Link>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {isFree && <Badge variant="free">Gratuito</Badge>}
              {isInternal && <Badge variant="internal">Uso Interno</Badge>}
            </div>

            <h1>{curso.nome}</h1>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span className="badge-duracao">🕐 {curso.duracao}</span>
              <span className="badge-duracao">📊 {curso.nivel || (isFree ? 'Introdutório' : 'Profissional')}</span>
              {isMopCourse && (
                <span className="badge-duracao">📚 {mopCourseContent.modules.length} módulos</span>
              )}
              {!isMopCourse && Number(curso.total_modulos) > 0 && (
                <span className="badge-duracao">📚 {curso.total_modulos} módulos · {curso.total_aulas} aulas</span>
              )}
              {curso.categoria && (
                <span className="badge-duracao">🏷 {curso.categoria}</span>
              )}
            </div>

            <p>{curso.descricao}</p>

            {isInternal && canAccess && (
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid var(--secondary)' }}>
                <strong>Acesso Restrito:</strong> {curso.regrasAcesso}
              </div>
            )}

            {isInternal && !canAccess && (
              <div style={{ background: 'rgba(139,0,0,0.35)', padding: '18px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid #ffb3b3' }}>
                <strong>🔒 Acesso Restrito</strong>
                <p style={{ marginTop: '6px', fontSize: '0.97rem' }}>{INTERNAL_DENIED_MSG}</p>
              </div>
            )}

            {/* MOP requirements box */}
            {isMopCourse && canAccess && (
              <div className="cd-requirements-box">
                <h4>Requisitos para Certificado</h4>
                <div className="cd-req-item">
                  <span className={`cd-req-icon ${mopStats.pct === 100 ? 'ok' : 'pend'}`}>
                    {mopStats.pct === 100 ? '✅' : '○'}
                  </span>
                  <span>100% das aulas concluídas
                    {mopStats.total > 0 && <span className="cd-req-note"> ({mopStats.done}/{mopStats.total})</span>}
                  </span>
                </div>
                <div className="cd-req-item">
                  <span className={`cd-req-icon ${mopQuiz.passed ? 'ok' : 'pend'}`}>
                    {mopQuiz.passed ? '✅' : '○'}
                  </span>
                  <span>Aprovação na avaliação final ≥ 80%
                    {mopQuiz.attempts > 0 && <span className="cd-req-note"> (melhor nota: {mopQuiz.best}%, {mopQuiz.attempts}/3 tentativas)</span>}
                  </span>
                </div>
                {mopCertOk && (
                  <p style={{ marginTop: '10px', color: 'var(--success)', fontWeight: 700 }}>
                    🏆 Certificado disponível! Acesse o Dashboard para emitir.
                  </p>
                )}
              </div>
            )}

            {canAccess ? (
              <button
                className="btn-matricular"
                onClick={handleMatricular}
                style={{ marginTop: '30px' }}
              >
                {isMopCourse && isAlreadyEnrolled
                  ? 'Continuar Curso →'
                  : isInternal
                    ? 'Acessar Curso →'
                    : 'Matricule-se Agora'}
              </button>
            ) : (
              <Link to="/cursos" className="btn-matricular" style={{ marginTop: '30px', opacity: 0.9 }}>
                ← Voltar ao Catálogo
              </Link>
            )}
          </div>

          <img
            src={`/${curso.image || 'images/datacenter-hero.png'}`}
            className="curso-hero-img"
            alt={curso.nome}
            onError={(e) => { e.target.src = '/images/datacenter-hero.png'; }}
          />
        </div>
      </div>

      <div className="curso-conteudo">
        {curso.objetivo && (
          <div className="curso-section">
            <h2>Objetivo do Curso</h2>
            <p>{curso.objetivo}</p>
          </div>
        )}

        {curso.oque_aprender && (
          <div className="curso-section">
            <h2>O que você vai aprender?</h2>
            <div style={{ whiteSpace: 'pre-line' }}>{curso.oque_aprender}</div>
          </div>
        )}

        {(curso.publicoAlvo || curso.publico_alvo) && (
          <div className="curso-section">
            <h2>Público-alvo</h2>
            <p>{curso.publicoAlvo || curso.publico_alvo}</p>
          </div>
        )}

        {curso.requisitos && (
          <div className="curso-section">
            <h2>Requisitos para Participar</h2>
            <div style={{ whiteSpace: 'pre-line' }}>{curso.requisitos}</div>
          </div>
        )}

        {curso.requisitos_certificado && (
          <div className="curso-section">
            <h2>Requisitos para o Certificado</h2>
            <div style={{ whiteSpace: 'pre-line' }}>{curso.requisitos_certificado}</div>
          </div>
        )}

        {curso.mercado_trabalho && (
          <div className="curso-section">
            <h2>Mercado de Trabalho</h2>
            <p>{curso.mercado_trabalho}</p>
          </div>
        )}

        {curso.matriz_curricular && (
          <div className="curso-section">
            <h2>Matriz Curricular</h2>
            <div className="matriz-grid">
              {curso.matriz_curricular.split('\n').map((modulo, i) => {
                if (!modulo.trim()) return null;
                const partes = modulo.split(':');
                const titulo = partes[0] || `Módulo ${i + 1}`;
                const conteudo = partes.slice(1).join(':').trim() || '';
                return (
                  <div key={i} className="modulo-card">
                    <h4>{titulo}</h4>
                    {conteudo && <p>{conteudo}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {curso.diferenciais && (
          <div className="curso-section">
            <h2>Diferenciais</h2>
            <div style={{ whiteSpace: 'pre-line' }}>{curso.diferenciais}</div>
          </div>
        )}

        {curso.informacoes_complementares && (
          <div className="curso-section">
            <h2>Informações Complementares</h2>
            <div style={{ whiteSpace: 'pre-line' }}>{curso.informacoes_complementares}</div>
          </div>
        )}
      </div>
    </div>
  );
}
