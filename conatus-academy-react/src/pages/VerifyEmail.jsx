import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

/*
 * VerifyEmail
 * -----------
 * Página acessada pelo link enviado no e-mail de confirmação
 * (/verificar-email?token=...). Valida o token no backend e exibe o resultado.
 */
export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [mensagem, setMensagem] = useState('');
  const jaRodou = useRef(false); // evita dupla chamada no StrictMode (dev)

  useEffect(() => {
    if (jaRodou.current) return;
    jaRodou.current = true;

    if (!token) {
      setStatus('error');
      setMensagem('Link de confirmação inválido: token ausente.');
      return;
    }

    api.verificarEmail(token)
      .then(data => {
        setStatus('success');
        setMensagem(data.mensagem || 'E-mail confirmado com sucesso!');
      })
      .catch(err => {
        setStatus('error');
        setMensagem(err.message || 'Não foi possível confirmar seu e-mail.');
      });
  }, [token]);

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
          <div className="auth-form-section" style={{ textAlign: 'center' }}>
            {status === 'loading' && (
              <>
                <span className="auth-spinner auth-spinner--dark" aria-label="Confirmando..." />
                <h1 className="auth-title" style={{ marginTop: 16 }}>Confirmando seu e-mail...</h1>
                <p className="auth-subtitle">Aguarde um instante.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">✅</div>
                <h1 className="auth-title" style={{ marginTop: 12 }}>E-mail confirmado!</h1>
                <p className="auth-subtitle">{mensagem}</p>
                <Link to="/login" className="auth-btn-primary" style={{ display: 'inline-flex', marginTop: 8, textDecoration: 'none' }}>
                  Ir para o login
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">⚠️</div>
                <h1 className="auth-title" style={{ marginTop: 12 }}>Não foi possível confirmar</h1>
                <p className="auth-subtitle">{mensagem}</p>
                <Link to="/login" className="auth-btn-primary" style={{ display: 'inline-flex', marginTop: 8, textDecoration: 'none' }}>
                  Voltar ao login
                </Link>
                <p className="auth-field-hint" style={{ marginTop: 12 }}>
                  Se o link expirou, faça login para solicitar um novo e-mail de confirmação.
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
