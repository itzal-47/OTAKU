-- =====================================================
-- FASE 6 & 7: PERFORMANCE, PAGINAÇÃO E FUNCIONALIDADES SOCIAIS
-- =====================================================

-- 7.1 Reactions System (replacing simple likes)
CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('bankai', 'ultra_instinct', 'rei_otaku', 'derrotado', 'chorei')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select_public" ON reactions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "reactions_insert_own" ON reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own" ON reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 7.2 Community Highlights
CREATE TABLE IF NOT EXISTS community_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_type text NOT NULL CHECK (highlight_type IN ('kamba_do_dia', 'voz_mais_ouvida', 'cla_da_semana', 'ost_trending', 'guerreiro_semana')),
  entity_id uuid,
  entity_type text,
  score decimal(10,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  week_start date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(highlight_type, week_start)
);

CREATE INDEX IF NOT EXISTS idx_highlights_type ON community_highlights(highlight_type);
CREATE INDEX IF NOT EXISTS idx_highlights_week ON community_highlights(week_start);

-- Enable RLS
ALTER TABLE community_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "highlights_select_public" ON community_highlights
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "highlights_admin_manage" ON community_highlights
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- 7.3 Kamba Match (User compatibility)
CREATE TABLE IF NOT EXISTS user_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  matched_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  compatibility_score int CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  reasons jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, matched_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_matches_user ON user_matches(user_id);

-- Enable RLS
ALTER TABLE user_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_matches_select_own" ON user_matches
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR matched_user_id = auth.uid());

CREATE POLICY "user_matches_insert_own" ON user_matches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7.4 Watch Party
CREATE TABLE IF NOT EXISTS watch_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  episode_title text,
  video_url text,
  playhead_position decimal(10,2) DEFAULT 0,
  is_playing boolean DEFAULT false,
  max_participants int DEFAULT 10,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'paused', 'ended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES watch_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_synced boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS watch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES watch_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'join', 'leave', 'reaction')),
  event_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES watch_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_events_room ON watch_events(room_id);
CREATE INDEX IF NOT EXISTS idx_watch_reactions_room ON watch_reactions(room_id);

-- Enable RLS
ALTER TABLE watch_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watch_rooms_select_public" ON watch_rooms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "watch_rooms_insert_own" ON watch_rooms
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "watch_rooms_update_host" ON watch_rooms
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "watch_participants_select_room" ON watch_participants
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM watch_participants wp WHERE wp.room_id = watch_participants.room_id AND wp.user_id = auth.uid()));

CREATE POLICY "watch_participants_insert_own" ON watch_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "watch_events_select_room" ON watch_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM watch_participants WHERE room_id = watch_events.room_id AND user_id = auth.uid()));

CREATE POLICY "watch_events_insert_participant" ON watch_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "watch_reactions_select_room" ON watch_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM watch_participants WHERE room_id = watch_reactions.room_id AND user_id = auth.uid()));

CREATE POLICY "watch_reactions_insert_participant" ON watch_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. Add pagination helper function for posts
CREATE OR REPLACE FUNCTION get_paginated_posts(
  offset_val int DEFAULT 0,
  limit_val int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  media_type text,
  media_url text,
  media_thumbnail text,
  likes_count int,
  comments_count int,
  shares_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT p.id, p.user_id, p.content, p.media_type, p.media_url, p.media_thumbnail, 
           p.likes_count, p.comments_count, p.shares_count, p.created_at
    FROM posts p
    WHERE p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
      UNION SELECT p_user_id
    )
    ORDER BY p.created_at DESC
    OFFSET offset_val
    LIMIT limit_val;
  ELSE
    RETURN QUERY
    SELECT p.id, p.user_id, p.content, p.media_type, p.media_url, p.media_thumbnail, 
           p.likes_count, p.comments_count, p.shares_count, p.created_at
    FROM posts p
    ORDER BY p.created_at DESC
    OFFSET offset_val
    LIMIT limit_val;
  END IF;
END;
$function$;

-- Public RPC for visitor stats
CREATE OR REPLACE FUNCTION get_visitor_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  online_count int;
  warriors_count int;
  duels_total int;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO online_count
  FROM (
    SELECT user_id FROM chat_messages WHERE created_at > now() - interval '5 minutes'
    UNION
    SELECT user_id FROM posts WHERE created_at > now() - interval '5 minutes'
  ) active_users;
  
  SELECT COUNT(*) INTO warriors_count FROM characters;
  SELECT COUNT(*) INTO duels_total FROM duels;
  
  RETURN json_build_object(
    'online', online_count,
    'warriors', warriors_count,
    'duels', duels_total
  );
END;
$function$;