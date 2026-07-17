import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatarPreco, formatarParcelamento } from '../../utils/currency';

const MODOS = [
  { value: 'publico',  titulo: 'Público',  desc: 'Qualquer usuário pode acessar o curso.' },
  { value: 'restrito', titulo: 'Restrito',  desc: 'Somente quem satisfizer as regras abaixo.' },
  { value: 'pago',     titulo: 'Pago',      desc: 'Mediante compra do curso.' },
];

const MOEDAS = [{ value: 'BRL', label: 'Real (R$)' }];
const MAX_PARCELAS = 12;

// Config de venda vazia (novo curso / curso nunca precificado).
// Valores monetários ficam como STRING no estado — são campos de digitação;
// a conversão para número acontece só no salvar.
const VENDA_VAZIA = {
  preco: '',
  preco_promocional: '',
  moeda: 'BRL',
  max_parcelas: 1,
  permite_cupom: false,
  mensagem_compra: '',
  a_venda: false,
  ocultar_preco: false,
  destaque_promocao: false,
};

const numOuNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Painel de Controle de Acesso do curso: modo (público/restrito/pago) +
 * regras cumulativas (funcionários Conatus, empresas parceiras, usuários).
 * Toda a persistência passa pelos endpoints /admin/.../acesso.
 */
