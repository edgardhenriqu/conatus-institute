import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/PageLoader';
import { TicketPill } from '../components/ui/TicketPill';
import { TicketSeletorAnexos, TicketAnexosEnviados } from '../components/ui/TicketAnexos';
import { ChamadoPublicoForm } from '../components/ui/ChamadoPublicoForm';
import { TicketPrazoFechamento } from '../components/ui/TicketPrazoFechamento';
import { TICKET_CATEGORIAS, categoriaInfo, numeroChamado, dataHora } from '../utils/suporte';

/**
 * Suporte — área do aluno e porta de entrada de quem não tem conta.
 *
 * A rota é aberta de propósito: quem chega sem login vê o formulário público
 * (com CAPTCHA) e recebe o link do chamado por e-mail. Quem está logado vê os
 * próprios chamados, com anexos e histórico.
 *
 * Para o aluno logado são três telas em uma rota (`vista`): a lista, o
 * formulário de abertura e a conversa. São passos de um mesmo fluxo e ele volta
 * sempre para a lista, então não valem rotas separadas — e assim a lista não
 * precisa ser recarregada a cada ida e volta.
 *
 * As classes admin-table* são o estilo de tabela da plataforma (apesar do nome):
 * reutilizá-las mantém esta página idêntica ao resto do sistema.
 */

function ListaVazia() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      Você ainda não abriu nenhum chamado.<br />
      Use o botão <strong>Novo Chamado</strong> para falar com a nossa equipe.
    </div>
  );
}

