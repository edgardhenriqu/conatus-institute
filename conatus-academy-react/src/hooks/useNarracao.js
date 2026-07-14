import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMotorAudio } from './narracao/motorAudio';
import { useMotorVozNavegador } from './narracao/motorVozNavegador';

/**
 * Comando da narração dos blocos marcados com o megafone.
 *
 * Mora num hook, e não dentro do player, porque DOIS lugares comandam a mesma
 * voz: a barra de narração e a própria imagem do megafone dentro do texto da
 * aula, que o aluno clica para ouvir aquele trecho. Um motor por componente
 * faria duas vozes falarem juntas.
 *
 * QUEM FALA
 * A voz oficial é a do ElevenLabs: o áudio é gravado no servidor quando a aula é
 * salva, e todo aluno ouve exatamente a mesma voz (motorAudio.js). Quando a aula
 * não tem áudio gravado — ou quando a faixa não toca no navegador do aluno — a
 * narração cai na voz do sistema dele (motorVozNavegador.js), que era como isso
 * funcionava antes. Melhor uma voz robótica do que aula que não dá para concluir.
 *
 * Este hook não fala: ele guarda O QUE já foi ouvido e manda o motor da vez tocar
 * o trecho certo. A conclusão exige TODOS os trechos ouvidos até o fim
 * (`tudoOuvido`) — é o que libera o botão "Marcar como Concluída".
 */
