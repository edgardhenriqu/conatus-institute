import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/ui/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { VerifyEmail } from './pages/VerifyEmail';
import { ResetPassword } from './pages/ResetPassword';
import { Courses } from './pages/Courses';
import { CourseDetails } from './pages/CourseDetails';
import { CourseViewer } from './pages/CourseViewer';
import { CourseQuiz } from './pages/CourseQuiz';
import { Certificate } from './pages/Certificate';
import { Dashboard } from './pages/Dashboard';
import { Perfil } from './pages/Perfil';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAlunos } from './pages/admin/AdminAlunos';
import { AdminCursos } from './pages/admin/AdminCursos';
import { AdminCertificados } from './pages/admin/AdminCertificados';
import { AdminAvaliacoes } from './pages/admin/AdminAvaliacoes';
import ModuleEditor from './pages/admin/ModuleEditor';
import LessonEditor from './pages/admin/LessonEditor';
import CourseEditor from './pages/admin/CourseEditor';
import AdminLayout from './components/admin/AdminLayout';

function MainLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
      <Router>
        <Routes>
          {/* Main layout — header + footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/cursos" element={<Courses />} />
            <Route path="/cursos/:id" element={<CourseDetails />} />

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
              <Route path="alunos" element={<AdminAlunos />} />
              <Route path="cursos" element={<AdminCursos />} />
              <Route path="certificados" element={<AdminCertificados />} />
              <Route path="avaliacoes" element={<AdminAvaliacoes />} />
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
    </ErrorBoundary>
  );
}

export default App;
