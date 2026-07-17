/**
 * Gateways de pagamento — camada DESACOPLADA da plataforma.
 *
 * A plataforma nunca fala com Stripe/Mercado Pago/etc. diretamente: as rotas
 * chamam `getGateway()` e usam o contrato abaixo. Para integrar um provedor
 * real, basta criar um arquivo neste diretório que estenda PaymentGateway
 * (ex.: stripe.js), registrá-lo em GATEWAYS e definir PAYMENT_GATEWAY no .env.
 * Nada na lógica principal (rotas, accessControl, compras) muda.
 *
 * Contrato (todas retornam Promise):
 *   criarCheckout({ curso, aluno, parcelas, cupom })
 *     → { url, referencia }  — URL de checkout externa + id da transação
 *   confirmarPagamento(referencia)
 *     → { aprovado, valor, moeda }  — consulta o status da transação
 *   processarWebhook(req)
 *     → { referencia, status }  — traduz a notificação do provedor
 *
 * @typedef {Object} CheckoutInfo
 * @property {string} url         URL de checkout no provedor
 * @property {string} referencia  Identificador externo da transação (gateway_ref)
 */

/** Erro padrão enquanto nenhum provedor está configurado (HTTP 501 nas rotas). */
class GatewayIndisponivelError extends Error {
  constructor(gateway) {
    super('O pagamento online ainda não está disponível. Em breve você poderá adquirir este curso pela plataforma.');
    this.name = 'GatewayIndisponivelError';
    this.gateway = gateway;
    this.status = 501;
  }
}

/** Classe base: define o contrato. Provedores reais sobrescrevem os métodos. */
class PaymentGateway {
  constructor(nome, label) {
    this.nome = nome;
    this.label = label;
  }
  // eslint-disable-next-line no-unused-vars
  async criarCheckout({ curso, aluno, parcelas, cupom }) {
    throw new GatewayIndisponivelError(this.nome);
  }
  // eslint-disable-next-line no-unused-vars
  async confirmarPagamento(referencia) {
    throw new GatewayIndisponivelError(this.nome);
  }
  // eslint-disable-next-line no-unused-vars
  async processarWebhook(req) {
    throw new GatewayIndisponivelError(this.nome);
  }
}

// Provedores previstos. Hoje todos usam a base (não implementado); a troca por
// uma implementação real é local a este mapa.
const GATEWAYS = {
  stripe:      new PaymentGateway('stripe', 'Stripe'),
  mercadopago: new PaymentGateway('mercadopago', 'Mercado Pago'),
  asaas:       new PaymentGateway('asaas', 'Asaas'),
  pagseguro:   new PaymentGateway('pagseguro', 'PagSeguro'),
  paypal:      new PaymentGateway('paypal', 'PayPal'),
};

/**
 * Gateway ativo da plataforma (env PAYMENT_GATEWAY). Sempre retorna um objeto
 * que honra o contrato; sem configuração, os métodos lançam
 * GatewayIndisponivelError e as rotas respondem 501.
 */
function getGateway(nome = process.env.PAYMENT_GATEWAY) {
  return GATEWAYS[String(nome || '').toLowerCase()] || new PaymentGateway('nenhum', 'Não configurado');
}

module.exports = { getGateway, PaymentGateway, GatewayIndisponivelError, GATEWAYS };
