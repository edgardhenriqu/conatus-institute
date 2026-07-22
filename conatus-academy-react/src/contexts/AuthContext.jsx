import { createContext, useState, useEffect, useContext } from 'react';
import { isAdmin as isAdminRole, isSuperAdmin as isSuperAdminRole, isInstrutor as isInstrutorRole, isStaff as isStaffRole, isDiretor as isDiretorRole } from '../utils/permissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const token      = sessionStorage.getItem('token');

    if (!storedUser || !token) {
      setLoading(false);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(storedUser);
      setUser(parsed);
    } catch {
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      setLoading(false);
      return;
    }

    setLoading(false);

    // Atualiza o perfil em segundo plano para refletir mudanças de role feitas pelo admin
    fetch('/api/auth/perfil', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data?.aluno) return;
        const refreshed = { ...parsed, ...data.aluno };
        delete refreshed.senha;
        sessionStorage.setItem('user', JSON.stringify(refreshed));
        setUser(refreshed);
      })
      .catch(() => {/* token expirado ou servidor offline — mantém sessão existente */});
  }, []);

  const login = (userData, token) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  // Regras vêm da fonte única (utils/permissions.js) — não reimplementar aqui.
  const isAdmin = isAdminRole(user);
  const isSuperAdmin = isSuperAdminRole(user);
  const isInstrutor = isInstrutorRole(user);
  const isStaff = isStaffRole(user);
  const isDiretor = isDiretorRole(user);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isSuperAdmin, isInstrutor, isStaff, isDiretor }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
