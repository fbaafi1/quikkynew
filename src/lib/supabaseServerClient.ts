import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from './types_db';

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If environment variables are not available, return a mock client
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured. Using mock client.');
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            order: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
          }),
          order: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
        }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: { message: 'Supabase not configured' } }),
        signOut: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      },
    } as any;
  }

  return createServerComponentClient<Database>({
    cookies: () => cookieStore
  });
};

export default createServerSupabaseClient;
