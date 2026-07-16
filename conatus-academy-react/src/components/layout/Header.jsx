import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

// Frequência da consulta ao contador de chamados aguardando o aluno.
const INTERVALO_SUPORTE = 60000;

export function Header() {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aguardando, setAguardando] = useState(0);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Avisa o aluno de que a equipe respondeu: conta os chamados dele em
  // "Aguardando Aluno". Sai do ar quando ninguém está logado.
  useEffect(() => {
    if (!user) { setAguardando(0); return; }
    let vivo = true;

    async function atualizar() {
      if (document.visibilityState !== 'visible') return;
      try {
        const d = await api.getChamadosAguardando();
        if (vivo) setAguardando(d.aguardando || 0);
      } catch {
        /* silencioso: o badge é acessório e não deve virar erro na navbar */
      }
    }

    atualizar();
    const t = setInterval(atualizar, INTERVALO_SUPORTE);
    return () => { vivo = false; clearInterval(t); };
  }, [user]);

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
          {user && (
            <li>
              <Link to="/suporte" onClick={closeMenu} className="nav-suporte-link">
                Suporte
                {aguardando > 0 && (
                  <span className="ticket-contador"
                    title={`${aguardando} chamado(s) com resposta da equipe`}
                    aria-label={`${aguardando} chamados com resposta da equipe`}>
                    {aguardando > 9 ? '9+' : aguardando}
                  </span>
                )}
              </Link>
            </li>
          )}
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
