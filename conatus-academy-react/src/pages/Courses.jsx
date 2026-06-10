import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CourseCard } from '../components/ui/CourseCard';
import { api } from '../services/api';
import { freeCourseIds, staticCourses } from '../data/courses';
import { canAccessInternalCourse } from '../utils/permissions';

export function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function loadCourses() {
      const availableStatic = staticCourses.filter(c => c.tipo !== 'interno' || canAccessInternalCourse(user));

      try {
        const dbCourses = await api.getCursos();
        const formattedDbCourses = dbCourses.map(c => ({
          ...c,
          gratuito: freeCourseIds.includes(c.id),
          image: `images/courses/${c.nome}.png`
        }));
        setCourses([...formattedDbCourses, ...availableStatic]);
      } catch (err) {
        console.error("Erro ao carregar cursos:", err);
        setCourses(availableStatic);
      }
    }
    loadCourses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const freeCourses = courses.filter(c => c.gratuito);
  const otherCourses = courses.filter(c => !c.gratuito);

  return (
    <div className="cursos-body">
      <div className="container">
        <div className="cursos-header">
          <h1>Catálogo de Cursos</h1>
          <p>Capacitação técnica de alto nível para operação crítica em Data Centers.</p>
        </div>
      </div>

      {/* Seção Cursos Gratuitos */}
      {freeCourses.length > 0 && (
        <section id="gratuitos" className="free-courses-section">
          <div className="container" style={{ textAlign: 'center' }}>
            <span className="section-badge">✨ Cursos Gratuitos</span>
            <h2 style={{ marginBottom: '10px', fontSize: '2.2rem' }}>Comece sua jornada sem custo</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
              Acesse nossos conteúdos introdutórios e dê o primeiro passo na sua carreira em Data Centers.
            </p>
          </div>
          
          <div className="free-courses-grid">
            {freeCourses.map(curso => (
              <div key={curso.id} style={{ height: '100%' }}>
                <CourseCard curso={curso} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outros Cursos */}
      <section className="section">
        <div className="container">
          <h2 style={{ marginBottom: '30px', fontSize: '2rem', borderBottom: '2px solid var(--border)', paddingBottom: '15px' }}>
            Programas Profissionais Avançados
          </h2>
          
          <div className="free-courses-grid">
            {otherCourses.map(curso => (
              <div key={curso.id} style={{ height: '100%' }}>
                <CourseCard curso={curso} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
