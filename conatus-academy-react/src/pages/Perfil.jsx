import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

function formatPhone(val) {
  return val.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

// Mesma regra de senha forte exigida pelo backend.
function senhaForte(senha) {
  return typeof senha === 'string'
    && senha.length >= 8
    && /[A-Z]/.test(senha)
    && /[a-z]/.test(senha)
    && /[0-9]/.test(senha)
    && /[^A-Za-z0-9]/.test(senha);
}

export function Perfil() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '', cidade: '', estado: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  // Troca de senha
  const [pwForm, setPwForm] = useState({ atual: '', nova: '', confirma: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [showPw, setShowPw] = useState(false);

  function handlePwChange(e) {
    const { name, value } = e.target;
    setPwMsg(null);
    setPwForm(f => ({ ...f, [name]: value }));
  }

  async function handlePwSubmit(e) {
    e.preventDefault();
    setPwMsg(null);

    if (!pwForm.atual) {
      setPwMsg({ type: 'error', text: 'Informe a senha atual.' });
      return;
    }
    if (!senhaForte(pwForm.nova)) {
      setPwMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.' });
      return;
    }
    if (pwForm.nova !== pwForm.confirma) {
      setPwMsg({ type: 'error', text: 'A confirmação não confere com a nova senha.' });
      return;
    }
    if (pwForm.nova === pwForm.atual) {
      setPwMsg({ type: 'error', text: 'A nova senha não pode ser igual à senha atual.' });
      return;
    }

    setPwSaving(true);
    try {
      const data = await api.alterarSenha(pwForm.atual, pwForm.nova);
      setPwForm({ atual: '', nova: '', confirma: '' });
      setPwMsg({ type: 'success', text: data.mensagem || 'Senha alterada com sucesso!' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message || 'Não foi possível alterar a senha.' });
    } finally {
      setPwSaving(false);
    }
  }

  useEffect(() => {
    api.getPerfil()
      .then(data => {
        const a = data.aluno;
        setForm({
          nome: a.nome || '',
          telefone: a.telefone || '',
          endereco: a.endereco || '',
          cidade: a.cidade || '',
          estado: a.estado || '',
        });
      })
      .catch(() => {
        if (user) {
          setForm({
            nome: user.nome || '',
            telefone: user.telefone || '',
            endereco: user.endereco || '',
            cidade: user.cidade || '',
            estado: user.estado || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'telefone') {
      setForm(f => ({ ...f, telefone: formatPhone(value) }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const data = await api.updatePerfil(form);
      const updated = { ...user, ...data.aluno };
      login(updated, sessionStorage.getItem('token'));
      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-body">
        <div className="dashboard-container" style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: 'var(--text-muted)' }}>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-body">
      <div className="dashboard-container" style={{ maxWidth: '640px' }}>
        <header className="welcome-header">
          <h1>Meu Perfil</h1>
          <p>Atualize seus dados cadastrais.</p>
        </header>

        {/* Dados não editáveis */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Dados imutáveis</p>
          <div style={{ display: 'grid', gap: '10px' }}>
            <Row label="E-mail" value={user?.email} />
            <Row label="CPF" value={user?.cpf} />
          </div>
        </div>

        {msg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: msg.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: msg.type === 'success' ? '#065f46' : '#991b1b',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px' }}>
          <Field label="Nome completo" name="nome" value={form.nome} onChange={handleChange} required />
          <Field label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(11) 99999-9999" />
          <Field label="Endereço" name="endereco" value={form.endereco} onChange={handleChange} />
          <Field label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} />

          <div>
            <label style={labelStyle}>Estado</label>
            <select name="estado" value={form.estado} onChange={handleChange} style={inputStyle}>
              <option value="">Selecione</option>
              {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '13px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>

        {/* ── Troca de senha ── */}
        <header className="welcome-header" style={{ marginTop: '40px' }}>
          <h1 style={{ fontSize: '1.4rem' }}>Alterar senha</h1>
          <p>Por segurança, você não pode reutilizar suas últimas senhas.</p>
        </header>

        {pwMsg && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: pwMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: pwMsg.type === 'success' ? '#065f46' : '#991b1b',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            {pwMsg.text}
          </div>
        )}

        <form onSubmit={handlePwSubmit} style={{ display: 'grid', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Senha atual *</label>
            <input type={showPw ? 'text' : 'password'} name="atual" value={pwForm.atual}
              onChange={handlePwChange} autoComplete="current-password" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Nova senha *</label>
            <input type={showPw ? 'text' : 'password'} name="nova" value={pwForm.nova}
              onChange={handlePwChange} autoComplete="new-password"
              placeholder="Mín. 8 caracteres, maiúscula, número e símbolo" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirmar nova senha *</label>
            <input type={showPw ? 'text' : 'password'} name="confirma" value={pwForm.confirma}
              onChange={handlePwChange} autoComplete="new-password" style={inputStyle} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPw} onChange={() => setShowPw(v => !v)} />
            Mostrar senhas
          </label>

          <button
            type="submit"
            disabled={pwSaving}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '13px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: pwSaving ? 'not-allowed' : 'pointer',
              opacity: pwSaving ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {pwSaving ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--text-muted)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--card-bg)',
  color: 'var(--text)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

function Field({ label, name, value, onChange, required, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required && ' *'}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: '60px' }}>{label}:</span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value || '—'}</span>
    </div>
  );
}
