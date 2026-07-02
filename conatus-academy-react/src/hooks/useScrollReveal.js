import { useEffect } from 'react';

/**
 * Revela elementos marcados com [data-reveal] conforme entram no viewport,
 * adicionando a classe `.is-visible` (estilos em styles/animations.css).
 *
 * Variantes: data-reveal (fade-up, padrão), "left", "right", "fade", "zoom".
 * Stagger: style={{ '--reveal-delay': '120ms' }}.
 *
 * Passe `deps` quando a seção renderizar conteúdo dinâmico (fetch), para
 * que os novos elementos também sejam observados.
 */
export function useScrollReveal(deps = []) {
  useEffect(() => {
    const elementos = document.querySelectorAll('[data-reveal]:not(.is-visible)');
    if (elementos.length === 0) return undefined;

    // Fallback: sem IntersectionObserver, mostra tudo imediatamente.
    if (typeof IntersectionObserver === 'undefined') {
      elementos.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      // Dispara quando ~12% do elemento entra, um pouco antes do fim da tela.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
