
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
    try {
        const cookieStore = cookies();
        const supabase = createServerComponentClient({ cookies: () => cookieStore });

        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session, redirect to login
        if (!session || !session.user?.email) {
            // Check if we're in a build environment or if redirect is not available
            if (typeof window !== 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
                throw new Error('Authentication required');
            }
            return redirect(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, email')
            .eq('email', session.user.email)
            .single();

        // If profile not found or error, sign out and redirect to login
        if (profileError || !profile) {
            console.error("User profile not found or error:", profileError);
            if (typeof window !== 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
                throw new Error('User profile not found');
            }
            await supabase.auth.signOut();
            return redirect(`/auth/login?error=profile_not_found&redirect=${encodeURIComponent(redirectPath)}`);
        }

        // If user doesn't have the required role, redirect to appropriate dashboard
        if (profile.role !== requiredRole) {
            const redirectTo = profile.role === 'admin'
                ? '/admin'
                : profile.role === 'vendor'
                    ? '/vendor/dashboard'
                    : '/';
            if (typeof window !== 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
                throw new Error(`Access denied. Required role: ${requiredRole}, user role: ${profile.role}`);
            }
            return redirect(redirectTo);
        }

        // If we get here, the user has the required role
        return { session, profile };

    } catch (error) {
        console.error("Error in verifyUserRole:", error);
        // In case of any error, redirect to login
        if (typeof window !== 'undefined' || process.env.NEXT_PHASE === 'phase-production-build') {
            throw error;
        }
        return redirect(`/auth/login?error=auth_error&redirect=${encodeURIComponent(redirectPath)}`);
    }
}
