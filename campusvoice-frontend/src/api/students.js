import api from './axios';

export const getFilterOptions = (institutionId) =>
  api.get(`/api/students/filters/options?institution_id=${institutionId}`);

export const getCount = (institutionId, filters) =>
  api.post('/api/students/count', { institution_id: institutionId, filters });
