import api from './axios';

export const createCampaign = (data) => api.post('/api/campaigns/', data);
export const listCampaigns = (page = 1, limit = 20) => api.get(`/api/campaigns/?page=${page}&limit=${limit}`);
export const getCampaign = (id) => api.get(`/api/campaigns/${id}`);
export const updateCampaign = (id, data) => api.put(`/api/campaigns/${id}`, data);
export const sendCampaign = (id) => api.post(`/api/campaigns/${id}/send`);
export const scheduleCampaign = (id, scheduledAt) => api.post(`/api/campaigns/${id}/schedule?scheduled_at=${scheduledAt}`);
export const deleteCampaign = (id) => api.delete(`/api/campaigns/${id}`);
