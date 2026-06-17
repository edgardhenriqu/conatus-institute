import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { PageLoader } from '../components/ui/PageLoader';
import { legacyMopCourse } from '../data/courses';
import { mopCourseContent } from '../data/mopCourseContent';
import {
  calcLessonStats, quizStatus, isCertEligible, getOrIssueCertificate,
  PASS_PERCENT,
} from '../utils/mopProgress';
import { canAccessInternalCourse } from '../utils/permissions';

const MOP_IDS = ['mop-interno', '6'];

export function Certificate() {
  const { id } = useParams();
  const isMop = MOP_IDS.includes(id);
  return isMop ? <MopCertificate /> : <DbCertificate cursoId={id} />;
}

/* ── Layout compartilhado do certificado ───────────────────────────────────── */

function CertificateSheet({ studentName, courseName, duration, score, issuedDate, code, responsavel, texto }) {
  return (
    <div className="certificate" id="certificate">
      <div className="cert-brand">Conatus Institute</div>
      <div className="cert-brand-sub">Educação e Pesquisa em Infraestrutura Crítica</div>

      <h1 className="cert-title">Certificado de Conclusão</h1>

      <p className="cert-lead">Certificamos que</p>
      <div className="cert-student">{studentName}</div>

      <p className="cert-course">
        {texto?.trim()
          ? <>{texto} <br /><strong>{courseName}</strong></>
          : <>
              concluiu com aproveitamento o curso<br />
              <strong>{courseName}</strong>,<br />
              cumprindo todos os requisitos de conclusão e avaliação.
            </>}
      </p>

      <div className="cert-details">
        <div className="cert-detail">
          <span>Carga Horária</span>
          <strong>{duration || '—'}</strong>
        </div>
        {score != null && (
          <div className="cert-detail">
            <span>Nota Final</span>
            <strong>{score}%</strong>
          </div>
        )}
        <div className="cert-detail">
          <span>Data de Conclusão</span>
          <strong>{issuedDate}</strong>
        </div>
      </div>

      <div className="cert-signatures">
        <div className="cert-signature">
          <strong>{responsavel?.trim() || 'Conatus Institute'}</strong>
          <span>Responsável Técnico</span>
        </div>
        <div className="cert-signature">
          <strong>{studentName}</strong>
          <span>Concluinte</span>
        </div>
      </div>

      <div className="cert-validation">
        Código de validação: <code>{code}</code>
        <br />
        Documento emitido digitalmente pela plataforma Conatus Institute.
      </div>
    </div>
  );
}

/**
 * Imprime apenas o certificado usando um iframe isolado.
 * Evita o problema clássico de PDF em branco / páginas extras que acontece
 * ao imprimir a página inteira com regiões escondidas via CSS.
 */
function printCertificate() {
  const cert = document.getElementById('certificate');
  if (!cert) { window.print(); return; }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0',
    width: '0', height: '0', border: '0',
  });
  document.body.appendChild(iframe);

  // Reaproveita os estilos da aplicação (Vite injeta <style> em dev e <link> no build)
  const appStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
${appStyles}
<style>
  @page { size: A4 landscape; margin: 8mm; }
  html, body {
    margin: 0; padding: 0; background: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* Neutraliza regras de impressão/posicionamento herdadas do app */
  body * { visibility: visible !important; }
  .certificate {
    position: static !important;
    visibility: visible !important;
    max-width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
    border-width: 8px !important;
    padding: 28px 48px !important;
    page-break-inside: avoid;
  }
  .cert-brand-sub { margin-bottom: 18px !important; }
  .cert-title { margin-bottom: 14px !important; }
  .cert-course { margin-bottom: 18px !important; }
  .cert-details { margin-bottom: 20px !important; }
  .cert-signatures { margin-bottom: 16px !important; }
</style>
</head>
<body>${cert.outerHTML}</body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;
  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const doPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      // remove o iframe depois que o diálogo fecha (onafterprint nem sempre dispara)
      setTimeout(cleanup, 60000);
      win.onafterprint = cleanup;
    }
  };

  // pequena espera para fontes/estilos carregarem dentro do iframe
  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 400);
  } else {
    win.onload = () => setTimeout(doPrint, 400);
  }
}

function CertToolbar({ backTo = '/dashboard' }) {
  return (
    <div className="cert-toolbar">
      <Link to={backTo} className="btn-cert-back">← Voltar ao Dashboard</Link>
      <div className="cert-toolbar-actions">
        <button className="btn-cert-print" onClick={printCertificate}>
          🖨️ Imprimir / Salvar em PDF
        </button>
      </div>
    </div>
  );
}

/* ── Certificado de cursos do banco ────────────────────────────────────────── */

