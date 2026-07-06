import { useEffect } from 'react';

/**
 * useDocumentMeta
 * ---------------
 * Define o <title> e a <meta name="description"> da página enquanto o
 * componente estiver montado, restaurando os valores anteriores ao desmontar.
 *
 * O projeto não usa react-helmet; este hook centraliza o SEO por página
 * (Termos de Serviço, Política de Privacidade, etc.) de forma leve.
 */
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    let createdMeta = false;
    if (description) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
        createdMeta = true;
      }
    }
    const prevDesc = meta ? meta.getAttribute('content') : null;
    if (meta && description) meta.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      if (!meta) return;
      if (createdMeta) meta.remove();
      else if (prevDesc !== null) meta.setAttribute('content', prevDesc);
    };
  }, [title, description]);
}
