import api from './api';

export const getConversations = async () => {
  const res = await api.get('/messages/conversations');
  return res.data;
};

export const getChatUnreadCount = async () => {
  const res = await api.get('/messages/unread-count');
  return res.data.count;
};

export const getTripMessages = async (tripId) => {
  const res = await api.get(`/trips/${tripId}/messages`);
  return res.data;
};

export const getBookingMessages = async (bookingId) => {
  const res = await api.get(`/messages/booking/${bookingId}`);
  return res.data;
};

export const sendTripMessage = async (tripId, text) => {
  const res = await api.post(`/trips/${tripId}/messages`, { text });
  return res.data;
};
