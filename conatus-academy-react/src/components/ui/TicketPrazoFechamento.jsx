import { prazoFechamento } from '../../utils/suporte';

/**
 * Aviso de que um chamado resolvido vai fechar sozinho.
 *
 * Existe para o fechamento não parecer arbitrário: sem ele, o aluno voltaria
 * dias depois, encontraria o chamado fechado sem explicação e teria perdido, em
 * silêncio, a chance de reabrir respondendo.
 *
 * `paraEquipe` troca o texto: o admin precisa saber que é automático, enquanto
 * o aluno precisa saber o que fazer se ainda tiver dúvida.
 */
export function TicketPrazoFechamento({ chamado, paraEquipe = false }) {
  const prazo = prazoFechamento(chamado);
  if (!prazo) return null;

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--tint-success)',
      border: '1px solid var(--success)',
      fontSize: '0.85rem',
      lineHeight: 1.5,
      color: 'var(--text-main)',
    }}>
      {paraEquipe ? (
        <>Resolvido — fecha automaticamente <strong>{prazo}</strong>. Se o aluno responder antes, o chamado reabre.</>
      ) : (
        <>Este chamado foi resolvido e será fechado <strong>{prazo}</strong>.
          {' '}Ainda precisa de ajuda? <strong>Responda abaixo</strong> que ele reabre.</>
      )}
    </div>
  );
}
