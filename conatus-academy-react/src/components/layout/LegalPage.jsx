import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import './LegalPage.css';

/**
 * LegalPage
 * ---------
 * Layout compartilhado das páginas institucionais de texto legal
 * (Termos de Serviço, Política de Privacidade).
 *
 * Responsável por toda a estrutura visual e de navegação — breadcrumb,
 * índice lateral (TOC) com scroll-spy, âncoras por seção, caixa de
 * "última atualização", botão "voltar ao topo" e SEO (title/description).
 * As páginas concretas fornecem apenas o conteúdo via `sections`.
 *
 * @param {string}  title           Título principal (H1) da página.
 * @param {string}  subtitle        Linha de apoio abaixo do H1.
 * @param {string}  breadcrumbLabel Rótulo final do breadcrumb (ex.: "Termos de Serviço").
 * @param {string}  updatedAt       Data da última atualização (texto já formatado).
 * @param {string}  seoTitle        <title> da página.
 * @param {string}  seoDescription  <meta name="description"> da página.
 * @param {Array<{id:string, heading:string, content:React.ReactNode}>} sections
 */
export function LegalPage({
  title,
  subtitle,
  breadcrumbLabel,
  updatedAt,
  seoTitle,
  seoDescription,
  sections,
}) {
  useDocumentMeta(seoTitle, seoDescription);

  const [activeId, setActiveId] = useState(sections[0]?.id || '');
  const [showTop, setShowTop] = useState(false);
  const clickLockRef = useRef(false);

  /* ── Scroll-spy: destaca no índice a seção em leitura ──────────── */
  useEffect(() => {
    // Linha de referência logo abaixo da navbar fixa.
    const OFFSET = 120;
    let raf = 0;

    const update = () => {
      raf = 0;
      if (clickLockRef.current) return; // ignora durante scroll programático

      // Ao chegar ao fim da página, ativa a última seção.
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 4;
      if (nearBottom) {
        setActiveId(sections[sections.length - 1].id);
        return;
      }

      // Última seção cujo topo já cruzou a linha de referência.
      let current = sections[0]?.id || '';
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= OFFSET) current = s.id;
        else break;
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sections]);

  /* ── Botão "voltar ao topo" ────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Deep-link: rola até a âncora presente na URL ao montar ─────── */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && document.getElementById(id)) {
      const t = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveId(id);
      }, 100);
      return () => clearTimeout(t);
    }
  }, []);

  const goToSection = useCallback((e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // Trava o scroll-spy brevemente para o destaque ir direto ao alvo.
    clickLockRef.current = true;
    setActiveId(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    el.focus({ preventScroll: true });
    setTimeout(() => { clickLockRef.current = false; }, 700);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState(null, '', window.location.pathname);
  };

  return (
    <div className="legal-page">
      {/* ── Cabeçalho da página ─────────────────────────────────── */}
      <div className="legal-hero">
        <div className="container legal-container">
          <nav className="legal-breadcrumb" aria-label="Trilha de navegação">
            <ol>
              <li><Link to="/">Início</Link></li>
              <li aria-hidden="true" className="legal-breadcrumb-sep">›</li>
              <li aria-current="page">{breadcrumbLabel}</li>
            </ol>
          </nav>
          <h1 className="legal-title">{title}</h1>
          {subtitle && <p className="legal-subtitle">{subtitle}</p>}
        </div>
      </div>

      {/* ── Corpo: índice + conteúdo ────────────────────────────── */}
      <div className="container legal-container legal-body">
        <aside className="legal-toc" aria-label="Índice da página">
          <p className="legal-toc-title">Nesta página</p>
          <nav>
            <ul>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={activeId === s.id ? 'is-active' : undefined}
                    aria-current={activeId === s.id ? 'true' : undefined}
                    onClick={(e) => goToSection(e, s.id)}
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="legal-content">
          {updatedAt && (
            <div className="legal-updated" role="note">
              <span className="legal-updated-icon" aria-hidden="true">🛡️</span>
              <span>
                <strong>Última atualização:</strong> {updatedAt}
              </span>
            </div>
          )}

          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="legal-section"
              tabIndex={-1}
              aria-labelledby={`${s.id}-heading`}
            >
              <h2 id={`${s.id}-heading`}>{s.heading}</h2>
              {s.content}
            </section>
          ))}
        </main>
      </div>

      {/* ── Voltar ao topo ──────────────────────────────────────── */}
      <button
        type="button"
        className={`legal-top ${showTop ? 'is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Voltar ao topo da página"
        title="Voltar ao topo"
      >
        <span aria-hidden="true">↑</span>
      </button>
    </div>
  );
}
