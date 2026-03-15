import { useEvents } from '../context/EventContext';
import { inboxApi } from '../services/api';

export default function Inbox() {
  const { notifications, dispatch } = useEvents();

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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Inbox</h1>
        {notifications.some((n) => !n.read) && (
          <button onClick={handleMarkAllRead}>Mark all read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p>No notifications</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                background: n.read ? '#F9FAFB' : '#EFF6FF',
                padding: 16,
                borderRadius: 8,
                borderLeft: n.read ? '3px solid #E5E7EB' : '3px solid #3B82F6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontSize: 14 }}>{n.title}</strong>
                <div style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!n.read && (
                  <button onClick={() => handleRead(n.id)} style={{ fontSize: 11 }}>Mark read</button>
                )}
                <button onClick={() => handleDismiss(n.id)} style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
