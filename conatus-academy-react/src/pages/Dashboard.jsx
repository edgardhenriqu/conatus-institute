import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/PageLoader';
import { mopCourseContent } from '../data/mopCourseContent';
import {
  calcLessonStats, quizStatus, isCertEligible, certBlockReason,
  canTakeQuiz, getStaticEnrollments,
} from '../utils/mopProgress';

const MOP_ID = 'mop-interno';
const isMopId = (cursoId) => cursoId === MOP_ID || cursoId === '6' || cursoId === 6;

export function Dashboard() {
  const { user } = useAuth();
  const [matriculas, setMatriculas] = useState([]);
  const [dbCertCount, setDbCertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // All MOP lessons (for progress calc)
  const allMopLessons = useMemo(() =>
    mopCourseContent.modules.flatMap(m => m.lessons), []);

  // MOP progress (live from localStorage)
  const mopStats  = useMemo(() => calcLessonStats(allMopLessons), [allMopLessons]);
  const mopQuiz   = useMemo(() => quizStatus(), []);
  const mopCertOk = useMemo(() => isCertEligible(mopStats.pct), [mopStats.pct]);
  const mopQuizOk = useMemo(() => canTakeQuiz(mopStats.pct), [mopStats.pct]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getMatriculas();
        const dbMatriculas = data.matriculas || [];
        const staticList = Object.values(getStaticEnrollments());
        setMatriculas([...dbMatriculas, ...staticList]);
      } catch {
        setMatriculas(Object.values(getStaticEnrollments()));
      } finally {
        setLoading(false);
      }
    }
    async function loadCerts() {
      try {
        const data = await api.getCertificadosAluno();
        setDbCertCount((data.certificados || []).length);
      } catch {
        setDbCertCount(0);
      }
    }
    loadData();
    loadCerts();
  }, []);

  // Enrich static MOP enrollment with real progress
  const enrichedMatriculas = useMemo(() =>
    matriculas.map(m => {
      if (isMopId(m.curso_id) && m.tipo === 'estatico') {
        return { ...m, progresso: mopStats.pct };
      }
      return m;
    }), [matriculas, mopStats.pct]);

  const hasMopEnrollment = useMemo(() =>
    enrichedMatriculas.some(m => isMopId(m.curso_id)),
    [enrichedMatriculas]);

  // MOP só é "concluído" quando 100% aulas + quiz aprovado
  const concluidos = enrichedMatriculas.filter(m => {
    if (isMopId(m.curso_id)) return mopCertOk;
    return (m.progresso || 0) === 100;
  }).length;
  const emAndamento = enrichedMatriculas.length - concluidos;
  // Certificados emitidos: cursos do banco (tabela certificados) + MOP estático.
  const certificados = dbCertCount + (mopCertOk ? 1 : 0);

  // Próximas etapas recomendadas
  const nextSteps = useMemo(() => {
    const steps = [];
    if (hasMopEnrollment) {
      if (mopStats.pct < 100) {
        steps.push({
          icon: '📚',
          title: 'Continue as aulas do curso de MOPs',
          desc: `Você concluiu ${mopStats.pct}% deste curso (${mopStats.done} de ${mopStats.total} aulas).`,
          to: `/cursos/${MOP_ID}/sala-de-aula`,
        });
      } else if (!mopQuiz.passed && mopQuizOk.ok) {
        steps.push({
          icon: '📝',
          title: 'Faça a avaliação final',
          desc: `Aulas 100% concluídas! Você precisa de ${80}% para aprovação (${mopQuiz.remaining} tentativas restantes).`,
          to: `/cursos/${MOP_ID}/avaliacao`,
        });
      } else if (mopCertOk) {
        steps.push({
          icon: '🏆',
          title: 'Emita seu certificado',
          desc: 'Você cumpriu todos os requisitos do curso de MOPs. Parabéns!',
          to: `/cursos/${MOP_ID}/certificado`,
        });
      }
    }
    if (enrichedMatriculas.length === 0) {
      steps.push({
        icon: '🎓',
        title: 'Matricule-se no seu primeiro curso',
        desc: 'Explore o catálogo e comece sua jornada em infraestrutura crítica.',
        to: '/cursos',
      });
    }
    steps.push({
      icon: '✨',
      title: 'Explore os cursos gratuitos',
      desc: 'Conteúdos introdutórios sem custo para expandir seu conhecimento.',
      to: '/cursos#gratuitos',
    });
    return steps.slice(0, 3);
  }, [hasMopEnrollment, mopStats, mopQuiz, mopQuizOk, mopCertOk, enrichedMatriculas.length]);

  if (loading) return <PageLoader message="Carregando seu painel..." />;

  return (
    <div className="dashboard-body">
      <div className="dashboard-container">

        {/* Welcome */}
        <header className="welcome-header">
          <h1>Bem-vindo, {user?.nome?.split(' ')[0] || 'Aluno'}</h1>
          <p>Acompanhe seu progresso acadêmico no Conatus Institute.</p>
        </header>

        {/* Stats */}
        <div className="stats-row stats-row-4">
          <div className="stat-card">
            <h3>{enrichedMatriculas.length}</h3>
            <p>Cursos Matriculados</p>
          </div>
          <div className="stat-card">
            <h3 style={{ color: 'var(--info)' }}>{emAndamento}</h3>
            <p>Em Andamento</p>
          </div>
          <div className="stat-card">
            <h3 style={{ color: 'var(--success)' }}>{concluidos}</h3>
            <p>Cursos Concluídos</p>
          </div>
          <div className="stat-card">
            <h3 style={{ color: 'var(--gold)' }}>{certificados}</h3>
            <p>Certificados</p>
          </div>
        </div>

        {/* Próximas etapas */}
        {nextSteps.length > 0 && (
          <section className="next-steps">
            <h2>🧭 Próximas Etapas Recomendadas</h2>
            <div className="next-steps-list">
              {nextSteps.map((s, i) => (
                <Link key={i} to={s.to} className="next-step-item">
                  <span className="next-step-icon">{s.icon}</span>
                  <span>
                    <strong>{s.title}</strong>
                    <p>{s.desc}</p>
                  </span>
                  <span className="next-step-arrow">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* MOP Course Panel — only for conatus employees / admin */}
        {hasMopEnrollment && (
          <section className="mop-panel">
            <div className="mop-panel-header">
              <div>
                <span className="mop-badge-internal">Curso Interno</span>
                <h2>Especialização Operacional: Elaboração de MOPs para Data Centers</h2>
              </div>
              <Link to={`/cursos/${MOP_ID}/sala-de-aula`} className="btn-access-course">
                Acessar Aulas
              </Link>
            </div>

            {/* Progress bar */}
            <div className="mop-progress-section">
              <div className="mop-progress-labels">
                <span>Você concluiu <strong>{mopStats.pct}%</strong> deste curso</span>
                <strong>{mopStats.pct}%</strong>
              </div>
              <div className="mop-progress-bar">
                <div className="mop-progress-fill" style={{ width: `${mopStats.pct}%` }} />
              </div>
              <span className="mop-progress-detail">{mopStats.done} de {mopStats.total} aulas</span>
            </div>

            {/* Status cards */}
            <div className="mop-status-grid">

              {/* Aulas */}
              <div className={`mop-status-card ${mopStats.pct === 100 ? 'done' : 'pending'}`}>
                <div className="mop-status-icon">{mopStats.pct === 100 ? '✅' : '📚'}</div>
                <div>
                  <strong>Aulas</strong>
                  <p>{mopStats.pct === 100 ? 'Todas concluídas' : `${mopStats.pct}% concluído`}</p>
                </div>
              </div>

              {/* Avaliação */}
              <div className={`mop-status-card ${mopQuiz.passed ? 'done' : mopQuiz.attempts > 0 ? 'fail' : 'pending'}`}>
                <div className="mop-status-icon">
                  {mopQuiz.passed ? '✅' : mopQuiz.attempts > 0 ? '❌' : '📝'}
                </div>
                <div>
                  <strong>Avaliação Final</strong>
                  {mopQuiz.passed && <p>Aprovado — {mopQuiz.best}%</p>}
                  {!mopQuiz.passed && mopQuiz.attempts > 0 && (
                    <p>Melhor nota: {mopQuiz.best}% ({mopQuiz.attempts}/{3} tentativas)</p>
                  )}
                  {mopQuiz.attempts === 0 && <p>Não realizada</p>}
                </div>
                {mopQuizOk.ok && (
                  <Link to={`/cursos/${MOP_ID}/avaliacao`} className="mop-status-action">
                    {mopQuiz.attempts === 0 ? 'Fazer Avaliação' : 'Nova Tentativa'}
                  </Link>
                )}
                {!mopQuizOk.ok && mopStats.pct < 100 && (
                  <span className="mop-status-locked">Conclua 100% das aulas</span>
                )}
              </div>

              {/* Certificado */}
              <div className={`mop-status-card ${mopCertOk ? 'done' : 'locked'}`}>
                <div className="mop-status-icon">{mopCertOk ? '🏆' : '🔒'}</div>
                <div>
                  <strong>Certificado</strong>
                  {mopCertOk
                    ? <p>Disponível para emissão!</p>
                    : <p className="cert-block-reason">{certBlockReason(mopStats.pct)}</p>
                  }
                </div>
                {mopCertOk && (
                  <Link to={`/cursos/${MOP_ID}/certificado`} className="mop-status-action">
                    Ver Certificado
                  </Link>
                )}
              </div>

            </div>
          </section>
        )}

        {/* Other courses list */}
        <section className="courses-section" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Meus Cursos</h2>
            <Button variant="outline" to="/cursos" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              Explorar mais cursos
            </Button>
          </div>

          {(() => {
            const otherCourses = enrichedMatriculas.filter(m => !isMopId(m.curso_id));
            if (otherCourses.length === 0) return (
              <div className="empty-state">
                <p>
                  {enrichedMatriculas.length > 0
                    ? 'Todos os seus cursos estão no painel acima.'
                    : 'Você ainda não está matriculado em nenhum curso.'}
                </p>
                <Button variant="primary" to="/cursos">Ver Catálogo de Cursos</Button>
              </div>
            );
            return (
              <div className="courses-list">
                {otherCourses.map((m) => {
                  const prog = m.progresso || 0;
                  const statusLabel = prog === 100 ? 'Concluído' : 'Em andamento';
                  const statusColor = prog === 100 ? 'var(--success)' : 'var(--info)';

                  return (
                    <div key={m.curso_id} className="course-progress">
                      <div className="course-info">
                        <h4>{m.nome_curso}</h4>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: statusColor }}>
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Você concluiu {prog}% deste curso
                          </span>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${prog}%` }} />
                          </div>
                        </div>

                        <Link
                          to={`/cursos/${m.curso_id}/sala-de-aula`}
                          className="btn-certificate"
                          style={{ background: 'var(--primary)' }}
                        >
                          {prog === 100 ? 'Revisar' : 'Acessar'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

      </div>
    </div>
  );
}
