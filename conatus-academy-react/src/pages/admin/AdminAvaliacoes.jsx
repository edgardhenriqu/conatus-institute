import { useMemo, useState } from 'react';
import { mopQuestions } from '../../data/mopQuestions';
import { MAX_ATTEMPTS, PASS_PERCENT, QUESTIONS_PER } from '../../utils/mopProgress';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function AdminAvaliacoes() {
  const [busca, setBusca] = useState('');
  const [expandida, setExpandida] = useState(null); // id da questão expandida

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mopQuestions;
    return mopQuestions.filter(q =>
      q.enunciado.toLowerCase().includes(termo) ||
      q.alternativas.some(a => a.toLowerCase().includes(termo))
    );
  }, [busca]);

  return (
    <div className="admin-body">
      <div className="admin-container">
        <header className="admin-header">
          <h1>Avaliações</h1>
          <p>Configuração e banco de questões da avaliação final do curso de MOPs</p>
        </header>

        {/* Regras da avaliação */}
        <div className="admin-stats">
          <div className="admin-stat-card">
            <h3>{mopQuestions.length}</h3>
            <p>Questões no Banco</p>
          </div>
          <div className="admin-stat-card">
            <h3>{QUESTIONS_PER}</h3>
            <p>Questões por Tentativa</p>
          </div>
          <div className="admin-stat-card">
            <h3>{PASS_PERCENT}%</h3>
            <p>Nota Mínima</p>
          </div>
          <div className="admin-stat-card">
            <h3>{MAX_ATTEMPTS}</h3>
            <p>Tentativas Máximas</p>
          </div>
        </div>

        <div className="catalog-internal-note" style={{ marginBottom: '20px' }}>
          <span>ℹ️</span>
          <span>
            As questões são selecionadas aleatoriamente a cada tentativa. O certificado é
            liberado somente com 100% das aulas concluídas e aprovação na avaliação.
            Para criar ou editar questões, atualize o arquivo
            {' '}<code>src/data/mopQuestions.js</code> — as mudanças entram em vigor no próximo deploy.
          </span>
        </div>

        {/* Banco de questões */}
        <div className="admin-table-container" style={{ padding: '24px' }}>
          <div className="admin-table-header" style={{ padding: '0 0 18px' }}>
            <h2>Banco de Questões ({filtradas.length})</h2>
            <input
              type="text"
              className="admin-search"
              placeholder="Buscar no enunciado ou alternativas..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="qbank-list">
            {filtradas.length === 0 && (
              <div className="catalog-empty">Nenhuma questão encontrada para "{busca}".</div>
            )}
            {filtradas.map((q, idx) => {
              const aberta = expandida === q.id;
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
                        {q.alternativas.map((alt, i) => (
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
        </div>
      </div>
    </div>
  );
}
