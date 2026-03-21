import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3080';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tasky_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data)
};

export const projectApi = {
  list: () => api.get('/api/projects'),
  create: (data) => api.post('/api/projects', data),
  get: (id) => api.get(`/api/projects/${id}`),
  update: (id, data) => api.patch(`/api/projects/${id}`, data),
  delete: (id) => api.delete(`/api/projects/${id}`),
  getStats: (id) => api.get(`/api/projects/${id}/stats`),
  addMember: (id, userId) => api.post(`/api/projects/${id}/members`, { userId }),
  removeMember: (id, userId) => api.delete(`/api/projects/${id}/members/${userId}`)
};

export const taskApi = {
  list: (params) => api.get('/api/tasks', { params }),
  create: (data) => api.post('/api/tasks', data),
  get: (id) => api.get(`/api/tasks/${id}`),
  update: (id, data) => api.patch(`/api/tasks/${id}`, data),
  assign: (id, assigneeId) => api.patch(`/api/tasks/${id}/assign`, { assigneeId }),
  complete: (id) => api.patch(`/api/tasks/${id}/complete`),
  delete: (id) => api.delete(`/api/tasks/${id}`),
  getByProject: (projectId) => api.get(`/api/tasks/project/${projectId}`)
};

export const trackerApi = {
  getDashboard: () => api.get('/api/tracker/dashboard'),
  getEntries: (params) => api.get('/api/tracker/entries', { params }),
  createEntry: (data) => api.post('/api/tracker/entries', data),
  deleteEntry: (id) => api.delete(`/api/tracker/entries/${id}`),
  getProjectReport: (id) => api.get(`/api/tracker/reports/project/${id}`),
  getUserReport: (id) => api.get(`/api/tracker/reports/user/${id}`)
};

export const inboxApi = {
  getNotifications: (params) => api.get('/api/inbox/notifications', { params }),
  getUnreadCount: () => api.get('/api/inbox/unread-count'),
  markRead: (id) => api.patch(`/api/inbox/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/inbox/notifications/read-all'),
  dismiss: (id) => api.delete(`/api/inbox/notifications/${id}`),
  getMessages: () => api.get('/api/inbox/messages'),
  sendMessage: (data) => api.post('/api/inbox/messages', data)
};

export default api;
