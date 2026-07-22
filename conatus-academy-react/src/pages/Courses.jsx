import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CourseCard } from '../components/ui/CourseCard';
import { PageLoader } from '../components/ui/PageLoader';
import { api } from '../services/api';
import { normalizeDbCourse, NIVEL_LABELS } from '../data/courses';

// Busca sem diferenciar acento/caixa ("eletrica" acha "Elétrica").
const normalizar = (s) =>
  (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

  // Filtros do catálogo (busca por texto + categoria + nível)
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');

  useEffect(() => {
    async function loadAll() {
      // Catálogo — o backend já filtra publicados/visíveis e cursos internos
      let list = [];
      try {
        const dbCourses = await api.getCursos();
        list = dbCourses.map(normalizeDbCourse);
      } catch {
        // servidor offline — catálogo vazio
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
      }
      setEnrollments(map);
      setLoading(false);
    }
    loadAll();
  }, [user]);

  const getEnrollment = (curso) => enrollments[String(curso.id)] || null;
  const isCompleted = (curso) => {
    const e = getEnrollment(curso);
    if (!e) return false;
    return (e.progresso || 0) === 100;
  };

  // Opções dos filtros derivadas do catálogo carregado (só mostra o que existe).
  const categorias = useMemo(
    () => [...new Set(courses.map(c => c.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [courses]
  );
  const niveis = useMemo(
    () => Object.values(NIVEL_LABELS).filter(l => courses.some(c => c.nivel === l)),
    [courses]
  );
  const filtroAtivo = Boolean(busca.trim() || filtroCategoria || filtroNivel);

  // Aplica a busca por texto (nome + categoria + nível) e os filtros de select.
  const filtered = useMemo(() => {
    const termo = normalizar(busca.trim());
    return courses.filter(c => {
      if (filtroCategoria && c.categoria !== filtroCategoria) return false;
      if (filtroNivel && c.nivel !== filtroNivel) return false;
      if (termo) {
        const alvo = normalizar([c.nome, c.categoria, c.nivel].filter(Boolean).join(' '));
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [courses, busca, filtroCategoria, filtroNivel]);

  const limparFiltros = () => { setBusca(''); setFiltroCategoria(''); setFiltroNivel(''); };

  // Cursos "em breve" têm sua própria seção de captação de interesse e ficam
  // fora de todas as outras (não são matriculáveis).
  const emBreveCourses = filtered.filter(c => c.emBreve);
  const disponiveis = filtered.filter(c => !c.emBreve);

  // Cursos vinculados a fabricantes (empresas) têm sua própria seção agrupada;
  // ficam fora das seções genéricas para não aparecer duplicados.
  const isFabricante = (c) => Array.isArray(c.empresas) && c.empresas.length > 0;
  const catalogo = disponiveis.filter(c => !isFabricante(c));

  const inProgress = catalogo.filter(c => getEnrollment(c) && !isCompleted(c));
  const completed  = catalogo.filter(c => isCompleted(c));
  const notEnrolled = catalogo.filter(c => !getEnrollment(c));
  const freeCourses = notEnrolled.filter(c => c.gratuito);
  const internalCourses = notEnrolled.filter(c => c.restrito);
  const otherCourses = notEnrolled.filter(c => !c.gratuito && !c.restrito);

  // Agrupa os cursos de fabricante por empresa (um curso pode ter mais de uma)
  const fabricantes = Object.values(
    disponiveis.filter(isFabricante).reduce((acc, curso) => {
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

        {/* Barra de pesquisa e filtros do catálogo */}
        <div className="catalog-search">
          <div className="catalog-search__field">
            <span className="catalog-search__icon" aria-hidden="true">🔎</span>
            <input
              type="search"
              className="catalog-search__input"
              placeholder="Buscar por nome, categoria ou nível..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              aria-label="Buscar cursos"
            />
          </div>
          <select
            className="catalog-search__select"
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="catalog-search__select"
            value={filtroNivel}
            onChange={e => setFiltroNivel(e.target.value)}
            aria-label="Filtrar por nível"
          >
            <option value="">Todos os níveis</option>
            {niveis.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {filtroAtivo && (
            <button type="button" className="catalog-search__clear" onClick={limparFiltros}>
              Limpar
            </button>
          )}
        </div>
        {filtroAtivo && (
          <p className="catalog-search__result">
            {filtered.length} {filtered.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
          </p>
        )}
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

      {/* Em breve — captação de interesse */}
      {emBreveCourses.length > 0 && (
        <CatalogSection
          icon="📅" title="Em Breve" count={emBreveCourses.length}
          note={(
            <div className="catalog-internal-note">
              <span>🚀</span>
              <span>
                Cursos em desenvolvimento. Clique em <strong>Tenho interesse</strong> para
                ser avisado no lançamento e ajudar a priorizarmos os próximos conteúdos.
              </span>
            </div>
          )}
        >
          {emBreveCourses.map(curso => (
            <CourseCard key={curso.id} curso={curso} />
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

      {courses.length > 0 && filtered.length === 0 && (
        <div className="catalog-section">
          <div className="catalog-empty">
            Nenhum curso encontrado para a busca. <button
              type="button" className="catalog-empty__link" onClick={limparFiltros}>
              Limpar filtros
            </button>
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
