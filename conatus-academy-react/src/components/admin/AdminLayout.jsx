import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/adminApi';
import { ThemeToggle } from '../ui/ThemeToggle';
import './AdminLayout.css';

const adminLinks = [
  { to: '/admin/dashboard',    label: '📊 Dashboard' },
  { to: '/admin/alunos',       label: '👥 Alunos' },
  { to: '/admin/cursos',       label: '📚 Cursos' },
  { to: '/admin/avaliacoes',   label: '📝 Avaliações' },
  { to: '/admin/simulacoes',   label: '🎬 Simulações' },
  // badge: nome do contador exibido ao lado do link (ver contadores abaixo).
  { to: '/admin/suporte',      label: '💬 Suporte', badge: 'pendentes' },
  { to: '/admin/certificados', label: '🏆 Certificados' },
  { to: '/admin/perfil',       label: '👤 Meu Perfil' },
];

const instrutorLinks = [
  { to: '/admin/cursos',     label: '📚 Meus Cursos' },
  { to: '/admin/avaliacoes', label: '📝 Avaliações' },
  { to: '/admin/perfil',     label: '👤 Meu Perfil' },
];

// De quanto em quanto tempo o contador de chamados pendentes é reconsultado.
const INTERVALO_CONTADOR = 60000;

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  const [contadores, setContadores] = useState({ pendentes: 0 });

  const links = isAdmin ? adminLinks : instrutorLinks;
  const brandLabel = isAdmin ? 'Conatus Admin' : 'Área do Instrutor';

  // Chamados pendentes no menu lateral. Só para o admin-tier: a rota exige
  // adminMiddleware e devolveria 403 para o instrutor a cada minuto.
  useEffect(() => {
    if (!isAdmin) return;
    let vivo = true;

    async function buscar() {
      try {
        const d = await adminApi.getSuportePendentes();
        if (vivo) setContadores({ pendentes: d.pendentes || 0 });
      } catch {
        /* silencioso: um contador é acessório e não deve poluir a tela com erro */
      }
    }

    // Primeira busca incondicional: o painel pode ter sido aberto numa aba em
    // segundo plano, e checar a visibilidade aqui deixaria o menu sem contador
    // até o próximo tique.
    buscar();

    // Já os tiques periódicos pulam com a aba oculta — ninguém está lendo.
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') buscar();
    }, INTERVALO_CONTADOR);

    // Voltou para a aba: revalida na hora, em vez de exibir um número velho.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') buscar();
    };
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      vivo = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [isAdmin]);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand-row">
          <h2 className="admin-brand">{brandLabel}</h2>
          {/* O painel não tem a navbar do site — o alternador de tema vem junto. */}
          <ThemeToggle />
        </div>
        <nav className="admin-nav">
          {links.map(l => {
            const contagem = l.badge ? contadores[l.badge] : 0;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `admin-link${isActive ? ' active' : ''}`}
              >
                {l.label}
                {contagem > 0 && (
                  <span className="ticket-contador"
                    aria-label={`${contagem} chamados pendentes`}>
                    {contagem > 99 ? '99+' : contagem}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <Link to="/" className="admin-link admin-back-site">← Voltar ao site</Link>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
