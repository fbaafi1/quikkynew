
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types_db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This function checks if the environment variables are set correctly.
// It's a common source of errors, so we want to be explicit about it.
function checkSupabaseEnv() {
  if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    const missing = [];
    if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
      missing.push('NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
      missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    
    // Throwing an error is more forceful and prevents the app from running in a broken state.
    throw new Error(
      `CRITICAL ERROR: Supabase configuration is missing or incorrect. ` +
      `Please check your project's .env file and ensure the following variables are set correctly: ${missing.join(', ')}. ` +
      `You can find these values in your Supabase project's API settings. After updating the .env file, you MUST restart the development server.`
    );
  }
}

// Check the environment variables on module load.
checkSupabaseEnv();

// Use createPagesBrowserClient for client-side Supabase instance.
// This is the recommended way for Next.js Pages Router or App Router client components.
export const supabase = createPagesBrowserClient<Database>();
