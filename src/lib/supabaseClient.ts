
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types_db';

// Environment variables - use fallback for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate that required environment variables are set
function validateSupabaseConfig() {
  // Skip validation during build time or if no environment variables are set
  if (process.env.NEXT_PHASE === 'phase-production-build' || !supabaseUrl || !supabaseAnonKey) {
    return;
  }

  // Only validate URL format at runtime, not during build
  if (typeof window === 'undefined' && supabaseUrl) {
    try {
      new URL(supabaseUrl);
    } catch {
      throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
    }
  }
}

// Create Supabase client with validation
let supabaseClient: ReturnType<typeof createPagesBrowserClient<Database>> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    validateSupabaseConfig();

    // Only create client if environment variables are available
    if (supabaseUrl && supabaseAnonKey) {
      supabaseClient = createPagesBrowserClient<Database>({
        supabaseUrl: supabaseUrl,
        supabaseKey: supabaseAnonKey,
      });
    }
  }
  return supabaseClient;
}

// Export the client getter function
export const supabase = new Proxy({} as ReturnType<typeof createPagesBrowserClient<Database>>, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      // Return a mock object that handles missing Supabase configuration gracefully
      console.warn('Supabase client not available - environment variables may be missing');
      return () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
    }
    return client[prop as keyof typeof client];
  }
});

// Export validation function for explicit checks
export function ensureSupabaseConfigured() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return false;
  }
  validateSupabaseConfig();
  return true;
}