export function useNarracao({ narracoes, aulaId, cursoId, onConcluir }) {
  const blocos = useMemo(
    () => [...(narracoes || [])].sort((a, b) => a.ordem - b.ordem),
    [narracoes],
  );
  const roteiros = useMemo(() => blocos.map((n) => n.roteiro), [blocos]);
  const totalBlocos = blocos.length;

  const [estado, setEstado] = useState('parado');   // parado | falando | pausado
  const [blocoAtivo, setBlocoAtivo] = useState(null);
  const [fracao, setFracao] = useState(0);          // andamento dentro do trecho
  const [ouvidos, setOuvidos] = useState(() => new Set());
  const [audioFalhou, setAudioFalhou] = useState(false);

  // Lidos de dentro dos callbacks entregues aos motores, que são criados uma vez
  // e capturariam valores velhos se lessem as variáveis de render. O espelho é
  // feito em efeito, e não durante o render: escrever ref no render é proibido
  // pelo React Compiler (e os efeitos rodam antes de qualquer clique do aluno).
  const seguirRef = useRef(false);        // encadear o próximo trecho ao terminar
  const totalRef = useRef(0);
  const blocoRef = useRef(null);
  const motorRef = useRef(null);
  const vozRef = useRef(null);

  const tudoOuvido = totalBlocos > 0 && ouvidos.size === totalBlocos;

  const aoAndar = useCallback((f) => setFracao(f), []);

  const aoTerminar = useCallback((b) => {
    setOuvidos((o) => new Set(o).add(b));
    setFracao(0);

    const proximo = b + 1;
    if (seguirRef.current && proximo < totalRef.current) {
      setBlocoAtivo(proximo);
      setEstado('falando');
      motorRef.current?.tocar(proximo);
      return;
    }

    setEstado('parado');
    setBlocoAtivo(null);
  }, []);

  // O áudio pode falhar no meio da aula (rede caiu, faixa corrompida, navegador
  // recusou o formato). Em vez de deixar o aluno travado, passamos o comando para
  // a voz do navegador e retomamos o MESMO trecho do começo — daqui em diante a
  // aula inteira é falada por ela, para a voz não ficar trocando a cada trecho.
  const aoFalhar = useCallback((motivo) => {
    console.warn(`Narração: áudio indisponível (${motivo}). Usando a voz do navegador.`);
    setAudioFalhou(true);

    const b = blocoRef.current;

    // Nem áudio nem Web Speech: paramos. O efeito de `suportado` mais abaixo
    // libera a conclusão da aula, para o aluno não ficar preso nela.
    if (b === null || !vozRef.current?.disponivel) {
      setEstado('parado');
      setBlocoAtivo(null);
      return;
    }

    setEstado('falando');
    vozRef.current.tocar(b);
  }, []);

  const motorAudio = useMotorAudio({
    cursoId, aulaId, narracoes: blocos, aoTerminar, aoAndar, aoFalhar,
  });
  const motorVoz = useMotorVozNavegador({ roteiros, aoTerminar, aoAndar });

  const motor = motorAudio.disponivel && !audioFalhou ? motorAudio : motorVoz;
  const suportado = motor.disponivel;

  useEffect(() => {
    motorRef.current = motor;
    vozRef.current = motorVoz;
    totalRef.current = totalBlocos;
    blocoRef.current = blocoAtivo;
  }, [motor, motorVoz, totalBlocos, blocoAtivo]);

  // Trocar de aula tem de calar a voz e zerar o que foi ouvido: sem isso a
  // narração da aula anterior continuaria falando por cima da nova, e a aula
  // nova já nasceria "ouvida".
  useEffect(() => {
    const calar = () => motorRef.current?.parar();
    calar();
    seguirRef.current = false;
    setEstado('parado');
    setBlocoAtivo(null);
    setFracao(0);
    setOuvidos(new Set());
    setAudioFalhou(false);
    return calar;
  }, [aulaId]);

  // Sem áudio gravado E sem Web Speech (navegador antigo, navegadores embutidos
  // em apps) o aluno não teria como ouvir — e travar a conclusão o deixaria preso
  // na aula para sempre. Liberamos: a trava é pedagógica, não pode virar armadilha.
  useEffect(() => {
    if (!suportado && totalBlocos > 0) onConcluir?.();
  }, [suportado, totalBlocos, onConcluir]);

  useEffect(() => {
    if (tudoOuvido) onConcluir?.();
  }, [tudoOuvido, onConcluir]);

  /** Ouve um trecho específico (o clique na imagem do megafone). */
  const tocarBloco = useCallback((b) => {
    if (!suportado || b >= totalBlocos) return;
    motor.parar();
    seguirRef.current = false;
    setBlocoAtivo(b);
    setFracao(0);
    setEstado('falando');
    motor.tocar(b);
  }, [suportado, totalBlocos, motor]);

  /** Ouve tudo, do primeiro trecho ainda não ouvido em diante. */
  const tocarTudo = useCallback(() => {
    if (!suportado || !totalBlocos) return;
    const naoOuvido = [...Array(totalBlocos).keys()].find((i) => !ouvidos.has(i));
    const inicio = naoOuvido ?? 0;

    motor.parar();
    seguirRef.current = true;
    setBlocoAtivo(inicio);
    setFracao(0);
    setEstado('falando');
    motor.tocar(inicio);
  }, [suportado, totalBlocos, ouvidos, motor]);

  const pausar = useCallback(() => {
    setEstado('pausado');
    motor.pausar();
  }, [motor]);

  const retomar = useCallback(() => {
    if (blocoAtivo === null) return tocarTudo();
    setEstado('falando');
    motor.retomar();
  }, [blocoAtivo, motor, tocarTudo]);

  /** Encerra a narração e some com o mini-player. O que já foi ouvido continua ouvido. */
  const parar = useCallback(() => {
    motor.parar();
    seguirRef.current = false;
    setEstado('parado');
    setBlocoAtivo(null);
    setFracao(0);
  }, [motor]);

  // Progresso geral: trechos inteiros ouvidos + o quanto já andou no atual.
  const progresso = useMemo(() => {
    if (!totalBlocos) return 0;
    const noAtual = blocoAtivo !== null && !ouvidos.has(blocoAtivo) ? fracao : 0;
    return Math.min(100, Math.round(((ouvidos.size + noAtual) / totalBlocos) * 100));
  }, [totalBlocos, ouvidos, blocoAtivo, fracao]);

  return {
    suportado, estado, blocoAtivo, ouvidos, tudoOuvido, progresso,
    totalBlocos, tocarBloco, tocarTudo, pausar, retomar, parar,
  };
}
