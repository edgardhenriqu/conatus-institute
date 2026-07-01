import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CourseCard } from '../components/ui/CourseCard';
import { PageLoader } from '../components/ui/PageLoader';
import { api } from '../services/api';
import { staticCourses, normalizeDbCourse } from '../data/courses';
import { canAccessInternalCourse } from '../utils/permissions';
import { getStaticEnrollments, calcLessonStats, isCertEligible } from '../utils/mopProgress';
import { mopCourseContent } from '../data/mopCourseContent';

// Curso MOP legado no fluxo estático (localStorage). NÃO incluir o id 6: hoje ele
// é um curso do banco (Huawei Module800). O MOP migrou para o banco (id 1) e usa
// o fluxo normal de matrícula/progresso.
const MOP_IDS = ['mop-interno'];

function CatalogSection({ icon, title, count, children, note }) {
  return (
    <section className="catalog-section">
      <div className="catalog-section-head">
        <h2>{icon} {title}</h2>
        <span className="catalog-count">{count} {count === 1 ? 'curso' : 'cursos'}</span>
      </div>
      {note}
      <div className="free-courses-grid" style={{ padding: 0 }}>
        {children}
      </div>
    </section>
  );
}

export function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState({}); // curso_id → { progresso, status }
  const [loading, setLoading] = useState(true);

  const hasInternalAccess = canAccessInternalCourse(user);

  // Progresso real do MOP (localStorage)
  const mopPct = useMemo(() => {
    const lessons = mopCourseContent.modules.flatMap(m => m.lessons);
    return calcLessonStats(lessons).pct;
  }, []);
  const mopDone = useMemo(() => isCertEligible(mopPct), [mopPct]);

  useEffect(() => {
    async function loadAll() {
      const availableStatic = staticCourses.filter(c => !c.restrito || hasInternalAccess);

      // Catálogo — o backend já filtra publicados/visíveis e cursos internos
      let list = availableStatic;
      try {
        const dbCourses = await api.getCursos();
        list = [...dbCourses.map(normalizeDbCourse), ...availableStatic];
      } catch {
        // servidor offline — usa apenas os cursos estáticos
      }
      setCourses(list);

      // Matrículas (apenas para usuário logado)
      const map = {};
      if (user) {
        try {
          const data = await api.getMatriculas();
          for (const m of data.matriculas || []) {
            map[String(m.curso_id)] = { progresso: m.progresso || 0, status: m.status };
          }
        } catch { /* servidor offline */ }
        for (const m of Object.values(getStaticEnrollments())) {
          const isMop = MOP_IDS.includes(m.curso_id);
          map[String(m.curso_id)] = {
            progresso: isMop ? mopPct : (m.progresso || 0),
            status: m.status,
          };
        }
      }
      setEnrollments(map);
      setLoading(false);
    }
    loadAll();
  }, [user, hasInternalAccess, mopPct]);

  const getEnrollment = (curso) => enrollments[String(curso.id)] || null;
  const isCompleted = (curso) => {
    const e = getEnrollment(curso);
    if (!e) return false;
    if (MOP_IDS.includes(curso.id)) return mopDone;
    return (e.progresso || 0) === 100;
  };

  // Cursos vinculados a fabricantes (empresas) têm sua própria seção agrupada;
  // ficam fora das seções genéricas para não aparecer duplicados.
  const isFabricante = (c) => Array.isArray(c.empresas) && c.empresas.length > 0;
  const catalogo = courses.filter(c => !isFabricante(c));

  const inProgress = catalogo.filter(c => getEnrollment(c) && !isCompleted(c));
  const completed  = catalogo.filter(c => isCompleted(c));
  const notEnrolled = catalogo.filter(c => !getEnrollment(c));
  const freeCourses = notEnrolled.filter(c => c.gratuito);
  const internalCourses = notEnrolled.filter(c => c.restrito);
  const otherCourses = notEnrolled.filter(c => !c.gratuito && !c.restrito);

  // Agrupa os cursos de fabricante por empresa (um curso pode ter mais de uma)
  const fabricantes = Object.values(
    courses.filter(isFabricante).reduce((acc, curso) => {
      for (const emp of curso.empresas) {
        (acc[emp.slug] ||= { nome: emp.nome, slug: emp.slug, cursos: [] }).cursos.push(curso);
      }
      return acc;
    }, {})
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  if (loading) return <PageLoader message="Carregando catálogo de cursos..." />;

  return (
    <div className="cursos-body">
      <div className="container">
        <div className="cursos-header">
          <h1>Catálogo de Cursos</h1>
          <p>Capacitação técnica de alto nível para operação crítica em Data Centers.</p>
        </div>
      </div>

      {/* Cursos em andamento */}
      {inProgress.length > 0 && (
        <CatalogSection icon="📖" title="Continue Aprendendo" count={inProgress.length}>
          {inProgress.map(curso => (
            <CourseCard key={curso.id} curso={curso} enrollment={getEnrollment(curso)} />
          ))}
        </CatalogSection>
      )}

      {/* Cursos concluídos */}
      {completed.length > 0 && (
        <CatalogSection icon="🏆" title="Cursos Concluídos" count={completed.length}>
          {completed.map(curso => (
            <CourseCard key={curso.id} curso={curso}
              enrollment={{ ...getEnrollment(curso), progresso: 100 }} />
          ))}
        </CatalogSection>
      )}

      {/* Cursos gratuitos */}
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
              <CourseCard key={curso.id} curso={curso} />
            ))}
          </div>
        </section>
      )}

      {/* Cursos internos — visíveis apenas para autorizados */}
      {internalCourses.length > 0 && (
        <CatalogSection
          icon="🔐" title="Cursos Internos Conatus" count={internalCourses.length}
          note={(
            <div className="catalog-internal-note">
              <span>🛡️</span>
              <span>
                Treinamentos exclusivos para colaboradores autorizados da Conatus.
                Seu perfil possui acesso liberado.
              </span>
            </div>
          )}
        >
          {internalCourses.map(curso => (
            <CourseCard key={curso.id} curso={curso} />
          ))}
        </CatalogSection>
      )}

      {/* Programas profissionais */}
      {otherCourses.length > 0 && (
        <CatalogSection icon="🎓" title="Programas Profissionais Avançados" count={otherCourses.length}>
          {otherCourses.map(curso => (
            <CourseCard key={curso.id} curso={curso} />
          ))}
        </CatalogSection>
      )}

      {courses.length === 0 && (
        <div className="catalog-section">
          <div className="catalog-empty">
            Nenhum curso disponível no momento. Volte em breve!
          </div>
        </div>
      )}

      {/* Fabricantes — cursos exclusivos por empresa parceira */}
      {fabricantes.length > 0 && (
        <section id="fabricantes" className="free-courses-section">
          <div className="container" style={{ textAlign: 'center' }}>
            <span className="section-badge">🤝 Fabricantes</span>
            <h2 style={{ marginBottom: '10px', fontSize: '2.2rem' }}>Fabricantes</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>
              Cursos exclusivos desenvolvidos em parceria com fabricantes.
            </p>
          </div>
          {fabricantes.map(fab => (
            <div key={fab.slug} className="fabricante-group">
              <div className="container">
                <h3 className="fabricante-group-title">{fab.nome}</h3>
              </div>
              <div className="free-courses-grid">
                {fab.cursos.map(curso => (
                  <CourseCard key={curso.id} curso={curso} enrollment={getEnrollment(curso)} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
