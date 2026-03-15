import { useState, useEffect } from 'react';
import { taskApi } from '../services/api';

const STATUS_COLORS = {
  'backlog': '#9CA3AF',
  'todo': '#6B7280',
  'in-progress': '#3B82F6',
  'in-review': '#F59E0B',
  'done': '#10B981'
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: '', projectId: '', priority: 'medium' });
  const [showForm, setShowForm] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');

  const load = () => {
    taskApi.list(projectId ? { projectId } : {})
      .then(({ data }) => setTasks(data))
      .catch(() => {});
  };

  useEffect(() => {
    if (projectId) setForm((f) => ({ ...f, projectId }));
    load();
  }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await taskApi.create(form);
    setForm({ title: '', projectId: projectId || '', priority: 'medium' });
    setShowForm(false);
    load();
  };

  const handleComplete = async (id) => {
    await taskApi.complete(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete task?')) return;
    await taskApi.delete(id);
    load();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tasks</h1>
        <button onClick={() => setShowForm(!showForm)}>+ New Task</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            style={{ display: 'block', width: '100%', marginBottom: 8 }}
          />
          {!projectId && (
            <input
              placeholder="Project ID"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              required
              style={{ display: 'block', width: '100%', marginBottom: 8 }}
            />
          )}
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            style={{ marginBottom: 8 }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <div>
            <button type="submit">Create</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: 8 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((t) => (
          <div key={t._id} style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{t.title}</strong>
              <span style={{
                marginLeft: 12,
                background: STATUS_COLORS[t.status],
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11
              }}>
                {t.status}
              </span>
              <span style={{ marginLeft: 8, color: '#6B7280', fontSize: 12 }}>{t.priority}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {t.status !== 'done' && (
                <button onClick={() => handleComplete(t._id)} style={{ color: '#10B981' }}>✓</button>
              )}
              <button onClick={() => handleDelete(t._id)} style={{ color: 'red' }}>✕</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p>No tasks yet.</p>}
      </div>
    </div>
  );
}
