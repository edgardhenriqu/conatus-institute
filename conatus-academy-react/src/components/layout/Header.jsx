import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          <img src="/images/logo-institute.svg" alt="Conatus Institute" className="nav-logo-img" />
        </Link>
        
        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li><Link to="/#sobre" onClick={closeMenu}>Sobre</Link></li>
          <li><Link to="/cursos" onClick={closeMenu}>Cursos</Link></li>
          <li><Link to="/#metodologia" onClick={closeMenu}>Metodologia</Link></li>
          <li><Link to="/#pesquisa" onClick={closeMenu}>Pesquisa</Link></li>
        </ul>

        <div className="nav-actions">
          {/* New Free Courses Button */}
          <Button variant="free" to="/cursos#gratuitos" onClick={closeMenu} className="hidden-mobile">
            <span role="img" aria-label="star">⭐</span> Cursos Gratuitos
          </Button>

          {user ? (
            <>
              <span className="nav-user-greeting hidden-mobile">Olá, {user.nome?.split(' ')[0] || user.email}</span>
              <Button variant="outline" to={isAdmin ? "/admin/dashboard" : "/dashboard"} onClick={closeMenu}>
                Dashboard
              </Button>
              <button 
                onClick={() => { logout(); closeMenu(); }} 
                style={{ color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', fontSize: '1rem' }}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }} onClick={closeMenu}>
                Portal do Aluno
              </Link>
              <Button variant="apply" to="/login" onClick={closeMenu}>
                Matricule-se
              </Button>
            </>
          )}

          <div className={`nav-hamburger ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </nav>
  );
}
