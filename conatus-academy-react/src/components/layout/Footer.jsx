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
          <h4>Acadêmico</h4>
          <Link to="/cursos">Catálogo de Cursos</Link>
          <a href="#">Calendário Acadêmico</a>
          <a href="#">Biblioteca Digital</a>
          <a href="#">Corpo Docente</a>
        </div>
      
        <div className="footer-col">
          <h4>Contato</h4>
          <p>Sede Digital - Ensino Remoto Global</p>
          <p>giovanni.silva@conatusprocedures.com</p>
          <p>+55 (11) 91230-1413</p>
        </div>
      </div>
    </footer>
  );
}
