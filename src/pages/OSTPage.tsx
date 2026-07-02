import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { usePlayer } from '../contexts/PlayerContext';
import { prepareMediaForUpload } from '../lib/imageCompress';
import { handleError } from '../lib/errorHandler';
import {
  Music, Play, Pause, Plus, X, Heart, Search, MoreVertical,
  Youtube, Upload, Edit3, Trash2, Share2, ListMusic,
  TrendingUp, Clock, ChevronRight, Loader2,
} from 'lucide-react';

interface OSTTrack {
  id: string; title: string; artist: string; anime: string | null;
  youtube_url: string | null; audio_url: string | null; added_by: string;
  likes_count: number; created_at: string;
  profiles?: { username: string };
  liked_by_me?: boolean;
}

interface Playlist { id: string; name: string; trackIds: string[]; createdAt: string; }

const ANIME_EMOJIS = ['🎌','⚔️','🔥','✨','💜','🌸'];
const SORT_OPTIONS = [
  { id: 'recent', label: 'Mais Recentes', icon: Clock },
  { id: 'popular', label: 'Mais Curtidas', icon: Heart },
  { id: 'trending', label: 'Em Alta', icon: TrendingUp },
];

function getPlaylists(): Playlist[] {
  try { return JSON.parse(localStorage.getItem('otaku_playlists') || '[]'); } catch { return []; }
}
function savePlaylists(pl: Playlist[]) { localStorage.setItem('otaku_playlists', JSON.stringify(pl)); }

