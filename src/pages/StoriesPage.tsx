import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Plus, X, ChevronLeft, ChevronRight, Eye, Clock, Image, Video } from 'lucide-react';
import type { CharacterClass } from '../types/index';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  expires_at: string;
  profiles: {
    username: string;
  };
  characters?: {
    name: string;
    class: CharacterClass;
  };
  viewed_by_me?: boolean;
}

interface StoryGroup {
  user_id: string;
  username: string;
  character_name?: string;
  character_class?: CharacterClass;
  stories: Story[];
  has_unviewed: boolean;
}

export default function StoriesPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [newStoryType, setNewStoryType] = useState<'image' | 'video'>('image');
  const [creating, setCreating] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStories();
  }, []);

  async function loadStories() {
    setLoading(true);
    try {
      const { data: storiesData } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, thumbnail_url, views_count, created_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!storiesData || storiesData.length === 0) {
        setStoryGroups([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(storiesData.map(s => s.user_id))];

      const [profilesData, charactersData, viewsData] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', userIds),
        supabase.from('characters').select('user_id, name, class').in('user_id', userIds),
        user ? supabase.from('story_views').select('story_id').eq('viewer_id', user.id) : { data: [] }
      ]);

      const viewedStoryIds = new Set(viewsData.data?.map(v => v.story_id) || []);

      const groups: StoryGroup[] = [];
      userIds.forEach(userId => {
        const userStories = storiesData
          .filter(s => s.user_id === userId)
          .map(s => {
            const userProfile = profilesData.data?.find(p => p.id === userId);
            const userChar = charactersData.data?.find(c => c.user_id === userId);
            return {
              ...s,
              profiles: userProfile || { username: 'Unknown' },
              characters: userChar,
              viewed_by_me: viewedStoryIds.has(s.id)
            };
          });

        if (userStories.length > 0) {
          groups.push({
            user_id: userId,
            username: userStories[0].profiles.username,
            character_name: userStories[0].characters?.name,
            character_class: userStories[0].characters?.class,
            stories: userStories,
            has_unviewed: userStories.some(s => !s.viewed_by_me)
          });
        }
      });

      setStoryGroups(groups);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewStory(storyId: string) {
    if (!user) return;

    await supabase.from('story_views').insert({
      story_id: storyId,
      viewer_id: user.id
    });

    setStoryGroups(prev => prev.map(group => ({
      ...group,
      stories: group.stories.map(s =>
        s.id === storyId ? { ...s, views_count: s.views_count + 1, viewed_by_me: true } : s
      ),
      has_unviewed: group.stories.some(s => s.id !== storyId && !s.viewed_by_me)
    })));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('Ficheiro muito grande (máx 50MB)', 'error');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/stories/${Date.now()}.${fileExt}`;

    setUploadingFile(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('stories-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories-media')
        .getPublicUrl(filePath);

      setUploadedMediaUrl(publicUrl);
      setNewStoryType(file.type.startsWith('video') ? 'video' : 'image');
      showToast('Upload completo!', 'success');
    } catch {
      showToast('Erro ao fazer upload', 'error');
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleCreateStory(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !uploadedMediaUrl) {
      showToast('Seleciona um ficheiro primeiro', 'error');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: uploadedMediaUrl,
        media_type: newStoryType
      });

      if (error) throw error;

      showToast('Story criado!', 'success');
      setShowCreateStory(false);
      setUploadedMediaUrl(null);
      setNewStoryType('image');
      loadStories();
    } catch {
      showToast('Erro ao criar story', 'error');
    } finally {
      setCreating(false);
    }
  }

  function openStoryGroup(groupIndex: number) {
    setActiveGroupIndex(groupIndex);
    setActiveStoryIndex(0);
    const group = storyGroups[groupIndex];
    handleViewStory(group.stories[0].id);
  }

  function nextStory() {
    if (activeGroupIndex === null) return;
    const group = storyGroups[activeGroupIndex];

    if (activeStoryIndex < group.stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      handleViewStory(group.stories[activeStoryIndex + 1].id);
    } else if (activeGroupIndex < storyGroups.length - 1) {
      setActiveGroupIndex(activeGroupIndex + 1);
      setActiveStoryIndex(0);
      handleViewStory(storyGroups[activeGroupIndex + 1].stories[0].id);
    } else {
      setActiveGroupIndex(null);
    }
  }

  function prevStory() {
    if (activeGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else if (activeGroupIndex > 0) {
      setActiveGroupIndex(activeGroupIndex - 1);
      setActiveStoryIndex(storyGroups[activeGroupIndex - 1].stories.length - 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-bebas text-3xl text-text">Stories</h1>
          {user && (
            <button onClick={() => setShowCreateStory(true)} className="btn btn-primary text-sm">
              <Plus size={16} /> Criar Story
            </button>
          )}
        </div>

        {storyGroups.length === 0 ? (
          <div className="text-center py-20 bg-bg2 border border-border rounded-2xl">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem Stories</h3>
            <p className="text-text3 text-sm">Sê o primeiro a criar um story!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {storyGroups.map((group, idx) => (
              <button
                key={group.user_id}
                onClick={() => openStoryGroup(idx)}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden border-2 bg-bg3 hover:border-purple transition-colors"
                style={{ borderColor: group.has_unviewed ? 'var(--color-purple)' : 'var(--color-border)' }}
              >
                {group.stories[0] && (
                  <img
                    src={group.stories[0].thumbnail_url || group.stories[0].media_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold">
                      {group.username.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm text-white">{group.username}</div>
                      <div className="text-xs text-white/70">{group.stories.length} stories</div>
                    </div>
                  </div>
                </div>

                {group.has_unviewed && (
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-purple border-2 border-white" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Story Viewer */}
        {activeGroupIndex !== null && (
          <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
            <button
              onClick={() => setActiveGroupIndex(null)}
              className="absolute top-4 right-4 z-10 text-white hover:text-text2"
            >
              <X size={28} />
            </button>

            <button
              onClick={prevStory}
              className="absolute left-2 md:left-8 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <ChevronLeft size={32} />
            </button>

            <button
              onClick={nextStory}
              className="absolute right-2 md:right-8 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <ChevronRight size={32} />
            </button>

            <div className="w-full max-w-sm mx-4 aspect-[9/16] relative rounded-2xl overflow-hidden bg-black">
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                {storyGroups[activeGroupIndex].stories.map((s, idx) => (
                  <div key={s.id} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className={`h-full bg-white ${idx < activeStoryIndex ? 'w-full' : idx === activeStoryIndex ? 'w-full animate-progress' : 'w-0'}`}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute top-6 left-3 z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold">
                  {storyGroups[activeGroupIndex].username.charAt(0)}
                </div>
                <span className="font-semibold text-white text-sm">
                  {storyGroups[activeGroupIndex].username}
                </span>
                <span className="text-white/60 text-xs flex items-center gap-1">
                  <Clock size={10} />
                  {Math.floor((Date.now() - new Date(storyGroups[activeGroupIndex].stories[activeStoryIndex].created_at).getTime()) / 3600000)}h
                </span>
              </div>

              <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-white/80 text-xs">
                <Eye size={14} />
                {storyGroups[activeGroupIndex].stories[activeStoryIndex].views_count} visualizações
              </div>

              {storyGroups[activeGroupIndex].stories[activeStoryIndex].media_type === 'image' ? (
                <img
                  src={storyGroups[activeGroupIndex].stories[activeStoryIndex].media_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                  onClick={nextStory}
                />
              ) : (
                <video
                  src={storyGroups[activeGroupIndex].stories[activeStoryIndex].media_url}
                  autoPlay
                  controls
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        )}

        {/* Create Story Modal */}
        {showCreateStory && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-rajdhani font-bold text-lg text-text">Criar Story</h2>
                <button onClick={() => setShowCreateStory(false)} className="text-text3 hover:text-text">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateStory} className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewStoryType('image'); fileInputRef.current?.click(); }}
                    className={`btn flex-1 text-sm ${newStoryType === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    <Image size={16} /> Imagem
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewStoryType('video'); fileInputRef.current?.click(); }}
                    className={`btn flex-1 text-sm ${newStoryType === 'video' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    <Video size={16} /> Vídeo
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={newStoryType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="border border-border rounded-xl p-4 text-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-text3 hover:text-text"
                  >
                    {uploadingFile ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        A carregar...
                      </span>
                    ) : uploadedMediaUrl ? (
                      <div className="relative">
                        {newStoryType === 'image' ? (
                          <img src={uploadedMediaUrl} alt="" className="max-h-[200px] mx-auto rounded-xl" />
                        ) : (
                          <video src={uploadedMediaUrl} className="max-h-[200px] mx-auto rounded-xl" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setUploadedMediaUrl(null); }}
                          className="absolute top-2 right-2 bg-red text-white rounded-full p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">📤</div>
                        <p className="text-sm">Clica para fazer upload</p>
                      </div>
                    )}
                  </button>
                </div>

                <p className="text-xs text-text3">
                  O story expira em 24 horas automaticamente.
                </p>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreateStory(false)} className="btn btn-ghost flex-1">
                    Cancelar
                  </button>
                  <button type="submit" disabled={creating || !uploadedMediaUrl} className="btn btn-primary flex-1 disabled:opacity-50">
                    {creating ? 'Criando...' : 'Criar Story'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
