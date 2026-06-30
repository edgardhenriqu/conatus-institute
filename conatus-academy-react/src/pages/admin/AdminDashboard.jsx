import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../../components/ui/PageLoader';

const EMPTY_STATS = {
  totalAlunos: 0, totalCursos: 0, totalMatriculas: 0, totalCertificados: 0,
  cursosPublicados: 0, cursosRascunho: 0, alunosEmAndamento: 0, alunosAprovados: 0,
};

const SHORTCUTS = [
  { to: '/admin/cursos',       icon: '➕', title: 'Criar novo curso',   desc: 'Monte um curso completo com módulos, aulas e avaliação' },
  { to: '/admin/cursos',       icon: '📚', title: 'Gerenciar cursos',   desc: 'Edite, publique, duplique ou desative cursos' },
  { to: '/admin/alunos',       icon: '👥', title: 'Ver alunos',         desc: 'Gerencie usuários, perfis e permissões de acesso' },
  { to: '/admin/certificados', icon: '🏆', title: 'Certificados',       desc: 'Consulte e valide certificados emitidos' },
];

export function AdminDashboard() {
  const { isInstrutor } = useAuth();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dashboardData, alunosData] = await Promise.all([
          api.getAdminDashboard(),
          api.getAdminAlunos()
        ]);

        if (dashboardData && !dashboardData.erro) {
          setStats({ ...EMPTY_STATS, ...dashboardData });
        }

        if (alunosData && alunosData.alunos) {
          setAlunos(alunosData.alunos);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do admin:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (isInstrutor) return <Navigate to="/admin/cursos" replace />;

  if (loading) return <PageLoader message="Carregando painel administrativo..." />;

  const cards = [
    { value: stats.totalCursos,       label: 'Cursos Cadastrados' },
    { value: stats.cursosPublicados,  label: 'Cursos Publicados',  color: 'var(--success)' },
    { value: stats.cursosRascunho,    label: 'Em Rascunho',        color: '#b45309' },
    { value: stats.totalAlunos,       label: 'Alunos Cadastrados' },
    { value: stats.totalMatriculas,   label: 'Matrículas' },
    { value: stats.alunosEmAndamento, label: 'Alunos em Andamento', color: 'var(--info)' },
    { value: stats.alunosAprovados,   label: 'Alunos Aprovados',   color: 'var(--success)' },
    { value: stats.totalCertificados, label: 'Certificados Emitidos', color: 'var(--gold)' },
  ];

  return (
    <div className="admin-body">
      <div className="admin-container">

        <header className="admin-header">
          <h1>Painel Administrativo</h1>
          <p>Visão geral da plataforma Conatus Institute</p>
        </header>

        <div className="admin-stats">
          {cards.map((c, i) => (
            <div className="admin-stat-card" key={i}>
              <h3 style={c.color ? { color: c.color } : undefined}>{c.value}</h3>
              <p>{c.label}</p>
            </div>
          ))}
        </div>

        {/* Atalhos */}
        <div className="next-steps" style={{ marginBottom: '30px' }}>
          <h2>⚡ Atalhos</h2>
          <div className="next-steps-list">
            {SHORTCUTS.map((s, i) => (
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
        </div>

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Alunos Recentes</h2>
            <Link to="/admin/alunos" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
              Ver todos →
            </Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Data Cadastro</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alunos.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    Nenhum aluno cadastrado ainda.
                  </td>
                </tr>
              ) : (
                alunos.slice(0, 5).map(aluno => (
                  <tr key={aluno.id}>
                    <td>{aluno.nome}</td>
                    <td>{aluno.email}</td>
                    <td>{new Date(aluno.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <span style={{ color: aluno.ativo !== false ? 'var(--success)' : 'var(--danger)' }}>
                        {aluno.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
