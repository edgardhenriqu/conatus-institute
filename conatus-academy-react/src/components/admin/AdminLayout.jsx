// src/components/admin/AdminLayout.jsx
import { Outlet, NavLink, Link } from 'react-router-dom';
import './AdminLayout.css';

const links = [
  { to: '/admin/dashboard',    label: '📊 Dashboard' },
  { to: '/admin/alunos',       label: '👥 Alunos' },
  { to: '/admin/cursos',       label: '📚 Cursos' },
  { to: '/admin/avaliacoes',   label: '📝 Avaliações' },
  { to: '/admin/certificados', label: '🏆 Certificados' },
];

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-brand">Conatus Admin</h2>
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
