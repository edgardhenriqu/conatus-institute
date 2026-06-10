import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import QuillEditor from '../../components/common/QuillEditor';
import './LessonEditor.css';

export default function LessonEditor() {
  const { cursoId, moduloId } = useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // lesson object
  const [form, setForm] = useState({ titulo: '', conteudo: '' });
  const [message, setMessage] = useState(null);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getLessons(moduloId);
      setLessons(data.aulas || []);
    } catch (e) {
      console.error('Erro ao carregar aulas', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, [moduloId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => {
    setEditing(null);
    setForm({ titulo: '', conteudo: '' });
  };

  const startEdit = (lesson) => {
    setEditing(lesson);
    setForm({ titulo: lesson.titulo, conteudo: lesson.conteudo });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await adminApi.updateLesson(editing.id, form);
        setMessage({ tipo: 'sucesso', texto: 'Aula atualizada.' });
      } else {
        await adminApi.createLesson(moduloId, form);
        setMessage({ tipo: 'sucesso', texto: 'Aula criada.' });
      }
      await loadLessons();
    } catch {
      setMessage({ tipo: 'erro', texto: 'Falha ao salvar aula.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta aula?')) return;
    try {
      await adminApi.deleteLesson(id);
      setMessage({ tipo: 'sucesso', texto: 'Aula excluída.' });
      await loadLessons();
    } catch {
      setMessage({ tipo: 'erro', texto: 'Erro ao excluir.' });
    }
  };

  const goBackToModules = () => {
    navigate(`/admin/cursos/${cursoId}/modulos`);
  };

  return (
    <div className="lesson-editor">
      <h2>Gerenciar Aulas</h2>
      {message && (
        <div className={message.tipo === 'sucesso' ? 'msg-success' : 'msg-error'}>{message.texto}</div>
      )}
      <button onClick={goBackToModules} className="btn-primary">← Voltar aos Módulos</button>
      <button onClick={startCreate} className="btn-primary" style={{ marginLeft: '8px' }}>
        + Nova Aula
      </button>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id}>
                <td>{l.titulo}</td>
                <td>
                  <button onClick={() => startEdit(l)} className="btn-small">Editar</button>
                  <button onClick={() => handleDelete(l.id)} className="btn-small btn-danger">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Form */}
      <div className="lesson-form">
        <h3>{editing ? 'Editar Aula' : 'Criar Aula'}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Título:
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
            />
          </label>
          <label>
            Conteúdo:
            <QuillEditor
              value={form.conteudo}
              onChange={(content) => setForm({ ...form, conteudo: content })}
            />
          </label>
          <button type="submit" className="btn-primary">
            {editing ? 'Salvar' : 'Criar'}
          </button>
        </form>
      </div>
    </div>
  );
}
