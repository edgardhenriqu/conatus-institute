import { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';

/**
 * Tutor virtual do curso: chat flutuante que responde dúvidas do aluno com base
 * no conteúdo indexado (RAG). Recebe o id numérico do curso (cursos DB).
 */
export function CourseAssistant({ cursoId }) {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, carregando]);

  const enviar = async (e) => {
    e?.preventDefault();
    const texto = pergunta.trim();
    if (!texto || carregando) return;

    setPergunta('');
    setMensagens((m) => [...m, { role: 'user', text: texto }]);
    setCarregando(true);
    try {
      const { resposta, fontes } = await api.perguntarAssistente(cursoId, texto);
      setMensagens((m) => [...m, { role: 'assistant', text: resposta, fontes }]);
    } catch (err) {
      setMensagens((m) => [
        ...m,
        { role: 'assistant', text: err.message || 'Não foi possível responder agora. Tente novamente.', erro: true },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <button
        className="assistant-fab"
        onClick={() => setAberto((o) => !o)}
        aria-label={aberto ? 'Fechar tutor virtual' : 'Abrir tutor virtual'}
        title="Tire dúvidas sobre este curso"
      >
        {aberto ? '✕' : '💬'}
      </button>

      {aberto && (
        <div className="assistant-panel" role="dialog" aria-label="Tutor virtual">
          <header className="assistant-header">
            <span>🎓 Tutor virtual</span>
            <button className="assistant-close" onClick={() => setAberto(false)} aria-label="Fechar">✕</button>
          </header>

          <div className="assistant-body">
            {mensagens.length === 0 && (
              <div className="assistant-intro">
                Olá! Posso ajudar com dúvidas sobre o conteúdo deste curso. Pergunte sobre um
                conceito ou uma aula — respondo com base no material.
              </div>
            )}

            {mensagens.map((m, i) => (
              <div
                key={i}
                className={`assistant-msg assistant-msg--${m.role}${m.erro ? ' assistant-msg--erro' : ''}`}
              >
                <div className="assistant-msg-text">{m.text}</div>
                {m.fontes?.length > 0 && (
                  <div className="assistant-fontes">
                    Fontes: {m.fontes.map((f) => f.titulo).join(' · ')}
                  </div>
                )}
              </div>
            ))}

            {carregando && (
              <div className="assistant-msg assistant-msg--assistant">
                <div className="assistant-typing"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form className="assistant-input" onSubmit={enviar}>
            <input
              type="text"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Digite sua dúvida..."
              maxLength={1000}
              disabled={carregando}
            />
            <button type="submit" disabled={carregando || !pergunta.trim()} aria-label="Enviar">➤</button>
          </form>
          <p className="assistant-disclaimer">
            Respostas geradas por IA com base no material do curso — podem conter erros.
          </p>
        </div>
      )}
    </>
  );
}
