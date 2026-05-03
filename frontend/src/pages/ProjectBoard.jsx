import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { taskApi, projectApi } from '../services/api';
import { C, FONT, SHADOW, STATUS_COLOR, PRIORITY_COLOR, btnPrimary } from '../ds';

const COLUMNS = [
  { id: 'backlog',     title: 'Backlog' },
  { id: 'todo',        title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'in-review',   title: 'In Review' },
  { id: 'done',        title: 'Done' },
];

function TaskCard({ task, dragging = false }) {
  const status = STATUS_COLOR[task.status] || { bg: C.bg, text: C.sub };
  const prio   = PRIORITY_COLOR[task.priority] || { bg: C.bg, text: C.sub };
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid ' + C.border,
      boxShadow: dragging ? SHADOW.lg : SHADOW.xs,
      padding: '12px 14px',
      cursor: 'grab',
      userSelect: 'none',
      opacity: dragging ? 0.95 : 1,
      transform: dragging ? 'rotate(2deg)' : 'none',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.35, marginBottom: 8, letterSpacing: '-.01em' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ background: prio.bg, color: prio.text, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 600, textTransform: 'capitalize' }}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span style={{ background: C.bg, color: C.sub, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 500 }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.trackedTime > 0 && (
          <span style={{ background: C.accentLight, color: C.accent, borderRadius: 6, padding: '3px 7px', fontSize: 10, fontWeight: 600 }}>
            ⏱ {task.trackedTime >= 60 ? `${Math.floor(task.trackedTime / 60)}h ${task.trackedTime % 60}m` : `${task.trackedTime}m`}
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableTask({ task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task._id, data: { task } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0 : 1, marginBottom: 8 }}
    >
      <TaskCard task={task} />
    </div>
  );
}

function Column({ column, tasks }) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const status = STATUS_COLOR[column.id];
  return (
    <div style={{
      flex: '0 0 296px',
      // GitHub Projects style: flat white lane with a clear 1px border, no shadow.
      background: '#fff',
      borderRadius: 8,
      padding: 0,
      border: isOver ? `1px solid ${C.accent}` : `1px solid ${C.borderMd}`,
      transition: 'border-color .15s, background .15s',
      display: 'flex',
      flexDirection: 'column',
      // Fixed lane height so layout doesn't jump as cards move between columns.
      height: 'calc(100vh - 220px)',
      minHeight: 480,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderBottom: '1px solid ' + C.border,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.text }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: '-.01em' }}>{column.title}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.sub, background: C.bg, borderRadius: 999, padding: '1px 9px', minWidth: 22, textAlign: 'center' }}>{tasks.length}</span>
      </div>
      <div ref={setNodeRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 12px', minHeight: 60 }}>
        {tasks.map(t => <DraggableTask key={t._id} task={t} />)}
      </div>
    </div>
  );
}

export default function ProjectBoard() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const load = () =>
    Promise.all([projectApi.get(projectId), taskApi.list({ projectId })])
      .then(([p, t]) => { setProject(p.data); setTasks(t.data); })
      .catch(() => setError('Failed to load board'));

  useEffect(() => { load(); }, [projectId]);

  const grouped = useMemo(() => {
    const m = Object.fromEntries(COLUMNS.map(c => [c.id, []]));
    for (const t of tasks) (m[t.status] || (m[t.status] = [])).push(t);
    return m;
  }, [tasks]);

  const onDragStart = (e) => setActiveTask(tasks.find(t => t._id === e.active.id) || null);

  const onDragEnd = async (e) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = String(over.id);
    if (!COLUMNS.find(c => c.id === newStatus)) return;
    const task = tasks.find(t => t._id === active.id);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    const prev = tasks;
    setTasks(prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    try {
      await taskApi.update(task._id, { status: newStatus });
    } catch {
      setTasks(prev); // rollback
      setError('Could not update task status');
    }
  };

  if (!project && !error) {
    return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', fontFamily: FONT, color: C.sub }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <Link to="/projects" style={{ fontSize: 13, color: C.sub, textDecoration: 'none' }}>← Projects</Link>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: C.text, letterSpacing: '-.03em', margin: '6px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project?.name}
          </h1>
          <p style={{ fontSize: 14, color: C.sub, margin: 0 }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · drag to change status
          </p>
        </div>
        <Link to={`/tasks?projectId=${projectId}`} style={{ ...btnPrimary, padding: '10px 18px', borderRadius: 10, fontSize: 13, textDecoration: 'none' }}>
          List view
        </Link>
      </div>

      {error && (
        <div style={{ background: C.dangerBg, color: C.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {COLUMNS.map(col => <Column key={col.id} column={col} tasks={grouped[col.id] || []} />)}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
