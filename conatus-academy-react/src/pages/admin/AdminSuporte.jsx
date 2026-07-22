import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { TicketPill } from '../../components/ui/TicketPill';
import {
  TICKET_STATUS, TICKET_PRIORIDADES, TICKET_CATEGORIAS,
  categoriaInfo, numeroChamado, dataHora,
} from '../../utils/suporte';

const FILTROS_INICIAIS = {
  busca: '', status: '', prioridade: '', categoria: '', ordem: 'recentes',
};

const RESUMO_VAZIO = {
  abertos: 0, em_atendimento: 0, resolvidos: 0, prioridade_alta: 0,
};

const CARDS = [
  { chave: 'abertos',         icone: '📨', label: 'Chamados Abertos' },
  { chave: 'em_atendimento',  icone: '⏳', label: 'Em Atendimento',  cor: 'var(--warning)' },
  { chave: 'resolvidos',      icone: '✅', label: 'Resolvidos',      cor: 'var(--success)' },
  { chave: 'prioridade_alta', icone: '⚠️', label: 'Prioridade Alta', cor: 'var(--danger)' },
];

export function AdminSuporte() {
  const toast = useToast();
  const navigate = useNavigate();
  // Fechar e excluir chamados são exclusivos de superadmin/diretor. isSuperAdmin
  // já cobre os dois papéis. O backend é a autoridade — aqui só escondemos os
  // controles que o admin comum não pode acionar.
  const { isSuperAdmin } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [resumo, setResumo] = useState(RESUMO_VAZIO);
  const [paginacao, setPaginacao] = useState({ pagina: 1, totalPaginas: 1, total: 0 });
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  // Só a busca é adiada; mudar um <select> aplica na hora.
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  // Distingue a primeira carga das recargas: sem isso a tabela piscaria
  // "Carregando…" a cada tecla digitada na busca.
  const primeiraCarga = useRef(true);

  // Pesquisa instantânea: espera a digitação parar para não disparar uma
  // requisição por tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAplicada(filtros.busca.trim());
      setPagina(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filtros.busca]);

  const carregar = useCallback(async () => {
    if (primeiraCarga.current) setLoading(true);
    try {
      const [lista, res] = await Promise.all([
        adminApi.getChamados({
          busca: buscaAplicada,
          status: filtros.status,
          prioridade: filtros.prioridade,
          categoria: filtros.categoria,
          ordem: filtros.ordem,
          pagina,
        }),
        adminApi.getSuporteResumo(),
      ]);
      setChamados(lista.chamados || []);
      setPaginacao({
        pagina: lista.pagina || 1,
        totalPaginas: lista.totalPaginas || 1,
        total: lista.total || 0,
      });
      // O servidor corrige a página quando ela não existe mais (ex.: um filtro
      // encolheu o resultado); o estado local acompanha a correção.
      if (lista.pagina && lista.pagina !== pagina) setPagina(lista.pagina);
      setResumo({ ...RESUMO_VAZIO, ...res });
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
      toast.error(err.message || 'Erro ao carregar os chamados.');
    } finally {
      setLoading(false);
      primeiraCarga.current = false;
    }
    // toast vem do contexto e é estável; incluí-lo recarregaria a lista à toa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaAplicada, filtros.status, filtros.prioridade, filtros.categoria, filtros.ordem, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  // Atualização em tempo real: chamados novos e respostas de alunos aparecem
  // sem F5. 30s (e não 15s como no chat) porque aqui não há conversa em curso;
  // pausa com a aba em segundo plano.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, 30000);
    return () => clearInterval(t);
  }, [carregar]);

  function alterarFiltro(campo, valor) {
    setFiltros(f => ({ ...f, [campo]: valor }));
    if (campo !== 'busca') setPagina(1);
  }

  async function handleEncerrar(chamado) {
    if (!confirm(
      `Encerrar o chamado ${numeroChamado(chamado.id)} — "${chamado.assunto}"?\n\n` +
      'Ele deixará de aceitar novas mensagens, inclusive do aluno.'
    )) return;
    try {
      const data = await adminApi.updateChamado(chamado.id, { status: 'fechado' });
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Chamado encerrado.');
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao encerrar o chamado.');
    }
  }

  async function handleExcluir(chamado) {
    if (!confirm(
      `Excluir o chamado ${numeroChamado(chamado.id)} — "${chamado.assunto}"?\n\n` +
      'Toda a conversa será apagada. Esta ação não pode ser desfeita.'
    )) return;
    try {
      const data = await adminApi.deleteChamado(chamado.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success('Chamado excluído.');
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir o chamado.');
    }
  }

  const semFiltros = !buscaAplicada && !filtros.status && !filtros.prioridade && !filtros.categoria;

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h1>Suporte</h1>
              <p>Gerencie solicitações, dúvidas e chamados dos alunos.</p>
            </div>
            <Link to="/admin/dashboard" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              ← Voltar ao Dashboard
            </Link>
          </div>
        </header>

        {/* ── Cards de resumo ── */}
        <div className="admin-stats">
          {CARDS.map(c => (
            <div className="admin-stat-card" key={c.chave}>
              <h3 style={c.cor ? { color: c.cor } : undefined}>{resumo[c.chave]}</h3>
              <p>{c.icone} {c.label}</p>
            </div>
          ))}
        </div>

        <div className="admin-table-container">
          <div className="admin-table-header">
            <h2>Chamados ({paginacao.total})</h2>
          </div>

          {/* ── Filtros combinados ── */}
          <div className="ticket-filtros">
            <div className="ticket-filtro-busca">
              <label className="ticket-filtro-label" htmlFor="busca-chamados">Pesquisar</label>
              <input
                id="busca-chamados"
                type="search"
                className="ticket-filtro-campo"
                placeholder="Nome, e-mail, nº do chamado ou assunto…"
                value={filtros.busca}
                onChange={e => alterarFiltro('busca', e.target.value)}
              />
            </div>
            <div>
              <label className="ticket-filtro-label" htmlFor="filtro-status">Status</label>
              <select id="filtro-status" className="ticket-filtro-campo"
                value={filtros.status} onChange={e => alterarFiltro('status', e.target.value)}>
                <option value="">Todos</option>
                {TICKET_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="ticket-filtro-label" htmlFor="filtro-prioridade">Prioridade</label>
              <select id="filtro-prioridade" className="ticket-filtro-campo"
                value={filtros.prioridade} onChange={e => alterarFiltro('prioridade', e.target.value)}>
                <option value="">Todas</option>
                {TICKET_PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="ticket-filtro-label" htmlFor="filtro-categoria">Categoria</label>
              <select id="filtro-categoria" className="ticket-filtro-campo"
                value={filtros.categoria} onChange={e => alterarFiltro('categoria', e.target.value)}>
                <option value="">Todas</option>
                {TICKET_CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="ticket-filtro-label" htmlFor="filtro-ordem">Ordenação</label>
              <select id="filtro-ordem" className="ticket-filtro-campo"
                value={filtros.ordem} onChange={e => alterarFiltro('ordem', e.target.value)}>
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Carregando…</div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table ticket-tabela">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Aluno</th>
                    <th>Email</th>
                    <th>Assunto</th>
                    <th>Categoria</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Última atualização</th>
                    <th>Responsável</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        {semFiltros
                          ? 'Nenhum chamado aberto até agora.'
                          : 'Nenhum chamado corresponde aos filtros selecionados.'}
                      </td>
                    </tr>
                  ) : (
                    chamados.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{numeroChamado(c.id)}</td>
                        <td style={{ fontWeight: 500 }}>
                          {c.aluno_nome}
                          {/* Sem conta: avisa que não há cadastro por trás e que
                              a resposta sai por e-mail. */}
                          {c.visitante && (
                            <span title="Chamado aberto pelo site, sem conta na plataforma"
                              style={{
                                marginLeft: '6px', fontSize: '0.68rem', fontWeight: 700,
                                color: 'var(--amber)', border: '1px solid var(--amber)',
                                borderRadius: 'var(--radius-pill)', padding: '1px 6px',
                              }}>
                              visitante
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{c.aluno_email}</td>
                        <td className="ticket-col-assunto">{c.assunto}</td>
                        <td style={{ fontSize: '0.85rem' }}>{categoriaInfo(c.categoria).label}</td>
                        <td><TicketPill tipo="prioridade" valor={c.prioridade} /></td>
                        <td><TicketPill tipo="status" valor={c.status} /></td>
                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{dataHora(c.atualizado_em)}</td>
                        <td style={{ fontSize: '0.85rem', color: c.responsavel_nome ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {c.responsavel_nome || 'Não atribuído'}
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button className="admin-btn admin-btn-view"
                              onClick={() => navigate(`/admin/suporte/${c.id}`)}
                              title="Abrir o chamado e responder">
                              Visualizar
                            </button>
                            <button className="admin-btn admin-btn-edit"
                              onClick={() => navigate(`/admin/suporte/${c.id}`)}
                              title="Editar status, prioridade e responsável">
                              Editar
                            </button>
                            {isSuperAdmin && (
                              <>
                                <button className="admin-btn admin-btn-edit"
                                  onClick={() => handleEncerrar(c)}
                                  disabled={c.status === 'fechado'}
                                  style={c.status === 'fechado' ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                  title={c.status === 'fechado' ? 'Chamado já encerrado' : 'Encerrar o chamado'}>
                                  Encerrar
                                </button>
                                <button className="admin-btn admin-btn-delete"
                                  onClick={() => handleExcluir(c)}
                                  title="Excluir o chamado e toda a conversa">
                                  Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Paginação ── */}
          {paginacao.totalPaginas > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: '12px', flexWrap: 'wrap', padding: '16px 25px',
              borderTop: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Página {paginacao.pagina} de {paginacao.totalPaginas}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="admin-btn admin-btn-edit"
                  onClick={() => setPagina(p => Math.max(p - 1, 1))}
                  disabled={paginacao.pagina <= 1}
                  style={paginacao.pagina <= 1 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                  ← Anterior
                </button>
                <button className="admin-btn admin-btn-edit"
                  onClick={() => setPagina(p => Math.min(p + 1, paginacao.totalPaginas))}
                  disabled={paginacao.pagina >= paginacao.totalPaginas}
                  style={paginacao.pagina >= paginacao.totalPaginas ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
