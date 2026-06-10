import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export function AdminCertificados() {
  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codigoValidacao, setCodigoValidacao] = useState('');
  const [resultadoValidacao, setResultadoValidacao] = useState(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarCertificados();
  }, []);

  async function carregarCertificados() {
    setLoading(true);
    try {
      const data = await api.getAdminCertificados();
      if (data.certificados) {
        setCertificados(data.certificados);
      }
    } catch (err) {
      console.error("Erro ao carregar certificados:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleValidar(e) {
    e.preventDefault();
    setResultadoValidacao(null);
    setMensagem('');
    
    if (!codigoValidacao.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Digite um código para validar.' });
      return;
    }

    try {
      const data = await fetch(`/api/admin/certificados/validar/${codigoValidacao}`);
      const json = await data.json();
      
      if (json.erro) {
        setMensagem({ tipo: 'erro', texto: json.erro });
      } else if (json.certificado) {
        setResultadoValidacao(json.certificado);
        setMensagem({ tipo: 'sucesso', texto: 'Certificado válido!' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao validar certificado.' });
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Tem certeza que deseja excluir este certificado?')) return;
    try {
      const data = await api.deleteAdminCertificado(id);
      if (data.erro) {
        alert(data.erro);
        return;
      }
      alert('Certificado excluído com sucesso!');
      await carregarCertificados();
    } catch {
      alert('Erro ao excluir certificado.');
    }
  }

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Gerenciar Certificados</h1>
              <p>Visualize, valide e exclua certificados emitidos</p>
            </div>
            <Link to="/admin/dashboard" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              ← Voltar ao Dashboard
            </Link>
          </div>
        </header>

        {/* Seção de Validação */}
        <div className="admin-table-container" style={{ marginBottom: '30px', padding: '25px' }}>
          <h2 style={{ marginBottom: '15px', fontSize: '1.3rem' }}>Validar Certificado</h2>
          <form onSubmit={handleValidar} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <input
              type="text"
              className="admin-search"
              placeholder="Digite o código (ex: CN-XXXXXXXX)"
              value={codigoValidacao}
              onChange={e => setCodigoValidacao(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="admin-btn admin-btn-edit" style={{ padding: '10px 20px' }}>
              Validar
            </button>
          </form>

          {mensagem && (
            <div style={{
              marginTop: '15px',
              padding: '12px 20px',
              borderRadius: '8px',
              background: mensagem.tipo === 'sucesso' ? '#d4edda' : '#f8d7da',
              color: mensagem.tipo === 'sucesso' ? '#155724' : '#721c24',
              border: `1px solid ${mensagem.tipo === 'sucesso' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {mensagem.texto}
            </div>
          )}

          {resultadoValidacao && (
            <div style={{
              marginTop: '15px',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ marginBottom: '10px', color: 'var(--primary)' }}>Dados do Certificado</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <p><strong>Código:</strong> {resultadoValidacao.codigo}</p>
                <p><strong>Nota:</strong> {resultadoValidacao.nota_avaliacao}%</p>
                <p><strong>Aluno:</strong> {resultadoValidacao.aluno_nome}</p>
                <p><strong>Email:</strong> {resultadoValidacao.aluno_email}</p>
                <p><strong>Curso:</strong> {resultadoValidacao.curso_nome}</p>
                <p><strong>Duração:</strong> {resultadoValidacao.curso_duracao}</p>
                <p><strong>Data de Emissão:</strong> {new Date(resultadoValidacao.data_emissao).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Certificados */}
        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Lista de Certificados ({certificados.length})</h2>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Carregando...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Aluno</th>
                  <th>Curso</th>
                  <th>Nota</th>
                  <th>Data Emissão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {certificados.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Nenhum certificado encontrado.
                    </td>
                  </tr>
                ) : (
                  certificados.map(cert => (
                    <tr key={cert.id}>
                      <td><strong>{cert.codigo}</strong></td>
                      <td>{cert.aluno_nome}</td>
                      <td>{cert.curso_nome}</td>
                      <td>{cert.nota_avaliacao}%</td>
                      <td>{new Date(cert.data_emissao).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleExcluir(cert.id)} className="admin-btn admin-btn-delete" title="Excluir certificado">
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
