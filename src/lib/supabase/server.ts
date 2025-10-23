import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = 'Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log('Creating Supabase client with URL:', supabaseUrl.substring(0, 30) + '...');

  try {
    const client = createSupabaseServerClient(
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

    console.log('Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
}
