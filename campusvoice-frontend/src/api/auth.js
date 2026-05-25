import api from './axios';

export const register = (data) => api.post('/api/auth/register', data);
export const login = (data) => api.post('/api/auth/login', data);
export const logout = () => api.post('/api/auth/logout');
export const getMe = () => api.get('/api/auth/me');
export const updateMe = (data) => api.put('/api/auth/me', data);
export const refresh = () => api.post('/api/auth/refresh');
