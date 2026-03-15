import { useState, useEffect } from 'react';
import { trackerApi } from '../services/api';

export default function Tracker() {
  const [dashboard, setDashboard] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    trackerApi.getDashboard().then(({ data }) => setDashboard(data)).catch(() => {});
    trackerApi.getEntries().then(({ data }) => setEntries(data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Work Tracker</h1>

      <section>
        <h2>Weekly Summary</h2>
        {dashboard?.dailyStats ? (
          <div style={{ display: 'flex', gap: 12 }}>
            {dashboard.dailyStats.map((day) => (
              <div key={day.date} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600 }}>{day.totalMinutes}m</div>
                <div style={{ color: '#6B7280', fontSize: 11 }}>{day.date.slice(5)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Recent Time Entries</h2>
        {entries.length === 0 ? (
          <p>No time entries recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.slice(0, 20).map((e) => (
              <div key={e._id} style={{ background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                <strong>Task: {e.taskId}</strong>
                <span style={{ marginLeft: 12, color: '#6B7280' }}>{e.duration} min</span>
                <span style={{ marginLeft: 12, color: '#6B7280', fontSize: 11 }}>
                  {new Date(e.startedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
