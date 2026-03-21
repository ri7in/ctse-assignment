import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectApi } from '../services/api';
import { C, FONT, SHADOW, PROJECT_COLORS, inputStyle, btnPrimary, btnSecondary } from '../ds';

function Modal({ onClose, onSubmit, loading }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [focused, setFocused] = useState('');
  const field = (k) => ({
    ...inputStyle,
    borderColor: focused === k ? C.accent : C.borderMd,
    boxShadow: focused === k ? '0 0 0 3px rgba(255,56,92,.12)' : 'none',
  });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: SHADOW.lg, padding: '32px 36px', width: '100%', maxWidth: 480, fontFamily: FONT }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-.02em', margin: '0 0 24px' }}>New Project</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Project name *</label>
            <input placeholder="e.g. Mobile App Redesign" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
              required style={field('name')} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Description</label>
            <textarea placeholder="What is this project about?" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              onFocus={() => setFocused('desc')} onBlur={() => setFocused('')}
              rows={3}
              style={{ ...field('desc'), resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '12px 22px' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnPrimary, padding: '12px 22px', borderRadius: 10, opacity: loading ? .7 : 1 }}>
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => projectApi.list().then(({ data }) => setProjects(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    setLoading(true);
    try { await projectApi.create(form); setShowModal(false); load(); } 
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its data?')) return;
    setDeleting(id);
    try { await projectApi.delete(id); load(); } finally { setDeleting(null); }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}>
      {showModal && <Modal onClose={() => setShowModal(false)} onSubmit={handleCreate} loading={loading} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: '-.03em', margin: 0 }}>Projects</h1>
          <p style={{ fontSize: 15, color: C.sub, margin: '6px 0 0' }}>{projects.length} workspace{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ ...btnPrimary, padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid ' + C.border, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🗂️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 10 }}>Start your first project</div>
          <div style={{ fontSize: 15, color: C.sub, marginBottom: 28, maxWidth: 360, margin: '0 auto 28px' }}>
            Organise work, track progress and collaborate with your team.
          </div>
          <button onClick={() => setShowModal(true)} style={{ ...btnPrimary, padding: '14px 28px', borderRadius: 12 }}>
            Create project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {projects.map((p, i) => {
            const pct = p.totalTasks > 0 ? Math.round(p.completedTasks / p.totalTasks * 100) : 0;
            const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
            return (
              <div key={p._id} style={{ background: '#fff', borderRadius: 18, border: '1px solid ' + C.border, boxShadow: SHADOW.sm, overflow: 'hidden' }}>
                <div style={{ height: 8, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                <div style={{ padding: '22px 24px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 6px', letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </h3>
                      <p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.description || 'No description'}
                      </p>
                    </div>
                    <span style={{ background: color + '20', color, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '3px 8px', marginLeft: 12, whiteSpace: 'nowrap' }}>
                      {p.status}
                    </span>
                  </div>

                  <div style={{ margin: '18px 0 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: C.sub }}>{p.completedTasks} / {p.totalTasks} tasks complete</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 6, height: 6, overflow: 'hidden' }}>
                      <div style={{ background: color, height: '100%', width: pct + '%', borderRadius: 6, transition: 'width .5s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    <Link to={'/tasks?projectId=' + p._id}
                      style={{ flex: 1, textAlign: 'center', background: C.bg, border: '1px solid ' + C.border, borderRadius: 10, padding: '9px', fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none' }}>
                      View tasks
                    </Link>
                    <button onClick={() => handleDelete(p._id)} disabled={deleting === p._id}
                      style={{ background: C.dangerBg, border: '1px solid #FFBBBB', borderRadius: 10, padding: '9px 14px', fontSize: 13, color: C.danger, cursor: 'pointer', fontWeight: 500 }}>
                      {deleting === p._id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
