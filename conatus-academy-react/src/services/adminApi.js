import { API_URL, request } from './httpClient';

export const adminApi = {
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
