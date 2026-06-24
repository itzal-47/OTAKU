/*
# Criar tabelas core do OtakuKamba

1. Novas Tabelas
- `profiles` - Perfis dos utilizadores
- `characters` - Personagens RPG
- `posts` - Posts do feed
- `post_likes` - Likes nos posts
- `post_comments` - Comentários nos posts
- `stories` - Stories com expiração
- `story_views` - Visualizações de stories
- `chat_rooms` - Salas de chat
- `chat_room_members` - Membros das salas
- `chat_messages` - Mensagens de chat
- `duels` - Duelos na arena
- `events` - Eventos
- `event_registrations` - Inscrições em eventos
- `clans` - Clãs
- `clan_members` - Membros de clãs
- `clan_requests` - Pedidos de entrada em clãs
- `tournaments` - Torneios
- `tournament_participants` - Participantes de torneios
- `tournament_matches` - Partidas de torneios
- `notifications` - Notificações
- `follows` - Seguidores
- `user_settings` - Configurações do utilizador
- `blocked_users` - Utilizadores bloqueados
- `reports` - Denúncias
- `user_badges` - Badges dos utilizadores
- `badges` - Tabela de badges
- `quests` - Missões
- `user_quests` - Missões dos utilizadores
- `waitlist` - Lista de espera
- `admin_requests` - Pedidos de admin
- `private_chats` - Chats privados
- `private_messages` - Mensagens privadas
- `admin_inbox` - Caixa do admin

2. Segurança
- RLS em todas as tabelas
- Políticas owner-scoped para dados privados
- Políticas públicas para dados visíveis
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text,
  avatar_url text,
  city text,
  province text,
  country text DEFAULT 'Angola',
  is_admin boolean DEFAULT false,
  is_super_admin boolean DEFAULT false,
  is_event_publisher boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  class text NOT NULL,
  level int NOT NULL DEFAULT 1,
  xp int NOT NULL DEFAULT 0,
  hp int NOT NULL DEFAULT 100,
  max_hp int NOT NULL DEFAULT 100,
  attack int NOT NULL DEFAULT 10,
  defense int NOT NULL DEFAULT 10,
  speed int NOT NULL DEFAULT 10,
  special int NOT NULL DEFAULT 10,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  title text,
  avatar_url text,
  banner_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text,
  media_type text DEFAULT 'none',
  media_url text,
  media_thumbnail text,
  likes_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  media_url text NOT NULL,
  media_type text NOT NULL,
  thumbnail_url text,
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Story views
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'general',
  anime_slug text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Chat room members
CREATE TABLE IF NOT EXISTS chat_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  username text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Duels
CREATE TABLE IF NOT EXISTS duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  opponent_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  status text DEFAULT 'waiting',
  result text,
  winner_id uuid,
  xp_reward int DEFAULT 50,
  duel_log jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text DEFAULT 'online',
  location text,
  event_date timestamptz,
  image_url text,
  max_participants int,
  current_participants int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Event registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Clans
CREATE TABLE IF NOT EXISTS clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL,
  description text,
  logo_url text,
  leader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_wins int DEFAULT 0,
  total_members int DEFAULT 1,
  is_recruiting boolean DEFAULT true,
  min_level int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Clan members
CREATE TABLE IF NOT EXISTS clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid REFERENCES clans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(clan_id, user_id)
);

-- Clan requests
CREATE TABLE IF NOT EXISTS clan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid REFERENCES clans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  banner_url text,
  start_date timestamptz,
  end_date timestamptz,
  registration_deadline timestamptz,
  max_participants int DEFAULT 32,
  min_level int DEFAULT 1,
  prize_pool text,
  status text DEFAULT 'upcoming',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  seed int,
  eliminated boolean DEFAULT false,
  eliminated_at timestamptz,
  final_position int,
  created_at timestamptz DEFAULT now()
);

-- Tournament matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  round int,
  match_number int,
  player1_id uuid,
  player2_id uuid,
  player1_char_id uuid,
  player2_char_id uuid,
  winner_id uuid,
  duel_id uuid,
  scheduled_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text,
  title text NOT NULL,
  message text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark',
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  show_province boolean DEFAULT true,
  show_character boolean DEFAULT true,
  language text DEFAULT 'pt',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  reason text,
  description text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  category text DEFAULT 'general',
  rarity text DEFAULT 'common',
  xp_reward int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  is_displayed boolean DEFAULT true,
  UNIQUE(user_id, badge_id)
);

-- Quests
CREATE TABLE IF NOT EXISTS quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text DEFAULT 'daily',
  objective_type text,
  objective_count int DEFAULT 1,
  xp_reward int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User quests
CREATE TABLE IF NOT EXISTS user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  progress int DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  country text,
  created_at timestamptz DEFAULT now()
);

-- Admin requests
CREATE TABLE IF NOT EXISTS admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_reason text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Private chats
CREATE TABLE IF NOT EXISTS private_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Private messages
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES private_chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Admin inbox
CREATE TABLE IF NOT EXISTS admin_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text,
  message_type text DEFAULT 'general',
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_inbox ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Characters policies
DROP POLICY IF EXISTS "select_characters" ON characters;
CREATE POLICY "select_characters" ON characters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_character" ON characters;
CREATE POLICY "insert_own_character" ON characters FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_character" ON characters;
CREATE POLICY "update_own_character" ON characters FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Posts policies
DROP POLICY IF EXISTS "select_posts" ON posts;
CREATE POLICY "select_posts" ON posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_posts" ON posts;
CREATE POLICY "insert_own_posts" ON posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_posts" ON posts;
CREATE POLICY "delete_own_posts" ON posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Post likes and comments
DROP POLICY IF EXISTS "select_post_likes" ON post_likes;
CREATE POLICY "select_post_likes" ON post_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_post_likes" ON post_likes;
CREATE POLICY "insert_post_likes" ON post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_post_likes" ON post_likes;
CREATE POLICY "delete_post_likes" ON post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "select_post_comments" ON post_comments;
CREATE POLICY "select_post_comments" ON post_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_post_comments" ON post_comments;
CREATE POLICY "insert_post_comments" ON post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_post_comments" ON post_comments;
CREATE POLICY "delete_own_post_comments" ON post_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Stories policies
DROP POLICY IF EXISTS "select_stories" ON stories;
CREATE POLICY "select_stories" ON stories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_stories" ON stories;
CREATE POLICY "insert_own_stories" ON stories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_stories" ON stories;
CREATE POLICY "delete_own_stories" ON stories FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Chat rooms policies
DROP POLICY IF EXISTS "select_chat_rooms" ON chat_rooms;
CREATE POLICY "select_chat_rooms" ON chat_rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_rooms" ON chat_rooms;
CREATE POLICY "insert_chat_rooms" ON chat_rooms FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Chat messages
DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Duels
DROP POLICY IF EXISTS "select_duels" ON duels;
CREATE POLICY "select_duels" ON duels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_duels" ON duels;
CREATE POLICY "insert_duels" ON duels FOR INSERT TO authenticated WITH CHECK (challenger_id = auth.uid());

DROP POLICY IF EXISTS "update_duels" ON duels;
CREATE POLICY "update_duels" ON duels FOR UPDATE TO authenticated USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

-- Events
DROP POLICY IF EXISTS "select_events" ON events;
CREATE POLICY "select_events" ON events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_events" ON events;
CREATE POLICY "insert_events" ON events FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications
DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Follows
DROP POLICY IF EXISTS "select_follows" ON follows;
CREATE POLICY "select_follows" ON follows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_follows" ON follows;
CREATE POLICY "insert_follows" ON follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "delete_follows" ON follows;
CREATE POLICY "delete_follows" ON follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- Admin requests
DROP POLICY IF EXISTS "select_admin_requests" ON admin_requests;
CREATE POLICY "select_admin_requests" ON admin_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
);

DROP POLICY IF EXISTS "insert_admin_requests" ON admin_requests;
CREATE POLICY "insert_admin_requests" ON admin_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_admin_requests" ON admin_requests;
CREATE POLICY "update_admin_requests" ON admin_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
);

-- Private chats
DROP POLICY IF EXISTS "select_private_chats" ON private_chats;
CREATE POLICY "select_private_chats" ON private_chats FOR SELECT TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

DROP POLICY IF EXISTS "insert_private_chats" ON private_chats;
CREATE POLICY "insert_private_chats" ON private_chats FOR INSERT TO authenticated WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- Private messages
DROP POLICY IF EXISTS "select_private_messages" ON private_messages;
CREATE POLICY "select_private_messages" ON private_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM private_chats WHERE private_chats.id = private_messages.chat_id AND (private_chats.user1_id = auth.uid() OR private_chats.user2_id = auth.uid()))
);

DROP POLICY IF EXISTS "insert_private_messages" ON private_messages;
CREATE POLICY "insert_private_messages" ON private_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Admin inbox
DROP POLICY IF EXISTS "select_admin_inbox" ON admin_inbox;
CREATE POLICY "select_admin_inbox" ON admin_inbox FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
);

DROP POLICY IF EXISTS "insert_admin_inbox" ON admin_inbox;
CREATE POLICY "insert_admin_inbox" ON admin_inbox FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_admin_inbox" ON admin_inbox;
CREATE POLICY "update_admin_inbox" ON admin_inbox FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
);

DROP POLICY IF EXISTS "delete_admin_inbox" ON admin_inbox;
CREATE POLICY "delete_admin_inbox" ON admin_inbox FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true)
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_characters_updated_at') THEN
    CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_posts_updated_at') THEN
    CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_settings_updated_at') THEN
    CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
