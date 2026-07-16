import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/ui/ProtectedRoute';
import { SuporteFab } from './components/ui/SuporteFab';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { VerifyEmail } from './pages/VerifyEmail';
import { ResetPassword } from './pages/ResetPassword';
import { Courses } from './pages/Courses';
import { Simulacoes } from './pages/Simulacoes';
import { Suporte } from './pages/Suporte';
import { CourseDetails } from './pages/CourseDetails';
import { CourseViewer } from './pages/CourseViewer';
import { CourseQuiz } from './pages/CourseQuiz';
import { Certificate } from './pages/Certificate';
import { ValidarCertificado } from './pages/ValidarCertificado';
import { TermosDeServico } from './pages/legal/TermosDeServico';
import { PoliticaDePrivacidade } from './pages/legal/PoliticaDePrivacidade';
import { Dashboard } from './pages/Dashboard';
import { Perfil } from './pages/Perfil';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAlunos } from './pages/admin/AdminAlunos';
import { AdminCursos } from './pages/admin/AdminCursos';
import { AdminCertificados } from './pages/admin/AdminCertificados';
import { AdminAvaliacoes } from './pages/admin/AdminAvaliacoes';
import { AdminSimulacoes } from './pages/admin/AdminSimulacoes';
import { AdminSuporte } from './pages/admin/AdminSuporte';
import { AdminSuporteDetalhe } from './pages/admin/AdminSuporteDetalhe';
import ModuleEditor from './pages/admin/ModuleEditor';
import LessonEditor from './pages/admin/LessonEditor';
import CourseEditor from './pages/admin/CourseEditor';
import AdminLayout from './components/admin/AdminLayout';

// Rola suavemente até a seção indicada no hash da URL (ex.: /#metodologia).
// Necessário porque o React Router não faz scroll automático em links de âncora.
function ScrollToHash() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const id = hash.slice(1);
    // pequeno atraso para garantir que a seção já foi renderizada
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [hash, pathname]);
  return null;
}

function MainLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      {/* Atalho flutuante para os chamados. Ele mesmo decide quando aparecer
          (só para logado, fora do painel e da sala de aula). */}
      <SuporteFab />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
      <Router>
        <ScrollToHash />
        <Routes>
          {/* Main layout — header + footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/cursos" element={<Courses />} />
            <Route
              path="/simulacoes"
              element={
                <ProtectedRoute>
                  <Simulacoes />
                </ProtectedRoute>
              }
            />
            <Route path="/cursos/:id" element={<CourseDetails />} />
            <Route path="/validar-certificado" element={<ValidarCertificado />} />
            <Route path="/validar-certificado/:codigo" element={<ValidarCertificado />} />
            <Route path="/termos-de-servico" element={<TermosDeServico />} />
            <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/suporte"
              element={
                <ProtectedRoute>
                  <Suporte />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cursos/:id/sala-de-aula"
              element={
                <ProtectedRoute>
                  <CourseViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cursos/:id/avaliacao"
              element={
                <ProtectedRoute>
                  <CourseQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cursos/:id/certificado"
              element={
                <ProtectedRoute>
                  <Certificate />
                </ProtectedRoute>
              }
            />

            {/* Admin/Instrutor routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireStaff={true}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="perfil" element={<Perfil embedded />} />
              <Route path="alunos" element={<AdminAlunos />} />
              <Route path="cursos" element={<AdminCursos />} />
              <Route path="certificados" element={<AdminCertificados />} />
              <Route path="avaliacoes" element={<AdminAvaliacoes />} />
              <Route path="simulacoes" element={<AdminSimulacoes />} />
              {/* Suporte é só do admin-tier: o layout /admin/* aceita instrutor
                  (requireStaff), então estas duas rotas restringem por conta
                  própria. O servidor exige adminMiddleware de qualquer modo. */}
              <Route path="suporte" element={
                <ProtectedRoute requireAdmin={true}><AdminSuporte /></ProtectedRoute>
              } />
              <Route path="suporte/:id" element={
                <ProtectedRoute requireAdmin={true}><AdminSuporteDetalhe /></ProtectedRoute>
              } />
              <Route path="cursos/:cursoId/editar" element={<CourseEditor />} />
              <Route path="cursos/:cursoId/modulos" element={<ModuleEditor />} />
              <Route path="cursos/:cursoId/modulos/:moduloId/aulas" element={<LessonEditor />} />
            </Route>
          </Route>

          {/* Pages without header/footer */}
          <Route path="/login" element={<Login />} />
          <Route path="/verificar-email" element={<VerifyEmail />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
