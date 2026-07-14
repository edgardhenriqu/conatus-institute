import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Motor de narração pela voz do NAVEGADOR (Web Speech API).
 *
 * É o plano B: a voz oficial das aulas é a do ElevenLabs (motorAudio.js), gravada
 * no servidor. Este motor entra quando não há áudio gravado — aula narrada antes
 * de a voz existir, síntese que falhou, chave do ElevenLabs ausente. Ele fala o
 * mesmo roteiro, só que com a voz do sistema do aluno.
 *
 * Falamos FRASE A FRASE, não o roteiro inteiro:
 *   1. o Chrome corta utterances longas (~15s) no meio;
 *   2. o respiro entre frases é o que dá o ritmo de instrutor — a Web Speech não
 *      tem SSML, então a pausa é feita aqui, no relógio.
 */

const PAUSA_MS = 350;         // respiro entre frases
const RITMO = 0.95;           // ~140-160 palavras/min nas vozes pt-BR usuais
const MAX_CHARS_FRASE = 220;  // acima disso o Chrome tende a cortar a fala

function emFrases(texto) {
  const frases = (texto || '')
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

/**
 * `roteiros` é a lista de textos, na ordem dos trechos da aula.
 * Avisa o dono (useNarracao) por `aoTerminar(bloco)` e `aoAndar(fracao 0..1)`.
 */
export function useMotorVozNavegador({ roteiros, aoTerminar, aoAndar }) {
  const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const blocos = useMemo(() => roteiros.map(emFrases), [roteiros]);

  const vozRef = useRef(null);
  const timerRef = useRef(null);
  const tocandoRef = useRef(false);   // false = pausado ou parado
  const pontoRef = useRef(null);      // { bloco, frase } de onde o "Retomar" continua

  // Os callbacks mudam de identidade a cada render do dono; guardá-los em refs
  // mantém as funções deste motor estáveis (elas entram em deps lá em cima).
  const fim = useRef(aoTerminar);
  const andar = useRef(aoAndar);
  useEffect(() => {
    fim.current = aoTerminar;
    andar.current = aoAndar;
  }, [aoTerminar, aoAndar]);

  // As vozes chegam de forma assíncrona no Chrome: sem esperar o evento, a
  // primeira fala sairia com a voz padrão do sistema (às vezes em inglês).
  const [, forcarRender] = useState(0);
  useEffect(() => {
    if (!suportado) return undefined;
    const carregar = () => {
      vozRef.current = vozPtBr();
      forcarRender((n) => n + 1);
    };
    carregar();
    window.speechSynthesis.addEventListener('voiceschanged', carregar);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', carregar);
  }, [suportado]);

  const calar = useCallback(() => {
    clearTimeout(timerRef.current);
    if (suportado) window.speechSynthesis.cancel();
  }, [suportado]);

  const falar = useCallback((b, f) => {
    const frases = blocos[b];
    if (!frases) return;

    if (f >= frases.length) {              // trecho terminou
      tocandoRef.current = false;
      pontoRef.current = null;
      fim.current?.(b);
      return;
    }

    pontoRef.current = { bloco: b, frase: f };
    andar.current?.(f / frases.length);

    const fala = new SpeechSynthesisUtterance(frases[f]);
    fala.lang = 'pt-BR';
    fala.rate = RITMO;
    if (vozRef.current) fala.voice = vozRef.current;

    const avancar = () => {
      if (!tocandoRef.current) return;     // pausado/parado no meio da frase
      timerRef.current = setTimeout(() => falar(b, f + 1), PAUSA_MS);
    };

    fala.onend = avancar;

    // 'interrupted'/'canceled' são o nosso próprio cancel() — não são falha.
    fala.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('Narração: falha na frase', f, 'do trecho', b, e.error);
      avancar();                           // pula a frase problemática
    };

    window.speechSynthesis.speak(fala);
  }, [blocos]);

  const tocar = useCallback((b) => {
    if (!suportado || !blocos[b]) return;
    calar();
    tocandoRef.current = true;
    falar(b, 0);
  }, [suportado, blocos, calar, falar]);

  const pausar = useCallback(() => {
    tocandoRef.current = false;
    calar();   // retomamos pela frase inteira, não pelo meio dela
  }, [calar]);

  const retomar = useCallback(() => {
    const ponto = pontoRef.current;
    if (!ponto) return;
    tocandoRef.current = true;
    falar(ponto.bloco, ponto.frase);
  }, [falar]);

  const parar = useCallback(() => {
    tocandoRef.current = false;
    pontoRef.current = null;
    calar();
  }, [calar]);

  useEffect(() => calar, [calar]);   // sair da página não pode deixar a voz falando

  return useMemo(
    () => ({ disponivel: suportado, tocar, pausar, retomar, parar }),
    [suportado, tocar, pausar, retomar, parar],
  );
}
