import { create } from 'zustand';

const useCampaignStore = create((set) => ({
  campaigns: [],
  currentCampaign: null,
  filters: {},
  audienceCount: 0,
  setCampaigns: (campaigns) => set({ campaigns }),
  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),
  setFilters: (filters) => set({ filters }),
  setAudienceCount: (count) => set({ audienceCount: count }),
}));

export default useCampaignStore;
