import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Stethoscope, ShieldCheck, ArrowRight, Activity, Calendar, Clock, Lock } from 'lucide-react';
import { ReactLenis } from 'lenis/react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <ReactLenis root options={{ lerp: 0.1, syncTouch: true }}>
      <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, var(--bg-main) 0%, #e0f2f1 100%)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementos Decorativos de Fondo con Animaciones de Pulso Suave (Optimizados para 60 FPS) */}
      <div className="animate-pulse-glow-1" style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(2,108,128,0.08) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, willChange: 'transform', transform: 'translate3d(0,0,0)' }}></div>
      <div className="animate-pulse-glow-2" style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,106,75,0.08) 0%, rgba(255,255,255,0) 70%)', zIndex: 0, willChange: 'transform', transform: 'translate3d(0,0,0)' }}></div>

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
          <div className="animate-float" style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem', color: 'white' }}>
            <Activity size={24} />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-dark)', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Salud y Vida
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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
      <main id="inicio" style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '5rem 4rem', 
        zIndex: 10,
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
          width: '100%'
        }}>
          {/* Columna Izquierda: Mensaje y CTA */}
          <div style={{ textAlign: 'left' }}>
            <div className="animate-pulse-beat" style={{
              background: 'rgba(242, 106, 75, 0.1)',
              color: 'var(--secondary)',
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '1.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid rgba(242, 106, 75, 0.2)'
            }}>
              <HeartPulse size={16} /> Tu bienestar es nuestra prioridad
            </div>
            
            <h2 className="animate-fade-in-up delay-100" style={{ 
              fontSize: '3.5rem', 
              color: 'var(--primary-dark)', 
              fontWeight: '800', 
              lineHeight: 1.1, 
              marginBottom: '1.5rem',
              letterSpacing: '-1px'
            }}>
              Atención médica de <span style={{ color: 'var(--primary)' }}>primer nivel</span> para tu familia.
            </h2>
            
            <p className="animate-fade-in-up delay-200" style={{ 
              fontSize: '1.15rem', 
              color: 'var(--text-muted)', 
              marginBottom: '2.5rem', 
              lineHeight: 1.6 
            }}>
              Accede a nuestro moderno portal integral. Agenda citas, revisa tu historial clínico y recibe atención personalizada por los mejores especialistas de la Clínica Salud y Vida.
            </p>
            
            <div className="animate-fade-in-up delay-300" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
          </div>

          {/* Columna Derecha: Widget Interactivo de Vista Previa */}
          <div className="animate-float-delayed" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="glass-panel" style={{
              width: '100%',
              maxWidth: '400px',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', background: 'var(--accent)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-pill)' }}>
                  Portal Clínico Activo
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#10B981', fontWeight: '500' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                  En Línea
                </span>
              </div>

              {/* Mock Doctor Card inside widget */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'white', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', border: '1px solid var(--border-light)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                  CC
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-dark)', fontWeight: '600' }}>Dr. Cesar Castro Diaz</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cardiología • CMP-50001</p>
                </div>
              </div>

              {/* Schedule slot selector preview */}
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: '500' }}>Horarios Disponibles Hoy:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {['08:30 AM', '10:00 AM', '03:30 PM'].map((time, i) => (
                    <div key={i} style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      background: i === 0 ? 'var(--primary)' : 'white',
                      color: i === 0 ? 'white' : 'var(--primary-dark)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--primary)',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}>
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stat indicator */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                <div>⏱ Duración Cita: <b>30 min</b></div>
                <div>⚡ Agendado al Instante</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Bar */}
      <section style={{ 
        background: 'var(--glass-bg)', 
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--glass-border)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '2.5rem 2rem',
        zIndex: 10
      }}>
        <div style={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-around', 
          flexWrap: 'wrap', 
          gap: '2rem',
          textAlign: 'center'
        }}>
          {[
            { value: "15+", label: "Especialistas Médicos" },
            { value: "99.8%", label: "Atención a Tiempo" },
            { value: "24/7", label: "Portal de Consultas" }
          ].map((stat, i) => (
            <div key={i} className="animate-fade-in-up" style={{ minWidth: '150px' }}>
              <div style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="beneficios" style={{ padding: '5rem 2rem', background: 'white', zIndex: 10 }}>
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
            <div key={idx} className={`card animate-fade-in-up delay-${(idx + 3) * 100}`} style={{
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
    </ReactLenis>
  );
}
