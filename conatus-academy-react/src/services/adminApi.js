import { API_URL, request } from './httpClient';

export const adminApi = {
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

  // ----- Autorizações (cursos internos) -----
  getAuthorizations: async (courseId) =>
    request(`${API_URL}/admin/cursos/${courseId}/autorizacoes`),

  addAuthorization: async (courseId, email) =>
    request(`${API_URL}/admin/cursos/${courseId}/autorizacoes`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  removeAuthorization: async (courseId, alunoId) =>
    request(`${API_URL}/admin/cursos/${courseId}/autorizacoes/${alunoId}`, {
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
