-- ============================================
-- RBAC ROLE RENAME MIGRATION
-- user -> member
-- admin -> secondary_admin
-- super_admin -> supreme_admin
-- ============================================

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add new CHECK constraint with new role names
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['member'::text, 'secondary_admin'::text, 'supreme_admin'::text]));

-- Step 3: Migrate existing data
UPDATE public.profiles 
SET 
  role = CASE 
    WHEN role = 'super_admin' THEN 'supreme_admin'::text
    WHEN role = 'admin' THEN 'secondary_admin'::text
    ELSE 'member'::text
  END,
  is_admin = CASE WHEN role IN ('admin', 'super_admin') THEN true ELSE false END,
  is_super_admin = CASE WHEN role = 'super_admin' THEN true ELSE false END;

-- Step 4: Drop and recreate RLS policies with new role names

-- profiles: super_admin_all_access -> supreme_admin_all_access
DROP POLICY IF EXISTS super_admin_all_access ON public.profiles;
CREATE POLICY supreme_admin_all_access ON public.profiles
  FOR ALL USING (role = 'supreme_admin'::text);

-- admin_inbox policies
DROP POLICY IF EXISTS select_admin_inbox ON public.admin_inbox;
DROP POLICY IF EXISTS update_admin_inbox ON public.admin_inbox;
DROP POLICY IF EXISTS delete_admin_inbox ON public.admin_inbox;

CREATE POLICY select_admin_inbox ON public.admin_inbox
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

CREATE POLICY update_admin_inbox ON public.admin_inbox
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

CREATE POLICY delete_admin_inbox ON public.admin_inbox
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- chat_rooms insert policy (now restricted to admins only)
DROP POLICY IF EXISTS insert_chat_rooms ON public.chat_rooms;
CREATE POLICY insert_chat_rooms ON public.chat_rooms
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- clans insert policy (pending status handled in app logic)
DROP POLICY IF EXISTS insert_clans ON public.clans;
CREATE POLICY insert_clans ON public.clans
  FOR INSERT TO authenticated WITH CHECK (true);

-- founder_info policies
DROP POLICY IF EXISTS founder_info_insert_super_admin ON public.founder_info;
DROP POLICY IF EXISTS founder_info_update_super_admin ON public.founder_info;

CREATE POLICY founder_info_insert_supreme_admin ON public.founder_info
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supreme_admin'::text)
  );

CREATE POLICY founder_info_update_supreme_admin ON public.founder_info
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supreme_admin'::text)
  );

-- terminal_logs policies
DROP POLICY IF EXISTS terminal_logs_select_admin ON public.terminal_logs;
DROP POLICY IF EXISTS terminal_logs_insert_admin ON public.terminal_logs;

CREATE POLICY terminal_logs_select_admin ON public.terminal_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

CREATE POLICY terminal_logs_insert_admin ON public.terminal_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- events admin policies
DROP POLICY IF EXISTS events_admin_insert ON public.events;
DROP POLICY IF EXISTS events_admin_update ON public.events;
DROP POLICY IF EXISTS events_admin_delete ON public.events;

CREATE POLICY events_admin_insert ON public.events
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

CREATE POLICY events_admin_update ON public.events
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

CREATE POLICY events_admin_delete ON public.events
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- shop_items admin policies
DROP POLICY IF EXISTS shop_items_admin_insert ON public.shop_items;
DROP POLICY IF EXISTS shop_items_admin_update ON public.shop_items;

CREATE POLICY shop_items_admin_insert ON public.shop_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

CREATE POLICY shop_items_admin_update ON public.shop_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- anime_schedule admin policy
DROP POLICY IF EXISTS anime_schedule_admin_insert ON public.anime_schedule;
CREATE POLICY anime_schedule_admin_insert ON public.anime_schedule
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- community_highlights admin policy
DROP POLICY IF EXISTS highlights_admin_manage ON public.community_highlights;
CREATE POLICY highlights_admin_manage ON public.community_highlights
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('secondary_admin', 'supreme_admin'))
  );

-- admin_requests policies (supreme_admin only)
DROP POLICY IF EXISTS select_admin_requests ON public.admin_requests;
DROP POLICY IF EXISTS update_admin_requests ON public.admin_requests;

CREATE POLICY select_admin_requests ON public.admin_requests
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supreme_admin'::text)
  );

CREATE POLICY update_admin_requests ON public.admin_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supreme_admin'::text)
  );

-- feedback admin select policy
DROP POLICY IF EXISTS feedback_admin_select ON public.feedback;
CREATE POLICY feedback_admin_select ON public.feedback
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supreme_admin'::text)
  );

-- Update handle_new_user trigger to use 'member' as default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with 'member' role
  INSERT INTO public.profiles (id, username, role, is_admin, is_super_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'member',
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert into characters with random class
  INSERT INTO public.characters (user_id, name, class)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'character_name', 'Guerreiro sem Nome'),
    (ARRAY['ninja', 'pirata', 'shinigami', 'cavaleiro', 'cacador', 'tita'])[floor(random() * 6 + 1)]
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Add status column to clans for approval workflow
ALTER TABLE public.clans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index for faster clan status queries
CREATE INDEX IF NOT EXISTS idx_clans_status ON public.clans(status);