function ShareMenu({ track, onClose }: { track: OSTTrack; onClose: () => void }) {
  const url = `${window.location.origin}/osts`;
  const text = `🎵 ${track.title} — ${track.artist}${track.anime ? ` (${track.anime})` : ''} | OtakuKamba`;
  const options = [
    { label: 'WhatsApp', emoji: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { label: 'Facebook', emoji: '👥', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}` },
    { label: 'Twitter/X', emoji: '🐦', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  ];
  return (
    <div className="absolute right-0 top-8 bg-bg3 border border-border rounded-xl shadow-2xl z-30 w-44 py-1 overflow-hidden">
      {options.map(o => (
        <a key={o.label} href={o.href} target="_blank" rel="noopener noreferrer" onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-bg4 transition-colors">
          <span>{o.emoji}</span> {o.label}
        </a>
      ))}
      <button onClick={async () => { await navigator.clipboard.writeText(url); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-bg4 transition-colors">
        <span>🔗</span> Copiar link
      </button>
    </div>
  );
}

function TrackCard({ track, currentTrackId, isPlaying, onToggle, onLike, onEdit, onDelete, onAddToPlaylist, isOwn, isAdmin }:
  { track: OSTTrack; currentTrackId?: string; isPlaying: boolean; onToggle: () => void;
    onLike: () => void; onEdit: () => void; onDelete: () => void; onAddToPlaylist: () => void;
    isOwn: boolean; isAdmin: boolean; }) {
  const isActive = currentTrackId === track.id;
  const [showMenu, setShowMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu && !showShare) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setShowMenu(false); setShowShare(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu, showShare]);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all group ${isActive ? 'bg-purple/10 border border-purple/30' : 'hover:bg-bg3 border border-transparent'}`}>
      {/* Play button */}
      <button onClick={onToggle} className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
        track.audio_url ? (isActive ? 'bg-purple text-white' : 'bg-bg3 group-hover:bg-purple/20 text-text2') : 'bg-bg3 text-text3 cursor-default'
      }`}>
        {track.audio_url
          ? (isActive && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />)
          : <Music size={16} />}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-purple2' : 'text-text'}`}>{track.title}</p>
          {track.youtube_url && (
            <a href={track.youtube_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="text-red flex-shrink-0"><Youtube size={12} /></a>
          )}
        </div>
        <p className="text-xs text-text3 truncate">{track.artist}{track.anime ? ` · ${track.anime}` : ''}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onLike} className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${track.liked_by_me ? 'text-red bg-red/10' : 'text-text3 hover:text-red hover:bg-bg4'}`}>
          <Heart size={12} fill={track.liked_by_me ? 'currentColor' : 'none'} /> {track.likes_count}
        </button>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg4 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical size={14} />
          </button>
          {showMenu && !showShare && (
            <div className="absolute right-0 top-8 bg-bg3 border border-border rounded-xl shadow-2xl z-30 w-48 py-1 overflow-hidden">
              <button onClick={() => { onAddToPlaylist(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-bg4"><ListMusic size={13} className="text-purple2" /> Adicionar à playlist</button>
              <button onClick={() => setShowShare(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-bg4"><Share2 size={13} className="text-teal" /> Partilhar</button>
              {(isOwn || isAdmin) && <div className="border-t border-border my-1" />}
              {(isOwn || isAdmin) && <button onClick={() => { onEdit(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-bg4"><Edit3 size={13} className="text-amber" /> Editar</button>}
              {(isOwn || isAdmin) && <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red hover:bg-bg4"><Trash2 size={13} /> Eliminar</button>}
            </div>
          )}
          {showShare && <ShareMenu track={track} onClose={() => { setShowShare(false); setShowMenu(false); }} />}
        </div>
      </div>
    </div>
  );
}

export default function OSTPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { toggle, currentTrack, isPlaying, play, queue } = usePlayer();
  const [tracks, setTracks] = useState<OSTTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<'url' | 'file'>('url');
  const [editTrack, setEditTrack] = useState<OSTTrack | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<OSTTrack | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>(getPlaylists());
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'playlists'>('all');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [form, setForm] = useState({ title: '', artist: '', anime: '', youtube_url: '', audio_url: '' });

  const isAdmin = !!(profile?.is_admin || ['supreme_admin', 'secondary_admin'].includes(profile?.role || ''));

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('ost_tracks').select('id, title, artist, anime, youtube_url, audio_url, added_by, likes_count, created_at, profiles(username)');
      if (sort === 'popular') q = q.order('likes_count', { ascending: false });
      else q = q.order('created_at', { ascending: false });

      const { data, error } = await q;
      if (error) throw error;

      const likedIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase.from('ost_likes').select('ost_id').eq('user_id', user.id);
        (likes || []).forEach(l => likedIds.add(l.ost_id));
      }
      setTracks((data || []).map(t => ({ ...t, liked_by_me: likedIds.has(t.id) })) as OSTTrack[]);
    } catch (err) {
      handleError(err, showToast, { context: 'carregar músicas' });
    } finally {
      setLoading(false);
    }
  }, [sort, user?.id]);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel('ost_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ost_tracks' }, () => loadTracks())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'ost_tracks' }, payload => {
        setTracks(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ost_tracks' }, payload => {
        setTracks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [loadTracks]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingFile(true);
    try {
      const prepared = await prepareMediaForUpload(file);
      const path = `osts/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('uploads').upload(path, prepared);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      setForm(f => ({ ...f, audio_url: publicUrl }));
      showToast('Ficheiro carregado! ✓', 'success');
    } catch (err) {
      handleError(err, showToast, { context: 'carregar ficheiro de áudio' });
    } finally {
      setUploadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleAdd() {
    if (!user) return;
    if (!form.title.trim() || !form.artist.trim()) { showToast('Título e artista são obrigatórios', 'error'); return; }
    if (!form.youtube_url.trim() && !form.audio_url.trim()) { showToast('Adiciona um URL do YouTube ou um ficheiro de áudio', 'error'); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from('ost_tracks').insert({
        title: form.title.trim(), artist: form.artist.trim(),
        anime: form.anime.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        audio_url: form.audio_url.trim() || null,
        added_by: user.id,
      });
      if (error) throw error;
      showToast('Música adicionada! 🎵', 'success');
      setForm({ title: '', artist: '', anime: '', youtube_url: '', audio_url: '' });
      setShowAdd(false);
      loadTracks();
    } catch (err) {
      handleError(err, showToast, { context: 'adicionar música' });
    } finally {
      setAdding(false);
    }
  }

  async function handleEdit() {
    if (!editTrack) return;
    try {
      const { error } = await supabase.from('ost_tracks').update({
        title: form.title.trim(), artist: form.artist.trim(),
        anime: form.anime.trim() || null, youtube_url: form.youtube_url.trim() || null,
      }).eq('id', editTrack.id);
      if (error) throw error;
      showToast('Música actualizada! ✓', 'success');
      setEditTrack(null);
      loadTracks();
    } catch (err) {
      handleError(err, showToast, { context: 'editar música' });
    }
  }

  async function handleDelete(trackId: string) {
    if (!confirm('Eliminar esta música?')) return;
    try {
      const { error } = await supabase.from('ost_tracks').delete().eq('id', trackId);
      if (error) throw error;
      setTracks(prev => prev.filter(t => t.id !== trackId));
      showToast('Música eliminada', 'info');
    } catch (err) {
      handleError(err, showToast, { context: 'eliminar música' });
    }
  }

  async function handleLike(track: OSTTrack) {
    if (!user) { showToast('Entra para curtir', 'info'); return; }
    const wasLiked = track.liked_by_me;
    setTracks(prev => prev.map(t => t.id === track.id ? { ...t, liked_by_me: !wasLiked, likes_count: wasLiked ? Math.max(0, t.likes_count - 1) : t.likes_count + 1 } : t));
    try {
      if (wasLiked) await supabase.from('ost_likes').delete().eq('ost_id', track.id).eq('user_id', user.id);
      else await supabase.from('ost_likes').insert({ ost_id: track.id, user_id: user.id });
    } catch {
      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, liked_by_me: wasLiked, likes_count: wasLiked ? t.likes_count + 1 : Math.max(0, t.likes_count - 1) } : t));
    }
  }

  function createPlaylist() {
    if (!newPlaylistName.trim()) return;
    const pl: Playlist = { id: Date.now().toString(), name: newPlaylistName.trim(), trackIds: [], createdAt: new Date().toISOString() };
    const updated = [...playlists, pl];
    setPlaylists(updated); savePlaylists(updated); setNewPlaylistName('');
    showToast('Playlist criada! 🎶', 'success');
  }

  function addTrackToPlaylist(playlist: Playlist, trackId: string) {
    if (playlist.trackIds.includes(trackId)) { showToast('Já está na playlist', 'info'); return; }
    const updated = playlists.map(p => p.id === playlist.id ? { ...p, trackIds: [...p.trackIds, trackId] } : p);
    setPlaylists(updated); savePlaylists(updated);
    showToast(`Adicionado a "${playlist.name}" ✓`, 'success');
    setAddToPlaylistTrack(null);
  }

  function deletePlaylist(id: string) {
    const updated = playlists.filter(p => p.id !== id);
    setPlaylists(updated); savePlaylists(updated);
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  }

  const filtered = tracks.filter(t =>
    !search.trim() || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.artist.toLowerCase().includes(search.toLowerCase()) || t.anime?.toLowerCase().includes(search.toLowerCase())
  );

  const playlistTracks = selectedPlaylist
    ? selectedPlaylist.trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) as OSTTrack[]
    : [];

  const displayTracks = activeTab === 'playlists' && selectedPlaylist ? playlistTracks : filtered;

  return (
    <div className="min-h-screen pt-20 pb-28 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bebas text-4xl text-text tracking-wide">Músicas <span className="text-purple2">&amp; OSTs</span></h1>
            <p className="text-text3 text-xs mt-0.5">{tracks.length} faixas · toca sem sair da plataforma</p>
          </div>
          {user && (
            <button onClick={() => { setShowAdd(true); setForm({ title: '', artist: '', anime: '', youtube_url: '', audio_url: '' }); }} className="btn btn-primary text-sm gap-2">
              <Plus size={15} /> Adicionar
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg2 border border-border rounded-xl p-1 mb-5">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'all' ? 'bg-purple text-white' : 'text-text3 hover:text-text'}`}>
            Todas as Músicas
          </button>
          <button onClick={() => setActiveTab('playlists')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'playlists' ? 'bg-purple text-white' : 'text-text3 hover:text-text'}`}>
            <span className="flex items-center justify-center gap-1.5"><ListMusic size={14} /> Playlists {playlists.length > 0 && <span className="text-[10px] bg-white/20 px-1 rounded">{playlists.length}</span>}</span>
          </button>
        </div>

        {/* All tracks tab */}
        {activeTab === 'all' && (
          <>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, artista ou anime..." className="input w-full pl-9 text-sm" />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)} className="bg-bg2 border border-border rounded-xl px-3 text-sm text-text2 flex-shrink-0">
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="bg-bg2 border border-border rounded-2xl p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-bg3 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5"><div className="h-3.5 bg-bg3 rounded w-1/3" /><div className="h-2.5 bg-bg3 rounded w-1/4" /></div>
                    <div className="h-3 bg-bg3 rounded w-12" />
                  </div>
                ))}
              </div>
            ) : displayTracks.length === 0 ? (
              <div className="text-center py-14 bg-bg2 border border-border rounded-2xl">
                <Music size={40} className="mx-auto mb-3 text-text3" />
                <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Sem músicas</h3>
                <p className="text-text3 text-sm">{search ? 'Tenta outra pesquisa.' : 'Sê o primeiro a adicionar uma OST!'}</p>
              </div>
            ) : (
              <div className="bg-bg2 border border-border rounded-2xl p-2 space-y-0.5">
                {displayTracks.map(track => (
                  <TrackCard key={track.id} track={track}
                    currentTrackId={currentTrack?.id} isPlaying={isPlaying}
                    onToggle={() => { if (track.audio_url) toggle(track); else if (track.youtube_url) window.open(track.youtube_url, '_blank'); }}
                    onLike={() => handleLike(track)}
                    onEdit={() => { setEditTrack(track); setForm({ title: track.title, artist: track.artist, anime: track.anime || '', youtube_url: track.youtube_url || '', audio_url: track.audio_url || '' }); }}
                    onDelete={() => handleDelete(track.id)}
                    onAddToPlaylist={() => setAddToPlaylistTrack(track)}
                    isOwn={track.added_by === user?.id}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Playlists tab */}
        {activeTab === 'playlists' && (
          <div>
            {!selectedPlaylist ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPlaylist()} placeholder="Nome da nova playlist..." className="input flex-1 text-sm" maxLength={40} />
                  <button onClick={createPlaylist} disabled={!newPlaylistName.trim()} className="btn btn-primary text-sm disabled:opacity-50"><Plus size={14} /></button>
                </div>
                {playlists.length === 0 ? (
                  <div className="text-center py-14 bg-bg2 border border-border rounded-2xl">
                    <ListMusic size={40} className="mx-auto mb-3 text-text3" />
                    <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Sem playlists ainda</h3>
                    <p className="text-text3 text-sm">Cria a tua primeira playlist acima.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlists.map(pl => (
                      <div key={pl.id} className="flex items-center gap-3 bg-bg2 border border-border rounded-xl p-3 hover:border-border2 transition-colors">
                        <button onClick={() => setSelectedPlaylist(pl)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple/30 to-teal/30 flex items-center justify-center flex-shrink-0"><ListMusic size={16} className="text-purple2" /></div>
                          <div className="min-w-0"><div className="font-semibold text-text text-sm truncate">{pl.name}</div><div className="text-xs text-text3">{pl.trackIds.length} músicas</div></div>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {pl.trackIds.length > 0 && (
                            <button onClick={() => { const ts = pl.trackIds.map(id => tracks.find(t => t.id === id)).filter(Boolean) as OSTTrack[]; if (ts[0]) play(ts[0], ts); }} className="w-8 h-8 rounded-lg bg-purple flex items-center justify-center text-white hover:bg-purple2">
                              <Play size={13} className="ml-0.5" />
                            </button>
                          )}
                          <button onClick={() => deletePlaylist(pl.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-red hover:bg-bg3"><Trash2 size={13} /></button>
                          <ChevronRight size={16} className="text-text3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setSelectedPlaylist(null)} className="flex items-center gap-1.5 text-sm text-text3 hover:text-text mb-4">← Voltar</button>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-rajdhani font-bold text-xl text-text">{selectedPlaylist.name}</h2>
                  {playlistTracks.length > 0 && <button onClick={() => play(playlistTracks[0], playlistTracks)} className="btn btn-primary text-xs py-2 px-3"><Play size={13} /> Tocar tudo</button>}
                </div>
                {playlistTracks.length === 0 ? (
                  <div className="text-center py-10 bg-bg2 border border-border rounded-2xl text-text3 text-sm">Playlist vazia. Adiciona músicas usando o menu ⋮ de cada faixa.</div>
                ) : (
                  <div className="bg-bg2 border border-border rounded-2xl p-2 space-y-0.5">
                    {playlistTracks.map(track => (
                      <TrackCard key={track.id} track={track}
                        currentTrackId={currentTrack?.id} isPlaying={isPlaying}
                        onToggle={() => { if (track.audio_url) toggle(track); }}
                        onLike={() => handleLike(track)}
                        onEdit={() => {}}
                        onDelete={() => {
                          const updated = playlists.map(p => p.id === selectedPlaylist.id ? { ...p, trackIds: p.trackIds.filter(id => id !== track.id) } : p);
                          setPlaylists(updated); savePlaylists(updated);
                          setSelectedPlaylist(updated.find(p => p.id === selectedPlaylist.id) || null);
                        }}
                        onAddToPlaylist={() => setAddToPlaylistTrack(track)}
                        isOwn={false} isAdmin={false}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-rajdhani font-bold text-lg text-text">Adicionar Música</h2>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-text3" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['url', 'file'] as const).map(m => (
                  <button key={m} onClick={() => setAddMode(m)} className={`flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${addMode === m ? 'bg-purple/20 text-purple2 border border-purple/30' : 'bg-bg3 text-text3 border border-transparent'}`}>
                    {m === 'url' ? <><Youtube size={14} /> URL YouTube</> : <><Upload size={14} /> Ficheiro de Áudio</>}
                  </button>
                ))}
              </div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título *" className="input w-full text-sm" />
              <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} placeholder="Artista *" className="input w-full text-sm" />
              <input value={form.anime} onChange={e => setForm(f => ({ ...f, anime: e.target.value }))} placeholder="Anime (opcional)" className="input w-full text-sm" />
              {addMode === 'url' ? (
                <input value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="URL do YouTube" className="input w-full text-sm" />
              ) : (
                <div>
                  <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileRef.current?.click()} disabled={uploadingFile} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-purple/50 text-sm text-text3 transition-colors disabled:opacity-50">
                    {uploadingFile ? <><Loader2 size={15} className="animate-spin" /> A carregar...</> : form.audio_url ? '✓ Ficheiro carregado' : <><Upload size={15} /> Seleccionar ficheiro de áudio</>}
                  </button>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1 text-sm">Cancelar</button>
                <button onClick={handleAdd} disabled={adding} className="btn btn-primary flex-1 text-sm disabled:opacity-50">
                  {adding ? 'Adicionando...' : '🎵 Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTrack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setEditTrack(null)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-rajdhani font-bold text-lg text-text">Editar Música</h2>
              <button onClick={() => setEditTrack(null)}><X size={18} className="text-text3" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título" className="input w-full text-sm" />
              <input value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} placeholder="Artista" className="input w-full text-sm" />
              <input value={form.anime} onChange={e => setForm(f => ({ ...f, anime: e.target.value }))} placeholder="Anime" className="input w-full text-sm" />
              <input value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="URL YouTube" className="input w-full text-sm" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditTrack(null)} className="btn btn-ghost flex-1 text-sm">Cancelar</button>
                <button onClick={handleEdit} className="btn btn-primary flex-1 text-sm">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to playlist modal */}
      {addToPlaylistTrack && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setAddToPlaylistTrack(null)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-rajdhani font-bold text-base text-text">Adicionar à Playlist</h2>
              <button onClick={() => setAddToPlaylistTrack(null)}><X size={16} className="text-text3" /></button>
            </div>
            {playlists.length === 0 ? (
              <p className="text-text3 text-sm text-center py-4">Cria uma playlist primeiro no separador Playlists.</p>
            ) : (
              <div className="space-y-2">
                {playlists.map(pl => (
                  <button key={pl.id} onClick={() => addTrackToPlaylist(pl, addToPlaylistTrack.id)} className="w-full flex items-center gap-3 bg-bg3 rounded-xl p-3 hover:bg-bg4 transition-colors text-left">
                    <ListMusic size={15} className="text-purple2 flex-shrink-0" />
                    <div className="flex-1 min-w-0"><div className="font-semibold text-text text-sm truncate">{pl.name}</div><div className="text-xs text-text3">{pl.trackIds.length} músicas</div></div>
                    {pl.trackIds.includes(addToPlaylistTrack.id) && <span className="text-xs text-teal">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
