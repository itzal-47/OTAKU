-- New tables for features: Watchlist, Fan Art, OST, Wiki, Quotes

-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_title text NOT NULL,
  status text NOT NULL DEFAULT 'watching' CHECK (status IN ('watching', 'completed', 'planned', 'dropped')),
  rating int CHECK (rating >= 1 AND rating <= 10),
  episodes_watched int NOT NULL DEFAULT 0,
  total_episodes int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Fan Art
CREATE TABLE IF NOT EXISTS fan_art (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  likes_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fan_art_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_art_id uuid REFERENCES fan_art(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fan_art_id, user_id)
);

-- OST / Music
CREATE TABLE IF NOT EXISTS ost_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  anime text,
  youtube_url text,
  spotify_url text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  likes_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ost_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ost_id uuid REFERENCES ost_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ost_id, user_id)
);

-- Wiki
CREATE TABLE IF NOT EXISTS wiki_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'character' CHECK (category IN ('character', 'concept', 'community', 'guide')),
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Anime Quotes
CREATE TABLE IF NOT EXISTS anime_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character text NOT NULL,
  anime text NOT NULL,
  quote text NOT NULL,
  likes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES anime_quotes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, quote_id)
);

-- RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_art ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_art_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ost_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ost_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_quotes ENABLE ROW LEVEL SECURITY;

-- Watchlist policies
CREATE POLICY "watchlist_select_own" ON watchlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "watchlist_insert_own" ON watchlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "watchlist_update_own" ON watchlist FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "watchlist_delete_own" ON watchlist FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Fan Art policies
CREATE POLICY "fan_art_select_all" ON fan_art FOR SELECT TO authenticated USING (true);
CREATE POLICY "fan_art_insert_own" ON fan_art FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fan_art_delete_own" ON fan_art FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "fan_art_likes_select" ON fan_art_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "fan_art_likes_insert" ON fan_art_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fan_art_likes_delete" ON fan_art_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- OST policies
CREATE POLICY "ost_select_all" ON ost_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ost_insert" ON ost_tracks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ost_delete_own" ON ost_tracks FOR DELETE TO authenticated USING (added_by = auth.uid());
CREATE POLICY "ost_likes_select" ON ost_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ost_likes_insert" ON ost_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ost_likes_delete" ON ost_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Wiki policies
CREATE POLICY "wiki_select_all" ON wiki_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "wiki_insert" ON wiki_entries FOR INSERT TO authenticated WITH CHECK (true);

-- Quotes policies
CREATE POLICY "quotes_select_all" ON anime_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quotes_insert" ON anime_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "favorite_quotes_select" ON favorite_quotes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "favorite_quotes_insert" ON favorite_quotes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorite_quotes_delete" ON favorite_quotes FOR DELETE TO authenticated USING (user_id = auth.uid());
