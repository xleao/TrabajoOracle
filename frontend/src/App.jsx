import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './views/Login';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import AdminPacientes from './views/AdminPacientes';
import AdminMedicos from './views/AdminMedicos';
import AdminHorarios from './views/AdminHorarios';
import AdminUsuarios from './views/AdminUsuarios';
import AdminReportes from './views/AdminReportes';
import AdminEspecialidades from './views/AdminEspecialidades';
import RecepcionAgenda from './views/RecepcionAgenda';
import Notificaciones from './views/Notificaciones';
import MedicoAgenda from './views/MedicoAgenda';

const NotFound = () => <div className="page-content"><h1>404 - No Encontrado</h1></div>;

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        
        {/* Admin Routes */}
        <Route path="admin/pacientes" element={<AdminPacientes />} />
        <Route path="admin/medicos" element={<AdminMedicos />} />
        <Route path="admin/horarios" element={<AdminHorarios />} />
        <Route path="admin/usuarios" element={<AdminUsuarios />} />
        <Route path="admin/reportes" element={<AdminReportes />} />
        <Route path="admin/especialidades" element={<AdminEspecialidades />} />

        {/* Recepcion Routes */}
        <Route path="recepcion/agenda" element={<RecepcionAgenda />} />
        <Route path="recepcion/pacientes" element={<AdminPacientes />} />
        <Route path="recepcion/notificaciones" element={<Notificaciones />} />

        {/* Medico Routes */}
        <Route path="medico/agenda" element={<MedicoAgenda />} />
        
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
