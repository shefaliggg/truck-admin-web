import api from './api';

export const getMyNotifications = async () => {
  const res = await api.get('/notifications/me');
  return res.data;
};

export const getUnreadNotificationCount = async () => {
  const res = await api.get('/notifications/unread-count');
  return res.data.count;
};

export const markAllNotificationsRead = async () => {
  const res = await api.put('/notifications/mark-read');
  return res.data;
};
