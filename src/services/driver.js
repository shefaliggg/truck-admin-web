
import api from './api';

export const getApprovedDrivers = async () => {
  const response = await api.get('/admin/drivers/approved');
  return response.data.drivers;
};

export const getRejectedDrivers = async () => {
  const response = await api.get('/admin/drivers/rejected');
  return response.data.drivers;
};

export const getPendingDrivers = async () => {
  const response = await api.get('/admin/drivers/pending');
  return response.data.drivers;
};

export const getIncompleteDrivers = async () => {
  const response = await api.get('/admin/drivers/incomplete');
  return response.data.drivers;
};

export const approveDriver = async (driverId) => {
  const response = await api.put(`/admin/drivers/${driverId}/approve`);
  return response.data;
};

export const rejectDriver = async (driverId) => {
  const response = await api.put(`/admin/drivers/${driverId}/reject`);
  return response.data;
};

export const verifyDriverBank = async (driverId) => {
  return api.put(`/drivers/${driverId}/verify-bank`);
};

export const inviteDriver = async (payload) => {
  const response = await api.post('/admin/drivers/invite', payload);
  return response.data;
};
