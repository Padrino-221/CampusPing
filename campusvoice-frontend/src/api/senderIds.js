import api from './axios';

export const listSenderIds = () => api.get('/api/sender-ids/');
export const createSenderId = (senderName) =>
  api.post('/api/sender-ids/', { sender_name: senderName });
export const deleteSenderId = (id) => api.delete(`/api/sender-ids/${id}`);
