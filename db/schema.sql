CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(15),
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    role VARCHAR(20) DEFAULT 'aluno',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alunos_email ON alunos(email);
CREATE INDEX IF NOT EXISTS idx_alunos_cpf ON alunos(cpf);
CREATE INDEX IF NOT EXISTS idx_alunos_role ON alunos(role);

CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    duracao VARCHAR(50) NOT NULL,
    image VARCHAR(255),
    descricao TEXT,
    oque_aprender TEXT,
    mercado_trabalho TEXT,
    areas_atuacao TEXT,
    diferenciais TEXT,
    infraestrutura TEXT,
    coordenacao TEXT,
    informacoes_complementares TEXT,
    matriz_curricular TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cursos (id, nome, duracao, image, descricao, oque_aprender, mercado_trabalho, areas_atuacao, diferenciais, infraestrutura, coordenacao, informacoes_complementares, matriz_curricular) VALUES
(1, 'Introdução a Sistemas de Geração para Data Centers', '20h', 'assets/img/Geradores para Data Center.png',
 'Conheça os fundamentos de sistemas de geração de energia para Data Centers, desde a seleção de equipamentos até a manutenção preventiva e preditiva. Este curso oferece uma visão completa do setor, preparando profissionais para atuar em ambientes de alta disponibilidade.',
 '• Conceitos fundamentais de geração de energia elétrica
• Tipos de geradores utilizados em Data Centers
• Dimensionamento de sistemas de geração
• Manutenção preventiva e preditiva
• Procedimentos de operação e segurança
• Monitoramento e indicadores de desempenho
• Normas técnicas e regulamentares aplicáveis',
 'O setor de Data Centers cresce a cada ano, impulsionado pela transformação digital e pela demanda por serviços em nuvem. Profissionais qualificados em sistemas de geração são altamente valorizados, com oportunidades em empresas de tecnologia, operadoras de telecomunicações e centros de dados corporativos.',
 '• Técnico em Manutenção de Geradores
• Especialista em Sistemas de Geração
• Operador de Central de Gerenciamento
• Consultor em Infraestrutura de TI
• Supervisor de Manutenção Preventiva
• Analista de Confiabilidade',
 '• Corpo docente com experiência em Data Centers
• Laboratório equipado com geradores reais
• Certificação reconhecida pelo mercado
• Material didático atualizado
• Networking com profissionais do setor
• Acompanhamento pós-curso',
 '• Laboratório de Geração com geradores a diesel e gasolina
• Sala de simulação de cenários reais
• Equipamentos de monitoramento e diagnóstico
• Área de descanso e convivência
• Wi-Fi gratuito
• Estacionamento',
 'Coordenador: Eng. Ricardo Mendes
• Especialista em Sistemas de Geração
• 15 anos de experiência em Data Centers
• Membro do comitê técnico da ABNT',
 '• Carga horária total: 20 horas
• Modalidade: Remoto
• Turno: Diurno e Noturno
• Vagas: 20 alunos por turma
• Pré-requisitos: Ensino Médio completo
• Certificado de conclusão',
 'Módulo 1: Fundamentos de Geração Elétrica (4h)
Módulo 2: Tipos de Geradores para Data Centers (4h)
Módulo 3: Dimensionamento e Seleção (4h)
Módulo 4: Manutenção e Operação (4h)
Módulo 5: Normas e Boas Práticas (4h)'),
(2, 'Introdução a Sistemas de UPS para Data Centers', '15h', 'assets/img/Introdução ao Data Center.png',
 'Domine os conceitos e práticas de sistemas de不间断电源 (UPS) para Data Centers. Aprenda a selecionar, instalar e manter sistemas de alimentação ininterrupta, garantindo a continuidade dos serviços críticos.',
 '• Princípios de funcionamento de UPS
• Tipos de topologias (online, offline, line-interactive)
• Dimensionamento e seleção de UPS
• Baterias e sistemas de backup
• Manutenção e diagnóstico de falhas
• Integração com outros sistemas de alimentação
• Normas e padrões de qualidade',
 'Com a dependência crescente de sistemas informatizados, a demanda por profissionais especializados em UPS aumentou significativamente. Data Centers, hospitais, indústrias e órgãos governamentais buscam profissionais que garantam a continuidade do fornecimento de energia.',
 '• Técnico em Manutenção de UPS
• Especialista em Sistemas de Alimentação Ininterrupta
• Analista de Confiabilidade de Energia
• Consultor em Infraestrutura Crítica
• Supervisor de Manutenção Eletrônica
• Projetista de Sistemas de Energia',
 '• Instrutores com certificação internacional
• Laboratório com equipamentos de última geração
• Simulações de cenários de falha
• Material didático exclusivo
• Certificação de conclusão
• Networking profissional',
 '• Laboratório de UPS com equipamentos de diversas potências
• Banco de baterias para testes reais
• Instrumentos de medição e diagnóstico
• Sala de aula com recursos multimídia
• Área de apoio e lanche
• Wi-Fi gratuito',
 'Coordenadora: Eng.ª Fernanda Costa
• Especialista em Sistemas de Energia
• 12 anos de experiência em Data Centers
• Consultora de empresas do setor de TI',
 '• Carga horária total: 15 horas
• Modalidade: Presencial
• Turno: Diurno
• Vagas: 15 alunos por turma
• Pré-requisitos: Ensino Médio completo
• Material incluso',
 'Módulo 1: Introdução a Sistemas de UPS (3h)
Módulo 2: Topologias e Tecnologias (3h)
Módulo 3: Dimensionamento e Seleção (3h)
Módulo 4: Manutenção e Diagnóstico (3h)
Módulo 5: Integração e Boas Práticas (3h)'),
(3, 'Fundamentos de Procedimentos Operacionais em Data Centers', '10h', 'assets/img/Relés de Proteção Elétrica.png',
 'Aprenda os procedimentos operacionais essenciais para a gestão eficiente de Data Centers. Este curso aborda desde a organização do ambiente até a implementação de processos de manutenção e atendimento a incidentes.',
 '• Procedimentos operacionais padrão (SOPs)
• Gestão de ativos e inventário
• Controle de acesso e segurança física
• Monitoramento e alertas
• Resposta a incidentes e contingência
• Comunicação eficaz em situações críticas
• Documentação e registro de atividades',
 'Data Centers são infraestruturas críticas que requerem profissionais treinados em procedimentos operacionais. A certificação neste área abre oportunidades em empresas de tecnologia, centros de dados, hospitais e qualquer organização que dependa de sistemas de TI.',
 '• Operador de Data Center
• Técnico em Infraestrutura de TI
• Analista de Operações
• Especialista em Continuidade de Negócios
• Supervisor de Operações
• Consultor em Boas Práticas de DC',
 '• Instrutores com experiência em grandes Data Centers
• Metodologia baseada em cases reais
• Certificação de conclusão
• Material didático prático
• Exercícios e simulações
• Networking com profissionais',
 '• Sala de aula equipada
• Área de simulação de operações
• Acesso a sistemas de monitoramento
• Material de apoio impresso
• Wi-Fi gratuito
• Café e lanche inclusos',
 'Coordenador: Analista Marcos Vieira
• Especialista em Operações de Data Center
• 10 anos de experiência em DCs Tier III e IV
• Certificado CDCP e CDCS',
 '• Carga horária total: 10 horas
• Modalidade: Presencial
• Turno: Diurno
• Vagas: 25 alunos por turma
• Pré-requisitos: Conhecimentos básicos de TI
• Certificado de conclusão',
 'Módulo 1: Introdução a Operações de DC (2h)
Módulo 2: Procedimentos Operacionais (2h)
Módulo 3: Gestão de Ativos (2h)
Módulo 4: Resposta a Incidentes (2h)
Módulo 5: Documentação e Melhoria Contínua (2h)')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS matriculas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ativa',
    progresso INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(aluno_id, curso_id)
);

CREATE INDEX IF NOT EXISTS idx_matriculas_aluno ON matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_curso ON matriculas(curso_id);

CREATE TABLE IF NOT EXISTS progresso_aulas (
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aula_titulo VARCHAR(255) NOT NULL,
    concluida BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (aluno_id, curso_id, aula_titulo)
);

CREATE INDEX IF NOT EXISTS idx_progresso_aluno ON progresso_aulas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_progresso_curso ON progresso_aulas(curso_id);

CREATE TABLE IF NOT EXISTS certificados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    nota_avaliacao INTEGER NOT NULL,
    data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    UNIQUE(aluno_id, curso_id)
);

CREATE INDEX IF NOT EXISTS idx_certificados_aluno ON certificados(aluno_id);
CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON certificados(codigo);

CREATE TABLE IF NOT EXISTS modulos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_modulos_curso ON modulos(curso_id);

CREATE TABLE IF NOT EXISTS aulas (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aulas_modulo ON aulas(modulo_id);
