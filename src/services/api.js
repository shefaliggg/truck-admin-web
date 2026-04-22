import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const defaultOrigin = isProduction
  ? 'http://54.174.219.57:5000'
  : 'http://localhost:5000';

export const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || defaultOrigin;
export const API_BASE_URL = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
