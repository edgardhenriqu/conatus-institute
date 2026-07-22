import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/PageLoader';

export function Dashboard() {
  const { user } = useAuth();
  const [matriculas, setMatriculas] = useState([]);
  const [dbCertCount, setDbCertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getMatriculas();
        setMatriculas(data.matriculas || []);
      } catch {
        setMatriculas([]);
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

  const concluidos = matriculas.filter(m => (m.progresso || 0) === 100).length;
  const emAndamento = matriculas.length - concluidos;
  const certificados = dbCertCount;

  // Próximas etapas recomendadas
  const nextSteps = useMemo(() => {
    const steps = [];
    if (matriculas.length === 0) {
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
  }, [matriculas.length]);

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
            <h3>{matriculas.length}</h3>
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

        {/* Other courses list */}
        <section className="courses-section" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <h2>Meus Cursos</h2>
            <Button variant="outline" to="/cursos" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              Explorar mais cursos
            </Button>
          </div>

          {(() => {
            const otherCourses = matriculas;
            if (otherCourses.length === 0) return (
              <div className="empty-state">
                <p>Você ainda não está matriculado em nenhum curso.</p>
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px 20px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right', minWidth: 0 }}>
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
