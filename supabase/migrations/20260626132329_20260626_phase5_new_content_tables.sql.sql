-- =====================================================
-- FASE 5: NOVAS TABELAS DE CONTEÚDO
-- =====================================================

-- 5.1 Events table updates (add missing columns)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'type') THEN
    ALTER TABLE events ADD COLUMN type text DEFAULT 'online';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'status') THEN
    ALTER TABLE events ADD COLUMN status text DEFAULT 'upcoming';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'image_url') THEN
    ALTER TABLE events ADD COLUMN image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'province') THEN
    ALTER TABLE events ADD COLUMN province text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_date') THEN
    ALTER TABLE events ADD COLUMN event_date timestamptz;
  END IF;
END $$;

-- 5.2 Audio/Music tables

-- Audio OST bucket (must be created via storage API, but we can track it)
-- The bucket 'audio_ost' will be created via insert

-- OST table updates - add audio_url column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ost_tracks' AND column_name = 'audio_url') THEN
    ALTER TABLE ost_tracks ADD COLUMN audio_url text;
  END IF;
END $$;

-- 5.3 Audio Posts (Voz dos Kambas)
CREATE TABLE IF NOT EXISTS audio_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  audio_url text NOT NULL,
  duration_seconds int NOT NULL CHECK (duration_seconds <= 120 AND duration_seconds >= 1),
  title text,
  description text,
  plays_count int DEFAULT 0,
  reactions_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  expires_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_posts_user_id ON audio_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_posts_expires_at ON audio_posts(expires_at);

-- Audio Comments
CREATE TABLE IF NOT EXISTS audio_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_post_id uuid REFERENCES audio_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  audio_url text NOT NULL,
  duration_seconds int NOT NULL CHECK (duration_seconds <= 45 AND duration_seconds >= 1),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '14 days')
);

CREATE INDEX IF NOT EXISTS idx_audio_comments_audio_post_id ON audio_comments(audio_post_id);
CREATE INDEX IF NOT EXISTS idx_audio_comments_expires_at ON audio_comments(expires_at);

-- Enable RLS
ALTER TABLE audio_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_comments ENABLE ROW LEVEL SECURITY;

-- RLS for audio_posts
CREATE POLICY "audio_posts_select_public" ON audio_posts
  FOR SELECT TO anon, authenticated USING (expires_at > now());

CREATE POLICY "audio_posts_insert_own" ON audio_posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "audio_posts_delete_own" ON audio_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS for audio_comments
CREATE POLICY "audio_comments_select_public" ON audio_comments
  FOR SELECT TO anon, authenticated USING (expires_at > now());

CREATE POLICY "audio_comments_insert_own" ON audio_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "audio_comments_delete_own" ON audio_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5.4 Anime Schedule (Calendário Anime)
CREATE TABLE IF NOT EXISTS anime_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  episode_number int,
  day_of_week text NOT NULL CHECK (day_of_week IN ('segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo')),
  time_of_day text, -- e.g., "22:00"
  streaming_platform text, -- e.g., "Crunchyroll", "Netflix"
  thumbnail_url text,
  synopsis text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anime_schedule_day ON anime_schedule(day_of_week);

-- Anime reminders
CREATE TABLE IF NOT EXISTS anime_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anime_schedule_id uuid REFERENCES anime_schedule(id) ON DELETE CASCADE NOT NULL,
  reminder_time timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, anime_schedule_id)
);

-- Anime comments
CREATE TABLE IF NOT EXISTS anime_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_schedule_id uuid REFERENCES anime_schedule(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE anime_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anime_schedule_select_public" ON anime_schedule
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anime_schedule_admin_insert" ON anime_schedule
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "anime_reminders_select_own" ON anime_reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "anime_reminders_insert_own" ON anime_reminders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anime_reminders_delete_own" ON anime_reminders
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "anime_discussions_select_public" ON anime_discussions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anime_discussions_insert_own" ON anime_discussions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5.5 Bazar dos Kambas (Placeholder)
CREATE TABLE IF NOT EXISTS bazar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text CHECK (category IN ('manga', 'action_figure', 'cosplay', 'poster', 'accessory', 'other')),
  condition text CHECK (condition IN ('novo', 'usado', 'como_novo')),
  price decimal(10,2),
  is_trade_only boolean DEFAULT false,
  image_urls text[] DEFAULT '{}',
  is_featured boolean DEFAULT false,
  payment_status text DEFAULT 'none',
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'removed')),
  province text,
  contact_info text,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bazar_items_expires_at ON bazar_items(expires_at);
CREATE INDEX IF NOT EXISTS idx_bazar_items_category ON bazar_items(category);
CREATE INDEX IF NOT EXISTS idx_bazar_items_province ON bazar_items(province);

-- Enable RLS
ALTER TABLE bazar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bazar_items_select_public" ON bazar_items
  FOR SELECT TO anon, authenticated USING (status = 'active' AND expires_at > now());

CREATE POLICY "bazar_items_insert_own" ON bazar_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bazar_items_update_own" ON bazar_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "bazar_items_delete_own" ON bazar_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Function to auto-expire bazar items
CREATE OR REPLACE FUNCTION expire_bazar_items()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE bazar_items SET status = 'expired' WHERE expires_at < now() AND status = 'active';
END;
$function$;

-- Function to auto-expire audio posts
CREATE OR REPLACE FUNCTION expire_audio_content()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM audio_posts WHERE expires_at < now();
  DELETE FROM audio_comments WHERE expires_at < now();
END;
$function$;