import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Music, Play, Pause, ExternalLink, Plus, Heart, Trash2, X } from 'lucide-react';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  anime: string;
  youtube_url: string | null;
  spotify_url: string | null;
  added_by: string;
  likes_count: number;
  created_at: string;
  profiles?: { username: string };
  liked_by_me?: boolean;
}

const DEFAULT_TRACKS = [
  { title: 'Unravel', artist: 'TK from Ling tosite sigure', anime: 'Tokyo Ghoul', youtube_url: 'https://www.youtube.com/watch?v=7aMOurgDB-o' },
  { title: 'The Hero!!', artist: 'JAM Project', anime: 'One Punch Man', youtube_url: 'https://www.youtube.com/watch?v=at77j2iNltM' },
  { title: 'Gurenge', artist: 'LiSA', anime: 'Demon Slayer', youtube_url: 'https://www.youtube.com/watch?v=9E6b3swgLD4' },
  { title: 'Again', artist: 'YUI', anime: 'Fullmetal Alchemist Brotherhood', youtube_url: 'https://www.youtube.com/watch?v=2J6DX4Yg_1s' },
  { title: 'Departure!', artist: 'Masatoshi Ono', anime: 'Hunter x Hunter', youtube_url: 'https://www.youtube.com/watch?v=3wQ3WOOt3i8' },
  { title: 'Blue Bird', artist: 'Ikimono-gakari', anime: 'Naruto Shippuden', youtube_url: 'https://www.youtube.com/watch?v=an7hXxH3B9s' },
  { title: 'We Are!', artist: 'Hiroshi Kitadani', anime: 'One Piece', youtube_url: 'https://www.youtube.com/watch?v=7T1O4j4O9c0' },
  { title: 'Shinzou wo Sasageyo', artist: 'Linked Horizon', anime: 'Attack on Titan', youtube_url: 'https://www.youtube.com/watch?v=4T6I1qU6DqI' },
  { title: 'Silhouette', artist: 'KANA-BOON', anime: 'Naruto Shippuden', youtube_url: 'https://www.youtube.com/watch?v=dlFA0Zq1k2A' },
  { title: 'The Day', artist: 'Porno Graffitti', anime: 'My Hero Academia', youtube_url: 'https://www.youtube.com/watch?v=8n3nMn9a3dU' }
];

export default function OSTPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', anime: '', youtube_url: '' });

  useEffect(() => {
    loadTracks();
  }, [user]);

  async function loadTracks() {
    setLoading(true);
    try {
      const { data: existing } = await supabase.from('ost_tracks').select('*');

      if (!existing || existing.length === 0) {
        const { data: inserted } = await supabase.from('ost_tracks').insert(
          DEFAULT_TRACKS.map(t => ({ ...t, likes_count: 0 }))
        ).select();
        setTracks(inserted || []);
      } else {
        setTracks(existing);
      }

      if (user) {
        const { data: likes } = await supabase.from('ost_likes').select('ost_id').eq('user_id', user.id);
        const likedIds = new Set((likes || []).map(l => l.ost_id));
        setTracks(prev => prev.map(t => ({ ...t, liked_by_me: likedIds.has(t.id) })));
      }
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addTrack() {
    if (!user || !newTrack.title.trim() || !newTrack.artist.trim()) {
      showToast('Preenche todos os campos', 'error');
      return;
    }
    try {
      await supabase.from('ost_tracks').insert({
        title: newTrack.title.trim(),
        artist: newTrack.artist.trim(),
        anime: newTrack.anime.trim() || null,
        youtube_url: newTrack.youtube_url.trim() || null,
        added_by: user.id
      });
      showToast('Música adicionada!', 'success');
      setNewTrack({ title: '', artist: '', anime: '', youtube_url: '' });
      setShowAdd(false);
      loadTracks();
    } catch {
      showToast('Erro ao adicionar', 'error');
    }
  }

  async function toggleLike(trackId: string, isLiked: boolean) {
    if (!user) {
      showToast('Entra para curtir', 'info');
      return;
    }
    try {
      if (isLiked) {
        await supabase.from('ost_likes').delete().eq('ost_id', trackId).eq('user_id', user.id);
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, likes_count: t.likes_count - 1, liked_by_me: false } : t));
      } else {
        await supabase.from('ost_likes').insert({ ost_id: trackId, user_id: user.id });
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, likes_count: t.likes_count + 1, liked_by_me: true } : t));
      }
    } catch {
      showToast('Erro', 'error');
    }
  }

  async function deleteTrack(id: string) {
    if (!user || !confirm('Tens certeza?')) return;
    await supabase.from('ost_tracks').delete().eq('id', id).eq('added_by', user.id);
    setTracks(prev => prev.filter(t => t.id !== id));
    showToast('Removido', 'info');
  }

  function openYouTube(url: string | null) {
    if (url) window.open(url, '_blank');
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bebas text-3xl md:text-4xl text-text mb-1">
              Música & <span className="text-purple2">OST</span>
            </h1>
            <p className="text-text2 text-sm">Anime music recommendations e playlists.</p>
          </div>
          {user && (
            <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm">
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Music size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem músicas</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map(track => (
              <div key={track.id} className="bg-bg2 border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-purple/30 transition-all">
                <button
                  onClick={() => openYouTube(track.youtube_url)}
                  className="w-12 h-12 rounded-xl bg-bg3 flex items-center justify-center text-purple hover:bg-purple/20 transition-colors flex-shrink-0"
                >
                  <Play size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-rajdhani font-bold text-text truncate">{track.title}</h3>
                  <div className="text-sm text-text3 flex items-center gap-2 flex-wrap">
                    <span>{track.artist}</span>
                    {track.anime && (
                      <>
                        <span>·</span>
                        <span className="text-purple2">{track.anime}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLike(track.id, track.liked_by_me || false)}
                    className={`flex items-center gap-1 text-sm ${track.liked_by_me ? 'text-red' : 'text-text3'}`}
                  >
                    <Heart size={16} fill={track.liked_by_me ? 'currentColor' : 'none'} />
                    {track.likes_count}
                  </button>
                  {track.youtube_url && (
                    <button onClick={() => openYouTube(track.youtube_url)} className="text-text3 hover:text-purple">
                      <ExternalLink size={16} />
                    </button>
                  )}
                  {user?.id === track.added_by && (
                    <button onClick={() => deleteTrack(track.id)} className="text-red hover:opacity-80">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-rajdhani font-bold text-lg text-text">Adicionar Música</h2>
                <button onClick={() => setShowAdd(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-xs text-text3 mb-1">Título</label>
                  <input value={newTrack.title} onChange={e => setNewTrack({ ...newTrack, title: e.target.value })} className="input w-full" placeholder="Título da música" />
                </div>
                <div><label className="block text-xs text-text3 mb-1">Artista</label>
                  <input value={newTrack.artist} onChange={e => setNewTrack({ ...newTrack, artist: e.target.value })} className="input w-full" placeholder="Nome do artista" />
                </div>
                <div><label className="block text-xs text-text3 mb-1">Anime</label>
                  <input value={newTrack.anime} onChange={e => setNewTrack({ ...newTrack, anime: e.target.value })} className="input w-full" placeholder="Anime de origem" />
                </div>
                <div><label className="block text-xs text-text3 mb-1">YouTube URL</label>
                  <input value={newTrack.youtube_url} onChange={e => setNewTrack({ ...newTrack, youtube_url: e.target.value })} className="input w-full" placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1">Cancelar</button>
                  <button onClick={addTrack} className="btn btn-primary flex-1">Adicionar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
