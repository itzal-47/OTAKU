-- Função para criar automaticamente o perfil do usuário após registro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count int;
  new_username text;
BEGIN
  -- Get username from metadata or generate one
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 8));
  
  -- Create profile
  INSERT INTO public.profiles (id, username, email, province, city, is_admin, is_super_admin, is_event_publisher)
  VALUES (
    NEW.id,
    new_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda'),
    false,
    false,
    false
  );
  
  -- Create user settings
  INSERT INTO public.user_settings (user_id, theme, notifications_enabled, email_notifications, show_province, show_character, language)
  VALUES (NEW.id, 'dark', true, true, true, true, 'pt');
  
  -- Create default character if class is specified
  IF NEW.raw_user_meta_data->>'character_class' IS NOT NULL THEN
    INSERT INTO public.characters (user_id, name, class, level, xp, hp, max_hp, attack, defense, speed, special, wins, losses, draws)
    VALUES (
      NEW.id,
      new_username,
      COALESCE(NEW.raw_user_meta_data->>'character_class', 'ninja'),
      1, 0, 100, 100, 10, 10, 10, 10, 0, 0, 0
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para chamar a função após insert em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Shop Items table
CREATE TABLE IF NOT EXISTS shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  icon text DEFAULT '🎴',
  rarity text DEFAULT 'common',
  xp_cost int NOT NULL DEFAULT 100,
  effect_type text,
  effect_value jsonb,
  is_active boolean DEFAULT true,
  stock int,
  created_at timestamptz DEFAULT now()
);

-- User Inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity int DEFAULT 1,
  equipped boolean DEFAULT false,
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Clan Contributions table
CREATE TABLE IF NOT EXISTS clan_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'xp',
  amount int DEFAULT 0,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Clan Stats table (weekly/monthly aggregates)
CREATE TABLE IF NOT EXISTS clan_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  week_number int,
  year int,
  total_xp int DEFAULT 0,
  total_duels int DEFAULT 0,
  wins int DEFAULT 0,
  losses int DEFAULT 0,
  contributions_count int DEFAULT 0,
  rank int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clan_id, week_number, year)
);

-- User currency (Kamba Coins / Experience Points)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add clan_level to clans
ALTER TABLE clans ADD COLUMN IF NOT EXISTS clan_level int DEFAULT 1;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS clan_xp int DEFAULT 0;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS weekly_contribution int DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_stats ENABLE ROW LEVEL SECURITY;

-- Policies for shop_items
CREATE POLICY "select_shop_items" ON shop_items FOR SELECT TO authenticated USING (is_active = true);

-- Policies for user_inventory
CREATE POLICY "select_own_inventory" ON user_inventory FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_inventory" ON user_inventory FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Policies for clan_contributions
CREATE POLICY "select_clan_contributions" ON clan_contributions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM clan_members WHERE clan_members.clan_id = clan_contributions.clan_id AND clan_members.user_id = auth.uid())
);
CREATE POLICY "insert_own_contributions" ON clan_contributions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Policies for clan_stats
CREATE POLICY "select_clan_stats" ON clan_stats FOR SELECT TO authenticated USING (true);

-- Insert default shop items
INSERT INTO shop_items (name, description, category, icon, rarity, xp_cost, effect_type, effect_value) VALUES
('Poção de HP', 'Recupera 50 pontos de vida instantaneamente', 'consumable', '🧪', 'common', 100, 'heal', '{"hp": 50}'),
('Poção de XP', 'Dá 25 XP extra ao usar', 'consumable', '✨', 'common', 150, 'xp_boost', '{"xp": 25}'),
('Título: Guerreiro Novato', 'Exibe o título "Guerreiro Novato" no teu perfil', 'cosmetic', '🏆', 'common', 200, 'title', '{"title": "Guerreiro Novato"}'),
('Borda de Perfil: Chamas', 'Borda animada com chamas no avatar', 'cosmetic', '🔥', 'rare', 500, 'avatar_border', '{"border": "flames"}'),
('Coroa do Rei', 'Avatar especial com coroa dourada', 'cosmetic', '👑', 'epic', 1000, 'avatar_accessory', '{"accessory": "crown"}'),
('Aura Lendária', 'Efeito de aura brilhante no perfil', 'cosmetic', '⭐', 'legendary', 2000, 'profile_aura', '{"aura": "legendary"}'),
('Boost de XP (7 dias)', 'Ganha 2x XP em duelos por 7 dias', 'boost', '⚡', 'rare', 800, 'xp_multiplier', '{"multiplier": 2, "duration_days": 7}'),
('Mascote: Kurama', 'Mascote animado no perfil', 'cosmetic', '🦊', 'epic', 1500, 'mascot', '{"mascot": "kurama"}'),
('Emblema de Clã', 'Emblema especial para o teu clã', 'cosmetic', '🛡️', 'rare', 600, 'clan_emblem', '{"emblem": "custom"}'),
('Cores da Aura', 'Personaliza as cores da tua aura', 'cosmetic', '🎨', 'common', 300, 'aura_colors', '{"colors": "custom"}')
ON CONFLICT DO NOTHING;

-- Functions for clan operations
CREATE OR REPLACE FUNCTION increment_clan_members(clan_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE clans SET total_members = total_members + 1 WHERE id = clan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_clan_members(clan_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE clans SET total_members = GREATEST(total_members - 1, 0) WHERE id = clan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_clan_contribution(clan_id uuid, user_id uuid, contribution_type text, amount int, source text)
RETURNS void AS $$
BEGIN
  INSERT INTO clan_contributions (clan_id, user_id, type, amount, source)
  VALUES (clan_id, user_id, contribution_type, amount, source);
  
  UPDATE clans 
  SET clan_xp = clan_xp + amount, 
      weekly_contribution = weekly_contribution + amount 
  WHERE id = clan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;