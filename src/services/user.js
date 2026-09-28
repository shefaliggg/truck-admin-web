import api from './api';

export const getAdminProfile = async () => {
  const res = await api.get('/users/profile/admin');
  return res.data?.data || {};
};

export const updateAdminProfile = async (data) => {
  const res = await api.put('/users/profile/admin', data);
  return res.data?.data || {};
};

export const inviteShipper = async (payload) => {
  const res = await api.post('/admin/users/invite', payload);
  return res.data;
};

// CP Shipper (US) onboarding — mandatory admin review
export const getIncompleteShippers = async () => {
  const res = await api.get('/admin/shippers/incomplete');
  return res.data.shippers;
};

export const getPendingShippers = async () => {
  const res = await api.get('/admin/shippers/pending');
  return res.data.shippers;
};

export const getApprovedShippers = async () => {
  const res = await api.get('/admin/shippers/approved');
  return res.data.shippers;
};

export const getRejectedShippers = async () => {
  const res = await api.get('/admin/shippers/rejected');
  return res.data.shippers;
};

export const getShipperById = async (shipperId) => {
  const res = await api.get(`/admin/shippers/${shipperId}`);
  return res.data.shipper;
};

export const approveShipper = async (shipperId) => {
  const res = await api.put(`/admin/shippers/${shipperId}/approve`);
  return res.data;
};

export const rejectShipper = async (shipperId) => {
  const res = await api.put(`/admin/shippers/${shipperId}/reject`);
  return res.data;
};
