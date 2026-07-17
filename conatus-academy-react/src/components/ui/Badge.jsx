export function Badge({ children, variant = 'certification' }) {
  const getBadgeClass = () => {
    switch (variant) {
      case 'certification': return 'badge-certification';
      case 'free': return 'badge-free';
      case 'internal': return 'badge-internal';
      case 'paid': return 'badge-paid';
      case 'soon': return 'badge-soon';
      default: return 'badge-certification';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      {children}
    </span>
  );
}
