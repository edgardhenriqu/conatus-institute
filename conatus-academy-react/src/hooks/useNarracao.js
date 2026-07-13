import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Motor de fala da narração dos blocos marcados com o megafone.
 *
 * Mora num hook, e não dentro do player, porque DOIS lugares comandam a mesma
 * voz: a barra de narração e a própria imagem do megafone dentro do texto da
 * aula, que o aluno clica para ouvir aquele trecho. Um motor por componente
 * faria duas vozes falarem juntas.
 *
 * A voz é a do navegador (Web Speech API): nenhum áudio é gerado ou trafegado —
 * do servidor vem só o ROTEIRO (texto reescrito por LLM, ver services/narracao.js).
 *
 * Falamos FRASE A FRASE, não o roteiro inteiro:
 *   1. o Chrome corta utterances longas (~15s) no meio;
 *   2. o respiro entre frases é o que dá o ritmo de instrutor — a Web Speech não
 *      tem SSML, então a pausa é feita aqui, no relógio.
 *
 * A conclusão exige TODOS os trechos ouvidos até o fim (`tudoOuvido`) — é o que
 * libera o botão "Marcar como Concluída".
 */

const PAUSA_MS = 350;         // respiro entre frases
const RITMO = 0.95;           // ~140-160 palavras/min nas vozes pt-BR usuais
const MAX_CHARS_FRASE = 220;  // acima disso o Chrome tende a cortar a fala

function emFrases(texto) {
  const frases = texto
    .split(/(?<=[.!?:;])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);

  // Frase comprida (o LLM às vezes emenda ideias): corta na vírgula mais próxima.
  const saida = [];
  for (const frase of frases) {
    if (frase.length <= MAX_CHARS_FRASE) { saida.push(frase); continue; }
    let resto = frase;
    while (resto.length > MAX_CHARS_FRASE) {
      const janela = resto.slice(0, MAX_CHARS_FRASE);
      const corte = Math.max(janela.lastIndexOf(', '), janela.lastIndexOf(' — '));
      const fim = corte > MAX_CHARS_FRASE * 0.4 ? corte + 1 : janela.lastIndexOf(' ');
      saida.push(resto.slice(0, fim).trim());
      resto = resto.slice(fim).trim();
    }
    if (resto) saida.push(resto);
  }
  return saida;
}

/** Voz em português do Brasil, se o sistema do aluno tiver alguma. */
function vozPtBr() {
  const vozes = window.speechSynthesis.getVoices();
  return (
    vozes.find((v) => v.lang?.replace('_', '-') === 'pt-BR') ||
    vozes.find((v) => v.lang?.toLowerCase().startsWith('pt')) ||
    null
  );
}

