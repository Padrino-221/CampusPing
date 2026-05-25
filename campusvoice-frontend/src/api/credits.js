import api from './axios';

export const getBalance = () => api.get('/api/credits/balance');
export const getTransactions = (page = 1, limit = 20) =>
  api.get(`/api/credits/transactions?page=${page}&limit=${limit}`);
export const getPackages = () => api.get('/api/credits/packages');
export const purchaseCredits = (packageId) =>
  api.post('/api/credits/purchase', { package_id: packageId });
export const verifyPayment = (reference) =>
  api.post('/api/credits/verify', { reference });
