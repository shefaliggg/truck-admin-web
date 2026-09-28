import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/admin/login', { email, password });
  localStorage.setItem('adminToken', response.data.token);
  localStorage.setItem('adminUser', JSON.stringify(response.data.user));
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/auth/admin/password', { currentPassword, newPassword });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

