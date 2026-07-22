import { Carousel } from '../ui/Carousel';
import { Button } from '../ui/Button';

// A home destaca só um recorte de cursos no carrossel. Com o catálogo cheio
// (ex.: os 81 cursos "em breve" de Data Center) passar a lista inteira gerava
// dezenas de pontinhos. Priorizamos os cursos já disponíveis e limitamos o total.
const MAX_DESTAQUES = 9;

export function ProgramsSection({ courses }) {
  const destaques = [...courses]
    .sort((a, b) => Number(a.emBreve) - Number(b.emBreve))
    .slice(0, MAX_DESTAQUES);

  return (
    <section id="cursos" className="section programs-section">
      <div className="section-header" data-reveal>
        <h2>Programas Acadêmicos</h2>
        <p>Nossos cursos são projetados em colaboração com líderes da indústria para atender à demanda crítica do mercado.</p>
      </div>

      <div data-reveal="fade" style={{ '--reveal-delay': '150ms' }}>
        <Carousel items={destaques} variant="home-carousel" />
      </div>

      <div className="section-footer" data-reveal>
        <Button variant="secondary" to="/cursos">Ver Todos os Cursos e Certificações →</Button>
      </div>
    </section>
  );
}
