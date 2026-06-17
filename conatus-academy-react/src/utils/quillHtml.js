/**
 * O getSemanticHTML() do Quill 2 converte espaços comuns em &nbsp;
 * (bug conhecido: quilljs/quill#4509), o que impede a quebra de linha
 * entre palavras — o parágrafo vira uma "palavra" única gigante.
 *
 * Use esta função ao SALVAR ou RENDERIZAR conteúdo vindo do editor.
 * (Não aplicar no onChange: alterar o value de um componente controlado
 * faria o cursor saltar a cada tecla.)
 */

// U+00A0 (non-breaking space) sem caractere invisível no código-fonte
const RAW_NBSP = new RegExp(String.fromCharCode(160), 'g');

export function normalizeQuillHtml(html) {
  if (!html) return html;
  return html.replace(/&nbsp;/g, ' ').replace(RAW_NBSP, ' ');
}
