import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from './types_db';

// Environment variables - use fallback for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (process.env.NEXT_PHASE === 'phase-production-build' ? 'https://placeholder.supabase.co' : undefined);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (process.env.NEXT_PHASE === 'phase-production-build' ? 'placeholder-anon-key' : undefined);

export const createServerSupabaseClient = () => {
  const cookieStore = cookies();

  // During build time, return a mock client if environment variables are not available
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any;
  }

  return createServerComponentClient<Database>({
    cookies: () => cookieStore
  });
};

export default createServerSupabaseClient;
