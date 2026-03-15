import { useState, useEffect } from 'react';
import { trackerApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { unreadCount } = useEvents();
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    trackerApi.getDashboard().then(({ data }) => setDashboard(data)).catch(() => {});
    projectApi.list().then(({ data }) => setProjects(data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Welcome back, {user?.name}</h1>
      {unreadCount > 0 && (
        <div style={{ background: '#3B82F6', color: '#fff', padding: '8px 16px', borderRadius: 8, display: 'inline-block', marginBottom: 16 }}>
          {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
        </div>
      )}

      <section>
        <h2>Weekly Activity</h2>
        {dashboard?.dailyStats ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {dashboard.dailyStats.map((day) => (
              <div key={day.date} style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{
                  height: Math.max(4, day.totalMinutes / 10),
                  background: '#3B82F6',
                  borderRadius: 4,
                  marginBottom: 4
                }} />
                <small>{day.date.slice(5)}</small>
                <br />
                <small>{day.totalMinutes}m</small>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading chart...</p>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>My Projects</h2>
        {projects.length === 0 ? (
          <p>No projects yet. <a href="/projects">Create one</a></p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {projects.map((p) => (
              <div key={p._id} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                <strong>{p.name}</strong>
                <p style={{ color: '#6B7280', fontSize: 12, margin: '8px 0 0' }}>
                  {p.completedTasks}/{p.totalTasks} tasks
                </p>
                <div style={{ background: '#EEF2F7', borderRadius: 4, marginTop: 8 }}>
                  <div style={{
                    background: '#3B82F6',
                    borderRadius: 4,
                    height: 6,
                    width: p.totalTasks > 0 ? `${Math.round(p.completedTasks / p.totalTasks * 100)}%` : '0%'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
