import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/PageLoader';
import { TicketPill } from '../components/ui/TicketPill';
import { TicketChat } from '../components/ui/TicketChat';
import { categoriaInfo, numeroChamado, dataHora } from '../utils/suporte';

/**
 * Conversa de um chamado aberto por visitante, acessada pelo link do e-mail.
 *
 * A URL É a credencial: o token nela é a única prova de que a pessoa é dona do
 * chamado. Por isso a página não expõe nada além desta conversa — e o token
 * jamais aparece na tela, para não vazar em print ou em ombro alheio.
 */
export function ChamadoPublico() {
  const { token } = useParams();
  const toast = useToast();
  const [dados, setDados] = useState(null); // { chamado, mensagens }
  const [loading, setLoading] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const d = await api.getChamadoPublico(token);
      setDados({ chamado: d.chamado, mensagens: d.mensagens || [] });
    } catch {
      setInvalido(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { carregar(); }, [carregar]);

  // A resposta da equipe aparece sozinha, como na área do aluno.
  useEffect(() => {
    if (invalido) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, 15000);
    return () => clearInterval(t);
  }, [carregar, invalido]);

  async function handleResponder(e) {
    e.preventDefault();
    const texto = resposta.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    try {
      const d = await api.responderChamadoPublico(token, texto);
      if (d.erro) { toast.error(d.erro); return; }
      setResposta('');
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <PageLoader message="Abrindo seu chamado…" />;

  if (invalido) {
    return (
      <div className="cursos-body">
        <div className="container">
          <div className="cursos-header">
            <h1>Chamado não encontrado</h1>
            <p>Este link não é válido ou o chamado foi removido.</p>
          </div>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Confira se copiou o endereço inteiro do e-mail. Se preferir, abra um novo chamado.
            </p>
            <Link to="/suporte" className="admin-btn admin-btn-edit" style={{ padding: '11px 26px' }}>
              Abrir novo chamado
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { chamado, mensagens } = dados;
  const fechado = chamado.status === 'fechado';

  return (
    <div className="cursos-body">
      <div className="container">
        <div className="cursos-header">
          <h1>Chamado {numeroChamado(chamado.id)}</h1>
          <p>{chamado.assunto}</p>
        </div>

        <div className="admin-table-container" style={{ maxWidth: '860px', margin: '0 auto 40px' }}>
          <div className="admin-table-header" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <TicketPill tipo="status" valor={chamado.status} />
              <TicketPill tipo="prioridade" valor={chamado.prioridade} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {categoriaInfo(chamado.categoria).label} · aberto em {dataHora(chamado.criado_em)}
              </span>
            </div>
          </div>

          {/* Visitante não envia nem recebe anexo (a rota pública é só texto),
              então o chat vai sem o callback de download. */}
          <TicketChat mensagens={mensagens} nomeProprio={chamado.visitante_nome || 'Você'} />

          <form onSubmit={handleResponder} style={{ padding: '20px 25px', borderTop: '1px solid var(--border)' }}>
            {fechado ? (
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                Este chamado foi encerrado. Se precisar de mais ajuda,{' '}
                <Link to="/suporte" style={{ color: 'var(--primary)', fontWeight: 600 }}>abra um novo chamado</Link>.
              </p>
            ) : (
              <>
                <label className="ticket-filtro-label" htmlFor="resp-publico">Responder</label>
                <textarea id="resp-publico" className="ticket-filtro-campo" rows={4} maxLength={5000}
                  style={{ resize: 'vertical' }}
                  placeholder="Escreva sua mensagem…"
                  value={resposta} onChange={e => setResposta(e.target.value)} />
                <button type="submit" className="admin-btn admin-btn-edit"
                  style={{ padding: '10px 25px', marginTop: '12px' }}
                  disabled={enviando || !resposta.trim()}>
                  {enviando ? 'Enviando…' : 'Responder'}
                </button>
              </>
            )}
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '40px' }}>
          Guarde o e-mail que enviamos: é por ele que você volta a esta conversa.
        </p>
      </div>
    </div>
  );
}
