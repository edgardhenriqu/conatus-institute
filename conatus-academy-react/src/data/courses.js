/**
 * Utilitários de curso compartilhados entre catálogo, cards e páginas.
 * O curso MOP estático (legacyMopCourse) e o catálogo estático (staticCourses)
 * foram removidos — todos os cursos vêm do banco de dados.
 */

export const freeCourseIds = [1, 2, 3]; // fallback p/ cursos antigos sem campo `tipo`

export const NIVEL_LABELS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

/**
 * Normaliza um curso vindo do banco para o formato usado nos cards/páginas.
 * O acesso é a fonte única (o antigo campo `tipo` foi aposentado): dele derivamos
 * os flags de conveniência usados na UI.
 *   acesso 'publico'  → gratuito (aberto a todos)
 *   acesso 'restrito' → restrito (empresa parceira / funcionários / liberação)
 *   acesso 'pago'     → pago
 */
export function normalizeDbCourse(c) {
  const acesso = c.acesso || 'publico';
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    ...c,
    acesso,
    gratuito: acesso === 'publico',
    restrito: acesso === 'restrito',
    pago: acesso === 'pago',
    nivel: NIVEL_LABELS[c.nivel] || c.nivel,
    descricao: c.descricao_curta || c.descricao,
    image: c.image || `images/courses/${c.nome}.png`,
    // Venda (cursos pagos) — NUMERIC chega como string do Postgres
    preco: num(c.preco),
    preco_promocional: num(c.preco_promocional),
    moeda: c.moeda || 'BRL',
    max_parcelas: num(c.max_parcelas) || 1,
    ocultar_preco: Boolean(c.ocultar_preco),
    destaque_promocao: Boolean(c.destaque_promocao),
    mensagem_compra: c.mensagem_compra || '',
    // true quando o aluno logado já comprou (ou é staff/instrutor do curso)
    possuiCurso: Boolean(c.possui_curso),
    // "Em breve" — curso ainda não lançado, com captação de interesse
    emBreve: c.status === 'em_breve' || Boolean(c.em_breve),
    totalInteresse: num(c.total_interesse) || 0,
    interesseRegistrado: Boolean(c.interesse_registrado),
  };
}
