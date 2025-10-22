import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: any) {
          try {
            const updatedCookies = await cookies();
            updatedCookies.set(name, value, {
              ...options,
              httpOnly: options?.httpOnly ?? true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            });
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        async remove(name: string, options: any) {
          try {
            const updatedCookies = await cookies();
            updatedCookies.delete(name);
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
}
