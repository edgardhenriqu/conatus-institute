/**
 * Curso MOP legado (definido em código). Foi migrado para o banco de dados
 * pelo seed automático do servidor (server/db/seedMopCourse.js) e agora é
 * gerenciado pelo painel admin como qualquer outro curso.
 * Este objeto é mantido apenas para compatibilidade com alunos que já tinham
 * progresso salvo no fluxo antigo (rotas /cursos/mop-interno/*).
 */
export const legacyMopCourse =
  {
    id: 'mop-interno',
    nome: 'Especialização Operacional: Elaboração de MOPs para Data Centers',
    tipo: 'interno',
    gratuito: false,
    duracao: '16h',
    nivel: 'Avançado',
    image: 'images/courses/Criação de MOPs para Operações em Data Centers.png',
    descricao: 'Treinamento técnico exclusivo para colaboradores Conatus. Capacita na criação de MOPs (Method of Procedure) para Data Centers — desde os fundamentos de ambientes críticos, sistemas de energia, refrigeração e proteção, até a elaboração de procedimentos padronizados com análise de risco, plano de rollback, validação em campo e checklist de qualidade. O curso inclui avaliação teórica (mínimo 80%) para emissão de certificado interno.',
    publicoAlvo: 'Técnicos de operação, operadores de Data Center, analistas de infraestrutura, engenheiros, coordenadores de operação e profissionais de manutenção que atuam ou desejam atuar em ambientes críticos.',
    objetivo: 'Capacitar o colaborador a elaborar MOPs completos, tecnicamente corretos e seguros para intervenções em ambientes críticos de Data Center, aplicando padronização Conatus, análise de risco, validação documental e de campo, plano de rollback e boas práticas de qualidade operacional.',
    regrasAcesso: 'Exclusivo para colaboradores e administradores da Conatus Institute.',
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
    matriz_curricular: `Módulo 1: Fundamentos de Data Centers e Ambientes Críticos: Classificação Tier, disponibilidade, operação 24x7 e por que procedimentos existem.
Módulo 2: Tipos e Topologias de Data Centers: Modelos Colocation, Enterprise, Edge e principais arquiteturas.
Módulo 3: Sistemas de Energia: UPS, DRUPS, gerador, ATS/STS, PDU, redundância N+1/2N/2N+1.
Módulo 4: Sistemas de Refrigeração: Chiller, CRAC/CRAH, adiabático, hot/cold aisle, análise de fluxo de ar.
Módulo 5: Sistemas de Proteção Contra Incêndio: VESDA, FM-200, detecção, inibição e procedimentos de emergência.
Módulo 6: Redes de Telecomunicações e Cabeamento: Topologias Spine-Leaf, cabeamento estruturado, fibra óptica, patch panels.
Módulo 7: O que é um MOP e Por que Ele Existe: Diferença entre MOP, SOP e EOP; impacto real de falhas; cultura de procedimentos.
Módulo 8: Estrutura Padrão Conatus para MOPs: Identificação, objetivo, escopo, pré-requisitos, steps, rollback, aprovações.
Módulo 9: Análise de Risco e Plano de Rollback: Identificação de risco, efeito cascata, critérios de rollback, validação.
Módulo 10: Consulta de Documentação e Validação em Campo: Diagramas unifilares, layout, as-built, Walk Down, validação de TAGs.
Módulo 11: Processo de Aprovação e Dry Run: Fluxo interno/externo, simulação a seco, pré-aprovação e comunicação.
Módulo 12: Checklist de QA, Simulações e Cultura Conatus: Revisão crítica, erros comuns, simulações práticas e excelência operacional.`
  };

// Catálogo estático vazio — todos os cursos agora vêm do banco de dados.
export const staticCourses = [];

export const freeCourseIds = [1, 2, 3]; // fallback p/ cursos antigos sem campo `tipo`

export const NIVEL_LABELS = {
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

/** Normaliza um curso vindo do banco para o formato usado nos cards/páginas. */
export function normalizeDbCourse(c) {
  return {
    ...c,
    gratuito: c.tipo ? c.tipo === 'gratuito' : freeCourseIds.includes(c.id),
    nivel: NIVEL_LABELS[c.nivel] || c.nivel,
    descricao: c.descricao_curta || c.descricao,
    image: c.image || `images/courses/${c.nome}.png`,
  };
}
