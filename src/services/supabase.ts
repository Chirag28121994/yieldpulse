import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Investment, SupabaseConfig, AuthUser } from '../types/investment';

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
  let notes = row.notes || '';
  let schemeCode = row.scheme_code || undefined;
  let units = row.units !== null && row.units !== undefined ? Number(row.units) : undefined;
  let buyNav = row.buy_nav !== null && row.buy_nav !== undefined ? Number(row.buy_nav) : undefined;

  // Fallback: If metadata was stored in notes before SQL migration
  if (notes.includes('__MF_META__')) {
    try {
      const match = notes.match(/__MF_META__:(\{.*?\})/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        schemeCode = schemeCode || meta.schemeCode;
        units = units !== undefined ? units : meta.units;
        buyNav = buyNav !== undefined ? buyNav : meta.buyNav;
        notes = notes.replace(/__MF_META__:\{.*?\}/, '').trim();
      }
    } catch {
      // Ignore parse failure
    }
  }

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
    notes,
    schemeCode,
    units,
    buyNav,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Convert frontend camelCase to DB snake_case
export function mapInvestmentToDb(inv: Partial<Investment>): any {
  const data: any = {};
  if (inv.id && UUID_REGEX.test(inv.id)) {
    data.id = inv.id;
  }
  if (inv.userId !== undefined && UUID_REGEX.test(inv.userId)) {
    data.user_id = inv.userId;
  }
  if (inv.title !== undefined) data.title = inv.title;
  if (inv.institution !== undefined) data.institution = inv.institution;
  if (inv.category !== undefined) data.category = inv.category;
  if (inv.principalAmount !== undefined) data.principal_amount = Number(inv.principalAmount);
  if (inv.annualRatePct !== undefined) data.annual_rate_pct = Number(inv.annualRatePct);
  if (inv.compounding !== undefined) data.compounding = inv.compounding;
  if (inv.startDate !== undefined) data.start_date = inv.startDate;
  
  if (inv.maturityDate) {
    data.maturity_date = inv.maturityDate;
  } else if (inv.category === 'mutual_fund') {
    // Open-ended mutual fund: default to a horizon in 2076 to satisfy NOT NULL & check_maturity_after_start
    data.maturity_date = '2076-12-31';
  }

  if (inv.status !== undefined) data.status = inv.status;
  if (inv.currency !== undefined) data.currency = inv.currency;
  if (inv.taxDeductionRatePct !== undefined) data.tax_deduction_rate_pct = Number(inv.taxDeductionRatePct);
  
  let notes = inv.notes || '';
  if (inv.category === 'mutual_fund') {
    if (inv.schemeCode !== undefined) data.scheme_code = inv.schemeCode;
    if (inv.units !== undefined) data.units = Number(inv.units);
    if (inv.buyNav !== undefined) data.buy_nav = Number(inv.buyNav);

    // Resilient backup embedded in notes
    const mfMeta = JSON.stringify({
      schemeCode: inv.schemeCode,
      units: inv.units,
      buyNav: inv.buyNav,
    });
    notes = `${notes.replace(/__MF_META__:\{.*?\}/, '').trim()} __MF_META__:${mfMeta}`.trim();
  }
  data.notes = notes;

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
    // On insert, let Postgres generate the authoritative UUID primary key
    delete dbPayload.id;

    try {
      const { data, error } = await client
        .from('investments')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        // Fallback: If PostgreSQL schema doesn't have scheme_code/units/buy_nav columns yet,
        // retry inserting without them (data is safely preserved in notes!)
        if (
          error.message?.includes('column') &&
          (error.message.includes('scheme_code') || error.message.includes('units') || error.message.includes('buy_nav'))
        ) {
          const stripped = { ...dbPayload };
          delete stripped.scheme_code;
          delete stripped.units;
          delete stripped.buy_nav;
          const retry = await client.from('investments').insert(stripped).select().single();
          if (retry.error) throw retry.error;
          return mapDbToInvestment(retry.data);
        }
        throw error;
      }

      return mapDbToInvestment(data);
    } catch (err) {
      throw err;
    }
  },

  async updateInvestment(client: SupabaseClient, id: string, updates: Partial<Investment>): Promise<Investment> {
    const dbPayload = mapInvestmentToDb(updates);
    try {
      const { data, error } = await client
        .from('investments')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Fallback for missing columns
        if (
          error.message?.includes('column') &&
          (error.message.includes('scheme_code') || error.message.includes('units') || error.message.includes('buy_nav'))
        ) {
          const stripped = { ...dbPayload };
          delete stripped.scheme_code;
          delete stripped.units;
          delete stripped.buy_nav;
          const retry = await client.from('investments').update(stripped).eq('id', id).select().single();
          if (retry.error) throw retry.error;
          return mapDbToInvestment(retry.data);
        }
        throw error;
      }

      return mapDbToInvestment(data);
    } catch (err) {
      throw err;
    }
  },

  async deleteInvestment(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // Auth Methods
  async getSessionUser(client: SupabaseClient): Promise<AuthUser | null> {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session?.user) return null;
      return {
        id: session.user.id,
        email: session.user.email,
      };
    } catch {
      return null;
    }
  },

  async signInWithPassword(client: SupabaseClient, email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'No user returned' };
    return {
      user: { id: data.user.id, email: data.user.email },
      error: null
    };
  },

  async signUpWithPassword(client: SupabaseClient, email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'No user returned' };
    return {
      user: { id: data.user.id, email: data.user.email },
      error: null
    };
  },

  async signOut(client: SupabaseClient): Promise<void> {
    await client.auth.signOut();
  },

  // Claim unassigned (user_id IS NULL) investments for the logged-in user
  async claimUnassignedInvestments(client: SupabaseClient, userId: string): Promise<number> {
    try {
      const { data, error } = await client
        .from('investments')
        .update({ user_id: userId })
        .is('user_id', null)
        .select('id');

      if (error) {
        console.warn('Could not claim unassigned investments:', error);
        return 0;
      }
      return data ? data.length : 0;
    } catch (err) {
      console.warn('Failed to claim legacy investments:', err);
      return 0;
    }
  }
};
