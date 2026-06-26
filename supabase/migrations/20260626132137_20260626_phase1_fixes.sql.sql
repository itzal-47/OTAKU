-- =====================================================
-- FASE 1: CORREÇÕES CRÍTICAS
-- =====================================================

-- 1. Fix the handle_new_user trigger function to prevent 500 errors on signup
-- The original function had issues with boolean expressions and missing error handling

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_count int;
  new_username text;
  new_role text;
BEGIN
  -- Get username from metadata or generate one
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 8));
  
  -- Count existing profiles to check if this is the first user
  SELECT COUNT(*) INTO user_count FROM profiles WHERE id IS NOT NULL;
  
  -- Determine role: first user becomes super_admin
  IF user_count = 0 THEN
    new_role := 'super_admin';
  ELSE
    new_role := 'user';
  END IF;
  
  -- Create profile with all required fields
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    province, 
    city, 
    country,
    is_admin, 
    is_super_admin, 
    is_event_publisher, 
    role,
    is_verified
  )
  VALUES (
    NEW.id,
    new_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'city', 'Luanda'),
    'Angola',
    new_role = 'super_admin', -- is_admin for first user
    new_role = 'super_admin', -- is_super_admin for first user
    false, -- is_event_publisher
    new_role,
    false -- is_verified
  );
  
  -- Create user settings (with error handling)
  BEGIN
    INSERT INTO public.user_settings (user_id, theme, notifications_enabled, email_notifications, show_province, show_character, language)
    VALUES (NEW.id, 'dark', true, true, true, true, 'pt');
  EXCEPTION WHEN others THEN
    -- Ignore if user_settings already exists or other error
    NULL;
  END;
  
  -- Create default character if class is specified
  IF NEW.raw_user_meta_data->>'character_class' IS NOT NULL THEN
    BEGIN
      INSERT INTO public.characters (
        user_id, name, class, level, xp, hp, max_hp, 
        attack, defense, speed, special, wins, losses, draws
      )
      VALUES (
        NEW.id,
        new_username,
        (NEW.raw_user_meta_data->>'character_class')::text,
        1, 0, 100, 100, 10, 10, 10, 10, 0, 0, 0
      );
    EXCEPTION WHEN others THEN
      -- Ignore if character already exists or other error
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Ensure the trigger exists and is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Add missing columns to profiles if they don't exist (for profiles created without them)
DO $$
BEGIN
  -- These columns should already exist based on the schema, but ensure defaults
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'coins') THEN
    ALTER TABLE profiles ADD COLUMN coins int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_xp') THEN
    ALTER TABLE profiles ADD COLUMN total_xp int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;

-- 4. Add interest columns for Kamba Match (FASE 7.3)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'favorite_animes') THEN
    ALTER TABLE profiles ADD COLUMN favorite_animes text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'favorite_music') THEN
    ALTER TABLE profiles ADD COLUMN favorite_music text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'favorite_character') THEN
    ALTER TABLE profiles ADD COLUMN favorite_character text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'favorite_genre') THEN
    ALTER TABLE profiles ADD COLUMN favorite_genre text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'match_visible') THEN
    ALTER TABLE profiles ADD COLUMN match_visible boolean DEFAULT true;
  END IF;
END $$;