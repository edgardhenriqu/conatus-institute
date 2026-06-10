import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mopCourseContent } from '../data/mopCourseContent';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import {
  getLessonProgress, markLessonDone, calcLessonStats,
  setTotalLessons, canTakeQuiz, isCertEligible,
} from '../utils/mopProgress';
import { canAccessInternalCourse } from '../utils/permissions';

export function CourseViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courseContent, setCourseContent]   = useState(null);
  const [activeLesson, setActiveLesson]     = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});
  const [accessDenied, setAccessDenied]     = useState(false);

  // Flat list of all lessons
  const allLessons = useMemo(() => {
    if (!courseContent) return [];
    return courseContent.modules.flatMap(mod =>
      mod.lessons.map(lesson => ({ ...lesson, moduleId: mod.id, moduleTitle: mod.title }))
    );
  }, [courseContent]);

  // Progress stats
  const stats = useMemo(() => calcLessonStats(allLessons), [allLessons, lessonProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIndex = useMemo(() => {
    if (!activeLesson || allLessons.length === 0) return -1;
    return allLessons.findIndex(l => l.id === activeLesson.id);
  }, [activeLesson, allLessons]);

  const isCurrentDone = useMemo(() =>
    activeLesson ? !!lessonProgress[activeLesson.id] : false,
    [activeLesson, lessonProgress]);

  // Access check
  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    if (id === 'mop-interno' || id === '6') {
      if (!canAccessInternalCourse(user)) {
        setAccessDenied(true);
        return;
      }
      setCourseContent(mopCourseContent);
      setLessonProgress(getLessonProgress());

      // Register total lessons for sync
      const total = mopCourseContent.modules.reduce((s, m) => s + m.lessons.length, 0);
      setTotalLessons(total);

      if (mopCourseContent.modules.length > 0 && mopCourseContent.modules[0].lessons.length > 0) {
        setActiveLesson(mopCourseContent.modules[0].lessons[0]);
      }
    } else {
      alert('Conteúdo deste curso ainda não está disponível.');
      navigate(`/cursos/${id}`);
    }
  }, [id, user, navigate]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) setActiveLesson(allLessons[currentIndex - 1]);
  }, [currentIndex, allLessons]);

  const goToNext = useCallback(() => {
    if (currentIndex < allLessons.length - 1) setActiveLesson(allLessons[currentIndex + 1]);
  }, [currentIndex, allLessons]);

  const handleMarkDone = useCallback(() => {
    if (!activeLesson) return;
    markLessonDone(activeLesson.id);
    setLessonProgress(getLessonProgress());
  }, [activeLesson]);

  if (accessDenied) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{
          maxWidth: '520px', textAlign: 'center',
          background: '#fff', borderRadius: '16px',
          border: '1px solid #e5e7eb', padding: '48px 40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: '#1e293b', marginBottom: '12px', fontSize: '1.5rem' }}>
            Acesso Restrito
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '28px' }}>
            Este curso é exclusivo para funcionários autorizados da Conatus.
            Caso você acredite que deveria ter acesso, entre em contato com o
            administrador da plataforma.
          </p>
          <Link to="/cursos"
            style={{
              display: 'inline-block', padding: '12px 28px',
              background: 'var(--primary)', color: '#fff',
              borderRadius: '8px', textDecoration: 'none',
              fontWeight: 600, fontSize: '0.95rem',
            }}>
            ← Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (!courseContent || !activeLesson) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando ambiente de aula...</div>;
  }

  const quizCheck   = canTakeQuiz(stats.pct);
  const certEligible = isCertEligible(stats.pct);

  return (
    <div className="viewer-layout">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className="viewer-sidebar">

        {/* Header */}
        <div className="viewer-sidebar-header">
          <Link to={`/cursos/${id}`} className="viewer-back-link">← Detalhes do Curso</Link>
          <h2 className="viewer-course-title">{courseContent.title}</h2>
        </div>

        {/* Progress overview */}
        <div className="viewer-progress-box">
          <div className="viewer-progress-top">
            <span>Progresso</span>
            <strong>{stats.pct}%</strong>
          </div>
          <div className="viewer-progress-bar">
            <div className="viewer-progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>
          <span className="viewer-progress-label">{stats.done} de {stats.total} aulas</span>
        </div>

        {/* CTA links */}
        <div className="viewer-cta-links">
          {stats.pct === 100 && !quizCheck.ok && quizStatus_passed() && (
            <Link to="/dashboard" className="viewer-cta-cert">🏆 Ver Certificado</Link>
          )}
          {quizCheck.ok && (
            <Link to="/cursos/mop-interno/avaliacao" className="viewer-cta-quiz">📝 Fazer Avaliação</Link>
          )}
          {stats.pct === 100 && !quizCheck.ok && !quizStatus_passed() && (
            <Link to="/cursos/mop-interno/avaliacao" className="viewer-cta-quiz disabled">📝 Avaliação</Link>
          )}
        </div>

        {/* Module / lesson list */}
        <div className="viewer-module-list">
          {courseContent.modules.map(mod => (
            <div key={mod.id} className="viewer-module">
              <div className="viewer-module-title">{mod.title}</div>
              <div>
                {mod.lessons.map(lesson => {
                  const done   = !!lessonProgress[lesson.id];
                  const active = activeLesson.id === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={`viewer-lesson-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                    >
                      <span className="lesson-check">{done ? '✓' : '○'}</span>
                      <span className="lesson-name">{lesson.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="viewer-main">
        <div className="viewer-content-wrap">

          {/* Breadcrumb */}
          <div className="viewer-breadcrumb">
            {allLessons[currentIndex]?.moduleTitle} › {activeLesson.title}
          </div>

          {/* Title row */}
          <div className="viewer-title-row">
            <h1>{activeLesson.title}</h1>
            {isCurrentDone
              ? <span className="lesson-done-badge">✓ Concluída</span>
              : (
                <button className="btn-mark-done" onClick={handleMarkDone}>
                  Marcar como Concluída
                </button>
              )
            }
          </div>

          {/* Lesson content */}
          <div
            className="lesson-content"
            dangerouslySetInnerHTML={{ __html: activeLesson.content }}
          />

          {/* Navigation footer */}
          <div className="viewer-nav-footer">
            <Button
              variant="outline"
              onClick={goToPrev}
              disabled={currentIndex <= 0}
              style={{ opacity: currentIndex <= 0 ? 0.4 : 1 }}
            >
              ← Aula Anterior
            </Button>

            <span className="viewer-lesson-counter">
              {currentIndex + 1} / {allLessons.length}
            </span>

            {currentIndex < allLessons.length - 1 ? (
              <Button variant="primary" onClick={goToNext}>
                Próxima Aula →
              </Button>
            ) : (
              // Última aula — mostrar CTA de avaliação
              <Link
                to="/cursos/mop-interno/avaliacao"
                className={`btn-goto-quiz ${quizCheck.ok ? '' : 'disabled'}`}
              >
                {quizCheck.ok ? '📝 Ir para Avaliação →' : '📝 Avaliação Final'}
              </Link>
            )}
          </div>

          {/* Completion callout — shown when 100% done */}
          {stats.pct === 100 && (
            <div className="viewer-completion-box">
              <div className="completion-icon">🎓</div>
              <div>
                <strong>Você concluiu todas as aulas!</strong>
                {quizCheck.ok && (
                  <p>
                    Agora realize a avaliação final para liberar seu certificado.{' '}
                    <Link to="/cursos/mop-interno/avaliacao">Iniciar Avaliação →</Link>
                  </p>
                )}
                {certEligible && (
                  <p>
                    Parabéns! Você foi aprovado na avaliação.{' '}
                    <Link to="/dashboard">Emitir Certificado →</Link>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// helper inline para não importar quizStatus no JSX
function quizStatus_passed() {
  try {
    const list = JSON.parse(localStorage.getItem('conatus_mop_quiz') || '[]');
    return list.some(a => a.passed);
  } catch { return false; }
}
