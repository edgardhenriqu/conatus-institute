import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

/*
 * CaptchaVerification
 * -------------------
 * Etapa antirrobô exibida APÓS o e-mail/senha terem sido validados pelo backend,
 * e ANTES de o usuário entrar no dashboard. Mostra uma imagem (SVG) com letras e
 * números distorcidos; o usuário digita o que vê e o código é conferido no servidor.
 *
 * Props:
 *  - ticket:    ticket de pré-autenticação recebido no login (login fica pendente).
 *  - onSuccess: callback(data) chamado com { aluno, token } quando o CAPTCHA passa.
 *  - onCancel:  callback() para voltar à tela de login (esgotou tentativas/expirou).
 *
 * Segurança: a resposta correta nunca chega ao navegador — só o id opaco do
 * desafio e a imagem. A verificação acontece inteiramente no backend.
 */
const MAX_ATTEMPTS = 3;

export function CaptchaVerification({ ticket, onSuccess, onCancel }) {
  const [image, setImage]       = useState('');     // SVG do desafio atual
  const [captchaId, setCaptchaId] = useState('');   // id opaco do desafio
  const [texto, setTexto]       = useState('');     // o que o usuário digitou
  const [error, setError]       = useState('');
  const [loadingImg, setLoadingImg] = useState(true);
  const [verifying, setVerifying]   = useState(false);
  const [attempts, setAttempts]     = useState(0);  // tentativas já usadas

  const inputRef = useRef(null);

  /* Carrega (ou recarrega) uma nova imagem de verificação. */
  const loadCaptcha = useCallback(async () => {
    setLoadingImg(true);
    setTexto('');
    try {
      const data = await api.getCaptcha();
      setCaptchaId(data.captchaId);
      setImage(data.image);
    } catch {
      setError('Não foi possível carregar a imagem de verificação. Tente novamente.');
    } finally {
      setLoadingImg(false);
      // Devolve o foco ao campo para o usuário digitar imediatamente.
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, []);

  // Carrega a primeira imagem ao montar.
  useEffect(() => { loadCaptcha(); }, [loadCaptcha]);

  /* Botão "Gerar nova imagem". */
  const handleRefresh = () => {
    setError('');
    loadCaptcha();
  };

  /* Envia o código digitado para verificação no backend. */
  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!texto.trim()) {
      setError('Digite o código exibido na imagem.');
      return;
    }

    setVerifying(true);
    try {
      // Usamos fetch direto para poder ler o corpo da resposta (incl. flag "restart").
      const res = await fetch('/api/auth/verificar-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket, captchaId, texto: texto.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        // CAPTCHA correto: libera a sessão e segue para o dashboard.
        onSuccess(data);
        return;
      }

      // Ticket expirado/inválido → não adianta tentar de novo: volta ao login.
      if (data.restart) {
        onCancel(data.erro || 'Sessão expirada. Faça login novamente.');
        return;
      }

      // Código incorreto: conta a tentativa e, se exceder o limite, volta ao login.
      const used = attempts + 1;
      setAttempts(used);
      if (used >= MAX_ATTEMPTS) {
        onCancel('Número máximo de tentativas excedido. Faça login novamente.');
        return;
      }

      const restantes = MAX_ATTEMPTS - used;
      setError(`${data.erro || 'Código incorreto.'} Tentativas restantes: ${restantes}.`);
      loadCaptcha(); // gera uma nova imagem (o desafio anterior já foi consumido)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="auth-form-section">
      <div className="auth-form-header">
        <h1 className="auth-title">Verificação de segurança</h1>
        <p className="auth-subtitle">Confirme que você não é um robô para continuar.</p>
      </div>

      <form onSubmit={handleVerify} noValidate>
        {/* Imagem do CAPTCHA */}
        <div className="captcha-image-box" aria-live="polite">
          {loadingImg ? (
            <span className="auth-spinner auth-spinner--dark" aria-label="Carregando imagem..." />
          ) : (
            // O SVG vem do backend e não contém a resposta — apenas o desenho.
            <div
              className="captcha-image"
              role="img"
              aria-label="Código de verificação"
              dangerouslySetInnerHTML={{ __html: image }}
            />
          )}
        </div>

        {/* Link "Gerar nova imagem" */}
        <div className="captcha-refresh-row">
          <button
            type="button"
            className="captcha-refresh-link"
            onClick={handleRefresh}
            disabled={loadingImg || verifying}
          >
            ↻ Gerar nova imagem
          </button>
        </div>

        {/* Campo para digitar o código */}
        <div className="auth-form-group">
          <label htmlFor="captcha-input" className="auth-label">Digite o código da imagem</label>
          <input
            id="captcha-input"
            ref={inputRef}
            type="text"
            className="auth-input captcha-input-field"
            placeholder="Ex.: A7K2Q"
            value={texto}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            maxLength={8}
            onChange={e => { setError(''); setTexto(e.target.value.toUpperCase()); }}
          />
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <button type="submit" className="auth-btn-primary" disabled={verifying || loadingImg} aria-busy={verifying}>
          {verifying && <span className="auth-spinner" aria-hidden="true" />}
          {verifying ? 'Verificando...' : 'Verificar'}
        </button>
      </form>

      <div className="auth-security">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
        </svg>
        Verificação de segurança da Conatus Institute
      </div>

      <p className="auth-switch">
        <button type="button" className="auth-switch-link" onClick={() => onCancel()}>
          ← Voltar para o login
        </button>
      </p>
    </div>
  );
}
