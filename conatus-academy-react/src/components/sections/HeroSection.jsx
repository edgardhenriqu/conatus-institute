import { Button } from '../ui/Button';

export function HeroSection() {
  return (
    <header className="hero">
      <div className="hero-overlay"></div>
      <div className="data-lines"></div>
      <div className="data-particles"></div>
      <div className="hero-content">
        <h1>Formando a Próxima Geração de Líderes e Especialistas em Infraestrutura Física de Data Centers.</h1>
        <p>Excelência acadêmica, pesquisa avançada e laboratórios de ponta. Prepare-se para operar os data centers que movem o mundo digital.</p>
        <div className="hero-buttons">
          <Button variant="primary" to="/cursos">Explorar Programas Acadêmicos</Button>
          <Button variant="secondary" to="/#sobre">Sobre o Instituto</Button>
        </div>
      </div>
    </header>
  );
}
