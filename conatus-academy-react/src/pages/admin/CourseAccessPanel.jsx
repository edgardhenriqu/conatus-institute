import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

const MODOS = [
  { value: 'publico',  titulo: 'Público',  desc: 'Qualquer usuário pode acessar o curso.' },
  { value: 'restrito', titulo: 'Restrito',  desc: 'Somente quem satisfizer as regras abaixo.' },
  { value: 'pago',     titulo: 'Pago',      desc: 'Mediante pagamento (em breve).', disabled: true },
];

/**
 * Painel de Controle de Acesso do curso: modo (público/restrito/pago) +
 * regras cumulativas (funcionários Conatus, empresas parceiras, usuários).
 * Toda a persistência passa pelos endpoints /admin/.../acesso.
 */
export default function CourseAccessPanel({ courseId }) {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [acesso, setAcesso] = useState('publico');
  const [funcionarios, setFuncionarios] = useState(false);
  const [empresasSel, setEmpresasSel] = useState([]);   // ids selecionados
  const [empresas, setEmpresas] = useState([]);          // catálogo de fabricantes
  const [usuarios, setUsuarios] = useState([]);
  const [authEmail, setAuthEmail] = useState('');
  const [novaEmpresa, setNovaEmpresa] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cat, acc] = await Promise.all([
        adminApi.getCompanies(),
        adminApi.getCourseAccess(courseId),
      ]);
      setEmpresas(cat.empresas || []);
      setAcesso(acc.acesso || 'publico');
      setFuncionarios(Boolean(acc.funcionarios));
      setEmpresasSel(acc.empresas || []);
      setUsuarios(acc.usuarios || []);
    } catch {
      toast.error('Erro ao carregar as regras de acesso.');
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => { load(); }, [load]);

  const toggleEmpresa = (id) => {
    setEmpresasSel(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };

  const handleDeleteCompany = async (emp) => {
    if (!window.confirm(
      `Excluir o fabricante "${emp.nome}" do catálogo?\n\n` +
      'Ele será removido das regras de acesso de TODOS os cursos que o utilizam.'
    )) return;
    try {
      await adminApi.deleteCompany(emp.id);
      setEmpresas(list => list.filter(x => x.id !== emp.id));
      setEmpresasSel(sel => sel.filter(x => x !== emp.id));
      toast.success(`Fabricante "${emp.nome}" removido.`);
    } catch (err) {
      toast.error(err.message || 'Erro ao remover fabricante.');
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    const nome = novaEmpresa.trim();
    if (!nome) return;
    try {
      const data = await adminApi.createCompany(nome);
      if (data.erro) { toast.error(data.erro); return; }
      setEmpresas(list => [...list, data.empresa].sort((a, b) => a.nome.localeCompare(b.nome)));
      setEmpresasSel(sel => [...sel, data.empresa.id]); // já deixa marcada
      setNovaEmpresa('');
      toast.success(`Fabricante "${data.empresa.nome}" adicionado. Lembre de salvar o acesso.`);
    } catch (err) {
      toast.error(err.message || 'Erro ao adicionar fabricante.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.saveCourseAccess(courseId, {
        acesso,
        funcionarios: acesso === 'restrito' ? funcionarios : false,
        empresas: acesso === 'restrito' ? empresasSel : [],
      });
      toast.success('Regras de acesso salvas!');
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar as regras de acesso.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    try {
      const data = await adminApi.addCourseUser(courseId, authEmail.trim());
      if (data.erro) { toast.error(data.erro); return; }
      toast.success(`Acesso liberado para ${data.autorizado.nome}.`);
      setAuthEmail('');
      const acc = await adminApi.getCourseAccess(courseId);
      setUsuarios(acc.usuarios || []);
    } catch (err) {
      toast.error(err.message || 'Erro ao autorizar usuário.');
    }
  };

  const handleRemoveUser = async (alunoId, nome) => {
    if (!window.confirm(`Remover o acesso de ${nome} a este curso?`)) return;
    try {
      await adminApi.removeCourseUser(courseId, alunoId);
      toast.success('Autorização removida.');
      setUsuarios(us => us.filter(u => u.id !== alunoId));
    } catch {
      toast.error('Erro ao remover autorização.');
    }
  };

  if (loading) {
    return <div className="ce-empty-small"><p>Carregando regras de acesso...</p></div>;
  }

  const restrito = acesso === 'restrito';

  return (
    <div className="ce-form">
      <div className="ce-section">
        <h3 className="ce-section__title">Acesso ao Curso</h3>

        {/* Modo de acesso */}
        <div className="cap-modos">
          {MODOS.map(m => (
            <label key={m.value}
              className={`cap-modo ${acesso === m.value ? 'cap-modo--ativo' : ''} ${m.disabled ? 'cap-modo--off' : ''}`}>
              <input type="radio" name="acesso" value={m.value}
                checked={acesso === m.value} disabled={m.disabled}
                onChange={() => setAcesso(m.value)} />
              <span className="cap-modo__titulo">{m.titulo}</span>
              <span className="cap-modo__desc">{m.desc}</span>
            </label>
          ))}
        </div>

        {/* Regras cumulativas — só quando restrito */}
        {restrito && (
          <div className="cap-regras">
            <p className="cap-regras__hint">
              As regras são <strong>cumulativas</strong>: quem satisfizer qualquer uma delas terá acesso.
            </p>

            <label className="cap-check cap-check--destaque">
              <input type="checkbox" checked={funcionarios}
                onChange={e => setFuncionarios(e.target.checked)} />
              <span>Funcionários Conatus</span>
            </label>

            <div className="cap-bloco">
              <span className="cap-bloco__titulo">Empresas autorizadas</span>
              {empresas.length === 0 ? (
                <p className="cap-vazio">Nenhuma empresa cadastrada.</p>
              ) : (
                <div className="cap-empresas">
                  {empresas.map(emp => (
                    <div key={emp.id} className="cap-empresa-item">
                      <label className="cap-check">
                        <input type="checkbox"
                          checked={empresasSel.includes(emp.id)}
                          onChange={() => toggleEmpresa(emp.id)} />
                        <span>{emp.nome}</span>
                      </label>
                      {isAdmin && (
                        <button type="button" className="cap-empresa-del"
                          title={`Excluir ${emp.nome} do catálogo`}
                          onClick={() => handleDeleteCompany(emp)}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <form onSubmit={handleAddCompany} className="cap-nova-empresa">
                  <input type="text" value={novaEmpresa}
                    onChange={e => setNovaEmpresa(e.target.value)}
                    placeholder="Adicionar fabricante (ex.: ABB)" />
                  <button type="submit" className="ce-btn ce-btn--secondary ce-btn--sm">
                    + Adicionar
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        <div className="ce-save-bar">
          <button onClick={handleSave} disabled={saving} className="ce-btn ce-btn--primary">
            {saving ? 'Salvando...' : '💾 Salvar Acesso'}
          </button>
        </div>
      </div>

      {/* Usuários específicos — só fazem sentido no modo restrito */}
      {restrito && (
        <div className="ce-section">
          <h3 className="ce-section__title">Usuários específicos ({usuarios.length})</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
            Libere o acesso individual a este curso para usuários já cadastrados.
          </p>
          <form onSubmit={handleAddUser} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input type="email" value={authEmail} className="admin-search"
              onChange={e => setAuthEmail(e.target.value)}
              placeholder="E-mail do usuário cadastrado" style={{ flex: 1, minWidth: '240px' }} />
            <button type="submit" className="ce-btn ce-btn--primary">Adicionar</button>
          </form>

          {usuarios.length === 0 ? (
            <div className="ce-empty-small"><p>Nenhum usuário liberado individualmente.</p></div>
          ) : (
            <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Autorizado em</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{u.autorizado_em ? new Date(u.autorizado_em).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>
                      <button className="ce-btn ce-btn--danger ce-btn--sm"
                        onClick={() => handleRemoveUser(u.id, u.nome)}>
                        Remover acesso
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
