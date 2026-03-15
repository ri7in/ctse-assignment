import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { useEvents } from './context/EventContext';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Tracker from './pages/Tracker';
import Inbox from './pages/Inbox';
import Login from './pages/Login';
import Register from './pages/Register';
import { C, FONT, SHADOW } from './ds';

function NavBar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useEvents();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!user) return null;

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? C.text : C.sub,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    padding: '6px 12px',
    borderRadius: '8px',
    background: isActive ? C.bg : 'transparent',
    transition: 'all .15s',
    fontFamily: FONT,
  });

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: scrolled ? 'rgba(255,255,255,0.88)' : '#fff',
      backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
      borderBottom: `1px solid ${scrolled ? C.border : C.border}`,
      boxShadow: scrolled ? SHADOW.xs : 'none',
      transition: 'all .2s',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <div style={{
            width: 28, height: 28,
            background: C.accent,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white"/>
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity=".7"/>
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity=".7"/>
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity=".4"/>
            </svg>
          </div>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, color: C.text, letterSpacing: '-.02em' }}>
            Tasky.io
          </span>
        </NavLink>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          <NavLink to="/"        end style={navLinkStyle}>Dashboard</NavLink>
          <NavLink to="/projects"    style={navLinkStyle}>Projects</NavLink>
          <NavLink to="/tasks"       style={navLinkStyle}>Tasks</NavLink>
          <NavLink to="/tracker"     style={navLinkStyle}>Tracker</NavLink>
          <NavLink to="/inbox"       style={({ isActive }) => ({
            ...navLinkStyle({ isActive }),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          })}>
            Inbox
            {unreadCount > 0 && (
              <span style={{
                background: C.accent,
                color: '#fff',
                borderRadius: '9999px',
                minWidth: 18,
                height: 18,
                fontSize: 11,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </div>

        {/* User */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: `1.5px solid ${C.border}`,
              borderRadius: '9999px', padding: '6px 14px 6px 8px',
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            <div style={{
              width: 26, height: 26,
              background: `linear-gradient(135deg, ${C.accent}, #FF6B8A)`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700,
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{user.name?.split(' ')[0]}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 4l3 3 3-3" stroke={C.sub} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#fff', border: `1px solid ${C.border}`,
              borderRadius: 12, boxShadow: SHADOW.lg,
              padding: 8, minWidth: 160, zIndex: 200,
            }}
              onBlur={() => setMenuOpen(false)}
            >
              <div style={{ padding: '8px 12px 12px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{user.name}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{user.email}</div>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); setMenuOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', marginTop: 4,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: C.danger, fontFamily: FONT,
                  borderRadius: 8,
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT }}>
      <NavBar />
      <Routes>
        <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/tasks"    element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/tracker"  element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
        <Route path="/inbox"    element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventProvider>
          <AppRoutes />
        </EventProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
