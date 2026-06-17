import { Component } from 'react';

/**
 * Captura erros de renderização e mostra uma mensagem amigável
 * em vez de deixar a tela em branco.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro de renderização capturado:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '70vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px', background: '#f8f9fa',
      }}>
        <div style={{
          maxWidth: '520px', textAlign: 'center', background: '#fff',
          borderRadius: '16px', border: '1px solid #e5e7eb',
          padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#1e293b', marginBottom: '12px', fontSize: '1.4rem' }}>
            Algo deu errado
          </h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '12px' }}>
            Ocorreu um erro inesperado ao exibir esta tela.
            Tente recarregar a página — se o problema persistir, contate o suporte.
          </p>
          <details style={{
            textAlign: 'left', background: '#f8f9fa', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '24px', fontSize: '0.8rem',
            color: '#94a3b8', cursor: 'pointer',
          }}>
            <summary>Detalhes técnicos</summary>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
          <button onClick={this.handleReload} style={{
            display: 'inline-block', padding: '12px 28px', background: '#003366',
            color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.95rem',
          }}>
            ↻ Recarregar página
          </button>
        </div>
      </div>
    );
  }
}
