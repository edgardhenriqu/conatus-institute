import { API_URL, request } from './httpClient';

export const adminApi = {
  // ----- Upload de imagem (capa de curso) -----
  // Envia um arquivo via multipart/form-data. NÃO definimos Content-Type
  // manualmente — o navegador adiciona o boundary do multipart sozinho.
  uploadCourseImage: async (file) => {
    const formData = new FormData();
    formData.append('imagem', file);
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_URL}/admin/upload/imagem`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.erro || `Erro ${res.status}`);
    }
    return res.json();
  },

  // ----- Cursos (ações do construtor) -----
  setCourseStatus: async (courseId, status) =>
    request(`${API_URL}/admin/cursos/${courseId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  duplicateCourse: async (courseId) =>
    request(`${API_URL}/admin/cursos/${courseId}/duplicar`, { method: 'POST' }),

  getCourseStudents: async (courseId) =>
    request(`${API_URL}/admin/cursos/${courseId}/matriculados`),

  unenrollStudent: async (courseId, alunoId) =>
    request(`${API_URL}/admin/cursos/${courseId}/matriculados/${alunoId}`, {
      method: 'DELETE',
    }),

  // ----- Avaliação (config) -----
  getQuizConfig: async (courseId) =>
    request(`${API_URL}/admin/cursos/${courseId}/avaliacao`),

  saveQuizConfig: async (courseId, data) =>
    request(`${API_URL}/admin/cursos/${courseId}/avaliacao`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ----- Questões -----
  getQuestions: async (courseId) =>
    request(`${API_URL}/admin/cursos/${courseId}/questoes`),

  createQuestion: async (courseId, data) =>
    request(`${API_URL}/admin/cursos/${courseId}/questoes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuestion: async (questionId, data) =>
    request(`${API_URL}/admin/questoes/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteQuestion: async (questionId) =>
    request(`${API_URL}/admin/questoes/${questionId}`, { method: 'DELETE' }),

  // ----- Empresas parceiras (fabricantes) -----
  getCompanies: async () =>
    request(`${API_URL}/admin/empresas`),

  createCompany: async (nome) =>
    request(`${API_URL}/admin/empresas`, {
      method: 'POST',
      body: JSON.stringify({ nome }),
    }),

  deleteCompany: async (empresaId) =>
    request(`${API_URL}/admin/empresas/${empresaId}`, { method: 'DELETE' }),

  // ----- Simulações (vídeos) -----
  getSimulacoes: async () =>
    request(`${API_URL}/simulacoes`),

  createSimulacao: async (data) =>
    request(`${API_URL}/simulacoes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSimulacao: async (id, data) =>
    request(`${API_URL}/simulacoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSimulacao: async (id) =>
    request(`${API_URL}/simulacoes/${id}`, { method: 'DELETE' }),

  // ----- Controle de acesso do curso (modo + regras) -----
  getCourseAccess: async (courseId) =>
    request(`${API_URL}/admin/cursos/${courseId}/acesso`),

  saveCourseAccess: async (courseId, data) =>
    request(`${API_URL}/admin/cursos/${courseId}/acesso`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addCourseUser: async (courseId, email) =>
    request(`${API_URL}/admin/cursos/${courseId}/acesso/usuarios`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeCourseUser: async (courseId, alunoId) =>
    request(`${API_URL}/admin/cursos/${courseId}/acesso/usuarios/${alunoId}`, {
      method: 'DELETE',
    }),

  // ----- Modules -----
  getModules: async (courseId) =>
    request(`${API_URL}/admin/modulos?cursoId=${encodeURIComponent(courseId)}`),

  createModule: async (courseId, data) =>
    request(`${API_URL}/admin/modulos`, {
      method: 'POST',
      body: JSON.stringify({ ...data, cursoId: courseId }),
    }),

  updateModule: async (moduleId, data) =>
    request(`${API_URL}/admin/modulos/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteModule: async (moduleId) =>
    request(`${API_URL}/admin/modulos/${moduleId}`, { method: 'DELETE' }),

  reorderModules: async (courseId, orderedIds) =>
    request(`${API_URL}/admin/modulos/reorder`, {
      method: 'POST',
      body: JSON.stringify({ cursoId: courseId, ordem: orderedIds }),
    }),

  // ----- Lessons -----
  getLessons: async (moduleId) =>
    request(`${API_URL}/admin/aulas?moduloId=${encodeURIComponent(moduleId)}`),

  createLesson: async (moduleId, data) =>
    request(`${API_URL}/admin/aulas`, {
      method: 'POST',
      body: JSON.stringify({ ...data, moduloId: moduleId }),
    }),

  updateLesson: async (lessonId, data) =>
    request(`${API_URL}/admin/aulas/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteLesson: async (lessonId) =>
    request(`${API_URL}/admin/aulas/${lessonId}`, { method: 'DELETE' }),

  reorderLessons: async (moduleId, orderedIds) =>
    request(`${API_URL}/admin/aulas/reorder`, {
      method: 'POST',
      body: JSON.stringify({ moduloId: moduleId, ordem: orderedIds }),
    }),
};
