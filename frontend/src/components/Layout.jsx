import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Calendar,
  Users,
  Stethoscope,
  Clock,
  ShieldCheck,
  BarChart,
  LogOut,
  User as UserIcon,
  Menu,
  BookOpen,
  Bell,
  History,
  Search
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getMenuByRole = () => {
    if (!user) return [];
    
    const role = user.rol?.toUpperCase() || '';
    
    // Rutas comunes
    const adminRoutes = [
      { path: '/dashboard', name: 'Dashboard', icon: <Activity size={20} /> },
      { path: '/admin/pacientes', name: 'Gestión Pacientes', icon: <Users size={20} /> },
      { path: '/admin/medicos', name: 'Gestión Médicos', icon: <Stethoscope size={20} /> },
      { path: '/admin/especialidades', name: 'Especialidades', icon: <BookOpen size={20} /> },
      { path: '/admin/horarios', name: 'Horarios Médicos', icon: <Clock size={20} /> },
      { path: '/admin/usuarios', name: 'Usuarios y Accesos', icon: <ShieldCheck size={20} /> },
      { path: '/admin/reportes', name: 'Reportes Gerenciales', icon: <BarChart size={20} /> },
    ];

    const receptionistRoutes = [
      { path: '/dashboard', name: 'Panel Recepción', icon: <Activity size={20} /> },
      { path: '/recepcion/agenda', name: 'Agendar Cita', icon: <Calendar size={20} /> },
      { path: '/recepcion/pacientes', name: 'Directorio Pacientes', icon: <Users size={20} /> },
      { path: '/recepcion/historial', name: 'Historial Clínico', icon: <History size={20} /> },
      { path: '/recepcion/consultas', name: 'Consultas', icon: <Search size={20} /> },
      { path: '/recepcion/notificaciones', name: 'Notificaciones', icon: <Bell size={20} /> },
      { path: '/recepcion/reportes', name: 'Reportes', icon: <BarChart size={20} /> },
    ];

    const doctorRoutes = [
      { path: '/dashboard', name: 'Inicio', icon: <Activity size={20} /> },
      { path: '/medico/agenda', name: 'Mi Agenda', icon: <Calendar size={20} /> },
    ];

    if (role === 'ADMINISTRADOR') return adminRoutes;
    if (role === 'RECEPCIONISTA') return receptionistRoutes;
    if (role === 'MEDICO') return doctorRoutes;
    
    return [{ path: '/dashboard', name: 'Inicio', icon: <Activity size={20} /> }]; // Fallback
  };

  const menu = getMenuByRole();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ backgroundColor: 'white', color: 'var(--primary-dark)', padding: '6px', borderRadius: '8px' }}>
            <Activity size={24} />
          </div>
          <span className="sidebar-logo">Salud y Vida</span>
        </div>
        
        <nav className="sidebar-nav">
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
            Menú Principal
          </div>
          {menu.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <div className="nav-icon">{item.icon}</div>
              {item.name}
            </Link>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button 
            onClick={handleLogout}
            className="btn" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 1rem', color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.05)' }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          >
            <LogOut size={18} style={{ marginRight: '0.75rem' }} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-ghost" style={{ padding: '0.5rem', borderRadius: '50%' }}>
              <Menu size={24} />
            </button>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary-dark)' }}>
              {menu.find(m => m.path === location.pathname)?.name || 'Sistema de Citas'}
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{user?.nombre}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.rol}</div>
            </div>
            <div style={{ 
              width: '40px', height: '40px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-light)', 
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <UserIcon size={20} />
            </div>
          </div>
        </header>
        
        <div className="page-content" style={{ backgroundColor: 'var(--bg-main)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
