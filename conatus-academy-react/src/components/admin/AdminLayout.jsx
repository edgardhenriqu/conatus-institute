// src/components/admin/AdminLayout.jsx
import { Outlet, Link } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-brand">Conatus Admin</h2>
        <nav className="admin-nav">
          <Link to="/admin/dashboard" className="admin-link">Dashboard</Link>
          <Link to="/admin/alunos" className="admin-link">Alunos</Link>
          <Link to="/admin/cursos" className="admin-link">Cursos</Link>
          <Link to="/admin/certificados" className="admin-link">Certificados</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
