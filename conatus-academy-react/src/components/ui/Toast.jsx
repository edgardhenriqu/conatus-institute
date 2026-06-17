import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(list => list.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4500) => {
    const id = ++_id;
    setToasts(list => [...list, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value = useMemo(() => ({
    toast,
    success: (msg, d) => toast(msg, 'success', d),
    error:   (msg, d) => toast(msg, 'error', d),
    info:    (msg, d) => toast(msg, 'info', d),
    warning: (msg, d) => toast(msg, 'warning', d),
  }), [toast]);

  const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" aria-label="Fechar">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  // Fallback seguro caso seja usado fora do provider (ex.: testes)
  if (!ctx) {
    const plain = (msg) => window.alert(msg);
    return { toast: plain, success: plain, error: plain, info: plain, warning: plain };
  }
  return ctx;
}
