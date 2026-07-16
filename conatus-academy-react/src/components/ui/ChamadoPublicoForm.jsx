import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from './Toast';
import { TICKET_CATEGORIAS } from '../../utils/suporte';

/**
 * Abertura de chamado por quem não tem conta.
 *
 * O CAPTCHA é o que segura essa rota aberta: sem ele, um robô abriria chamados
 * em série e ainda dispararia e-mail nosso para endereços arbitrários. A
 * resposta do desafio nunca chega ao navegador — vai só o id opaco e o desenho,
 * e a conferência acontece no servidor (mesmo esquema do login).
 *
 * Como o visitante não faz login, o acesso à conversa depois é pelo link que
 * enviamos por e-mail. Por isso a tela de sucesso insiste no assunto.
 */
export function ChamadoPublicoForm() {
  const toast = useToast();
  const [form, setForm] = useState({
    nome: '', email: '', assunto: '', categoria: 'duvida', mensagem: '',
  });
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImg, setCaptchaImg] = useState('');
  const [captchaTexto, setCaptchaTexto] = useState('');
  const [carregandoImg, setCarregandoImg] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(null); // { numero, link, emailEnviado }
  const captchaRef = useRef(null);

  const carregarCaptcha = useCallback(async () => {
    setCarregandoImg(true);
    setCaptchaTexto('');
    try {
      const d = await api.getCaptcha();
      setCaptchaId(d.captchaId);
      setCaptchaImg(d.image);
    } catch {
      toast.error('Não foi possível carregar a verificação. Recarregue a página.');
    } finally {
      setCarregandoImg(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { carregarCaptcha(); }, [carregarCaptcha]);

  async function handleEnviar(e) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const data = await api.abrirChamadoPublico({ ...form, captchaId, captchaTexto });
      setSucesso(data);
    } catch (err) {
      toast.error(err.message || 'Erro ao abrir o chamado.');
      // O desafio é de uso único: qualquer tentativa o consome no servidor.
      // Sem recarregar, a próxima tentativa falharia com "verificação expirou"
      // mesmo que a pessoa digitasse tudo certo.
      await carregarCaptcha();
      setTimeout(() => captchaRef.current?.focus(), 50);
    } finally {
      setEnviando(false);
    }
  }

  /* ── Chamado aberto ─────────────────────────────────────────── */
  if (sucesso) {
    return (
      <div className="admin-table-container" style={{ maxWidth: '680px', margin: '0 auto 40px', padding: '32px' }}>
        <h2 style={{ marginTop: 0, color: 'var(--success)' }}>✅ Chamado {sucesso.numero} aberto!</h2>

        {sucesso.emailEnviado ? (
          <p style={{ lineHeight: 1.6 }}>
            Enviamos para <strong>{form.email}</strong> um e-mail com o link do seu chamado.
            É por ele que você acompanha e responde a nossa equipe — <strong>guarde essa mensagem</strong>.
            Se não encontrar, confira a caixa de spam.
          </p>
        ) : (
          <>
            {/* O e-mail falhou, mas o chamado existe. Mostrar o link aqui é o que
                evita que a pessoa perca o acesso e abra tudo de novo. */}
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px',
              background: 'var(--tint-warning)', border: '1px solid var(--amber)',
            }}>
              Não conseguimos enviar o e-mail agora, mas seu chamado foi registrado.
              <strong> Salve o link abaixo</strong> — é o seu acesso à conversa.
            </div>
            <p style={{ wordBreak: 'break-all' }}>
              <a href={sucesso.link} style={{ color: 'var(--primary)', fontWeight: 600 }}>{sucesso.link}</a>
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
          <Link to={`/chamado/${sucesso.link.split('/').pop()}`}
            className="admin-btn admin-btn-edit" style={{ padding: '11px 26px' }}>
            Abrir a conversa agora
          </Link>
          <Link to="/" className="admin-btn"
            style={{ padding: '11px 26px', background: 'var(--surface-2)', color: 'var(--text-main)' }}>
            Voltar ao site
          </Link>
        </div>
      </div>
    );
  }

  /* ── Formulário ─────────────────────────────────────────────── */
  return (
    <div className="admin-table-container" style={{ maxWidth: '680px', margin: '0 auto 40px' }}>
      <form onSubmit={handleEnviar} style={{ padding: '28px', display: 'grid', gap: '18px' }}>
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--tint-info)', fontSize: '0.88rem', lineHeight: 1.5,
        }}>
          Já tem conta? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Entre na plataforma</Link>{' '}
          para acompanhar seus chamados direto na sua área — e anexar arquivos.
        </div>

        <div>
          <label className="ticket-filtro-label" htmlFor="p-nome">Seu nome *</label>
          <input id="p-nome" type="text" className="ticket-filtro-campo" required maxLength={150}
            value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div>
          <label className="ticket-filtro-label" htmlFor="p-email">Seu e-mail *</label>
          <input id="p-email" type="email" className="ticket-filtro-campo" required maxLength={255}
            placeholder="para onde enviaremos o link do chamado"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            É por aqui que você receberá o link para acompanhar e responder. Confira antes de enviar.
          </p>
        </div>
        <div>
          <label className="ticket-filtro-label" htmlFor="p-assunto">Assunto *</label>
          <input id="p-assunto" type="text" className="ticket-filtro-campo" required maxLength={200}
            placeholder="Ex.: Dúvida sobre a inscrição no curso de MOP"
            value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} />
        </div>
        <div>
          <label className="ticket-filtro-label" htmlFor="p-categoria">Categoria *</label>
          <select id="p-categoria" className="ticket-filtro-campo" required
            value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
            {TICKET_CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="ticket-filtro-label" htmlFor="p-mensagem">Mensagem *</label>
          <textarea id="p-mensagem" className="ticket-filtro-campo" required rows={6} maxLength={5000}
            style={{ resize: 'vertical' }}
            placeholder="Conte o que você precisa, com o máximo de detalhes que puder."
            value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Para enviar arquivos, <Link to="/login" style={{ color: 'var(--primary)' }}>entre com sua conta</Link>.
            Se preferir, cole um link (Drive, YouTube) na mensagem.
          </p>
        </div>

        {/* ── Verificação antirrobô ── */}
        <div>
          <label className="ticket-filtro-label" htmlFor="p-captcha">Digite o código da imagem *</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="captcha-image-box" aria-live="polite" style={{ margin: 0 }}>
              {carregandoImg ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Carregando…</span>
              ) : (
                // dangerouslySetInnerHTML é seguro aqui: o SVG é desenhado pelo
                // nosso servidor (captcha/svgCaptcha.js) a partir de um alfabeto
                // fixo e aleatoriedade criptográfica — nenhuma entrada de usuário
                // entra nele, e a resposta do desafio nem viaja até o navegador.
                // Mesmo padrão já usado em CaptchaVerification.jsx.
                <div className="captcha-image" role="img" aria-label="Código de verificação"
                  dangerouslySetInnerHTML={{ __html: captchaImg }} />
              )}
            </div>
            <button type="button" className="admin-btn"
              style={{ background: 'var(--surface-2)', color: 'var(--text-main)' }}
              onClick={carregarCaptcha}>
              ↻ Gerar nova imagem
            </button>
          </div>
          <input id="p-captcha" ref={captchaRef} type="text" className="ticket-filtro-campo" required
            autoComplete="off" style={{ marginTop: '10px', maxWidth: '220px', letterSpacing: '2px' }}
            value={captchaTexto} onChange={e => setCaptchaTexto(e.target.value)} />
        </div>

        <div>
          <button type="submit" className="admin-btn admin-btn-edit"
            style={{ padding: '12px 30px' }} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar chamado'}
          </button>
        </div>
      </form>
    </div>
  );
}
