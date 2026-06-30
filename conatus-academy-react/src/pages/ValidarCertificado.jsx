import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

/* Formata a data de emissão (ISO) para pt-BR. */
function formatarData(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function ValidarCertificado() {
  const { codigo: codigoParam } = useParams();
  const navigate = useNavigate();

  const [codigo, setCodigo]   = useState(codigoParam || '');
  const [loading, setLoading] = useState(false);
  const [cert, setCert]       = useState(null);
  const [erro, setErro]       = useState('');
  const [buscou, setBuscou]   = useState(false);

  const consultar = useCallback(async (cod) => {
    const limpo = (cod || '').trim().toUpperCase();
    if (!limpo) {
      setErro('Informe o código do certificado.');
      return;
    }
    setLoading(true);
    setErro('');
    setCert(null);
    try {
      const data = await api.validarCertificado(limpo);
      setCert(data.certificado);
    } catch (err) {
      setErro(err.message || 'Certificado não encontrado.');
    } finally {
      setLoading(false);
      setBuscou(true);
    }
  }, []);

  // Se vier código na URL (/validar-certificado/CN-XXXX), consulta automaticamente.
  useEffect(() => {
    if (codigoParam) consultar(codigoParam);
  }, [codigoParam, consultar]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const limpo = codigo.trim().toUpperCase();
    // Mantém a URL compartilhável em sincronia com a busca.
    navigate(limpo ? `/validar-certificado/${encodeURIComponent(limpo)}` : '/validar-certificado');
    consultar(limpo);
  };

  return (
    <section className="section" style={{ paddingTop: 'calc(var(--navbar-height) + 40px)' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-header" style={{ marginBottom: 30 }}>
          <h2>🔎 Validar Certificado</h2>
          <p>
            Confira a autenticidade de um certificado emitido pela Conatus Institute.
            Digite o código impresso no documento (formato <strong>CN-XXXXXXXX</strong>).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 24, marginBottom: 24 }}>
          <label htmlFor="cert-codigo" style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
            Código do certificado
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              id="cert-codigo"
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              placeholder="CN-XXXXXXXX"
              autoComplete="off"
              style={{
                flex: '1 1 220px', padding: '12px 14px', fontSize: '1rem',
                border: '1px solid var(--border-color, #d1d5db)', borderRadius: 8,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </form>

        {/* Resultado */}
        {buscou && !loading && cert && (
          <div
            className="card"
            style={{ padding: 24, borderLeft: '5px solid #16a34a' }}
            role="status"
          >
            <p style={{ color: '#16a34a', fontWeight: 700, margin: '0 0 16px', fontSize: '1.05rem' }}>
              ✓ Certificado autêntico
            </p>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', margin: 0 }}>
              <dt style={{ fontWeight: 600 }}>Aluno</dt>
              <dd style={{ margin: 0 }}>{cert.aluno_nome}</dd>

              <dt style={{ fontWeight: 600 }}>Curso</dt>
              <dd style={{ margin: 0 }}>{cert.curso_nome}</dd>

              {cert.curso_duracao && (
                <>
                  <dt style={{ fontWeight: 600 }}>Carga horária</dt>
                  <dd style={{ margin: 0 }}>{cert.curso_duracao}</dd>
                </>
              )}

              <dt style={{ fontWeight: 600 }}>Emitido em</dt>
              <dd style={{ margin: 0 }}>{formatarData(cert.data_emissao)}</dd>

              <dt style={{ fontWeight: 600 }}>Código</dt>
              <dd style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{cert.codigo}</dd>
            </dl>
          </div>
        )}

        {buscou && !loading && !cert && erro && (
          <div
            className="card"
            style={{ padding: 24, borderLeft: '5px solid #dc2626' }}
            role="alert"
          >
            <p style={{ color: '#dc2626', fontWeight: 700, margin: '0 0 6px', fontSize: '1.05rem' }}>
              ✗ Certificado não encontrado
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Verifique se o código foi digitado corretamente. {erro}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
