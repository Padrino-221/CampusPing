import { create } from 'zustand';
import { getMe } from '../api/auth';

const TIMEOUT_MS = 5000;

const useAuthStore = create((set) => ({
  candidate: null,
  loading: true,
  setCandidate: (candidate) => set({ candidate, loading: false }),
  logout: () => {
    set({ candidate: null, loading: false });
    window.location.href = '/login';
  },
  fetchMe: async () => {
    try {
      const result = await Promise.race([
        getMe(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
      ]);
      set({ candidate: result.data, loading: false });
    } catch {
      set({ candidate: null, loading: false });
    }
  },
}));

export default useAuthStore;
