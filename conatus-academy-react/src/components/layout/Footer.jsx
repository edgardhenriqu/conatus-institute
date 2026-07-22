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
          <h4>Suporte</h4>
          <p>Central de Ajuda</p>
          <p>suporte.ti@conatusprocedures.com</p>
          {/* /suporte é rota aberta e se adapta sozinha: o visitante cai no
              formulário público e o aluno logado vê/abre os próprios chamados —
              por isso o mesmo destino serve aos dois estados de sessão. */}
          <p><Link to="/suporte">Abrir Chamado</Link></p>
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
