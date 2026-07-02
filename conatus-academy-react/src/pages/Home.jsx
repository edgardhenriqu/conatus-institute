import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { HeroSection } from '../components/sections/HeroSection';
import { StatsSection } from '../components/sections/StatsSection';
import { FreeCoursesCTA } from '../components/sections/FreeCoursesCTA';
import { ProgramsSection } from '../components/sections/ProgramsSection';
import { MethodologySection } from '../components/sections/MethodologySection';
import { ProfessorsSection } from '../components/sections/ProfessorsSection';
import { NewsSection } from '../components/sections/NewsSection';
import { api } from '../services/api';
import { staticCourses, normalizeDbCourse } from '../data/courses';
import { canAccessInternalCourse } from '../utils/permissions';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function Home() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);

  useScrollReveal([courses]);

  useEffect(() => {
    async function loadCourses() {
      const availableStatic = staticCourses.filter(c => !c.restrito || canAccessInternalCourse(user));

      try {
        const dbCourses = await api.getCursos();
        setCourses([...dbCourses.map(normalizeDbCourse), ...availableStatic]);
      } catch (err) {
        console.error("Erro ao carregar cursos na home:", err);
        setCourses(availableStatic);
      }
    }
    loadCourses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main>
      <HeroSection />
      <StatsSection />
      
      <section id="sobre" className="section about-section">
        <div className="section-container">
          <div className="about-content" data-reveal="left">
            <h2>Por que o Conatus Institute?</h2>
            <p>Fundado com a missão de elevar o padrão da educação técnica em infraestrutura de TI, o Conatus é referência global em ensino prático e pesquisa aplicada.</p>
            <ul className="academic-list">
              <li>🏛️ <strong>Corpo Docente de Elite:</strong> Engenheiros e pesquisadores com experiência real em hyperscale e edge computing.</li>
              <li>🔬 <strong>Laboratórios de Ponta:</strong> Acesso a ambientes simulados de Tier III e Tier IV para experimentação prática.</li>
              <li>🌍 <strong>Reconhecimento Internacional:</strong> Certificações alinhadas aos padrões Uptime Institute, BICSI e ASHRAE.</li>
            </ul>
          </div>
          <div className="about-image" data-reveal="right">
            <img src="/images/institute-background.png" alt="Conatus Institute" className="about-logo" />
          </div>
        </div>
      </section>

      <ProgramsSection courses={courses} />

      <MethodologySection />

      <ProfessorsSection />

      <FreeCoursesCTA />
      
      <NewsSection />
    </main>
  );
}
