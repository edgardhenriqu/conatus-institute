import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { adminApi } from '../../services/adminApi';
import QuillEditor from '../../components/common/QuillEditor';
import './CourseEditor.css';

export default function CourseEditor() {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const [curso, setCurso] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [toast, setToast] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    duracao: '',
    image: '',
    descricao: '',
    oque_aprender: '',
    mercado_trabalho: '',
    areas_atuacao: '',
    diferenciais: '',
    infraestrutura: '',
    coordenacao: '',
    informacoes_complementares: '',
    matriz_curricular: ''
  });

  const [moduleForm, setModuleForm] = useState({ titulo: '', descricao: '', ordem: '' });
  const [editingModule, setEditingModule] = useState(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ titulo: '', conteudo: '' });
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingLessonModuleId, setEditingLessonModuleId] = useState(null);

  const showToast = (texto, tipo = 'sucesso') => {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCurso = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminCurso(cursoId);
      if (data.curso) {
        setCurso(data.curso);
        setForm(data.curso);
      }
    } catch (err) {
      console.error('Erro ao carregar curso:', err);
      showToast('Erro ao carregar curso', 'erro');
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const data = await adminApi.getModules(cursoId);
      setModules(data.modulos || []);
    } catch (err) {
      console.error('Erro ao carregar módulos:', err);
    }
  };

  const loadLessons = async (moduleId) => {
    try {
      const data = await adminApi.getLessons(moduleId);
      return data.aulas || [];
    } catch (err) {
      console.error('Erro ao carregar aulas:', err);
      return [];
    }
  };

  useEffect(() => {
    loadCurso();
    loadModules();
  }, [cursoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveCourse = async () => {
    setSaving(true);
    try {
      const dadosParaEnviar = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value === '' ? null : value])
      );
      const data = await api.updateAdminCurso(cursoId, dadosParaEnviar);
      if (data.erro) {
        showToast(data.erro, 'erro');
        return;
      }
      setCurso(data.curso);
      showToast('Curso salvo com sucesso!');
    } catch {
      showToast('Erro ao salvar curso', 'erro');
    } finally {
      setSaving(false);
    }
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingModule) {
        await adminApi.updateModule(editingModule.id, moduleForm);
        showToast('Módulo atualizado!');
      } else {
        await adminApi.createModule(cursoId, { ...moduleForm, ordem: modules.length + 1 });
        showToast('Módulo criado!');
      }
      setModuleForm({ titulo: '', descricao: '', ordem: '' });
      setEditingModule(null);
      setShowModuleForm(false);
      await loadModules();
    } catch {
      showToast('Erro ao salvar módulo', 'erro');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Excluir este módulo e todas as suas aulas?')) return;
    try {
      await adminApi.deleteModule(moduleId);
      showToast('Módulo excluído!');
      await loadModules();
    } catch {
      showToast('Erro ao excluir módulo', 'erro');
    }
  };

  const toggleModule = async (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
      return;
    }
    
    setExpandedModule(moduleId);
    
    const moduleWithLessons = modules.find(m => m.id === moduleId);
    if (moduleWithLessons && !moduleWithLessons.aulas) {
      const aulas = await loadLessons(moduleId);
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, aulas } : m
      ));
    }
  };

  const startEditModule = (mod) => {
    setEditingModule(mod);
    setModuleForm({ titulo: mod.titulo, descricao: mod.descricao, ordem: mod.ordem });
    setShowModuleForm(true);
  };

  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await adminApi.updateLesson(editingLesson.id, lessonForm);
        showToast('Aula atualizada!');
      } else {
        await adminApi.createLesson(editingLessonModuleId, lessonForm);
        showToast('Aula criada!');
      }
      setLessonForm({ titulo: '', conteudo: '' });
      setEditingLesson(null);
      setEditingLessonModuleId(null);
      await loadModules();
    } catch {
      showToast('Erro ao salvar aula', 'erro');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Excluir esta aula?')) return;
    try {
      await adminApi.deleteLesson(lessonId);
      showToast('Aula excluída!');
      await loadModules();
    } catch {
      showToast('Erro ao excluir aula', 'erro');
    }
  };

  const startEditLesson = (lesson, moduleId) => {
    setEditingLesson(lesson);
    setEditingLessonModuleId(moduleId);
    setLessonForm({ titulo: lesson.titulo, conteudo: lesson.conteudo });
  };

  const startCreateLesson = (moduleId) => {
    setEditingLesson(null);
    setEditingLessonModuleId(moduleId);
    setLessonForm({ titulo: '', conteudo: '' });
  };

  if (loading) {
    return (
      <div className="ce-loading">
        <div className="ce-spinner"></div>
        <p>Carregando curso...</p>
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="ce-loading">
        <p>Curso não encontrado.</p>
        <button onClick={() => navigate('/admin/cursos')} className="ce-btn ce-btn--primary">
          Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div className="course-editor">
      <div className="ce-header">
        <div className="ce-header__left">
          <button onClick={() => navigate('/admin/cursos')} className="ce-back-btn">
            ← Voltar
          </button>
          <h1 className="ce-title">{form.nome || 'Novo Curso'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="ce-status-badge ce-status--publicado">Ativo</span>
        </div>
      </div>

      <div className="ce-tabs">
        <button
          className={`ce-tab ${activeTab === 'info' ? 'ce-tab--active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Informações
        </button>
        <button
          className={`ce-tab ${activeTab === 'modules' ? 'ce-tab--active' : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          Módulos & Aulas
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="ce-form">
          <div className="ce-section">
            <h3 className="ce-section__title">Informações Básicas</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field ce-field--full">
                <label>Nome do Curso *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do curso"
                />
              </div>
              <div className="ce-field">
                <label>Duração *</label>
                <input
                  type="text"
                  value={form.duracao}
                  onChange={e => setForm({ ...form, duracao: e.target.value })}
                  placeholder="Ex: 40h"
                />
              </div>
              <div className="ce-field">
                <label>URL da Imagem</label>
                <input
                  type="text"
                  value={form.image || ''}
                  onChange={e => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
                {form.image && (
                  <img src={form.image} alt="Preview" className="ce-img-preview" />
                )}
              </div>
              <div className="ce-field ce-field--full">
                <label>Descrição</label>
                <textarea
                  value={form.descricao || ''}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  placeholder="Descrição do curso"
                />
              </div>
            </div>
          </div>

          <div className="ce-section">
            <h3 className="ce-section__title">Conteúdo do Curso</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field ce-field--full">
                <label>O que você vai aprender</label>
                <textarea
                  value={form.oque_aprender || ''}
                  onChange={e => setForm({ ...form, oque_aprender: e.target.value })}
                  rows={4}
                  placeholder="Lista de tópicos que o aluno vai aprender"
                />
              </div>
              <div className="ce-field">
                <label>Matriz Curricular</label>
                <textarea
                  value={form.matriz_curricular || ''}
                  onChange={e => setForm({ ...form, matriz_curricular: e.target.value })}
                  rows={4}
                  placeholder="Módulo 1: Título - Descrição"
                />
              </div>
              <div className="ce-field">
                <label>Coordenação</label>
                <textarea
                  value={form.coordenacao || ''}
                  onChange={e => setForm({ ...form, coordenacao: e.target.value })}
                  rows={3}
                  placeholder="Informações do coordenador"
                />
              </div>
            </div>
          </div>

          <div className="ce-section">
            <h3 className="ce-section__title">Informações Complementares</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field">
                <label>Mercado de Trabalho</label>
                <textarea
                  value={form.mercado_trabalho || ''}
                  onChange={e => setForm({ ...form, mercado_trabalho: e.target.value })}
                  rows={3}
                  placeholder="Oportunidades profissionais"
                />
              </div>
              <div className="ce-field">
                <label>Áreas de Atuação</label>
                <textarea
                  value={form.areas_atuacao || ''}
                  onChange={e => setForm({ ...form, areas_atuacao: e.target.value })}
                  rows={3}
                  placeholder="Áreas onde o profissional pode atuar"
                />
              </div>
              <div className="ce-field">
                <label>Diferenciais</label>
                <textarea
                  value={form.diferenciais || ''}
                  onChange={e => setForm({ ...form, diferenciais: e.target.value })}
                  rows={3}
                  placeholder="O que diferencia este curso"
                />
              </div>
              <div className="ce-field">
                <label>Infraestrutura</label>
                <textarea
                  value={form.infraestrutura || ''}
                  onChange={e => setForm({ ...form, infraestrutura: e.target.value })}
                  rows={3}
                  placeholder="Infraestrutura disponível"
                />
              </div>
            </div>
          </div>

          <div className="ce-section">
            <h3 className="ce-section__title">Informações Adicionais</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field ce-field--full">
                <label>Informações Complementares</label>
                <textarea
                  value={form.informacoes_complementares || ''}
                  onChange={e => setForm({ ...form, informacoes_complementares: e.target.value })}
                  rows={3}
                  placeholder="Outras informações relevantes"
                />
              </div>
            </div>
          </div>

          <div className="ce-save-bar">
            <button onClick={handleSaveCourse} disabled={saving} className="ce-btn ce-btn--primary ce-btn--lg">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="ce-modules">
          <div className="ce-modules__header">
            <h2>Módulos do Curso ({modules.length})</h2>
            <button
              onClick={() => { setEditingModule(null); setModuleForm({ titulo: '', descricao: '', ordem: modules.length + 1 }); setShowModuleForm(true); }}
              className="ce-btn ce-btn--primary"
            >
              + Novo Módulo
            </button>
          </div>

          {editingModule !== null || (editingLessonModuleId && !editingLesson) ? null : null}

          {showModuleForm && (
            <div className="ce-inline-form">
              <h3>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</h3>
              <form onSubmit={handleModuleSubmit}>
                <div className="ce-grid ce-grid--2">
                  <div className="ce-field ce-field--full">
                    <label>Título *</label>
                    <input
                      type="text"
                      value={moduleForm.titulo}
                      onChange={e => setModuleForm({ ...moduleForm, titulo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ce-field ce-field--full">
                    <label>Descrição</label>
                    <textarea
                      value={moduleForm.descricao || ''}
                      onChange={e => setModuleForm({ ...moduleForm, descricao: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="ce-field">
                    <label>Ordem</label>
                    <input
                      type="number"
                      value={moduleForm.ordem}
                      onChange={e => setModuleForm({ ...moduleForm, ordem: parseInt(e.target.value, 10) || 1 })}
                      min="1"
                    />
                  </div>
                </div>
                <div className="ce-inline-form__actions">
                  <button type="submit" className="ce-btn ce-btn--primary">
                    {editingModule ? 'Salvar' : 'Criar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingModule(null); setModuleForm({ titulo: '', descricao: '', ordem: '' }); setShowModuleForm(false); }}
                    className="ce-btn ce-btn--secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {modules.length === 0 ? (
            <div className="ce-empty">
              <p>Nenhum módulo criado ainda.</p>
              <p>Comece adicionando o primeiro módulo do curso.</p>
            </div>
          ) : (
            <div className="ce-accordion">
              {modules.map((mod) => (
                <div key={mod.id} className="ce-accordion__item">
                  <div
                    className="ce-accordion__header"
                    onClick={() => toggleModule(mod.id)}
                  >
                    <div className="ce-accordion__left">
                      <span className="ce-accordion__arrow">
                        {expandedModule === mod.id ? '▼' : '▶'}
                      </span>
                      <span className="ce-accordion__order">{mod.ordem}</span>
                      <span className="ce-accordion__title">{mod.titulo}</span>
                    </div>
                    <div className="ce-accordion__actions" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => startEditModule(mod)}
                        className="ce-btn ce-btn--secondary ce-btn--sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteModule(mod.id)}
                        className="ce-btn ce-btn--danger ce-btn--sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {expandedModule === mod.id && (
                    <div className="ce-accordion__body">
                      {editingLessonModuleId === mod.id && !editingLesson && (
                        <div className="ce-inline-form ce-inline-form--lesson">
                          <h4>Nova Aula</h4>
                          <form onSubmit={handleLessonSubmit}>
                            <div className="ce-field">
                              <label>Título *</label>
                              <input
                                type="text"
                                value={lessonForm.titulo}
                                onChange={e => setLessonForm({ ...lessonForm, titulo: e.target.value })}
                                required
                              />
                            </div>
                            <div className="ce-field">
                              <label>Conteúdo</label>
                              <QuillEditor
                                value={lessonForm.conteudo || ''}
                                onChange={content => setLessonForm({ ...lessonForm, conteudo: content })}
                              />
                            </div>
                            <div className="ce-inline-form__actions">
                              <button type="submit" className="ce-btn ce-btn--primary">
                                Criar Aula
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingLessonModuleId(null); setLessonForm({ titulo: '', conteudo: '' }); }}
                                className="ce-btn ce-btn--secondary"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {editingLesson && editingLessonModuleId === mod.id && (
                        <div className="ce-inline-form ce-inline-form--lesson">
                          <h4>Editar Aula</h4>
                          <form onSubmit={handleLessonSubmit}>
                            <div className="ce-field">
                              <label>Título *</label>
                              <input
                                type="text"
                                value={lessonForm.titulo}
                                onChange={e => setLessonForm({ ...lessonForm, titulo: e.target.value })}
                                required
                              />
                            </div>
                            <div className="ce-field">
                              <label>Conteúdo</label>
                              <QuillEditor
                                value={lessonForm.conteudo || ''}
                                onChange={content => setLessonForm({ ...lessonForm, conteudo: content })}
                              />
                            </div>
                            <div className="ce-inline-form__actions">
                              <button type="submit" className="ce-btn ce-btn--primary">
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingLesson(null); setEditingLessonModuleId(null); setLessonForm({ titulo: '', conteudo: '' }); }}
                                className="ce-btn ce-btn--secondary"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="ce-lessons__header">
                        <h4>Aulas do Módulo</h4>
                        {editingLessonModuleId !== mod.id && (
                          <button
                            onClick={() => startCreateLesson(mod.id)}
                            className="ce-btn ce-btn--primary ce-btn--sm"
                          >
                            + Nova Aula
                          </button>
                        )}
                      </div>

                      {!mod.aulas || mod.aulas.length === 0 ? (
                        <div className="ce-empty-small">
                          <p>Nenhuma aula neste módulo.</p>
                        </div>
                      ) : (
                        <ul className="ce-lesson-list">
                          {mod.aulas.map((aula) => (
                            <li key={aula.id} className="ce-lesson-item">
                              <div className="ce-lesson-item__info">
                                <span className="ce-lesson-item__type">📝</span>
                                <span className="ce-lesson-item__title">{aula.titulo}</span>
                              </div>
                              <div className="ce-lesson-item__actions">
                                <button
                                  onClick={() => startEditLesson(aula, mod.id)}
                                  className="ce-btn ce-btn--secondary ce-btn--sm"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteLesson(aula.id)}
                                  className="ce-btn ce-btn--danger ce-btn--sm"
                                >
                                  Excluir
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className={`ce-toast ce-toast--${toast.tipo}`}>
          <span>{toast.texto}</span>
          <button onClick={() => setToast(null)} className="ce-toast__close">×</button>
        </div>
      )}
    </div>
  );
}