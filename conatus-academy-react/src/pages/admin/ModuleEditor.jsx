import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import './ModuleEditor.css';

export default function ModuleEditor() {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // module object
  const [form, setForm] = useState({ titulo: '', descricao: '', ordem: '' });
  const [message, setMessage] = useState(null);

  const loadModules = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getModules(cursoId);
      setModules(data.modulos || []);
    } catch (e) {
      console.error('Erro ao carregar módulos', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, [cursoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCreate = () => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', ordem: modules.length + 1 });
  };

  const startEdit = (mod) => {
    setEditing(mod);
    setForm({ titulo: mod.titulo, descricao: mod.descricao, ordem: mod.ordem });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await adminApi.updateModule(editing.id, form);
        setMessage({ tipo: 'sucesso', texto: 'Módulo atualizado.' });
      } else {
        await adminApi.createModule(cursoId, form);
        setMessage({ tipo: 'sucesso', texto: 'Módulo criado.' });
      }
      await loadModules();
    } catch {
      setMessage({ tipo: 'erro', texto: 'Falha ao salvar módulo.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este módulo?')) return;
    try {
      await adminApi.deleteModule(id);
      setMessage({ tipo: 'sucesso', texto: 'Módulo excluído.' });
      await loadModules();
    } catch {
      setMessage({ tipo: 'erro', texto: 'Erro ao excluir.' });
    }
  };

  const goToLessons = (moduloId) => {
    navigate(`/admin/cursos/${cursoId}/modulos/${moduloId}/aulas`);
  };

  return (
    <div className="module-editor">
      <h2>Gerenciar Módulos</h2>
      {message && (
        <div className={message.tipo === 'sucesso' ? 'msg-success' : 'msg-error'}>{message.texto}</div>
      )}
      <button onClick={startCreate} className="btn-primary">+ Novo Módulo</button>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Título</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id}>
                <td>{m.ordem}</td>
                <td>{m.titulo}</td>
                <td>{m.descricao}</td>
                <td>
                  <button onClick={() => goToLessons(m.id)} className="btn-small">Aulas</button>
                  <button onClick={() => startEdit(m)} className="btn-small">Editar</button>
                  <button onClick={() => handleDelete(m.id)} className="btn-small btn-danger">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {/* Form */}
      <div className="module-form">
        <h3>{editing ? 'Editar Módulo' : 'Criar Módulo'}</h3>
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
            Descrição:
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </label>
          <label>
            Ordem:
            <input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value, 10) })}
              required
            />
          </label>
          <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Criar'}</button>
        </form>
      </div>
    </div>
  );
}
