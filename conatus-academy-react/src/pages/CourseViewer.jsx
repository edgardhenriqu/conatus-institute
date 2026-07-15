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
import { NarrationDock } from '../components/course/NarrationDock';
import { useNarracao } from '../hooks/useNarracao';

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

const isGifSrc = (src = '') =>
  /^data:image\/gif[;,]/i.test(src) || /\.gif(?:[?#]|$)/i.test(src);

/**
 * A aula é "só um GIF"? Verdadeiro quando o HTML do conteúdo tem exatamente uma
 * imagem .gif e nada mais que apareça na tela — sem texto, links, listas, tabelas
 * ou outra mídia. É o que libera o player em tela cheia (.lesson-content--gif).
 * Imagens comuns, PNG/JPG, vídeo e PDF continuam no layout normal.
 */
function isGifOnlyHtml(html) {
  if (!html) return false;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  if (body.textContent.trim()) return false;                       // sobrou texto
  if (body.querySelector('a, video, iframe, table, ul, ol, blockquote, hr, input, button')) {
    return false;                                                  // sobrou outro elemento
  }

  const imgs = body.querySelectorAll('img');
  if (imgs.length !== 1) return false;

  return isGifSrc(imgs[0].getAttribute('src') || '');
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
  const [focusMode, setFocusMode]           = useState(false); // aula em tela cheia
  const [narracaoOuvida, setNarracaoOuvida] = useState(false); // narração chegou ao fim
  const lessonHtmlRef = useRef(null);                          // HTML da aula já renderizado

  // Aulas com blocos marcados pela imagem do megafone (server/services/narracao.js)
  // só podem ser concluídas depois que a narração terminar. Sem blocos narrados,
  // nada muda — o botão segue como sempre foi.
  const narracoes = useMemo(() => activeLesson?.narracoes || [], [activeLesson]);

  // Garante que a conclusão automática dispare uma única vez por aula (a narração
  // pode reemitir "tudo ouvido" enquanto o progresso ainda está sendo salvo).
  const autoConcluidaRef = useRef(false);

  // Cada aula tem a sua narração: trocar de aula zera o que já foi ouvido, senão
  // a primeira narração ouvida liberaria o botão de todas as aulas seguintes.
  useEffect(() => {
    setNarracaoOuvida(false);
    autoConcluidaRef.current = false;
  }, [activeLesson?.id]);

  const handleNarracaoConcluida = useCallback(() => setNarracaoOuvida(true), []);

  const narracao = useNarracao({
    narracoes,
    aulaId: activeLesson?.id,
    cursoId: id,                      // a faixa de áudio é buscada por curso/aula
    onConcluir: handleNarracaoConcluida,
  });

  const {
    tocarBloco, tocarTudo, blocoAtivo, ouvidos, tudoOuvido,
    estado: narracaoEstado, suportado: narracaoSuportada,
  } = narracao;

  // Narração tocando ou em pausa — enquanto isso o botão "Ouça a Narração" fica
  // desabilitado (o mini-player assume o controle de pausar/retomar).
  const narrando = narracaoEstado === 'falando' || narracaoEstado === 'pausado';

  // Modo foco = overlay em tela cheia. Pedimos também a tela cheia do navegador
  // para cobrir a barra do sistema; se o navegador negar, o overlay sozinho já
  // cobre a navbar e o resto da página.
  const toggleFocusMode = useCallback(() => {
    const next = !focusMode;
    setFocusMode(next);
    if (next) {
      document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.()?.catch(() => {});
    }
  }, [focusMode]);

  // Esc sai do modo foco. Dentro da tela cheia o Esc é capturado pelo navegador
  // (nem chega no keydown), por isso também ouvimos o fullscreenchange — assim
  // sair da tela cheia por Esc/F11 sai do modo foco junto.
  useEffect(() => {
    if (!focusMode) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') setFocusMode(false); };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.body.classList.add('focus-mode-open');
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.body.classList.remove('focus-mode-open');
    };
  }, [focusMode]);

  // Sair da página (link do rodapé, avaliação…) não pode deixar o navegador preso
  // em tela cheia.
  useEffect(() => () => {
    if (document.fullscreenElement) document.exitFullscreen?.()?.catch(() => {});
  }, []);

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

  // Aula com narração ainda por ouvir trava a conclusão e o "Próxima aula".
  // Aula já concluída (revisita) não trava — o aluno navega livremente.
  const narracaoPendente = narracoes.length > 0 && !narracaoOuvida && !isCurrentDone;

  // normalizeQuillHtml: corrige aulas salvas com &nbsp; no lugar de espaços
  const lessonHtml = useMemo(() => {
    const raw = activeLesson?.content || activeLesson?.conteudo;
    return raw ? normalizeQuillHtml(raw) : '';
  }, [activeLesson]);

  // Aula que é só um GIF vira player: o GIF ocupa toda a área, sem padding nem
  // margem. Vídeo ou material anexado descaracterizam o caso — aí é layout normal.
  const isGifOnly = useMemo(() => {
    if (!activeLesson) return false;
    const hasVideo = activeLesson.tipo_conteudo === 'video' && !!activeLesson.video_url;
    return !hasVideo && !activeLesson.material_url && isGifOnlyHtml(lessonHtml);
  }, [activeLesson, lessonHtml]);

  /* ── Narração: a imagem do megafone vira botão ────────────────── */

  // Estado da narração lido pelo MutationObserver, que é criado uma única vez e
  // capturaria um valor velho se lesse as variáveis de render direto.
  const estadoNarracaoRef = useRef({ blocoAtivo: null, ouvidos: new Set() });

  const pintarEstado = useCallback(() => {
    const raiz = lessonHtmlRef.current;
    if (!raiz) return;
    const { blocoAtivo: ativo, ouvidos: jaOuvidos } = estadoNarracaoRef.current;
    [...raiz.querySelectorAll('img.narration-trigger')].forEach((img, i) => {
      img.classList.toggle('narration-trigger--tocando', i === ativo);
      img.classList.toggle('narration-trigger--ouvido', jaOuvidos.has(i));
      img.closest('.narration-block')
        ?.classList.toggle('narration-block--tocando', i === ativo);
    });
  }, []);

  // A figura do megafone que o instrutor anexou ao parágrafo VIRA o botão de
  // ouvir aquele trecho. O conteúdo da aula é HTML cru (dangerouslySetInnerHTML),
  // então não há JSX onde pendurar um onClick: marcamos os <img> no DOM.
  //
  // Duas decisões que parecem exageradas e não são — sem elas o botão não funciona:
  //
  // 1. CLIQUE POR DELEGAÇÃO, no contêiner. Pendurar o listener no <img> não
  //    sobrevive: o React reescreve o innerHTML da div (mesma div, filhos novos)
  //    depois que o efeito roda, e o <img> equipado vira um nó órfão — verificado
  //    no navegador (isConnected: false, com a classe aplicada nele).
  // 2. MutationObserver. Pelo mesmo motivo, as classes visuais precisam ser
  //    reaplicadas toda vez que o React troca os filhos, sem depender de o efeito
  //    rodar de novo (ele não roda: `lessonHtml` continua igual).
  //
  // O pareamento é POSICIONAL: o servidor numera os trechos na ordem do documento,
  // logo o i-ésimo megafone do HTML é o i-ésimo trecho narrado. Casar por src não
  // serviria — o mesmo arquivo pode marcar dois parágrafos da mesma aula.
  useEffect(() => {
    const raiz = lessonHtmlRef.current;
    if (!raiz || !narracoes.length || !narracaoSuportada) return;

    const marcadores = new Set(narracoes.map((n) => n.imgSrc).filter(Boolean));

    const equipar = () => {
      const gatilhos = [...raiz.querySelectorAll('img')]
        .filter((img) => marcadores.has(img.getAttribute('src')))
        .slice(0, narracoes.length);

      gatilhos.forEach((img) => {
        img.classList.add('narration-trigger');
        img.setAttribute('role', 'button');
        img.setAttribute('tabindex', '0');
        img.setAttribute('title', 'Clique para ouvir a narração deste trecho');
        img.setAttribute('alt', 'Ouvir a narração deste trecho');

        // O parágrafo do megafone é o que será falado: negrito, para o aluno
        // reconhecer de longe o que tem narração.
        const bloco = img.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote, div');
        if (bloco && bloco !== raiz) bloco.classList.add('narration-block');
      });

      // Repinta o estado junto: quando o React reescreve os filhos no meio da
      // narração, os nós voltam "crus" e o trecho em leitura perderia o realce.
      pintarEstado();
    };

    equipar();

    // Só childList: mudanças de atributo (as classes que nós mesmos aplicamos)
    // não disparam o observer, então não há laço infinito.
    const observer = new MutationObserver(equipar);
    observer.observe(raiz, { childList: true, subtree: true });

    const indiceDe = (img) =>
      [...raiz.querySelectorAll('img.narration-trigger')].indexOf(img);

    const aoClicar = (e) => {
      const img = e.target.closest?.('img.narration-trigger');
      if (!img) return;
      const i = indiceDe(img);
      if (i >= 0) tocarBloco(i);
    };

    const aoTeclar = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const img = e.target.closest?.('img.narration-trigger');
      if (!img) return;
      e.preventDefault();
      const i = indiceDe(img);
      if (i >= 0) tocarBloco(i);
    };

    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('keydown', aoTeclar);

    return () => {
      observer.disconnect();
      raiz.removeEventListener('click', aoClicar);
      raiz.removeEventListener('keydown', aoTeclar);
      raiz.querySelectorAll('img.narration-trigger').forEach((img) => {
        img.classList.remove('narration-trigger', 'narration-trigger--tocando',
          'narration-trigger--ouvido');
      });
      raiz.querySelectorAll('.narration-block').forEach((b) => {
        b.classList.remove('narration-block', 'narration-block--tocando');
      });
    };
  }, [narracoes, lessonHtml, narracaoSuportada, tocarBloco, pintarEstado]);

  // Aplica o estado atual da narração aos gatilhos já montados. Roda em dois
  // momentos: quando o estado muda (efeito abaixo) e quando o React reescreve os
  // filhos da aula (MutationObserver acima, via `equipar`). Lê de um ref porque o
  // observer é criado uma vez e não pode capturar um estado velho.
  useEffect(() => {
    estadoNarracaoRef.current = { blocoAtivo, ouvidos };
    pintarEstado();
  }, [blocoAtivo, ouvidos, narracoes, lessonHtml, pintarEstado]);

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

  // Conclui a aula de fato (MOP em localStorage ou curso do banco). É chamada
  // tanto pelo botão manual quanto pela conclusão automática ao fim da narração.
  const marcarConcluida = useCallback(async () => {
    if (!activeLesson) return;
    if (lessonProgress[lessonKey(activeLesson)]) return; // já concluída — não repete

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
  }, [activeLesson, isMop, allLessons, id, lessonKey, toast, lessonProgress]);

  const handleMarkDone = useCallback(() => {
    // Trava de narração: o botão já vem desabilitado, mas a checagem também mora
    // aqui — desabilitar no JSX é aparência, e o clique pode chegar por teclado
    // ou por um estado que mudou entre o render e o clique.
    if (narracaoPendente) return;
    marcarConcluida();
  }, [narracaoPendente, marcarConcluida]);

  // Conclusão automática: quando a narração é ouvida até o fim, a aula conclui-se
  // sozinha (o aluno não precisa marcar nada) e o botão "Próxima aula" destrava.
  // Só dispara em narração realmente ouvida (`tudoOuvido`) — nunca no fallback de
  // navegador sem suporte a áudio, que apenas libera a conclusão manual.
  useEffect(() => {
    if (tudoOuvido && !autoConcluidaRef.current) {
      autoConcluidaRef.current = true;
      marcarConcluida();
    }
  }, [tudoOuvido, marcarConcluida]);

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
          tira da ordem de tabulação, mas preserva a rolagem e o estado.
          O mesmo vale para breadcrumb, descrição, "marcar como concluída" e
          o box de conclusão: em foco fica só título, conteúdo e navegação. */}
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
                onClick={toggleFocusMode}
                aria-pressed={focusMode}
                title={focusMode ? 'Sair do modo foco (Esc)' : 'Expandir a aula em tela cheia'}
              >
                {focusMode ? '⤡ Sair do modo foco' : '⛶ Expandir aula'}
              </button>
              {isCurrentDone ? (
                <span className="lesson-done-badge">✓ Concluída</span>
              ) : narracaoPendente && narracaoSuportada ? (
                // Aula com narração: ouvir é o único caminho. Ao terminar o áudio
                // a aula conclui-se sozinha e o botão "Próxima aula" destrava.
                <button
                  type="button"
                  className="btn-ouvir-narracao"
                  onClick={tocarTudo}
                  disabled={narrando}
                  aria-disabled={narrando}
                  title={narrando
                    ? 'Narração em andamento'
                    : 'Ouça a narração para concluir a aula e liberar a próxima'}
                >
                  {narrando ? '🔊 Reproduzindo narração…' : '🔊 Ouça a Narração'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-mark-done"
                  onClick={handleMarkDone}
                  title="Marcar esta aula como concluída"
                >
                  Marcar como Concluída
                </button>
              )}
            </div>
          </div>

          {activeLesson.descricao && (
            <p className="viewer-lesson-desc"
              style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.97rem' }}>
              {activeLesson.descricao}
              {activeLesson.duracao_minutos ? ` · ⏱ ${activeLesson.duracao_minutos} min` : ''}
            </p>
          )}

          {/* Cartão da aula: vídeo + material + texto, tudo dentro da caixa.
              Quando a aula é só um GIF, o cartão vira player: sem padding, o GIF
              ocupa 100% da área e o fundo preenche o resto. */}
          <div className={`lesson-content ${isGifOnly ? 'lesson-content--gif' : ''}`}>
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

            {lessonHtml && (
              <div
                className="lesson-html"
                ref={lessonHtmlRef}
                dangerouslySetInnerHTML={{ __html: lessonHtml }}
              />
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
              <Button
                variant="nav"
                className="btn-nav--next"
                onClick={goToNext}
                disabled={!isCurrentDone}
                title={isCurrentDone
                  ? undefined
                  : narracaoPendente
                    ? 'Ouça a narração para liberar a próxima aula'
                    : 'Marque a aula como concluída para liberar a próxima'}
              >
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

      {/* Flutuantes: o mini-player só aparece enquanto há narração tocando. */}
      <NarrationDock narracao={narracao} />
      <CourseAssistant cursoId={id} />
    </div>
  );
}
