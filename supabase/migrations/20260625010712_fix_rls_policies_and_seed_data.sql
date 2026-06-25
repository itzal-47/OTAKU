-- Fix RLS policies for critical tables
-- profiles: add INSERT policy for users to create their own profile
-- user_settings: add SELECT, INSERT, UPDATE policies
-- notifications: ensure SELECT is correct
-- chat_rooms: ensure SELECT is correct
-- characters: already has SELECT=authenticated, INSERT/UPDATE own

-- Profiles INSERT policy
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User Settings policies
DROP POLICY IF EXISTS "select_user_settings" ON user_settings;
CREATE POLICY "select_user_settings" ON user_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_user_settings" ON user_settings;
CREATE POLICY "insert_user_settings" ON user_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_user_settings" ON user_settings;
CREATE POLICY "update_user_settings" ON user_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications ensure proper policies
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Chat rooms ensure proper SELECT
DROP POLICY IF EXISTS "select_chat_rooms_public" ON chat_rooms;
CREATE POLICY "select_chat_rooms_public" ON chat_rooms
  FOR SELECT TO authenticated
  USING (true);

-- Seed badges data
INSERT INTO badges (name, description, icon, category, rarity, xp_reward) VALUES
  ('Primeiro Duelo', 'Participaste no teu primeiro duelo na arena.', '⚔️', 'arena', 'common', 50),
  ('10 Vitórias', 'Ganaste 10 duelos na arena.', '🏆', 'arena', 'rare', 200),
  ('50 Vitórias', 'Ganaste 50 duelos na arena.', '👑', 'arena', 'epic', 500),
  ('100 Vitórias', 'Ganaste 100 duelos na arena.', '💎', 'arena', 'legendary', 1000),
  ('Social Butterfly', 'Fizeste 10 publicações no feed.', '🦋', 'social', 'common', 50),
  ('Influencer', 'Ganaste 100 seguidores.', '📢', 'social', 'rare', 200),
  ('Ninja Way', 'Alcançaste o nível 10 com um personagem ninja.', '🥷', 'character', 'rare', 150),
  ('Rei dos Piratas', 'Alcançaste o nível 10 com um personagem pirata.', '🏴‍☠️', 'character', 'rare', 150),
  ('Shinigami', 'Alcançaste o nível 10 com um personagem shinigami.', '💀', 'character', 'rare', 150),
  ('Cavaleiro de Ouro', 'Alcançaste o nível 10 com um personagem cavaleiro.', '🛡️', 'character', 'rare', 150),
  ('Caçador Elite', 'Alcançaste o nível 10 com um personagem caçador.', '🔫', 'character', 'rare', 150),
  ('Titã', 'Alcançaste o nível 10 com um personagem titã.', '👹', 'character', 'rare', 150),
  ('Membro da Comunidade', 'Entraste num grupo de chat.', '👥', 'social', 'common', 25),
  ('Storyteller', 'Criaste o teu primeiro story.', '📱', 'social', 'common', 25),
  ('Event Goer', 'Participaste num evento.', '📅', 'events', 'common', 50),
  ('Angolan Pride', 'Representaste Angola nas rankings.', '🇦🇴', 'special', 'epic', 300)
ON CONFLICT DO NOTHING;

-- Seed quests data
INSERT INTO quests (title, description, type, objective_type, objective_count, xp_reward, is_active) VALUES
  ('Ganha um Duelo', 'Vence um duelo na arena hoje.', 'daily', 'win_duel', 1, 100, true),
  ('Publica no Feed', 'Cria uma publicação no feed.', 'daily', 'create_post', 1, 50, true),
  ('Entra num Grupo', 'Junta-te a um grupo de chat.', 'daily', 'join_group', 1, 50, true),
  ('Envia 5 Mensagens', 'Envia 5 mensagens no chat.', 'daily', 'send_messages', 5, 75, true),
  ('Visualiza 3 Stories', 'Vê 3 stories de outros usuários.', 'daily', 'view_stories', 3, 50, true),
  ('Torna-te mais forte', 'Sobe de nível com o teu personagem.', 'weekly', 'level_up', 1, 200, true)
ON CONFLICT DO NOTHING;
