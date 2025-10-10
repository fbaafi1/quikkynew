
"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from '@/lib/types';
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
      setCurrentUser(null);
      cacheUser(null);
      setLoadingUser(false);
      setInitialLoad(false);
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error && error.code !== "PGRST116") { // 'PGRST116' is the code for no rows found
        console.error("Error fetching user profile:", error);
        throw error;
      }

      const userProfile = profile as User | null;
      setCurrentUser(userProfile);
      cacheUser(userProfile);
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
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          await fetchUserProfile(session?.user ?? null);
        } catch (error) {
          console.error('Error fetching initial session:', error);
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
    await supabase.auth.signOut();
    setCurrentUser(null); // Immediately clear user state
    cacheUser(null); // Clear cached user
    setSession(null);
    router.push("/");
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!currentUser) return { success: false, error: "No user logged in" };

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    }

    setCurrentUser(data as User | null);
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
