
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types_db';

// Environment variables - use fallback for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (process.env.NEXT_PHASE === 'phase-production-build' ? 'https://placeholder.supabase.co' : 'https://placeholder.supabase.co');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (process.env.NEXT_PHASE === 'phase-production-build' ? 'placeholder-anon-key' : 'placeholder-anon-key');

// Validate that required environment variables are set
function validateSupabaseConfig() {
  // Skip all validation during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    // During runtime, try to get from process.env again in case it wasn't available initially
    const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const runtimeKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!runtimeUrl || !runtimeKey) {
      throw new Error(
        `CRITICAL ERROR: Supabase configuration is missing. ` +
        `Please check your project's .env file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly.`
      );
    }
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

    // Create client even during build time (with fallback values)
    if (supabaseUrl && supabaseAnonKey) {
      supabaseClient = createPagesBrowserClient<Database>({
        supabaseUrl: supabaseUrl!,
        supabaseKey: supabaseAnonKey!,
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
      // During build time, return a mock object to prevent errors
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('Supabase client not available during build time');
        return () => Promise.resolve({ data: null, error: null });
      }
      // During runtime, throw error if client not initialized
      console.error('Supabase client not initialized:', {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
        nextPhase: process.env.NEXT_PHASE,
      });
      throw new Error('Supabase client not initialized. Please check your environment variables.');
    }
    return client[prop as keyof typeof client];
  }
});

// Export validation function for explicit checks
export function ensureSupabaseConfigured() {
  validateSupabaseConfig();
}
