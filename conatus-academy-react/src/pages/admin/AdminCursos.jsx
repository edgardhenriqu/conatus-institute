import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { staticCourses } from '../../data/courses';

export function AdminCursos() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [formData, setFormData] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [erroCarregamento, setErroCarregamento] = useState('');

  const emptyCurso = {
    nome: '', duracao: '', image: '', descricao: '',
    oque_aprender: '', mercado_trabalho: '', areas_atuacao: '',
    diferenciais: '', infraestrutura: '', coordenacao: '',
    informacoes_complementares: '', matriz_curricular: ''
  };

  useEffect(() => {
    carregarCursos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function carregarCursos() {
    setLoading(true);
    setErroCarregamento('');
    try {
      const data = await api.getAdminCursos();
      const dbCursos = data.cursos || [];
      const staticCursos = staticCourses.map(c => ({
        ...c,
        id: c.id,
        total_matriculas: 0,
        isStatic: true
      }));
      setCursos([...dbCursos, ...staticCursos]);
    } catch (err) {
      console.error("Erro ao carregar cursos:", err);
      if (err.message.includes('Token') || err.message.includes('401') || err.message.includes('403')) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
        return;
      }
      setErroCarregamento(err.message || 'Erro ao carregar cursos.');
      setCursos(staticCourses.map(c => ({ ...c, total_matriculas: 0, isStatic: true })));
    } finally {
      setLoading(false);
    }
  }

  function handleCriar() {
    setFormData(emptyCurso);
    setCursoSelecionado(null);
    setEditando(false);
    setCriando(true);
    setMensagem('');
  }

  async function handleVerDetalhes(id, iniciarEditando = false) {
    try {
      const curso = cursos.find(c => c.id === id);
      if (curso) {
        setCursoSelecionado(curso);
        setFormData(curso);
        setEditando(iniciarEditando && !curso.isStatic);
        setCriando(false);
      }
    } catch {
      alert("Erro ao buscar detalhes do curso.");
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    try {
      if (cursoSelecionado?.isStatic) {
        setCursos(prev => prev.map(c => c.id === cursoSelecionado.id ? { ...c, ...formData } : c));
        setCursoSelecionado({ ...cursoSelecionado, ...formData });
        setFormData({ ...cursoSelecionado, ...formData });
        setMensagem({ tipo: 'sucesso', texto: 'Curso interno atualizado (visual)!' });
        setEditando(false);
        return;
      }

      let data;
      if (criando) {
        data = await api.createAdminCurso(formData);
      } else {
        data = await api.updateAdminCurso(cursoSelecionado.id, formData);
      }
      
      if (data.erro) {
        setMensagem({ tipo: 'erro', texto: data.erro });
        return;
      }
      setMensagem({ tipo: 'sucesso', texto: criando ? 'Curso criado com sucesso!' : 'Curso atualizado com sucesso!' });
      setEditando(false);
      setCriando(false);
      await carregarCursos();
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar curso.' });
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;
    try {
      const curso = cursos.find(c => c.id === id);
      if (curso?.isStatic) {
        setCursos(prev => prev.filter(c => c.id !== id));
        setCursoSelecionado(null);
        alert('Curso interno removido da lista!');
        return;
      }

      const data = await api.deleteAdminCurso(id);
      if (data.erro) {
        alert(data.erro);
        return;
      }
      alert('Curso excluído com sucesso!');
      setCursoSelecionado(null);
      await carregarCursos();
    } catch {
      alert('Erro ao excluir curso.');
    }
  }

  function voltarParaLista() {
    setCursoSelecionado(null);
    setEditando(false);
    setCriando(false);
    setMensagem('');
  }

  // Tela de criação/edição
  if (criando || editando || cursoSelecionado) {
    const titulo = criando ? 'Criar Novo Curso' : editando ? 'Editando Curso' : 'Detalhes do Curso';
    
    return (
      <div className="admin-body">
        <div className="admin-container">
          <header className="admin-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1>{titulo} {cursoSelecionado?.isStatic && <span style={{ fontSize: '0.7em', color: 'var(--gold)', fontWeight: 400 }}>(Interno/Código)</span>}</h1>
              <button onClick={voltarParaLista} style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                ← Voltar para Lista
              </button>
            </div>
          </header>

          {mensagem && (
            <div style={{
              padding: '12px 20px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
              color: mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {mensagem.texto}
            </div>
          )}

          <div className="admin-table-container" style={{ padding: '30px' }}>
            <form onSubmit={handleSalvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nome do Curso *</label>
                  <input
                    type="text"
                    value={formData.nome || ''}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                    disabled={!editando && !criando}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Duração *</label>
                  <input
                    type="text"
                    value={formData.duracao || ''}
                    onChange={e => setFormData({...formData, duracao: e.target.value})}
                    disabled={!editando && !criando}
                    required
                    placeholder="Ex: 40h"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Imagem</label>
                  <input
                    type="text"
                    value={formData.image || ''}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    disabled={!editando && !criando}
                    placeholder="URL da imagem"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Descrição</label>
                  <textarea
                    value={formData.descricao || ''}
                    onChange={e => setFormData({...formData, descricao: e.target.value})}
                    disabled={!editando && !criando}
                    rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>O que você vai aprender</label>
                  <textarea
                    value={formData.oque_aprender || ''}
                    onChange={e => setFormData({...formData, oque_aprender: e.target.value})}
                    disabled={!editando && !criando}
                    rows={4}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Matriz Curricular</label>
                  <textarea
                    value={formData.matriz_curricular || ''}
                    onChange={e => setFormData({...formData, matriz_curricular: e.target.value})}
                    disabled={!editando && !criando}
                    rows={6}
                    placeholder="Módulo 1: Título: Descrição"
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Mercado de Trabalho</label>
                  <textarea
                    value={formData.mercado_trabalho || ''}
                    onChange={e => setFormData({...formData, mercado_trabalho: e.target.value})}
                    disabled={!editando && !criando}
                    rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Diferenciais</label>
                  <textarea
                    value={formData.diferenciais || ''}
                    onChange={e => setFormData({...formData, diferenciais: e.target.value})}
                    disabled={!editando && !criando}
                    rows={3}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', resize: 'vertical' }}
                  />
                </div>
              </div>

              {(editando || criando) && (
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <button type="submit" className="admin-btn admin-btn-edit" style={{ padding: '10px 20px' }}>
                    {criando ? 'Criar Curso' : 'Salvar Alterações'}
                  </button>
                  <button type="button" onClick={() => { setEditando(false); setCriando(false); if (cursoSelecionado) setFormData(cursoSelecionado); setMensagem(''); }} className="admin-btn" style={{ padding: '10px 20px', background: '#e0e0e0' }}>
                    Cancelar
                  </button>
                </div>
              )}
              {cursoSelecionado && !criando && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <button type="button" onClick={() => navigate(`/admin/cursos/${cursoSelecionado.id}/modulos`)} className="admin-btn admin-btn-view" style={{ padding: '10px 20px' }}>
                    📚 Gerenciar Módulos e Aulas
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Tela de listagem
  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Gerenciar Cursos</h1>
              <p>Crie, edite e exclua cursos da plataforma</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <button onClick={handleCriar} className="admin-btn admin-btn-edit" style={{ padding: '10px 20px' }}>
                + Novo Curso
              </button>
              <Link to="/admin/dashboard" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
                ← Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Lista de Cursos ({cursos.length})</h2>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>
          ) : erroCarregamento ? (
            <div style={{
              padding: '20px',
              background: '#f8d7da',
              color: '#721c24',
              borderRadius: '8px',
              border: '1px solid #f5c6cb',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 12px', fontWeight: 600 }}>Erro ao carregar cursos</p>
              <p style={{ margin: '0 0 16px' }}>{erroCarregamento}</p>
              <button onClick={carregarCursos} style={{
                padding: '8px 16px', background: '#721c24', color: '#fff',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
              }}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Duração</th>
                  <th>Matrículas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cursos.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Nenhum curso encontrado.
                    </td>
                  </tr>
                ) : (
                  cursos.map(curso => (
                    <tr key={curso.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{curso.id}</td>
                      <td>{curso.nome} {curso.isStatic && <span style={{ fontSize: '0.75rem', color: 'var(--gold)', marginLeft: '6px' }}>(Interno)</span>}</td>
                      <td>{curso.duracao}</td>
                      <td>{curso.total_matriculas || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleVerDetalhes(curso.id)} className="admin-btn admin-btn-view" title="Ver detalhes">
                            Ver
                          </button>
                          <button onClick={() => navigate(`/admin/cursos/${curso.id}/editar`)} className="admin-btn admin-btn-edit" title="Editor completo do curso" style={{ background: '#10b981' }}>
                            Editor
                          </button>
                          <button onClick={() => navigate(`/admin/cursos/${curso.id}/modulos`)} className="admin-btn admin-btn-view" title="Gerenciar módulos" style={{ background: '#6f42c1' }}>
                            Módulos
                          </button>
                          <button onClick={() => handleExcluir(curso.id)} className="admin-btn admin-btn-delete" title="Excluir curso">
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
