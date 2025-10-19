
"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from '@/lib/types';
import type { Address } from '@/lib/types';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from "next/navigation";

interface UserContextType {
  currentUser: User | null;
  session: Session | null;
  loadingUser: boolean;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ user: SupabaseAuthUser | null; error: any | null }>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(false); // Start with false for immediate UI
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Try to get cached user data immediately
  const getCachedUser = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('quikart_user');
        if (cached) {
          const userData = JSON.parse(cached);
          // Check if cache is not too old (1 hour)
          if (Date.now() - userData.timestamp < 3600000) {
            return userData.user;
          }
        }
      } catch (error) {
        console.error('Error reading cached user:', error);
      }
    }
    return null;
  }, []);

  // Cache user data
  const cacheUser = useCallback((user: User | null) => {
    if (typeof window !== 'undefined') {
      try {
        if (user) {
          localStorage.setItem('quikart_user', JSON.stringify({
            user,
            timestamp: Date.now()
          }));
        } else {
          localStorage.removeItem('quikart_user');
        }
      } catch (error) {
        console.error('Error caching user:', error);
      }
    }
  }, []);

  const fetchUserProfile = useCallback(async (authUser: SupabaseAuthUser | null) => {
    if (!authUser) {
      console.log('fetchUserProfile: No auth user provided');
      setCurrentUser(null);
      cacheUser(null);
      setLoadingUser(false);
      setInitialLoad(false);
      return;
    }

    console.log('fetchUserProfile: Fetching profile for user:', authUser.id);
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found for this user
          console.log('fetchUserProfile: No profile found for user:', authUser.id);
          setCurrentUser(null);
          cacheUser(null);
        } else {
          console.error("Error fetching user profile:", error);
          throw error;
        }
      } else {
        console.log('fetchUserProfile: Profile found:', profile);
        const userProfile: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name || undefined,
          phone: profile.phone || undefined,
          role: profile.role,
          address: profile.address ? (profile.address as unknown as Address) : undefined,
        };
        setCurrentUser(userProfile);
        cacheUser(userProfile);
      }
    } catch (e) {
      console.error("An error occurred in fetchUserProfile:", e);
      setCurrentUser(null);
      cacheUser(null);
    } finally {
      setLoadingUser(false);
      setInitialLoad(false);
    }
  }, [cacheUser]);

  useEffect(() => {
    // Try to load cached user immediately for instant UI
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setCurrentUser(cachedUser);
      setInitialLoad(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!initialLoad) {
          setLoadingUser(true);
        }
        setSession(session);
        await fetchUserProfile(session?.user ?? null);
    });

    // Fetch initial session in background - don't block UI
    const getInitialSession = async () => {
        try {
          console.log('getInitialSession: Starting session fetch...');
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('getInitialSession: Error fetching session:', error);
            setLoadingUser(false);
            setInitialLoad(false);
            return;
          }

          console.log('getInitialSession: Session fetched:', session ? 'Session exists' : 'No session');
          if (session) {
            console.log('getInitialSession: User ID:', session.user?.id);
          }

          setSession(session);
          await fetchUserProfile(session?.user ?? null);
        } catch (error) {
          console.error('getInitialSession: Exception occurred:', error);
          setLoadingUser(false);
          setInitialLoad(false);
        }
    };

    // Start loading immediately but don't block UI
    setInitialLoad(false);
    getInitialSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile, getCachedUser]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login Error:", error.message);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
    // Redirection is handled by the callback page and layouts now
    return { user: data.user, error };
  };

  const logout = async () => {
    try {
      console.log('UserContext: Starting logout...');

      // Clear local state immediately for better UX
      console.log('UserContext: Clearing local state first...');
      setCurrentUser(null);
      cacheUser(null);
      setSession(null);
      console.log('UserContext: Local state cleared');

      // Start redirect immediately - don't wait for Supabase
      console.log('UserContext: Redirecting to home immediately...');
      router.push("/");
      console.log('UserContext: Redirect initiated');

      // Fire-and-forget Supabase signOut (don't await it)
      console.log('UserContext: Calling supabase.auth.signOut() in background...');
      supabase.auth.signOut().then(({ error }) => {
        if (error) {
          console.error('UserContext: Supabase signOut error (non-blocking):', error);
        } else {
          console.log('UserContext: Supabase signOut successful (background)');
        }
      }).catch(error => {
        console.warn('UserContext: Supabase signOut failed (background):', error);
      });

    } catch (error) {
      console.error('UserContext: Logout failed with error:', error);
      // Even if there's an error, redirect anyway since local state is cleared
      router.push("/");
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!currentUser) return { success: false, error: "No user logged in" };

    // Convert Address to Json if present
    const updateData: any = { ...updates };
    if (updates.address) {
      updateData.address = updates.address as any;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    }

    setCurrentUser(data as unknown as User | null);
    toast({ title: "Profile Updated", description: "Your details have been saved." });
    return { success: true };
  };

  const value = {
    currentUser,
    session,
    loadingUser,
    logout,
    updateUser,
    login,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
