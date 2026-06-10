import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/ui/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Courses } from './pages/Courses';
import { CourseDetails } from './pages/CourseDetails';
import { CourseViewer } from './pages/CourseViewer';
import { CourseQuiz } from './pages/CourseQuiz';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAlunos } from './pages/admin/AdminAlunos';
import { AdminCursos } from './pages/admin/AdminCursos';
import { AdminCertificados } from './pages/admin/AdminCertificados';
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
    <AuthProvider>
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

            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="alunos" element={<AdminAlunos />} />
              <Route path="cursos" element={<AdminCursos />} />
              <Route path="certificados" element={<AdminCertificados />} />
              <Route path="cursos/:cursoId/editar" element={<CourseEditor />} />
              <Route path="cursos/:cursoId/modulos" element={<ModuleEditor />} />
              <Route path="cursos/:cursoId/modulos/:moduloId/aulas" element={<LessonEditor />} />
            </Route>
          </Route>

          {/* Pages without header/footer */}
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
