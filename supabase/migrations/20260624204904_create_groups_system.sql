/*
# Criar sistema de Grupos (Facebook Groups style)

1. Novas Tabelas
- `groups` - Grupos da comunidade (públicos, privados, secretos)
- `group_members` - Membros dos grupos com roles
- `group_posts` - Posts dentro dos grupos
- `group_join_requests` - Pedidos para entrar em grupos privados
- `group_post_comments` - Comentários em posts de grupos
- `group_post_likes` - Likes em posts de grupos

2. Segurança
- RLS ativado em todas as tabelas
- Políticas para membros e admins
- Grupos privados só visíveis para membros
*/

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  privacy_type text NOT NULL DEFAULT 'public' CHECK (privacy_type IN ('public', 'private', 'secret')),
  category text DEFAULT 'geral',
  rules text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count int NOT NULL DEFAULT 1,
  post_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member', 'pending')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL,
  media_type text DEFAULT 'none' CHECK (media_type IN ('none', 'image', 'video', 'file')),
  media_url text,
  likes_count int NOT NULL DEFAULT 0,
  comments_count int NOT NULL DEFAULT 0,
  is_pinned boolean DEFAULT false,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Groups policies
DROP POLICY IF EXISTS "select_groups" ON groups;
CREATE POLICY "select_groups" ON groups FOR SELECT
  TO authenticated USING (
    privacy_type = 'public' OR 
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_groups" ON groups;
CREATE POLICY "insert_groups" ON groups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_groups" ON groups;
CREATE POLICY "update_own_groups" ON groups FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role IN ('admin', 'moderator'))
  );

DROP POLICY IF EXISTS "delete_own_groups" ON groups;
CREATE POLICY "delete_own_groups" ON groups FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid() AND group_members.role = 'admin')
  );

-- Group members policies
DROP POLICY IF EXISTS "select_group_members" ON group_members;
CREATE POLICY "select_group_members" ON group_members FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND privacy_type = 'public') OR
    group_members.user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_group_members" ON group_members;
CREATE POLICY "insert_group_members" ON group_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.privacy_type = 'public')
  );

DROP POLICY IF EXISTS "delete_group_members" ON group_members;
CREATE POLICY "delete_group_members" ON group_members FOR DELETE
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator'))
  );

-- Group posts policies
DROP POLICY IF EXISTS "select_group_posts" ON group_posts;
CREATE POLICY "select_group_posts" ON group_posts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_posts.group_id AND group_members.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_posts.group_id AND groups.privacy_type = 'public')
  );

DROP POLICY IF EXISTS "insert_group_posts" ON group_posts;
CREATE POLICY "insert_group_posts" ON group_posts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_posts.group_id AND group_members.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_group_posts" ON group_posts;
CREATE POLICY "delete_own_group_posts" ON group_posts FOR DELETE
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_posts.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator'))
  );

-- Group comments and likes
DROP POLICY IF EXISTS "select_group_post_comments" ON group_post_comments;
CREATE POLICY "select_group_post_comments" ON group_post_comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_group_post_comments" ON group_post_comments;
CREATE POLICY "insert_group_post_comments" ON group_post_comments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_group_post_comments" ON group_post_comments;
CREATE POLICY "delete_own_group_post_comments" ON group_post_comments FOR DELETE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "select_group_post_likes" ON group_post_likes;
CREATE POLICY "select_group_post_likes" ON group_post_likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_group_post_likes" ON group_post_likes;
CREATE POLICY "insert_group_post_likes" ON group_post_likes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_group_post_likes" ON group_post_likes;
CREATE POLICY "delete_group_post_likes" ON group_post_likes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Join requests
DROP POLICY IF EXISTS "select_group_join_requests" ON group_join_requests;
CREATE POLICY "select_group_join_requests" ON group_join_requests FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_join_requests.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator'))
  );

DROP POLICY IF EXISTS "insert_group_join_requests" ON group_join_requests;
CREATE POLICY "insert_group_join_requests" ON group_join_requests FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_group_join_requests" ON group_join_requests;
CREATE POLICY "update_group_join_requests" ON group_join_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_join_requests.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator'))
  );
