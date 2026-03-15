import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
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

const NAV_STYLE = {
  background: '#1B2033',
  color: '#fff',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  height: 56,
  gap: 24
};

const LINK_STYLE = { color: '#CBD5E1', textDecoration: 'none', fontSize: 14 };

function NavBar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useEvents();

  if (!user) return null;

  return (
    <nav style={NAV_STYLE}>
      <Link to="/" style={{ ...LINK_STYLE, fontWeight: 700, fontSize: 18, color: '#fff' }}>Tasky.io</Link>
      <Link to="/" style={LINK_STYLE}>Dashboard</Link>
      <Link to="/projects" style={LINK_STYLE}>Projects</Link>
      <Link to="/tasks" style={LINK_STYLE}>Tasks</Link>
      <Link to="/tracker" style={LINK_STYLE}>Tracker</Link>
      <Link to="/inbox" style={{ ...LINK_STYLE, position: 'relative' }}>
        Inbox
        {unreadCount > 0 && (
          <span style={{
            background: '#EF4444',
            color: '#fff',
            borderRadius: '50%',
            width: 18,
            height: 18,
            fontSize: 11,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 4
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#94A3B8', fontSize: 13 }}>{user.name}</span>
        <button onClick={logout} style={{ color: '#94A3B8', background: 'none', border: '1px solid #374151', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          Logout
        </button>
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
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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
