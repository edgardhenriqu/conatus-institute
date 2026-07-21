import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { staticCourses, normalizeDbCourse } from '../data/courses';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/Badge';
import { InterestButton } from '../components/ui/InterestButton';
import { PageLoader } from '../components/ui/PageLoader';
import { useToast } from '../components/ui/Toast';
import { mopCourseContent } from '../data/mopCourseContent';
import { calcLessonStats, quizStatus, isCertEligible, getStaticEnrollments, saveStaticEnrollments } from '../utils/mopProgress';
import { formatarPreco, formatarParcelamento, precoVigente } from '../utils/currency';

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
  const [comprando, setComprando] = useState(false);

  // MOP progress (only computed when viewing the legacy static MOP route).
  // Atenção: NÃO incluir o id '6' aqui — hoje o id 6 é um curso do banco
  // (Huawei Module800). O curso MOP migrou para o banco (id 1) e usa o fluxo
  // normal de matrícula; só a rota estática legada 'mop-interno' usa localStorage.
  const isMopCourse = id === 'mop-interno';
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

  // Compra de curso pago: hoje o gateway não está configurado e o servidor
  // responde 501 com uma mensagem amigável; quando houver gateway, a resposta
  // trará { checkout: { url } } e o aluno é redirecionado ao provedor.
  const handleComprar = async () => {
    if (!user) {
      toast.warning('Você precisa estar logado para comprar o curso.');
      navigate('/login', { state: { from: `/cursos/${id}` } });
      return;
    }
    setComprando(true);
    try {
      const data = await api.comprarCurso(curso.id);
      if (data.checkout?.url) {
        window.location.href = data.checkout.url;
        return;
      }
      toast.info('Compra iniciada. Siga as instruções de pagamento.');
    } catch (err) {
      toast.info(err.message || 'O pagamento online ainda não está disponível.');
    } finally {
      setComprando(false);
    }
  };

  const handleMatricular = async () => {
    // Curso pago sem posse: o CTA correto é a compra, nunca a matrícula
    // (o backend também bloqueia — isto só evita um 403 desnecessário).
    if (curso?.pago && !curso.possuiCurso) {
      handleComprar();
      return;
    }
    if (!user) {
      toast.warning('Você precisa estar logado para se matricular.');
      navigate('/login');
      return;
    }

    // Cursos restritos (empresa parceira, funcionários Conatus, usuários liberados)
    // são controlados pelo BACKEND (accessControl.js). Se o curso chegou até aqui,
    // o acesso já foi liberado. NÃO reaplicamos regra de cargo no frontend — era
    // isso que ignorava o vínculo de empresa parceira e barrava alunos autorizados.
    if (isMopCourse && isAlreadyEnrolled) {
      navigate(`/cursos/${id}/sala-de-aula`);
      return;
    }

    if (isMopCourse) {
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
  const isRestrito = curso.restrito;
  const isSoon = curso.emBreve;

  // Curso restrito exige login. O acesso em si é decidido pelo BACKEND: o curso só
  // é carregado por api.getCurso se o usuário puder acessá-lo (público, empresa
  // parceira, funcionário ou liberação individual). Se chegamos aqui, pode acessar.
  // Exceção: cursos "em breve" são vitrines públicas de captação de interesse.
  if (isRestrito && !user && !isSoon) {
    navigate('/login', { state: { from: `/cursos/${id}` } });
    return null;
  }

  return (
    <div className="curso-detalhe-body">
      <div className="curso-hero">
        <div className="curso-hero-container">
          <div className="curso-hero-info">
            <Link to="/cursos" className="back-link">← Voltar aos Cursos</Link>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {isSoon && <Badge variant="soon">Em Breve</Badge>}
              {!isSoon && isFree && <Badge variant="free">Gratuito</Badge>}
              {!isSoon && isRestrito && <Badge variant="internal">Acesso Restrito</Badge>}
              {!isSoon && curso.pago && <Badge variant="paid">Curso Pago</Badge>}
            </div>

            <h1>{curso.nome}</h1>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {curso.duracao && <span className="badge-duracao">🕐 {curso.duracao}</span>}
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

            {isRestrito && curso.regrasAcesso && (
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '15px', borderRadius: '8px', marginTop: '15px', borderLeft: '4px solid var(--secondary)' }}>
                <strong>Acesso Restrito:</strong> {curso.regrasAcesso}
              </div>
            )}

            {/* MOP requirements box */}
            {isMopCourse && (
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

            {/* Vitrine "Em breve" — captação de interesse */}
            {isSoon && (
              <div className="cd-soon-box">
                <span className="cd-soon-tag">🚀 Lançamento em breve</span>
                <p className="cd-soon-text">
                  Este curso ainda não foi lançado. Registre seu interesse e
                  avisaremos você assim que ele estiver disponível.
                </p>
                <InterestButton curso={curso} size="lg" />
              </div>
            )}

            {/* Vitrine de venda — curso pago que o aluno ainda não possui */}
            {!isSoon && curso.pago && !curso.possuiCurso && (
              <div className="cd-preco-box">
                {curso.destaque_promocao && curso.preco_promocional != null && (
                  <span className="cd-preco-destaque">🔥 Oferta por tempo limitado</span>
                )}
                {!curso.ocultar_preco && curso.preco != null ? (
                  <div className="cd-preco-valores">
                    {curso.preco_promocional != null && (
                      <s className="cd-preco-antigo">{formatarPreco(curso.preco, curso.moeda)}</s>
                    )}
                    <strong className="cd-preco-atual">{formatarPreco(precoVigente(curso), curso.moeda)}</strong>
                    {formatarParcelamento(precoVigente(curso), curso.max_parcelas, curso.moeda) && (
                      <span className="cd-preco-parcelas">
                        ou {formatarParcelamento(precoVigente(curso), curso.max_parcelas, curso.moeda)}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="cd-preco-consulte">Consulte as condições de compra.</p>
                )}
                {curso.mensagem_compra && <p className="cd-preco-msg">{curso.mensagem_compra}</p>}
              </div>
            )}

            {isSoon ? null : curso.pago && !curso.possuiCurso ? (
              <button
                className="btn-matricular"
                onClick={handleComprar}
                disabled={comprando}
                style={{ marginTop: '20px' }}
              >
                {comprando ? 'Processando...' : '🛒 Comprar Curso'}
              </button>
            ) : (
              <button
                className="btn-matricular"
                onClick={handleMatricular}
                style={{ marginTop: '30px' }}
              >
                {isMopCourse
                  ? (isAlreadyEnrolled ? 'Continuar Curso →' : 'Acessar Curso →')
                  : curso.pago ? 'Continuar Curso →' : 'Matricule-se Agora'}
              </button>
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
