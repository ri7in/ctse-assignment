import { useState, useEffect } from 'react';
import { projectApi } from '../services/api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [showForm, setShowForm] = useState(false);

  const load = () => projectApi.list().then(({ data }) => setProjects(data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await projectApi.create(form);
    setForm({ name: '', description: '' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    await projectApi.delete(id);
    load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Projects</h1>
        <button onClick={() => setShowForm(!showForm)}>+ New Project</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <input
            placeholder="Project name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={{ display: 'block', width: '100%', marginBottom: 8 }}
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={{ display: 'block', width: '100%', marginBottom: 8 }}
          />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {projects.map((p) => (
          <div key={p._id} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px' }}>{p.name}</h3>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 12px' }}>{p.description || 'No description'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`/tasks?projectId=${p._id}`}>Tasks</a>
              <button onClick={() => handleDelete(p._id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
