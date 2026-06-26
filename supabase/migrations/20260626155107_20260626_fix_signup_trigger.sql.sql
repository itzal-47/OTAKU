-- =====================================================
-- CORREÇÃO CRÍTICA: TRIGGER handle_new_user
-- Problema: A função roda no contexto 'auth' e não encontra 'profiles'
-- Solução: Usar schema qualified names e SET search_path
-- =====================================================

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
  -- IMPORTANTE: Definir search_path para public explicitamente
  SET search_path = public;
  
  -- Obter username dos metadados ou gerar um
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 8));

  -- Contar perfis existentes para verificar se é o primeiro utilizador
  SELECT COUNT(*) INTO user_count FROM public.profiles WHERE id IS NOT NULL;

  -- Determinar role: primeiro utilizador torna-se super_admin
  IF user_count = 0 THEN
    new_role := 'super_admin';
  ELSE
    new_role := 'user';
  END IF;

  -- Criar perfil com todos os campos necessários (schema qualified)
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
    new_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'province', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'city', 'Luanda'),
    'Angola',
    new_role = 'super_admin',
    new_role = 'super_admin',
    false,
    new_role,
    false,
    0,
    0,
    false
  );

  -- Criar user_settings (com tratamento de erro)
  BEGIN
    INSERT INTO public.user_settings (user_id, theme, notifications_enabled, email_notifications, show_province, show_character, language)
    VALUES (NEW.id, 'dark', true, true, true, true, 'pt');
  EXCEPTION WHEN others THEN
    NULL;
  END;

  -- Criar personagem padrão se a classe for especificada
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
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recriar o trigger garantindo que está na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();