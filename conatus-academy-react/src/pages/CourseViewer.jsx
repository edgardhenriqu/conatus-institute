import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mopCourseContent } from '../data/mopCourseContent';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { normalizeQuillHtml } from '../utils/quillHtml';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/PageLoader';
import {
  getLessonProgress, markLessonDone, calcLessonStats,
  setTotalLessons, canTakeQuiz, isCertEligible, quizStatus,
} from '../utils/mopProgress';
import { canAccessInternalCourse } from '../utils/permissions';
import { CourseAssistant } from '../components/course/CourseAssistant';

// Só a rota estática legada 'mop-interno' usa o fluxo MOP em localStorage.
// NÃO incluir o id 6 (hoje é o curso do banco Huawei Module800); o MOP migrou
// para o banco (id 1) e é servido pelo fluxo normal de cursos.
const isMopId = (id) => id === 'mop-interno';

/** Seta dos botões de navegação. `dir` = -1 (esquerda) ou 1 (direita). */
function Chevron({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={dir === -1 ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  );
}

/** Converte URLs do YouTube/Vimeo em URL de embed. */
function toEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function CourseViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const mainRef = useRef(null);

  const isMop = isMopId(id);

  const [courseContent, setCourseContent]   = useState(null); // { title, modules: [{id, title, lessons}] }
  const [activeLesson, setActiveLesson]     = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});   // { lessonKey: true }
  const [dbProgressPct, setDbProgressPct]   = useState(0);    // progresso vindo do servidor (cursos DB)
  const [dbQuiz, setDbQuiz]                 = useState(null); // status da avaliação (cursos DB)
  const [accessDenied, setAccessDenied]     = useState(false);
  const [deniedMsg, setDeniedMsg]           = useState('');
  const [loadError, setLoadError]           = useState('');
  const [focusMode, setFocusMode]           = useState(false); // esconde a lista de aulas

  // Esc sai do modo foco: sem isso o aluno que expandiu com o teclado fica sem
  // saída óbvia, já que a lista de aulas some da tela.
  useEffect(() => {
    if (!focusMode) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') setFocusMode(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  // Chave de progresso da aula: MOP usa o id estático; DB usa "aula-<id>"
  const lessonKey = useCallback(
    (lesson) => isMop ? lesson.id : `aula-${lesson.id}`,
    [isMop]
  );

  // Lista plana de aulas
  const allLessons = useMemo(() => {
    if (!courseContent) return [];
    return courseContent.modules.flatMap(mod =>
      mod.lessons.map(lesson => ({ ...lesson, moduleId: mod.id, moduleTitle: mod.title }))
    );
  }, [courseContent]);

  // Progresso (% de aulas obrigatórias concluídas)
  const stats = useMemo(() => {
    if (isMop) return calcLessonStats(allLessons);
    const obrigatorias = allLessons.filter(l => l.obrigatoria !== false);
    const done = obrigatorias.filter(l => lessonProgress[lessonKey(l)]).length;
    const pct = obrigatorias.length > 0 ? Math.round((done / obrigatorias.length) * 100) : 0;
    return { done, total: obrigatorias.length, pct: dbProgressPct || pct };
  }, [allLessons, lessonProgress, dbProgressPct, isMop, lessonKey]);

  const currentIndex = useMemo(() => {
    if (!activeLesson || allLessons.length === 0) return -1;
    return allLessons.findIndex(l => l.id === activeLesson.id);
  }, [activeLesson, allLessons]);

  const isCurrentDone = useMemo(() =>
    activeLesson ? !!lessonProgress[lessonKey(activeLesson)] : false,
    [activeLesson, lessonProgress, lessonKey]);

  /* ── Carregamento ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    if (isMop) {
      if (!canAccessInternalCourse(user)) {
        setAccessDenied(true);
        setDeniedMsg('Este curso é exclusivo para funcionários autorizados da Conatus. Solicite liberação ao administrador.');
        return;
      }
      setCourseContent(mopCourseContent);
      setLessonProgress(getLessonProgress());

      const total = mopCourseContent.modules.reduce((s, m) => s + m.lessons.length, 0);
      setTotalLessons(total);

      if (mopCourseContent.modules[0]?.lessons[0]) {
        setActiveLesson(mopCourseContent.modules[0].lessons[0]);
      }
      return;
    }

    // Curso do banco — busca módulos/aulas reais
    async function loadDbCourse() {
      try {
        const data = await api.getCursoConteudo(id);
        const modules = (data.modulos || []).map(m => ({
          id: m.id,
          title: m.titulo,
          description: m.descricao,
          lessons: m.aulas || [],
        }));

        if (modules.every(m => m.lessons.length === 0)) {
          setLoadError('O conteúdo deste curso ainda está sendo preparado. Volte em breve!');
          return;
        }

        setCourseContent({ title: data.curso?.nome || 'Curso', modules });

        const progressMap = {};
        for (const m of modules) {
          for (const a of m.lessons) {
            if (a.concluida) progressMap[`aula-${a.id}`] = true;
          }
        }
        setLessonProgress(progressMap);

        const first = modules.find(m => m.lessons.length > 0)?.lessons[0];
        if (first) setActiveLesson(first);

        // status da avaliação (para CTAs)
        try {
          const av = await api.getAvaliacaoStatus(id);
          setDbQuiz(av);
          if (typeof av.progresso === 'number') setDbProgressPct(av.progresso);
        } catch { /* sem avaliação */ }
      } catch (err) {
        if (err.message?.includes('exclusivo')) {
          setAccessDenied(true);
          setDeniedMsg(err.message);
        } else {
          setLoadError(err.message || 'Não foi possível carregar o conteúdo deste curso.');
        }
      }
    }
    loadDbCourse();
  }, [id, user, navigate, isMop]);

  // Volta ao topo do conteúdo ao trocar de aula
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [activeLesson?.id]);

  /* ── Ações ────────────────────────────────────────────────────── */

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) setActiveLesson(allLessons[currentIndex - 1]);
  }, [currentIndex, allLessons]);

  const goToNext = useCallback(() => {
    if (currentIndex < allLessons.length - 1) setActiveLesson(allLessons[currentIndex + 1]);
  }, [currentIndex, allLessons]);

  const handleMarkDone = useCallback(async () => {
    if (!activeLesson) return;

    if (isMop) {
      markLessonDone(activeLesson.id);
      const updated = getLessonProgress();
      setLessonProgress(updated);
      const { done, total } = calcLessonStats(allLessons);
      if (done === total) {
        toast.success('🎓 Parabéns! Você concluiu todas as aulas. A avaliação final está liberada.', 7000);
      } else {
        toast.success('Aula concluída! Seu progresso foi atualizado.');
      }
      return;
    }

    // Curso DB — persiste no servidor
    const key = lessonKey(activeLesson);
    try {
      const res = await api.salvarProgresso(id, [{ titulo: key, concluida: true }]);
      setLessonProgress(p => ({ ...p, [key]: true }));
      if (typeof res.progresso === 'number') setDbProgressPct(res.progresso);
      if (res.progresso === 100) {
        toast.success('🎓 Parabéns! Você concluiu todas as aulas obrigatórias deste curso.', 7000);
      } else {
        toast.success('Aula concluída! Seu progresso foi atualizado.');
      }
    } catch {
      toast.error('Erro ao salvar progresso. Verifique sua conexão.');
    }
  }, [activeLesson, isMop, allLessons, id, lessonKey, toast]);

  /* ── Estados especiais ────────────────────────────────────────── */

  if (accessDenied) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="cert-locked" style={{ margin: 0 }}>
          <div className="cert-locked-icon">🔒</div>
          <h2>Acesso Restrito</h2>
          <p>{deniedMsg}</p>
          <Link to="/cursos" className="btn-cert-print">← Voltar ao Catálogo</Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="cert-locked" style={{ margin: 0 }}>
          <div className="cert-locked-icon">🚧</div>
          <h2>Conteúdo indisponível</h2>
          <p>{loadError}</p>
          <Link to={`/cursos/${id}`} className="btn-cert-print">← Detalhes do Curso</Link>
        </div>
      </div>
    );
  }

  if (!courseContent || !activeLesson) {
    return <PageLoader message="Carregando ambiente de aula..." />;
  }

  /* ── CTAs de avaliação/certificado ────────────────────────────── */

  let quizCta = null;   // { to, label, enabled }
  let certCta = null;

  if (isMop) {
    const quizCheck = canTakeQuiz(stats.pct);
    const certOk = isCertEligible(stats.pct);
    const passed = quizStatus().passed;
    if (certOk) certCta = { to: '/cursos/mop-interno/certificado' };
    if (quizCheck.ok) quizCta = { to: '/cursos/mop-interno/avaliacao', enabled: true };
    else if (stats.pct === 100 && !passed) quizCta = { to: '/cursos/mop-interno/avaliacao', enabled: false };
  } else if (dbQuiz?.existe) {
    if (dbQuiz.aprovado && stats.pct === 100) {
      certCta = { to: `/cursos/${id}/certificado` };
    } else if (stats.pct === 100 && dbQuiz.restantes > 0 && !dbQuiz.aprovado) {
      quizCta = { to: `/cursos/${id}/avaliacao`, enabled: true };
    } else if (stats.pct < 100) {
      quizCta = { to: `/cursos/${id}/avaliacao`, enabled: false };
    }
  } else if (!isMop && stats.pct === 100) {
    // curso sem avaliação — certificado direto
    certCta = { to: `/cursos/${id}/certificado` };
  }

  const embedUrl = toEmbedUrl(activeLesson.video_url);

  return (
    <div className={`viewer-layout ${focusMode ? 'focus-mode' : ''}`}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {/* No modo foco ela é ocultada por CSS (display:none), o que também a
          tira da ordem de tabulação, mas preserva a rolagem e o estado. */}
      <div className="viewer-sidebar">
        <div className="viewer-sidebar-header">
          <Link to={`/cursos/${id}`} className="viewer-back-link">← Detalhes do Curso</Link>
          <h2 className="viewer-course-title">{courseContent.title}</h2>
        </div>

        <div className="viewer-progress-box">
          <div className="viewer-progress-top">
            <span>Progresso</span>
            <strong>{stats.pct}%</strong>
          </div>
          <div className="viewer-progress-bar">
            <div className="viewer-progress-fill" style={{ width: `${stats.pct}%` }} />
          </div>
          <span className="viewer-progress-label">{stats.done} de {stats.total} aulas obrigatórias</span>
        </div>

        {(quizCta || certCta) && (
          <div className="viewer-cta-links">
            {certCta && (
              <Link to={certCta.to} className="viewer-cta-cert">🏆 Ver Certificado</Link>
            )}
            {quizCta && (
              <Link to={quizCta.to} className={`viewer-cta-quiz ${quizCta.enabled ? '' : 'disabled'}`}>
                📝 {quizCta.enabled ? 'Fazer Avaliação' : 'Avaliação (conclua as aulas)'}
              </Link>
            )}
            {/* Agendamento de aula presencial — recurso futuro. Só aparece para
                quem já pode emitir o certificado; botão desativado por enquanto. */}
            {certCta && (
              <button type="button" className="viewer-cta-agendar" disabled
                title="Disponível em breve">
                📅 Agendar aula presencial <span className="cta-soon">em breve</span>
              </button>
            )}
          </div>
        )}

        <div className="viewer-module-list">
          {courseContent.modules.map(mod => (
            <div key={mod.id} className="viewer-module">
              <div className="viewer-module-title">{mod.title}</div>
              <div>
                {mod.lessons.map(lesson => {
                  const done   = !!lessonProgress[lessonKey(lesson)];
                  const active = activeLesson.id === lesson.id;
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => setActiveLesson({ ...lesson, moduleTitle: mod.title })}
                      className={`viewer-lesson-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                    >
                      <span className="lesson-check">{done ? '✓' : '○'}</span>
                      <span className="lesson-name">
                        {lesson.titulo || lesson.title}
                        {lesson.obrigatoria === false && (
                          <em style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> (opcional)</em>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Conteúdo principal ───────────────────────────────────── */}
      <div className="viewer-main" ref={mainRef}>
        <div className="viewer-content-wrap">

          <div className="viewer-breadcrumb">
            {allLessons[currentIndex]?.moduleTitle} › {activeLesson.titulo || activeLesson.title}
          </div>

          <div className="viewer-title-row">
            <h1>{activeLesson.titulo || activeLesson.title}</h1>
            <div className="viewer-title-actions">
              <button
                type="button"
                className="btn-focus-mode"
                onClick={() => setFocusMode(v => !v)}
                aria-pressed={focusMode}
                title={focusMode ? 'Sair do modo foco (Esc)' : 'Expandir a aula e ocultar a lista'}
              >
                {focusMode ? '⤡ Sair do foco' : '⛶ Expandir aula'}
              </button>
              {isCurrentDone
                ? <span className="lesson-done-badge">✓ Concluída</span>
                : (
                  <button className="btn-mark-done" onClick={handleMarkDone}>
                    Marcar como Concluída
                  </button>
                )
              }
            </div>
          </div>

          {activeLesson.descricao && (
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.97rem' }}>
              {activeLesson.descricao}
              {activeLesson.duracao_minutos ? ` · ⏱ ${activeLesson.duracao_minutos} min` : ''}
            </p>
          )}

          {/* Cartão da aula: vídeo + material + texto, tudo dentro da caixa */}
          <div className="lesson-content">
            {activeLesson.tipo_conteudo === 'video' && activeLesson.video_url && (
              <div className="lesson-video">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={activeLesson.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video controls src={activeLesson.video_url} />
                )}
              </div>
            )}

            {activeLesson.material_url && (
              <a href={activeLesson.material_url} target="_blank" rel="noopener noreferrer"
                className="lesson-material-link">
                {activeLesson.tipo_conteudo === 'pdf' ? '📄 Abrir PDF'
                  : activeLesson.tipo_conteudo === 'link' ? '🔗 Acessar link externo'
                  : '📎 Baixar material complementar'}
              </a>
            )}

            {(activeLesson.content || activeLesson.conteudo) && (
              // normalizeQuillHtml: corrige aulas salvas com &nbsp; no lugar de espaços
              <div className="lesson-html" dangerouslySetInnerHTML={{
                __html: normalizeQuillHtml(activeLesson.content || activeLesson.conteudo),
              }} />
            )}

            {!activeLesson.content && !activeLesson.conteudo
              && !(activeLesson.tipo_conteudo === 'video' && activeLesson.video_url)
              && !activeLesson.material_url && (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                Esta aula ainda não possui conteúdo cadastrado.
              </p>
            )}
          </div>

          {/* Navegação */}
          <div className="viewer-nav-footer">
            <Button
              variant="nav"
              className="btn-nav--prev"
              onClick={goToPrev}
              disabled={currentIndex <= 0}
            >
              <Chevron dir={-1} /> Aula anterior
            </Button>

            <span className="viewer-lesson-counter">
              {currentIndex + 1} / {allLessons.length}
            </span>

            {currentIndex < allLessons.length - 1 ? (
              <Button variant="nav" className="btn-nav--next" onClick={goToNext}>
                Próxima aula <Chevron dir={1} />
              </Button>
            ) : quizCta ? (
              <Link to={quizCta.to} className={`btn-goto-quiz ${quizCta.enabled ? '' : 'disabled'}`}>
                📝 {quizCta.enabled ? 'Ir para Avaliação →' : 'Avaliação Final'}
              </Link>
            ) : certCta ? (
              <Link to={certCta.to} className="btn-goto-quiz">🏆 Ver Certificado</Link>
            ) : (
              <span />
            )}
          </div>

          {/* Conclusão */}
          {stats.pct === 100 && (
            <div className="viewer-completion-box">
              <div className="completion-icon">🎓</div>
              <div>
                <strong>Você concluiu todas as aulas!</strong>
                {quizCta?.enabled && (
                  <p>
                    Agora realize a avaliação final para liberar seu certificado.{' '}
                    <Link to={quizCta.to}>Iniciar Avaliação →</Link>
                  </p>
                )}
                {certCta && (
                  <p>
                    Seu certificado está disponível.{' '}
                    <Link to={certCta.to}>Emitir Certificado →</Link>
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      <CourseAssistant cursoId={id} />
    </div>
  );
}
