import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Investment, SupabaseConfig } from '../types/investment';

let supabaseClient: SupabaseClient | null = null;

export function getInitialSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: Boolean(envUrl && envKey),
  };
}

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  // 1. If explicit config passed and valid, reinitialize or use it
  if (config?.url && config?.anonKey) {
    try {
      supabaseClient = createClient(config.url, config.anonKey);
      return supabaseClient;
    } catch (err) {
      console.error('Failed to initialize Supabase with custom config:', err);
      return null;
    }
  }

  // 2. If already initialized, return it
  if (supabaseClient) {
    return supabaseClient;
  }

  // 3. Fallback to Vite env variables if present
  const envConfig = getInitialSupabaseConfig();
  if (envConfig.isConnected) {
    try {
      supabaseClient = createClient(envConfig.url, envConfig.anonKey);
      return supabaseClient;
    } catch (err) {
      console.error('Failed to initialize Supabase from env:', err);
      return null;
    }
  }

  return null;
}

// Convert DB snake_case to frontend camelCase
export function mapDbToInvestment(row: any): Investment {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    institution: row.institution,
    category: row.category,
    principalAmount: Number(row.principal_amount),
    annualRatePct: Number(row.annual_rate_pct),
    compounding: row.compounding,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    status: row.status,
    currency: row.currency || 'INR',
    taxDeductionRatePct: row.tax_deduction_rate_pct ? Number(row.tax_deduction_rate_pct) : 0,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert frontend camelCase to DB snake_case
export function mapInvestmentToDb(inv: Partial<Investment>): any {
  const data: any = {};
  if (inv.id && !inv.id.startsWith('sample-') && !inv.id.startsWith('local-')) {
    data.id = inv.id;
  }
  if (inv.title !== undefined) data.title = inv.title;
  if (inv.institution !== undefined) data.institution = inv.institution;
  if (inv.category !== undefined) data.category = inv.category;
  if (inv.principalAmount !== undefined) data.principal_amount = Number(inv.principalAmount);
  if (inv.annualRatePct !== undefined) data.annual_rate_pct = Number(inv.annualRatePct);
  if (inv.compounding !== undefined) data.compounding = inv.compounding;
  if (inv.startDate !== undefined) data.start_date = inv.startDate;
  if (inv.maturityDate !== undefined) data.maturity_date = inv.maturityDate;
  if (inv.status !== undefined) data.status = inv.status;
  if (inv.currency !== undefined) data.currency = inv.currency;
  if (inv.taxDeductionRatePct !== undefined) data.tax_deduction_rate_pct = Number(inv.taxDeductionRatePct);
  if (inv.notes !== undefined) data.notes = inv.notes;

  return data;
}

export const SupabaseService = {
  async testConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = createClient(url, anonKey);
      const { error } = await client.from('investments').select('id').limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            message: 'Connected to Supabase, but the "investments" table is missing! Please execute the SQL migration script first.'
          };
        }
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Successfully connected to Supabase database!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to connect to Supabase' };
    }
  },

  async fetchInvestments(client: SupabaseClient): Promise<Investment[]> {
    const { data, error } = await client
      .from('investments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(mapDbToInvestment);
  },

  async insertInvestment(client: SupabaseClient, investment: Investment): Promise<Investment> {
    const dbPayload = mapInvestmentToDb(investment);
    const { data, error } = await client
      .from('investments')
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapDbToInvestment(data);
  },

  async updateInvestment(client: SupabaseClient, id: string, updates: Partial<Investment>): Promise<Investment> {
    const dbPayload = mapInvestmentToDb(updates);
    const { data, error } = await client
      .from('investments')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapDbToInvestment(data);
  },

  async deleteInvestment(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
};
