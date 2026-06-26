-- =====================================================
-- FASE 2: AUDITORIA RLS - CORRIGIDA
-- =====================================================

-- 2.1 founder_info RLS - Public read, super_admin write
DO $$
BEGIN
  ALTER TABLE founder_info ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "founder_info_select_public" ON founder_info;
DROP POLICY IF EXISTS "founder_info_insert_super_admin" ON founder_info;
DROP POLICY IF EXISTS "founder_info_update_super_admin" ON founder_info;
DROP POLICY IF EXISTS "founder_info_delete_super_admin" ON founder_info;

-- Public read for all
CREATE POLICY "founder_info_select_public" ON founder_info
  FOR SELECT TO anon, authenticated USING (true);

-- Only super_admin can insert
CREATE POLICY "founder_info_insert_super_admin" ON founder_info
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Only super_admin can update
CREATE POLICY "founder_info_update_super_admin" ON founder_info
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- 2.2 terminal_logs RLS - Admin only access
DO $$
BEGIN
  ALTER TABLE terminal_logs ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "terminal_logs_select_admin" ON terminal_logs;
DROP POLICY IF EXISTS "terminal_logs_insert_admin" ON terminal_logs;
DROP POLICY IF EXISTS "select_own_terminal_logs" ON terminal_logs;
DROP POLICY IF EXISTS "insert_terminal_logs" ON terminal_logs;

CREATE POLICY "terminal_logs_select_admin" ON terminal_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "terminal_logs_insert_admin" ON terminal_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 2.3 Events RLS - Admins can write, everyone can read
DO $$
BEGIN
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "select_events" ON events;
DROP POLICY IF EXISTS "insert_events" ON events;
DROP POLICY IF EXISTS "events_admin_insert" ON events;
DROP POLICY IF EXISTS "events_admin_update" ON events;
DROP POLICY IF EXISTS "events_admin_delete" ON events;

CREATE POLICY "events_select_public" ON events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "events_admin_insert" ON events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "events_admin_update" ON events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "events_admin_delete" ON events
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 2.4 shop_items RLS - Public read, admin write
DO $$
BEGIN
  ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "select_shop_items" ON shop_items;
DROP POLICY IF EXISTS "shop_items_select_public" ON shop_items;
DROP POLICY IF EXISTS "shop_items_admin_insert" ON shop_items;
DROP POLICY IF EXISTS "shop_items_admin_update" ON shop_items;

CREATE POLICY "shop_items_select_public" ON shop_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "shop_items_admin_insert" ON shop_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "shop_items_admin_update" ON shop_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 2.5 Create trigger to protect sensitive profile fields
CREATE OR REPLACE FUNCTION protect_sensitive_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only allow admins/super_admins to modify these fields
  -- Regular users cannot change: role, coins, total_xp, is_admin, is_super_admin, is_verified
  
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  
  IF OLD.coins IS DISTINCT FROM NEW.coins THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
      NEW.coins := OLD.coins;
    END IF;
  END IF;
  
  IF OLD.total_xp IS DISTINCT FROM NEW.total_xp THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
      NEW.total_xp := OLD.total_xp;
    END IF;
  END IF;
  
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  
  IF OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      NEW.is_super_admin := OLD.is_super_admin;
    END IF;
  END IF;
  
  IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      NEW.is_verified := OLD.is_verified;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS protect_profile_fields ON profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_sensitive_profile_fields();

-- 2.6 Update private_messages RLS for secure communication
DROP POLICY IF EXISTS "select_private_messages" ON private_messages;
DROP POLICY IF EXISTS "insert_private_messages" ON private_messages;

CREATE POLICY "private_messages_select_participant" ON private_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private_chats 
      WHERE private_chats.id = private_messages.chat_id 
      AND (private_chats.user1_id = auth.uid() OR private_chats.user2_id = auth.uid())
    )
  );

CREATE POLICY "private_messages_insert_sender" ON private_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM private_chats 
      WHERE private_chats.id = private_messages.chat_id 
      AND (private_chats.user1_id = auth.uid() OR private_chats.user2_id = auth.uid())
    )
  );