import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Botão flutuante de atalho para os chamados do aluno (/suporte).
 *
 * Fica escondido em quatro situações, e cada uma tem seu motivo:
 *  - visitante deslogado → /suporte é rota protegida; o clique só o jogaria na
 *    tela de login;
 *  - painel administrativo → a barra lateral já tem o item Suporte, com o
 *    contador de pendentes;
 *  - a própria página de suporte → um atalho para onde a pessoa já está;
 *  - sala de aula → o canto inferior direito já é do tutor virtual
 *    (.assistant-fab, em CourseViewer). Dois círculos azuis empilhados no mesmo
 *    ponto confundiriam, e descer este para cima do outro esbarraria no painel
 *    do tutor quando aberto (bottom: 92px).
 */
export function SuporteFab() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;
  if (pathname.startsWith('/admin')) return null;
  if (pathname === '/suporte') return null;
  if (pathname.endsWith('/sala-de-aula')) return null;

  return (
    <Link
      to="/suporte"
      className="suporte-fab"
      title="Suporte — abrir ou acompanhar chamados"
      aria-label="Suporte — abrir ou acompanhar chamados"
    >
      {/* alt vazio + aria-label no link: o ícone é decorativo aqui, e um alt
          repetiria o rótulo que o leitor de tela já anuncia. */}
      <img src="/icone.svg" alt="" width="38" height="38" aria-hidden="true" />
    </Link>
  );
}
