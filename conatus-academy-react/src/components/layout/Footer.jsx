import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-col">
          <h4>Conatus Institute</h4>
          <p>Educação e Pesquisa em Infraestrutura Crítica</p>
          <p>© 2026 Todos os direitos reservados.</p>
        </div>
        <div className="footer-col">
          <h4>Certificados</h4>
          <p><Link to="/validar-certificado">Validar certificado</Link></p>
        </div>
        <div className="footer-col">
          <h4>Contato</h4>
          <p>Sede Digital - Ensino Remoto Global</p>
          <p>giovanni.silva@conatusprocedures.com</p>
          <p>+55 (11) 91230-1413</p>
        </div>
      </div>

      <div className="footer-legal">
        <nav className="footer-legal-links" aria-label="Links institucionais">
          <Link to="/termos-de-servico">Termos de Serviço</Link>
          <span aria-hidden="true">•</span>
          <Link to="/politica-de-privacidade">Política de Privacidade</Link>
        </nav>
      </div>
    </footer>
  );
}
