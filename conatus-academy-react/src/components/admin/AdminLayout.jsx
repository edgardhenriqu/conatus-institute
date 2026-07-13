import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import './AdminLayout.css';

const adminLinks = [
  { to: '/admin/dashboard',    label: '📊 Dashboard' },
  { to: '/admin/alunos',       label: '👥 Alunos' },
  { to: '/admin/cursos',       label: '📚 Cursos' },
  { to: '/admin/avaliacoes',   label: '📝 Avaliações' },
  { to: '/admin/certificados', label: '🏆 Certificados' },
  { to: '/admin/perfil',       label: '👤 Meu Perfil' },
];

const instrutorLinks = [
  { to: '/admin/cursos',     label: '📚 Meus Cursos' },
  { to: '/admin/avaliacoes', label: '📝 Avaliações' },
  { to: '/admin/perfil',     label: '👤 Meu Perfil' },
];

export default function AdminLayout() {
  const { isAdmin } = useAuth();

  const links = isAdmin ? adminLinks : instrutorLinks;
  const brandLabel = isAdmin ? 'Conatus Admin' : 'Área do Instrutor';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand-row">
          <h2 className="admin-brand">{brandLabel}</h2>
          {/* O painel não tem a navbar do site — o alternador de tema vem junto. */}
          <ThemeToggle />
        </div>
        <nav className="admin-nav">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `admin-link${isActive ? ' active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="admin-link admin-back-site">← Voltar ao site</Link>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
