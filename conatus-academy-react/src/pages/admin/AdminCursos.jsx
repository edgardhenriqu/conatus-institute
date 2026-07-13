import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { PageLoader } from '../../components/ui/PageLoader';

const STATUS_BADGE = {
  rascunho:  { label: 'Rascunho',  bg: '#f1f5f9', color: '#475569' },
  publicado: { label: 'Publicado', bg: '#dcfce7', color: '#166534' },
  inativo:   { label: 'Inativo',   bg: '#fee2e2', color: '#991b1b' },
};

const ACESSO_BADGE = {
  publico:  { label: 'Público',  bg: '#d4edda', color: '#155724' },
  restrito: { label: 'Restrito', bg: '#f8d7da', color: '#721c24' },
  pago:     { label: 'Pago',     bg: '#e3f2fd', color: '#0d47a1' },
};

function Pill({ map, value }) {
  const cfg = map[value] || map[Object.keys(map)[0]];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: '12px',
      fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

export function AdminCursos() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [busy, setBusy] = useState(false);
  const [matriculadosAbertos, setMatriculadosAbertos] = useState(null); // cursoId
  const [matriculados, setMatriculados] = useState([]);
  const [loadingMatriculados, setLoadingMatriculados] = useState(false);

  const carregarCursos = useCallback(async () => {
    setLoading(true);
    setErroCarregamento('');
    try {
      const data = await api.getAdminCursos();
      setCursos(data.cursos || []);
    } catch (err) {
      if (err.message?.includes('Token') || err.message?.includes('401') || err.message?.includes('403')) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setErroCarregamento(err.message || 'Erro ao carregar cursos. O servidor está rodando?');
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { carregarCursos(); }, [carregarCursos]);

  async function handleCriar() {
    setBusy(true);
    try {
      const data = await api.createAdminCurso({
        nome: 'Novo curso (rascunho)',
        duracao: '0h',
        status: 'rascunho',
      });
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Rascunho criado! Preencha as informações do curso.');
      navigate(`/admin/cursos/${data.curso.id}/editar`);
    } catch (err) {
      toast.error(err.message || 'Erro ao criar curso.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerAlunos(curso) {
    if (matriculadosAbertos === curso.id) {
      setMatriculadosAbertos(null);
      return;
    }
    setMatriculadosAbertos(curso.id);
    setLoadingMatriculados(true);
    try {
      const data = await api.getAdminCursoMatriculados(curso.id);
      setMatriculados(data.matriculados || []);
    } catch {
      toast.error('Erro ao carregar alunos do curso.');
    } finally {
      setLoadingMatriculados(false);
    }
  }

  async function handleDuplicar(curso) {
    try {
      const data = await adminApi.duplicateCourse(curso.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success(`Curso duplicado como rascunho: "${data.curso.nome}".`);
      await carregarCursos();
    } catch {
      toast.error('Erro ao duplicar curso.');
    }
  }

  async function handleToggleAtivo(curso) {
    const novoStatus = curso.status === 'inativo' ? 'rascunho' : 'inativo';
    const acao = novoStatus === 'inativo' ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${acao} o curso "${curso.nome}"?`)) return;
    try {
      const data = await adminApi.setCourseStatus(curso.id, novoStatus);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success(novoStatus === 'inativo'
        ? 'Curso desativado — ele não aparece mais para os alunos.'
        : 'Curso reativado como rascunho.');
      await carregarCursos();
    } catch {
      toast.error('Erro ao alterar status do curso.');
    }
  }

  async function handleExcluir(curso) {
    if (!confirm(`Excluir permanentemente o curso "${curso.nome}"?\n\nMódulos, aulas, questões e matrículas associadas serão removidos. Esta ação não pode ser desfeita.`)) return;
    try {
      const data = await api.deleteAdminCurso(curso.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Curso excluído com sucesso.');
      await carregarCursos();
    } catch {
      toast.error('Erro ao excluir curso.');
    }
  }

  if (loading) return <PageLoader message="Carregando cursos..." />;

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1>Gerenciar Cursos</h1>
              <p>Crie, edite, publique e organize os cursos da plataforma</p>
            </div>
            <button onClick={handleCriar} disabled={busy} className="admin-btn admin-btn-edit"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
              {busy ? 'Criando...' : '+ Criar Novo Curso'}
            </button>
          </div>
        </header>

        {erroCarregamento && (
          <div style={{
            padding: '20px', background: '#f8d7da', color: '#721c24',
            borderRadius: '8px', border: '1px solid #f5c6cb', textAlign: 'center', marginBottom: '20px',
          }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600 }}>Erro ao carregar cursos</p>
            <p style={{ margin: '0 0 16px' }}>{erroCarregamento}</p>
            <button onClick={carregarCursos} style={{
              padding: '8px 16px', background: '#721c24', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
            }}>
              Tentar novamente
            </button>
          </div>
        )}

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Cursos da Plataforma ({cursos.length})</h2>
          </div>

          <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Acesso</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Módulos</th>
                <th style={{ textAlign: 'center' }}>Aulas</th>
                <th style={{ textAlign: 'center' }}>Alunos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cursos.length === 0 && !erroCarregamento ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum curso cadastrado. Clique em "+ Criar Novo Curso" para começar.
                  </td>
                </tr>
              ) : (
                cursos.map(curso => (
                  <Fragment key={curso.id}>
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={curso.image ? (curso.image.startsWith('http') ? curso.image : `/${curso.image}`) : '/images/datacenter-hero.png'}
                          alt="" style={{ width: '56px', height: '38px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                          onError={e => { e.target.src = '/images/datacenter-hero.png'; }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{curso.nome}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {curso.duracao} {curso.categoria ? `· ${curso.categoria}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><Pill map={ACESSO_BADGE} value={curso.acesso || 'publico'} /></td>
                    <td><Pill map={STATUS_BADGE} value={curso.status || 'rascunho'} /></td>
                    <td style={{ textAlign: 'center' }}>{curso.total_modulos || 0}</td>
                    <td style={{ textAlign: 'center' }}>{curso.total_aulas || 0}</td>
                    <td style={{ textAlign: 'center' }}>{curso.total_matriculas || 0}</td>
                    <td>
                      <div className="admin-actions">
                        <button onClick={() => navigate(`/admin/cursos/${curso.id}/editar`)}
                          className="admin-btn admin-btn-edit" title="Abrir editor completo">Editar</button>
                        <Link to={`/cursos/${curso.id}`} target="_blank"
                          className="admin-btn admin-btn-view" title="Ver como aluno"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                          Visualizar
                        </Link>
                        {isAdmin && (
                          <button onClick={() => handleDuplicar(curso)}
                            className="admin-btn admin-btn-view" title="Criar uma cópia como rascunho">Duplicar</button>
                        )}
                        <button onClick={() => handleToggleAtivo(curso)}
                          className="admin-btn" title={curso.status === 'inativo' ? 'Reativar curso' : 'Desativar curso'}
                          style={{ background: '#fff3cd', color: '#856404' }}>
                          {curso.status === 'inativo' ? 'Reativar' : 'Desativar'}
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleExcluir(curso)}
                            className="admin-btn admin-btn-delete" title="Excluir permanentemente">Excluir</button>
                        )}
                        <button onClick={() => handleVerAlunos(curso)}
                          className="admin-btn admin-btn-view"
                          title="Ver alunos matriculados"
                          style={{ background: matriculadosAbertos === curso.id ? '#e0f2fe' : undefined }}>
                          Alunos {matriculadosAbertos === curso.id ? '▲' : '▼'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {matriculadosAbertos === curso.id && (
                    <tr key={`${curso.id}-alunos`}>
                      <td colSpan="7" style={{ background: '#f8fafc', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                        <strong style={{ display: 'block', marginBottom: '10px' }}>
                          Alunos matriculados em "{curso.nome}"
                        </strong>
                        {loadingMatriculados ? (
                          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
                        ) : matriculados.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno matriculado ainda.</p>
                        ) : (
                          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                          <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Nome</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Email</th>
                                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Progresso</th>
                                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Melhor Nota</th>
                                <th style={{ textAlign: 'center', padding: '6px 8px' }}>Certificado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matriculados.map(a => (
                                <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                  <td style={{ padding: '6px 8px' }}>{a.nome}</td>
                                  <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{a.email}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    <span style={{ color: a.progresso >= 100 ? 'var(--success)' : 'inherit' }}>
                                      {a.progresso || 0}%
                                    </span>
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    {a.melhor_nota != null ? `${a.melhor_nota}%` : '—'}
                                  </td>
                                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    {a.certificado_codigo
                                      ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Emitido</span>
                                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        <p style={{ marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          💡 Dica: use o botão <strong>Duplicar</strong> em um curso existente (como o de
          Elaboração de MOPs) para criar o próximo curso a partir dele como modelo —
          a cópia vem com todos os módulos, aulas, avaliação e questões, pronta para editar.
        </p>
      </div>
    </div>
  );
}
