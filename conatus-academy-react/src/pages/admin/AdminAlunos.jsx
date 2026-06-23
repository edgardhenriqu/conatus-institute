import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { ROLE_LABELS, ROLE_COLORS } from '../../utils/permissions';

const ROLE_OPTIONS = [
  { value: 'aluno',            label: 'Aluno' },
  { value: 'conatus_employee', label: 'Funcionário Conatus' },
  { value: 'instrutor',        label: 'Instrutor' },
  { value: 'admin',            label: 'Administrador' },
];

function RoleBadge({ role }) {
  const label = ROLE_LABELS[role] || role || 'Aluno';
  const color = ROLE_COLORS[role] || ROLE_COLORS.aluno;
  return (
    <span style={{
      background: color, color: '#fff',
      padding: '3px 10px', borderRadius: '12px',
      fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function emptyForm(aluno = null) {
  return {
    nome:     aluno?.nome     || '',
    email:    aluno?.email    || '',
    telefone: aluno?.telefone || '',
    endereco: aluno?.endereco || '',
    cidade:   aluno?.cidade   || '',
    estado:   aluno?.estado   || '',
    ativo:    aluno?.ativo !== false,
    role:     aluno?.role     || 'aluno',
  };
}

export function AdminAlunos() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [alunos, setAlunos]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [busca, setBusca]                   = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [detalhes, setDetalhes]             = useState(null); // { matriculas, certificados }
  const [editando, setEditando]             = useState(false);
  const [formData, setFormData]             = useState({});
  const [mensagem, setMensagem]             = useState('');

  useEffect(() => { carregarAlunos(); }, []);

  async function carregarAlunos(buscaTexto = '') {
    setLoading(true);
    try {
      const data = await api.getAdminAlunos(buscaTexto);
      if (data.alunos) setAlunos(data.alunos);
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscar(e) {
    e.preventDefault();
    await carregarAlunos(busca);
  }

  async function handleVerDetalhes(id, iniciarEditando = false) {
    try {
      const data = await api.getAdminAluno(id);
      if (data.aluno) {
        setAlunoSelecionado(data.aluno);
        setDetalhes({ matriculas: data.matriculas || [], certificados: data.certificados || [] });
        setFormData(emptyForm(data.aluno));
        setEditando(iniciarEditando);
        setMensagem('');
      }
    } catch {
      toast.error('Erro ao buscar detalhes do aluno.');
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (isSuperAdmin) {
        payload.role = formData.role || 'aluno';
      } else {
        delete payload.role; // admin comum não pode alterar cargos
      }
      const data = await api.updateAdminAluno(alunoSelecionado.id, payload);
      if (data.erro) {
        setMensagem({ tipo: 'erro', texto: data.erro });
        return;
      }
      setMensagem({ tipo: 'sucesso', texto: 'Aluno atualizado com sucesso! O usuário precisará fazer logout e login para que as alterações de permissão entrem em vigor.' });
      setEditando(false);
      setAlunoSelecionado(data.aluno);
      setFormData(emptyForm(data.aluno));
      await carregarAlunos(busca);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao atualizar aluno.' });
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) return;
    try {
      const data = await api.deleteAdminAluno(id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Aluno excluído com sucesso.');
      setAlunoSelecionado(null);
      await carregarAlunos(busca);
    } catch {
      toast.error('Erro ao excluir aluno.');
    }
  }

  async function handleDesmatricular(matricula) {
    if (!confirm(
      `Desmatricular ${alunoSelecionado.nome} do curso "${matricula.curso_nome}"?\n\n` +
      'O progresso das aulas e as tentativas de avaliação serão apagados. ' +
      'Certificados já emitidos são mantidos.'
    )) return;
    try {
      const data = await adminApi.unenrollStudent(matricula.curso_id, alunoSelecionado.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Aluno desmatriculado do curso.');
      await handleVerDetalhes(alunoSelecionado.id, editando);
      await carregarAlunos(busca);
    } catch (err) {
      toast.error(err.message || 'Erro ao desmatricular aluno.');
    }
  }

  function voltarParaLista() {
    setAlunoSelecionado(null);
    setDetalhes(null);
    setEditando(false);
    setMensagem('');
  }

  const inputStyle = (enabled) => ({
    width: '100%', padding: '10px',
    border: '1px solid var(--border)', borderRadius: '4px',
    background: enabled ? 'white' : '#f5f5f5',
  });

  /* ── Tela de detalhes/edição ────────────────────────────────── */
  if (alunoSelecionado) {
    return (
      <div className="admin-body">
        <div className="admin-container">
          <header className="admin-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <h1>{editando ? 'Editando Aluno' : 'Detalhes do Aluno'}</h1>
                <RoleBadge role={alunoSelecionado.role} />
              </div>
              <button onClick={voltarParaLista}
                style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                ← Voltar para Lista
              </button>
            </div>
          </header>

          {mensagem && (
            <div style={{
              padding: '12px 20px', borderRadius: '8px', marginBottom: '20px',
              background: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
              color:      mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
              border:     `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`,
            }}>
              {mensagem.texto}
            </div>
          )}

          <div className="admin-table-container" style={{ padding: '30px' }}>
            <form onSubmit={handleSalvar}>

              {/* ── Dados Pessoais ── */}
              <h3 style={{ marginBottom: '16px', color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                Dados Pessoais
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nome *</label>
                  <input type="text" value={formData.nome || ''} required
                    disabled={!editando}
                    style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email *</label>
                  <input type="email" value={formData.email || ''} required
                    disabled={!editando}
                    style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>CPF</label>
                  <input type="text" value={alunoSelecionado.cpf || ''} disabled style={inputStyle(false)} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Data de Nascimento</label>
                  <input type="date"
                    value={alunoSelecionado.data_nascimento ? alunoSelecionado.data_nascimento.split('T')[0] : ''}
                    disabled style={inputStyle(false)} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Telefone</label>
                  <input type="text" value={formData.telefone || ''} disabled={!editando}
                    style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Endereço</label>
                  <input type="text" value={formData.endereco || ''} disabled={!editando}
                    style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cidade</label>
                  <input type="text" value={formData.cidade || ''} disabled={!editando}
                    style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Estado</label>
                  <input type="text" value={formData.estado || ''} disabled={!editando}
                    style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, estado: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Status da Conta</label>
                  <select value={formData.ativo ? 'true' : 'false'}
                    disabled={!editando} style={inputStyle(editando)}
                    onChange={e => setFormData({ ...formData, ativo: e.target.value === 'true' })}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              {/* ── Controle de Acesso ── */}
              <div style={{
                background: '#f8f9ff', border: '1px solid #c7d2fe',
                borderRadius: '10px', padding: '24px', marginBottom: '24px',
              }}>
                <h3 style={{ marginBottom: '6px', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🔐</span> Controle de Acesso
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '18px' }}>
                  Define o perfil e as permissões de acesso do usuário na plataforma.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Perfil / Função</label>
                    <select value={formData.role || 'aluno'}
                      disabled={!editando || !isSuperAdmin}
                      style={inputStyle(editando && isSuperAdmin)}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}>
                      {ROLE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {!isSuperAdmin ? (
                      <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '6px' }}>
                        Apenas o Super Administrador pode alterar o cargo dos usuários.
                      </p>
                    ) : !editando && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                        Clique em "Editar" para alterar o perfil.
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Acesso ao Curso Interno (MOP)</label>
                    <div style={{
                      padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: ['admin', 'superadmin', 'conatus_employee'].includes(formData.role) ? '#d1fae5' : '#f3f4f6',
                      color: ['admin', 'superadmin', 'conatus_employee'].includes(formData.role) ? '#065f46' : '#9ca3af',
                      fontWeight: 600, fontSize: '0.9rem',
                    }}>
                      {['admin', 'superadmin', 'conatus_employee'].includes(formData.role)
                        ? '✓ Autorizado'
                        : '✗ Sem acesso'}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                      Liberado para Funcionário Conatus e Administradores.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Matrículas e Certificados ── */}
              {detalhes && (detalhes.matriculas.length > 0 || detalhes.certificados.length > 0) && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '16px', color: 'var(--primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
                    Histórico Acadêmico
                  </h3>
                  {detalhes.matriculas.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: 600, marginBottom: '8px' }}>Matrículas ({detalhes.matriculas.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {detalhes.matriculas.map(m => (
                          <div key={m.id} style={{
                            padding: '8px 14px', background: '#f9fafb',
                            borderRadius: '6px', border: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            gap: '12px', flexWrap: 'wrap',
                          }}>
                            <span>{m.curso_nome}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {m.progresso || 0}% concluído
                              </span>
                              <button type="button" className="admin-btn admin-btn-delete"
                                style={{ margin: 0 }}
                                onClick={() => handleDesmatricular(m)}
                                title="Remover matrícula deste curso">
                                Desmatricular
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detalhes.certificados.length > 0 && (
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '8px' }}>Certificados ({detalhes.certificados.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {detalhes.certificados.map(c => (
                          <div key={c.id} style={{
                            padding: '8px 14px', background: '#f0fdf4',
                            borderRadius: '6px', border: '1px solid #bbf7d0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <span>{c.curso_nome}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Nota: {c.nota_avaliacao}% · {c.codigo}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editando ? (
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <button type="submit" className="admin-btn admin-btn-edit" style={{ padding: '10px 25px' }}>
                    Salvar Alterações
                  </button>
                  <button type="button" className="admin-btn"
                    style={{ padding: '10px 25px', background: '#e0e0e0' }}
                    onClick={() => { setEditando(false); setFormData(emptyForm(alunoSelecionado)); setMensagem(''); }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <button type="button" className="admin-btn admin-btn-edit"
                    style={{ padding: '10px 25px' }}
                    onClick={() => setEditando(true)}>
                    Editar
                  </button>
                  <button type="button" className="admin-btn admin-btn-delete"
                    style={{ padding: '10px 25px' }}
                    onClick={() => handleExcluir(alunoSelecionado.id)}>
                    Excluir Aluno
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Tela de listagem ───────────────────────────────────────── */
  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Gerenciar Alunos</h1>
              <p>Visualize, edite e gerencie permissões dos usuários</p>
            </div>
            <Link to="/admin/dashboard" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              ← Voltar ao Dashboard
            </Link>
          </div>
        </header>

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Lista de Usuários ({alunos.length})</h2>
            <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text" className="admin-search"
                placeholder="Buscar por nome ou email..."
                value={busca} onChange={e => setBusca(e.target.value)} />
              <button type="submit" className="admin-btn admin-btn-edit">Buscar</button>
            </form>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Matrículas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  alunos.map(aluno => (
                    <tr key={aluno.id}>
                      <td style={{ fontWeight: 500 }}>{aluno.nome}</td>
                      <td style={{ fontSize: '0.9rem' }}>{aluno.email}</td>
                      <td><RoleBadge role={aluno.role} /></td>
                      <td>
                        <span style={{ color: aluno.ativo !== false ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {aluno.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{aluno.total_matriculas || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleVerDetalhes(aluno.id, false)}
                            className="admin-btn admin-btn-view" title="Ver detalhes">
                            Ver
                          </button>
                          <button onClick={() => handleVerDetalhes(aluno.id, true)}
                            className="admin-btn admin-btn-edit" title="Editar e permissões">
                            Editar
                          </button>
                          <button onClick={() => handleExcluir(aluno.id)}
                            className="admin-btn admin-btn-delete" title="Excluir">
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
