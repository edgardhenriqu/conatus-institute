import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../components/ui/Toast';
import { PageLoader } from '../../components/ui/PageLoader';
import { TicketPill } from '../../components/ui/TicketPill';
import { TicketSeletorAnexos, TicketAnexosEnviados } from '../../components/ui/TicketAnexos';
import { TicketPrazoFechamento } from '../../components/ui/TicketPrazoFechamento';
import { ROLE_LABELS } from '../../utils/permissions';
import {
  TICKET_STATUS, TICKET_PRIORIDADES,
  categoriaInfo, numeroChamado, dataHora, statusInfo, prioridadeInfo,
} from '../../utils/suporte';

/** Rótulo + valor dos painéis de informação. */
function Dado({ label, children }) {
  return (
    <div>
      <div className="ticket-dado-label">{label}</div>
      <div className="ticket-dado-valor">{children ?? '—'}</div>
    </div>
  );
}

/** Uma linha do histórico em português, a partir do evento cru do banco. */
function descreverEvento(e) {
  const quem = e.ator_nome || 'Alguém';
  switch (e.acao) {
    case 'status':
      return `${quem} mudou o status de "${statusInfo(e.valor_de).label}" para "${statusInfo(e.valor_para).label}".`;
    case 'prioridade':
      return `${quem} mudou a prioridade de "${prioridadeInfo(e.valor_de).label}" para "${prioridadeInfo(e.valor_para).label}".`;
    case 'responsavel':
      if (!e.valor_para) return `${quem} removeu o responsável (era ${e.valor_de}).`;
      if (!e.valor_de) return `${quem} atribuiu o chamado a ${e.valor_para}.`;
      return `${quem} trocou o responsável de ${e.valor_de} para ${e.valor_para}.`;
    case 'observacao':
      return `${quem} editou a observação interna.`;
    default:
      return `${quem} alterou o chamado (${e.acao}).`;
  }
}

