import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

export function Header() {
  const { user, logout, isAdmin, isStaff } = useAuth();
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
          <li><Link to="/#cursos" onClick={closeMenu}>Cursos</Link></li>
          <li><Link to="/#metodologia" onClick={closeMenu}>Metodologia</Link></li>
          <li><Link to="/#professores" onClick={closeMenu}>Professores</Link></li>
          {user && (
            <li><Link to="/simulacoes" onClick={closeMenu}>Simulações</Link></li>
          )}
          {/* Suporte não entra aqui: o acesso do aluno é pelo botão flutuante
              (SuporteFab), que também carrega o aviso de resposta da equipe. */}
        </ul>

        <div className="nav-actions">
          <ThemeToggle />

          {/* New Free Courses Button */}
          <Button variant="free" to="/cursos#gratuitos" onClick={closeMenu} className="hidden-mobile">
            <span role="img" aria-label="star">⭐</span> Cursos Gratuitos
          </Button>

          {user ? (
            <>
              {/* Saudação só para a equipe (admin/instrutor). O aluno tem o ícone
                  de perfil abaixo, que já representa a área dele — assim a barra
                  não estoura com o link extra "Meu Perfil". */}
              {isStaff && (
                <span className="nav-user-greeting hidden-mobile">Olá, {user.nome?.split(' ')[0] || user.email}</span>
              )}
              <Button variant="outline" to={isAdmin ? "/admin/dashboard" : isStaff ? "/admin/cursos" : "/dashboard"} onClick={closeMenu}>
                {isStaff && !isAdmin ? 'Meu Painel' : 'Dashboard'}
              </Button>
              {!isStaff && (
                <Link to="/perfil" onClick={closeMenu} className="nav-profile-link" title="Meu Perfil" aria-label="Meu Perfil">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2.2c-4.03 0-7.5 2.02-7.5 4.8v1c0 .55.45 1 1 1h13c.55 0 1-.45 1-1v-1c0-2.78-3.47-4.8-7.5-4.8Z" />
                  </svg>
                </Link>
              )}
              <button
                onClick={() => { logout(); closeMenu(); }}
                style={{ color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', fontSize: '1rem' }}
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-login-link" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }} onClick={closeMenu}>
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
