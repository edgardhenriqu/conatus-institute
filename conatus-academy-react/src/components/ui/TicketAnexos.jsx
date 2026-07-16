import { useRef } from 'react';
import { iconeAnexo, tamanhoLegivel } from '../../utils/suporte';

/** Tipos aceitos — espelham TIPOS_ANEXO de server/src/routes/suporte.js. */
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.zip';
// Espelham MAX_ANEXOS / MAX_ANEXO_BYTES de server/src/routes/suporte.js.
const MAX_ANEXOS = 5;
const MAX_ANEXO_BYTES = 10 * 1024 * 1024;

/**
 * Seletor de arquivos de uma mensagem.
 *
 * A validação aqui é conveniência (erro na hora, sem esperar o upload subir):
 * quem manda é o servidor, que refaz as mesmas checagens por mimetype.
 */
export function TicketSeletorAnexos({ arquivos, onChange, onErro, disabled }) {
  const inputRef = useRef(null);

  function adicionar(e) {
    const novos = Array.from(e.target.files || []);
    // Limpa o input já: sem isso, escolher o mesmo arquivo duas vezes seguidas
    // não dispara onChange e parece que o clique não funcionou.
    e.target.value = '';
    if (!novos.length) return;

    const grandes = novos.filter(f => f.size > MAX_ANEXO_BYTES);
    if (grandes.length) {
      onErro?.(`${grandes[0].name} passa de 10 MB. Envie um arquivo menor ou compacte em ZIP.`);
      return;
    }
    const total = arquivos.length + novos.length;
    if (total > MAX_ANEXOS) {
      onErro?.(`No máximo ${MAX_ANEXOS} anexos por mensagem.`);
      return;
    }
    onChange([...arquivos, ...novos]);
  }

  function remover(idx) {
    onChange(arquivos.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={adicionar}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="admin-btn"
        style={{ background: 'var(--surface-2)', color: 'var(--text-main)' }}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || arquivos.length >= MAX_ANEXOS}
        title="PDF, DOC, DOCX, imagem ou ZIP — até 10 MB cada"
      >
        📎 Anexar arquivo
      </button>

      {arquivos.length > 0 && (
        <ul className="ticket-anexo-lista">
          {arquivos.map((f, i) => (
            <li key={i} className="ticket-anexo-chip">
              <span>{iconeAnexo(f.type)} {f.name}</span>
              <span className="ticket-anexo-tamanho">{tamanhoLegivel(f.size)}</span>
              <button type="button" onClick={() => remover(i)}
                className="ticket-anexo-remover" title="Remover este anexo"
                aria-label={`Remover ${f.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Anexos já enviados, dentro do balão da conversa.
 * `onBaixar` recebe (id, nome) — o download passa por fetch autenticado, então
 * não dá para usar um <a href> aqui.
 */
export function TicketAnexosEnviados({ anexos, onBaixar }) {
  if (!anexos?.length) return null;
  return (
    <ul className="ticket-anexo-lista ticket-anexo-lista-balao">
      {anexos.map(a => (
        <li key={a.id}>
          <button type="button" className="ticket-anexo-baixar"
            onClick={() => onBaixar(a.id, a.nome)}
            title={`Baixar ${a.nome} (${tamanhoLegivel(a.tamanho)})`}>
            {iconeAnexo(a.tipo)} {a.nome}
            <span className="ticket-anexo-tamanho">{tamanhoLegivel(a.tamanho)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
