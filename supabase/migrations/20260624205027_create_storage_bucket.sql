/*
# Criar bucket de Storage para uploads

1. Criar bucket 'uploads' para guardar imagens, vídeos e ficheiros
2. Configurar políticas para permitir upload/download por utilizadores autenticados
3. Pasta para posts, stories, profiles, groups
*/

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('uploads', 'uploads', true, false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] IN ('posts', 'stories', 'profiles', 'groups', 'avatars', 'banners'));

DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;
CREATE POLICY "Allow authenticated select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'uploads' AND owner = auth.uid());

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'uploads');
