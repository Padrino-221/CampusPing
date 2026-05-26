import api from './axios';

export const listInstitutions = () => api.get('/api/institutions/');
