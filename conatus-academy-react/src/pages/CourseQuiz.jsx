import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { PageLoader } from '../components/ui/PageLoader';
import { mopQuestions } from '../data/mopQuestions';
import {
  canTakeQuiz, saveAttempt, quizStatus,
  calcLessonStats,
  MAX_ATTEMPTS, PASS_PERCENT, QUESTIONS_PER,
} from '../utils/mopProgress';
import { mopCourseContent } from '../data/mopCourseContent';

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Embaralha as alternativas de UMA questão apenas para exibição, preservando
   o índice original (`origIdx`) de cada opção. O índice original é o que vai
   para `answers`/servidor — assim a correção (respostas[q.id] === q.correta) e
   a revisão continuam válidas mesmo com a ordem visual trocada.
   Reembaralha se sair idêntico à ordem original, para nunca repetir. */
function shuffleAlternativas(alternativas) {
  const opcoes = (Array.isArray(alternativas) ? alternativas : [])
    .map((texto, origIdx) => ({ texto, origIdx }));
  if (opcoes.length < 2) return opcoes;

  let out;
  let tentativas = 0;
  do {
    out = shuffle(opcoes);
    tentativas++;
  } while (tentativas < 6 && out.every((o, i) => o.origIdx === i));
  return out;
}

export function CourseQuiz() {
  const { id } = useParams();
  // Só a rota estática legada usa o quiz MOP; id 6 hoje é um curso do banco (Huawei).
  const isMop = id === 'mop-interno';
  return isMop ? <MopQuiz /> : <DbQuiz cursoId={id} />;
}

/* Reconstrói as opções na MESMA ordem que o aluno viu na prova, a partir das
   alternativas originais e da permutação salva (`ordem` = array de origIdx por
   posição). Sem permutação (tentativas antigas), usa a ordem canônica. */
function opcoesNaOrdemExibida(alternativas, ordem) {
  const alts = Array.isArray(alternativas) ? alternativas : [];
  if (Array.isArray(ordem) && ordem.length === alts.length) {
    return ordem.map((origIdx) => ({ texto: alts[origIdx], origIdx }));
  }
  return alts.map((texto, origIdx) => ({ texto, origIdx }));
}

/* Lista de revisão reutilizável (correção pós-prova e revisão persistida).
   Recebe itens já normalizados, com as opções na ordem exibida:
   { id, enunciado, opcoes: [{ texto, origIdx }], correta, explicacao, resposta, acertou }.
   As comparações usam `origIdx` (índice original), então batem com `correta`
   e `resposta`, que estão sempre no espaço original das alternativas. */
