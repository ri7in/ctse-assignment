import { useState, useEffect } from 'react';
import { taskApi, projectApi } from '../services/api';
import { C, FONT, SHADOW, STATUS_COLOR, PRIORITY_COLOR, inputStyle, btnPrimary, btnSecondary } from '../ds';

const STATUSES = ['backlog','todo','in-progress','in-review','done'];

function Badge({ text, map }) {
  const s = map[text] || { bg: C.bg, text: C.sub };
  return (
    <span style={{ background: s.bg, color: s.text, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {text}
    </span>
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
                  </div>
                  {t.dueDate && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      Due {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>

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
