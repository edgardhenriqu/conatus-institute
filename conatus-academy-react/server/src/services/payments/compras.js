/**
 * Compras de cursos pagos — posse e validação de venda.
 *
 * Fonte única da pergunta "este aluno comprou este curso?" e das regras de
 * validação monetária da configuração de venda. O gateway (services/payments/
 * index.js) só cria/atualiza linhas em curso_compras; quem decide acesso é
 * accessControl.js consultando possuiCurso daqui.
 */
const pool = require('../../../db/connection');

const MOEDAS_VALIDAS = ['BRL'];
const MAX_PARCELAS_LIMITE = 12;
const MENSAGEM_COMPRA_MAX = 500;

/** O aluno tem uma compra APROVADA deste curso? */
async function possuiCurso(alunoId, cursoId) {
  if (!alunoId) return false;
  const r = await pool.query(
    `SELECT 1 FROM curso_compras
      WHERE aluno_id = $1 AND curso_id = $2 AND status = 'aprovada'
      LIMIT 1`,
    [alunoId, cursoId]
  );
  return r.rows.length > 0;
}

/**
 * Registra uma compra aprovada (concessão manual hoje; webhook do gateway no
 * futuro). Idempotente: se o aluno já possui o curso, não duplica.
 */
async function registrarCompraAprovada({ alunoId, cursoId, valor = null, moeda = 'BRL', parcelas = 1, cupom = null, gateway = null, gatewayRef = null }) {
  const r = await pool.query(
    `INSERT INTO curso_compras (curso_id, aluno_id, status, valor, moeda, parcelas, cupom, gateway, gateway_ref)
     VALUES ($1, $2, 'aprovada', $3, $4, $5, $6, $7, $8)
     ON CONFLICT (curso_id, aluno_id) WHERE status = 'aprovada' DO NOTHING
     RETURNING *`,
    [cursoId, alunoId, valor, moeda, parcelas, cupom, gateway, gatewayRef]
  );
  return r.rows[0] || null;
}

/** Interpreta um valor monetário vindo do cliente. Retorna Number ou null. */
function parseValor(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100) / 100; // 2 casas decimais
}

/**
 * Valida e normaliza a configuração de venda de um curso pago.
 * @returns {{ erro?: string, venda?: object }}
 */
function validarVenda(body = {}) {
  const preco = parseValor(body.preco);
  const precoPromocional = parseValor(body.preco_promocional);

  if (preco === null || Number.isNaN(preco)) {
    return { erro: 'Informe um valor válido para o curso.' };
  }
  if (preco <= 0 || preco > 99999.99) {
    return { erro: 'O valor do curso deve estar entre R$ 0,01 e R$ 99.999,99.' };
  }
  if (Number.isNaN(precoPromocional)) {
    return { erro: 'Valor promocional inválido.' };
  }
  if (precoPromocional !== null && (precoPromocional <= 0 || precoPromocional >= preco)) {
    return { erro: 'O valor promocional deve ser maior que zero e menor que o valor do curso.' };
  }

  const moeda = String(body.moeda || 'BRL').toUpperCase();
  if (!MOEDAS_VALIDAS.includes(moeda)) {
    return { erro: `Moeda não suportada. Disponível: ${MOEDAS_VALIDAS.join(', ')}.` };
  }

  const maxParcelas = Number(body.max_parcelas ?? 1);
  if (!Number.isInteger(maxParcelas) || maxParcelas < 1 || maxParcelas > MAX_PARCELAS_LIMITE) {
    return { erro: `O parcelamento deve ser entre 1x e ${MAX_PARCELAS_LIMITE}x.` };
  }

  const mensagemCompra = String(body.mensagem_compra || '').trim().slice(0, MENSAGEM_COMPRA_MAX) || null;

  return {
    venda: {
      preco,
      preco_promocional: precoPromocional,
      moeda,
      max_parcelas: maxParcelas,
      permite_cupom: Boolean(body.permite_cupom),
      mensagem_compra: mensagemCompra,
      a_venda: Boolean(body.a_venda),
      ocultar_preco: Boolean(body.ocultar_preco),
      destaque_promocao: Boolean(body.destaque_promocao),
    },
  };
}

/** Campos de venda persistidos na tabela cursos (ordem estável p/ UPDATE). */
const VENDA_FIELDS = [
  'preco', 'preco_promocional', 'moeda', 'max_parcelas', 'permite_cupom',
  'mensagem_compra', 'a_venda', 'ocultar_preco', 'destaque_promocao',
];

/** Extrai a configuração de venda de uma linha da tabela cursos. */
function vendaDoCurso(curso) {
  return {
    preco: curso.preco !== null && curso.preco !== undefined ? Number(curso.preco) : null,
    preco_promocional: curso.preco_promocional !== null && curso.preco_promocional !== undefined
      ? Number(curso.preco_promocional) : null,
    moeda: curso.moeda || 'BRL',
    max_parcelas: curso.max_parcelas || 1,
    permite_cupom: Boolean(curso.permite_cupom),
    mensagem_compra: curso.mensagem_compra || '',
    a_venda: Boolean(curso.a_venda),
    ocultar_preco: Boolean(curso.ocultar_preco),
    destaque_promocao: Boolean(curso.destaque_promocao),
  };
}

module.exports = {
  possuiCurso,
  registrarCompraAprovada,
  validarVenda,
  vendaDoCurso,
  VENDA_FIELDS,
  MOEDAS_VALIDAS,
  MAX_PARCELAS_LIMITE,
};
