import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { CaptchaVerification } from './CaptchaVerification';

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

/* ── Formatters ───────────────────────────────────────────────── */
function formatCpf(val) {
  return val.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

function formatPhone(val) {
  return val.replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

function formatCep(val) {
  return val.replace(/\D/g, '')
    .replace(/(\d{5})(\d{1,3})/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

/* ── Password strength ────────────────────────────────────────── */
function checkPassword(pwd) {
  return {
    length:  pwd.length >= 8,
    upper:   /[A-Z]/.test(pwd),
    lower:   /[a-z]/.test(pwd),
    number:  /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
}

function strengthLevel(checks) {
  const score = Object.values(checks).filter(Boolean).length;
  if (score <= 1) return { label: 'Muito fraca',  level: 1, color: '#dc2626' };
  if (score === 2) return { label: 'Fraca',        level: 2, color: '#f97316' };
  if (score === 3) return { label: 'Moderada',     level: 3, color: '#eab308' };
  if (score === 4) return { label: 'Boa',          level: 4, color: '#84cc16' };
  return              { label: 'Forte',            level: 5, color: '#16a34a' };
}

const PASS_RULES = [
  { key: 'length',  label: 'Mínimo 8 caracteres' },
  { key: 'upper',   label: 'Letra maiúscula (A–Z)' },
  { key: 'lower',   label: 'Letra minúscula (a–z)' },
  { key: 'number',  label: 'Número (0–9)' },
  { key: 'special', label: 'Caractere especial (!@#$%...)' },
];

/* ── Validators ──────────────────────────────────────────────── */
function isValidCpf(cpf) {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +n[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +n[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +n[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === +n[10];
}

function isValidPhone(phone) {
  const n = phone.replace(/\D/g, '');
  if (n.length < 10 || n.length > 11) return false;
  const ddd = parseInt(n.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (n.length === 11 && n[2] !== '9') return false;
  return true;
}

/* ── ViaCEP ───────────────────────────────────────────────────── */
async function fetchViaCep(cep) {
  const raw = cep.replace(/\D/g, '');
  if (raw.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
    const data = await res.json();
    return data.erro ? null : data;
  } catch {
    return null;
  }
}

/* ── Component ────────────────────────────────────────────────── */
export function Login() {
  const [isLogin, setIsLogin]   = useState(true);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [cepLoading, setCepLoading]   = useState(false);
  const [cepError, setCepError]       = useState('');
  const [cpfStatus, setCpfStatus]     = useState(null); // null | true | false
  const [phoneStatus, setPhoneStatus] = useState(null);
  const { login } = useAuth();
  const navigate  = useNavigate();

  /* Login state */
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  /* CAPTCHA step — ticket de pré-autenticação enquanto o login fica pendente.
     Guardado apenas em memória (nunca em storage). */
  const [pendingTicket, setPendingTicket] = useState(null);

  /* Register state */
  const [cep, setCep] = useState('');
  const [regData, setRegData] = useState({
    nome: '', email: '', senha: '', cpf: '',
    data_nascimento: '', telefone: '',
    endereco: '', cidade: '', estado: '',
  });

  const enderecoRef = useRef(null);

  const setReg = (field, value) => {
    setError('');
    setRegData(prev => ({ ...prev, [field]: value }));
  };

  const switchForm = (toLogin) => {
    setIsLogin(toLogin);
    setError('');
    setShowPass(false);
    setCepError('');
    setCpfStatus(null);
    setPhoneStatus(null);
  };

  /* ── CEP lookup ─────────────────────────────────────────────── */
  const handleCepChange = async (raw) => {
    const formatted = formatCep(raw);
    setCep(formatted);
    setCepError('');

    const digits = formatted.replace(/\D/g, '');
    if (digits.length < 8) return;

    setCepLoading(true);
    const data = await fetchViaCep(digits);
    setCepLoading(false);

    if (!data) {
      setCepError('CEP não encontrado. Verifique e tente novamente.');
      return;
    }

    const endereco = [data.logradouro, data.bairro].filter(Boolean).join(', ');
    setRegData(prev => ({
      ...prev,
      endereco: endereco || prev.endereco,
      cidade:   data.localidade || prev.cidade,
      estado:   data.uf          || prev.estado,
    }));

    // Mover foco para o campo Endereço para o usuário completar o número
    setTimeout(() => enderecoRef.current?.focus(), 50);
  };

  /* Conclui a sessão e redireciona conforme o papel do usuário. */
  const finishLogin = (data) => {
    login(data.aluno, data.token);
    navigate(['admin', 'superadmin'].includes(data.aluno.role) ? '/admin/dashboard' : '/dashboard');
  };

  /* ── Login submit ───────────────────────────────────────────── */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !senha) {
      setError('Preencha o e-mail e a senha para continuar.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login(email, senha);
      if (data.erro) { setError(data.erro); return; }
      // Credenciais corretas: o backend NÃO libera o acesso ainda — exige a
      // verificação antirrobô. Guardamos o ticket e mostramos a etapa do CAPTCHA.
      if (data.captchaRequired && data.ticket) {
        setPendingTicket(data.ticket);
        return;
      }
      // Fallback (compatibilidade): caso o backend já devolva token/aluno direto.
      if (data.token && data.aluno) finishLogin(data);
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /* Volta da etapa de CAPTCHA para o login (cancelar / esgotar tentativas). */
  const handleCaptchaCancel = (msg) => {
    setPendingTicket(null);
    setSenha('');
    setLoading(false);
    if (msg) setError(msg);
  };

  /* ── Register submit ────────────────────────────────────────── */
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const required = [
      ['nome',            'Nome Completo'],
      ['email',           'E-mail'],
      ['senha',           'Senha'],
      ['cpf',             'CPF'],
      ['data_nascimento', 'Data de Nascimento'],
      ['telefone',        'Telefone'],
      ['endereco',        'Endereço'],
      ['cidade',          'Cidade'],
      ['estado',          'Estado'],
    ];

    for (const [field, label] of required) {
      if (!regData[field]?.trim()) {
        setError(`O campo "${label}" é obrigatório.`);
        return;
      }
    }

    if (!cep || cep.replace(/\D/g, '').length < 8) {
      setError('Informe o CEP para continuar.');
      return;
    }

    if (!isValidCpf(regData.cpf)) {
      setError('CPF inválido. Verifique os dígitos informados.');
      setCpfStatus(false);
      return;
    }

    if (!isValidPhone(regData.telefone)) {
      setError('Telefone inválido. Informe o DDD + número: (11) 99999-9999.');
      setPhoneStatus(false);
      return;
    }

    const pwdChecks = checkPassword(regData.senha);
    if (!Object.values(pwdChecks).every(Boolean)) {
      setError('A senha não atende aos requisitos de segurança. Corrija antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.register(regData);
      if (data.erro) { setError(data.erro); return; }
      login(data.aluno, data.token);
      navigate('/dashboard');
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="auth-body">
      <div className={`auth-wrapper ${isLogin ? '' : 'auth-wrapper--register'}`}>

        {/* Header */}
        <header className="auth-header">
          <Link to="/" className="auth-back-link">← Voltar ao site</Link>
          <div className="auth-logo-wrap">
            <img src="/images/logo-institute.svg" alt="Conatus Institute" className="auth-logo" />
          </div>
        </header>

        {/* Card */}
        <div className="auth-card">
          {pendingTicket ? (

            /* ── VERIFICAÇÃO ANTIRROBÔ (CAPTCHA) ──────────────── */
            <CaptchaVerification
              ticket={pendingTicket}
              onSuccess={finishLogin}
              onCancel={handleCaptchaCancel}
            />

          ) : isLogin ? (

            /* ── LOGIN ────────────────────────────────────────── */
            <div className="auth-form-section">
              <div className="auth-form-header">
                <h1 className="auth-title">Acesse sua conta</h1>
                <p className="auth-subtitle">
                  Entre na plataforma da Conatus Institute para continuar seus estudos,
                  acompanhar seus cursos e acessar seus certificados.
                </p>
              </div>

              <div className="auth-hint">
                Use seu e-mail e senha cadastrados para acessar sua área do aluno.
              </div>

              <form onSubmit={handleLoginSubmit} noValidate>
                <div className="auth-form-group">
                  <label htmlFor="login-email" className="auth-label">E-mail</label>
                  <input
                    id="login-email" type="email" className="auth-input"
                    placeholder="seu@email.com" value={email} autoComplete="email"
                    required aria-required="true"
                    onChange={e => { setError(''); setEmail(e.target.value); }}
                  />
                </div>

                <div className="auth-form-group">
                  <label htmlFor="login-senha" className="auth-label">Senha</label>
                  <div className="auth-input-wrapper">
                    <input
                      id="login-senha" type={showPass ? 'text' : 'password'}
                      className="auth-input" placeholder="Sua senha" value={senha}
                      autoComplete="current-password" required aria-required="true"
                      onChange={e => { setError(''); setSenha(e.target.value); }}
                    />
                    <button type="button" className="auth-toggle-pass"
                      onClick={() => setShowPass(v => !v)}
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {error && <div className="auth-error" role="alert">{error}</div>}

                <button type="submit" className="auth-btn-primary" disabled={loading} aria-busy={loading}>
                  {loading && <span className="auth-spinner" aria-hidden="true" />}
                  {loading ? 'Entrando...' : 'Acessar Plataforma'}
                </button>
              </form>

              <div className="auth-security">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
                Acesso seguro e criptografado
              </div>

              <p className="auth-switch">
                Ainda não tem conta?{' '}
                <button type="button" className="auth-switch-link" onClick={() => switchForm(false)}>
                  Cadastre-se aqui
                </button>
              </p>
            </div>

          ) : (

            /* ── CADASTRO ─────────────────────────────────────── */
            <div className="auth-form-section">
              <div className="auth-form-header">
                <h1 className="auth-title">Cadastro de Aluno</h1>
                <p className="auth-subtitle">
                  Preencha todos os dados para criar sua conta no portal de cursos da Conatus Institute.
                  Todos os campos são obrigatórios.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} noValidate>

                {/* ── ACESSO ── */}
                <fieldset className="auth-fieldset">
                  <legend className="auth-fieldset-legend">Dados de Acesso</legend>

                  <div className="auth-form-group">
                    <label htmlFor="reg-nome" className="auth-label">
                      Nome Completo <span className="auth-required" aria-hidden="true">*</span>
                    </label>
                    <input id="reg-nome" type="text" className="auth-input"
                      placeholder="Como você aparecerá na plataforma"
                      value={regData.nome} autoComplete="name" required aria-required="true"
                      onChange={e => setReg('nome', e.target.value)} />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="reg-email" className="auth-label">
                      E-mail <span className="auth-required" aria-hidden="true">*</span>
                    </label>
                    <input id="reg-email" type="email" className="auth-input"
                      placeholder="seu@email.com"
                      value={regData.email} autoComplete="email" required aria-required="true"
                      onChange={e => setReg('email', e.target.value)} />
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="reg-senha" className="auth-label">
                      Senha <span className="auth-required" aria-hidden="true">*</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <input id="reg-senha" type={showPass ? 'text' : 'password'}
                        className="auth-input" placeholder="Mínimo 6 caracteres"
                        value={regData.senha} autoComplete="new-password"
                        minLength={6} required aria-required="true" aria-describedby="senha-hint"
                        onChange={e => setReg('senha', e.target.value)} />
                      <button type="button" className="auth-toggle-pass"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {regData.senha.length > 0 && (() => {
                      const checks = checkPassword(regData.senha);
                      const strength = strengthLevel(checks);
                      return (
                        <div id="senha-hint" className="auth-pass-checker" aria-live="polite">
                          {/* Barra de força */}
                          <div className="auth-pass-bar" aria-hidden="true">
                            {[1,2,3,4,5].map(i => (
                              <div
                                key={i}
                                className="auth-pass-bar-seg"
                                style={{ background: i <= strength.level ? strength.color : undefined }}
                              />
                            ))}
                          </div>
                          <span className="auth-pass-label" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                          {/* Checklist */}
                          <ul className="auth-pass-checklist" role="list">
                            {PASS_RULES.map(r => (
                              <li key={r.key}
                                className={`auth-pass-check-item ${checks[r.key] ? 'ok' : 'fail'}`}>
                                <span className="auth-pass-check-icon" aria-hidden="true">
                                  {checks[r.key] ? '✓' : '✗'}
                                </span>
                                {r.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>
                </fieldset>

                {/* ── PESSOAL ── */}
                <fieldset className="auth-fieldset">
                  <legend className="auth-fieldset-legend">Dados Pessoais</legend>

                  <div className="auth-row">
                    <div className="auth-form-group">
                      <label htmlFor="reg-cpf" className="auth-label">
                        CPF <span className="auth-required" aria-hidden="true">*</span>
                      </label>
                      <div className="auth-cep-wrapper">
                        <input id="reg-cpf" type="text" className="auth-input"
                          placeholder="000.000.000-00" maxLength={14}
                          value={regData.cpf} inputMode="numeric" required aria-required="true"
                          aria-describedby={cpfStatus === false ? 'cpf-error' : undefined}
                          aria-invalid={cpfStatus === false}
                          onChange={e => {
                            const formatted = formatCpf(e.target.value);
                            setReg('cpf', formatted);
                            const digits = formatted.replace(/\D/g, '');
                            setCpfStatus(digits.length === 11 ? isValidCpf(digits) : null);
                          }} />
                        {cpfStatus === true  && <div className="auth-cep-status ok"    aria-hidden="true">✓</div>}
                        {cpfStatus === false && <div className="auth-cep-status error"  aria-hidden="true">✗</div>}
                      </div>
                      {cpfStatus === false && (
                        <p id="cpf-error" className="auth-field-error" role="alert">
                          CPF inválido — os dígitos verificadores não conferem.
                        </p>
                      )}
                    </div>

                    <div className="auth-form-group">
                      <label htmlFor="reg-nasc" className="auth-label">
                        Data de Nascimento <span className="auth-required" aria-hidden="true">*</span>
                      </label>
                      <input id="reg-nasc" type="date" className="auth-input"
                        value={regData.data_nascimento} required aria-required="true"
                        onChange={e => setReg('data_nascimento', e.target.value)} />
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="reg-tel" className="auth-label">
                      Telefone <span className="auth-required" aria-hidden="true">*</span>
                    </label>
                    <div className="auth-cep-wrapper">
                      <input id="reg-tel" type="tel" className="auth-input"
                        placeholder="(11) 99999-9999" maxLength={15}
                        value={regData.telefone} autoComplete="tel" inputMode="numeric"
                        required aria-required="true"
                        aria-describedby={phoneStatus === false ? 'phone-error' : undefined}
                        aria-invalid={phoneStatus === false}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          setReg('telefone', formatted);
                          const digits = formatted.replace(/\D/g, '');
                          setPhoneStatus(digits.length >= 10 ? isValidPhone(digits) : null);
                        }} />
                      {phoneStatus === true  && <div className="auth-cep-status ok"    aria-hidden="true">✓</div>}
                      {phoneStatus === false && <div className="auth-cep-status error"  aria-hidden="true">✗</div>}
                    </div>
                    {phoneStatus === false && (
                      <p id="phone-error" className="auth-field-error" role="alert">
                        Telefone inválido. Use DDD + número: (11) 99999-9999 ou (11) 9999-9999.
                      </p>
                    )}
                  </div>
                </fieldset>

                {/* ── ENDEREÇO ── */}
                <fieldset className="auth-fieldset">
                  <legend className="auth-fieldset-legend">Endereço</legend>

                  {/* CEP com busca */}
                  <div className="auth-form-group">
                    <label htmlFor="reg-cep" className="auth-label">
                      CEP <span className="auth-required" aria-hidden="true">*</span>
                    </label>
                    <div className="auth-cep-wrapper">
                      <input id="reg-cep" type="text" className="auth-input"
                        placeholder="00000-000" maxLength={9}
                        value={cep} inputMode="numeric" required aria-required="true"
                        aria-describedby={cepError ? 'cep-error' : undefined}
                        onChange={e => handleCepChange(e.target.value)} />
                      {cepLoading && (
                        <div className="auth-cep-status loading" aria-live="polite" aria-label="Buscando CEP...">
                          <span className="auth-spinner auth-spinner--dark" aria-hidden="true" />
                        </div>
                      )}
                      {!cepLoading && cep.replace(/\D/g,'').length === 8 && !cepError && regData.cidade && (
                        <div className="auth-cep-status ok" aria-live="polite">✓</div>
                      )}
                    </div>
                    {cepError && (
                      <p id="cep-error" className="auth-field-error" role="alert">{cepError}</p>
                    )}
                    <p className="auth-field-hint">
                      Digite o CEP para preencher o endereço automaticamente.
                    </p>
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="reg-endereco" className="auth-label">
                      Endereço <span className="auth-required" aria-hidden="true">*</span>
                    </label>
                    <input id="reg-endereco" type="text" className="auth-input"
                      placeholder="Rua, número, bairro"
                      value={regData.endereco} autoComplete="street-address"
                      required aria-required="true" ref={enderecoRef}
                      onChange={e => setReg('endereco', e.target.value)} />
                  </div>

                  <div className="auth-row">
                    <div className="auth-form-group">
                      <label htmlFor="reg-cidade" className="auth-label">
                        Cidade <span className="auth-required" aria-hidden="true">*</span>
                      </label>
                      <input id="reg-cidade" type="text" className="auth-input"
                        placeholder="Sua cidade"
                        value={regData.cidade} autoComplete="address-level2"
                        required aria-required="true"
                        onChange={e => setReg('cidade', e.target.value)} />
                    </div>

                    <div className="auth-form-group">
                      <label htmlFor="reg-estado" className="auth-label">
                        Estado <span className="auth-required" aria-hidden="true">*</span>
                      </label>
                      <select id="reg-estado" className="auth-input auth-select"
                        value={regData.estado} autoComplete="address-level1"
                        required aria-required="true"
                        onChange={e => setReg('estado', e.target.value)}>
                        <option value="">Selecione</option>
                        {UF_OPTIONS.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>

                {error && <div className="auth-error" role="alert">{error}</div>}

                <button type="submit" className="auth-btn-primary" disabled={loading} aria-busy={loading}>
                  {loading && <span className="auth-spinner" aria-hidden="true" />}
                  {loading ? 'Criando conta...' : 'Criar Minha Conta'}
                </button>
              </form>

              <p className="auth-switch">
                Já tem conta?{' '}
                <button type="button" className="auth-switch-link" onClick={() => switchForm(true)}>
                  Faça login
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="auth-footer-note">
          © {new Date().getFullYear()} Conatus Institute. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
