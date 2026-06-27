-- =====================================================
-- FIX: handle_new_user trigger
--
-- Problemas corrigidos:
-- 1. A última migration (RBAC rename) sobrescreveu o trigger
--    com uma versão minimalista que não guardava email, province,
--    country, coins, total_xp, onboarding_completed.
-- 2. O personagem era criado com classe aleatória em vez da
--    classe escolhida pelo utilizador no registo.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username   text;
  v_class      text;
  v_province   text;
  v_user_count int;
  v_role       text;
BEGIN
  -- Dados do registo
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  v_class := COALESCE(
    NEW.raw_user_meta_data->>'character_class',
    -- fallback: classe aleatória se o utilizador não escolheu
    (ARRAY['ninja','pirata','shinigami','cavaleiro','cacador','tita'])[floor(random()*6+1)]
  );

  v_province := COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda');

  -- Primeiro utilizador torna-se supreme_admin
  SELECT COUNT(*) INTO v_user_count FROM public.profiles WHERE id IS NOT NULL;
  v_role := CASE WHEN v_user_count = 0 THEN 'supreme_admin' ELSE 'member' END;

  -- Criar perfil completo
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
    is_verified,
    coins,
    total_xp,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    v_username,
    NEW.email,
    v_province,
    v_province,  -- city igual à province por omissão
    'Angola',
    v_role IN ('supreme_admin', 'secondary_admin'),
    v_role = 'supreme_admin',
    false,
    v_role,
    false,
    0,
    0,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar user_settings
  INSERT INTO public.user_settings (
    user_id, theme, notifications_enabled,
    email_notifications, show_province, show_character, language
  )
  VALUES (NEW.id, 'dark', true, true, true, true, 'pt')
  ON CONFLICT (user_id) DO NOTHING;

  -- Criar personagem com a classe escolhida pelo utilizador
  INSERT INTO public.characters (
    user_id, name, class,
    level, xp, hp, max_hp,
    attack, defense, speed, special,
    wins, losses, draws
  )
  VALUES (
    NEW.id,
    v_username,
    v_class,
    1, 0, 100, 100,
    10, 10, 10, 10,
    0, 0, 0
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;  -- nunca bloquear o registo por causa do trigger
END;
$$;

-- Recriar o trigger (caso não exista)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
