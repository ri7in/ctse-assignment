import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../services/firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { inboxApi } from '../services/api';

const EventContext = createContext(null);

const POLL_MS = 8000;

export const EventProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track which notification IDs we've already surfaced so we don't double-toast.
  const seenIdsRef = useRef(new Set());
  const primedRef = useRef(false);

  const ingest = useCallback((list) => {
    if (!primedRef.current) {
      // First load after login: prime the seen-set silently.
      seenIdsRef.current = new Set(list.map((n) => n.id));
      primedRef.current = true;
    } else {
      for (const n of list) {
        if (seenIdsRef.current.has(n.id)) continue;
        seenIdsRef.current.add(n.id);
        if (!n.read) {
          showToast({ title: n.title, body: n.body, event: n.event });
        }
      }
    }
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
  }, [showToast]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      seenIdsRef.current = new Set();
      primedRef.current = false;
      return;
    }

    let cancelled = false;

    const fetchOnce = () =>
      inboxApi.getNotifications({ limit: 50 })
        .then(({ data }) => {
          if (cancelled) return;
          const list = (data.notifications || []).map((n) => ({ ...n, id: n._id || n.id }));
          ingest(list);
        })
        .catch(() => {});

    fetchOnce();
    const pollHandle = setInterval(fetchOnce, POLL_MS);

    let notifRef = null;
    if (database) {
      notifRef = ref(database, `/notifications/${user.id}`);
      onValue(notifRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        ingest(list);
      });
    }

    return () => {
      cancelled = true;
      clearInterval(pollHandle);
      if (notifRef) off(notifRef);
    };
  }, [user?.id, ingest]);

  const dispatch = useCallback((action) => {
    if (action.type === 'MARK_READ') {
      setNotifications((prev) =>
        prev.map((n) => (n.id === action.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } else if (action.type === 'DISMISS') {
      setNotifications((prev) => prev.filter((n) => n.id !== action.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      seenIdsRef.current.delete(action.id);
    } else if (action.type === 'MARK_ALL_READ') {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, []);

  return (
    <EventContext.Provider value={{ notifications, unreadCount, dispatch }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);
