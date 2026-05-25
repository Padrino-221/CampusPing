import { create } from 'zustand';
import { getMe } from '../api/auth';

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
      const { data } = await getMe();
      set({ candidate: data, loading: false });
    } catch {
      set({ candidate: null, loading: false });
    }
  },
}));

export default useAuthStore;
