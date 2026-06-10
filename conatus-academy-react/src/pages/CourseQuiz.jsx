import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

export function CourseQuiz() {
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
    const picked = shuffle(mopQuestions).slice(0, QUESTIONS_PER);
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

          {/* Requisito de aulas */}
          {pct < 100 && (
            <div className="quiz-blocked">
              <span className="blocked-icon">🔒</span>
              <div>
                <strong>Avaliação bloqueada</strong>
                <p>Conclua 100% das aulas para liberar a avaliação. Progresso atual: <strong>{pct}%</strong></p>
                <Link to="/cursos/mop-interno/sala-de-aula" className="btn-quiz-secondary">Continuar aulas</Link>
              </div>
            </div>
          )}

          {/* Máximo de tentativas */}
          {pct === 100 && !access.ok && qs.attempts >= MAX_ATTEMPTS && !qs.passed && (
            <div className="quiz-blocked danger">
              <span className="blocked-icon">⛔</span>
              <div>
                <strong>Limite de tentativas atingido</strong>
                <p>Você esgotou as {MAX_ATTEMPTS} tentativas disponíveis. Entre em contato com o administrador ou instrutor.</p>
              </div>
            </div>
          )}

          {/* Já aprovado */}
          {qs.passed && (
            <div className="quiz-blocked success">
              <span className="blocked-icon">🏆</span>
              <div>
                <strong>Você já foi aprovado!</strong>
                <p>Pontuação: <strong>{qs.best}%</strong>. Seu certificado já está disponível.</p>
                <Link to="/dashboard" className="btn-quiz-primary">Ver Certificado no Dashboard</Link>
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
            {q.alternativas.map((alt, idx) => {
              let cls = 'quiz-option';
              if (selected !== null) {
                if (idx === q.correta)  cls += ' correct';
                else if (idx === selected && !isCorrect) cls += ' wrong';
                else cls += ' dimmed';
              }
              return (
                <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={selected !== null}>
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span>{alt}</span>
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
              Você concluiu o curso! Acesse o dashboard para emitir seu certificado.
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
            {!result.passed && newQs.remaining > 0 && (
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
