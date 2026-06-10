import { Carousel } from '../ui/Carousel';
import { Button } from '../ui/Button';

export function ProgramsSection({ courses }) {
  return (
    <section id="cursos" className="section programs-section">
      <div className="section-header">
        <h2>Programas Acadêmicos</h2>
        <p>Nossos cursos são projetados em colaboração com líderes da indústria para atender à demanda crítica do mercado.</p>
      </div>
      
      <Carousel items={courses} variant="home-carousel" />
      
      <div className="section-footer">
        <Button variant="secondary" to="/cursos">Ver Todos os Cursos e Certificações →</Button>
      </div>
    </section>
  );
}
