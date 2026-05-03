import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../services/firebase';
import { useAuth } from './AuthContext';
import { inboxApi } from '../services/api';

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    inboxApi.getNotifications({ limit: 50 })
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data.notifications || []).map((n) => ({ ...n, id: n._id || n.id }));
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      })
      .catch(() => {});

    if (!database) {
      return () => { cancelled = true; };
    }

    const notifRef = ref(database, `/notifications/${user.id}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const list = Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    });

    return () => {
      cancelled = true;
      off(notifRef);
    };
  }, [user?.id]);

  const dispatch = useCallback((action) => {
    if (action.type === 'MARK_READ') {
      setNotifications((prev) =>
        prev.map((n) => (n.id === action.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } else if (action.type === 'DISMISS') {
      setNotifications((prev) => prev.filter((n) => n.id !== action.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