function DbCertificate({ cursoId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [curso, setCurso] = useState(null);
  const [blockMsg, setBlockMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // já emitido?
        const data = await api.getCertificado(cursoId);
        if (data.emitido) {
          setCert(data.certificado);
          setLoading(false);
          return;
        }
        // tenta emitir agora (o servidor valida os requisitos)
        try {
          const issued = await api.emitirCertificado(cursoId);
          if (issued.certificado) {
            const full = await api.getCertificado(cursoId);
            setCert(full.emitido ? full.certificado : issued.certificado);
          }
        } catch (err) {
          setBlockMsg(err.message || 'Os requisitos do certificado ainda não foram cumpridos.');
        }
      } catch (err) {
        setBlockMsg(err.message || 'Não foi possível carregar o certificado.');
      } finally {
        setLoading(false);
      }
    }
    async function loadCurso() {
      try {
        const c = await api.getCurso(cursoId);
        if (!c.erro) setCurso(c);
      } catch { /* opcional */ }
    }
    load();
    loadCurso();
  }, [cursoId]);

  if (loading) return <PageLoader message="Verificando seu certificado..." />;

  if (!cert) {
    return (
      <div className="cert-page">
        <div className="cert-locked">
          <div className="cert-locked-icon">🔒</div>
          <h2>Certificado ainda não liberado</h2>
          <p>{blockMsg}</p>
          {curso?.requisitos_certificado && (
            <p style={{ fontStyle: 'italic' }}>Requisitos: {curso.requisitos_certificado}</p>
          )}
          <div className="cert-toolbar-actions" style={{ justifyContent: 'center' }}>
            <Link to={`/cursos/${cursoId}/sala-de-aula`} className="btn-cert-print">Continuar Aulas</Link>
            <Link to={`/cursos/${cursoId}/avaliacao`} className="btn-cert-print"
              style={{ background: 'var(--gold)', color: 'var(--primary)' }}>
              Avaliação Final
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(cert.data_emissao).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="cert-page">
      <CertToolbar />
      <CertificateSheet
        studentName={user?.nome || 'Aluno'}
        courseName={cert.curso_nome || curso?.nome || 'Curso'}
        duration={cert.curso_duracao || curso?.duracao}
        score={cert.nota_avaliacao}
        issuedDate={issuedDate}
        code={cert.codigo}
        responsavel={cert.cert_responsavel || curso?.cert_responsavel}
        texto={cert.cert_texto || curso?.cert_texto}
      />
    </div>
  );
}

/* ── Certificado do curso MOP (estático) ───────────────────────────────────── */

function MopCertificate() {
  const { user } = useAuth();
  const curso = legacyMopCourse;

  const allLessons = useMemo(() =>
    mopCourseContent.modules.flatMap(m => m.lessons), []);
  const stats = useMemo(() => calcLessonStats(allLessons), [allLessons]);
  const quiz = useMemo(() => quizStatus(), []);
  const eligible = isCertEligible(stats.pct);
  const cert = useMemo(() =>
    eligible ? getOrIssueCertificate(stats.pct) : null, [eligible, stats.pct]);

  if (!canAccessInternalCourse(user)) {
    return (
      <div className="cert-page">
        <div className="cert-locked">
          <div className="cert-locked-icon">🔒</div>
          <h2>Acesso Restrito</h2>
          <p>Este curso é exclusivo para funcionários autorizados da Conatus. Solicite liberação ao administrador.</p>
          <Link to="/cursos" className="btn-cert-print">Voltar ao Catálogo</Link>
        </div>
      </div>
    );
  }

  if (!eligible || !cert) {
    return (
      <div className="cert-page">
        <div className="cert-locked">
          <div className="cert-locked-icon">🔒</div>
          <h2>Certificado ainda não liberado</h2>
          <p>Para emitir o certificado deste curso você precisa cumprir os requisitos abaixo:</p>
          <ul className="cert-locked-reqs">
            <li className={stats.pct === 100 ? 'ok' : 'pend'}>
              <span>{stats.pct === 100 ? '✅' : '○'}</span>
              <span>Concluir 100% das aulas ({stats.done}/{stats.total} — {stats.pct}%)</span>
            </li>
            <li className={quiz.passed ? 'ok' : 'pend'}>
              <span>{quiz.passed ? '✅' : '○'}</span>
              <span>
                Aprovação na avaliação final (mínimo {PASS_PERCENT}%)
                {quiz.attempts > 0 && ` — melhor nota: ${quiz.best}%`}
              </span>
            </li>
          </ul>
          <div className="cert-toolbar-actions" style={{ justifyContent: 'center' }}>
            <Link to={`/cursos/mop-interno/sala-de-aula`} className="btn-cert-print">
              {stats.pct < 100 ? 'Continuar Aulas' : 'Revisar Aulas'}
            </Link>
            {stats.pct === 100 && !quiz.passed && (
              <Link to="/cursos/mop-interno/avaliacao" className="btn-cert-print"
                style={{ background: 'var(--gold)', color: 'var(--primary)' }}>
                Fazer Avaliação
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="cert-page">
      <CertToolbar />
      <CertificateSheet
        studentName={user?.nome || 'Aluno'}
        courseName={curso?.nome}
        duration={curso?.duracao || '16h'}
        score={cert.score}
        issuedDate={issuedDate}
        code={cert.code}
        responsavel="Coordenação de Operações Conatus"
      />
    </div>
  );
}
