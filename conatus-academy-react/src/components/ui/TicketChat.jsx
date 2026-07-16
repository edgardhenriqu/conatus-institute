import { useRef, useEffect } from 'react';
import { TicketAnexosEnviados } from './TicketAnexos';
import { dataHora } from '../../utils/suporte';

/**
 * Conversa do chamado, do ponto de vista de quem abriu (aluno ou visitante).
 *
 * Não serve ao painel: lá o admin também vê notas internas, que exigem um
 * tratamento próprio (balão tracejado + rótulo). Aqui as internas nem chegam —
 * o servidor as filtra antes.
 *
 * `nomeProprio` é como o autor se vê na conversa ("Você").
 */
export function TicketChat({ mensagens, onBaixarAnexo, nomeProprio = 'Você' }) {
  const chatRef = useRef(null);

  // Rola para a mensagem mais recente, mas só se já estava no fim — com o
  // polling ativo, rolar sempre atrapalharia quem subiu para reler.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const noFim = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (noFim) el.scrollTop = el.scrollHeight;
  }, [mensagens]);

  return (
    <div className="ticket-chat" ref={chatRef}>
      {mensagens.map(m => (
        <div key={m.id}
          className={`ticket-msg ticket-msg-${m.autor_tipo === 'admin' ? 'admin' : 'aluno'}`}>
          {/* Mensagem só com anexo não rende balão de texto vazio. */}
          {(m.mensagem || !m.anexos?.length) && (
            <div className="ticket-balao">{m.mensagem}</div>
          )}
          {m.anexos?.length > 0 && onBaixarAnexo && (
            <div className="ticket-balao" style={{ marginTop: m.mensagem ? '4px' : 0 }}>
              <TicketAnexosEnviados anexos={m.anexos} onBaixar={onBaixarAnexo} />
            </div>
          )}
          <div className="ticket-msg-meta">
            {m.autor_tipo === 'admin' ? (m.autor_nome || 'Equipe Conatus') : nomeProprio}
            {' · '}{dataHora(m.criado_em)}
          </div>
        </div>
      ))}
    </div>
  );
}
