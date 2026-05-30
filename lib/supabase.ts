import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      return (value as Function).bind(client);
    }
    return value;
  },
});

// Types
export type Task = {
  id: string;
  text: string;
  category: 'Prospección' | 'Contenido' | 'Ventas' | 'Automatización' | 'Admin';
  done: boolean;
  date: string; // YYYY-MM-DD
  is_recurring?: boolean;
  created_at: string;
};

export type Revenue = {
  id: string;
  amount: number;
  description: string;
  client: string;
  month: string; // YYYY-MM
  status?: 'cobrado' | 'pendiente';
  created_at: string;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  channel: string; // Instagram, LinkedIn, Referido, Frío, etc.
  service: string; // Automatización, Web, Combo
  status: 'Nuevo' | 'Contactado' | 'Demo' | 'Propuesta' | 'Negociación' | 'Cerrado';
  last_contact: string; // YYYY-MM-DD
  amount?: number;
  notes?: string;
  created_at: string;
};
