/**
 * Formatação de valores monetários da plataforma (pt-BR).
 * Fonte única: qualquer preço exibido (cards, detalhe, admin) passa por aqui,
 * para que a futura adição de moedas não espalhe formatação pela UI.
 */

/** "R$ 497,00" — retorna '' para valores nulos/inválidos. */
export function formatarPreco(valor, moeda = 'BRL') {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda || 'BRL' }).format(n);
}

/** "12x de R$ 24,75" — valor da parcela simples (sem juros), ou '' se não parcela. */
export function formatarParcelamento(valor, parcelas, moeda = 'BRL') {
  const n = Number(valor);
  const p = Number(parcelas);
  if (!Number.isFinite(n) || !Number.isInteger(p) || p <= 1) return '';
  return `${p}x de ${formatarPreco(n / p, moeda)}`;
}

/** Preço efetivo de venda: promocional quando existir, senão o cheio. */
export function precoVigente(curso) {
  const promo = Number(curso?.preco_promocional);
  if (Number.isFinite(promo) && promo > 0) return promo;
  const preco = Number(curso?.preco);
  return Number.isFinite(preco) ? preco : null;
}
