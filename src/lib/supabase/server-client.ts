import { createServerClient as createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Remove the set and remove functions that cause the SSR error
        // These operations should only be done in Server Actions or Route Handlers
        set: () => {
          console.warn('Cookie modification attempted during SSR. This should be done in a Server Action or Route Handler.');
        },
        remove: () => {
          console.warn('Cookie removal attempted during SSR. This should be done in a Server Action or Route Handler.');
        },
      },
    }
  );
}
