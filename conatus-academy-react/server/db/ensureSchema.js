/**
 * Garante que o schema do construtor de cursos exista.
 * Executado no boot do servidor — todas as instruções são idempotentes,
 * espelhando db/migration-curso-builder.sql.
 */
const pool = require('./connection');

const STATEMENTS = [
  // cursos — novos campos
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS descricao_curta VARCHAR(300)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS categoria VARCHAR(100)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) DEFAULT 'basico'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'gratuito'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'rascunho'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS visivel BOOLEAN DEFAULT true`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS publico_alvo TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS objetivo TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS requisitos TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS requisitos_certificado TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_responsavel VARCHAR(255)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_texto TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS cert_assinatura TEXT`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // perfil instrutor — instrutor_id em cursos (db/migration-instrutor.sql)
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS instrutor_id UUID REFERENCES alunos(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_cursos_instrutor ON cursos(instrutor_id)`,
  // seeds existentes ficam publicados
  `UPDATE cursos SET status = 'publicado' WHERE status = 'rascunho' AND id IN (1, 2, 3)`,
  // aulas — novos campos
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS descricao TEXT`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS tipo_conteudo VARCHAR(20) DEFAULT 'texto'`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS video_url VARCHAR(500)`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS material_url VARCHAR(500)`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER`,
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN DEFAULT true`,
  // updated_at em aulas — sem ela o UPDATE de edição de aula dá erro 500
  // (db/migration-aulas-updated-at.sql)
  `ALTER TABLE aulas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // updated_at em alunos — sem ela o UPDATE de edição de aluno (admin) dá erro 500
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // empresa (texto livre, opcional) — informada pelo aluno no cadastro; é o
  // empregador declarado, NÃO confundir com empresa_id (vínculo com empresa
  // parceira usado no controle de acesso a cursos).
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS empresa VARCHAR(150)`,
  // cargo (texto livre) — informado pelo aluno no cadastro (função/posição
  // que ocupa na empresa declarada). Nasce NULL para contas já existentes.
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cargo VARCHAR(120)`,
  // updated_at em matriculas — sem ela o salvar progresso (recalcularProgresso) dá erro 500
  `ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  // avaliação (config por curso)
  `CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER UNIQUE NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    num_questoes INTEGER NOT NULL DEFAULT 10,
    nota_minima INTEGER NOT NULL DEFAULT 80,
    max_tentativas INTEGER NOT NULL DEFAULT 3,
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // questões
  `CREATE TABLE IF NOT EXISTS questoes (
    id SERIAL PRIMARY KEY,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    alternativas JSONB NOT NULL,
    correta INTEGER NOT NULL,
    explicacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_questoes_curso ON questoes(curso_id)`,
  // tentativas
  `CREATE TABLE IF NOT EXISTS tentativas_avaliacao (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    nota INTEGER NOT NULL,
    aprovado BOOLEAN NOT NULL DEFAULT false,
    respostas JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tentativas_aluno_curso ON tentativas_avaliacao(aluno_id, curso_id)`,
  // ordem de exibição das alternativas por questão na tentativa (embaralhamento):
  // { questaoId: [origIdx por posição] } — usada para a revisão mostrar a mesma
  // ordem que o aluno viu. Nulo em tentativas antigas (cai na ordem canônica).
  `ALTER TABLE tentativas_avaliacao ADD COLUMN IF NOT EXISTS ordens JSONB`,
  // autorizações de cursos internos
  `CREATE TABLE IF NOT EXISTS curso_autorizacoes (
    curso_id INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (curso_id, aluno_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_autorizacoes_aluno ON curso_autorizacoes(aluno_id)`,

  // ── Controle de acesso a cursos (público / restrito / pago) ─────────────────
  // Substitui o antigo conceito de "tipo" (gratuito/interno/pago) por um modelo
  // escalável: modo de acesso no curso + regras cumulativas (funcionários,
  // empresas parceiras, usuários específicos). Ver server/src/services/accessControl.js.

  // Fabricantes / empresas parceiras (sem ENUM — cadastráveis em runtime)
  `CREATE TABLE IF NOT EXISTS empresas (
    id     SERIAL PRIMARY KEY,
    nome   VARCHAR(120) NOT NULL,
    slug   VARCHAR(60) UNIQUE NOT NULL,
    ativo  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  // vínculo usuário → empresa (um aluno pode pertencer a um fabricante parceiro)
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_alunos_empresa ON alunos(empresa_id)`,
  // modo de acesso do curso — 'publico' | 'restrito' | 'pago'
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS acesso VARCHAR(20) DEFAULT 'publico'`,
  // regras de liberação (heterogêneas; discriminador = tipo)
  `CREATE TABLE IF NOT EXISTS curso_acesso_regras (
    id         SERIAL PRIMARY KEY,
    curso_id   INTEGER NOT NULL REFERENCES cursos(id)   ON DELETE CASCADE,
    tipo       VARCHAR(20) NOT NULL,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    aluno_id   UUID    REFERENCES alunos(id)   ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT regra_coerente CHECK (
      (tipo = 'funcionarios' AND empresa_id IS NULL AND aluno_id IS NULL) OR
      (tipo = 'empresa'      AND empresa_id IS NOT NULL AND aluno_id IS NULL) OR
      (tipo = 'usuario'      AND aluno_id  IS NOT NULL AND empresa_id IS NULL)
    )
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_regra_func    ON curso_acesso_regras(curso_id)             WHERE tipo = 'funcionarios'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_regra_empresa ON curso_acesso_regras(curso_id, empresa_id) WHERE tipo = 'empresa'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_regra_usuario ON curso_acesso_regras(curso_id, aluno_id)   WHERE tipo = 'usuario'`,
  `CREATE INDEX IF NOT EXISTS idx_regras_curso ON curso_acesso_regras(curso_id)`,

  // ── Venda de cursos pagos (acesso = 'pago') ────────────────────────────────
  // Infraestrutura de comercialização SEM gateway: os campos de precificação
  // vivem no curso e a posse (compra aprovada) em curso_compras. A integração
  // de pagamento futura (Stripe/Mercado Pago/Asaas/PagSeguro/PayPal) só
  // preenche curso_compras — ver server/src/services/payments/.
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS preco NUMERIC(10,2)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS preco_promocional NUMERIC(10,2)`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS moeda VARCHAR(3) NOT NULL DEFAULT 'BRL'`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS max_parcelas INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS permite_cupom BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS mensagem_compra TEXT`,
  // a_venda = "disponível para compra": um curso pago pode existir sem estar
  // à venda (ex.: em preparação) — aí ele some do catálogo para quem não o tem.
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS a_venda BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS ocultar_preco BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE cursos ADD COLUMN IF NOT EXISTS destaque_promocao BOOLEAN NOT NULL DEFAULT false`,

  // Compras: fonte da posse de cursos pagos. Só status 'aprovada' dá acesso
  // (accessControl.js). gateway/gateway_ref identificam a transação externa.
  `CREATE TABLE IF NOT EXISTS curso_compras (
    id          SERIAL PRIMARY KEY,
    curso_id    INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    aluno_id    UUID    NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pendente',
    valor       NUMERIC(10,2),
    moeda       VARCHAR(3) NOT NULL DEFAULT 'BRL',
    parcelas    INTEGER NOT NULL DEFAULT 1,
    cupom       VARCHAR(60),
    gateway     VARCHAR(30),
    gateway_ref VARCHAR(120),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT compra_status_valido CHECK (
      status IN ('pendente', 'aprovada', 'recusada', 'cancelada', 'reembolsada')
    )
  )`,
  // no máximo UMA compra aprovada por aluno/curso
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_compra_aprovada
     ON curso_compras(curso_id, aluno_id) WHERE status = 'aprovada'`,
  `CREATE INDEX IF NOT EXISTS idx_compras_aluno ON curso_compras(aluno_id)`,

  // ── "Tenho interesse" em cursos que serão lançados (status = 'em_breve') ────
  // Mede a demanda por um curso ainda não publicado. UMA manifestação por
  // aluno/curso (o UNIQUE evita contar a mesma pessoa duas vezes). O status
  // 'em_breve' do curso é apenas texto na coluna cursos.status (sem ENUM).
  `CREATE TABLE IF NOT EXISTS curso_interesses (
    id         SERIAL PRIMARY KEY,
    curso_id   INTEGER NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
    aluno_id   UUID    NOT NULL REFERENCES alunos(id)  ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (curso_id, aluno_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_interesses_curso ON curso_interesses(curso_id)`,

  // Seed dos fabricantes parceiros. O slug é o identificador interno e não muda
  // (agrupa cursos por fabricante); só o nome exibido pode ser reeditado — ex.:
  // o parceiro de slug 'huawei' é exibido como "Soluções WDC".
  `INSERT INTO empresas (nome, slug) VALUES
     ('Soluções WDC','huawei'),('Vertiv','vertiv'),('Schneider','schneider'),
     ('Delta','delta'),('Cummins','cummins')
   ON CONFLICT (slug) DO NOTHING`,

  // Migração retrocompatível 'tipo' (legado) → 'acesso' + regras.
  // É ONE-SHOT: guardada por uma flag para nunca reprocessar em boots futuros
  // (assim edições posteriores de acesso/tipo jamais são revertidas).
  //   gratuito → publico | interno → restrito + regra 'funcionarios' | pago → pago
  `CREATE TABLE IF NOT EXISTS schema_flags (
    chave VARCHAR(60) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `UPDATE cursos SET acesso = 'restrito'
    WHERE tipo = 'interno' AND acesso = 'publico'
      AND NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')`,
  `UPDATE cursos SET acesso = 'pago'
    WHERE tipo = 'pago' AND acesso = 'publico'
      AND NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')`,
  `INSERT INTO curso_acesso_regras (curso_id, tipo)
   SELECT id, 'funcionarios' FROM cursos
    WHERE tipo = 'interno'
      AND NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')
   ON CONFLICT DO NOTHING`,
  `INSERT INTO curso_acesso_regras (curso_id, tipo, aluno_id)
   SELECT curso_id, 'usuario', aluno_id FROM curso_autorizacoes
    WHERE NOT EXISTS (SELECT 1 FROM schema_flags WHERE chave = 'acesso_migrado')
   ON CONFLICT DO NOTHING`,
  `INSERT INTO schema_flags (chave) VALUES ('acesso_migrado') ON CONFLICT DO NOTHING`,
  // admin@conatus.com é o superadmin: único perfil que pode alterar cargos
  `UPDATE alunos SET role = 'superadmin' WHERE email = 'admin@conatus.com' AND role != 'superadmin'`,
  // Diretor — topo absoluto da hierarquia, acima do superadmin. Exclusivo do
  // Giovanni Henrique da Silva, fixado por e-mail e reaplicado a cada boot.
  // Aplica-se assim que a conta com esse e-mail existir.
  `UPDATE alunos SET role = 'diretor' WHERE email = 'giovanni.silva@conatusprocedures.com' AND role != 'diretor'`,
  // verificação de e-mail no cadastro.
  // A coluna nasce com DEFAULT true para que contas JÁ existentes não sejam
  // bloqueadas; em seguida o default vira false, de modo que apenas novos
  // cadastros (feitos pela aplicação) comecem como "não verificados".
  `ALTER TABLE alunos ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE alunos ALTER COLUMN email_verificado SET DEFAULT false`,
  // tokens de confirmação de e-mail (apenas o hash é armazenado)
  `CREATE TABLE IF NOT EXISTS email_verificacoes (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_verif_hash ON email_verificacoes(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_email_verif_aluno ON email_verificacoes(aluno_id)`,
  // tokens de redefinição de senha (apenas o hash é armazenado)
  `CREATE TABLE IF NOT EXISTS senha_resets (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_senha_reset_hash ON senha_resets(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_senha_reset_aluno ON senha_resets(aluno_id)`,
  // histórico de senhas (hashes) para impedir reutilização das últimas senhas
  `CREATE TABLE IF NOT EXISTS senha_historico (
    id SERIAL PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_senha_hist_aluno ON senha_historico(aluno_id)`,
  // data de emissão dos certificados (db/migration-certificados-data-emissao.sql)
  `ALTER TABLE certificados ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
  `UPDATE certificados SET data_emissao = created_at WHERE data_emissao IS NULL`,
  // imagens enviadas pelo construtor de cursos (capas, imagens de aula, assinatura).
  // Ficam no banco — e não no disco — porque o filesystem do Replit é efêmero e
  // não é compartilhado com o ambiente local: um arquivo salvo em disco num
  // ambiente aparecia "quebrado" no outro. O nome carrega timestamp (imutável),
  // o que permite cache agressivo na rota que serve esses arquivos.
  `CREATE TABLE IF NOT EXISTS arquivos_upload (
    nome VARCHAR(255) PRIMARY KEY,
    mime VARCHAR(60) NOT NULL,
    dados BYTEA NOT NULL,
    tamanho INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // ── Assistente RAG (busca semântica sobre o conteúdo das aulas) ─────────────
  // pgvector no Supabase (extensão no schema public — verificado). Cada aula é
  // quebrada em pedaços de texto; o assistente busca os trechos mais próximos
  // da pergunta, escopados por curso. Ver server/src/services/ragIndex.js.
  // A dimensão 768 casa com outputDimensionality do gemini-embedding-001 e fica
  // dentro do limite de índice do pgvector (~2000).
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS aula_chunks (
    id SERIAL PRIMARY KEY,
    aula_id   INTEGER NOT NULL REFERENCES aulas(id)  ON DELETE CASCADE,
    curso_id  INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    ordem     INTEGER NOT NULL,
    texto     TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_aula_chunks_curso ON aula_chunks(curso_id)`,
  `CREATE INDEX IF NOT EXISTS idx_aula_chunks_aula ON aula_chunks(aula_id)`,
  `CREATE INDEX IF NOT EXISTS idx_aula_chunks_vec
     ON aula_chunks USING hnsw (embedding vector_cosine_ops)`,

  // ── Narração dos blocos marcados com 📢 ────────────────────────────────────
  // Cada bloco do conteúdo da aula que contém o megafone vira um roteiro falado,
  // reescrito por LLM ao salvar a aula, e o roteiro vira áudio sintetizado
  // (ver services/narracao.js e services/tts/).
  // origem_hash é o hash do texto do bloco — se o instrutor não mexeu naquele
  // bloco, não regeramos o roteiro (economiza chamada de LLM a cada salvamento).
  `CREATE TABLE IF NOT EXISTS aula_narracoes (
    id SERIAL PRIMARY KEY,
    aula_id     INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    ordem       INTEGER NOT NULL,
    origem_hash VARCHAR(64) NOT NULL,
    texto_origem TEXT NOT NULL,
    roteiro     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (aula_id, ordem)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_aula_narracoes_aula ON aula_narracoes(aula_id)`,
  // src da imagem do megafone que dispara este trecho. É por ele que o player
  // acha o <img> no HTML já renderizado e o transforma em botão de ouvir.
  `ALTER TABLE aula_narracoes ADD COLUMN IF NOT EXISTS img_src TEXT`,

  // Áudio do roteiro (MP3). Fica no banco (bytea), como os uploads de imagem: o
  // disco do Replit é efêmero e não é compartilhado, e um áudio perdido no
  // redeploy significa aula que o aluno não consegue concluir.
  // audio_voz guarda "provedor:modelo:voz:formato" — trocar qualquer um deles no
  // .env invalida os áudios gravados, e eles são refeitos no próximo salvamento
  // da aula (ou de uma vez, por scripts/gerarAudioNarracoes.js).
  // Sem provedor de voz configurado as três colunas ficam nulas e o player cai na
  // voz do navegador, que era como a narração funcionava antes.
  `ALTER TABLE aula_narracoes ADD COLUMN IF NOT EXISTS audio BYTEA`,
  `ALTER TABLE aula_narracoes ADD COLUMN IF NOT EXISTS audio_mime TEXT`,
  `ALTER TABLE aula_narracoes ADD COLUMN IF NOT EXISTS audio_voz TEXT`,

  // ── Vídeos das Simulações Aplicadas a Data Centers ─────────────────────────
  // Página exclusiva para alunos logados (/simulacoes). O admin cadastra os
  // vídeos aqui, agrupados em três eixos (tema): 'falhas' | 'operacoes' |
  // 'manutencoes'. video_url guarda o link do YouTube/Vimeo ou o endereço direto
  // de um arquivo .mp4 — o player do front se adapta. 'ordem' controla a
  // exibição dentro de cada eixo.
  `CREATE TABLE IF NOT EXISTS simulacoes (
    id SERIAL PRIMARY KEY,
    tema VARCHAR(20) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_simulacoes_tema ON simulacoes(tema)`,

  // ── Suporte: chamados entre alunos e administradores ───────────────────────
  // O aluno abre um chamado e a conversa acontece em ticket_messages. Os valores
  // de status/categoria/prioridade são validados por CHECK aqui e espelhados no
  // front em src/utils/suporte.js — mantenha os dois em sincronia.
  //
  // status:
  //   aberto           → recém-criado, ninguém assumiu
  //   em_atendimento   → um admin assumiu e está tratando
  //   aguardando_aluno → admin respondeu e espera retorno do aluno
  //   resolvido        → solucionado (o aluno ainda pode reabrir respondendo)
  //   fechado          → encerrado; não aceita mais mensagens
  //
  // responsavel_id é o admin que atende. ON DELETE SET NULL: se a conta do
  // atendente sair, o chamado continua existindo, apenas sem responsável.
  // Já user_id é ON DELETE CASCADE — sem o aluno, o chamado perde o sentido.
  `CREATE TABLE IF NOT EXISTS tickets (
    id             SERIAL PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    assunto        VARCHAR(200) NOT NULL,
    categoria      VARCHAR(30)  NOT NULL DEFAULT 'duvida',
    prioridade     VARCHAR(20)  NOT NULL DEFAULT 'media',
    status         VARCHAR(30)  NOT NULL DEFAULT 'aberto',
    responsavel_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    observacao_interna TEXT,
    criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ticket_status_valido CHECK (
      status IN ('aberto','em_atendimento','aguardando_aluno','resolvido','fechado')
    ),
    CONSTRAINT ticket_prioridade_valida CHECK (
      prioridade IN ('baixa','media','alta','urgente')
    ),
    CONSTRAINT ticket_categoria_valida CHECK (
      categoria IN ('duvida','problema_tecnico','pagamento','certificados','matriculas','outros')
    )
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_user   ON tickets(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`,
  // A listagem do admin ordena por atualizado_em (mais recentes/antigos).
  `CREATE INDEX IF NOT EXISTS idx_tickets_atualizado ON tickets(atualizado_em DESC)`,

  // Mensagens da conversa. autor_tipo distingue os lados do chat sem depender do
  // papel ATUAL de quem escreveu: se o aluno virar admin depois, as mensagens
  // antigas dele continuam do lado do aluno.
  // interna = observação visível apenas para a equipe (nunca vai ao aluno).
  `CREATE TABLE IF NOT EXISTS ticket_messages (
    id         SERIAL PRIMARY KEY,
    ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id    UUID REFERENCES alunos(id) ON DELETE SET NULL,
    autor_tipo VARCHAR(10) NOT NULL DEFAULT 'aluno',
    mensagem   TEXT NOT NULL,
    interna    BOOLEAN NOT NULL DEFAULT false,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT msg_autor_valido CHECK (autor_tipo IN ('aluno','admin'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON ticket_messages(ticket_id, criado_em)`,

  // Anexos de uma mensagem. Os BYTES não ficam aqui: vão para arquivos_upload
  // (mesma razão dos uploads de curso — o disco do Replit é efêmero), e
  // `arquivo` guarda a chave lá. Esta tabela é só o metadado + o nome original,
  // que é o que o aluno vê ao baixar.
  //
  // ATENÇÃO: diferente de /api/uploads/courses/:nome, que é público, o download
  // de anexo passa por /api/suporte/anexos/:id COM verificação de posse — um
  // anexo de chamado pode conter dado pessoal (print de pagamento, documento).
  // Vídeo está fora dos tipos aceitos de propósito: o free tier do Supabase é
  // 500 MB e poucos vídeos em bytea comprometeriam a plataforma inteira.
  `CREATE TABLE IF NOT EXISTS ticket_attachments (
    id         SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
    arquivo    VARCHAR(255) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    tipo       VARCHAR(100) NOT NULL,
    tamanho    INTEGER NOT NULL,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ticket_anexos_msg ON ticket_attachments(message_id)`,

  // Log de ações da equipe sobre o chamado (histórico de alterações).
  // ator_id é ON DELETE SET NULL: o registro do que aconteceu sobrevive à saída
  // do funcionário — um log que some junto com a conta não serve como log.
  // valor_de/valor_para são texto livre para caber qualquer campo (status,
  // prioridade, responsável) sem uma coluna por tipo de mudança.
  `CREATE TABLE IF NOT EXISTS ticket_eventos (
    id         SERIAL PRIMARY KEY,
    ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    ator_id    UUID REFERENCES alunos(id) ON DELETE SET NULL,
    ator_nome  VARCHAR(150),
    acao       VARCHAR(40) NOT NULL,
    valor_de   TEXT,
    valor_para TEXT,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ticket_eventos_ticket ON ticket_eventos(ticket_id, criado_em)`,

  // ── Chamados abertos por visitante (sem conta) ─────────────────────────────
  // Quem não tem login também abre chamado. Nesse caso não há aluno para
  // apontar, então user_id passa a aceitar NULL e a identificação vem de
  // visitante_nome/visitante_email.
  //
  // ATENÇÃO: com user_id nulável, todo `JOIN alunos` em consultas de ticket
  // precisa virar LEFT JOIN — um INNER JOIN faria os chamados de visitante
  // sumirem silenciosamente da listagem do admin.
  `ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS visitante_nome  VARCHAR(150)`,
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS visitante_email VARCHAR(255)`,

  // Link mágico: é o que permite ao visitante voltar e ler a resposta sem
  // conta. Guardamos só o HASH do token — igual a email_verificacoes e
  // senha_resets. Vazando o banco, ninguém abre as conversas.
  // Não expira de propósito: é o único acesso do visitante ao chamado dele, e
  // um link morto o deixaria sem resposta e sem recurso.
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS acesso_token_hash VARCHAR(64)`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_acesso_token ON tickets(acesso_token_hash)`,

  // Todo chamado tem dono: ou uma conta, ou um visitante identificado.
  // Sem esta regra, um bug poderia gravar chamado órfão — sem ninguém para
  // responder e sem ninguém para ler.
  `ALTER TABLE tickets DROP CONSTRAINT IF EXISTS ticket_tem_dono`,
  `ALTER TABLE tickets ADD CONSTRAINT ticket_tem_dono CHECK (
     user_id IS NOT NULL
     OR (visitante_nome IS NOT NULL AND visitante_email IS NOT NULL AND acesso_token_hash IS NOT NULL)
   )`,

  // ── Fechamento automático 24h após a resolução ─────────────────────────────
  // Quando marcamos "resolvido", o aluno ainda tem 24h para voltar e responder
  // (o que reabre o chamado). Passado o prazo sem retorno, ele fecha sozinho.
  //
  // O prazo NÃO pode contar de atualizado_em: essa coluna muda a cada alteração,
  // então editar a observação interna de um chamado resolvido reiniciaria o
  // relógio sem que ninguém tivesse pedido. Daí uma marca própria.
  `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolvido_em TIMESTAMP`,
  `CREATE INDEX IF NOT EXISTS idx_tickets_resolvido_em ON tickets(resolvido_em)
     WHERE status = 'resolvido'`,

  // A marca é mantida por TRIGGER, e não pelas rotas, porque o status muda em
  // vários caminhos (alteração rápida, resposta do admin, resposta do aluno,
  // resposta do visitante) e ainda pode mudar por SQL manual no Supabase.
  // Espalhar a regra por todos eles é como esquecê-la em um.
  `CREATE OR REPLACE FUNCTION marcar_resolucao_ticket() RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.status = 'resolvido' AND OLD.status IS DISTINCT FROM 'resolvido' THEN
       -- Entrou em resolvido agora: começa a contagem.
       NEW.resolvido_em := CURRENT_TIMESTAMP;
     ELSIF NEW.status <> 'resolvido' THEN
       -- Saiu de resolvido (reaberto pelo aluno, ou fechado): o prazo perde o
       -- sentido e a marca sai junto, senão um chamado reaberto e resolvido de
       -- novo herdaria o relógio antigo e fecharia cedo demais.
       NEW.resolvido_em := NULL;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_marcar_resolucao ON tickets`,
  `CREATE TRIGGER trg_marcar_resolucao
     BEFORE UPDATE ON tickets
     FOR EACH ROW EXECUTE FUNCTION marcar_resolucao_ticket()`,

  // Chamados que já estavam resolvidos antes do trigger existir não têm a marca
  // e nunca fechariam. atualizado_em é a melhor aproximação disponível do
  // momento em que foram resolvidos. Só toca em quem está sem a marca, então é
  // seguro rodar a cada boot.
  `UPDATE tickets SET resolvido_em = atualizado_em
    WHERE status = 'resolvido' AND resolvido_em IS NULL`,
];

async function ensureSchema() {
  for (const sql of STATEMENTS) {
    await pool.query(sql);
  }
  console.log('Schema do construtor de cursos verificado/atualizado.');
}

module.exports = ensureSchema;