export function Suporte() {
  const toast = useToast();
  const { user, loading: carregandoSessao } = useAuth();
  const [vista, setVista] = useState('lista'); // 'lista' | 'novo' | 'detalhe'
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulário de abertura
  const [form, setForm] = useState({ assunto: '', categoria: 'duvida', mensagem: '' });
  const [anexosNovo, setAnexosNovo] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Detalhe/conversa
  const [detalhe, setDetalhe] = useState(null); // { chamado, mensagens }
  const [resposta, setResposta] = useState('');
  const [anexosResposta, setAnexosResposta] = useState([]);
  const [respondendo, setRespondendo] = useState(false);
  const chatRef = useRef(null);

  const carregarLista = useCallback(async () => {
    // Visitante não tem lista: a rota /meus exigiria token e devolveria 401.
    if (!user) { setLoading(false); return; }
    try {
      const data = await api.getMeusChamados();
      setChamados(data.chamados || []);
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
      toast.error('Erro ao carregar seus chamados.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Espera a sessão resolver: buscar antes faria o visitante ver o formulário
    // público por um instante mesmo estando logado.
    if (!carregandoSessao) carregarLista();
  }, [carregarLista, carregandoSessao]);

  // Rola para a mensagem mais recente, mas só se o aluno já estava no fim —
  // com o polling ativo, rolar sempre atrapalharia quem está relendo a conversa.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const noFim = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (noFim) el.scrollTop = el.scrollHeight;
  }, [detalhe]);

  const abrirDetalhe = useCallback(async (chamadoId, limparCampos = true) => {
    try {
      const data = await api.getChamado(chamadoId);
      setDetalhe({ chamado: data.chamado, mensagens: data.mensagens || [] });
      if (limparCampos) {
        setResposta('');
        setAnexosResposta([]);
      }
      setVista('detalhe');
    } catch (err) {
      toast.error(err.message || 'Erro ao abrir o chamado.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualização em tempo real: a resposta da equipe aparece sozinha.
  // Só roda na conversa aberta e com a aba visível; `false` preserva o que o
  // aluno já tiver digitado e os anexos que ele escolheu.
  useEffect(() => {
    if (vista !== 'detalhe' || !detalhe?.chamado?.id) return;
    const id = detalhe.chamado.id;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') abrirDetalhe(id, false);
    }, 15000);
    return () => clearInterval(t);
  }, [vista, detalhe?.chamado?.id, abrirDetalhe]);

  async function handleAbrirChamado(e) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const data = await api.abrirChamado(form, anexosNovo);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success(`Chamado ${numeroChamado(data.chamado.id)} aberto! Nossa equipe responderá em breve.`);
      setForm({ assunto: '', categoria: 'duvida', mensagem: '' });
      setAnexosNovo([]);
      await carregarLista();
      await abrirDetalhe(data.chamado.id);
    } catch (err) {
      toast.error(err.message || 'Erro ao abrir o chamado.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleResponder(e) {
    e.preventDefault();
    const texto = resposta.trim();
    if ((!texto && anexosResposta.length === 0) || respondendo) return;
    setRespondendo(true);
    try {
      const data = await api.responderChamado(detalhe.chamado.id, texto, anexosResposta);
      if (data.erro) { toast.error(data.erro); return; }
      setResposta('');
      setAnexosResposta([]);
      // Recarrega o chamado: responder pode mudar o status (ex.: reabre um
      // chamado que estava resolvido).
      await abrirDetalhe(detalhe.chamado.id);
      await carregarLista();
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar a mensagem.');
    } finally {
      setRespondendo(false);
    }
  }

  async function handleBaixarAnexo(anexoId, nome) {
    try {
      await api.baixarAnexo(anexoId, nome);
    } catch (err) {
      toast.error(err.message || 'Erro ao baixar o anexo.');
    }
  }

  if (carregandoSessao || loading) return <PageLoader message="Carregando…" />;

  /* ── Visitante sem conta: abertura pública ──────────────────── */
  if (!user) {
    return (
      <div className="cursos-body">
        <div className="container">
          <div className="cursos-header">
            <h1>Suporte</h1>
            <p>
              Abra um chamado e nossa equipe responde por e-mail. Não é preciso ter conta.
            </p>
          </div>
          <ChamadoPublicoForm />
        </div>
      </div>
    );
  }

  /* ── Formulário de novo chamado ─────────────────────────────── */
  if (vista === 'novo') {
    return (
      <div className="cursos-body">
        <div className="container">
          <div className="cursos-header">
            <h1>Novo Chamado</h1>
            <p>Descreva sua solicitação. Nossa equipe responde por aqui mesmo.</p>
          </div>

          <div className="admin-table-container" style={{ maxWidth: '760px', margin: '0 auto 40px' }}>
            <form onSubmit={handleAbrirChamado} style={{ padding: '28px', display: 'grid', gap: '18px' }}>
              <div>
                <label className="ticket-filtro-label" htmlFor="assunto">Assunto *</label>
                <input id="assunto" type="text" className="ticket-filtro-campo" required
                  maxLength={200}
                  placeholder="Ex.: Não consigo emitir meu certificado"
                  value={form.assunto}
                  onChange={e => setForm({ ...form, assunto: e.target.value })} />
              </div>
              <div>
                <label className="ticket-filtro-label" htmlFor="categoria">Categoria *</label>
                <select id="categoria" className="ticket-filtro-campo" required
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {TICKET_CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ticket-filtro-label" htmlFor="mensagem">Mensagem *</label>
                <textarea id="mensagem" className="ticket-filtro-campo" required rows={7}
                  maxLength={5000}
                  style={{ resize: 'vertical' }}
                  placeholder="Conte o que aconteceu, com o máximo de detalhes que puder."
                  value={form.mensagem}
                  onChange={e => setForm({ ...form, mensagem: e.target.value })} />
              </div>
              <div>
                <label className="ticket-filtro-label">Anexos (opcional)</label>
                <TicketSeletorAnexos
                  arquivos={anexosNovo}
                  onChange={setAnexosNovo}
                  onErro={msg => toast.error(msg)}
                  disabled={enviando}
                />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  PDF, DOC, DOCX, imagem ou ZIP — até 10 MB cada, no máximo 5 arquivos.
                  Para vídeo, cole um link (YouTube, Drive) na mensagem.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" className="admin-btn admin-btn-edit"
                  style={{ padding: '11px 28px' }} disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
                <button type="button" className="admin-btn"
                  style={{ padding: '11px 28px', background: 'var(--surface-2)', color: 'var(--text-main)' }}
                  onClick={() => setVista('lista')}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Histórico da conversa ──────────────────────────────────── */
  if (vista === 'detalhe' && detalhe) {
    const { chamado, mensagens } = detalhe;
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
              <button className="admin-btn admin-btn-edit" onClick={() => setVista('lista')}>
                ← Voltar
              </button>
            </div>

            <div className="ticket-chat" ref={chatRef}>
              {mensagens.map(m => (
                <div key={m.id}
                  className={`ticket-msg ticket-msg-${m.autor_tipo === 'admin' ? 'admin' : 'aluno'}`}>
                  {(m.mensagem || !m.anexos?.length) && (
                    <div className="ticket-balao">{m.mensagem}</div>
                  )}
                  {m.anexos?.length > 0 && (
                    <div className="ticket-balao" style={{ marginTop: m.mensagem ? '4px' : 0 }}>
                      <TicketAnexosEnviados anexos={m.anexos} onBaixar={handleBaixarAnexo} />
                    </div>
                  )}
                  <div className="ticket-msg-meta">
                    {m.autor_tipo === 'admin' ? (m.autor_nome || 'Equipe Conatus') : 'Você'} · {dataHora(m.criado_em)}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleResponder} style={{ padding: '20px 25px', borderTop: '1px solid var(--border)' }}>
              {fechado ? (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                  Este chamado foi encerrado. Se precisar de mais ajuda, abra um novo chamado.
                </p>
              ) : (
                <>
                  {/* Resolvido: avisa do fechamento automático antes do campo de
                      resposta, que é justamente o que reabre o chamado. */}
                  <div style={{ marginBottom: '14px' }}>
                    <TicketPrazoFechamento chamado={chamado} />
                  </div>
                  <label className="ticket-filtro-label" htmlFor="resposta-aluno">Responder</label>
                  <textarea id="resposta-aluno" className="ticket-filtro-campo" rows={4}
                    maxLength={5000}
                    style={{ resize: 'vertical' }}
                    placeholder="Escreva sua mensagem…"
                    value={resposta}
                    onChange={e => setResposta(e.target.value)} />
                  <div style={{ marginTop: '12px' }}>
                    <TicketSeletorAnexos
                      arquivos={anexosResposta}
                      onChange={setAnexosResposta}
                      onErro={msg => toast.error(msg)}
                      disabled={respondendo}
                    />
                  </div>
                  <button type="submit" className="admin-btn admin-btn-edit"
                    style={{ padding: '10px 25px', marginTop: '12px' }}
                    disabled={respondendo || (!resposta.trim() && anexosResposta.length === 0)}>
                    {respondendo ? 'Enviando…' : 'Responder'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Lista dos meus chamados ────────────────────────────────── */
  return (
    <div className="cursos-body">
      <div className="container">
        <div className="cursos-header">
          <h1>Suporte</h1>
          <p>Abra um chamado e acompanhe por aqui as respostas da nossa equipe.</p>
        </div>

        <div className="admin-table-container" style={{ marginBottom: '40px' }}>
          <div className="admin-table-header">
            <h2>Meus chamados ({chamados.length})</h2>
            <button className="admin-btn admin-btn-edit" style={{ padding: '10px 22px' }}
              onClick={() => setVista('novo')}>
              + Novo Chamado
            </button>
          </div>

          {chamados.length === 0 ? <ListaVazia /> : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Assunto</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Última atualização</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{numeroChamado(c.id)}</td>
                      <td>{c.assunto}</td>
                      <td><TicketPill tipo="status" valor={c.status} /></td>
                      <td><TicketPill tipo="prioridade" valor={c.prioridade} /></td>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{dataHora(c.atualizado_em)}</td>
                      <td>
                        <button className="admin-btn admin-btn-view"
                          onClick={() => abrirDetalhe(c.id)}
                          title="Abrir a conversa deste chamado">
                          Ver conversa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
