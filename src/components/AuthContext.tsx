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
  signUp: (email: string, password: string, username: string, characterClass: string) => Promise<{ error: Error | null }>;
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

  const signUp = async (email: string, password: string, username: string, characterClass: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          character_class: characterClass
        }
      }
    });

    if (error) return { error };

    // If email confirmation is disabled, we get a session immediately
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);

      // Create profile immediately
      (async () => {
        try {
          const userId = data.session!.user.id;
          await supabase.from('profiles').insert({
            id: userId,
            username,
            email,
            is_admin: false,
            is_super_admin: false,
            is_event_publisher: false
          });
          // Create user_settings
          await supabase.from('user_settings').insert({
            user_id: userId,
            theme: 'dark',
            notifications_enabled: true,
            email_notifications: true,
            show_province: true,
            show_character: true,
            language: 'pt'
          });
          // Check if this is the first user -> make super admin
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          if (count === 1) {
            await supabase.from('profiles').update({ is_super_admin: true, is_admin: true }).eq('id', userId);
          }
          // Create default character if not exists
          const { data: existingChar } = await supabase.from('characters').select('*').eq('user_id', userId).maybeSingle();
          if (!existingChar) {
            await supabase.from('characters').insert({
              user_id: userId,
              name: username,
              class: characterClass || 'ninja',
              level: 1,
              xp: 0,
              hp: 100,
              max_hp: 100,
              attack: 10,
              defense: 10,
              speed: 10,
              special: 10,
              wins: 0,
              losses: 0,
              draws: 0
            });
          }
          const prof = await getCurrentProfile();
          setProfile(prof);
        } catch (e) {
          console.error('Error creating profile after signup:', e);
        }
      })();
    }

    return { error: null };
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