export function useNarracao({ narracoes, aulaId, onConcluir }) {
  const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Um array de frases por trecho narrado, na ordem do conteúdo da aula.
  const blocos = useMemo(
    () => [...(narracoes || [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((n) => emFrases(n.roteiro)),
    [narracoes],
  );

  const totalBlocos = blocos.length;

  const [estado, setEstado] = useState('parado');   // parado | falando | pausado
  const [blocoAtivo, setBlocoAtivo] = useState(null);
  const [fraseAtual, setFraseAtual] = useState(0);
  const [ouvidos, setOuvidos] = useState(() => new Set());
  const [voz, setVoz] = useState(null);

  const estadoRef = useRef('parado');
  const timerRef = useRef(null);
  const retomarRef = useRef(null);   // { bloco, frase, seguir } para o "Retomar"

  const tudoOuvido = totalBlocos > 0 && ouvidos.size === totalBlocos;

  // As vozes chegam de forma assíncrona no Chrome: sem esperar o evento, a
  // primeira fala sairia com a voz padrão do sistema (às vezes em inglês).
  useEffect(() => {
    if (!suportado) return;
    const carregar = () => setVoz(vozPtBr());
    carregar();
    window.speechSynthesis.addEventListener('voiceschanged', carregar);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', carregar);
  }, [suportado]);

  const calar = useCallback(() => {
    clearTimeout(timerRef.current);
    if (suportado) window.speechSynthesis.cancel();
  }, [suportado]);

  // Trocar de aula tem de calar a voz e zerar o que foi ouvido: sem isso a
  // narração da aula anterior continuaria falando por cima da nova, e a aula
  // nova já nasceria "ouvida".
  useEffect(() => {
    calar();
    estadoRef.current = 'parado';
    setEstado('parado');
    setBlocoAtivo(null);
    setFraseAtual(0);
    setOuvidos(new Set());
    return calar;
  }, [aulaId, calar]);

  // Sem Web Speech (navegador antigo, navegadores embutidos em apps) o aluno não
  // teria como ouvir — e travar a conclusão o deixaria preso na aula para sempre.
  // Liberamos com aviso: a trava é pedagógica, não pode virar uma armadilha.
  useEffect(() => {
    if (!suportado && totalBlocos > 0) onConcluir?.();
  }, [suportado, totalBlocos, onConcluir]);

  useEffect(() => {
    if (tudoOuvido) onConcluir?.();
  }, [tudoOuvido, onConcluir]);

  /** Fala a frase `f` do trecho `b`; ao acabar o trecho, segue para o próximo se `seguir`. */
  const falar = useCallback((b, f, seguir) => {
    const frases = blocos[b];
    if (!frases) return;

    if (f >= frases.length) {                     // trecho terminou
      setOuvidos((o) => new Set(o).add(b));
      const proximo = b + 1;
      if (seguir && proximo < blocos.length) {
        setBlocoAtivo(proximo);
        setFraseAtual(0);
        timerRef.current = setTimeout(() => falar(proximo, 0, true), PAUSA_MS * 2);
        return;
      }
      estadoRef.current = 'parado';
      setEstado('parado');
      setBlocoAtivo(null);
      retomarRef.current = null;
      return;
    }

    retomarRef.current = { bloco: b, frase: f, seguir };
    setBlocoAtivo(b);
    setFraseAtual(f);

    const fala = new SpeechSynthesisUtterance(frases[f]);
    fala.lang = 'pt-BR';
    fala.rate = RITMO;
    if (voz) fala.voice = voz;

    const avancar = () => {
      if (estadoRef.current !== 'falando') return;   // pausado/parado no meio
      timerRef.current = setTimeout(() => falar(b, f + 1, seguir), PAUSA_MS);
    };

    fala.onend = avancar;

    // 'interrupted'/'canceled' são o nosso próprio cancel() — não são falha.
    fala.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('Narração: falha na frase', f, 'do trecho', b, e.error);
      avancar();                                     // pula a frase problemática
    };

    window.speechSynthesis.speak(fala);
  }, [blocos, voz]);

  /** Ouve um trecho específico (o clique na imagem do megafone). */
  const tocarBloco = useCallback((b) => {
    if (!suportado || !blocos[b]) return;
    calar();
    estadoRef.current = 'falando';
    setEstado('falando');
    falar(b, 0, false);
  }, [suportado, blocos, calar, falar]);

  /** Ouve tudo, do primeiro trecho ainda não ouvido em diante. */
  const tocarTudo = useCallback(() => {
    if (!suportado || !totalBlocos) return;
    calar();
    const inicio = blocos.findIndex((_, i) => !ouvidos.has(i));
    estadoRef.current = 'falando';
    setEstado('falando');
    falar(inicio === -1 ? 0 : inicio, 0, true);
  }, [suportado, totalBlocos, blocos, ouvidos, calar, falar]);

  const pausar = useCallback(() => {
    estadoRef.current = 'pausado';
    setEstado('pausado');
    calar();          // retomamos pela frase inteira, não pelo meio dela
  }, [calar]);

  const retomar = useCallback(() => {
    const ponto = retomarRef.current;
    if (!ponto) return tocarTudo();
    estadoRef.current = 'falando';
    setEstado('falando');
    falar(ponto.bloco, ponto.frase, ponto.seguir);
  }, [falar, tocarTudo]);

  /** Encerra a narração e some com o mini-player. O que já foi ouvido continua ouvido. */
  const parar = useCallback(() => {
    calar();
    estadoRef.current = 'parado';
    setEstado('parado');
    setBlocoAtivo(null);
    retomarRef.current = null;
  }, [calar]);

  // Progresso geral: trechos inteiros ouvidos + o quanto já andou no atual.
  const progresso = useMemo(() => {
    if (!totalBlocos) return 0;
    const noAtual = blocoAtivo !== null && !ouvidos.has(blocoAtivo) && blocos[blocoAtivo]?.length
      ? fraseAtual / blocos[blocoAtivo].length
      : 0;
    return Math.min(100, Math.round(((ouvidos.size + noAtual) / totalBlocos) * 100));
  }, [totalBlocos, ouvidos, blocoAtivo, fraseAtual, blocos]);

  return {
    suportado, estado, blocoAtivo, ouvidos, tudoOuvido, progresso,
    totalBlocos, tocarBloco, tocarTudo, pausar, retomar, parar,
  };
}
