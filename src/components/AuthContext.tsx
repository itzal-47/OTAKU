import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Character } from '../types/index';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  character: Character | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    characterClass: string,
    province?: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── helpers que NÃO chamam supabase.auth.getUser() ────────────────────────
// Chamar getUser() dentro de onAuthStateChange dispara novos eventos de auth
// e cria um loop infinito de pedidos de rede. Aqui usamos diretamente o
// userId que já vem do evento, sem fazer round-trip ao endpoint /auth/v1/user.

async function fetchProfileById(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();          // maybeSingle: não lança erro se não houver linha
  return data;
}

async function fetchCharacterByUserId(userId: string): Promise<Character | null> {
  const { data } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [session, setSession]   = useState<Session | null>(null);
  const [loading, setLoading]   = useState(true);

  // Evita pedidos duplicados simultâneos
  const fetchingRef = useRef(false);

  const activeRequestRef = useRef(0);

const loadUserData = async (
userId:string
)=>{

const requestId=
++activeRequestRef.current;

try{

const [

prof,
char

]=await Promise.all([

fetchProfileById(userId),

fetchCharacterByUserId(userId)

]);

if(
requestId
!==activeRequestRef.current
){

return;

}

setProfile(
prof ?? null
);

setCharacter(
char ?? null
);

}
catch(err){

console.error(
"Erro carregar perfil",
err
);

setProfile(null);

setCharacter(null);

}

};

  const refreshProfile = async () => {
    if (!user) return;
    await loadUserData(user.id);
  };

  useEffect(() => {
    // ✅ Usar APENAS onAuthStateChange — dispara INITIAL_SESSION no mount,
    //    substituindo completamente a necessidade de chamar getSession().
    //    Chamar getSession() E onAuthStateChange em simultâneo causava o
    //    loop infinito: dois listeners a fazer getUser() ao mesmo tempo.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          sessionStorage.setItem('otakukamba-just-logged-in', 'true');
        }

        f(session?.user){

queueMicrotask(
()=>loadUserData(
session.user.id
)
);

} else {
          setProfile(null);
          setCharacter(null);
        }

        // Garantir que loading é sempre desativado após o primeiro evento
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── signUp ───────────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    username: string,
    characterClass: string,
    province?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, character_class: characterClass, province },
      },
    });

    if (error) return { error };

    if (data.session) {
      // Email confirmation desativado: sessão imediata
      setSession(data.session);
      setUser(data.session.user);
      await loadUserData(data.session.user.id);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('otakukamba-onboarding');
      }
    } else if (data.user && !data.session) {
      // Confirmação de email necessária
      if (typeof window !== 'undefined') {
        localStorage.setItem('otakukamba-pending-confirmation', 'true');
        localStorage.removeItem('otakukamba-onboarding');
      }
    }

    return { error: null, needsEmailConfirmation: !data.session && !!data.user };
  };

  // ─── signIn ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  // ─── signOut ──────────────────────────────────────────────────────────────
 const signOut = async()=>{

try{

await supabase.auth.signOut();

}
finally{

activeRequestRef.current++;

setUser(null);

setProfile(null);

setCharacter(null);

setSession(null);

}

};

  return (
    <AuthContext.Provider
      value={{ user, profile, character, session, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
