-- Daily streaks and activity tracking
CREATE TABLE IF NOT EXISTS user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_activity_date date,
  total_xp_earned int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Activity log for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  xp_earned int DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "select_own_streaks" ON user_streaks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_streaks" ON user_streaks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update_own_streaks" ON user_streaks FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "select_own_activity" ON user_activity_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_activity" ON user_activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Function to update daily streak
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id uuid)
RETURNS int AS $$
DECLARE
  v_streak user_streaks%ROWTYPE;
  v_today date := CURRENT_DATE;
BEGIN
  -- Get or create streak record
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, v_today)
    RETURNING * INTO v_streak;
    RETURN 1;
  END IF;
  
  -- Check if already logged in today
  IF v_streak.last_activity_date = v_today THEN
    RETURN v_streak.current_streak;
  END IF;
  
  -- Update streak
  IF v_streak.last_activity_date = v_today - 1 THEN
    -- Consecutive day
    v_streak.current_streak := v_streak.current_streak + 1;
  ELSIF v_streak.last_activity_date < v_today - 1 THEN
    -- Missed days(s)
    v_streak.current_streak := 1;
  END IF;
  
  v_streak.longest_streak := GREATEST(v_streak.longest_streak, v_streak.current_streak);
  v_streak.last_activity_date := v_today;
  
  UPDATE user_streaks
  SET current_streak = v_streak.current_streak,
      longest_streak = v_streak.longest_streak,
      last_activity_date = v_streak.last_activity_date,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN v_streak.current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily login bonus XP
CREATE OR REPLACE FUNCTION claim_daily_login_bonus(p_user_id uuid)
RETURNS int AS $$
DECLARE
  v_streak int;
  v_bonus int;
BEGIN
  v_streak := update_daily_streak(p_user_id);
  
  -- Bonus based on streak (increasing rewards)
  v_bonus := 10 + (LEAST(v_streak, 30) * 2);
  
  -- Add XP to character
  UPDATE characters
  SET xp = xp + v_bonus
  WHERE user_id = p_user_id;
  
  -- Log activity
  INSERT INTO user_activity_log (user_id, activity_type, xp_earned, metadata)
  VALUES (p_user_id, 'daily_login', v_bonus, jsonb_build_object('streak', v_streak));
  
  -- Update total
  UPDATE user_streaks
  SET total_xp_earned = total_xp_earned + v_bonus
  WHERE user_id = p_user_id;
  
  RETURN v_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default badges (simple insert with text types)
INSERT INTO badges (name, description, icon, category, rarity, xp_reward)
VALUES 
  ('Primeiro Duelo', 'Completou o teu primeiro duelo', '⚔️', 'combat', 'common', 10),
  ('Viktimador', 'Ganhou 10 duelos', '🏆', 'combat', 'rare', 50),
  ('Lenda da Arena', 'Ganhou 100 duelos', '👑', 'combat', 'legendary', 500),
  ('Social', 'Fez a primeira publicação', '📝', 'social', 'common', 5),
  ('Popular', 'Conseguiu 50 seguidores', '⭐', 'social', 'rare', 100),
  ('Influencer', 'Conseguiu 200 seguidores', '🌟', 'social', 'epic', 300),
  ('Veterano', 'Membro há 1 ano', '🎖️', 'special', 'epic', 200),
  ('Fundador', 'Um dos primeiros 100 membros', '💎', 'special', 'legendary', 1000),
  ('Streak 7', 'Sequência de 7 dias', '🔥', 'special', 'rare', 50),
  ('Streak 30', 'Sequência de 30 dias', '💯', 'special', 'legendary', 300)
ON CONFLICT DO NOTHING;