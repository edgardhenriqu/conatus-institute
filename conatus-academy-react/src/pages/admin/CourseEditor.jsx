import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../utils/permissions';
import { useToast } from '../../components/ui/Toast';
import QuillEditor from '../../components/common/QuillEditor';
import CourseAccessPanel from './CourseAccessPanel';
import { normalizeQuillHtml } from '../../utils/quillHtml';
import './CourseEditor.css';

const NIVEIS = [
  { value: 'basico',        label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado',      label: 'Avançado' },
];

const STATUS_LABEL = { rascunho: 'Rascunho', em_breve: 'Em breve', publicado: 'Publicado', inativo: 'Inativo' };

const TIPOS_CONTEUDO = [
  { value: 'texto',    label: '📝 Texto',                icon: '📝' },
  { value: 'video',    label: '🎬 Vídeo',                icon: '🎬' },
  { value: 'pdf',      label: '📄 PDF',                  icon: '📄' },
  { value: 'link',     label: '🔗 Link externo',         icon: '🔗' },
  { value: 'material', label: '📎 Material complementar', icon: '📎' },
];

const contentIcon = (tipo) =>
  TIPOS_CONTEUDO.find(t => t.value === tipo)?.icon || '📝';

const EMPTY_LESSON = {
  titulo: '', descricao: '', conteudo: '', tipo_conteudo: 'texto',
  video_url: '', material_url: '', duracao_minutos: '', obrigatoria: true, ordem: '',
};

const EMPTY_QUESTION = { enunciado: '', alternativas: ['', '', '', ''], correta: 0, explicacao: '' };

export default function CourseEditor() {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [curso, setCurso] = useState(null);
  const [form, setForm] = useState({});
  const [instrutores, setInstrutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Módulos & aulas
  const [modules, setModules] = useState([]);
  const [expandedModule, setExpandedModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({ titulo: '', descricao: '', ordem: '' });
  const [editingModule, setEditingModule] = useState(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonModuleId, setLessonModuleId] = useState(null);

  // Avaliação
  const [quizConfig, setQuizConfig] = useState({ num_questoes: 10, nota_minima: 80, max_tentativas: 3, ativa: true });
  const [questions, setQuestions] = useState([]);
  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // Alunos
  const [students, setStudents] = useState([]);

  // Interessados (cursos em breve)
  const [interessados, setInteressados] = useState([]);

  const setField = (name, value) => setForm(f => ({ ...f, [name]: value }));

  /* ── Carregamento ─────────────────────────────────────────────── */

  const loadCurso = useCallback(async () => {
    try {
      const data = await api.getAdminCurso(cursoId);
      if (data.curso) {
        setCurso(data.curso);
        setForm(data.curso);
      }
    } catch {
      toast.error('Erro ao carregar curso.');
    } finally {
      setLoading(false);
    }
  }, [cursoId, toast]);

  const loadModules = useCallback(async () => {
    try {
      const data = await adminApi.getModules(cursoId);
      setModules(data.modulos || []);
    } catch { /* servidor offline */ }
  }, [cursoId]);

  const loadQuiz = useCallback(async () => {
    try {
      const [cfg, qs] = await Promise.all([
        adminApi.getQuizConfig(cursoId),
        adminApi.getQuestions(cursoId),
      ]);
      if (cfg.avaliacao) setQuizConfig(cfg.avaliacao);
      setQuestions(qs.questoes || []);
    } catch { /* servidor offline */ }
  }, [cursoId]);

  const loadStudents = useCallback(async () => {
    try {
      const data = await adminApi.getCourseStudents(cursoId);
      setStudents(data.matriculados || []);
    } catch { /* servidor offline */ }
  }, [cursoId]);

  const loadInteressados = useCallback(async () => {
    try {
      const data = await adminApi.getCourseInteressados(cursoId);
      setInteressados(data.interessados || []);
    } catch { /* servidor offline */ }
  }, [cursoId]);

  useEffect(() => {
    loadCurso();
    loadModules();
    loadQuiz();
    loadStudents();
    loadInteressados();
    if (isAdmin) {
      api.getAdminInstrutores().then(d => setInstrutores(d.instrutores || [])).catch(() => {});
    }
  }, [loadCurso, loadModules, loadQuiz, loadStudents, loadInteressados, isAdmin]);

  /* ── Curso (salvar / publicar) ────────────────────────────────── */

  const validateForm = () => {
    if (!form.nome?.trim())    return 'O título do curso é obrigatório.';
    if (!form.duracao?.trim()) return 'A carga horária é obrigatória.';
    return null;
  };

  const handleSaveCourse = async () => {
    const erro = validateForm();
    if (erro) { toast.warning(erro); return; }

    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      );
      const data = await api.updateAdminCurso(cursoId, payload);
      if (data.erro) { toast.error(data.erro); return; }
      setCurso(data.curso);
      setForm(data.curso);
      toast.success('Curso salvo com sucesso!');
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar curso.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo depois
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Selecione um arquivo de imagem.');
      return;
    }
    setUploadingImage(true);
    try {
      const data = await adminApi.uploadCourseImage(file);
      setField('image', data.path);
      toast.success('Imagem enviada! Lembre de salvar as alterações.');
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar a imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reenviar o mesmo arquivo depois
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Selecione um arquivo de imagem.');
      return;
    }
    setUploadingSignature(true);
    try {
      const data = await adminApi.uploadCourseImage(file);
      setField('cert_assinatura', data.path);
      toast.success('Assinatura enviada! Lembre de salvar as alterações.');
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar a assinatura.');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handlePublishToggle = async () => {
    const novoStatus = curso.status === 'publicado' ? 'rascunho' : 'publicado';
    if (novoStatus === 'publicado') {
      const erro = validateForm();
      if (erro) { toast.warning(`Antes de publicar: ${erro}`); return; }
      if (modules.length === 0 && !window.confirm('Este curso ainda não tem módulos. Publicar mesmo assim?')) return;
    }
    try {
      const data = await adminApi.setCourseStatus(cursoId, novoStatus);
      if (data.erro) { toast.error(data.erro); return; }
      setCurso(data.curso);
      setForm(f => ({ ...f, status: data.curso.status }));
      toast.success(novoStatus === 'publicado'
        ? '🎉 Curso publicado! Ele já aparece para os alunos.'
        : 'Curso despublicado (voltou para rascunho).');
    } catch {
      toast.error('Erro ao alterar status do curso.');
    }
  };

  const handleSoonToggle = async () => {
    const novoStatus = curso.status === 'em_breve' ? 'rascunho' : 'em_breve';
    try {
      const data = await adminApi.setCourseStatus(cursoId, novoStatus);
      if (data.erro) { toast.error(data.erro); return; }
      setCurso(data.curso);
      setForm(f => ({ ...f, status: data.curso.status }));
      toast.success(novoStatus === 'em_breve'
        ? '📅 Curso marcado como "Em breve" — já aparece no catálogo para captar interesse.'
        : 'Curso voltou para rascunho.');
    } catch {
      toast.error('Erro ao alterar status do curso.');
    }
  };

  /* ── Módulos ──────────────────────────────────────────────────── */

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    if (!moduleForm.titulo?.trim()) { toast.warning('Informe o nome do módulo.'); return; }
    try {
      if (editingModule) {
        await adminApi.updateModule(editingModule.id, moduleForm);
        toast.success('Módulo atualizado!');
      } else {
        await adminApi.createModule(cursoId, { ...moduleForm, ordem: moduleForm.ordem || modules.length + 1 });
        toast.success('Módulo criado!');
      }
      setModuleForm({ titulo: '', descricao: '', ordem: '' });
      setEditingModule(null);
      setShowModuleForm(false);
      await loadModules();
    } catch {
      toast.error('Erro ao salvar módulo.');
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Excluir este módulo e todas as suas aulas?')) return;
    try {
      await adminApi.deleteModule(moduleId);
      toast.success('Módulo excluído.');
      await loadModules();
    } catch {
      toast.error('Erro ao excluir módulo.');
    }
  };

  const moveModule = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= modules.length) return;
    const reordered = [...modules];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setModules(reordered);
    try {
      await adminApi.reorderModules(cursoId, reordered.map(m => m.id));
      await loadModules();
    } catch {
      toast.error('Erro ao reordenar módulos.');
      await loadModules();
    }
  };

  const toggleModule = async (moduleId) => {
    if (expandedModule === moduleId) { setExpandedModule(null); return; }
    setExpandedModule(moduleId);
    const mod = modules.find(m => m.id === moduleId);
    if (mod && !mod.aulas) {
      try {
        const data = await adminApi.getLessons(moduleId);
        setModules(prev => prev.map(m => m.id === moduleId ? { ...m, aulas: data.aulas || [] } : m));
      } catch { /* servidor offline */ }
    }
  };

  const reloadLessons = async (moduleId) => {
    try {
      const data = await adminApi.getLessons(moduleId);
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, aulas: data.aulas || [] } : m));
    } catch { /* servidor offline */ }
  };

  /* ── Aulas ────────────────────────────────────────────────────── */

  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    if (!lessonForm.titulo?.trim()) { toast.warning('Informe o título da aula.'); return; }
    if (lessonForm.tipo_conteudo === 'video' && !lessonForm.video_url?.trim()) {
      toast.warning('Informe a URL do vídeo.');
      return;
    }
    const payload = {
      ...lessonForm,
      conteudo: normalizeQuillHtml(lessonForm.conteudo),
      duracao_minutos: lessonForm.duracao_minutos ? parseInt(lessonForm.duracao_minutos, 10) : null,
      ordem: lessonForm.ordem ? parseInt(lessonForm.ordem, 10) : undefined,
    };
    try {
      if (editingLesson) {
        await adminApi.updateLesson(editingLesson.id, payload);
        toast.success('Aula atualizada!');
      } else {
        const mod = modules.find(m => m.id === lessonModuleId);
        await adminApi.createLesson(lessonModuleId, {
          ...payload,
          ordem: payload.ordem || (mod?.aulas?.length || 0) + 1,
        });
        toast.success('Aula criada!');
      }
      const modId = lessonModuleId;
      setLessonForm(EMPTY_LESSON);
      setEditingLesson(null);
      setLessonModuleId(null);
      await reloadLessons(modId);
    } catch {
      toast.error('Erro ao salvar aula.');
    }
  };

  const handleDeleteLesson = async (lessonId, moduleId) => {
    if (!window.confirm('Excluir esta aula?')) return;
    try {
      await adminApi.deleteLesson(lessonId);
      toast.success('Aula excluída.');
      await reloadLessons(moduleId);
    } catch {
      toast.error('Erro ao excluir aula.');
    }
  };

  /* ── Avaliação ────────────────────────────────────────────────── */

  const handleSaveQuizConfig = async (e) => {
    e.preventDefault();
    try {
      const data = await adminApi.saveQuizConfig(cursoId, quizConfig);
      if (data.erro) { toast.error(data.erro); return; }
      setQuizConfig(data.avaliacao);
      toast.success('Configuração da avaliação salva!');
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar configuração.');
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    const alts = questionForm.alternativas.map(a => a.trim());
    if (!questionForm.enunciado.trim()) { toast.warning('Informe o enunciado da pergunta.'); return; }
    if (alts.some(a => !a)) { toast.warning('Preencha todas as alternativas.'); return; }

    const payload = { ...questionForm, alternativas: alts };
    try {
      if (editingQuestion) {
        const data = await adminApi.updateQuestion(editingQuestion.id, payload);
        if (data.erro) { toast.error(data.erro); return; }
        toast.success('Pergunta atualizada!');
      } else {
        const data = await adminApi.createQuestion(cursoId, payload);
        if (data.erro) { toast.error(data.erro); return; }
        toast.success('Pergunta adicionada ao banco!');
      }
      setQuestionForm(EMPTY_QUESTION);
      setEditingQuestion(null);
      setShowQuestionForm(false);
      await loadQuiz();
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar pergunta.');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Excluir esta pergunta do banco?')) return;
    try {
      await adminApi.deleteQuestion(id);
      toast.success('Pergunta excluída.');
      await loadQuiz();
    } catch {
      toast.error('Erro ao excluir pergunta.');
    }
  };

  const setAlternativa = (idx, value) => {
    setQuestionForm(f => ({
      ...f,
      alternativas: f.alternativas.map((a, i) => i === idx ? value : a),
    }));
  };

  /* ── Alunos ───────────────────────────────────────────────────── */

  const handleUnenroll = async (aluno) => {
    if (!window.confirm(
      `Desmatricular ${aluno.nome} deste curso?\n\n` +
      'O progresso das aulas e as tentativas de avaliação serão apagados. ' +
      'Certificados já emitidos são mantidos (gerencie-os na página Certificados).'
    )) return;
    try {
      const data = await adminApi.unenrollStudent(cursoId, aluno.id);
      if (data.erro) { toast.error(data.erro); return; }
      toast.success(`${aluno.nome} foi desmatriculado do curso.`);
      await loadStudents();
    } catch (err) {
      toast.error(err.message || 'Erro ao desmatricular aluno.');
    }
  };

  /* ── Render ───────────────────────────────────────────────────── */

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

  const status = curso.status || 'rascunho';
  const tabs = [
    { id: 'info',     label: 'Informações' },
    { id: 'modules',  label: `Módulos & Aulas (${modules.length})` },
    { id: 'quiz',     label: `Avaliação (${questions.length})` },
    { id: 'cert',     label: 'Certificado' },
    { id: 'perms',    label: 'Permissões' },
    { id: 'students', label: `Alunos (${students.length})` },
  ];

  return (
    <div className="course-editor">
      {/* ── Cabeçalho ── */}
      <div className="ce-header">
        <div className="ce-header__left">
          <button onClick={() => navigate('/admin/cursos')} className="ce-back-btn">← Voltar</button>
          <h1 className="ce-title">{form.nome || 'Novo Curso'}</h1>
          <span className={`ce-status-badge ce-status--${status}`}>{STATUS_LABEL[status]}</span>
          {Number(curso.total_interesse) > 0 && (
            <span className="ce-interest-chip" title="Pessoas que clicaram em 'Tenho interesse'">
              ❤ {curso.total_interesse} {Number(curso.total_interesse) === 1 ? 'interessado' : 'interessados'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to={`/cursos/${cursoId}`} target="_blank" className="ce-btn ce-btn--secondary">
            👁 Visualizar como aluno
          </Link>
          {status !== 'publicado' && (
            <button onClick={handleSoonToggle} className="ce-btn ce-btn--secondary"
              style={status === 'em_breve' ? { background: '#4f46e5', color: '#fff', borderColor: '#4f46e5' } : undefined}
              title="Exibe o curso no catálogo como 'Em breve', com o botão 'Tenho interesse'">
              {status === 'em_breve' ? '📅 Em breve (ativo)' : '📅 Marcar Em breve'}
            </button>
          )}
          <button onClick={handlePublishToggle} className="ce-btn ce-btn--primary"
            style={status === 'publicado' ? { background: '#64748b' } : { background: '#10b981' }}>
            {status === 'publicado' ? 'Despublicar' : '🚀 Publicar curso'}
          </button>
        </div>
      </div>

      {/* ── Abas ── */}
      <div className="ce-tabs" style={{ overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`ce-tab ${activeTab === t.id ? 'ce-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════ ABA: INFORMAÇÕES ════════ */}
      {activeTab === 'info' && (
        <div className="ce-form">
          <div className="ce-section">
            <h3 className="ce-section__title">Informações Básicas</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field ce-field--full">
                <label>Título do Curso *</label>
                <input type="text" value={form.nome || ''} required
                  onChange={e => setField('nome', e.target.value)}
                  placeholder="Ex.: Operação de Sistemas Elétricos em Data Centers" />
              </div>
              <div className="ce-field ce-field--full">
                <label>Descrição curta (aparece nos cards do catálogo — máx. 300 caracteres)</label>
                <input type="text" maxLength={300} value={form.descricao_curta || ''}
                  onChange={e => setField('descricao_curta', e.target.value)}
                  placeholder="Resumo de uma frase do curso" />
              </div>
              <div className="ce-field ce-field--full">
                <label>Descrição completa</label>
                <textarea rows={4} value={form.descricao || ''}
                  onChange={e => setField('descricao', e.target.value)}
                  placeholder="Descrição detalhada exibida na página do curso" />
              </div>
              <div className="ce-field">
                <label>Carga horária *</label>
                <input type="text" value={form.duracao || ''} required
                  onChange={e => setField('duracao', e.target.value)} placeholder="Ex.: 40h" />
              </div>
              <div className="ce-field">
                <label>Categoria</label>
                <input type="text" value={form.categoria || ''}
                  onChange={e => setField('categoria', e.target.value)}
                  placeholder="Ex.: Energia, Refrigeração, Operações" />
              </div>
              <div className="ce-field">
                <label>Nível</label>
                <select value={form.nivel || 'basico'} onChange={e => setField('nivel', e.target.value)}>
                  {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div className="ce-field">
                  <label>Instrutor responsável</label>
                  <select
                    value={form.instrutor_id || ''}
                    onChange={e => setField('instrutor_id', e.target.value || null)}
                  >
                    <option value="">— Sem instrutor atribuído —</option>
                    {instrutores.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nome} ({i.email}){i.role === 'admin' ? ` — ${ROLE_LABELS.admin}` : ''}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    O instrutor selecionado poderá editar módulos, aulas e questões deste curso.
                  </small>
                </div>
              )}
              <div className="ce-field">
                <label>Imagem de capa</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label className="ce-btn ce-btn--secondary" style={{ cursor: uploadingImage ? 'wait' : 'pointer', margin: 0 }}>
                    {uploadingImage ? 'Enviando...' : '📎 Anexar imagem'}
                    <input type="file" accept="image/*" hidden disabled={uploadingImage}
                      onChange={handleImageUpload} />
                  </label>
                  {form.image && (
                    <button type="button" className="ce-btn ce-btn--secondary"
                      onClick={() => setField('image', '')}>
                      Remover
                    </button>
                  )}
                </div>
                <input type="text" value={form.image || ''} style={{ marginTop: '8px' }}
                  onChange={e => setField('image', e.target.value)}
                  placeholder="Ou cole uma URL/caminho: images/courses/nome.png" />
                <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  JPG, PNG, WEBP ou GIF — até 15 MB.
                </small>
                {form.image && (
                  <img src={form.image.startsWith('http') ? form.image : `/${form.image}`}
                    alt="Preview" className="ce-img-preview"
                    onError={e => { e.target.style.display = 'none'; }}
                    onLoad={e => { e.target.style.display = ''; }} />
                )}
              </div>
            </div>
          </div>

          <div className="ce-section">
            <h3 className="ce-section__title">Sobre o Curso</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field">
                <label>Público-alvo</label>
                <textarea rows={3} value={form.publico_alvo || ''}
                  onChange={e => setField('publico_alvo', e.target.value)}
                  placeholder="Para quem é este curso?" />
              </div>
              <div className="ce-field">
                <label>Objetivos do curso</label>
                <textarea rows={3} value={form.objetivo || ''}
                  onChange={e => setField('objetivo', e.target.value)}
                  placeholder="O que o aluno será capaz de fazer ao concluir?" />
              </div>
              <div className="ce-field">
                <label>Requisitos para participar</label>
                <textarea rows={3} value={form.requisitos || ''}
                  onChange={e => setField('requisitos', e.target.value)}
                  placeholder="Pré-requisitos, conhecimentos necessários..." />
              </div>
              <div className="ce-field">
                <label>O que você vai aprender</label>
                <textarea rows={3} value={form.oque_aprender || ''}
                  onChange={e => setField('oque_aprender', e.target.value)}
                  placeholder="• Tópico 1&#10;• Tópico 2" />
              </div>
            </div>
          </div>

          <div className="ce-section">
            <h3 className="ce-section__title">Conteúdo Institucional (opcional)</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field">
                <label>Mercado de Trabalho</label>
                <textarea rows={3} value={form.mercado_trabalho || ''}
                  onChange={e => setField('mercado_trabalho', e.target.value)} />
              </div>
              <div className="ce-field">
                <label>Áreas de Atuação</label>
                <textarea rows={3} value={form.areas_atuacao || ''}
                  onChange={e => setField('areas_atuacao', e.target.value)} />
              </div>
              <div className="ce-field">
                <label>Diferenciais</label>
                <textarea rows={3} value={form.diferenciais || ''}
                  onChange={e => setField('diferenciais', e.target.value)} />
              </div>
              <div className="ce-field">
                <label>Coordenação</label>
                <textarea rows={3} value={form.coordenacao || ''}
                  onChange={e => setField('coordenacao', e.target.value)} />
              </div>
              <div className="ce-field ce-field--full">
                <label>Informações Complementares</label>
                <textarea rows={3} value={form.informacoes_complementares || ''}
                  onChange={e => setField('informacoes_complementares', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="ce-save-bar">
            <button onClick={handleSaveCourse} disabled={saving} className="ce-btn ce-btn--primary ce-btn--lg">
              {saving ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </div>
      )}

      {/* ════════ ABA: MÓDULOS & AULAS ════════ */}
      {activeTab === 'modules' && (
        <div className="ce-modules">
          <div className="ce-modules__header">
            <h2>Módulos do Curso ({modules.length})</h2>
            <button className="ce-btn ce-btn--primary"
              onClick={() => {
                setEditingModule(null);
                setModuleForm({ titulo: '', descricao: '', ordem: modules.length + 1 });
                setShowModuleForm(true);
              }}>
              + Novo Módulo
            </button>
          </div>

          {showModuleForm && (
            <div className="ce-inline-form">
              <h3>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</h3>
              <form onSubmit={handleModuleSubmit}>
                <div className="ce-grid ce-grid--2">
                  <div className="ce-field ce-field--full">
                    <label>Nome do módulo *</label>
                    <input type="text" value={moduleForm.titulo} required
                      onChange={e => setModuleForm({ ...moduleForm, titulo: e.target.value })}
                      placeholder="Ex.: Módulo 1 — Introdução ao curso" />
                  </div>
                  <div className="ce-field ce-field--full">
                    <label>Descrição</label>
                    <textarea rows={2} value={moduleForm.descricao || ''}
                      onChange={e => setModuleForm({ ...moduleForm, descricao: e.target.value })} />
                  </div>
                  <div className="ce-field">
                    <label>Ordem de exibição</label>
                    <input type="number" min="1" value={moduleForm.ordem}
                      onChange={e => setModuleForm({ ...moduleForm, ordem: parseInt(e.target.value, 10) || 1 })} />
                  </div>
                </div>
                <div className="ce-inline-form__actions">
                  <button type="submit" className="ce-btn ce-btn--primary">
                    {editingModule ? 'Salvar' : 'Criar Módulo'}
                  </button>
                  <button type="button" className="ce-btn ce-btn--secondary"
                    onClick={() => { setEditingModule(null); setShowModuleForm(false); }}>
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
              {modules.map((mod, idx) => (
                <div key={mod.id} className="ce-accordion__item">
                  <div className="ce-accordion__header" onClick={() => toggleModule(mod.id)}>
                    <div className="ce-accordion__left">
                      <span className="ce-accordion__arrow">{expandedModule === mod.id ? '▼' : '▶'}</span>
                      <span className="ce-accordion__order">{mod.ordem}</span>
                      <span className="ce-accordion__title">{mod.titulo}</span>
                      {mod.aulas && <span className="ce-accordion__count">{mod.aulas.length} aulas</span>}
                    </div>
                    <div className="ce-accordion__actions" onClick={e => e.stopPropagation()}>
                      <button onClick={() => moveModule(idx, -1)} disabled={idx === 0}
                        className="ce-btn ce-btn--secondary ce-btn--sm" title="Mover para cima">↑</button>
                      <button onClick={() => moveModule(idx, +1)} disabled={idx === modules.length - 1}
                        className="ce-btn ce-btn--secondary ce-btn--sm" title="Mover para baixo">↓</button>
                      <button className="ce-btn ce-btn--secondary ce-btn--sm"
                        onClick={() => {
                          setEditingModule(mod);
                          setModuleForm({ titulo: mod.titulo, descricao: mod.descricao, ordem: mod.ordem });
                          setShowModuleForm(true);
                        }}>
                        Editar
                      </button>
                      <button onClick={() => handleDeleteModule(mod.id)}
                        className="ce-btn ce-btn--danger ce-btn--sm">Excluir</button>
                    </div>
                  </div>

                  {expandedModule === mod.id && (
                    <div className="ce-accordion__body">
                      {mod.descricao && (
                        <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '0.92rem' }}>{mod.descricao}</p>
                      )}

                      {/* Formulário de aula (criar/editar) */}
                      {lessonModuleId === mod.id && (
                        <div className="ce-inline-form ce-inline-form--lesson">
                          <h4>{editingLesson ? 'Editar Aula' : 'Nova Aula'}</h4>
                          <form onSubmit={handleLessonSubmit}>
                            <div className="ce-grid ce-grid--2">
                              <div className="ce-field ce-field--full">
                                <label>Título da aula *</label>
                                <input type="text" value={lessonForm.titulo} required
                                  onChange={e => setLessonForm({ ...lessonForm, titulo: e.target.value })} />
                              </div>
                              <div className="ce-field ce-field--full">
                                <label>Descrição da aula</label>
                                <input type="text" value={lessonForm.descricao || ''}
                                  onChange={e => setLessonForm({ ...lessonForm, descricao: e.target.value })}
                                  placeholder="Resumo breve do que será visto" />
                              </div>
                              <div className="ce-field">
                                <label>Tipo de conteúdo</label>
                                <select value={lessonForm.tipo_conteudo}
                                  onChange={e => setLessonForm({ ...lessonForm, tipo_conteudo: e.target.value })}>
                                  {TIPOS_CONTEUDO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </div>
                              <div className="ce-field">
                                <label>Tempo estimado (minutos)</label>
                                <input type="number" min="1" value={lessonForm.duracao_minutos || ''}
                                  onChange={e => setLessonForm({ ...lessonForm, duracao_minutos: e.target.value })} />
                              </div>
                              {(lessonForm.tipo_conteudo === 'video') && (
                                <div className="ce-field ce-field--full">
                                  <label>URL do vídeo * (YouTube, Vimeo ou arquivo)</label>
                                  <input type="text" value={lessonForm.video_url || ''}
                                    onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=..." />
                                </div>
                              )}
                              {(lessonForm.tipo_conteudo === 'pdf' || lessonForm.tipo_conteudo === 'link' || lessonForm.tipo_conteudo === 'material') && (
                                <div className="ce-field ce-field--full">
                                  <label>URL do material / link externo</label>
                                  <input type="text" value={lessonForm.material_url || ''}
                                    onChange={e => setLessonForm({ ...lessonForm, material_url: e.target.value })}
                                    placeholder="https://..." />
                                </div>
                              )}
                              <div className="ce-field">
                                <label>Ordem na lista</label>
                                <input type="number" min="1" value={lessonForm.ordem || ''}
                                  onChange={e => setLessonForm({ ...lessonForm, ordem: e.target.value })}
                                  placeholder="automática" />
                              </div>
                              <div className="ce-field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
                                  <input type="checkbox" checked={lessonForm.obrigatoria !== false}
                                    onChange={e => setLessonForm({ ...lessonForm, obrigatoria: e.target.checked })} />
                                  Aula obrigatória (conta para o certificado)
                                </label>
                              </div>
                            </div>
                            <div className="ce-field" style={{ marginTop: '16px' }}>
                              <label>Conteúdo da aula</label>
                              <QuillEditor
                                value={lessonForm.conteudo || ''}
                                onChange={content => setLessonForm(f => ({ ...f, conteudo: content }))}
                              />
                            </div>
                            <div className="ce-inline-form__actions">
                              <button type="submit" className="ce-btn ce-btn--primary">
                                {editingLesson ? 'Salvar Aula' : 'Criar Aula'}
                              </button>
                              <button type="button" className="ce-btn ce-btn--secondary"
                                onClick={() => { setEditingLesson(null); setLessonModuleId(null); setLessonForm(EMPTY_LESSON); }}>
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      <div className="ce-lessons__header">
                        <h4>Aulas do Módulo</h4>
                        {lessonModuleId !== mod.id && (
                          <button className="ce-btn ce-btn--primary ce-btn--sm"
                            onClick={() => { setEditingLesson(null); setLessonModuleId(mod.id); setLessonForm(EMPTY_LESSON); }}>
                            + Nova Aula
                          </button>
                        )}
                      </div>

                      {!mod.aulas || mod.aulas.length === 0 ? (
                        <div className="ce-empty-small"><p>Nenhuma aula neste módulo.</p></div>
                      ) : (
                        <ul className="ce-lesson-list">
                          {mod.aulas.map((aula) => (
                            <li key={aula.id} className="ce-lesson-item">
                              <div className="ce-lesson-item__info">
                                <span className="ce-lesson-item__type">{contentIcon(aula.tipo_conteudo)}</span>
                                <div>
                                  <span className="ce-lesson-item__title">{aula.titulo}</span>
                                  <div className="ce-lesson-item__duration">
                                    {aula.duracao_minutos ? `${aula.duracao_minutos} min · ` : ''}
                                    {aula.obrigatoria === false ? 'Opcional' : 'Obrigatória'}
                                  </div>
                                </div>
                              </div>
                              <div className="ce-lesson-item__actions">
                                <button className="ce-btn ce-btn--secondary ce-btn--sm"
                                  onClick={() => {
                                    setEditingLesson(aula);
                                    setLessonModuleId(mod.id);
                                    setLessonForm({
                                      titulo: aula.titulo || '',
                                      descricao: aula.descricao || '',
                                      conteudo: aula.conteudo || '',
                                      tipo_conteudo: aula.tipo_conteudo || 'texto',
                                      video_url: aula.video_url || '',
                                      material_url: aula.material_url || '',
                                      duracao_minutos: aula.duracao_minutos || '',
                                      obrigatoria: aula.obrigatoria !== false,
                                      ordem: aula.ordem || '',
                                    });
                                  }}>
                                  Editar
                                </button>
                                <button onClick={() => handleDeleteLesson(aula.id, mod.id)}
                                  className="ce-btn ce-btn--danger ce-btn--sm">Excluir</button>
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

      {/* ════════ ABA: AVALIAÇÃO ════════ */}
      {activeTab === 'quiz' && (
        <div className="ce-form">
          <div className="ce-section">
            <h3 className="ce-section__title">Configuração da Avaliação Final</h3>
            <form onSubmit={handleSaveQuizConfig}>
              <div className="ce-grid ce-grid--2">
                <div className="ce-field">
                  <label>Questões por prova</label>
                  <input type="number" min="1" value={quizConfig.num_questoes}
                    onChange={e => setQuizConfig({ ...quizConfig, num_questoes: e.target.value })} />
                </div>
                <div className="ce-field">
                  <label>Nota mínima para aprovação (%)</label>
                  <input type="number" min="1" max="100" value={quizConfig.nota_minima}
                    onChange={e => setQuizConfig({ ...quizConfig, nota_minima: e.target.value })} />
                </div>
                <div className="ce-field">
                  <label>Máximo de tentativas</label>
                  <input type="number" min="1" value={quizConfig.max_tentativas}
                    onChange={e => setQuizConfig({ ...quizConfig, max_tentativas: e.target.value })} />
                </div>
                <div className="ce-field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
                    <input type="checkbox" checked={quizConfig.ativa !== false}
                      onChange={e => setQuizConfig({ ...quizConfig, ativa: e.target.checked })} />
                    Avaliação ativa (obrigatória para o certificado)
                  </label>
                </div>
              </div>
              <div className="ce-inline-form__actions">
                <button type="submit" className="ce-btn ce-btn--primary">Salvar Configuração</button>
              </div>
            </form>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '12px' }}>
              As questões são sorteadas aleatoriamente do banco a cada tentativa.
              O certificado só é liberado com 100% das aulas obrigatórias + aprovação (quando a avaliação está ativa).
            </p>
          </div>

          <div className="ce-section">
            <div className="ce-modules__header">
              <h3 className="ce-section__title" style={{ margin: 0 }}>
                Banco de Perguntas ({questions.length})
              </h3>
              <button className="ce-btn ce-btn--primary"
                onClick={() => { setEditingQuestion(null); setQuestionForm(EMPTY_QUESTION); setShowQuestionForm(true); }}>
                + Nova Pergunta
              </button>
            </div>

            {showQuestionForm && (
              <div className="ce-inline-form" style={{ marginTop: '16px' }}>
                <h4>{editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}</h4>
                <form onSubmit={handleQuestionSubmit}>
                  <div className="ce-field">
                    <label>Enunciado *</label>
                    <textarea rows={2} value={questionForm.enunciado} required
                      onChange={e => setQuestionForm({ ...questionForm, enunciado: e.target.value })} />
                  </div>
                  <div className="ce-field" style={{ marginTop: '12px' }}>
                    <label>Alternativas * (marque a correta)</label>
                    {questionForm.alternativas.map((alt, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                        <input type="radio" name="correta"
                          checked={questionForm.correta === idx}
                          onChange={() => setQuestionForm({ ...questionForm, correta: idx })}
                          title="Alternativa correta" />
                        <strong style={{ width: '20px' }}>{String.fromCharCode(65 + idx)})</strong>
                        <input type="text" value={alt} style={{ flex: 1 }}
                          onChange={e => setAlternativa(idx, e.target.value)}
                          placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`} />
                        {questionForm.alternativas.length > 2 && (
                          <button type="button" className="ce-btn ce-btn--danger ce-btn--sm"
                            onClick={() => setQuestionForm(f => ({
                              ...f,
                              alternativas: f.alternativas.filter((_, i) => i !== idx),
                              // se removeu a correta volta para a primeira; se removeu antes dela, desloca o índice
                              correta: f.correta === idx ? 0 : f.correta > idx ? f.correta - 1 : f.correta,
                            }))}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {questionForm.alternativas.length < 5 && (
                      <button type="button" className="ce-btn ce-btn--secondary ce-btn--sm"
                        onClick={() => setQuestionForm(f => ({ ...f, alternativas: [...f.alternativas, ''] }))}>
                        + Adicionar alternativa
                      </button>
                    )}
                  </div>
                  <div className="ce-field" style={{ marginTop: '12px' }}>
                    <label>Explicação (mostrada ao aluno após responder)</label>
                    <textarea rows={2} value={questionForm.explicacao || ''}
                      onChange={e => setQuestionForm({ ...questionForm, explicacao: e.target.value })} />
                  </div>
                  <div className="ce-inline-form__actions">
                    <button type="submit" className="ce-btn ce-btn--primary">
                      {editingQuestion ? 'Salvar Pergunta' : 'Adicionar ao Banco'}
                    </button>
                    <button type="button" className="ce-btn ce-btn--secondary"
                      onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {questions.length === 0 ? (
              <div className="ce-empty" style={{ marginTop: '16px' }}>
                <p>Nenhuma pergunta cadastrada.</p>
                <p>Adicione perguntas para habilitar a avaliação final deste curso.</p>
              </div>
            ) : (
              <div className="qbank-list" style={{ marginTop: '16px' }}>
                {questions.map((q, idx) => (
                  <div key={q.id} className="qbank-item">
                    <div className="qbank-item-head">
                      <span className="qbank-number">{idx + 1}</span>
                      <span className="qbank-question" style={{ flex: 1 }}>{q.enunciado}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="ce-btn ce-btn--secondary ce-btn--sm"
                          onClick={() => {
                            setEditingQuestion(q);
                            setQuestionForm({
                              enunciado: q.enunciado,
                              alternativas: Array.isArray(q.alternativas) ? q.alternativas : [],
                              correta: q.correta,
                              explicacao: q.explicacao || '',
                            });
                            setShowQuestionForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}>
                          Editar
                        </button>
                        <button className="ce-btn ce-btn--danger ce-btn--sm"
                          onClick={() => handleDeleteQuestion(q.id)}>Excluir</button>
                      </div>
                    </div>
                    <div className="qbank-alternatives">
                      {(Array.isArray(q.alternativas) ? q.alternativas : []).map((alt, i) => (
                        <div key={i} className={`qbank-alt ${i === q.correta ? 'correct' : ''}`}>
                          <strong>{String.fromCharCode(65 + i)})</strong>
                          <span>{alt}</span>
                          {i === q.correta && <span style={{ marginLeft: 'auto' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ ABA: CERTIFICADO ════════ */}
      {activeTab === 'cert' && (
        <div className="ce-form">
          <div className="ce-section">
            <h3 className="ce-section__title">Configuração do Certificado</h3>
            <div className="ce-grid ce-grid--2">
              <div className="ce-field ce-field--full">
                <label>Requisitos para emissão (exibido ao aluno)</label>
                <textarea rows={2} value={form.requisitos_certificado || ''}
                  onChange={e => setField('requisitos_certificado', e.target.value)}
                  placeholder="Ex.: Concluir 100% das aulas e obter no mínimo 80% na avaliação final" />
              </div>
              <div className="ce-field">
                <label>Responsável técnico (nome)</label>
                <input type="text" value={form.cert_responsavel || ''}
                  onChange={e => setField('cert_responsavel', e.target.value)}
                  placeholder="Ex.: Coordenação de Operações Conatus" />
              </div>
              <div className="ce-field">
                <label>Assinatura do responsável (imagem)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label className="ce-btn ce-btn--secondary" style={{ cursor: uploadingSignature ? 'wait' : 'pointer', margin: 0 }}>
                    {uploadingSignature ? 'Enviando...' : '✍️ Anexar assinatura'}
                    <input type="file" accept="image/*" hidden disabled={uploadingSignature}
                      onChange={handleSignatureUpload} />
                  </label>
                  {form.cert_assinatura && (
                    <button type="button" className="ce-btn ce-btn--secondary"
                      onClick={() => setField('cert_assinatura', '')}>
                      Remover
                    </button>
                  )}
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  PNG com fundo transparente fica melhor — até 15 MB.
                </small>
                {form.cert_assinatura && (
                  <img src={form.cert_assinatura.startsWith('http') ? form.cert_assinatura : `/${form.cert_assinatura}`}
                    alt="Assinatura" className="ce-img-preview"
                    style={{ maxHeight: '80px', background: '#fff' }}
                    onError={e => { e.target.style.display = 'none'; }}
                    onLoad={e => { e.target.style.display = ''; }} />
                )}
              </div>
              <div className="ce-field ce-field--full">
                <label>Texto padrão do certificado</label>
                <textarea rows={3} value={form.cert_texto || ''}
                  onChange={e => setField('cert_texto', e.target.value)}
                  placeholder="Ex.: concluiu com aproveitamento o curso, cumprindo todos os requisitos de avaliação." />
              </div>
            </div>
            <div style={{
              background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px',
              padding: '16px 20px', marginTop: '20px', fontSize: '0.9rem', color: '#075985',
            }}>
              <strong>Liberação automática:</strong> o certificado é emitido pelo próprio aluno quando
              ele concluir 100% das aulas obrigatórias{questions.length > 0 && quizConfig.ativa !== false
                ? ` e for aprovado na avaliação final (mínimo ${quizConfig.nota_minima}%)`
                : ''}. O documento inclui nome da instituição, curso, aluno, carga horária,
              data de conclusão e código de validação único.
            </div>
          </div>
          <div className="ce-save-bar">
            <button onClick={handleSaveCourse} disabled={saving} className="ce-btn ce-btn--primary ce-btn--lg">
              {saving ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </div>
      )}

      {/* ════════ ABA: PERMISSÕES ════════ */}
      {activeTab === 'perms' && (
        <div className="ce-form">
          <div className="ce-section" style={{ paddingBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={form.visivel !== false}
                onChange={e => setField('visivel', e.target.checked)} />
              Visível na listagem de cursos
            </label>
            <div className="ce-save-bar">
              <button onClick={handleSaveCourse} disabled={saving} className="ce-btn ce-btn--secondary">
                {saving ? 'Salvando...' : 'Salvar visibilidade'}
              </button>
            </div>
          </div>
          <CourseAccessPanel courseId={cursoId} />
        </div>
      )}

      {/* ════════ ABA: ALUNOS ════════ */}
      {activeTab === 'students' && (
        <div className="ce-form">
          {/* Interessados — captação de demanda dos cursos "Em breve" */}
          {interessados.length > 0 && (
            <div className="ce-section">
              <div className="ce-modules__header">
                <h3 className="ce-section__title" style={{ margin: 0 }}>
                  ❤ Interessados ({interessados.length})
                </h3>
                <button className="ce-btn ce-btn--secondary ce-btn--sm" onClick={loadInteressados}>
                  ↻ Atualizar
                </button>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '8px 0 16px' }}>
                Pessoas que clicaram em "Tenho interesse" enquanto o curso está como "Em breve".
              </p>
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr><th>Nome</th><th>E-mail</th><th>Interesse em</th></tr>
                  </thead>
                  <tbody>
                    {interessados.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nome}</td>
                        <td style={{ fontSize: '0.9rem' }}>{p.email}</td>
                        <td>{p.interesse_em ? new Date(p.interesse_em).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="ce-section">
            <div className="ce-modules__header">
              <h3 className="ce-section__title" style={{ margin: 0 }}>
                Alunos Matriculados ({students.length})
              </h3>
              <button className="ce-btn ce-btn--secondary ce-btn--sm" onClick={loadStudents}>
                ↻ Atualizar
              </button>
            </div>

            {students.length === 0 ? (
              <div className="ce-empty" style={{ marginTop: '16px' }}>
                <p>Nenhum aluno matriculado neste curso ainda.</p>
              </div>
            ) : (
              <div className="admin-table-scroll" style={{ marginTop: '16px' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Progresso</th>
                    <th>Avaliação</th>
                    <th>Certificado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.nome}</td>
                      <td style={{ fontSize: '0.9rem' }}>{s.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="ccard-progress-bar" style={{ width: '90px' }}>
                            <div className="ccard-progress-fill" style={{ width: `${s.progresso || 0}%` }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.progresso || 0}%</span>
                        </div>
                      </td>
                      <td>
                        {s.tentativas > 0 ? (
                          <span style={{ color: s.aprovado ? '#166534' : '#991b1b', fontWeight: 600, fontSize: '0.88rem' }}>
                            {s.aprovado ? `✓ Aprovado (${s.melhor_nota}%)` : `${s.melhor_nota}% (${s.tentativas} tent.)`}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Não realizada</span>
                        )}
                      </td>
                      <td>
                        {s.certificado_codigo
                          ? <code style={{ fontSize: '0.8rem' }}>{s.certificado_codigo}</code>
                          : <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>—</span>}
                      </td>
                      <td>
                        <button className="ce-btn ce-btn--danger ce-btn--sm"
                          onClick={() => handleUnenroll(s)} title="Remover matrícula deste curso">
                          Desmatricular
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
