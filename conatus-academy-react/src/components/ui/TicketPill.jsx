import { statusInfo, prioridadeInfo } from '../../utils/suporte';

/**
 * Pílula de status ou prioridade de um chamado.
 *
 * A cor viaja como a custom property --pill-cor: o CSS (.ticket-pill) deriva
 * dela o texto, o fundo e a borda, então não há uma classe por status nem hex
 * espalhado pelas telas.
 *
 * <TicketPill tipo="status" valor="aberto" />
 * <TicketPill tipo="prioridade" valor="urgente" />
 */
export function TicketPill({ tipo = 'status', valor }) {
  const info = tipo === 'prioridade' ? prioridadeInfo(valor) : statusInfo(valor);
  return (
    <span className="ticket-pill" style={{ '--pill-cor': info.cor }}>
      {info.label}
    </span>
  );
}
