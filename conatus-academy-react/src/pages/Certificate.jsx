import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { PageLoader } from '../components/ui/PageLoader';

export function Certificate() {
  const { id } = useParams();
  return <DbCertificate cursoId={id} />;
}

/* ── Layout compartilhado do certificado ───────────────────────────────────── */

/**
 * Lê a cor predominante (a tinta) de uma imagem de assinatura.
 * Ignora pixels transparentes e o fundo claro, retornando a média dos traços.
 * Usada para que a assinatura automática do concluinte tenha a mesma
 * tonalidade da assinatura enviada pelo responsável.
 */
function useInkColor(src) {
  const [color, setColor] = useState(null);
  useEffect(() => {
    if (!src) { setColor(null); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, 200 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;                       // transparente
          const cr = data[i], cg = data[i + 1], cb = data[i + 2];
          if (cr > 200 && cg > 200 && cb > 200) continue;        // fundo claro
          r += cr; g += cg; b += cb; n++;
        }
        if (cancelled) return;
        setColor(n > 0 ? `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})` : null);
      } catch {
        if (!cancelled) setColor(null);                          // canvas tainted → fallback CSS
      }
    };
    img.onerror = () => { if (!cancelled) setColor(null); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return color;
}

function CertificateSheet({ studentName, courseName, duration, score, issuedDate, code, responsavel, assinatura, texto, empresas }) {
  const assinaturaSrc = assinatura?.trim()
    ? (assinatura.startsWith('http') ? assinatura : `/${assinatura}`)
    : null;
  const inkColor = useInkColor(assinaturaSrc);
  // Cursos Huawei (empresa "Soluções WDC", slug 'huawei') levam os logos da WDC
  // e da Huawei no canto direito do certificado.
  const ehHuawei = Array.isArray(empresas) && empresas.some(e => e.slug === 'huawei');
  return (
    <div className={`certificate${ehHuawei ? ' has-partner-logos' : ''}`} id="certificate">
      <img src="/images/logo-institute.svg" alt="Conatus Institute" className="cert-logo" />
      {ehHuawei && (
        <div className="cert-partner-logos">
          <img src="/images/logo-wdc.png" alt="Soluções WDC" className="cert-partner-logo" />
          <img src="/images/huawei.svg" alt="Huawei" className="cert-partner-logo cert-partner-logo-sub" />
        </div>
      )}
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
          <div className="cert-signature-line">
            {assinaturaSrc && (
              <img src={assinaturaSrc} alt="Assinatura do responsável" className="cert-signature-img" />
            )}
          </div>
          <strong>{responsavel?.trim() || 'Conatus Institute'}</strong>
          <span>Responsável Técnico</span>
        </div>
        <div className="cert-signature">
          <div className="cert-signature-line">
            <span className="cert-signature-auto" style={inkColor ? { color: inkColor } : undefined}>
              {studentName}
            </span>
          </div>
          <strong>{studentName}</strong>
          <span>Concluinte</span>
        </div>
      </div>

      <div className="cert-validation">
        Código de validação: <code>{code}</code>
        <span className="cert-validation-extra">
          <br />
          Verifique a autenticidade em {window.location.origin}/validar-certificado
          <br />
          Documento emitido digitalmente pela plataforma Conatus Institute.
        </span>
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
  /* Não imprime o aviso de autenticidade / emissão digital */
  .cert-validation-extra { display: none !important; }
  .certificate {
    position: relative !important;
    visibility: visible !important;
    max-width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
    border-width: 8px !important;
    padding: 12px 48px !important;
    page-break-inside: avoid;
  }
  .cert-logo { top: 2mm !important; left: 12mm !important; width: 58mm !important; }
  .cert-partner-logos { top: 9mm !important; right: 12mm !important; flex-direction: column !important; align-items: center !important; gap: 2mm !important; }
  /* huawei.svg recortado → preenche a caixa; mesma altura que o WDC, casada com
     a altura de tinta do logo Conatus (47mm * 0.34 ≈ 16mm). */
  .cert-partner-logo { height: 15mm !important; }
  .cert-partner-logo-sub { height: 8mm !important; }
  /* Compacta o layout na vertical: o A4 paisagem tem só ~194mm de área útil e,
     sem isto, o certificado passava de 218mm e o rodapé (código de validação)
     era cortado. O margin-top empurra o título central para baixo dos logos
     empilhados (WDC em cima, Huawei menor abaixo). */
  .has-partner-logos .cert-brand { margin-top: 32mm !important; }
  .cert-brand { font-size: 1.25rem !important; margin-bottom: 2px !important; }
  .cert-brand-sub { margin-bottom: 10px !important; }
  .cert-title { font-size: 2.1rem !important; margin: 6px 0 8px !important; }
  .cert-lead { margin: 2px 0 !important; }
  .cert-student { margin: 4px 0 !important; }
  /* mantém 'auto' nas laterais: sem isso o bloco max-width:700px perde a
     centralização e o texto abaixo do nome sai desalinhado na impressão. */
  .cert-course { margin: 8px auto 10px !important; }
  .cert-details { margin: 8px 0 12px !important; }
  .cert-signatures { margin: 10px 0 8px !important; }
  .cert-validation { margin-top: 8px !important; }
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
        assinatura={cert.cert_assinatura || curso?.cert_assinatura}
        texto={cert.cert_texto || curso?.cert_texto}
        empresas={curso?.empresas}
      />
    </div>
  );
}
