import { API_URL, request } from './httpClient';

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

  // CAPTCHA — gera uma nova imagem de verificação (id opaco + SVG).
  getCaptcha: async () => request(`${API_URL}/auth/captcha`),

  // CAPTCHA — conclui o login pendente após a verificação antirrobô.
  verifyCaptcha: async (ticket, captchaId, texto) =>
    request(`${API_URL}/auth/verificar-captcha`, {
      method: 'POST',
      body: JSON.stringify({ ticket, captchaId, texto }),
    }),

  // Cursos
  getCursos: async () => request(`${API_URL}/cursos`),

  getCurso: async (id) => request(`${API_URL}/cursos/${id}`),

  matricular: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/matricular`, { method: 'POST' }),

  // Aluno
  getMatriculas: async () => request(`${API_URL}/cursos/aluno/matriculas`),

  getPerfil: async () => request(`${API_URL}/auth/perfil`),

  // Conteúdo do curso (player)
  getCursoConteudo: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/conteudo`),

  salvarProgresso: async (cursoId, aulas) =>
    request(`${API_URL}/cursos/${cursoId}/progresso`, {
      method: 'POST',
      body: JSON.stringify({ aulas }),
    }),

  // Avaliação final (aluno)
  getAvaliacaoStatus: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao`),

  iniciarAvaliacao: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao/iniciar`, { method: 'POST' }),

  submeterAvaliacao: async (cursoId, respostas) =>
    request(`${API_URL}/cursos/${cursoId}/avaliacao/submeter`, {
      method: 'POST',
      body: JSON.stringify({ respostas }),
    }),

  // Certificado (aluno)
  getCertificado: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/certificado`),

  emitirCertificado: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/certificado`, { method: 'POST' }),

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

  getAdminCertificados: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const url = params
      ? `${API_URL}/admin/certificados?${params}`
      : `${API_URL}/admin/certificados`;
    return request(url);
  },

  deleteAdminCertificado: async (id) =>
    request(`${API_URL}/admin/certificados/${id}`, { method: 'DELETE' }),
};
