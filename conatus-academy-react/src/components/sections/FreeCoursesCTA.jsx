import { Button } from '../ui/Button';

export function FreeCoursesCTA() {
  return (
    <section className="free-courses-cta">
      <div className="cta-content">
        <h2>Comece agora com nossos cursos gratuitos</h2>
        <p>Aprenda fundamentos essenciais para atuar em ambientes de Data Centers.</p>
        <Button variant="free" to="/cursos#gratuitos" className="btn-cta">
          Ver Cursos Gratuitos
        </Button>
      </div>
    </section>
  );
}
