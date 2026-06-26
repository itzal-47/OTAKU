-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));

-- Add verified badge and title columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title_color text DEFAULT 'purple';

-- Update existing super_admin flag to role
UPDATE profiles SET role = 'super_admin' WHERE is_super_admin = true;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update handle_new_user trigger to include role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count int;
  new_username text;
BEGIN
  -- Get username from metadata or generate one
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 8));
  
  -- Count existing profiles to check if this is the first user
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Create profile with role based on user count
  INSERT INTO public.profiles (id, username, email, province, city, is_admin, is_super_admin, is_event_publisher, role)
  VALUES (
    NEW.id,
    new_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda'),
    user_count = 0, -- is_admin for first user
    user_count = 0, -- is_super_admin for first user
    false,
    CASE WHEN user_count = 0 THEN 'super_admin'::text ELSE 'user'::text END
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

-- RLS policies for super_admin only
CREATE POLICY "super_admin_all_access" ON profiles FOR ALL
  TO authenticated
  USING (role = 'super_admin');

-- Update admin inbox to allow super_admin
DROP POLICY IF EXISTS "select_admin_inbox" ON admin_inbox;
CREATE POLICY "select_admin_inbox" ON admin_inbox FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "update_admin_inbox" ON admin_inbox;
CREATE POLICY "update_admin_inbox" ON admin_inbox FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "delete_admin_inbox" ON admin_inbox;
CREATE POLICY "delete_admin_inbox" ON admin_inbox FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
);

-- Chat room creation policy for admins
DROP POLICY IF EXISTS "insert_chat_rooms" ON chat_rooms;
CREATE POLICY "insert_chat_rooms" ON chat_rooms FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
);

-- Clan creation policy for admins
DROP POLICY IF EXISTS "insert_clans" ON clans;
CREATE POLICY "insert_clans" ON clans FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin'))
);

-- Founder info table
CREATE TABLE IF NOT EXISTS founder_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  alias text NOT NULL,
  location text,
  email text,
  phone_numbers text[],
  social_links jsonb,
  created_at timestamptz DEFAULT now()
);

-- Insert founder info
INSERT INTO founder_info (name, alias, location, email, phone_numbers, social_links)
VALUES (
  'José Eduardo Numa Canjo',
  'itzal',
  'Huambo, Angola',
  'edivaldotc16@gmail.com',
  ARRAY['973900858', '956498238'],
  jsonb_build_object(
    'facebook', 'https://web.facebook.com/edivaldo.dajielexprofunda?locale=pt_BR',
    'instagram', 'https://www.instagram.com/joseeduardonuma/'
  )
);

-- Terminal commands log
CREATE TABLE IF NOT EXISTS terminal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command text NOT NULL,
  result text,
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE terminal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_terminal_logs" ON terminal_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_terminal_logs" ON terminal_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Messages table for private chats read status
ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS sender_deleted boolean DEFAULT false;
ALTER TABLE private_messages ADD COLUMN IF NOT EXISTS receiver_deleted boolean DEFAULT false;