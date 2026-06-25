import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Stethoscope, Lock, User, ArrowRight, Activity } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      if (response.data.success) {
        login(response.data.user, response.data.token);
        navigate('/');
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(3,150,166,0.3) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)' }}></div>
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,106,75,0.2) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(60px)' }}></div>
      
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '3rem', position: 'relative', zIndex: 10 }}>
        
        <div className="text-center mb-6">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            background: 'var(--primary-light)',
            boxShadow: 'var(--shadow-glow)',
            marginBottom: '1rem',
            color: 'white'
          }}>
            <Activity size={32} />
          </div>
          <h1 style={{ color: 'var(--primary-dark)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Clínica Salud y Vida</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sistema de Gestión de Citas Médicas</p>
        </div>

        {error && (
          <div className="mb-4" style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', borderLeft: '4px solid #EF4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="input-label" htmlFor="username">Usuario</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
                <User size={18} />
              </div>
              <input
                id="username"
                type="text"
                className="input-control"
                placeholder="ej. JRODRIGUEZ"
                style={{ paddingLeft: '2.75rem' }}
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="input-label" htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-light)' }}>
                <Lock size={18} />
              </div>
              <input
                id="password"
                type="password"
                className="input-control"
                placeholder="••••••••"
                style={{ paddingLeft: '2.75rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary mt-4" 
            style={{ width: '100%', padding: '0.875rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Autenticando...' : 'Iniciar Sesión'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="text-center mt-6">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
            V 1.0.0 &copy; 2026 Salud y Vida
          </p>
        </div>
      </div>
    </div>
  );
}
