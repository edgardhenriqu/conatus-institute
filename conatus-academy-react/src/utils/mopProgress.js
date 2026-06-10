/**
 * Motor de progresso do curso MOP (localStorage-based).
 * Todas as chaves são prefixadas pelo userId para isolar dados entre usuários.
 */

export const MAX_ATTEMPTS  = 3;
export const PASS_PERCENT  = 80;
export const QUESTIONS_PER = 10;

let _uid = 'guest';

/** Deve ser chamado no login e no logout (via AuthContext). */
export function initMopProgress(userId) {
  _uid = userId ? String(userId) : 'guest';
}

// ── key builders ─────────────────────────────────────────────────────────────

const LESSON_KEY     = () => `conatus_mop_lessons_${_uid}`;
const QUIZ_KEY       = () => `conatus_mop_quiz_${_uid}`;
const TOTAL_KEY      = () => `conatus_mop_total_${_uid}`;
const ENROLLMENT_KEY = () => `staticEnrollments_${_uid}`;

// ── helpers ──────────────────────────────────────────────────────────────────

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ── matrículas estáticas ──────────────────────────────────────────────────────

/** Retorna o objeto de matrículas estáticas do usuário atual. */
export function getStaticEnrollments() { return load(ENROLLMENT_KEY(), {}); }

/** Persiste o objeto de matrículas estáticas do usuário atual. */
export function saveStaticEnrollments(data) { save(ENROLLMENT_KEY(), data); }

// ── aulas ────────────────────────────────────────────────────────────────────

/** @returns {Record<string,boolean>} mapa lessonId → concluída */
export function getLessonProgress() { return load(LESSON_KEY(), {}); }

/** Marca uma aula como concluída e sincroniza staticEnrollments */
export function markLessonDone(lessonId) {
  const p = getLessonProgress();
  p[lessonId] = true;
  save(LESSON_KEY(), p);
  _syncStaticEnrollment();
}

/** Retorna { done, total, pct } com base em allLessons (array flat de lições) */
export function calcLessonStats(allLessons) {
  const p    = getLessonProgress();
  const done = allLessons.filter(l => p[l.id]).length;
  const pct  = allLessons.length > 0
    ? Math.round((done / allLessons.length) * 100)
    : 0;
  return { done, total: allLessons.length, pct };
}

/** Sincroniza staticEnrollments.progresso com o progresso real das aulas */
function _syncStaticEnrollment() {
  try {
    const se = getStaticEnrollments();
    if (se['mop-interno']) {
      const p    = getLessonProgress();
      const raw  = load(TOTAL_KEY(), 129);
      const done = Object.values(p).filter(Boolean).length;
      se['mop-interno'].progresso = Math.round((done / raw) * 100);
      se['mop-interno'].status    = se['mop-interno'].progresso === 100 ? 'concluido' : 'em_andamento';
      saveStaticEnrollments(se);
    }
  } catch { /* localStorage unavailable — skip sync */ }
}

/** Armazena o total de aulas para uso interno do sync */
export function setTotalLessons(n) { save(TOTAL_KEY(), n); }

// ── quiz ─────────────────────────────────────────────────────────────────────

/** @returns {Array<{score:number, date:string, passed:boolean, answers:object}>} */
export function getQuizAttempts() { return load(QUIZ_KEY(), []); }

/** Salva uma tentativa e retorna se passou */
export function saveAttempt(score, answers) {
  const list   = getQuizAttempts();
  const passed = score >= PASS_PERCENT;
  list.push({ score, date: new Date().toISOString(), passed, answers });
  save(QUIZ_KEY(), list);
  return passed;
}

/** Resumo do status do quiz */
export function quizStatus() {
  const list = getQuizAttempts();
  const best = list.reduce((m, a) => Math.max(m, a.score), 0);
  const passed = list.some(a => a.passed);
  return {
    attempts:    list.length,
    remaining:   Math.max(0, MAX_ATTEMPTS - list.length),
    best,
    passed,
    lastAttempt: list[list.length - 1] ?? null,
  };
}

/** Verifica se o aluno pode iniciar uma nova tentativa */
export function canTakeQuiz(lessonPct) {
  if (lessonPct < 100) return { ok: false, reason: 'Conclua 100% das aulas para liberar a avaliação.' };
  const qs = quizStatus();
  if (qs.passed)    return { ok: false, reason: 'Você já foi aprovado na avaliação.' };
  if (qs.attempts >= MAX_ATTEMPTS) return { ok: false, reason: `Limite de ${MAX_ATTEMPTS} tentativas atingido.` };
  return { ok: true };
}

// ── certificado ──────────────────────────────────────────────────────────────

/** true somente quando 100% aulas + aprovação no quiz */
export function isCertEligible(lessonPct) {
  return lessonPct === 100 && quizStatus().passed;
}

/** Motivo pelo qual o certificado não está disponível */
export function certBlockReason(lessonPct) {
  if (lessonPct < 100)       return `Conclua 100% das aulas (${lessonPct}% concluídas).`;
  if (!quizStatus().passed)  return 'Atingir mínimo de 80% na avaliação final.';
  return null;
}

// ── reset ────────────────────────────────────────────────────────────────────

export function resetMopProgress() {
  localStorage.removeItem(LESSON_KEY());
  localStorage.removeItem(QUIZ_KEY());
  localStorage.removeItem(TOTAL_KEY());
}
