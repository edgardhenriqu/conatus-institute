import { useCallback, useEffect, useMemo, useRef } from 'react';
import { api } from '../../services/api';

/**
 * Motor de narração pela voz do ELEVENLABS — a voz oficial das aulas.
 *
 * O áudio já existe: foi gravado no servidor quando o instrutor salvou a aula
 * (server/src/services/tts.js). Aqui só baixamos e tocamos a faixa de cada trecho.
 *
 * Baixamos com o token (api.getNarracaoAudio → blob → object URL) em vez de
 * apontar um <audio src="/api/..."> direto: a rota é protegida e a tag <audio>
 * não manda o Authorization. O efeito colateral é bom — a faixa fica em memória,
 * e ouvir o mesmo trecho de novo não bate no servidor.
 *
 * Se o áudio não estiver lá (aula antiga, síntese que falhou), este motor se
 * declara indisponível e a narração cai na voz do navegador (motorVozNavegador).
 */

// A rota do áudio é por id numérico de curso. O viewer estático 'mop-interno' não
// tem áudio a servir (as aulas dele vêm do banco pelo fluxo normal).
const cursoNumerico = (id) => /^\d+$/.test(String(id ?? ''));

export function useMotorAudio({ cursoId, aulaId, narracoes, aoTerminar, aoAndar, aoFalhar }) {
  // Um trecho sem áudio faria a aula alternar de voz no meio. Ou a aula inteira
  // tem áudio gravado, ou o motor inteiro sai de cena.
  const disponivel = cursoNumerico(cursoId)
    && Boolean(aulaId)
    && narracoes.length > 0
    && narracoes.every((n) => n.temAudio);

  const audioRef = useRef(null);
  const urlsRef = useRef(new Map());      // ordem → object URL já baixado
  const pedidosRef = useRef(new Map());   // ordem → download em andamento
  const blocoRef = useRef(null);          // trecho tocando agora
  const tokenRef = useRef(0);             // invalida downloads que perderam a vez

  // Os callbacks mudam de identidade a cada render do dono; guardá-los em refs
  // mantém as funções deste motor estáveis (elas entram em deps lá em cima).
  const fim = useRef(aoTerminar);
  const andar = useRef(aoAndar);
  const falhou = useRef(aoFalhar);
  useEffect(() => {
    fim.current = aoTerminar;
    andar.current = aoAndar;
    falhou.current = aoFalhar;
  }, [aoTerminar, aoAndar, aoFalhar]);

  const elemento = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = 'auto';
      a.onended = () => {
        const b = blocoRef.current;
        blocoRef.current = null;
        if (b !== null) fim.current?.(b);
      };
      a.ontimeupdate = () => {
        if (a.duration > 0) andar.current?.(a.currentTime / a.duration);
      };
      a.onerror = () => {
        if (blocoRef.current !== null) falhou.current?.('o navegador não conseguiu tocar a faixa');
      };
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const baixar = useCallback((ordem) => {
    const prontas = urlsRef.current;
    if (prontas.has(ordem)) return Promise.resolve(prontas.get(ordem));

    const emCurso = pedidosRef.current.get(ordem);
    if (emCurso) return emCurso;

    const pedido = api.getNarracaoAudio(cursoId, aulaId, ordem)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        prontas.set(ordem, url);
        return url;
      })
      .finally(() => pedidosRef.current.delete(ordem));

    pedidosRef.current.set(ordem, pedido);
    return pedido;
  }, [cursoId, aulaId]);

  const tocar = useCallback((b) => {
    if (!disponivel || b >= narracoes.length) return;

    const a = elemento();
    const token = ++tokenRef.current;
    blocoRef.current = b;

    const iniciar = (url) => {
      if (token !== tokenRef.current) return;   // outro trecho foi pedido no meio
      if (a.src !== url) a.src = url;
      a.currentTime = 0;
      a.play().catch((e) => {
        if (token === tokenRef.current) falhou.current?.(e.message);
      });
      // O aluno costuma ouvir em sequência: adianta a faixa seguinte enquanto
      // esta toca, para a emenda entre trechos não ter espera.
      if (b + 1 < narracoes.length) baixar(b + 1).catch(() => {});
    };

    // Faixa já baixada: o play() sai DENTRO do clique. É o que o Safari/iOS
    // exigem para liberar o áudio — um await no meio quebra o vínculo com o
    // gesto do usuário e o play é bloqueado. Só esperamos quando não há jeito.
    const pronta = urlsRef.current.get(b);
    if (pronta) return iniciar(pronta);

    baixar(b)
      .then(iniciar)
      .catch(() => {
        if (token === tokenRef.current) falhou.current?.('não foi possível baixar a faixa');
      });
  }, [disponivel, narracoes.length, elemento, baixar]);

  const pausar = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const retomar = useCallback(() => {
    const a = audioRef.current;
    if (!a || blocoRef.current === null) return;
    a.play().catch((e) => falhou.current?.(e.message));
  }, []);

  const parar = useCallback(() => {
    tokenRef.current += 1;      // um download em voo não pode mais dar play
    blocoRef.current = null;
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
  }, []);

  // Adianta a primeira faixa assim que a aula abre: o clique no megafone toca na
  // hora, sem o aluno esperar o download. As outras vêm sob demanda — uma aula
  // com muitos trechos são vários MB, e ele pode não ouvir nenhum.
  useEffect(() => {
    if (disponivel) baixar(0).catch(() => {});
  }, [disponivel, baixar]);

  // Trocar de aula (ou sair): cala o áudio e devolve a memória das faixas.
  useEffect(() => {
    const prontas = urlsRef.current;
    const pedidos = pedidosRef.current;
    return () => {
      tokenRef.current += 1;
      blocoRef.current = null;

      const a = audioRef.current;
      if (a) {
        // Zerar os handlers ANTES do src: apagar o src dispara onerror, e o
        // motor reportaria uma falha inexistente ao desmontar.
        a.onended = null;
        a.ontimeupdate = null;
        a.onerror = null;
        a.pause();
        a.removeAttribute('src');
        audioRef.current = null;
      }

      prontas.forEach((url) => URL.revokeObjectURL(url));
      prontas.clear();
      pedidos.clear();
    };
  }, [cursoId, aulaId]);

  return useMemo(
    () => ({ disponivel, tocar, pausar, retomar, parar }),
    [disponivel, tocar, pausar, retomar, parar],
  );
}
