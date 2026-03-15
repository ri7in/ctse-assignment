import { useEvents } from '../context/EventContext';
import { inboxApi } from '../services/api';
import { C, FONT, SHADOW } from '../ds';

const EVENT_ICON = {
  'task.assigned':       '📋',
  'task.completed':      '✅',
  'task.status.changed': '🔄',
  'project.created':     '📁',
  'member.added':        '👋',
  'milestone.reached':   '🎯',
  'report.generated':    '📊',
  default:               '🔔',
};

export default function Inbox() {
  const { notifications, dispatch } = useEvents();
  const unread = notifications.filter(n => !n.read).length;

  const handleRead = async (id) => {
    await inboxApi.markRead(id).catch(() => {});
    dispatch({ type: 'MARK_READ', id });
  };

  const handleDismiss = async (id) => {
    await inboxApi.dismiss(id).catch(() => {});
    dispatch({ type: 'DISMISS', id });
  };

  const handleMarkAllRead = async () => {
    await inboxApi.markAllRead().catch(() => {});
    dispatch({ type: 'MARK_ALL_READ' });
  };

  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: C.text, letterSpacing: '-.03em', margin: 0 }}>
            Inbox
            {unread > 0 && (
              <span style={{ marginLeft: 12, background: C.accent, color: '#fff', borderRadius: 9999, fontSize: 14, fontWeight: 700, padding: '2px 10px', verticalAlign: 'middle' }}>
                {unread}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 15, color: C.sub, margin: '6px 0 0' }}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={handleMarkAllRead} style={{ background: 'transparent', border: '1.5px solid ' + C.borderMd, borderRadius: 9999, padding: '9px 18px', fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer', fontFamily: FONT }}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid ' + C.border, padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 10 }}>You are all caught up</div>
          <div style={{ fontSize: 15, color: C.sub }}>New notifications will appear here as your team makes progress.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid ' + C.border, boxShadow: SHADOW.sm, overflow: 'hidden' }}>
          {notifications.map((n, i) => {
            const icon = EVENT_ICON[n.event] || EVENT_ICON.default;
            return (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '18px 20px',
                background: n.read ? '#fff' : C.infoBg,
                borderBottom: i < notifications.length - 1 ? '1px solid ' + C.border : 'none',
                transition: 'background .2s',
              }}>
                {/* Icon */}
                <div style={{ width: 42, height: 42, borderRadius: 12, background: n.read ? C.bg : '#fff', border: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, color: C.text, lineHeight: 1.4 }}>{n.title}</div>
                      {n.body && n.body !== n.title && (
                        <div style={{ fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 1.4 }}>{n.body}</div>
                      )}
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{fmt(n.createdAt)}</div>
                    </div>
                    {!n.read && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {!n.read && (
                    <button onClick={() => handleRead(n.id)} style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.sub, cursor: 'pointer', fontFamily: FONT }}>
                      Read
                    </button>
                  )}
                  <button onClick={() => handleDismiss(n.id)} style={{ background: 'transparent', border: 'none', borderRadius: 8, padding: '5px 8px', fontSize: 16, color: C.muted, cursor: 'pointer', lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