export function AdminSuporteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [chamado, setChamado] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [aluno, setAluno] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [atendentes, setAtendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  const [resposta, setResposta] = useState('');
  const [interna, setInterna] = useState(false);
  const [anexos, setAnexos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Rascunho do card lateral. Fica separado de `chamado` para o admin poder
  // mexer nos campos e só then gravar ao clicar em Salvar.
  const [gestao, setGestao] = useState({
    status: '', prioridade: '', responsavel_id: '', observacao_interna: '',
  });
  const [salvando, setSalvando] = useState(false);

  const chatRef = useRef(null);

  /**
   * @param sincronizarRascunho — quando true, o card lateral volta a espelhar o
   * banco. O polling passa false: sincronizar a cada 15s apagaria o que o admin
   * está digitando na observação interna no meio da frase.
   */
  const carregar = useCallback(async (sincronizarRascunho = true) => {
    try {
      const data = await adminApi.getChamado(id);
      setChamado(data.chamado);
      setMensagens(data.mensagens || []);
      setAluno(data.aluno || null);
      setEventos(data.eventos || []);
      if (sincronizarRascunho) {
        setGestao({
          status: data.chamado.status,
          prioridade: data.chamado.prioridade,
          responsavel_id: data.chamado.responsavel_id || '',
          observacao_interna: data.chamado.observacao_interna || '',
        });
      }
    } catch (err) {
      // O servidor devolve 404 tanto para chamado inexistente quanto para o de
      // outro dono — a tela trata os dois como "não encontrado".
      console.error('Erro ao carregar chamado:', err);
      setNaoEncontrado(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Atualização em tempo real (polling): traz a resposta do aluno sem F5.
  // Pausa com a aba em segundo plano — ninguém está lendo, e é o que evita
  // dezenas de requisições por hora em aba esquecida aberta.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') carregar(false);
    }, 15000);
    return () => clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    adminApi.getAtendentes()
      .then(d => setAtendentes(d.atendentes || []))
      .catch(() => { /* sem lista: o seletor fica só com "Não atribuído" */ });
  }, []);

  // Rola para a mensagem mais recente — mas só se o admin JÁ estava no fim.
  // Com o polling a cada 15s, rolar sempre arrancaria a leitura de quem subiu
  // para reler o histórico. A margem de 80px cobre o "quase no fim".
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const noFim = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (noFim) el.scrollTop = el.scrollHeight;
  }, [mensagens]);

  async function handleResponder(e) {
    e.preventDefault();
    const texto = resposta.trim();
    // Mensagem só com anexo é válida ("segue o documento").
    if ((!texto && anexos.length === 0) || enviando) return;
    setEnviando(true);
    try {
      const data = await adminApi.responderChamado(id, texto, interna, anexos);
      if (data.erro) { toast.error(data.erro); return; }
      setResposta('');
      setInterna(false);
      setAnexos([]);
      toast.success(interna ? 'Observação interna registrada.' : 'Resposta enviada ao aluno.');
      // Recarrega tudo: o status e o responsável mudam no servidor ao responder.
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar a resposta.');
    } finally {
      setEnviando(false);
    }
  }

  async function handleBaixarAnexo(anexoId, nome) {
    try {
      await adminApi.baixarAnexo(anexoId, nome);
    } catch (err) {
      toast.error(err.message || 'Erro ao baixar o anexo.');
    }
  }

  async function handleSalvarGestao(e) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      const data = await adminApi.updateChamado(id, gestao);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Chamado atualizado.');
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar o chamado.');
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <PageLoader message="Carregando chamado…" />;

  if (naoEncontrado) {
    return (
      <div className="admin-body">
        <div className="admin-container">
          <header className="admin-header">
            <h1>Chamado não encontrado</h1>
            <p>Ele pode ter sido excluído.</p>
          </header>
          <Link to="/admin/suporte" className="admin-btn admin-btn-edit" style={{ padding: '10px 25px' }}>
            ← Voltar para o Suporte
          </Link>
        </div>
      </div>
    );
  }

  const fechado = chamado.status === 'fechado';

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1>Chamado {numeroChamado(chamado.id)}</h1>
              <p>{chamado.assunto}</p>
            </div>
            <button onClick={() => navigate('/admin/suporte')}
              style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}>
              ← Voltar para o Suporte
            </button>
          </div>
        </header>

        {/* ── Informações do aluno e do chamado ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div className="admin-table-container">
            <div className="admin-table-header" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <h2>{aluno?.visitante ? 'Informações do solicitante' : 'Informações do aluno'}</h2>
              {aluno?.visitante && (
                <span className="ticket-pill" style={{ '--pill-cor': 'var(--amber)' }}>
                  Sem conta
                </span>
              )}
            </div>
            <div className="ticket-dados">
              <Dado label="Nome">{aluno?.nome}</Dado>
              <Dado label="Email">{aluno?.email}</Dado>
              {/* Visitante não tem cadastro: empresa, perfil e matrículas não
                  existem, e mostrá-los vazios sugeriria dado faltando. */}
              {aluno?.visitante ? (
                <Dado label="Cadastro">
                  <span style={{ color: 'var(--text-muted)' }}>
                    Chamado aberto pelo site, sem conta na plataforma.
                    A resposta chega a esta pessoa por e-mail.
                  </span>
                </Dado>
              ) : (
                <>
                  <Dado label="Empresa">{aluno?.empresa}</Dado>
                  <Dado label="Perfil">{ROLE_LABELS[aluno?.role] || aluno?.role}</Dado>
                  <Dado label="Cursos matriculados">
                    {aluno?.matriculas?.length
                      ? (
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {aluno.matriculas.map((m, i) => (
                            <li key={i}>{m.curso_nome} <span style={{ color: 'var(--text-muted)' }}>({m.progresso || 0}%)</span></li>
                          ))}
                        </ul>
                      )
                      : 'Nenhuma matrícula'}
                  </Dado>
                </>
              )}
            </div>
          </div>

          <div className="admin-table-container">
            <div className="admin-table-header"><h2>Informações do chamado</h2></div>
            <div className="ticket-dados">
              <Dado label="Número">{numeroChamado(chamado.id)}</Dado>
              <Dado label="Data de abertura">{dataHora(chamado.criado_em)}</Dado>
              <Dado label="Categoria">{categoriaInfo(chamado.categoria).label}</Dado>
              <Dado label="Prioridade"><TicketPill tipo="prioridade" valor={chamado.prioridade} /></Dado>
              <Dado label="Status"><TicketPill tipo="status" valor={chamado.status} /></Dado>
              <Dado label="Responsável">{chamado.responsavel_nome || 'Não atribuído'}</Dado>
            </div>
          </div>
        </div>

        {/* ── Conversa + alteração rápida ── */}
        <div className="ticket-detalhe-grid">
          <div className="admin-table-container">
            <div className="admin-table-header">
              <h2>Conversa</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
              </span>
            </div>

            <div className="ticket-chat" ref={chatRef}>
              {mensagens.map(m => (
                <div key={m.id}
                  className={`ticket-msg ticket-msg-${m.autor_tipo === 'admin' ? 'admin' : 'aluno'}${m.interna ? ' ticket-msg-interna' : ''}`}>
                  {/* Mensagem só com anexo não rende balão de texto vazio. */}
                  {(m.mensagem || !m.anexos?.length) && (
                    <div className="ticket-balao">{m.mensagem}</div>
                  )}
                  {m.anexos?.length > 0 && (
                    <div className="ticket-balao" style={{ marginTop: m.mensagem ? '4px' : 0 }}>
                      <TicketAnexosEnviados anexos={m.anexos} onBaixar={handleBaixarAnexo} />
                    </div>
                  )}
                  <div className="ticket-msg-meta">
                    {m.interna && '🔒 Nota interna · '}
                    {m.autor_nome || (m.autor_tipo === 'admin' ? 'Equipe' : 'Aluno')} · {dataHora(m.criado_em)}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Campo de resposta ── */}
            <form onSubmit={handleResponder} style={{ padding: '20px 25px', borderTop: '1px solid var(--border)' }}>
              {fechado ? (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                  Este chamado está fechado e não aceita novas mensagens.
                  Reabra-o alterando o status no card ao lado.
                </p>
              ) : (
                <>
                  <label className="ticket-filtro-label" htmlFor="resposta">Responder</label>
                  <textarea
                    id="resposta"
                    className="ticket-filtro-campo"
                    rows={4}
                    style={{ resize: 'vertical' }}
                    placeholder="Escreva a resposta ao aluno…"
                    value={resposta}
                    onChange={e => setResposta(e.target.value)}
                  />
                  <div style={{ marginTop: '12px' }}>
                    <TicketSeletorAnexos
                      arquivos={anexos}
                      onChange={setAnexos}
                      onErro={msg => toast.error(msg)}
                      disabled={enviando}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button type="submit" className="admin-btn admin-btn-edit"
                      style={{ padding: '10px 25px' }}
                      disabled={enviando || (!resposta.trim() && anexos.length === 0)}>
                      {enviando ? 'Enviando…' : 'Responder'}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={interna}
                        onChange={e => setInterna(e.target.checked)} />
                      Nota interna (o aluno não vê)
                    </label>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* ── Card lateral: alteração rápida ── */}
          <div className="admin-table-container">
            <div className="admin-table-header"><h2>Alteração rápida</h2></div>
            <form onSubmit={handleSalvarGestao} style={{ padding: '20px 25px', display: 'grid', gap: '16px' }}>
              {/* Deixa claro que "resolvido" tem prazo — e que quem fecha é o
                  sistema, não um colega. */}
              <TicketPrazoFechamento chamado={chamado} paraEquipe />
              <div>
                <label className="ticket-filtro-label" htmlFor="g-status">Editar status</label>
                <select id="g-status" className="ticket-filtro-campo" value={gestao.status}
                  onChange={e => setGestao(g => ({ ...g, status: e.target.value }))}>
                  {TICKET_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ticket-filtro-label" htmlFor="g-prioridade">Prioridade</label>
                <select id="g-prioridade" className="ticket-filtro-campo" value={gestao.prioridade}
                  onChange={e => setGestao(g => ({ ...g, prioridade: e.target.value }))}>
                  {TICKET_PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="ticket-filtro-label" htmlFor="g-responsavel">Responsável</label>
                <select id="g-responsavel" className="ticket-filtro-campo" value={gestao.responsavel_id}
                  onChange={e => setGestao(g => ({ ...g, responsavel_id: e.target.value }))}>
                  <option value="">Não atribuído</option>
                  {atendentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="ticket-filtro-label" htmlFor="g-obs">Observação interna</label>
                <textarea id="g-obs" className="ticket-filtro-campo" rows={4}
                  style={{ resize: 'vertical' }}
                  placeholder="Anotações da equipe sobre este chamado."
                  value={gestao.observacao_interna}
                  onChange={e => setGestao(g => ({ ...g, observacao_interna: e.target.value }))} />
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Visível apenas para a equipe — o aluno nunca recebe este texto.
                </p>
              </div>
              <button type="submit" className="admin-btn admin-btn-edit"
                style={{ padding: '10px 25px' }} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </form>

            {/* ── Histórico de alterações (log da equipe) ── */}
            <div className="admin-table-header" style={{ borderTop: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1rem' }}>Histórico de alterações</h2>
            </div>
            {eventos.length === 0 ? (
              <p style={{ padding: '20px 25px', margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Nenhuma alteração registrada ainda.
              </p>
            ) : (
              <ul className="ticket-historico">
                {eventos.map(ev => (
                  <li key={ev.id}>
                    <span>
                      {descreverEvento(ev)}
                      <br />
                      <span className="ticket-historico-quando">{dataHora(ev.criado_em)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
