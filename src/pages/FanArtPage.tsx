import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Upload, Heart, MessageCircle, Image, X, Plus, Trash2 } from 'lucide-react';

interface FanArt {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: { username: string } | { username: string }[];
  liked_by_me?: boolean;
}

export default function FanArtPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [artworks, setArtworks] = useState<FanArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newArt, setNewArt] = useState({ title: '', description: '', image_url: '' });

  useEffect(() => {
    loadArtworks();
  }, [user]);

  async function loadArtworks() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('fan_art')
        .select('id, user_id, title, description, image_url, likes_count, comments_count, created_at, profiles!inner(username)')
        .order('created_at', { ascending: false });

      if (!data) {
        setArtworks([]);
        return;
      }

      const likedIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from('fan_art_likes')
          .select('fan_art_id')
          .eq('user_id', user.id);
        (likes || []).forEach(l => likedIds.add(l.fan_art_id));
      }

      setArtworks(data.map(a => ({
        ...a,
        liked_by_me: likedIds.has(a.id)
      })));
    } catch (error) {
      console.error('Error loading fan art:', error);
    } finally {
      setLoading(false);
    }
  }

  function getProfileUsername(art: FanArt): string {
    if (!art.profiles) return 'user';
    if (Array.isArray(art.profiles)) {
      const p = art.profiles[0];
      return p?.username || 'user';
    }
    return (art.profiles as { username: string }).username || 'user';
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ficheiro muito grande (máx 10MB)', 'error');
      return;
    }

    setUploading(true);
    const filePath = `fanart/${user.id}/${Date.now()}_${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
      setNewArt(prev => ({ ...prev, image_url: publicUrl }));
      showToast('Upload completo!', 'success');
    } catch {
      showToast('Erro ao fazer upload', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!user || !newArt.title.trim() || !newArt.image_url) {
      showToast('Preenche todos os campos', 'error');
      return;
    }

    try {
      await supabase.from('fan_art').insert({
        user_id: user.id,
        title: newArt.title.trim(),
        description: newArt.description.trim() || null,
        image_url: newArt.image_url
      });
      showToast('Fan art publicado!', 'success');
      setNewArt({ title: '', description: '', image_url: '' });
      setShowUpload(false);
      loadArtworks();
    } catch {
      showToast('Erro ao publicar', 'error');
    }
  }

  async function handleLike(artId: string, isLiked: boolean) {
    if (!user) {
      showToast('Entra para curtir', 'info');
      return;
    }
    try {
      if (isLiked) {
        await supabase.from('fan_art_likes').delete().eq('fan_art_id', artId).eq('user_id', user.id);
        setArtworks(prev => prev.map(a => a.id === artId ? { ...a, likes_count: a.likes_count - 1, liked_by_me: false } : a));
      } else {
        await supabase.from('fan_art_likes').insert({ fan_art_id: artId, user_id: user.id });
        setArtworks(prev => prev.map(a => a.id === artId ? { ...a, likes_count: a.likes_count + 1, liked_by_me: true } : a));
      }
    } catch {
      showToast('Erro', 'error');
    }
  }

  async function handleDelete(artId: string) {
    if (!user || !confirm('Tens certeza?')) return;
    await supabase.from('fan_art').delete().eq('id', artId).eq('user_id', user.id);
    setArtworks(prev => prev.filter(a => a.id !== artId));
    showToast('Removido', 'info');
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bebas text-3xl md:text-4xl text-text mb-1">
              Galeria de <span className="text-purple2">Fan Art</span>
            </h1>
            <p className="text-text2 text-sm">Partilha e descobre arte da comunidade.</p>
          </div>
          {user && (
            <button onClick={() => setShowUpload(true)} className="btn btn-primary text-sm">
              <Plus size={16} /> Publicar
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Image size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Galeria vazia</h3>
            <p className="text-text3 text-sm mb-4">Sê o primeiro a publicar fan art!</p>
            {user && (
              <button onClick={() => setShowUpload(true)} className="btn btn-primary">
                <Upload size={16} /> Publicar Arte
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {artworks.map(art => (
              <div key={art.id} className="bg-bg2 border border-border rounded-2xl overflow-hidden group">
                <div className="relative aspect-square">
                  <img src={art.image_url} alt={art.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleLike(art.id, art.liked_by_me || false)}
                      className={`p-2 rounded-full ${art.liked_by_me ? 'bg-red text-white' : 'bg-white/20 text-white'}`}
                    >
                      <Heart size={18} fill={art.liked_by_me ? 'currentColor' : 'none'} />
                    </button>
                    {user?.id === art.user_id && (
                      <button onClick={() => handleDelete(art.id)} className="p-2 rounded-full bg-white/20 text-white">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-rajdhani font-bold text-text text-sm truncate">{art.title}</h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-text3">
                    <span>@{getProfileUsername(art)}</span>
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {art.likes_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-rajdhani font-bold text-lg text-text">Publicar Fan Art</h2>
                <button onClick={() => setShowUpload(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-text3 mb-1">Título</label>
                  <input
                    value={newArt.title}
                    onChange={e => setNewArt({ ...newArt, title: e.target.value })}
                    className="input w-full"
                    placeholder="Título da arte"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text3 mb-1">Descrição</label>
                  <textarea
                    value={newArt.description}
                    onChange={e => setNewArt({ ...newArt, description: e.target.value })}
                    className="input w-full min-h-[80px]"
                    placeholder="Descrição opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text3 mb-1">Imagem</label>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="fanart-upload" />
                  <label
                    htmlFor="fanart-upload"
                    className="block w-full border-2 border-dashed border-border2 rounded-xl p-6 text-center cursor-pointer hover:border-purple/50 transition-colors"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2 text-text3">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        A carregar...
                      </span>
                    ) : newArt.image_url ? (
                      <img src={newArt.image_url} alt="Preview" className="max-h-[150px] mx-auto rounded-lg" />
                    ) : (
                      <div className="text-text3">
                        <Image size={32} className="mx-auto mb-2" />
                        <p className="text-sm">Clica para fazer upload</p>
                      </div>
                    )}
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowUpload(false)} className="btn btn-ghost flex-1">Cancelar</button>
                  <button onClick={handleSubmit} className="btn btn-primary flex-1">Publicar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
