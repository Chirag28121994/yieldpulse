import { Investment, SupabaseConfig } from '../types/investment';
import { INITIAL_SAMPLE_INVESTMENTS } from '../utils/sampleData';

const STORAGE_KEYS = {
  INVESTMENTS: 'yieldpulse_investments_v1',
  CURRENCY: 'yieldpulse_selected_currency',
  SUPABASE_CONFIG: 'yieldpulse_supabase_config_v1',
};

export const StorageService = {
  getInvestments(): Investment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
      if (!data) {
        // First-time visit: seed with sample investments
        localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(INITIAL_SAMPLE_INVESTMENTS));
        return INITIAL_SAMPLE_INVESTMENTS;
      }
      return JSON.parse(data) as Investment[];
    } catch (err) {
      console.error('Failed to parse investments from localStorage:', err);
      return INITIAL_SAMPLE_INVESTMENTS;
    }
  },

  saveInvestments(investments: Investment[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments));
    } catch (err) {
      console.error('Failed to save investments to localStorage:', err);
    }
  },

  getSelectedCurrency(): string {
    return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'INR';
  },

  saveSelectedCurrency(currency: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
  },

  getSupabaseConfig(): SupabaseConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load Supabase config:', err);
    }
    return {
      url: '',
      anonKey: '',
      isConnected: false,
    };
  },

  saveSupabaseConfig(config: SupabaseConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save Supabase config:', err);
    }
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.INVESTMENTS);
  }
};
