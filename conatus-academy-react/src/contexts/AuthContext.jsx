import { createContext, useState, useEffect, useContext } from 'react';
import { initMopProgress } from '../utils/mopProgress';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const token      = sessionStorage.getItem('token');

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
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
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
        // Preserva todos os campos do storage; atualiza apenas o que o backend retornou
        const refreshed = { ...parsed, ...data.aluno };
        delete refreshed.senha;
        sessionStorage.setItem('user', JSON.stringify(refreshed));
        initMopProgress(refreshed.id);
        setUser(refreshed);
      })
      .catch(() => {/* token expirado ou servidor offline — mantém sessão existente */});
  }, []);

  const login = (userData, token) => {
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('token', token);
    initMopProgress(userData.id);
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    initMopProgress(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
