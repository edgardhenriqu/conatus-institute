import { createContext, useState, useEffect, useContext } from 'react';
import { initMopProgress } from '../utils/mopProgress';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token      = localStorage.getItem('token');

    if (!storedUser || !token) {
      initMopProgress(null);
      setLoading(false);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(storedUser);
      initMopProgress(parsed.id);
      setUser(parsed);
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      initMopProgress(null);
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
        localStorage.setItem('user', JSON.stringify(refreshed));
        initMopProgress(refreshed.id);
        setUser(refreshed);
      })
      .catch(() => {/* token expirado ou servidor offline — mantém sessão existente */});
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    initMopProgress(userData.id);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    initMopProgress(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isInstrutor = user?.role === 'instrutor';
  const isStaff = isAdmin || isInstrutor;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isSuperAdmin, isInstrutor, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
