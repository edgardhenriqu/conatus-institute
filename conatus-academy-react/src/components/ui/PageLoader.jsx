export function PageLoader({ message = 'Carregando...' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="page-loader-spinner" />
      <p>{message}</p>
    </div>
  );
}
