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

  // Cursos
  getCursos: async () => request(`${API_URL}/cursos`),

  getCurso: async (id) => request(`${API_URL}/cursos/${id}`),

  matricular: async (cursoId) =>
    request(`${API_URL}/cursos/${cursoId}/matricular`, { method: 'POST' }),

  // Aluno
  getMatriculas: async () => request(`${API_URL}/cursos/aluno/matriculas`),

  getPerfil: async () => request(`${API_URL}/auth/perfil`),

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
