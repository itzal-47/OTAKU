-- =====================================================
-- FIX: Corrigir nomes de tabelas e criar RPC de XP
--
-- Problemas corrigidos:
-- 1. SettingsPage usava 'comments' e 'likes' (inexistentes)
--    → já corrigido no código para post_comments e post_likes
-- 2. FeedPage chamava supabase.rpc('increment_user_xp') que
--    não existia → substituído por update direto em profiles
-- 3. Criar a função de todas as formas para uso futuro
-- =====================================================

-- Função auxiliar para incrementar XP de forma atómica
-- (evita race conditions com update direto)
CREATE OR REPLACE FUNCTION public.increment_user_xp(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = COALESCE(total_xp, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Garantir que a coluna total_xp existe em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0;

-- Garantir que a coluna exists em user_settings (para a SettingsPage)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'pt';
