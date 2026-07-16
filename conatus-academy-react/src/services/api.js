import { API_URL, request, requestBlob, requestForm } from './httpClient';

export const api = {
  // Auth
  login: async (email, senha) => {
    return request(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  },

  register: async (userData) => {
    return request(`${API_URL}/auth/cadastrar`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Confirmação de e-mail — valida o token recebido no link enviado por e-mail.
  verificarEmail: async (token) =>
    request(`${API_URL}/auth/verificar-email`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // Reenvia o link de confirmação de e-mail para um cadastro pendente.
  reenviarVerificacao: async (email) =>
    request(`${API_URL}/auth/reenviar-verificacao`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Esqueci a senha — solicita o e-mail com o link de redefinição.
  esqueciSenha: async (email) =>
    request(`${API_URL}/auth/esqueci-senha`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  // Redefinição de senha — define a nova senha a partir do token do link.
  redefinirSenha: async (token, senha) =>
    request(`${API_URL}/auth/redefinir-senha`, {
      method: 'POST',
      body: JSON.stringify({ token, senha }),
    }),

  // CAPTCHA — gera uma nova imagem de verificação (id opaco + SVG).
  getCaptcha: async () => request(`${API_URL}/auth/captcha`),

  // CAPTCHA — conclui o login pendente após a verificação antirrobô.
  verifyCaptcha: async (ticket, captchaId, texto) =>
    request(`${API_URL}/auth/verificar-captcha`, {
      method: 'POST',
      body: JSON.stringify({ ticket, captchaId, texto }),
    }),

  // Notícias do setor (feeds RSS de portais de data center, via backend)
  getNoticias: async () => request(`${API_URL}/noticias`),

  // Simulações (vídeos) — página exclusiva para alunos logados.
  getSimulacoes: async () => request(`${API_URL}/simulacoes`),

  // Suporte — chamados do próprio aluno. O detalhe e a resposta usam a mesma
  // rota do admin: o servidor confere a posse do chamado e filtra as
  // observações internas.
  getMeusChamados: async () => request(`${API_URL}/suporte/meus`),

  // Quantos chamados já foram respondidos e aguardam o aluno (badge do menu).
  getChamadosAguardando: async () => request(`${API_URL}/suporte/meus/aguardando`),

  // Sempre multipart: a rota aceita os dois formatos, e mandar um só simplifica
  // o front (não precisa decidir conforme ter ou não anexo).
  abrirChamado: async (data, anexos = []) => {
    const fd = new FormData();
    fd.append('assunto', data.assunto);
    fd.append('categoria', data.categoria);
    fd.append('mensagem', data.mensagem);
    anexos.forEach(f => fd.append('anexos', f));
    return requestForm(`${API_URL}/suporte`, fd);
  },

  getChamado: async (id) => request(`${API_URL}/suporte/${id}`),

  responderChamado: async (id, mensagem, anexos = []) => {
    const fd = new FormData();
    fd.append('mensagem', mensagem);
    anexos.forEach(f => fd.append('anexos', f));
    return requestForm(`${API_URL}/suporte/${id}/mensagens`, fd);
  },

  // Um <a href> não serve: a rota exige Authorization e a tag não o envia.
  // Buscamos o blob e disparamos o download por um link temporário.
  baixarAnexo: async (anexoId, nome) => {
    const blob = await requestBlob(`${API_URL}/suporte/anexos/${anexoId}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome || 'anexo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Cursos
  getCursos: async () => request(`${API_URL}/cursos`),

  getCurso: async (id) => request(`${API_URL}/cursos/${id}`),

  matricular: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/matricular`, { method: 'POST' }),

  // Aluno
  getMatriculas: async () => request(`${API_URL}/cursos/aluno/matriculas`),

  getCertificadosAluno: async () => request(`${API_URL}/cursos/aluno/certificados`),

  getPerfil: async () => request(`${API_URL}/auth/perfil`),

  updatePerfil: async (data) =>
    request(`${API_URL}/auth/perfil`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Troca de senha pelo usuário logado (exige a senha atual).
  alterarSenha: async (senhaAtual, novaSenha) =>
    request(`${API_URL}/auth/perfil/senha`, {
      method: 'PUT',
      body: JSON.stringify({ senhaAtual, novaSenha }),
    }),

  // Conteúdo do curso (player)
  getCursoConteudo: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/conteudo`),

  salvarProgresso: async (cursoId, aulas) =>
    request(`${API_URL}/cursos/${cursoId}/progresso`, {
      method: 'POST',
      body: JSON.stringify({ aulas }),
    }),

  // Áudio de um trecho narrado (voz do ElevenLabs, gravada ao salvar a aula).
  // Vem como blob porque a rota é protegida — ver httpClient.requestBlob.
  getNarracaoAudio: async (cursoId, aulaId, ordem) =>
    requestBlob(`${API_URL}/cursos/${cursoId}/aulas/${aulaId}/narracao/${ordem}/audio`),

  // Assistente RAG: tira dúvidas do aluno com base no conteúdo do curso.
  perguntarAssistente: async (cursoId, pergunta) =>
    request(`${API_URL}/cursos/${cursoId}/assistente`, {
      method: 'POST',
      body: JSON.stringify({ pergunta }),
    }),

  // Avaliação final (aluno)
  getAvaliacaoStatus: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao`),

  iniciarAvaliacao: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao/iniciar`, { method: 'POST' }),

  submeterAvaliacao: async (cursoId, respostas, ordens) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao/submeter`, {
      method: 'POST',
      body: JSON.stringify({ respostas, ordens }),
    }),

  // Revisão persistida: recompõe a correção da última tentativa do aluno.
  getRevisaoUltimaTentativa: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao/ultima-tentativa`),

  // Certificado (aluno)
  getCertificado: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/certificado`),

  emitirCertificado: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/certificado`, { method: 'POST' }),

  // Verificação pública de autenticidade por código (sem login).
  validarCertificado: async (codigo) =>
    request(`${API_URL}/certificados/validar/${encodeURIComponent(codigo)}`),

  // Admin
  getAdminDashboard: async () => request(`${API_URL}/admin/dashboard`),

  getAdminAlunos: async (busca = '') => {
    const url = busca
      ? `${API_URL}/admin/alunos?busca=${encodeURIComponent(busca)}`
      : `${API_URL}/admin/alunos`;
    return request(url);
  },

  getAdminAluno: async (id) => request(`${API_URL}/admin/alunos/${id}`),

  updateAdminAluno: async (id, data) =>
    request(`${API_URL}/admin/alunos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAdminAluno: async (id) =>
    request(`${API_URL}/admin/alunos/${id}`, { method: 'DELETE' }),

  getAdminCursos: async () => request(`${API_URL}/admin/cursos`),

  getAdminCurso: async (id) => request(`${API_URL}/admin/cursos/${id}`),

  createAdminCurso: async (data) =>
    request(`${API_URL}/admin/cursos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAdminCurso: async (id, data) =>
    request(`${API_URL}/admin/cursos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAdminCurso: async (id) =>
    request(`${API_URL}/admin/cursos/${id}`, { method: 'DELETE' }),

  getAdminCursoMatriculados: async (id) =>
    request(`${API_URL}/admin/cursos/${id}/matriculados`),

  getAdminInstrutores: async () => request(`${API_URL}/admin/instrutores`),

  getAdminCertificados: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const url = params
      ? `${API_URL}/admin/certificados?${params}`
      : `${API_URL}/admin/certificados`;
    return request(url);
  },

  deleteAdminCertificado: async (id) =>
    request(`${API_URL}/admin/certificados/${id}`, { method: 'DELETE' }),

  // Validação de certificado pelo painel admin (envia o token de autenticação).
  validarAdminCertificado: async (codigo) =>
    request(`${API_URL}/admin/certificados/validar/${encodeURIComponent(codigo)}`),
};
