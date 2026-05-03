import { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import { C, FONT, SHADOW } from '../ds';

const ToastContext = createContext(null);

const ICONS = {
  'project.created':       '📁',
  'task.assigned':         '🎯',
  'task.created':          '➕',
  'task.completed':        '✅',
  'task.status.changed':   '🔄',
  'member.added':          '👥',
  'milestone.reached':     '🏆',
  'report.generated':      '📊',
  'user.invited':          '✉️',
};

let _id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle) { clearTimeout(handle); timersRef.current.delete(id); }
  }, []);

  const showToast = useCallback(({ title, body, event, duration = 4500 }) => {
    const id = ++_id;
    setToasts((cur) => [...cur, { id, title, body, event }]);
    const handle = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, handle);
  }, [dismiss]);

  useEffect(() => () => {
    for (const h of timersRef.current.values()) clearTimeout(h);
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 10_000,
        display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto',
              background: '#fff',
              border: '1px solid ' + C.borderMd,
              borderLeft: '4px solid ' + C.accent,
              borderRadius: 10,
              boxShadow: SHADOW.lg,
              padding: '12px 14px',
              minWidth: 280,
              maxWidth: 360,
              display: 'flex',
              gap: 10,
              cursor: 'pointer',
              fontFamily: FONT,
              animation: 'tasky-toast-in .25s ease-out',
            }}>
            <div style={{ fontSize: 20, lineHeight: 1.1 }}>{ICONS[t.event] || '🔔'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: '-.01em', lineHeight: 1.35 }}>
                {t.title}
              </div>
              {t.body && t.body !== t.title && (
                <div style={{ fontSize: 12, color: C.sub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.body}
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
              style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes tasky-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
