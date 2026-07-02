import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { prepareMediaForUpload } from '../lib/imageCompress';
import { handleError } from '../lib/errorHandler';
import { Image, Plus, X, Trash2, Edit3, Share2, FolderPlus, Maximize2, ChevronLeft, Loader2, Search } from 'lucide-react';

interface FanArt {
  id: string; user_id: string; title: string; description: string | null;
  image_url: string; likes_count: number; comments_count: number; created_at: string;
  profiles?: { username: string } | { username: string }[];
  liked_by_me?: boolean; my_reaction?: string;
}

interface Collection { id: string; name: string; artIds: string[]; createdAt: string; }

const ANIME_REACTIONS = ['❤️', '🔥', '😮', '🫡', '⚔️', '🌸'];
const REACTION_LABELS: Record<string, string> = { '❤️': 'Incrível', '🔥': 'Épico', '😮': 'Uau', '🫡': 'Respeito', '⚔️': 'Lendário', '🌸': 'Lindo' };

function getCollections(): Collection[] {
  try { return JSON.parse(localStorage.getItem('otaku_fanart_collections') || '[]'); } catch { return []; }
}
function saveCollections(c: Collection[]) { localStorage.setItem('otaku_fanart_collections', JSON.stringify(c)); }

function ShareMenu({ art, onClose }: { art: FanArt; onClose: () => void }) {
  const url = `${window.location.origin}/fan-art`;
  const username = typeof art.profiles === 'object' && !Array.isArray(art.profiles) ? art.profiles?.username : (art.profiles as any)?.[0]?.username || 'artista';
  const text = `🎨 "${art.title}" por @${username} | OtakuKamba`;
  const options = [
    { label: 'WhatsApp', emoji: '💬', href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { label: 'Facebook', emoji: '👥', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
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

function ArtCard({ art, onReact, onDelete, onEdit, onOpenLightbox, onAddToCollection, isOwn }:
  { art: FanArt; onReact: (emoji: string) => void; onDelete: () => void; onEdit: () => void;
    onOpenLightbox: () => void; onAddToCollection: () => void; isOwn: boolean; }) {
  const [showReactions, setShowReactions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showReactions && !showShare) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setShowReactions(false); setShowShare(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showReactions, showShare]);

  const username = typeof art.profiles === 'object' && !Array.isArray(art.profiles) ? (art.profiles as any)?.username : (art.profiles as any)?.[0]?.username || 'artista';

  return (
    <div className="bg-bg2 border border-border rounded-2xl overflow-hidden group flex flex-col">
      <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={onOpenLightbox}>
        <img src={art.image_url} alt={art.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-rajdhani font-bold text-text text-sm truncate">{art.title}</h3>
            <p className="text-[11px] text-text3">@{username}</p>
          </div>
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={() => setShowReactions(!showReactions)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 text-base">
              {art.my_reaction || '＋'}
            </button>
            {showReactions && !showShare && (
              <div className="absolute right-0 bottom-8 bg-bg3 border border-border rounded-2xl shadow-2xl p-2 flex gap-1.5 z-20">
                {ANIME_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { onReact(emoji); setShowReactions(false); }} title={REACTION_LABELS[emoji]}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-bg4 hover:scale-110 transition-all ${art.my_reaction === emoji ? 'bg-purple/20 ring-1 ring-purple/40' : ''}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1">
            {ANIME_REACTIONS.slice(0, 3).map(e => (
              <span key={e} className="text-[10px]" title={REACTION_LABELS[e]}>{e}</span>
            ))}
            {art.likes_count > 0 && <span className="text-[11px] text-text3 ml-1">{art.likes_count}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowShare(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-teal hover:bg-bg3"><Share2 size={13} /></button>
            <button onClick={onAddToCollection} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-purple2 hover:bg-bg3"><FolderPlus size={13} /></button>
            {isOwn && <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-amber hover:bg-bg3"><Edit3 size={13} /></button>}
            {isOwn && <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-red hover:bg-bg3"><Trash2 size={13} /></button>}
            {showShare && <ShareMenu art={art} onClose={() => setShowShare(false)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FanArtPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [artworks, setArtworks] = useState<FanArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'gallery' | 'collections'>('gallery');
  const [newArt, setNewArt] = useState({ title: '', description: '', image_url: '' });
  const [editArt, setEditArt] = useState<FanArt | null>(null);
  const [lightboxArt, setLightboxArt] = useState<FanArt | null>(null);
  const [collections, setCollections] = useState<Collection[]>(getCollections());
  const [newCollName, setNewCollName] = useState('');
  const [addToCollArt, setAddToCollArt] = useState<FanArt | null>(null);
  const [selectedColl, setSelectedColl] = useState<Collection | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reactionsKey = `otaku_fanart_reactions`;

  function getReactions(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(reactionsKey) || '{}'); } catch { return {}; }
  }
  function saveReaction(artId: string, emoji: string) {
    const r = getReactions(); r[artId] = emoji; localStorage.setItem(reactionsKey, JSON.stringify(r));
  }

  const loadArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fan_art')
        .select('id, user_id, title, description, image_url, likes_count, comments_count, created_at, profiles(username)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const likedIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase.from('fan_art_likes').select('fan_art_id').eq('user_id', user.id);
        (likes || []).forEach(l => likedIds.add(l.fan_art_id));
      }
      const reactions = getReactions();
      setArtworks((data || []).map(a => ({ ...a, liked_by_me: likedIds.has(a.id), my_reaction: reactions[a.id] })) as FanArt[]);
    } catch (err) {
      handleError(err, showToast, { context: 'carregar fan art' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadArtworks(); }, [loadArtworks]);

  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel('fanart_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fan_art' }, () => loadArtworks())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fan_art' }, payload => {
        setArtworks(prev => prev.filter(a => a.id !== payload.old.id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fan_art' }, payload => {
        setArtworks(prev => prev.map(a => a.id === payload.new.id ? { ...a, likes_count: payload.new.likes_count } : a));
      })
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [loadArtworks]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona uma imagem válida', 'error'); return; }
    if (file.size > 15 * 1024 * 1024) { showToast('Imagem muito grande (máx 15MB)', 'error'); return; }
    setUploading(true);
    try {
      const compressed = await prepareMediaForUpload(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.85 });
      const ext = compressed.name.split('.').pop() || 'jpg';
      const path = `fanart/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, compressed);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      setNewArt(prev => ({ ...prev, image_url: publicUrl }));
      showToast('Upload completo! ✓', 'success');
    } catch (err) {
      handleError(err, showToast, { context: 'fazer upload da imagem' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit() {
    if (!user) { showToast('Precisas estar logado', 'error'); return; }
    if (!newArt.image_url) { showToast('Selecciona uma imagem', 'error'); return; }
    if (!newArt.title.trim()) { showToast('Adiciona um título', 'error'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('fan_art').insert({
        user_id: user.id, title: newArt.title.trim(),
        description: newArt.description.trim() || null, image_url: newArt.image_url,
      });
      if (error) throw error;
      showToast('Fan Art publicado! 🎨', 'success');
      setNewArt({ title: '', description: '', image_url: '' });
      setShowUpload(false);
      loadArtworks();
    } catch (err) {
      handleError(err, showToast, { context: 'publicar fan art' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editArt || !user) return;
    try {
      const { error } = await supabase.from('fan_art').update({ title: editArt.title, description: editArt.description }).eq('id', editArt.id).eq('user_id', user.id);
      if (error) throw error;
      setArtworks(prev => prev.map(a => a.id === editArt.id ? { ...a, ...editArt } : a));
      showToast('Fan Art actualizado! ✓', 'success');
      setEditArt(null);
    } catch (err) {
      handleError(err, showToast, { context: 'editar fan art' });
    }
  }

  async function handleDelete(artId: string) {
    if (!user || !confirm('Eliminar este fan art?')) return;
    try {
      const { error } = await supabase.from('fan_art').delete().eq('id', artId).eq('user_id', user.id);
      if (error) throw error;
      setArtworks(prev => prev.filter(a => a.id !== artId));
      showToast('Fan Art eliminado', 'info');
    } catch (err) {
      handleError(err, showToast, { context: 'eliminar fan art' });
    }
  }

  async function handleReact(art: FanArt, emoji: string) {
    if (!user) { showToast('Entra para reagir', 'info'); return; }
    const wasLiked = art.liked_by_me;
    const isSameReaction = art.my_reaction === emoji;
    saveReaction(art.id, isSameReaction ? '' : emoji);
    setArtworks(prev => prev.map(a => a.id === art.id ? {
      ...a, my_reaction: isSameReaction ? undefined : emoji,
      liked_by_me: !isSameReaction, likes_count: isSameReaction ? Math.max(0, a.likes_count - 1) : wasLiked ? a.likes_count : a.likes_count + 1
    } : a));
    try {
      if (isSameReaction || (!isSameReaction && wasLiked)) {
        await supabase.from('fan_art_likes').delete().eq('fan_art_id', art.id).eq('user_id', user.id);
      }
      if (!isSameReaction) {
        await supabase.from('fan_art_likes').insert({ fan_art_id: art.id, user_id: user.id });
      }
    } catch { loadArtworks(); }
  }

  function createCollection() {
    if (!newCollName.trim()) return;
    const coll: Collection = { id: Date.now().toString(), name: newCollName.trim(), artIds: [], createdAt: new Date().toISOString() };
    const updated = [...collections, coll];
    setCollections(updated); saveCollections(updated); setNewCollName('');
    showToast('Coleção criada! 🗂️', 'success');
  }

  function addArtToCollection(coll: Collection, artId: string) {
    if (coll.artIds.includes(artId)) { showToast('Já está na coleção', 'info'); return; }
    const updated = collections.map(c => c.id === coll.id ? { ...c, artIds: [...c.artIds, artId] } : c);
    setCollections(updated); saveCollections(updated);
    showToast(`Adicionado a "${coll.name}" ✓`, 'success');
    setAddToCollArt(null);
  }

  const filtered = artworks.filter(a =>
    !search.trim() || a.title.toLowerCase().includes(search.toLowerCase())
  );

  const collArtworks = selectedColl
    ? selectedColl.artIds.map(id => artworks.find(a => a.id === id)).filter(Boolean) as FanArt[]
    : [];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bebas text-4xl text-text tracking-wide">Galeria de <span className="text-purple2">Fan Art</span></h1>
            <p className="text-text3 text-xs mt-0.5">{artworks.length} obras · criadas pela comunidade</p>
          </div>
          {user && (
            <button onClick={() => setShowUpload(true)} className="btn btn-primary text-sm gap-2">
              <Plus size={15} /> Publicar
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg2 border border-border rounded-xl p-1 mb-5">
          <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'gallery' ? 'bg-purple text-white' : 'text-text3 hover:text-text'}`}>
            Galeria
          </button>
          <button onClick={() => setActiveTab('collections')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'collections' ? 'bg-purple text-white' : 'text-text3 hover:text-text'}`}>
            <span className="flex items-center justify-center gap-1.5">
              🗂️ Coleções {collections.length > 0 && <span className="text-[10px] bg-white/20 px-1 rounded">{collections.length}</span>}
            </span>
          </button>
        </div>

        {/* Gallery */}
        {activeTab === 'gallery' && (
          <>
            <div className="relative mb-5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fan arts..." className="input w-full pl-9 text-sm" />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-bg2 border border-border rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 bg-bg2 border border-border rounded-2xl">
                <Image size={40} className="mx-auto mb-3 text-text3" />
                <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Galeria vazia</h3>
                <p className="text-text3 text-sm mb-4">Sê o primeiro a publicar fan art!</p>
                {user && <button onClick={() => setShowUpload(true)} className="btn btn-primary text-sm"><Plus size={14} /> Publicar Arte</button>}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filtered.map(art => (
                  <ArtCard key={art.id} art={art}
                    onReact={emoji => handleReact(art, emoji)}
                    onDelete={() => handleDelete(art.id)}
                    onEdit={() => setEditArt(art)}
                    onOpenLightbox={() => setLightboxArt(art)}
                    onAddToCollection={() => setAddToCollArt(art)}
                    isOwn={art.user_id === user?.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Collections */}
        {activeTab === 'collections' && (
          <div>
            {!selectedColl ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input value={newCollName} onChange={e => setNewCollName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCollection()} placeholder="Nome da nova coleção..." className="input flex-1 text-sm" maxLength={40} />
                  <button onClick={createCollection} disabled={!newCollName.trim()} className="btn btn-primary text-sm disabled:opacity-50"><Plus size={14} /></button>
                </div>
                {collections.length === 0 ? (
                  <div className="text-center py-14 bg-bg2 border border-border rounded-2xl">
                    <span className="text-4xl mb-3 block">🗂️</span>
                    <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Sem coleções ainda</h3>
                    <p className="text-text3 text-sm">Cria uma coleção e organiza as tuas fan arts favoritas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {collections.map(coll => {
                      const preview = coll.artIds.slice(0, 4).map(id => artworks.find(a => a.id === id)).filter(Boolean) as FanArt[];
                      return (
                        <button key={coll.id} onClick={() => setSelectedColl(coll)} className="text-left bg-bg2 border border-border rounded-2xl overflow-hidden hover:border-purple/40 transition-all group">
                          <div className="aspect-video grid grid-cols-2 gap-0.5 overflow-hidden">
                            {preview.slice(0, 4).map(a => <img key={a.id} src={a.image_url} alt={a.title} className="w-full h-full object-cover" />)}
                            {[...Array(Math.max(0, 4 - preview.length))].map((_, i) => <div key={i} className="bg-bg3" />)}
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <div><div className="font-semibold text-text text-sm">{coll.name}</div><div className="text-xs text-text3">{coll.artIds.length} obras</div></div>
                            <button onClick={e => { e.stopPropagation(); const u = collections.filter(c => c.id !== coll.id); setCollections(u); saveCollections(u); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-text3 hover:text-red hover:bg-bg3 opacity-0 group-hover:opacity-100">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setSelectedColl(null)} className="flex items-center gap-1.5 text-sm text-text3 hover:text-text mb-4"><ChevronLeft size={15} /> Voltar</button>
                <h2 className="font-rajdhani font-bold text-xl text-text mb-4">🗂️ {selectedColl.name}</h2>
                {collArtworks.length === 0 ? (
                  <div className="text-center py-10 bg-bg2 border border-border rounded-2xl text-text3 text-sm">Coleção vazia. Adiciona fan arts usando o ícone 🗂️ em cada obra.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {collArtworks.map(art => (
                      <ArtCard key={art.id} art={art}
                        onReact={emoji => handleReact(art, emoji)}
                        onDelete={() => {
                          const u = collections.map(c => c.id === selectedColl.id ? { ...c, artIds: c.artIds.filter(id => id !== art.id) } : c);
                          setCollections(u); saveCollections(u);
                          setSelectedColl(u.find(c => c.id === selectedColl.id) || null);
                        }}
                        onEdit={() => setEditArt(art)}
                        onOpenLightbox={() => setLightboxArt(art)}
                        onAddToCollection={() => setAddToCollArt(art)}
                        isOwn={art.user_id === user?.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxArt && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={() => setLightboxArt(null)}>
          <button onClick={() => setLightboxArt(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X size={20} /></button>
          <div onClick={e => e.stopPropagation()} className="flex flex-col items-center gap-4 max-w-2xl w-full">
            <img src={lightboxArt.image_url} alt={lightboxArt.title} className="max-h-[75vh] max-w-full object-contain rounded-xl" />
            <div className="flex items-center gap-2">
              {ANIME_REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => handleReact(lightboxArt, emoji)} title={REACTION_LABELS[emoji]}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:scale-110 transition-all ${lightboxArt.my_reaction === emoji ? 'bg-purple/30 ring-1 ring-purple/50' : 'bg-white/10 hover:bg-white/20'}`}>
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-white text-sm font-semibold">{lightboxArt.title} · {lightboxArt.likes_count} reacções</p>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-rajdhani font-bold text-lg text-text">Publicar Fan Art</h2>
              <button onClick={() => setShowUpload(false)}><X size={18} className="text-text3" /></button>
            </div>
            <div className="space-y-3">
              <input value={newArt.title} onChange={e => setNewArt(p => ({ ...p, title: e.target.value }))} placeholder="Título da arte *" className="input w-full text-sm" maxLength={80} />
              <textarea value={newArt.description} onChange={e => setNewArt(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)" className="input w-full text-sm resize-none min-h-[70px]" maxLength={300} />
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-border hover:border-purple/50 transition-colors disabled:opacity-50">
                {uploading ? (
                  <><Loader2 size={22} className="animate-spin text-text3" /><span className="text-sm text-text3">A comprimir e carregar...</span></>
                ) : newArt.image_url ? (
                  <img src={newArt.image_url} alt="Preview" className="max-h-[140px] rounded-lg object-contain" />
                ) : (
                  <><Image size={28} className="text-text3" /><span className="text-sm text-text3">Clica para seleccionar imagem</span><span className="text-xs text-text3/60">PNG, JPG, WebP · máx 15MB</span></>
                )}
              </button>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowUpload(false)} className="btn btn-ghost flex-1 text-sm">Cancelar</button>
                <button onClick={handleSubmit} disabled={submitting || uploading || !newArt.image_url} className="btn btn-primary flex-1 text-sm disabled:opacity-50">
                  {submitting ? 'Publicando...' : '🎨 Publicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editArt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setEditArt(null)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-rajdhani font-bold text-lg text-text">Editar Fan Art</h2>
              <button onClick={() => setEditArt(null)}><X size={18} className="text-text3" /></button>
            </div>
            <div className="space-y-3">
              <input value={editArt.title} onChange={e => setEditArt(p => p ? { ...p, title: e.target.value } : null)} placeholder="Título" className="input w-full text-sm" />
              <textarea value={editArt.description || ''} onChange={e => setEditArt(p => p ? { ...p, description: e.target.value } : null)} placeholder="Descrição" className="input w-full text-sm resize-none min-h-[70px]" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditArt(null)} className="btn btn-ghost flex-1 text-sm">Cancelar</button>
                <button onClick={handleEdit} className="btn btn-primary flex-1 text-sm">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to collection modal */}
      {addToCollArt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setAddToCollArt(null)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-rajdhani font-bold text-base text-text">Adicionar à Coleção</h2>
              <button onClick={() => setAddToCollArt(null)}><X size={16} className="text-text3" /></button>
            </div>
            {collections.length === 0 ? (
              <p className="text-text3 text-sm text-center py-4">Cria uma coleção primeiro no separador Coleções.</p>
            ) : (
              <div className="space-y-2">
                {collections.map(coll => (
                  <button key={coll.id} onClick={() => addArtToCollection(coll, addToCollArt.id)}
                    className="w-full flex items-center gap-3 bg-bg3 rounded-xl p-3 hover:bg-bg4 transition-colors text-left">
                    <span className="text-lg">🗂️</span>
                    <div className="flex-1 min-w-0"><div className="font-semibold text-text text-sm truncate">{coll.name}</div><div className="text-xs text-text3">{coll.artIds.length} obras</div></div>
                    {coll.artIds.includes(addToCollArt.id) && <span className="text-xs text-teal">✓</span>}
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
