import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, Video,
  Send, X, Trash2, Edit3, Loader2, Clock, Maximize2, Globe, Users,
  CheckCircle2, ArrowUp, Sparkles, Play
} from 'lucide-react';
import { CLASS_INFO, type CharacterClass } from '../types/index';
import StoriesBar from '../components/StoriesBar';
import GuestCTA from '../components/GuestCTA';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_type: 'none' | 'image' | 'video' | 'audio' | 'file';
  media_url: string | null;
  media_thumbnail: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profiles: {
    id?: string;
    username: string;
    province?: string;
    is_verified?: boolean;
    avatar_url?: string;
    title?: string;
    title_color?: string;
  };
  characters?: { name: string; class: CharacterClass; level?: number };
  liked_by_me?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 30) return 'agora';
  if (s < 60) return `${s}s`;
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' });
}

function getClassColor(cls?: CharacterClass): string {
  if (!cls) return '#8b5cf6';
  const info = CLASS_INFO[cls];
  return (info as any)?.color || '#8b5cf6';
}

// ─── Media Lightbox ───────────────────────────────────────────────────────────

function MediaLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
        <X size={20} />
      </button>
      <img
        src={url} alt=""
        className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile, character, size = 11 }: {
  profile: Post['profiles'];
  character?: Post['characters'];
  size?: number;
}) {
  const color = getClassColor(character?.class);
  const dim = `w-${size} h-${size}`;
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center text-sm font-bold font-rajdhani flex-shrink-0 overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${color}33, ${color}55)`,
        border: `2px solid ${color}44`,
        color,
      }}
    >
      {profile.avatar_url
        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        : <span>{profile.username?.charAt(0)?.toUpperCase() || '?'}</span>
      }
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="bg-bg2 border border-border rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-bg3" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-bg3 rounded w-32" />
          <div className="h-2.5 bg-bg3 rounded w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-bg3 rounded w-full" />
        <div className="h-3 bg-bg3 rounded w-4/5" />
        <div className="h-3 bg-bg3 rounded w-3/5" />
      </div>
      <div className="h-px bg-border" />
      <div className="flex gap-4">
        <div className="h-3 bg-bg3 rounded w-16" />
        <div className="h-3 bg-bg3 rounded w-16" />
        <div className="h-3 bg-bg3 rounded w-16" />
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

const PostCard = memo(function PostCard({
  post,
  currentUser,
  currentProfile,
  onDelete,
  onUpdate,
  showToast,
}: {
  post: Post;
  currentUser: any;
  currentProfile: any;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  showToast: (msg: string, type: any) => void;
}) {
  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Realtime comments
  useEffect(() => {
    if (!showComments) {
      if (commentChannelRef.current) { supabase.removeChannel(commentChannelRef.current); commentChannelRef.current = null; }
      return;
    }
    if (!commentsLoaded) loadComments();

    const ch = supabase.channel(`post_comments_${post.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${post.id}` },
        async (payload) => {
          const { data: prof } = await supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.user_id).maybeSingle();
          const nc: Comment = { ...payload.new as any, profiles: prof || { username: 'Unknown' } };
          setComments(prev => prev.some(c => c.id === nc.id) ? prev : [...prev, nc]);
          setCommentsCount(prev => prev + 1);
        }
      ).subscribe();
    commentChannelRef.current = ch;

    return () => { if (commentChannelRef.current) { supabase.removeChannel(commentChannelRef.current); commentChannelRef.current = null; } };
  }, [showComments, post.id]);

  async function loadComments() {
    const { data } = await supabase
      .from('post_comments')
      .select('id, content, created_at, user_id, profiles(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    setComments((data || []) as unknown as Comment[]);
    setCommentsLoaded(true);
  }

  async function handleLike() {
    if (!currentUser) { showToast('Entra para curtir', 'info'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? Math.max(prev - 1, 0) : prev + 1);
    if (!wasLiked) { setLikeAnim(true); setTimeout(() => setLikeAnim(false), 500); }
    try {
      if (wasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUser.id);
        await supabase.from('posts').update({ likes_count: Math.max(likesCount - 1, 0) }).eq('id', post.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUser.id });
        await supabase.from('posts').update({ likes_count: likesCount + 1 }).eq('id', post.id);
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : Math.max(prev - 1, 0));
    }
  }

  async function handleAddComment() {
    if (!currentUser || !newComment.trim() || sendingComment) return;
    setSendingComment(true);
    const content = newComment.trim();
    const tempId = `temp_${Date.now()}`;
    const tempComment: Comment = {
      id: tempId, content, created_at: new Date().toISOString(), user_id: currentUser.id,
      profiles: { username: currentProfile?.username || 'Tu', avatar_url: currentProfile?.avatar_url }
    };
    setComments(prev => [...prev, tempComment]);
    setCommentsCount(prev => prev + 1);
    setNewComment('');

    try {
      const { data: ins } = await supabase.from('post_comments')
        .insert({ post_id: post.id, user_id: currentUser.id, content })
        .select('id').maybeSingle();
      if (ins) setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: ins.id } : c));
      await supabase.from('posts').update({ comments_count: commentsCount + 1 }).eq('id', post.id);
      await supabase.from('profiles').update({ total_xp: (currentProfile?.total_xp || 0) + 5 }).eq('id', currentUser.id);
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId));
      setCommentsCount(prev => Math.max(prev - 1, 0));
      setNewComment(content);
      showToast('Erro ao comentar', 'error');
    } finally {
      setSendingComment(false);
    }
  }

  async function handleShare() {
    const text = post.content.slice(0, 120);
    const url = `${window.location.origin}/feed`;
    if (navigator.share) {
      try { await navigator.share({ title: `@${post.profiles.username} no OtakuKamba`, text, url }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(`${text}\n${url}`); showToast('Link copiado!', 'success'); } catch { showToast('Erro ao copiar', 'error'); }
    }
  }

  async function handleDelete() {
    if (!confirm('Apagar esta publicação?')) return;
    try {
      await supabase.from('posts').delete().eq('id', post.id).eq('user_id', currentUser.id);
      onDelete(post.id);
    } catch { showToast('Erro ao apagar', 'error'); }
  }

  async function handleEdit() {
    if (!editContent.trim()) return;
    try {
      await supabase.from('posts').update({ content: editContent.trim() }).eq('id', post.id).eq('user_id', currentUser.id);
      onUpdate(post.id, editContent.trim());
      setEditing(false);
    } catch { showToast('Erro ao editar', 'error'); }
  }

  const classInfo = post.characters?.class ? CLASS_INFO[post.characters.class as CharacterClass] : null;
  const color = getClassColor(post.characters?.class);
  const isOwner = currentUser?.id === post.user_id;

  return (
    <>
      <article className="bg-bg2 border border-border rounded-2xl overflow-hidden hover:border-border2 transition-all duration-200 group">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 p-4">
          <Link to={`/perfil/${post.profiles.username}`}>
            <Avatar profile={post.profiles} character={post.characters} size={11} />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/perfil/${post.profiles.username}`} className="font-rajdhani font-bold text-text hover:text-purple2 transition-colors">
                {post.profiles.username}
              </Link>
              {post.profiles.is_verified && <CheckCircle2 size={13} className="text-teal flex-shrink-0" />}
              {post.profiles.title && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full border"
                  style={{ color: post.profiles.title_color || '#8b5cf6', borderColor: `${post.profiles.title_color || '#8b5cf6'}44`, background: `${post.profiles.title_color || '#8b5cf6'}11` }}>
                  {post.profiles.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text3 flex-wrap mt-0.5">
              {classInfo && (
                <span className="flex items-center gap-1">
                  <span>{(classInfo as any).emoji}</span>
                  <span>{post.characters?.name}</span>
                  {post.characters?.level && <span className="text-purple2">Lv.{post.characters.level}</span>}
                  <span className="text-border2">·</span>
                </span>
              )}
              {post.profiles.province && <><span>📍 {post.profiles.province}</span><span className="text-border2">·</span></>}
              <span className="flex items-center gap-1"><Clock size={10} /> {formatTimestamp(post.created_at)}</span>
            </div>
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors opacity-0 group-hover:opacity-100">
              <MoreHorizontal size={17} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-bg3 border border-border rounded-xl shadow-2xl z-20 w-44 py-1 overflow-hidden">
                {isOwner && (
                  <>
                    <button onClick={() => { setEditing(true); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-bg4 flex items-center gap-2.5 transition-colors">
                      <Edit3 size={13} className="text-purple2" /> Editar
                    </button>
                    <button onClick={() => { handleDelete(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-red hover:bg-bg4 flex items-center gap-2.5 transition-colors">
                      <Trash2 size={13} /> Apagar
                    </button>
                    <div className="border-t border-border my-1" />
                  </>
                )}
                <button onClick={() => { handleShare(); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-bg4 flex items-center gap-2.5 transition-colors">
                  <Share2 size={13} className="text-teal" /> Partilhar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="px-4 pb-3">
          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="input w-full min-h-[80px] py-2.5 resize-none text-sm"
                autoFocus
                maxLength={1000}
              />
              <div className="flex gap-2">
                <button onClick={handleEdit} className="btn btn-primary text-sm py-1.5 px-4">Guardar</button>
                <button onClick={() => { setEditing(false); setEditContent(post.content); }} className="btn btn-ghost text-sm py-1.5 px-4">Cancelar</button>
              </div>
            </div>
          ) : (
            <p className="text-text2 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
          )}
        </div>

        {/* ── Media ── */}
        {post.media_url && post.media_type === 'image' && (
          <div className="relative cursor-zoom-in group/img" onClick={() => setLightboxUrl(post.media_url)}>
            <img src={post.media_url} alt="" className="w-full max-h-[500px] object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                <Maximize2 size={18} className="text-white" />
              </div>
            </div>
          </div>
        )}
        {post.media_url && post.media_type === 'video' && (
          <div className="relative bg-black group/vid">
            <video
              ref={videoRef}
              src={post.media_url}
              poster={post.media_thumbnail || undefined}
              controls
              className="w-full max-h-[480px]"
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
            />
            {!videoPlaying && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => videoRef.current?.play()}
              >
                <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors">
                  <Play size={28} className="text-white ml-1" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Stats bar ── */}
        {(likesCount > 0 || commentsCount > 0) && (
          <div className="px-4 py-2 flex items-center justify-between text-xs text-text3 border-t border-border">
            {likesCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-red/40 to-red/20 flex items-center justify-center text-[10px]">❤️</span>
                {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
              </span>
            ) : <span />}
            {commentsCount > 0 && (
              <button onClick={() => { setShowComments(true); if (!commentsLoaded) loadComments(); }} className="hover:text-text transition-colors">
                {commentsCount} {commentsCount === 1 ? 'comentário' : 'comentários'}
              </button>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center border-t border-border">
          {[
            {
              onClick: handleLike,
              icon: <Heart size={16} fill={liked ? 'currentColor' : 'none'} className={`transition-transform duration-300 ${likeAnim ? 'scale-150' : 'scale-100'}`} />,
              label: 'Curtir',
              active: liked,
              activeColor: 'text-red hover:bg-red/5',
              inactiveColor: 'text-text3 hover:text-red hover:bg-bg3',
            },
            {
              onClick: () => { setShowComments(!showComments); if (!commentsLoaded && !showComments) loadComments(); },
              icon: <MessageCircle size={16} />,
              label: 'Comentar',
              active: showComments,
              activeColor: 'text-teal',
              inactiveColor: 'text-text3 hover:text-teal hover:bg-bg3',
            },
            {
              onClick: handleShare,
              icon: <Share2 size={16} />,
              label: 'Partilhar',
              active: false,
              activeColor: '',
              inactiveColor: 'text-text3 hover:text-purple2 hover:bg-bg3',
            },
          ].map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${action.active ? action.activeColor : action.inactiveColor}`}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>

        {/* ── Comments ── */}
        {showComments && (
          <div className="border-t border-border bg-bg/50">
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {!commentsLoaded ? (
                <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-text3" /></div>
              ) : comments.length === 0 ? (
                <p className="text-center text-xs text-text3 py-3">Sem comentários ainda. Sê o primeiro! 💬</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-2.5 group/comment">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, #8b5cf633, #ef444433)`, border: '1.5px solid #8b5cf622' }}>
                      {c.profiles?.avatar_url
                        ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-purple2">{c.profiles?.username?.charAt(0)?.toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 bg-bg2 rounded-xl px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-text text-xs">{c.profiles?.username}</span>
                        <span className="text-text3 text-[10px]">{formatTimestamp(c.created_at)}</span>
                      </div>
                      <p className="text-text2 leading-relaxed text-xs">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {currentUser ? (
              <div className="px-4 pb-4 flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, #8b5cf633, #ef444433)`, border: '1.5px solid #8b5cf622' }}>
                  <span className="w-full h-full flex items-center justify-center text-xs font-bold text-purple2">{currentProfile?.username?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    placeholder="Escreve um comentário..."
                    className="input flex-1 text-sm py-2"
                    disabled={sendingComment}
                    maxLength={500}
                  />
                  <button onClick={handleAddComment} disabled={!newComment.trim() || sendingComment} className="btn btn-primary py-2 px-3 disabled:opacity-50">
                    {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4">
                <Link to="/login" className="text-xs text-purple2 hover:underline font-medium">Entra para comentar →</Link>
              </div>
            )}
          </div>
        )}
      </article>

      {lightboxUrl && <MediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  );
});

// ─── Post Composer ────────────────────────────────────────────────────────────

function PostComposer({ currentUser, currentProfile, onPosted, showToast }: {
  currentUser: any;
  currentProfile: any;
  onPosted: (post: Post) => void;
  showToast: (msg: string, type: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX = 1000;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 50 * 1024 * 1024) { showToast('Ficheiro muito grande (máx 50MB)', 'error'); return; }
    const ext = file.name.split('.').pop();
    const path = `posts/${currentUser.id}/${Date.now()}.${ext}`;
    setUploading(true);
    try {
      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      setMediaUrl(publicUrl);
      showToast('Media carregada! ✓', 'success');
    } catch { showToast('Erro no upload', 'error'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !content.trim() || posting) return;
    setPosting(true);
    const postContent = content.trim();

    const tempPost: Post = {
      id: `temp_${Date.now()}`,
      user_id: currentUser.id,
      content: postContent,
      media_type: mediaUrl ? mediaType : 'none',
      media_url: mediaUrl,
      media_thumbnail: null,
      likes_count: 0, comments_count: 0, shares_count: 0,
      created_at: new Date().toISOString(),
      profiles: {
        id: currentUser.id,
        username: currentProfile?.username || 'Tu',
        province: currentProfile?.province,
        is_verified: currentProfile?.is_verified,
        avatar_url: currentProfile?.avatar_url,
        title: currentProfile?.title,
        title_color: currentProfile?.title_color,
      },
      liked_by_me: false,
    };

    onPosted(tempPost);
    setContent('');
    setMediaUrl(null);
    setMediaType('none');
    setExpanded(false);

    try {
      const { data: ins, error } = await supabase.from('posts').insert({
        user_id: currentUser.id, content: postContent,
        media_type: tempPost.media_type, media_url: tempPost.media_url,
      }).select('id').maybeSingle();
      if (error) throw error;
      if (ins) onPosted({ ...tempPost, id: ins.id });
      await supabase.from('profiles').update({ total_xp: (currentProfile?.total_xp || 0) + 10 }).eq('id', currentUser.id);
      showToast('Publicado! +10 XP 🎉', 'success');
    } catch {
      showToast('Erro ao publicar', 'error');
    } finally { setPosting(false); }
  }

  if (!currentUser) return null;

  return (
    <div className="bg-bg2 border border-border rounded-2xl overflow-hidden transition-all duration-200">
      <div className="flex items-center gap-3 p-4">
        <Avatar profile={{ username: currentProfile?.username || '?', avatar_url: currentProfile?.avatar_url }} size={10} />
        <button
          onClick={() => setExpanded(true)}
          className={`flex-1 text-left px-4 py-2.5 rounded-xl bg-bg3 border border-border text-text3 text-sm hover:border-border2 transition-colors ${expanded ? 'hidden' : 'block'}`}
        >
          O que estás a pensar, {currentProfile?.username?.split(' ')[0] || 'kamba'}? ✍️
        </button>
        {expanded && (
          <div className="flex-1 text-sm font-medium text-text">Nova publicação</div>
        )}
        {expanded && (
          <button onClick={() => { setExpanded(false); setContent(''); setMediaUrl(null); }} className="text-text3 hover:text-text transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {expanded && (
        <form onSubmit={handlePost} className="px-4 pb-4 space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX))}
            placeholder="Partilha o que estás a pensar, um anime que estás a ver, uma opinião quente... 🔥"
            className="input w-full min-h-[120px] py-3 resize-none text-sm"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs text-text3">
            <div className="flex gap-2">
              <button type="button" onClick={() => { setMediaType('image'); fileRef.current?.click(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${mediaType === 'image' && mediaUrl ? 'border-purple2 text-purple2 bg-purple2/10' : 'border-border text-text3 hover:border-border2 hover:text-text'}`}>
                <ImageIcon size={13} /> {uploading ? 'A carregar...' : 'Foto'}
              </button>
              <button type="button" onClick={() => { setMediaType('video'); fileRef.current?.click(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${mediaType === 'video' && mediaUrl ? 'border-teal text-teal bg-teal/10' : 'border-border text-text3 hover:border-border2 hover:text-text'}`}>
                <Video size={13} /> Vídeo
              </button>
            </div>
            <span className={content.length > MAX * 0.9 ? 'text-amber' : ''}>{content.length}/{MAX}</span>
          </div>

          {mediaUrl && (
            <div className="relative rounded-xl overflow-hidden">
              {mediaType === 'image'
                ? <img src={mediaUrl} alt="" className="w-full max-h-48 object-cover" />
                : <video src={mediaUrl} className="w-full max-h-48" />
              }
              <button type="button" onClick={() => setMediaUrl(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setExpanded(false); setContent(''); setMediaUrl(null); }} className="btn btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
            <button type="submit" disabled={posting || !content.trim() || uploading} className="btn btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {posting ? <><Loader2 size={14} className="animate-spin mr-2" />A publicar...</> : <><Sparkles size={14} className="mr-2" />Publicar</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [pendingCount, setPendingCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<Post[]>([]);
  const LIMIT = 10;

  postsRef.current = posts;

  // Load posts
  const loadPosts = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); }

    try {
      let followingIds: string[] = [];
      if (user && feedType === 'following') {
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        followingIds = [...(data || []).map(f => f.following_id), user.id];
      }

      const offset = append ? postsRef.current.length : 0;
      let q = supabase.from('posts')
        .select('id, user_id, content, media_type, media_url, media_thumbnail, likes_count, comments_count, shares_count, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + LIMIT - 1);

      if (user && feedType === 'following' && followingIds.length > 0) q = q.in('user_id', followingIds);

      const { data: postsData } = await q;
      if (!postsData) return;
      setHasMore(postsData.length === LIMIT);

      const uids = [...new Set(postsData.map(p => p.user_id))];
      if (uids.length === 0) { if (!append) setPosts([]); return; }

      const [profsRes, charsRes, likesRes] = await Promise.all([
        supabase.from('profiles').select('id, username, province, is_verified, avatar_url, title, title_color').in('id', uids),
        supabase.from('characters').select('user_id, name, class, level').in('user_id', uids),
        user ? supabase.from('post_likes').select('post_id').eq('user_id', user.id) : { data: [] },
      ]);

      const likedIds = new Set((likesRes.data || []).map((l: any) => l.post_id));

      const formatted: Post[] = postsData.map(post => ({
        ...post,
        profiles: profsRes.data?.find(p => p.id === post.user_id) || { username: 'Unknown' },
        characters: charsRes.data?.find(c => c.user_id === post.user_id),
        liked_by_me: likedIds.has(post.id),
      }));

      if (append) setPosts(prev => [...prev, ...formatted]);
      else setPosts(formatted);
    } catch (e) {
      console.error('Feed error:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedType, user?.id]);

  useEffect(() => { loadPosts(false); }, [loadPosts]);

  // Realtime — new posts notification
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel('feed_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        if (user && (payload.new as any).user_id === user.id) return; // already added optimistically
        setPendingCount(prev => prev + 1);
      })
      .subscribe();

    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.id]);

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadPosts(true);
    }, { threshold: 0.1 });
    if (loadMoreRef.current) obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, loadPosts]);

  function handleNewPost(post: Post) {
    setPosts(prev => {
      const filtered = prev.filter(p => p.id !== post.id && !p.id.startsWith('temp_'));
      return [post, ...filtered];
    });
  }

  function handleDeletePost(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
    showToast('Publicação apagada', 'success');
  }

  function handleUpdatePost(id: string, content: string) {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content } : p));
  }

  async function loadNewPosts() {
    setPendingCount(0);
    await loadPosts(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-bebas text-3xl tracking-wide text-text">Feed</h1>
          <div className="flex items-center gap-1 bg-bg2 border border-border rounded-xl p-1">
            <button onClick={() => setFeedType('all')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${feedType === 'all' ? 'bg-purple/20 text-purple2 border border-purple/30' : 'text-text3 hover:text-text'}`}>
              <Globe size={12} /> Todos
            </button>
            <button onClick={() => setFeedType('following')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${feedType === 'following' ? 'bg-purple/20 text-purple2 border border-purple/30' : 'text-text3 hover:text-text'}`}>
              <Users size={12} /> Seguidos
            </button>
          </div>
        </div>

        {/* Stories */}
        <StoriesBar />

        {/* Composer */}
        {user && (
          <PostComposer
            currentUser={user}
            currentProfile={profile}
            onPosted={handleNewPost}
            showToast={showToast}
          />
        )}

        {/* New posts banner */}
        {pendingCount > 0 && (
          <button onClick={loadNewPosts} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple/10 border border-purple/30 rounded-xl text-purple2 text-sm font-semibold hover:bg-purple/20 transition-all animate-pulse">
            <ArrowUp size={15} />
            {pendingCount} {pendingCount === 1 ? 'nova publicação' : 'novas publicações'} — ver
          </button>
        )}

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          !user ? (
            <GuestCTA title="Conteúdo Exclusivo" message="Faz login ou cria a tua conta para ver o feed, interagir com os Kambas e criar o teu personagem." />
          ) : (
            <div className="text-center py-16 bg-bg2 border border-border rounded-2xl">
              <div className="text-5xl mb-4">📰</div>
              <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Feed vazio</h3>
              <p className="text-text3 text-sm mb-4">
                {feedType === 'following' ? 'Segue outros Kambas para ver as publicações deles!' : 'Sê o primeiro a publicar algo!'}
              </p>
              {feedType === 'following' && (
                <button onClick={() => setFeedType('all')} className="btn btn-ghost text-sm">
                  Ver todas as publicações
                </button>
              )}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                currentProfile={profile}
                onDelete={handleDeletePost}
                onUpdate={handleUpdatePost}
                showToast={showToast}
              />
            ))}

            {/* Infinite scroll trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {loadingMore && (
                <div className="flex items-center gap-2 text-text3 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  A carregar mais...
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-text3 text-xs py-2">— Chegaste ao fim do feed —</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