export default function CourseAccessPanel({ courseId }) {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [acesso, setAcesso] = useState('publico');
  const [venda, setVenda] = useState(VENDA_VAZIA);
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
      if (acc.venda) {
        setVenda({
          ...VENDA_VAZIA,
          ...acc.venda,
          preco: acc.venda.preco ?? '',
          preco_promocional: acc.venda.preco_promocional ?? '',
        });
      }
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

  const setV = (campo, valor) => setVenda(v => ({ ...v, [campo]: valor }));

  // Validação espelho da do servidor (services/payments/compras.js) — o toast
  // aqui é imediato; o servidor revalida de qualquer forma.
  const validarVendaLocal = () => {
    const preco = numOuNull(venda.preco);
    const promo = numOuNull(venda.preco_promocional);
    if (preco === null || Number.isNaN(preco) || preco <= 0) {
      return 'Informe o valor do curso para o modo Pago.';
    }
    if (Number.isNaN(promo)) return 'Valor promocional inválido.';
    if (promo !== null && (promo <= 0 || promo >= preco)) {
      return 'O valor promocional deve ser maior que zero e menor que o valor do curso.';
    }
    return null;
  };

  const handleSave = async () => {
    if (acesso === 'pago') {
      const erro = validarVendaLocal();
      if (erro) { toast.error(erro); return; }
    }
    setSaving(true);
    try {
      await adminApi.saveCourseAccess(courseId, {
        acesso,
        funcionarios: acesso === 'restrito' ? funcionarios : false,
        // O vínculo de fabricante é sempre persistido: serve para agrupar o
        // curso na seção "Fabricantes" do catálogo em QUALQUER modo (inclusive
        // gratuito). Quando o acesso é restrito, também vale como regra de acesso.
        empresas: empresasSel,
        ...(acesso === 'pago' ? {
          venda: {
            ...venda,
            preco: numOuNull(venda.preco),
            preco_promocional: numOuNull(venda.preco_promocional),
          },
        } : {}),
      });
      toast.success(acesso === 'pago'
        ? 'Regras de acesso e configuração de venda salvas!'
        : 'Regras de acesso salvas!');
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
  const pago = acesso === 'pago';
  const precoEfetivo = numOuNull(venda.preco_promocional) ?? numOuNull(venda.preco);

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
              As regras são <strong>cumulativas</strong>: quem satisfizer qualquer uma delas
              (funcionário Conatus, fabricante vinculado abaixo ou usuário liberado) terá acesso.
            </p>

            <label className="cap-check cap-check--destaque">
              <input type="checkbox" checked={funcionarios}
                onChange={e => setFuncionarios(e.target.checked)} />
              <span>Funcionários Conatus</span>
            </label>
          </div>
        )}

        {/* Fabricante — agrupamento na vitrine do catálogo. Vale para QUALQUER
            modo (inclusive gratuito); quando restrito, também libera acesso. */}
        <div className="cap-bloco cap-bloco--fabricante">
          <span className="cap-bloco__titulo">Fabricante (vitrine do catálogo)</span>
          <p className="cap-regras__hint" style={{ margin: '0 0 12px' }}>
            Vincule o curso a um fabricante para exibi-lo na seção <strong>Fabricantes</strong> do
            catálogo — vale para qualquer modo de acesso, inclusive gratuito.
            {restrito && ' Como o acesso é Restrito, os membros do fabricante também terão acesso.'}
          </p>
          {empresas.length === 0 ? (
            <p className="cap-vazio">Nenhum fabricante cadastrado.</p>
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

        {/* Configuração de venda — só quando pago */}
        {pago && (
          <div className="cap-venda">
            <h4 className="cap-venda__titulo">💰 Configuração de Venda</h4>

            <span className="cap-bloco__titulo">Informações do curso</span>
            <div className="cap-venda-grid">
              <label className="cap-venda-campo">
                <span>Valor do curso (R$) *</span>
                <input type="number" min="0.01" max="99999.99" step="0.01"
                  value={venda.preco} placeholder="497,00"
                  onChange={e => setV('preco', e.target.value)} />
              </label>
              <label className="cap-venda-campo">
                <span>Valor promocional (opcional)</span>
                <input type="number" min="0.01" max="99999.99" step="0.01"
                  value={venda.preco_promocional} placeholder="297,00"
                  onChange={e => setV('preco_promocional', e.target.value)} />
              </label>
              <label className="cap-venda-campo">
                <span>Moeda</span>
                <select value={venda.moeda} onChange={e => setV('moeda', e.target.value)}>
                  {MOEDAS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
              <label className="cap-venda-campo">
                <span>Parcelamento máximo</span>
                <select value={venda.max_parcelas}
                  onChange={e => setV('max_parcelas', Number(e.target.value))}>
                  {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}x`}</option>
                  ))}
                </select>
              </label>
            </div>

            {precoEfetivo > 0 && (
              <p className="cap-venda__resumo">
                O aluno verá: <strong>{formatarPreco(precoEfetivo, venda.moeda)}</strong>
                {venda.max_parcelas > 1 && (
                  <> ou <strong>{formatarParcelamento(precoEfetivo, venda.max_parcelas, venda.moeda)}</strong></>
                )}
              </p>
            )}

            <span className="cap-bloco__titulo">Configuração</span>
            <div className="cap-venda-checks">
              <label className="cap-check">
                <input type="checkbox" checked={venda.a_venda}
                  onChange={e => setV('a_venda', e.target.checked)} />
                <span>Curso disponível para compra</span>
              </label>
              <label className="cap-check">
                <input type="checkbox" checked={venda.permite_cupom}
                  onChange={e => setV('permite_cupom', e.target.checked)} />
                <span>Permitir cupom de desconto</span>
              </label>
              <label className="cap-check">
                <input type="checkbox" checked={venda.ocultar_preco}
                  onChange={e => setV('ocultar_preco', e.target.checked)} />
                <span>Ocultar preço (opcional)</span>
              </label>
              <label className="cap-check">
                <input type="checkbox" checked={venda.destaque_promocao}
                  onChange={e => setV('destaque_promocao', e.target.checked)} />
                <span>Destaque de promoção</span>
              </label>
            </div>
            {!venda.a_venda && (
              <p className="cap-venda__aviso">
                Enquanto "disponível para compra" estiver desmarcado, o curso não
                aparece no catálogo para quem ainda não o possui.
              </p>
            )}

            <label className="cap-venda-campo cap-venda-campo--full">
              <span>Mensagem personalizada antes da compra</span>
              <textarea rows={3} maxLength={500}
                value={venda.mensagem_compra}
                placeholder="Curso completo com certificado e acesso vitalício."
                onChange={e => setV('mensagem_compra', e.target.value)} />
            </label>
          </div>
        )}

        <div className="ce-save-bar">
          <button onClick={handleSave} disabled={saving} className="ce-btn ce-btn--primary">
            {saving ? 'Salvando...' : pago ? '💾 Salvar Configuração' : '💾 Salvar Acesso'}
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
