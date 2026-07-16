/**
 * Fechamento automático de chamados resolvidos.
 *
 * Regra: marcado como "resolvido", o chamado fecha sozinho depois de 24h. A
 * janela existe para o aluno poder discordar — responder reabre o chamado (e o
 * trigger do banco limpa a marca de resolução, zerando o prazo).
 *
 * A contagem vem de tickets.resolvido_em, mantida por trigger no Postgres
 * (ver db/ensureSchema.js). Aqui só varremos quem já venceu.
 *
 * Por que varredura periódica e não um timer por chamado: um setTimeout de 24h
 * morre no primeiro restart/redeploy — e no Replit isso acontece o tempo todo.
 * A varredura relê o estado do banco e é indiferente a quantas vezes o
 * processo caiu no meio do caminho.
 */
const pool = require('../../db/connection');

const HORAS_ATE_FECHAR = 24;
// De quanto em quanto tempo procuramos vencidos. Não precisa ser fino: um
// chamado fechar às 24h05 em vez de 24h00 não muda nada para ninguém, e uma
// varredura barata a cada 15 min é melhor que uma query por minuto.
const INTERVALO_MS = 15 * 60 * 1000;

/**
 * Fecha os chamados resolvidos há mais de 24h e registra cada fechamento no
 * histórico como ação do sistema (para o admin não achar que um colega fechou).
 *
 * @returns {Promise<number[]>} ids dos chamados fechados nesta passada.
 */
async function fecharVencidos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // O corte é feito pelo BANCO (CURRENT_TIMESTAMP), não pelo relógio do Node:
    // com o servidor em outro fuso ou com hora torta, comparar aqui fecharia
    // chamados cedo ou tarde demais.
    const r = await client.query(
      `UPDATE tickets
          SET status = 'fechado', atualizado_em = CURRENT_TIMESTAMP
        WHERE status = 'resolvido'
          AND resolvido_em IS NOT NULL
          AND resolvido_em <= CURRENT_TIMESTAMP - INTERVAL '${HORAS_ATE_FECHAR} hours'
        RETURNING id`
    );

    for (const { id } of r.rows) {
      await client.query(
        `INSERT INTO ticket_eventos (ticket_id, ator_id, ator_nome, acao, valor_de, valor_para)
         VALUES ($1, NULL, 'Sistema', 'status', 'resolvido', 'fechado')`,
        [id]
      );
    }

    await client.query('COMMIT');
    return r.rows.map(x => x.id);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Liga a varredura periódica. Chamada uma vez no boot do servidor.
 * @returns {() => void} função para parar (usada em teste).
 */
function iniciarFechamentoAutomatico() {
  let rodando = false;

  async function passada() {
    // Guarda de reentrância: se uma varredura demorar mais que o intervalo (banco
    // lento), a seguinte não pode começar por cima e duplicar eventos.
    if (rodando) return;
    rodando = true;
    try {
      const ids = await fecharVencidos();
      if (ids.length) {
        console.log(
          `[Suporte] Fechamento automático (${HORAS_ATE_FECHAR}h): ` +
          `${ids.length} chamado(s) — ${ids.map(i => `#${i}`).join(', ')}`
        );
      }
    } catch (err) {
      // Falha aqui não pode derrubar o servidor: é uma tarefa de fundo, e a
      // próxima passada tenta de novo.
      console.error('[Suporte] Falha no fechamento automático:', err.message);
    } finally {
      rodando = false;
    }
  }

  // Uma passada logo no boot recupera o tempo em que o processo esteve fora do
  // ar — sem isso, um redeploy no meio da janela adiaria os fechamentos.
  passada();
  const t = setInterval(passada, INTERVALO_MS);
  // unref: esta tarefa não deve, sozinha, segurar o processo vivo.
  if (typeof t.unref === 'function') t.unref();
  return () => clearInterval(t);
}

module.exports = { iniciarFechamentoAutomatico, fecharVencidos, HORAS_ATE_FECHAR };
