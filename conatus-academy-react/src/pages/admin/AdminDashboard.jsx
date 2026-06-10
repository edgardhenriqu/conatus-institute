import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export function AdminDashboard() {
  const [stats, setStats] = useState({ totalAlunos: 0, totalCursos: 0, totalMatriculas: 0, totalCertificados: 0 });
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
          setStats(dashboardData);
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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>;

  return (
    <div className="admin-body">
      <div className="admin-container">
        
        <header className="admin-header">
          <h1>Painel Administrativo</h1>
          <p>Visão geral da plataforma Conatus Institute</p>
        </header>

        <nav className="admin-nav">
          <Link to="/admin/dashboard" className="active">Dashboard</Link>
          <Link to="/admin/alunos">Alunos</Link>
          <Link to="/admin/cursos">Cursos</Link>
          <Link to="/admin/certificados">Certificados</Link>
        </nav>

        <div className="admin-stats">
          <div className="admin-stat-card">
            <h3>{stats.totalAlunos}</h3>
            <p>Alunos Ativos</p>
          </div>
          <div className="admin-stat-card">
            <h3>{stats.totalCursos}</h3>
            <p>Cursos Publicados</p>
          </div>
          <div className="admin-stat-card">
            <h3>{stats.totalMatriculas}</h3>
            <p>Matrículas Realizadas</p>
          </div>
          <div className="admin-stat-card">
            <h3 style={{ color: 'var(--success)' }}>{stats.totalCertificados}</h3>
            <p>Certificados Emitidos</p>
          </div>
        </div>

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Alunos Recentes</h2>
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
