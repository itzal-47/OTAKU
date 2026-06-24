import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function getCharacter(userId: string) {
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .single();

  return character;
}

export async function createDefaultRoomsIfNotExist(userId: string) {
  const defaultRooms = [
    { slug: 'geral', name: 'Geral', description: 'Conversas gerais sobre anime' },
    { slug: 'one-piece', name: 'One Piece', description: 'Discussões sobre One Piece' },
    { slug: 'naruto', name: 'Naruto', description: 'Discussões sobre Naruto' },
    { slug: 'demon-slayer', name: 'Demon Slayer', description: 'Discussões sobre Demon Slayer' },
    { slug: 'jujutsu-kaisen', name: 'Jujutsu Kaisen', description: 'Discussões sobre Jujutsu Kaisen' },
    { slug: 'bleach', name: 'Bleach', description: 'Discussões sobre Bleach' },
    { slug: 'attack-on-titan', name: 'Attack on Titan', description: 'Discussões sobre Attack on Titan' },
    { slug: 'arena', name: 'Arena Chat', description: 'Conversas sobre duelos' },
  ];

  for (const room of defaultRooms) {
    try {
      await supabase
        .from('chat_rooms')
        .insert({
          slug: room.slug,
          name: room.name,
          description: room.description,
          type: 'public',
          created_by: userId
        });
    } catch {}
  }
}

export async function signUp(email: string, password: string, username: string, characterClass: string) {
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

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });

  return { data, error };
}

export async function signInWithDiscord() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });

  return { data, error };
}
