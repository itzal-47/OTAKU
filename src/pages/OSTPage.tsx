import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Music, Play, Pause, ExternalLink, Plus, Heart, Trash2, X, Volume2, VolumeX } from 'lucide-react';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  anime: string;
  youtube_url: string | null;
  spotify_url: string | null;
  audio_url?: string | null;
  added_by: string;
  likes_count: number;
  created_at: string;
  profiles?: { username: string } | { username: string }[];
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', anime: '', youtube_url: '' });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadTracks();
  }, [user]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setPlayingId(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playingId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  async function loadTracks() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ost_tracks')
        .select('id, title, artist, anime, youtube_url, spotify_url, audio_url, added_by, likes_count, created_at, profiles(username)')
        .order('created_at', { ascending: false });

      if (!data) {
        setTracks([]);
        return;
      }

      const likedIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from('ost_likes')
          .select('ost_id')
          .eq('user_id', user.id);
        (likes || []).forEach(l => likedIds.add(l.ost_id));
      }

      setTracks(data.map(t => {
        let profileData: { username: string } | undefined;
        if (t.profiles) {
          if (Array.isArray(t.profiles)) {
            profileData = t.profiles[0];
          } else {
            profileData = t.profiles as { username: string };
          }
        }
        return {
          ...t,
          profiles: profileData,
          liked_by_me: likedIds.has(t.id)
        };
      }));
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addTrack() {
    if (!user) {
      showToast('Entra para adicionar música', 'info');
      return;
    }
    if (!newTrack.title.trim() || !newTrack.artist.trim()) {
      showToast('Preenche título e artista', 'error');
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

  function playTrack(track: MusicTrack) {
    // For now, just open YouTube as most tracks don't have direct audio URLs
    if (track.youtube_url) {
      // Extract video ID and use embedded player option
      openYouTube(track.youtube_url);
    }
  }

  function playPause() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        showToast('Não foi possível reproduzir', 'error');
      });
    }
    setIsPlaying(!isPlaying);
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

        {/* Mini Player (when playing) */}
        {playingId && (
          <div className="fixed bottom-20 left-0 right-0 bg-bg2 border-t border-border p-3 z-40 md:bottom-4 md:left-auto md:right-4 md:w-80 md:rounded-2xl md:border">
            <div className="flex items-center gap-3">
              <button
                onClick={playPause}
                className="w-10 h-10 rounded-full bg-purple text-white flex items-center justify-center flex-shrink-0"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text truncate">
                  {tracks.find(t => t.id === playingId)?.title}
                </div>
                <div className="text-xs text-text3 truncate">
                  {tracks.find(t => t.id === playingId)?.artist}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-text3">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text3">{formatTime(duration)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlayingId(null);
                }}
                className="text-text3 hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

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
              <div
                key={track.id}
                className={`bg-bg2 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-purple/30 transition-all ${
                  playingId === track.id ? 'border-purple' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => playTrack(track)}
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
                </div>

                <div className="flex items-center gap-3 sm:gap-2">
                  {/* Play on site button */}
                  {track.youtube_url && (
                    <button
                      onClick={() => {
                        setPlayingId(track.id);
                        setIsPlaying(true);
                        showToast('A abrir no YouTube...', 'info');
                        setTimeout(() => openYouTube(track.youtube_url), 500);
                      }}
                      className="btn btn-ghost text-xs py-2 px-3 flex items-center gap-1"
                    >
                      <Music size={14} />
                      Tocar
                    </button>
                  )}

                  <button
                    onClick={() => toggleLike(track.id, track.liked_by_me || false)}
                    className={`flex items-center gap-1 text-sm ${track.liked_by_me ? 'text-red' : 'text-text3'}`}
                  >
                    <Heart size={16} fill={track.liked_by_me ? 'currentColor' : 'none'} />
                    {track.likes_count}
                  </button>

                  {track.youtube_url && (
                    <button onClick={() => openYouTube(track.youtube_url)} className="text-text3 hover:text-purple p-2">
                      <ExternalLink size={16} />
                    </button>
                  )}

                  {user?.id === track.added_by && (
                    <button onClick={() => deleteTrack(track.id)} className="text-red hover:opacity-80 p-2">
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
