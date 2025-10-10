
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from './types';

// This function is for use in Server Components to get the user ID
export async function getUserId() {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
}

// This function is for use in Server Components to protect routes
export async function verifyUserRole(requiredRole: UserRole, redirectPath: string) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect(`/auth/login?redirect=${redirectPath}`);
    }

    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    
    if (error || !profile) {
        console.error("Error fetching user profile or profile not found, redirecting to login.", error);
        // Signing out here helps clear a potentially corrupted session state
        await supabase.auth.signOut();
        redirect(`/auth/login?error=profile_fetch_failed&redirect=${redirectPath}`);
    }

    if (profile.role !== requiredRole) {
        // If the user is not the required role, redirect them to their own dashboard
        switch (profile.role) {
            case 'admin':
                redirect('/admin');
                break;
            case 'vendor':
                redirect('/vendor/dashboard');
                break;
            default:
                redirect('/');
                break;
        }
    }
}