function QuizReviewList({ itens }) {
  return (
    <>
      {itens.map((it, i) => {
        const sel = it.resposta;
        const opcoes = it.opcoes || opcoesNaOrdemExibida(it.alternativas, it.ordem);
        return (
          <div key={it.id ?? i} className="quiz-review-item">
            <div className="quiz-review-q">
              <span className={`review-status ${it.acertou ? 'ok' : 'fail'}`}>
                {it.acertou ? '✓' : '✗'}
              </span>
              <span>{i + 1}. {it.enunciado}</span>
            </div>
            <div className="quiz-options">
              {opcoes.map((op, idx) => {
                let cls = 'quiz-option';
                if (op.origIdx === it.correta) cls += ' correct';
                else if (op.origIdx === sel) cls += ' wrong';
                else cls += ' dimmed';
                return (
                  <div key={idx} className={cls}>
                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                    <span>{op.texto}</span>
                    {op.origIdx === sel && op.origIdx === it.correta && <span className="review-tag ok">sua resposta ✓</span>}
                    {op.origIdx === sel && op.origIdx !== it.correta && <span className="review-tag fail">sua resposta ✗</span>}
                    {op.origIdx === it.correta && op.origIdx !== sel && <span className="review-tag ok">resposta correta</span>}
                  </div>
                );
              })}
            </div>
            {it.explicacao && (
              <div className={`quiz-explanation ${it.acertou ? 'correct' : 'wrong'}`}>
                <strong>{it.acertou ? '✅ Você acertou' : '❌ Você errou'}</strong>
                <p>{it.explicacao}</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   AVALIAÇÃO DE CURSOS DO BANCO (corrigida no servidor)
   ════════════════════════════════════════════════════════════════ */

function DbQuiz({ cursoId }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase]       = useState('loading'); // loading | intro | running | result
  const [status, setStatus]     = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent]   = useState(0);
  const [answers, setAnswers]   = useState({});  // questaoId → índice
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false); // revisão pós-prova (acertos/erros)
  const [reviewData, setReviewData] = useState(null);   // revisão persistida da última tentativa
  const [loadingReview, setLoadingReview] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    async function load() {
      try {
        const data = await api.getAvaliacaoStatus(cursoId);
        setStatus(data);
        setPhase('intro');
      } catch (err) {
        setError(err.message || 'Não foi possível carregar a avaliação.');
        setPhase('intro');
      }
    }
    load();
  }, [cursoId, user, navigate]);

  async function startQuiz() {
    try {
      const data = await api.iniciarAvaliacao(cursoId);
      if (data.erro) { setError(data.erro); return; }
      // Embaralha as alternativas de cada questão (só exibição; origIdx preservado)
      const qs = (data.questoes || []).map(q => ({
        ...q,
        opcoes: shuffleAlternativas(q.alternativas),
      }));
      setQuestions(qs);
      setAnswers({});
      setCurrent(0);
      setError('');
      setShowReview(false);
      setPhase('running');
    } catch (err) {
      setError(err.message || 'Erro ao iniciar a avaliação.');
    }
  }

  async function loadUltimaRevisao() {
    setLoadingReview(true);
    setError('');
    try {
      const data = await api.getRevisaoUltimaTentativa(cursoId);
      if (!data.existe || !(data.revisao || []).length) {
        setError('Não há tentativa anterior para revisar.');
        return;
      }
      // Reconstrói as opções na ordem que o aluno viu na tentativa.
      data.revisao = (data.revisao || []).map((it) => ({
        ...it,
        opcoes: opcoesNaOrdemExibida(it.alternativas, it.ordem),
      }));
      setReviewData(data);
      setPhase('review');
    } catch (err) {
      setError(err.message || 'Não foi possível carregar a revisão.');
    } finally {
      setLoadingReview(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Envia a ordem em que as alternativas foram exibidas (p/ a revisão futura).
      const ordens = {};
      for (const q of questions) {
        ordens[q.id] = (q.opcoes || []).map((op) => op.origIdx);
      }
      const data = await api.submeterAvaliacao(cursoId, answers, ordens);
      if (data.erro) { setError(data.erro); setPhase('intro'); return; }
      setResult(data);
      setPhase('result');
    } catch (err) {
      setError(err.message || 'Erro ao enviar respostas.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') return <PageLoader message="Carregando avaliação..." />;

  /* ── REVISÃO PERSISTIDA (última tentativa) ── */
  if (phase === 'review' && reviewData) {
    return (
      <div className="quiz-page">
        <div className="quiz-result-stack">
          <div className="quiz-card">
            <div className="quiz-header">
              <button type="button" className="quiz-back quiz-back-btn"
                onClick={() => { setPhase('intro'); setReviewData(null); }}>
                ← Voltar
              </button>
              <h1>Revisão da última prova</h1>
            </div>
            <div className="quiz-review-summary">
              <span className={`hist-value ${reviewData.aprovado ? 'pass' : 'fail'}`}>{reviewData.nota}%</span>
              <span>
                {reviewData.aprovado ? 'Aprovado' : 'Reprovado'}
                {reviewData.data && ` · ${new Date(reviewData.data).toLocaleDateString('pt-BR')}`}
              </span>
            </div>

            {/* Ainda tem tentativa sobrando? Permite tentar de novo direto da revisão.
                Só a nota máxima (100%) encerra — aprovado com nota menor pode refazer.
                Não exige 100% das aulas: isso vale só para o certificado. */}
            {status && (status.melhor ?? 0) < 100 && (status.restantes ?? 0) > 0 && (
              <button className="btn-quiz-start" style={{ marginTop: '18px' }} onClick={startQuiz}>
                Tentar Novamente ({status.restantes} {status.restantes === 1 ? 'restante' : 'restantes'})
              </button>
            )}
          </div>
          <div className="quiz-card quiz-review">
            <QuizReviewList itens={reviewData.revisao} />
          </div>
        </div>
      </div>
    );
  }

  /* ── INTRO ── */
  if (phase === 'intro') {
    const semAvaliacao = !status?.existe;
    // A prova não é mais bloqueada pelas aulas — o aluno pode usar as tentativas
    // antes de concluir 100%. Abaixo de 100% mostramos só um aviso de que o
    // CERTIFICADO ainda depende de completar as aulas.
    const aulasIncompletas = status?.existe && (status.progresso ?? 0) < 100;
    // Só a NOTA MÁXIMA (100%) encerra a avaliação. Aprovado com nota menor pode
    // refazer para buscar 100%, desde que ainda tenha tentativas.
    const notaMaxima = status?.existe && (status.melhor ?? 0) >= 100;
    const podeTentar = status?.existe && !notaMaxima && (status.restantes ?? 0) > 0;
    const semTentativas = status?.existe && (status.restantes ?? 0) === 0 && !notaMaxima && !status.aprovado;

    return (
      <div className="quiz-page">
        <div className="quiz-card">
          <div className="quiz-header">
            <Link to={`/cursos/${cursoId}/sala-de-aula`} className="quiz-back">← Voltar ao Curso</Link>
            <h1>Avaliação Final</h1>
          </div>

          {error && (
            <div className="quiz-blocked danger">
              <span className="blocked-icon">⚠️</span>
              <div><strong>Não foi possível continuar</strong><p>{error}</p></div>
            </div>
          )}

          {semAvaliacao && !error && (
            <div className="quiz-blocked">
              <span className="blocked-icon">ℹ️</span>
              <div>
                <strong>Este curso não possui avaliação final</strong>
                <p>O certificado é liberado ao concluir 100% das aulas obrigatórias.</p>
                <Link to={`/cursos/${cursoId}/sala-de-aula`} className="btn-quiz-secondary">Voltar às aulas</Link>
              </div>
            </div>
          )}

          {status?.existe && (
            <>
              {status.tentativas > 0 && (
                <div className="quiz-history">
                  <h3>Seu histórico</h3>
                  <div className="quiz-history-grid">
                    <div className="quiz-hist-item">
                      <span className="hist-label">Tentativas realizadas</span>
                      <span className="hist-value">{status.tentativas} / {status.max_tentativas}</span>
                    </div>
                    <div className="quiz-hist-item">
                      <span className="hist-label">Melhor pontuação</span>
                      <span className={`hist-value ${status.melhor >= status.nota_minima ? 'pass' : 'fail'}`}>
                        {status.melhor}%
                      </span>
                    </div>
                    <div className="quiz-hist-item">
                      <span className="hist-label">Status</span>
                      <span className={`hist-value ${status.aprovado ? 'pass' : 'fail'}`}>
                        {status.aprovado ? 'Aprovado' : 'Reprovado'}
                      </span>
                    </div>
                  </div>
                  <button className="btn-quiz-secondary" style={{ marginTop: '14px', width: '100%' }}
                    onClick={loadUltimaRevisao} disabled={loadingReview}>
                    {loadingReview ? 'Carregando...' : '📋 Revisar minha última prova (acertos e erros)'}
                  </button>
                </div>
              )}

              <div className="quiz-rules">
                <h3>Regras da Avaliação</h3>
                <ul>
                  <li><span className="rule-icon">📋</span><span><strong>{status.num_questoes} perguntas</strong> selecionadas aleatoriamente de um banco com {status.total_questoes_banco} questões</span></li>
                  <li><span className="rule-icon">✅</span><span>Nota mínima para aprovação: <strong>{status.nota_minima}%</strong></span></li>
                  <li><span className="rule-icon">🔄</span><span>Máximo de <strong>{status.max_tentativas} tentativas</strong></span></li>
                  <li><span className="rule-icon">🎓</span><span>Certificado liberado após <strong>100% das aulas</strong> e <strong>aprovação na avaliação</strong></span></li>
                  <li><span className="rule-icon">🛡️</span><span>A correção é feita pelo servidor — o resultado aparece ao enviar a prova</span></li>
                </ul>
              </div>

              {aulasIncompletas && !notaMaxima && (
                <div className="quiz-blocked">
                  <span className="blocked-icon">ℹ️</span>
                  <div>
                    <strong>Você já pode fazer a avaliação</strong>
                    <p>Progresso das aulas: <strong>{status.progresso}%</strong>. A prova está liberada e você pode usar suas tentativas — mas o <strong>certificado</strong> só é emitido após concluir 100% das aulas.</p>
                    <Link to={`/cursos/${cursoId}/sala-de-aula`} className="btn-quiz-secondary">Continuar aulas</Link>
                  </div>
                </div>
              )}

              {semTentativas && (
                <div className="quiz-blocked danger">
                  <span className="blocked-icon">⛔</span>
                  <div>
                    <strong>Limite de tentativas atingido</strong>
                    <p>Você esgotou as {status.max_tentativas} tentativas. Entre em contato com o administrador.</p>
                  </div>
                </div>
              )}

              {notaMaxima && (
                <div className="quiz-blocked success">
                  <span className="blocked-icon">🏆</span>
                  <div>
                    <strong>Você atingiu a nota máxima (100%)!</strong>
                    <p>Não há mais o que melhorar nesta avaliação.</p>
                    <Link to={`/cursos/${cursoId}/certificado`} className="btn-quiz-primary">🏆 Ver Certificado</Link>
                  </div>
                </div>
              )}

              {status.aprovado && !notaMaxima && (
                <div className="quiz-blocked success">
                  <span className="blocked-icon">🎉</span>
                  <div>
                    <strong>Você já foi aprovado!</strong>
                    <p>Sua melhor pontuação é <strong>{status.melhor}%</strong>. {podeTentar
                      ? 'Se quiser, refaça para buscar 100% — sua melhor nota é sempre a que vale.'
                      : 'Você já usou todas as tentativas; a nota fica registrada.'}</p>
                    <Link to={`/cursos/${cursoId}/certificado`} className="btn-quiz-primary">🏆 Ver Certificado</Link>
                  </div>
                </div>
              )}

              {podeTentar && (
                <button className="btn-quiz-start" onClick={startQuiz}>
                  {status.tentativas === 0
                    ? 'Iniciar Avaliação'
                    : `Tentar Novamente (${status.restantes} restantes)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── RUNNING ── */
  if (phase === 'running') {
    const q = questions[current];
    if (!q) return null;
    const selected = answers[q.id];
    const answered = Object.keys(answers).length;
    const isLast = current === questions.length - 1;

    return (
      <div className="quiz-page">
        <div className="quiz-card quiz-running">
          <div className="quiz-progress-header">
            <span className="quiz-counter">Questão {current + 1} de {questions.length}</span>
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${(answered / questions.length) * 100}%` }} />
            </div>
          </div>

          <h2 className="quiz-question">{q.enunciado}</h2>

          <div className="quiz-options">
            {(q.opcoes || []).map((op, idx) => (
              <button key={idx}
                className={`quiz-option ${selected === op.origIdx ? 'correct' : ''}`}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: op.origIdx }))}>
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                <span>{op.texto}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button className="btn-quiz-secondary" disabled={current === 0}
              onClick={() => setCurrent(c => c - 1)} style={{ opacity: current === 0 ? 0.4 : 1 }}>
              ← Anterior
            </button>
            {!isLast ? (
              <button className="btn-quiz-primary" disabled={selected === undefined}
                onClick={() => setCurrent(c => c + 1)}
                style={{ opacity: selected === undefined ? 0.5 : 1 }}>
                Próxima →
              </button>
            ) : (
              <button className="btn-quiz-primary" disabled={answered < questions.length || submitting}
                onClick={handleSubmit}
                style={{ opacity: answered < questions.length ? 0.5 : 1, background: 'var(--success)' }}>
                {submitting ? 'Enviando...' : '✓ Enviar Respostas'}
              </button>
            )}
          </div>

          {isLast && answered < questions.length && (
            <p style={{ marginTop: '14px', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
              Responda todas as questões antes de enviar ({answered}/{questions.length} respondidas).
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULT ── */
  if (phase === 'result' && result) {
    // Correção por questão (id → { correta, explicacao, acertou }) para a revisão.
    const correcaoMap = {};
    for (const c of (result.correcao || [])) correcaoMap[c.id] = c;
    const reviewItens = questions.map(q => {
      const corr = correcaoMap[q.id] || {};
      return {
        id: q.id, enunciado: q.enunciado,
        opcoes: q.opcoes, // mesma ordem embaralhada exibida na prova
        correta: corr.correta, explicacao: corr.explicacao,
        resposta: answers[q.id], acertou: !!corr.acertou,
      };
    });

    return (
      <div className="quiz-page">
        <div className="quiz-result-stack">
        <div className="quiz-card quiz-result">
          <div className={`result-badge ${result.aprovado ? 'pass' : 'fail'}`}>
            {result.aprovado ? '🏆' : '📋'}
          </div>
          <h2>{result.aprovado ? 'Parabéns! Você foi aprovado!' : 'Não foi dessa vez.'}</h2>
          <div className="result-score">
            <span className={`score-number ${result.aprovado ? 'pass' : 'fail'}`}>{result.nota}%</span>
            <span className="score-label">{result.acertos} de {result.total} questões corretas</span>
          </div>

          <div className="result-details">
            <div className="result-detail-item">
              <span>Tentativa</span>
              <strong>{result.tentativas}</strong>
            </div>
            <div className="result-detail-item">
              <span>Nota mínima exigida</span>
              <strong>{result.nota_minima}%</strong>
            </div>
            <div className="result-detail-item">
              <span>Tentativas restantes</span>
              <strong>{result.restantes}</strong>
            </div>
          </div>

          {result.aprovado && (
            <div className="result-success-msg">
              Você concluiu o curso! Seu certificado já pode ser emitido.
            </div>
          )}
          {!result.aprovado && result.restantes > 0 && (
            <div className="result-fail-msg">
              Você precisa de pelo menos {result.nota_minima}% para passar. Revise o conteúdo e tente novamente.
            </div>
          )}
          {!result.aprovado && result.restantes === 0 && (
            <div className="result-fail-msg danger">
              Você atingiu o limite de tentativas. Entre em contato com o administrador.
            </div>
          )}

          <div className="result-actions">
            {result.aprovado && (
              <Link to={`/cursos/${cursoId}/certificado`} className="btn-quiz-primary">🏆 Emitir Certificado</Link>
            )}
            {/* Refazer: enquanto não tiver 100% e ainda houver tentativas — vale
                inclusive para quem já foi aprovado e quer melhorar a nota. */}
            {result.nota < 100 && result.restantes > 0 && (
              <button className="btn-quiz-start" onClick={startQuiz}>
                Tentar Novamente ({result.restantes} restantes)
              </button>
            )}
            <button className="btn-quiz-secondary" onClick={() => setShowReview(v => !v)}>
              {showReview ? 'Ocultar correção' : '📋 Revisar prova'}
            </button>
            <Link to="/dashboard" className="btn-quiz-secondary">Ir para o Dashboard</Link>
            <Link to={`/cursos/${cursoId}/sala-de-aula`} className="btn-quiz-secondary">Revisar Aulas</Link>
          </div>
        </div>

        {/* Revisão da prova: cada questão com a resposta do aluno x correta + explicação */}
        {showReview && (
          <div className="quiz-card quiz-review">
            <h3 className="quiz-review-title">Revisão da prova</h3>
            <p className="quiz-review-sub">
              Confira abaixo cada questão: <strong>sua resposta</strong> e a <strong>resposta correta</strong>.
            </p>
            <QuizReviewList itens={reviewItens} />
          </div>
        )}
        </div>
      </div>
    );
  }

  return null;
}

/* ════════════════════════════════════════════════════════════════
   AVALIAÇÃO DO CURSO MOP (estática, localStorage)
   ════════════════════════════════════════════════════════════════ */

function MopQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // All flat lessons for progress calculation
  const allLessons = useMemo(() =>
    mopCourseContent.modules.flatMap(m => m.lessons), []);

  const { pct } = calcLessonStats(allLessons);
  const access = canTakeQuiz(pct);
  const qs = quizStatus();

  // Quiz state
  const [phase, setPhase] = useState('intro'); // intro | running | result
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers]   = useState({});   // qId → índice escolhido
  const [showExp, setShowExp]   = useState(false); // mostrar explicação
  const [result, setResult]     = useState(null);  // { score, passed }

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  function startQuiz() {
    const picked = shuffle(mopQuestions).slice(0, QUESTIONS_PER)
      .map(q => ({ ...q, opcoes: shuffleAlternativas(q.alternativas) }));
    setQuestions(picked);
    setCurrent(0);
    setSelected(null);
    setAnswers({});
    setShowExp(false);
    setResult(null);
    setPhase('running');
  }

  function handleSelect(idx) {
    if (selected !== null) return; // já respondeu
    setSelected(idx);
    setShowExp(true);
  }

  function handleNext() {
    const q = questions[current];
    const updAnswers = { ...answers, [q.id]: selected };
    setAnswers(updAnswers);
    setShowExp(false);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
    } else {
      // Calcular resultado
      const correct = questions.filter((q, i) => {
        const ans = i === current ? selected : updAnswers[q.id];
        return ans === q.correta;
      }).length;
      const score = Math.round((correct / questions.length) * 100);
      const passed = saveAttempt(score, updAnswers);
      setResult({ score, passed, correct, total: questions.length });
      setPhase('result');
    }
  }

  /* ── INTRO ─────────────────────────────────────────────────────────────── */
  if (phase === 'intro') {
    return (
      <div className="quiz-page">
        <div className="quiz-card">
          <div className="quiz-header">
            <Link to="/cursos/mop-interno/sala-de-aula" className="quiz-back">← Voltar ao Curso</Link>
            <h1>Avaliação Final</h1>
            <p className="quiz-subtitle">Especialização Operacional: Elaboração de MOPs para Data Centers</p>
          </div>

          {/* Histórico de tentativas */}
          {qs.attempts > 0 && (
            <div className="quiz-history">
              <h3>Seu histórico</h3>
              <div className="quiz-history-grid">
                <div className="quiz-hist-item">
                  <span className="hist-label">Tentativas realizadas</span>
                  <span className="hist-value">{qs.attempts} / {MAX_ATTEMPTS}</span>
                </div>
                <div className="quiz-hist-item">
                  <span className="hist-label">Melhor pontuação</span>
                  <span className={`hist-value ${qs.best >= PASS_PERCENT ? 'pass' : 'fail'}`}>
                    {qs.best}%
                  </span>
                </div>
                <div className="quiz-hist-item">
                  <span className="hist-label">Status</span>
                  <span className={`hist-value ${qs.passed ? 'pass' : 'fail'}`}>
                    {qs.passed ? 'Aprovado' : 'Reprovado'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Regras */}
          <div className="quiz-rules">
            <h3>Regras da Avaliação</h3>
            <ul>
              <li><span className="rule-icon">📋</span><span><strong>{QUESTIONS_PER} perguntas</strong> selecionadas aleatoriamente de um banco com {mopQuestions.length} questões</span></li>
              <li><span className="rule-icon">✅</span><span>Nota mínima para aprovação: <strong>{PASS_PERCENT}%</strong> ({QUESTIONS_PER * PASS_PERCENT / 100} acertos de {QUESTIONS_PER})</span></li>
              <li><span className="rule-icon">🔄</span><span>Máximo de <strong>{MAX_ATTEMPTS} tentativas</strong> totais</span></li>
              <li><span className="rule-icon">🎓</span><span>Certificado liberado somente após <strong>100% das aulas</strong> e <strong>aprovação na avaliação</strong></span></li>
              <li><span className="rule-icon">⏱️</span><span>Sem limite de tempo por questão</span></li>
            </ul>
          </div>

          {/* Aulas incompletas: a prova já está liberada; só o certificado espera 100% */}
          {pct < 100 && !qs.passed && (
            <div className="quiz-blocked">
              <span className="blocked-icon">ℹ️</span>
              <div>
                <strong>Você já pode fazer a avaliação</strong>
                <p>Progresso das aulas: <strong>{pct}%</strong>. A prova está liberada e você pode usar suas tentativas — mas o <strong>certificado</strong> só é emitido após concluir 100% das aulas.</p>
                <Link to="/cursos/mop-interno/sala-de-aula" className="btn-quiz-secondary">Continuar aulas</Link>
              </div>
            </div>
          )}

          {/* Máximo de tentativas (só para quem ainda não passou e não fez 100%) */}
          {qs.attempts >= MAX_ATTEMPTS && qs.best < 100 && !qs.passed && (
            <div className="quiz-blocked danger">
              <span className="blocked-icon">⛔</span>
              <div>
                <strong>Limite de tentativas atingido</strong>
                <p>Você esgotou as {MAX_ATTEMPTS} tentativas disponíveis. Entre em contato com o administrador ou instrutor.</p>
              </div>
            </div>
          )}

          {/* Nota máxima: encerra a avaliação */}
          {qs.best >= 100 && (
            <div className="quiz-blocked success">
              <span className="blocked-icon">🏆</span>
              <div>
                <strong>Você atingiu a nota máxima (100%)!</strong>
                <p>Não há mais o que melhorar nesta avaliação.</p>
                <Link to="/cursos/mop-interno/certificado" className="btn-quiz-primary">🏆 Ver Certificado</Link>
              </div>
            </div>
          )}

          {/* Aprovado com nota < 100%: pode refazer para buscar 100% */}
          {qs.passed && qs.best < 100 && (
            <div className="quiz-blocked success">
              <span className="blocked-icon">🎉</span>
              <div>
                <strong>Você já foi aprovado!</strong>
                <p>Sua melhor pontuação é <strong>{qs.best}%</strong>. {access.ok
                  ? 'Se quiser, refaça para buscar 100% — sua melhor nota é sempre a que vale.'
                  : 'Você já usou todas as tentativas; a nota fica registrada.'}</p>
                <Link to="/cursos/mop-interno/certificado" className="btn-quiz-primary">🏆 Ver Certificado</Link>
              </div>
            </div>
          )}

          {access.ok && (
            <button className="btn-quiz-start" onClick={startQuiz}>
              {qs.attempts === 0 ? 'Iniciar Avaliação' : `Tentar Novamente (${qs.remaining} restantes)`}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── RUNNING ────────────────────────────────────────────────────────────── */
  if (phase === 'running') {
    const q    = questions[current];
    const isCorrect = selected === q.correta;

    return (
      <div className="quiz-page">
        <div className="quiz-card quiz-running">

          {/* Progresso da avaliação */}
          <div className="quiz-progress-header">
            <span className="quiz-counter">Questão {current + 1} de {questions.length}</span>
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${((current) / questions.length) * 100}%` }} />
            </div>
          </div>

          <h2 className="quiz-question">{q.enunciado}</h2>

          <div className="quiz-options">
            {q.opcoes.map((op, idx) => {
              let cls = 'quiz-option';
              if (selected !== null) {
                if (op.origIdx === q.correta)  cls += ' correct';
                else if (op.origIdx === selected && !isCorrect) cls += ' wrong';
                else cls += ' dimmed';
              }
              return (
                <button key={idx} className={cls} onClick={() => handleSelect(op.origIdx)} disabled={selected !== null}>
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span>{op.texto}</span>
                </button>
              );
            })}
          </div>

          {showExp && q.explicacao && (
            <div className={`quiz-explanation ${isCorrect ? 'correct' : 'wrong'}`}>
              <strong>{isCorrect ? '✅ Correto!' : '❌ Incorreto.'}</strong>
              <p>{q.explicacao}</p>
            </div>
          )}

          {selected !== null && (
            <button className="btn-quiz-next" onClick={handleNext}>
              {current + 1 < questions.length ? 'Próxima Questão →' : 'Ver Resultado'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── RESULT ─────────────────────────────────────────────────────────────── */
  if (phase === 'result' && result) {
    const newQs = quizStatus();
    return (
      <div className="quiz-page">
        <div className="quiz-card quiz-result">
          <div className={`result-badge ${result.passed ? 'pass' : 'fail'}`}>
            {result.passed ? '🏆' : '📋'}
          </div>
          <h2>{result.passed ? 'Parabéns! Você foi aprovado!' : 'Não foi dessa vez.'}</h2>
          <div className="result-score">
            <span className={`score-number ${result.passed ? 'pass' : 'fail'}`}>{result.score}%</span>
            <span className="score-label">{result.correct} de {result.total} questões corretas</span>
          </div>

          <div className="result-details">
            <div className="result-detail-item">
              <span>Tentativa</span>
              <strong>{newQs.attempts} / {MAX_ATTEMPTS}</strong>
            </div>
            <div className="result-detail-item">
              <span>Nota mínima exigida</span>
              <strong>{PASS_PERCENT}%</strong>
            </div>
            <div className="result-detail-item">
              <span>Tentativas restantes</span>
              <strong>{newQs.remaining}</strong>
            </div>
          </div>

          {result.passed && (
            <div className="result-success-msg">
              Você concluiu o curso! Seu certificado já pode ser emitido.
            </div>
          )}

          {!result.passed && newQs.remaining > 0 && (
            <div className="result-fail-msg">
              Você precisa de pelo menos {PASS_PERCENT}% para passar. Revise o conteúdo e tente novamente.
            </div>
          )}

          {!result.passed && newQs.remaining === 0 && (
            <div className="result-fail-msg danger">
              Você atingiu o limite de tentativas. Entre em contato com o administrador ou instrutor.
            </div>
          )}

          <div className="result-actions">
            {result.passed && (
              <Link to="/cursos/mop-interno/certificado" className="btn-quiz-primary">
                🏆 Emitir Certificado
              </Link>
            )}
            {/* Refazer enquanto não tiver 100% e ainda houver tentativas — inclusive aprovado. */}
            {result.score < 100 && newQs.remaining > 0 && (
              <button className="btn-quiz-start" onClick={startQuiz}>
                Tentar Novamente ({newQs.remaining} restantes)
              </button>
            )}
            <Link to="/dashboard" className="btn-quiz-secondary">Ir para o Dashboard</Link>
            <Link to="/cursos/mop-interno/sala-de-aula" className="btn-quiz-secondary">Revisar Aulas</Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
