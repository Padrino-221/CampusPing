import api from './axios';

export const listInstitutions = () => api.get('/api/admin/institutions');
export const createInstitution = (name, slug, country) =>
  api.post('/api/admin/institutions', { name, slug, country });
export const updateInstitution = (id, data) =>
  api.put(`/api/admin/institutions/${id}`, data);
export const deleteInstitution = (id) => api.delete(`/api/admin/institutions/${id}`);

export const listCandidates = (page = 1, limit = 20) =>
  api.get(`/api/admin/candidates?page=${page}&limit=${limit}`);
export const toggleCandidate = (id) => api.put(`/api/admin/candidates/${id}/toggle`);
export const deleteCandidate = (id) => api.delete(`/api/admin/candidates/${id}`);
export const getCandidateCampaigns = (id) => api.get(`/api/admin/candidates/${id}/campaigns`);

export const listPendingSenderIds = () => api.get('/api/admin/sender-ids/pending');
export const listAllSenderIds = () => api.get('/api/admin/sender-ids');
export const approveSenderId = (id, arkeselRef) =>
  api.put(`/api/admin/sender-ids/${id}/approve`, { arkesel_ref: arkeselRef });
export const rejectSenderId = (id, note) =>
  api.put(`/api/admin/sender-ids/${id}/reject`, { rejection_note: note });

export const listStudents = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', params.page);
  if (params.limit) q.set('limit', params.limit);
  if (params.search) q.set('search', params.search);
  if (params.institution_id) q.set('institution_id', params.institution_id);
  if (params.gender) q.set('gender', params.gender);
  if (params.level) q.set('level', params.level);
  if (params.department) q.set('department', params.department);
  if (params.faculty) q.set('faculty', params.faculty);
  return api.get(`/api/admin/students?${q}`);
};
export const importStudents = (file, institutionId) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('institution_id', institutionId);
  return api.post('/api/admin/students/import', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const deleteStudent = (id) => api.delete(`/api/admin/students/${id}`);
export const downloadStudentTemplate = () =>
  api.get('/api/admin/students/template', { responseType: 'blob' });

export const listTransactions = (page = 1, limit = 50) =>
  api.get(`/api/admin/transactions?page=${page}&limit=${limit}`);
export const getRevenue = () => api.get('/api/admin/revenue');
export const getArkeselBalance = () => api.get('/api/admin/credits/arkesel-balance');
export const listAllCampaigns = (page = 1, limit = 20) =>
  api.get(`/api/admin/campaigns?page=${page}&limit=${limit}`);
export const listCreditPackages = () => api.get('/api/admin/credit-packages');
export const createCreditPackage = (name, credits, priceGhs) =>
  api.post('/api/admin/credit-packages', { name, credits, price_ghs: priceGhs });
export const deleteCreditPackage = (id) => api.delete(`/api/admin/credit-packages/${id}`);

export const resetDatabase = () => api.post('/api/admin/system/reset');
export const adjustCandidateCredits = (id, amount, reason) =>
  api.put(`/api/admin/candidates/${id}/credits`, { amount, reason });
