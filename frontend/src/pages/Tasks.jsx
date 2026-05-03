import { useState, useEffect } from 'react';
import { taskApi, projectApi, trackerApi } from '../services/api';
import { C, FONT, SHADOW, STATUS_COLOR, PRIORITY_COLOR, inputStyle, btnPrimary, btnSecondary } from '../ds';

const STATUSES = ['backlog','todo','in-progress','in-review','done'];

const fmtMin = (m) => {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
};

function Badge({ text, map }) {
  const s = map[text] || { bg: C.bg, text: C.sub };
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

function TimePanel({ task, onClose, onChange }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ duration: 30, description: '' });

  const load = () =>
    trackerApi.getEntries({ taskId: task._id })
      .then(({ data }) => setEntries(data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [task._id]);

  const handleLog = async (e) => {
    e.preventDefault();
    const d = parseInt(form.duration, 10);
    if (!d || d < 1) return;
    setSubmitting(true);
    const startedAt = new Date(Date.now() - d * 60_000).toISOString();
    const endedAt = new Date().toISOString();
    try {
      await trackerApi.createEntry({
        taskId: task._id,
        projectId: task.projectId,
        startedAt, endedAt, duration: d,
        description: form.description,
      });
      setForm({ duration: 30, description: '' });
      await load();
      onChange?.();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this time entry?')) return;
    await trackerApi.deleteEntry(id);
    await load();
    onChange?.();
  };

  const total = entries.reduce((s, e) => s + (e.duration || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: SHADOW.lg, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid ' + C.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginBottom: 4 }}>TIME TRACKING</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h2>
              <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>
                Total: <strong style={{ color: C.text }}>{fmtMin(total)}</strong> &middot; {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 22, color: C.muted, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
          </div>
        </div>

        <form onSubmit={handleLog} style={{ padding: '18px 28px', borderBottom: '1px solid ' + C.border, display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 6 }}>MINUTES</label>
            <input type="number" min="1" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
              style={{ ...inputStyle, padding: '8px 10px', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.sub, fontWeight: 600, marginBottom: 6 }}>NOTE (OPTIONAL)</label>
            <input type="text" placeholder="What did you work on?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, padding: '8px 10px', fontSize: 14 }} />
          </div>
          <button type="submit" disabled={submitting} style={{ ...btnPrimary, padding: '9px 16px', borderRadius: 10, fontSize: 13, opacity: submitting ? .7 : 1 }}>
            {submitting ? 'Logging…' : 'Log'}
          </button>
        </form>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: '32px 28px', color: C.muted, fontSize: 13, textAlign: 'center' }}>Loading…</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '40px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>⏱</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>No time logged yet</div>
              <div style={{ fontSize: 12, color: C.sub }}>Log work above, or move the task to “in-progress” to auto-track.</div>
            </div>
          ) : entries.map((e) => (
            <div key={e._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 28px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.description || 'Work session'}
                </div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                  {new Date(e.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{fmtMin(e.duration)}</div>
              <button onClick={() => handleDelete(e._id)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '4px 6px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 28px', borderTop: '1px solid ' + C.border, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnSecondary, padding: '9px 18px' }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ projectId, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ title: '', projectId: projectId || '', priority: 'medium', description: '' });
  const [projects, setProjects] = useState([]);
  const [focused, setFocused] = useState('');

  useEffect(() => { if (!projectId) projectApi.list().then(({ data }) => setProjects(data)).catch(() => {}); }, [projectId]);

  const field = (k) => ({ ...inputStyle, borderColor: focused === k ? C.accent : C.borderMd, boxShadow: focused === k ? '0 0 0 3px rgba(255,56,92,.12)' : 'none' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: SHADOW.lg, padding: '32px 36px', width: '100%', maxWidth: 480, fontFamily: FONT }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-.02em', margin: '0 0 24px' }}>New Task</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Title *</label>
            <input placeholder="e.g. Design login screen" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              onFocus={() => setFocused('title')} onBlur={() => setFocused('')}
              required style={field('title')} />
          </div>
          {!projectId && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Project *</label>
              <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} required
                style={{ ...field('proj'), appearance: 'none' }}>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                style={{ ...field('pri'), appearance: 'none' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Due date</label>
              <input type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                onFocus={() => setFocused('due')} onBlur={() => setFocused('')}
                style={field('due')} />
            </div>
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Description</label>
            <textarea placeholder="Optional notes…" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              onFocus={() => setFocused('desc')} onBlur={() => setFocused('')}
              rows={3} style={{ ...field('desc'), resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '12px 22px' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnPrimary, padding: '12px 22px', borderRadius: 10, opacity: loading ? .7 : 1 }}>
              {loading ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [timeTask, setTimeTask] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');

  const load = () => taskApi.list(projectId ? { projectId } : {}).then(({ data }) => setTasks(data)).catch(() => {});
  useEffect(() => { load(); }, [projectId]);

  const handleCreate = async (form) => {
    setCreating(true);
    try { await taskApi.create(form); setShowModal(false); load(); } finally { setCreating(false); }
  };

  const handleStatus = async (id, status) => {
    // Optimistic update so the dropdown feels instant.
    const prev = tasks;
    setTasks(prev.map(t => t._id === id ? { ...t, status } : t));
    try { await taskApi.update(id, { status }); }
    catch { setTasks(prev); }
  };
  const handleDelete = async (id) => { if (!confirm('Delete task?')) return; await taskApi.delete(id); load(); };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}>
      {showModal && <TaskModal projectId={projectId} onClose={() => setShowModal(false)} onSubmit={handleCreate} loading={creating} />}
      {timeTask && <TimePanel task={timeTask} onClose={() => setTimeTask(null)} onChange={load} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: '-.03em', margin: 0 }}>Tasks</h1>
          <p style={{ fontSize: 15, color: C.sub, margin: '6px 0 0' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}{projectId ? ' in this project' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ ...btnPrimary, padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#fff', border: '1px solid ' + C.border, borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? C.text : 'transparent',
            color: filter === s ? '#fff' : C.sub,
            border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT, transition: 'all .15s',
            textTransform: 'capitalize',
          }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid ' + C.border, padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
          </div>
          <div style={{ fontSize: 14, color: C.sub }}>
            {filter === 'all' ? 'Create your first task to start tracking work.' : 'Try a different filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((t) => {
            const sCol = STATUS_COLOR[t.status] || { bg: C.bg, text: C.sub };
            return (
              <div key={t._id} style={{ background: '#fff', borderRadius: 14, border: '1px solid ' + C.border, boxShadow: SHADOW.xs, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: t.status === 'done' ? C.muted : C.text, textDecoration: t.status === 'done' ? 'line-through' : 'none', letterSpacing: '-.01em' }}>
                      {t.title}
                    </span>
                    <Badge text={t.priority} map={PRIORITY_COLOR} />
                    {t.trackedTime > 0 && (
                      <span style={{ background: C.accentLight, color: C.accent, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        ⏱ {fmtMin(t.trackedTime)}
                      </span>
                    )}
                  </div>
                  {t.dueDate && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      Due {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>

                <button onClick={() => setTimeTask(t)}
                  title="Time entries"
                  style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, color: C.sub, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap' }}>
                  ⏱ Time
                </button>

                <select
                  value={t.status}
                  onChange={(e) => handleStatus(t._id, e.target.value)}
                  style={{
                    background: sCol.bg,
                    color: sCol.text,
                    border: '1px solid ' + C.border,
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: FONT,
                    cursor: 'pointer',
                    appearance: 'none',
                    paddingRight: 26,
                    backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M2 4l3 3 3-3\' stroke=\'%236E6E73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/></svg>")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                  }}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <button onClick={() => handleDelete(t._id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
