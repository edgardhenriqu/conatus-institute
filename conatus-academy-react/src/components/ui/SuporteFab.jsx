import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

// Frequência da consulta ao contador de chamados aguardando o aluno.
const INTERVALO_SUPORTE = 60000;

/**
 * Botão flutuante de atalho para o suporte (/suporte).
 *
 * Aparece TAMBÉM para quem não tem conta: /suporte é rota aberta e mostra o
 * formulário público a quem chega sem sessão. Para o aluno logado é o único
 * acesso ao suporte (não há item no menu), então ele carrega o aviso de que a
 * equipe respondeu — sem isso não sobraria nenhum sinal de resposta.
 *
 * Fica escondido em três situações, e cada uma tem seu motivo:
 *  - painel administrativo → a barra lateral já tem o item Suporte, com o
 *    contador de pendentes;
 *  - a própria página de suporte (e a conversa do visitante) → um atalho para
 *    onde a pessoa já está;
 *  - sala de aula → o canto inferior direito já é do tutor virtual
 *    (.assistant-fab, em CourseViewer). Dois círculos azuis empilhados no mesmo
 *    ponto confundiriam, e descer este para cima do outro esbarraria no painel
 *    do tutor quando aberto (bottom: 92px).
 */
export function SuporteFab() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [aguardando, setAguardando] = useState(0);

  const escondido =
    pathname.startsWith('/admin') ||
    pathname === '/suporte' ||
    pathname.startsWith('/chamado/') ||
    pathname.endsWith('/sala-de-aula');

  // Conta os chamados do aluno em "Aguardando Aluno" (a equipe respondeu).
  // O efeito precisa vir ANTES de qualquer return: hook não pode ficar depois
  // de uma saída condicional. Por isso a consulta é guardada, em vez de o
  // componente sair mais cedo — assim nada é consultado nas telas em que o
  // botão nem aparece.
  //
  // Visitante fica de fora: a rota do contador exige token e devolveria 401 a
  // cada minuto. O aviso dele é o e-mail.
  useEffect(() => {
    if (escondido || !user) { setAguardando(0); return; }
    let vivo = true;

    async function buscar() {
      try {
        const d = await api.getChamadosAguardando();
        if (vivo) setAguardando(d.aguardando || 0);
      } catch {
        /* silencioso: o aviso é acessório e não deve virar erro na tela */
      }
    }

    // A primeira busca é incondicional. A página pode ter carregado numa aba em
    // segundo plano (Ctrl+clique, sessão restaurada com várias abas): checar a
    // visibilidade aqui descartaria essa busca e deixaria o aluno sem o aviso
    // até o próximo tique.
    buscar();

    // Os tiques periódicos, sim, pulam enquanto a aba está oculta — ninguém
    // está lendo, e é o que evita dezenas de requisições em aba esquecida.
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') buscar();
    }, INTERVALO_SUPORTE);

    // Ao voltar para a aba, revalida na hora em vez de esperar até 60s com um
    // número possivelmente velho na tela.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') buscar();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [escondido, user]);

  if (escondido) return null;

  const rotulo = aguardando > 0
    ? `Suporte — ${aguardando} chamado(s) com resposta da equipe`
    : user
      ? 'Suporte — abrir ou acompanhar chamados'
      : 'Suporte — fale com a nossa equipe';

  return (
    <Link to="/suporte" className="suporte-fab" title={rotulo} aria-label={rotulo}>
      {/* alt vazio + aria-label no link: o ícone é decorativo aqui, e um alt
          repetiria o rótulo que o leitor de tela já anuncia. */}
      <img src="/icone.svg" alt="" width="38" height="38" aria-hidden="true" />
      {aguardando > 0 && (
        <span className="suporte-fab-badge" aria-hidden="true">
          {aguardando > 9 ? '9+' : aguardando}
        </span>
      )}
    </Link>
  );
}
