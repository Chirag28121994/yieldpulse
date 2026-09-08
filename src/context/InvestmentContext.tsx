import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Investment, PortfolioAggregateMetrics, SupabaseConfig, AuthUser } from '../types/investment';
import { computePortfolioMetrics } from '../utils/calculations';
import { StorageService } from '../services/storage';
import { getSupabaseClient, SupabaseService, getInitialSupabaseConfig } from '../services/supabase';
import { INITIAL_SAMPLE_INVESTMENTS } from '../utils/sampleData';

interface InvestmentContextType {
  investments: Investment[];
  loading: boolean;
  currency: string;
  setCurrency: (c: string) => void;
  supabaseConfig: SupabaseConfig;
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  currentUser: AuthUser | null;
  portfolioMetrics: PortfolioAggregateMetrics;
  addInvestment: (inv: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInvestment: (id: string, updates: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  updateSupabaseConfig: (config: SupabaseConfig) => Promise<{ success: boolean; message: string }>;
  disconnectSupabase: () => void;
  syncLocalToSupabase: () => Promise<{ success: boolean; count: number }>;
  resetToSampleData: () => void;
  exportDataJson: () => void;
  importDataJson: (jsonString: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ user: AuthUser | null; error: string | null }>;
  signOut: () => Promise<void>;
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currency, setCurrencyState] = useState<string>('INR');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const savedConfig = StorageService.getSupabaseConfig();
    const envConfig = getInitialSupabaseConfig();
    return (savedConfig.url && savedConfig.anonKey) ? savedConfig : envConfig;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    const savedCurrency = StorageService.getSelectedCurrency();
    setCurrencyState(savedCurrency);

    const savedConfig = StorageService.getSupabaseConfig();
    const envConfig = getInitialSupabaseConfig();
    const effectiveConfig: SupabaseConfig = (savedConfig.url && savedConfig.anonKey)
      ? savedConfig
      : envConfig;

    setSupabaseConfig(effectiveConfig);

    const client = getSupabaseClient(effectiveConfig);

    const loadInitialData = async () => {
      setLoading(true);
      if (effectiveConfig.isConnected && effectiveConfig.url && effectiveConfig.anonKey && client) {
        try {
          // Check existing active user session
          const user = await SupabaseService.getSessionUser(client);
          if (user) {
            setCurrentUser(user);
            // Claim any unassigned legacy investments to ensure zero data loss
            await SupabaseService.claimUnassignedInvestments(client, user.id);
          }
          const data = await SupabaseService.fetchInvestments(client);
          setInvestments(data);
          setLoading(false);
          return;
        } catch (err) {
          console.warn('Could not fetch from Supabase on start, falling back to localStorage:', err);
        }
      }

      // Fallback: load from localStorage
      const localData = StorageService.getInvestments();
      setInvestments(localData);
      setLoading(false);
    };

    loadInitialData();

    // Listen to Supabase Auth state changes
    if (client) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const user: AuthUser = { id: session.user.id, email: session.user.email };
          setCurrentUser(user);
          // Claim legacy unassigned records
          await SupabaseService.claimUnassignedInvestments(client, user.id);
          const data = await SupabaseService.fetchInvestments(client);
          setInvestments(data);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setInvestments([]);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    StorageService.saveSelectedCurrency(c);
  };

  const isSupabaseConnected = Boolean(supabaseConfig.isConnected && supabaseConfig.url && supabaseConfig.anonKey);

