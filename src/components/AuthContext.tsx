import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentProfile, getCharacter } from '../lib/supabase';
import type { UserProfile, Character } from '../types/index';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  character: Character | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, characterClass: string, province?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    const prof = await getCurrentProfile();
    setProfile(prof);
    if (prof) {
      const char = await getCharacter(prof.id);
      setCharacter(char);
    } else {
      setCharacter(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          const prof = await getCurrentProfile();
          setProfile(prof);
          if (prof) {
            const char = await getCharacter(prof.id);
            setCharacter(char);
          }
          setLoading(false);
        })();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        (async () => {
          const prof = await getCurrentProfile();
          setProfile(prof);
          if (prof) {
            const char = await getCharacter(prof.id);
            setCharacter(char);
          } else {
            setCharacter(null);
          }
        })();
      } else {
        setProfile(null);
        setCharacter(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    }
  }, [user?.id]);

  const signUp = async (email: string, password: string, username: string, characterClass: string, province?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          character_class: characterClass,
          province
        }
      }
    });

    if (error) return { error };

    // The trigger handle_new_user() will create profile automatically
    // If email confirmation is disabled, we get a session immediately
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);

      // Refresh local state
      const prof = await getCurrentProfile();
      setProfile(prof);
      if (prof) {
        const char = await getCharacter(prof.id);
        setCharacter(char);
      }

      // Mark onboarding as not completed for new users
      if (typeof window !== 'undefined') {
        localStorage.removeItem('otakukamba-onboarding');
      }
    } else if (data.user && !data.session) {
      // Email confirmation required - this is a new user who needs to confirm email
      // Mark that they registered and need to confirm
      if (typeof window !== 'undefined') {
        localStorage.setItem('otakukamba-pending-confirmation', 'true');
        localStorage.removeItem('otakukamba-onboarding'); // Remove any previous onboarding state
      }
    }

    return { error: null, needsEmailConfirmation: !data.session && !!data.user };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCharacter(null);
    setSession(null);
  };

  const value = {
    user,
    profile,
    character,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
