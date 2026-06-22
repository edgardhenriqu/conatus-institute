import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

/* Regras de senha — espelham as do cadastro e do backend. */
function checkPassword(pwd) {
  return {
    length:  pwd.length >= 8,
    upper:   /[A-Z]/.test(pwd),
    lower:   /[a-z]/.test(pwd),
    number:  /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
}

const PASS_RULES = [
  { key: 'length',  label: 'Mínimo 8 caracteres' },
  { key: 'upper',   label: 'Letra maiúscula (A–Z)' },
  { key: 'lower',   label: 'Letra minúscula (a–z)' },
  { key: 'number',  label: 'Número (0–9)' },
  { key: 'special', label: 'Caractere especial (!@#$%...)' },
];

/*
 * ResetPassword
 * -------------
 * Página acessada pelo link de redefinição de senha
 * (/redefinir-senha?token=...). Define uma nova senha via backend.
 */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [senha, setSenha]       = useState('');
  const [confirma, setConfirma] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const checks = checkPassword(senha);
  const pwdOk = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Link de redefinição inválido: token ausente.');
      return;
    }
    if (!pwdOk) {
      setError('A senha não atende aos requisitos de segurança.');
      return;
    }
    if (senha !== confirma) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await api.redefinirSenha(token, senha);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-wrapper">
        <header className="auth-header">
          <Link to="/" className="auth-back-link">← Voltar ao site</Link>
          <div className="auth-logo-wrap">
            <img src="/images/logo-institute.svg" alt="Conatus Institute" className="auth-logo" />
          </div>
        </header>

        <div className="auth-card">
          <div className="auth-form-section">
            {done ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">✅</div>
                <h1 className="auth-title" style={{ marginTop: 12 }}>Senha redefinida!</h1>
                <p className="auth-subtitle">
                  Sua senha foi alterada com sucesso. Você já pode entrar com a nova senha.
                </p>
                <Link to="/login" className="auth-btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                  Ir para o login
                </Link>
              </div>
            ) : (
              <>
                <div className="auth-form-header">
                  <h1 className="auth-title">Criar nova senha</h1>
                  <p className="auth-subtitle">Defina uma nova senha para acessar sua conta.</p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div className="auth-form-group">
                    <label htmlFor="reset-senha" className="auth-label">Nova senha</label>
                    <div className="auth-input-wrapper">
                      <input
                        id="reset-senha" type={showPass ? 'text' : 'password'}
                        className="auth-input" placeholder="Sua nova senha" value={senha}
                        autoComplete="new-password" required aria-required="true"
                        onChange={e => { setError(''); setSenha(e.target.value); }}
                      />
                      <button type="button" className="auth-toggle-pass"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {senha.length > 0 && (
                      <ul className="auth-pass-checklist" role="list" style={{ marginTop: 8 }}>
                        {PASS_RULES.map(r => (
                          <li key={r.key} className={`auth-pass-check-item ${checks[r.key] ? 'ok' : 'fail'}`}>
                            <span className="auth-pass-check-icon" aria-hidden="true">
                              {checks[r.key] ? '✓' : '✗'}
                            </span>
                            {r.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="reset-confirma" className="auth-label">Confirmar nova senha</label>
                    <input
                      id="reset-confirma" type={showPass ? 'text' : 'password'}
                      className="auth-input" placeholder="Repita a nova senha" value={confirma}
                      autoComplete="new-password" required aria-required="true"
                      onChange={e => { setError(''); setConfirma(e.target.value); }}
                    />
                  </div>

                  {error && <div className="auth-error" role="alert">{error}</div>}

                  <button type="submit" className="auth-btn-primary" disabled={loading} aria-busy={loading}>
                    {loading && <span className="auth-spinner" aria-hidden="true" />}
                    {loading ? 'Salvando...' : 'Redefinir senha'}
                  </button>
                </form>

                <p className="auth-switch">
                  <Link to="/login" className="auth-switch-link">← Voltar para o login</Link>
                </p>
              </>
            )}
          </div>
        </div>

        <p className="auth-footer-note">
          © {new Date().getFullYear()} Conatus Institute. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
