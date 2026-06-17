/**
 * Importa o curso MOP (antes estático em src/data/) para o banco de dados,
 * para que apareça no painel admin e sirva de modelo (via "Duplicar")
 * para os próximos cursos.
 *
 * Idempotente: se o curso já existir no banco, não faz nada.
 * Lê o conteúdo diretamente dos arquivos-fonte do frontend (ESM)
 * via dynamic import — fonte única da verdade.
 */
const path = require('path');
const { pathToFileURL } = require('url');
const pool = require('./connection');

const MOP_NOME = 'Especialização Operacional: Elaboração de MOPs para Data Centers';

const MOP_CURSO = {
  nome: MOP_NOME,
  duracao: '16h',
  image: 'images/courses/Criação de MOPs para Operações em Data Centers.png',
  descricao_curta: 'Treinamento interno Conatus: elaboração de MOPs completos e seguros para intervenções em Data Centers.',
  descricao: 'Treinamento técnico exclusivo para colaboradores Conatus. Capacita na criação de MOPs (Method of Procedure) para Data Centers — desde os fundamentos de ambientes críticos, sistemas de energia, refrigeração e proteção, até a elaboração de procedimentos padronizados com análise de risco, plano de rollback, validação em campo e checklist de qualidade. O curso inclui avaliação teórica (mínimo 80%) para emissão de certificado interno.',
  categoria: 'Operações Críticas',
  nivel: 'avancado',
  tipo: 'interno',
  status: 'publicado',
  visivel: true,
  publico_alvo: 'Técnicos de operação, operadores de Data Center, analistas de infraestrutura, engenheiros, coordenadores de operação e profissionais de manutenção que atuam ou desejam atuar em ambientes críticos.',
  objetivo: 'Capacitar o colaborador a elaborar MOPs completos, tecnicamente corretos e seguros para intervenções em ambientes críticos de Data Center, aplicando padronização Conatus, análise de risco, validação documental e de campo, plano de rollback e boas práticas de qualidade operacional.',
  requisitos: 'Ser colaborador autorizado da Conatus. Conhecimentos básicos de infraestrutura de Data Centers são recomendados.',
  requisitos_certificado: 'Concluir 100% das aulas e obter no mínimo 80% na avaliação final (máximo de 3 tentativas).',
  cert_responsavel: 'Coordenação de Operações Conatus',
  cert_texto: 'concluiu com aproveitamento o treinamento interno, cumprindo 100% das aulas e obtendo aprovação na avaliação final do curso',
  oque_aprender: `• Identificar os principais sistemas de um Data Center (energia, refrigeração, proteção, redes).
• Diferenciar MOP, SOP e EOP — e saber quando usar cada um.
• Elaborar MOPs estruturados seguindo o padrão Conatus.
• Aplicar análise de risco e identificar impactos em cascata.
• Criar planos de rollback consistentes e validados.
• Consultar documentação técnica homologada (diagramas, as-built, manuais).
• Validar TAGs e informações diretamente em campo (Walk Down).
• Conduzir um Dry Run antes de qualquer intervenção crítica.
• Aplicar checklist de qualidade (QA) e navegar no fluxo de aprovação.
• Produzir procedimentos técnicos seguros, rastreáveis e à prova de falhas.`,
  mercado_trabalho: 'Exclusivo para desenvolvimento interno da equipe Conatus.',
  areas_atuacao: 'Operação de Data Centers, Manutenção Crítica, Gerenciamento de Mudanças.',
  diferenciais: 'Conteúdo baseado nos processos reais da Conatus Institute. Avaliação teórica com 30 questões (10 por tentativa, máximo 3 tentativas, nota mínima 80%). Certificado interno após aprovação.',
  infraestrutura: 'Treinamento online com material multimídia e referências técnicas reais.',
  coordenacao: 'Equipe de Operações Conatus',
  informacoes_complementares: 'Curso interno com certificação válida na Conatus Institute. Requisitos para certificado: 100% das aulas concluídas + aprovação na avaliação final (≥ 80%).',
};

async function importData() {
  const dataDir = path.join(__dirname, '..', '..', 'src', 'data');
  const contentMod = await import(pathToFileURL(path.join(dataDir, 'mopCourseContent.js')).href);
  const questionsMod = await import(pathToFileURL(path.join(dataDir, 'mopQuestions.js')).href);
  return {
    content: contentMod.mopCourseContent,
    questions: questionsMod.mopQuestions,
  };
}

async function seedMopCourse() {
  const existe = await pool.query('SELECT id FROM cursos WHERE nome = $1', [MOP_NOME]);
  if (existe.rows.length > 0) {
    return existe.rows[0].id;
  }

  const { content, questions } = await importData();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const campos = Object.keys(MOP_CURSO);
    const cursoRes = await client.query(
      `INSERT INTO cursos (${campos.join(', ')})
       VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      campos.map(c => MOP_CURSO[c])
    );
    const cursoId = cursoRes.rows[0].id;

    // Módulos e aulas
    let modOrdem = 0;
    for (const mod of content.modules) {
      modOrdem++;
      const modRes = await client.query(
        `INSERT INTO modulos (curso_id, titulo, ordem) VALUES ($1, $2, $3) RETURNING id`,
        [cursoId, mod.title, modOrdem]
      );
      const moduloId = modRes.rows[0].id;

      let aulaOrdem = 0;
      for (const lesson of mod.lessons) {
        aulaOrdem++;
        await client.query(
          `INSERT INTO aulas (modulo_id, titulo, conteudo, ordem, tipo_conteudo, obrigatoria)
           VALUES ($1, $2, $3, $4, 'texto', true)`,
          [moduloId, lesson.title, lesson.content, aulaOrdem]
        );
      }
    }

    // Avaliação: 10 questões por prova, mínimo 80%, 3 tentativas
    await client.query(
      `INSERT INTO avaliacoes (curso_id, num_questoes, nota_minima, max_tentativas, ativa)
       VALUES ($1, 10, 80, 3, true)`,
      [cursoId]
    );

    // Banco de 30 questões
    for (const q of questions) {
      await client.query(
        `INSERT INTO questoes (curso_id, enunciado, alternativas, correta, explicacao)
         VALUES ($1, $2, $3, $4, $5)`,
        [cursoId, q.enunciado, JSON.stringify(q.alternativas), q.correta, q.explicacao || null]
      );
    }

    await client.query('COMMIT');
    console.log(`Curso MOP importado para o banco (id ${cursoId}): ${content.modules.length} módulos, ${questions.length} questões.`);
    return cursoId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = seedMopCourse;
