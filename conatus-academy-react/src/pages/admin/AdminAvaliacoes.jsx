import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { adminApi } from '../../services/adminApi';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function AdminAvaliacoes() {
  const [busca, setBusca] = useState('');
  const [expandida, setExpandida] = useState(null);

  // Cursos e seleção
  const [cursos, setCursos] = useState([]);
  const [cursoSelecionado, setCursoSelecionado] = useState(null);
  const [loadingCursos, setLoadingCursos] = useState(true);

  // Questões do curso selecionado
  const [questoes, setQuestoes] = useState([]);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);

  // Config da avaliação do curso selecionado
  const [avaliacaoConfig, setAvaliacaoConfig] = useState(null);

  // Busca cursos ao montar
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAdminCursos();
        const lista = data.cursos || [];
        setCursos(lista);
        if (lista.length > 0) {
          setCursoSelecionado(lista[0].id);
        }
      } catch (err) {
        console.error('Erro ao buscar cursos:', err);
      } finally {
        setLoadingCursos(false);
      }
    })();
  }, []);

  // Busca questões e config quando muda o curso
  const carregarDadosCurso = useCallback(async (cursoId) => {
    if (!cursoId) return;
    setLoadingQuestoes(true);
    setQuestoes([]);
    setAvaliacaoConfig(null);
    try {
      const [qData, avData] = await Promise.all([
        adminApi.getQuestions(cursoId),
        adminApi.getQuizConfig(cursoId),
      ]);
      setQuestoes(qData.questoes || []);
      setAvaliacaoConfig(avData.avaliacao || null);
    } catch (err) {
      console.error('Erro ao carregar dados do curso:', err);
    } finally {
      setLoadingQuestoes(false);
    }
  }, []);

  useEffect(() => {
    if (cursoSelecionado) {
      carregarDadosCurso(cursoSelecionado);
      setExpandida(null);
      setBusca('');
    }
  }, [cursoSelecionado, carregarDadosCurso]);

  // Filtra questões pela busca
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return questoes;
    return questoes.filter(q =>
      q.enunciado.toLowerCase().includes(termo) ||
      (Array.isArray(q.alternativas) && q.alternativas.some(a => String(a).toLowerCase().includes(termo)))
    );
  }, [busca, questoes]);

  const cursoAtual = cursos.find(c => c.id === cursoSelecionado);

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <h1>Avaliações</h1>
          <p>Banco de questões e configuração das avaliações por curso</p>
        </header>

        {/* Filtro de curso */}
        <div className="admin-table-container" style={{ padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <label
              htmlFor="curso-filter"
              style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              📚 Selecionar Curso:
            </label>
            {loadingCursos ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Carregando cursos...</span>
            ) : cursos.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum curso encontrado</span>
            ) : (
              <select
                id="curso-filter"
                className="admin-search"
                style={{ width: 'auto', minWidth: '320px', flex: 1, maxWidth: '600px', cursor: 'pointer' }}
                value={cursoSelecionado || ''}
                onChange={e => setCursoSelecionado(Number(e.target.value))}
              >
                {cursos.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({parseInt(c.total_questoes || 0)} questões)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Stats da avaliação do curso selecionado */}
        {cursoSelecionado && !loadingQuestoes && (
          <div className="admin-stats">
            <div className="admin-stat-card">
              <h3>{questoes.length}</h3>
              <p>Questões no Banco</p>
            </div>
            <div className="admin-stat-card">
              <h3>{avaliacaoConfig?.num_questoes ?? '—'}</h3>
              <p>Questões por Tentativa</p>
            </div>
            <div className="admin-stat-card">
              <h3>{avaliacaoConfig ? `${avaliacaoConfig.nota_minima}%` : '—'}</h3>
              <p>Nota Mínima</p>
            </div>
            <div className="admin-stat-card">
              <h3>{avaliacaoConfig?.max_tentativas ?? '—'}</h3>
              <p>Tentativas Máximas</p>
            </div>
          </div>
        )}

        {/* Nota informativa */}
        {cursoSelecionado && !loadingQuestoes && (
          <div className="catalog-internal-note" style={{ marginBottom: '20px' }}>
            <span>ℹ️</span>
            <span>
              As questões são selecionadas aleatoriamente a cada tentativa. O certificado é
              liberado somente com 100% das aulas concluídas e aprovação na avaliação.
              {avaliacaoConfig == null && (
                <strong style={{ display: 'block', marginTop: '8px', color: 'var(--warning)' }}>
                  ⚠️ Este curso ainda não possui configuração de avaliação. Configure a avaliação no editor do curso.
                </strong>
              )}
            </span>
          </div>
        )}

        {/* Banco de questões */}
        <div className="admin-table-container" style={{ padding: '24px' }}>
          <div className="admin-table-header" style={{ padding: '0 0 18px' }}>
            <h2>
              Banco de Questões
              {cursoAtual ? ` — ${cursoAtual.nome}` : ''}
              {!loadingQuestoes && ` (${filtradas.length})`}
            </h2>
            <input
              type="text"
              className="admin-search"
              placeholder="Buscar no enunciado ou alternativas..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              disabled={loadingQuestoes}
            />
          </div>

          {loadingQuestoes ? (
            <div className="catalog-empty" style={{ padding: '40px 0' }}>Carregando questões...</div>
          ) : (
            <div className="qbank-list">
              {filtradas.length === 0 && questoes.length === 0 && (
                <div className="catalog-empty">
                  Este curso ainda não possui questões cadastradas.
                  {cursoAtual && (
                    <span style={{ display: 'block', marginTop: '8px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      Adicione questões no editor do curso "{cursoAtual.nome}".
                    </span>
                  )}
                </div>
              )}
              {filtradas.length === 0 && questoes.length > 0 && (
                <div className="catalog-empty">Nenhuma questão encontrada para "{busca}".</div>
              )}
              {filtradas.map((q, idx) => {
                const aberta = expandida === q.id;
                const alternativas = Array.isArray(q.alternativas)
                  ? q.alternativas
                  : (typeof q.alternativas === 'string' ? JSON.parse(q.alternativas) : []);
                return (
                  <div key={q.id} className="qbank-item">
                    <div
                      className="qbank-item-head"
                      style={{ cursor: 'pointer', marginBottom: aberta ? '10px' : 0 }}
                      onClick={() => setExpandida(aberta ? null : q.id)}
                    >
                      <span className="qbank-number">{idx + 1}</span>
                      <span className="qbank-question" style={{ flex: 1 }}>{q.enunciado}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{aberta ? '▲' : '▼'}</span>
                    </div>

                    {aberta && (
                      <>
                        <div className="qbank-alternatives">
                          {alternativas.map((alt, i) => (
                            <div key={i} className={`qbank-alt ${i === q.correta ? 'correct' : ''}`}>
                              <strong>{LETTERS[i]})</strong>
                              <span>{alt}</span>
                              {i === q.correta && <span style={{ marginLeft: 'auto' }}>✓ Correta</span>}
                            </div>
                          ))}
                        </div>
                        {q.explicacao && (
                          <div className="qbank-explanation">
                            <strong>Explicação:</strong> {q.explicacao}
                          </div>
                        )}
                      </>
                    )}
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
