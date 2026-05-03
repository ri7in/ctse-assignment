import { useState, useEffect, useMemo } from 'react';
import { trackerApi, taskApi, projectApi } from '../services/api';
import { C, FONT, SHADOW } from '../ds';

function BarChart({ dailyStats }) {
  if (!dailyStats?.length) return <div style={{ color: C.muted, fontSize: 13, padding: '24px 0' }}>No data yet</div>;
  const max = Math.max(...dailyStats.map(d => d.totalMinutes), 60);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
      {dailyStats.map((day) => {
        const pct = max > 0 ? day.totalMinutes / max : 0;
        const h = Math.max(4, Math.round(pct * 96));
        const d = new Date(day.date);
        const label = days[d.getDay()] ?? day.date.slice(5);
        const hrs = Math.floor(day.totalMinutes / 60);
        const mins = day.totalMinutes % 60;
        return (
          <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: C.sub, whiteSpace: 'nowrap', fontWeight: 500 }}>
              {day.totalMinutes > 0 ? (hrs > 0 ? `${hrs}h${mins}m` : `${mins}m`) : ''}
            </div>
            <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 80 }}>
              <div style={{ width: '60%', maxWidth: 36, height: h, background: pct > 0.7 ? C.accent : pct > 0.3 ? '#FF8FA3' : C.border, borderRadius: '6px 6px 2px 2px', transition: 'height .4s' }} />
            </div>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Tracker() {
  const [dashboard, setDashboard] = useState(null);
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    trackerApi.getDashboard().then(({ data }) => setDashboard(data)).catch(() => {});
    trackerApi.getEntries().then(({ data }) => setEntries(data)).catch(() => {});
    taskApi.list().then(({ data }) => setTasks(data)).catch(() => {});
    projectApi.list().then(({ data }) => setProjects(data)).catch(() => {});
  }, []);

  // Resolve taskId/projectId on each entry to their human names.
  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t._id, t])), [tasks]);
  const projectById = useMemo(() => Object.fromEntries(projects.map((p) => [p._id, p])), [projects]);

  const totalTime = dashboard?.dailyStats?.reduce((s, d) => s + d.totalMinutes, 0) ?? 0;
  const totalTasks = 3;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: '-.03em', margin: 0 }}>Work Tracker</h1>
        <p style={{ fontSize: 15, color: C.sub, margin: '6px 0 0' }}>Your activity and time log</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'This week', value: `${Math.floor(totalTime/60)}h ${totalTime%60}m`, icon: '⏱', color: C.accent },
          { label: 'Tasks completed', value: totalTasks, icon: '✅', color: C.success },
          { label: 'Avg per day', value: `${Math.round(totalTime / 7)}m`, icon: '📊', color: C.info },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 16, border: '1px solid ' + C.border, boxShadow: SHADOW.sm, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: C.sub, fontWeight: 500, marginBottom: 10 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-.03em' }}>{value}</div>
              </div>
              <div style={{ fontSize: 22 }}>{icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Entries */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid ' + C.border, boxShadow: SHADOW.sm, overflow: 'hidden' }}>
          <div style={{ padding: '22px 24px', borderBottom: '1px solid ' + C.border }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-.02em', margin: 0 }}>Recent Time Entries</h2>
          </div>
          {entries.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏱</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>No time entries yet</div>
              <div style={{ fontSize: 13, color: C.sub }}>Start tracking when you work on tasks</div>
            </div>
          ) : (
            <div>
              {entries.slice(0, 20).map((e, i) => {
                const task = taskById[e.taskId];
                const project = projectById[e.projectId];
                const taskTitle = task?.title || 'Unknown task';
                const projectName = project?.name;
                return (
                  <div key={e._id} style={{ padding: '16px 24px', borderBottom: i < entries.length - 1 ? '1px solid ' + C.border : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⏱</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {taskTitle}
                      </div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {projectName && (
                          <span style={{ background: C.bg, color: C.sub, borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 500 }}>
                            {projectName}
                          </span>
                        )}
                        {e.description && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                            “{e.description}”
                          </span>
                        )}
                        <span style={{ color: C.muted }}>·</span>
                        <span>{new Date(e.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{e.duration}m</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{Math.floor(e.duration / 60)}h {e.duration % 60}m</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid ' + C.border, boxShadow: SHADOW.sm, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-.02em', margin: '0 0 4px' }}>Weekly Activity</h2>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 28 }}>Time logged per day this week</div>
          {dashboard?.dailyStats
            ? <BarChart dailyStats={dashboard.dailyStats} />
            : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>Loading…</div>
          }
        </div>
      </div>
    </div>
  );
}
