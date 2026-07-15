/**
 * Eixos das Simulações Aplicadas a Data Centers.
 *
 * Fonte única de verdade compartilhada entre a página do aluno
 * (src/pages/Simulacoes.jsx) e o painel admin (src/pages/admin/AdminSimulacoes.jsx).
 * O campo `id` casa com a coluna `tema` da tabela `simulacoes` no banco e com
 * TEMAS_VALIDOS em server/src/routes/simulacoes.js — manter em sincronia.
 */
export const SIMULACAO_TEMAS = [
  {
    id: 'falhas',
    icone: '⚠️',
    titulo: 'Simulações de Falhas',
    descricao: 'Cenários de contingência: queda de energia, falha de resfriamento, sobrecarga e resposta a incidentes críticos.',
  },
  {
    id: 'operacoes',
    icone: '🛠️',
    titulo: 'Simulações de Operações',
    descricao: 'Rotinas do dia a dia da sala de dados: rondas, manobras planejadas e execução guiada por MOP/SOP.',
  },
  {
    id: 'manutencoes',
    icone: '🔧',
    titulo: 'Simulações de Manutenções',
    descricao: 'Manutenção preventiva e corretiva em ambiente simulado: LOTO, troca de módulos e testes de comissionamento.',
  },
];

/** Metadados de um eixo pelo seu id (tema). */
export function temaInfo(id) {
  return SIMULACAO_TEMAS.find((t) => t.id === id) || null;
}
