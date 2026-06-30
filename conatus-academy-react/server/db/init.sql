-- Schema inicial do Conatus Academy
-- Executado automaticamente pelo PostgreSQL na primeira inicialização do container

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'aluno',
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    descricao_curta VARCHAR(300),
    image VARCHAR(500),
    duracao VARCHAR(50),
    categoria VARCHAR(100),
    nivel VARCHAR(20) DEFAULT 'basico',
    tipo VARCHAR(20) DEFAULT 'gratuito',
    status VARCHAR(20) DEFAULT 'rascunho',
    visivel BOOLEAN DEFAULT true,
    publico_alvo TEXT,
    objetivo TEXT,
    requisitos TEXT,
    requisitos_certificado TEXT,
    cert_responsavel VARCHAR(255),
    cert_texto TEXT,
    cert_assinatura TEXT,
    oque_aprender TEXT,
    mercado_trabalho TEXT,
    areas_atuacao TEXT,
    diferenciais TEXT,
    infraestrutura TEXT,
    coordenacao TEXT,
    informacoes_complementares TEXT,
    matriz_curricular TEXT,
    instrutor_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cursos_instrutor ON cursos(instrutor_id);

CREATE TABLE IF NOT EXISTS modulos (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS aulas (
    id SERIAL PRIMARY KEY,
    modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    descricao TEXT,
    tipo_conteudo VARCHAR(20) DEFAULT 'texto',
    video_url VARCHAR(500),
    material_url VARCHAR(500),
    duracao_minutos INTEGER,
    obrigatoria BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matriculas (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ativa',
    progresso INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (aluno_id, curso_id)
);

CREATE TABLE IF NOT EXISTS progresso_aulas (
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aula_titulo VARCHAR(500) NOT NULL,
    concluida BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (aluno_id, curso_id, aula_titulo)
);

CREATE TABLE IF NOT EXISTS certificados (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    nota_avaliacao INTEGER DEFAULT 100,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
