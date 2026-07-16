/**
 * Suporte — rótulos e cores dos chamados (fonte única do front).
 *
 * Os VALORES aqui espelham os CHECKs de server/db/ensureSchema.js e as listas de
 * server/src/routes/suporte.js — mantenha os três em sincronia. Só as cores e os
 * textos em português vivem deste lado.
 *
 * As cores são tokens do design system, não hex: assim os badges acompanham o
 * tema escuro sozinhos.
 */

export const TICKET_STATUS = [
  { value: 'aberto',           label: 'Aberto',           cor: 'var(--info)' },
  { value: 'em_atendimento',   label: 'Em Atendimento',   cor: 'var(--warning)' },
  { value: 'aguardando_aluno', label: 'Aguardando Aluno', cor: 'var(--amber)' },
  { value: 'resolvido',        label: 'Resolvido',        cor: 'var(--success)' },
  { value: 'fechado',          label: 'Fechado',          cor: 'var(--text-muted)' },
];

export const TICKET_PRIORIDADES = [
  { value: 'baixa',   label: 'Baixa',   cor: 'var(--text-muted)' },
  { value: 'media',   label: 'Média',   cor: 'var(--info)' },
  { value: 'alta',    label: 'Alta',    cor: 'var(--warning)' },
  { value: 'urgente', label: 'Urgente', cor: 'var(--danger)' },
];

export const TICKET_CATEGORIAS = [
  { value: 'duvida',           label: 'Dúvida' },
  { value: 'problema_tecnico', label: 'Problema Técnico' },
  { value: 'pagamento',        label: 'Pagamento' },
  { value: 'certificados',     label: 'Certificados' },
  { value: 'matriculas',       label: 'Matrículas' },
  { value: 'outros',           label: 'Outros' },
];

/** Busca em uma das listas acima; devolve o próprio valor quando não encontra. */
function acharEm(lista, value) {
  return lista.find(i => i.value === value) || { value, label: value || '—', cor: 'var(--text-muted)' };
}

export const statusInfo = (v) => acharEm(TICKET_STATUS, v);
export const prioridadeInfo = (v) => acharEm(TICKET_PRIORIDADES, v);
export const categoriaInfo = (v) => acharEm(TICKET_CATEGORIAS, v);

/**
 * Horas até um chamado resolvido fechar sozinho.
 * Espelha HORAS_ATE_FECHAR de server/src/services/fecharChamados.js.
 */
export const HORAS_ATE_FECHAR = 24;

/**
 * Quanto falta para o fechamento automático, em texto.
 *
 * Devolve null quando não há prazo correndo (chamado não resolvido, ou sem a
 * marca de resolução) — o chamador usa isso para não exibir nada.
 *
 * O fechamento é feito por uma varredura a cada 15 min no servidor, então o
 * texto é uma aproximação — daí "em cerca de X", e não uma contagem regressiva
 * ao segundo, que prometeria uma precisão que não existe.
 */
export function prazoFechamento(chamado) {
  if (!chamado || chamado.status !== 'resolvido' || !chamado.resolvido_em) return null;
  const limite = new Date(chamado.resolvido_em).getTime() + HORAS_ATE_FECHAR * 3600_000;
  const faltamMs = limite - Date.now();
  if (faltamMs <= 0) return 'a qualquer momento';
  const horas = Math.floor(faltamMs / 3600_000);
  if (horas >= 1) return `em cerca de ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const minutos = Math.max(Math.floor(faltamMs / 60_000), 1);
  return `em cerca de ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
}

/** Número exibido do chamado: id 42 → "#00042". */
export function numeroChamado(id) {
  return `#${String(id).padStart(5, '0')}`;
}

/** Tamanho legível: 2411724 → "2,3 MB". */
export function tamanhoLegivel(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** Ícone do anexo conforme o tipo, para dar leitura rápida na conversa. */
export function iconeAnexo(tipo = '') {
  if (tipo.startsWith('image/')) return '🖼️';
  if (tipo === 'application/pdf') return '📕';
  if (tipo.includes('word')) return '📘';
  if (tipo.includes('zip')) return '🗜️';
  return '📎';
}

/** Data + hora curtas para a tabela e para o balão do chat. */
export function dataHora(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
