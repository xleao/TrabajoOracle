import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Stethoscope, ShieldCheck, ArrowRight, Activity, Calendar, Clock, Lock } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--bg-main) 0%, #e0f2f1 100%)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementos Decorativos de Fondo */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(2,108,128,0.08) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,106,75,0.08) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(60px)', zIndex: 0 }}></div>

      {/* Navbar Simple */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 4rem',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--glass-border)',
        zIndex: 10,
        position: 'sticky',
        top: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem', color: 'white' }}>
            <Activity size={24} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-dark)', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Salud y Vida
          </h1>
        </div>
        <div>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-pill)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition-normal)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            Acceso al Portal <Lock size={16} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', zIndex: 10, textAlign: 'center' }}>
        <div style={{
          background: 'var(--secondary)',
          color: 'white',
          padding: '0.35rem 1rem',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '2rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 10px rgba(242, 106, 75, 0.3)'
        }}>
          <HeartPulse size={16} /> Tu bienestar es nuestra prioridad
        </div>
        
        <h2 style={{ fontSize: '3.5rem', color: 'var(--primary-dark)', fontWeight: '800', lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '800px' }}>
          Atención médica de <span style={{ color: 'var(--primary)' }}>primer nivel</span> para ti y tu familia.
        </h2>
        
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '3rem', lineHeight: 1.6 }}>
          Accede a nuestro moderno portal integral. Agenda citas, revisa tu historial clínico y recibe atención personalizada por los mejores especialistas del país.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '1rem 2rem',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-pill)',
              fontWeight: '600',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: 'var(--shadow-glow)',
              transition: 'all var(--transition-normal)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Ingresar al Portal <ArrowRight size={20} />
          </button>
        </div>
      </main>

      {/* Features Section */}
      <section style={{ padding: '4rem 2rem', background: 'white', borderTop: '1px solid var(--border-light)', zIndex: 10 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {[
            {
              icon: <Stethoscope size={32} color="var(--primary)" />,
              title: "Especialistas Certificados",
              desc: "Contamos con un equipo de médicos altamente capacitados en diversas áreas de la salud."
            },
            {
              icon: <Calendar size={32} color="var(--primary)" />,
              title: "Gestión Rápida de Citas",
              desc: "Agenda, reprograma o consulta tus citas médicas de forma inmediata y en tiempo real."
            },
            {
              icon: <ShieldCheck size={32} color="var(--primary)" />,
              title: "Historial Clínico Seguro",
              desc: "Tu información médica está resguardada con los más altos estándares de seguridad."
            }
          ].map((feature, idx) => (
            <div key={idx} className="card" style={{
              padding: '2.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-light)',
              boxShadow: 'none',
              transition: 'all var(--transition-normal)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-10px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = 'var(--primary-light)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)', marginBottom: '0.75rem' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--primary-dark)', color: 'rgba(255,255,255,0.7)', padding: '2rem', textAlign: 'center', fontSize: '0.9rem', zIndex: 10 }}>
        &copy; {new Date().getFullYear()} Clínica Salud y Vida. Todos los derechos reservados.
      </footer>
    </div>
  );
}
