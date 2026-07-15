import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/ui/Toast';
import { SIMULACAO_TEMAS } from '../../data/simulacoesTemas';

function emptyForm() {
  return { tema: SIMULACAO_TEMAS[0].id, titulo: '', video_url: '', descricao: '' };
}

const inputStyle = {
  width: '100%', padding: '10px',
  border: '1px solid var(--border)', borderRadius: '4px',
  background: 'white',
};
const labelStyle = { fontWeight: 600, display: 'block', marginBottom: '6px' };

export function AdminSimulacoes() {
  const toast = useToast();
  const [simulacoes, setSimulacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editandoId, setEditandoId] = useState(null); // id em edição, ou null (novo)

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try {
      const data = await adminApi.getSimulacoes();
      setSimulacoes(data.simulacoes || []);
    } catch (err) {
      console.error('Erro ao carregar simulações:', err);
      toast.error('Erro ao carregar os vídeos.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm());
    setEditandoId(null);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      if (editandoId) {
        const data = await adminApi.updateSimulacao(editandoId, form);
        if (data.erro) { toast.error(data.erro); return; }
        toast.success('Vídeo atualizado com sucesso.');
      } else {
        const data = await adminApi.createSimulacao(form);
        if (data.erro) { toast.error(data.erro); return; }
        toast.success('Vídeo adicionado com sucesso.');
      }
      resetForm();
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar o vídeo.');
    } finally {
      setSalvando(false);
    }
  }

  function handleEditar(s) {
    setEditandoId(s.id);
    setForm({
      tema: s.tema,
      titulo: s.titulo,
      video_url: s.video_url,
      descricao: s.descricao || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleExcluir(s) {
    if (!confirm(`Remover o vídeo "${s.titulo}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const data = await adminApi.deleteSimulacao(s.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Vídeo removido.');
      if (editandoId === s.id) resetForm();
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover o vídeo.');
    }
  }

  const total = simulacoes.length;

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1>🎬 Simulações</h1>
              <p>Cadastre os vídeos das simulações exibidos aos alunos em /simulacoes</p>
            </div>
            <Link to="/admin/dashboard" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              ← Voltar ao Dashboard
            </Link>
          </div>
        </header>

        {/* ── Formulário de cadastro/edição ── */}
        <div className="admin-table-container" style={{ padding: '30px', marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '20px' }}>
            {editandoId ? 'Editar vídeo' : 'Adicionar novo vídeo'}
          </h2>
          <form onSubmit={handleSalvar}>
            <div className="admin-form-grid" style={{ marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Eixo *</label>
                <select
                  value={form.tema} required style={inputStyle}
                  onChange={e => setForm({ ...form, tema: e.target.value })}
                >
                  {SIMULACAO_TEMAS.map(t => (
                    <option key={t.id} value={t.id}>{t.icone} {t.titulo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Título do vídeo *</label>
                <input
                  type="text" value={form.titulo} required style={inputStyle}
                  placeholder="Ex.: Transferência para gerador"
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Link do vídeo *</label>
                <input
                  type="url" value={form.video_url} required style={inputStyle}
                  placeholder="https://youtu.be/…  ·  https://vimeo.com/…  ·  https://…/video.mp4"
                  onChange={e => setForm({ ...form, video_url: e.target.value })}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Aceita YouTube, Vimeo ou o endereço direto de um arquivo de vídeo (.mp4).
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Descrição (opcional)</label>
                <textarea
                  value={form.descricao} rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Breve descrição do que a simulação mostra."
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" className="admin-btn admin-btn-edit"
                style={{ padding: '10px 25px' }} disabled={salvando}>
                {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Adicionar vídeo'}
              </button>
              {editandoId && (
                <button type="button" className="admin-btn"
                  style={{ padding: '10px 25px', background: '#e0e0e0' }}
                  onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Lista dos vídeos cadastrados, agrupados por eixo ── */}
        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Vídeos cadastrados ({total})</h2>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Carregando…</div>
          ) : total === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum vídeo cadastrado ainda. Use o formulário acima para adicionar o primeiro.
            </div>
          ) : (
            <div style={{ padding: '10px 0 20px' }}>
              {SIMULACAO_TEMAS.map(tema => {
                const doTema = simulacoes.filter(s => s.tema === tema.id);
                if (doTema.length === 0) return null;
                return (
                  <div key={tema.id} style={{ padding: '10px 20px' }}>
                    <h3 style={{ margin: '14px 0 10px', color: 'var(--primary)' }}>
                      {tema.icone} {tema.titulo}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.9rem' }}>
                        {' '}({doTema.length})
                      </span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {doTema.map(s => (
                        <div key={s.id} style={{
                          padding: '12px 16px', background: '#f9fafb',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          gap: '12px', flexWrap: 'wrap',
                        }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{s.titulo}</div>
                            <a href={s.video_url} target="_blank" rel="noreferrer"
                              style={{ fontSize: '0.82rem', color: 'var(--gold)', wordBreak: 'break-all' }}>
                              {s.video_url}
                            </a>
                            {s.descricao && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {s.descricao}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => handleEditar(s)}
                              className="admin-btn admin-btn-edit" title="Editar">
                              Editar
                            </button>
                            <button onClick={() => handleExcluir(s)}
                              className="admin-btn admin-btn-delete" title="Remover">
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