  // Add Investment
  const addInvestment = useCallback(async (data: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    const newInvestment: Investment = {
      ...data,
      id: newId,
      userId: currentUser?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConnected) {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        setIsSyncing(true);
        try {
          const saved = await SupabaseService.insertInvestment(client, newInvestment);
          setInvestments(prev => [saved, ...prev]);
          setIsSyncing(false);
          return;
        } catch (err) {
          console.error('Failed to save to Supabase:', err);
          setIsSyncing(false);
          throw err;
        }
      }
    }

    // Local Storage Save
    setInvestments(prev => {
      const updated = [newInvestment, ...prev];
      StorageService.saveInvestments(updated);
      return updated;
    });
  }, [isSupabaseConnected, supabaseConfig]);

  // Update Investment
  const updateInvestment = useCallback(async (id: string, updates: Partial<Investment>) => {
    if (isSupabaseConnected) {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        setIsSyncing(true);
        try {
          const updated = await SupabaseService.updateInvestment(client, id, updates);
          setInvestments(prev => prev.map(item => item.id === id ? updated : item));
          setIsSyncing(false);
          return;
        } catch (err) {
          console.error('Failed to update in Supabase:', err);
          setIsSyncing(false);
          throw err;
        }
      }
    }

    // Local Storage Update
    setInvestments(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      StorageService.saveInvestments(updated);
      return updated;
    });
  }, [isSupabaseConnected, supabaseConfig]);

  // Delete Investment
  const deleteInvestment = useCallback(async (id: string) => {
    if (isSupabaseConnected) {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        setIsSyncing(true);
        try {
          await SupabaseService.deleteInvestment(client, id);
          setInvestments(prev => prev.filter(item => item.id !== id));
          setIsSyncing(false);
          return;
        } catch (err) {
          console.error('Failed to delete from Supabase:', err);
          setIsSyncing(false);
          throw err;
        }
      }
    }

    // Local Storage Delete
    setInvestments(prev => {
      const updated = prev.filter(item => item.id !== id);
      StorageService.saveInvestments(updated);
      return updated;
    });
  }, [isSupabaseConnected, supabaseConfig]);

  // Update Supabase Config & Test Connection
  const updateSupabaseConfig = useCallback(async (config: SupabaseConfig) => {
    setIsSyncing(true);
    const testResult = await SupabaseService.testConnection(config.url, config.anonKey);
    
    if (testResult.success) {
      const newConfig: SupabaseConfig = {
        ...config,
        isConnected: true,
      };
      setSupabaseConfig(newConfig);
      StorageService.saveSupabaseConfig(newConfig);

      // Fetch existing investments from Supabase
      const client = getSupabaseClient(newConfig);
      if (client) {
        try {
          const remoteData = await SupabaseService.fetchInvestments(client);
          setInvestments(remoteData);
        } catch (e) {
          console.warn('Connected but could not fetch investments yet:', e);
        }
      }
      setIsSyncing(false);
      return { success: true, message: 'Connected to Supabase successfully!' };
    } else {
      setIsSyncing(false);
      return { success: false, message: testResult.message };
    }
  }, []);

  const disconnectSupabase = useCallback(() => {
    const disconnectedConfig: SupabaseConfig = {
      url: '',
      anonKey: '',
      isConnected: false,
    };
    setSupabaseConfig(disconnectedConfig);
    StorageService.saveSupabaseConfig(disconnectedConfig);
    // Reload local data
    const local = StorageService.getInvestments();
    setInvestments(local);
  }, []);

  // Sync Local Investments to Supabase
  const syncLocalToSupabase = useCallback(async () => {
    if (!isSupabaseConnected) {
      return { success: false, count: 0 };
    }
    const client = getSupabaseClient(supabaseConfig);
    if (!client) {
      return { success: false, count: 0 };
    }

    setIsSyncing(true);
    let count = 0;
    try {
      const localData = StorageService.getInvestments();
      for (const item of localData) {
        await SupabaseService.insertInvestment(client, item);
        count++;
      }
      // Re-fetch from Supabase to ensure fresh IDs
      const refreshed = await SupabaseService.fetchInvestments(client);
      setInvestments(refreshed);
      setIsSyncing(false);
      return { success: true, count };
    } catch (err) {
      console.error('Sync failed:', err);
      setIsSyncing(false);
      throw err;
    }
  }, [isSupabaseConnected, supabaseConfig]);

  // Reset to Sample Data
  const resetToSampleData = useCallback(() => {
    setInvestments(INITIAL_SAMPLE_INVESTMENTS);
    StorageService.saveInvestments(INITIAL_SAMPLE_INVESTMENTS);
  }, []);

  // Export JSON
  const exportDataJson = useCallback(() => {
    const jsonStr = JSON.stringify(investments, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yieldpulse_investments_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [investments]);

  // Import JSON
  const importDataJson = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        setInvestments(parsed);
        StorageService.saveInvestments(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Auth handlers
  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient(supabaseConfig);
    if (!client) return { user: null, error: 'Database not connected' };
    const res = await SupabaseService.signInWithPassword(client, email, password);
    if (res.user) {
      setCurrentUser(res.user);
      // Auto-claim unassigned data to prevent any data loss
      await SupabaseService.claimUnassignedInvestments(client, res.user.id);
      const data = await SupabaseService.fetchInvestments(client);
      setInvestments(data);
    }
    return res;
  }, [supabaseConfig]);

  const signUp = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient(supabaseConfig);
    if (!client) return { user: null, error: 'Database not connected' };
    const res = await SupabaseService.signUpWithPassword(client, email, password);
    if (res.user) {
      setCurrentUser(res.user);
      // Auto-claim unassigned data to prevent any data loss
      await SupabaseService.claimUnassignedInvestments(client, res.user.id);
      const data = await SupabaseService.fetchInvestments(client);
      setInvestments(data);
    }
    return res;
  }, [supabaseConfig]);

  const signOut = useCallback(async () => {
    const client = getSupabaseClient(supabaseConfig);
    if (client) {
      await SupabaseService.signOut(client);
    }
    setCurrentUser(null);
    setInvestments([]);
  }, [supabaseConfig]);

  // Calculate live portfolio metrics
  const portfolioMetrics = useMemo(() => {
    return computePortfolioMetrics(investments);
  }, [investments]);

  return (
    <InvestmentContext.Provider
      value={{
        investments,
        loading,
        currency,
        setCurrency,
        supabaseConfig,
        isSupabaseConnected,
        isSyncing,
        currentUser,
        portfolioMetrics,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        updateSupabaseConfig,
        disconnectSupabase,
        syncLocalToSupabase,
        resetToSampleData,
        exportDataJson,
        importDataJson,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </InvestmentContext.Provider>
  );
};

export function useInvestments() {
  const context = useContext(InvestmentContext);
  if (!context) {
    throw new Error('useInvestments must be used within an InvestmentProvider');
  }
  return context;
}
