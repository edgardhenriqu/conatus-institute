import { Link } from 'react-router-dom';

export function Button({ 
  children, 
  variant = 'primary', 
  to, 
  href,
  onClick, 
  className = '', 
  type = 'button',
  ...props 
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary-action';
      case 'secondary': return 'btn-secondary';
      case 'outline': return 'btn-outline';
      case 'fill': return 'btn-fill';
      case 'free': return 'btn-free-courses';
      case 'apply': return 'btn-apply';
      case 'submit': return 'btn-submit';
      default: return 'btn-primary-action';
    }
  };

  const classes = `${getVariantClass()} ${className}`.trim();

  if (to) {
    return <Link to={to} className={classes} {...props}>{children}</Link>;
  }

  if (href) {
    return <a href={href} className={classes} {...props}>{children}</a>;
  }

  return (
    <button type={type} onClick={onClick} className={classes} {...props}>
      {children}
    </button>
  );
}
