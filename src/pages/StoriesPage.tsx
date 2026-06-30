import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Plus, X, Eye, Clock, ChevronLeft, ChevronRight, Send, Trash2, Image as ImageIcon, Video, Pause, Play } from 'lucide-react';
import { CLASS_INFO, type CharacterClass } from '../types/index';
import { prepareMediaForUpload } from '../lib/imageCompress';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  views_count: number;
  created_at: string;
  expires_at: string;
  profiles: { username: string; avatar_url?: string };
  characters?: { name: string; class: CharacterClass; level?: number };
  viewed_by_me?: boolean;
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url?: string;
  character_class?: CharacterClass;
  character_name?: string;
  stories: Story[];
  has_unviewed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  return `${h}h`;
}

function getClassColor(cls?: CharacterClass): string {
  if (!cls || !CLASS_INFO[cls]) return '#8b5cf6';
  return (CLASS_INFO[cls] as any)?.color || '#8b5cf6';
}

function getClassEmoji(cls?: CharacterClass): string {
  if (!cls || !CLASS_INFO[cls]) return '⚔️';
  return (CLASS_INFO[cls] as any)?.emoji || '⚔️';
}

// ─── Story Ring ───────────────────────────────────────────────────────────────

function StoryRing({ color, unviewed, size = 68 }: { color: string; unviewed: boolean; size?: number }) {
  const r = size / 2;
  const strokeW = 2.5;
  const radius = r - strokeW;
  const circum = 2 * Math.PI * radius;

  return (
    <svg width={size} height={size} className="absolute inset-0 pointer-events-none"
      style={{ filter: unviewed ? `drop-shadow(0 0 6px ${color}88)` : 'none' }}>
      <circle cx={r} cy={r} r={radius} fill="none"
        stroke={unviewed ? color : 'rgba(255,255,255,0.15)'}
        strokeWidth={strokeW}
        strokeDasharray={unviewed ? `${circum * 0.85} ${circum * 0.15}` : `${circum}`}
        strokeDashoffset={circum * 0.1}
        strokeLinecap="round"
        transform={`rotate(-90 ${r} ${r})`}
      />
    </svg>
  );
}

// ─── Story Card (grid) ────────────────────────────────────────────────────────

function StoryCard({ group, onClick }: { group: StoryGroup; onClick: () => void }) {
  const color = getClassColor(group.character_class);
  const emoji = getClassEmoji(group.character_class);
  const preview = group.stories[0];

  return (
    <button
      onClick={onClick}
      className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-bg3 group transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl focus:outline-none"
      style={{ boxShadow: group.has_unviewed ? `0 0 0 2px ${color}` : '0 0 0 1px var(--color-border)' }}
    >
      {/* Background media */}
      {preview && (
        preview.media_type === 'image'
          ? <img src={preview.thumbnail_url || preview.media_url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          : <video src={preview.media_url} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

      {/* Top: class emoji + unviewed dot */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
        <span className="text-base drop-shadow-lg">{emoji}</span>
        {group.has_unviewed && (
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        )}
      </div>

      {/* Multiple stories indicator */}
      {group.stories.length > 1 && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {group.stories.slice(0, 5).map((s, i) => (
            <div key={s.id} className="h-0.5 w-4 rounded-full" style={{ background: s.viewed_by_me ? 'rgba(255,255,255,0.4)' : color }} />
          ))}
        </div>
      )}

      {/* Bottom: user info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${color}55, ${color}99)`, border: `1.5px solid ${color}` }}>
            {group.avatar_url
              ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span style={{ color }}>{group.username.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="text-left min-w-0">
            <div className="text-white text-xs font-semibold font-rajdhani truncate">{group.username}</div>
            <div className="text-white/60 text-[10px]">{group.stories.length} momento{group.stories.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Story Viewer ─────────────────────────────────────────────────────────────

function StoryViewer({
  groups, initialGroupIndex, currentUser, currentProfile,
  onClose, onStoriesUpdated
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  currentUser: any;
  currentProfile: any;
  onClose: () => void;
  onStoriesUpdated: () => void;
}) {
  const { showToast } = useToast();
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [reactionAnim, setReactionAnim] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const color = getClassColor(group?.character_class);
  const isOwn = currentUser?.id === group?.user_id;

  const REACTIONS = ['❤️', '🔥', '😮', '🫡', '⚔️', '👊'];
  const DURATION = story?.media_type === 'video' ? 15000 : 5000;

  // Mark as viewed
  useEffect(() => {
    if (!story || !currentUser || story.viewed_by_me) return;
    supabase.from('story_views').insert({ story_id: story.id, user_id: currentUser.id }).then(() => {});
  }, [story?.id]);

  // Progress timer
  useEffect(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    if (paused || !story) return;

    const interval = 50;
    const inc = (interval / DURATION) * 100;

    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { advance(); return 0; }
        return prev + inc;
      });
    }, interval);

    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [groupIdx, storyIdx, paused]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'ArrowLeft') goBack();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [groupIdx, storyIdx]);

  function advance() {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }

  function goBack() {
    if (storyIdx > 0) { setStoryIdx(i => i - 1); setProgress(0); }
    else if (groupIdx > 0) { setGroupIdx(i => i - 1); setStoryIdx(0); setProgress(0); }
  }

  function handleHoldStart() {
    holdTimer.current = setTimeout(() => setPaused(true), 100);
  }
  function handleHoldEnd() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setPaused(false);
  }

  function handleTap(e: React.MouseEvent) {
    const x = e.clientX;
    const w = (e.currentTarget as HTMLElement).offsetWidth;
    if (x < w * 0.35) goBack();
    else advance();
  }

  function sendReaction(emoji: string) {
    setReaction(emoji);
    setReactionAnim(true);
    setTimeout(() => setReactionAnim(false), 800);
    // Send as private message
    if (currentUser && !isOwn) {
      supabase.from('private_chats')
        .select('id').or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .then(() => { /* could open DM with reaction */ });
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !currentUser || !story || isOwn) return;
    setSending(true);
    try {
      // Find or create private chat
      let chatId: string | null = null;
      const { data: existing } = await supabase.from('private_chats')
        .select('id')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${group.user_id}),and(user1_id.eq.${group.user_id},user2_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (existing) {
        chatId = existing.id;
      } else {
        const { data: newChat } = await supabase.from('private_chats')
          .insert({ user1_id: currentUser.id, user2_id: group.user_id })
          .select('id').maybeSingle();
        chatId = newChat?.id || null;
      }

      if (chatId) {
        await supabase.from('private_messages').insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: `💬 Respondeu ao teu momento: "${reply.trim()}"`,
        });
        showToast('Resposta enviada! 📨', 'success');
        setReply('');
      }
    } catch { showToast('Erro ao enviar', 'error'); }
    finally { setSending(false); }
  }

  async function handleDelete() {
    if (!isOwn || !story) return;
    if (!confirm('Apagar este momento?')) return;
    try {
      await supabase.from('stories').delete().eq('id', story.id);
      showToast('Momento apagado', 'success');
      onStoriesUpdated();
      if (group.stories.length === 1) {
        if (groupIdx < groups.length - 1) { setGroupIdx(i => i + 1); setStoryIdx(0); }
        else onClose();
      } else {
        advance();
      }
    } catch { showToast('Erro ao apagar', 'error'); }
  }

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">

      {/* Prev group button */}
      {groupIdx > 0 && (
        <button onClick={() => { setGroupIdx(i => i - 1); setStoryIdx(0); setProgress(0); }}
          className="absolute left-4 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Story panel */}
      <div className="relative w-full max-w-[380px] mx-auto">

        {/* Main card */}
        <div className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl"
          style={{ boxShadow: `0 0 60px ${color}33, 0 25px 60px rgba(0,0,0,0.7)` }}>

          {/* Progress bars */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {group.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full transition-none"
                  style={{
                    width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                    background: i <= storyIdx ? color : 'transparent',
                    boxShadow: i === storyIdx ? `0 0 6px ${color}` : 'none',
                  }} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-3 right-3 flex items-center gap-2.5 z-20">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}44, ${color}88)`, border: `2px solid ${color}` }}>
              {group.avatar_url
                ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span style={{ color }}>{group.username.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold font-rajdhani">{group.username}</div>
              <div className="flex items-center gap-1.5 text-white/60 text-[11px]">
                {group.character_class && <span>{getClassEmoji(group.character_class)}</span>}
                {group.character_name && <span>{group.character_name}</span>}
                <span>·</span>
                <Clock size={9} />
                <span>{timeAgo(story.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPaused(p => !p)} className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              {isOwn && (
                <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-red transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Media — tap zones */}
          <div className="absolute inset-0 cursor-pointer select-none"
            onClick={handleTap}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
          >
            {story.media_type === 'image'
              ? <img src={story.media_url} alt="" className="w-full h-full object-contain bg-black" draggable={false} />
              : <video ref={videoRef} src={story.media_url} autoPlay muted={false} playsInline
                  className="w-full h-full object-contain bg-black"
                  onEnded={advance} />
            }
          </div>

          {/* Tap hint overlay (invisible, just for UX) */}
          <div className="absolute inset-0 flex pointer-events-none z-10">
            <div className="flex-[35]" />
            <div className="flex-[30]" />
            <div className="flex-[35]" />
          </div>

          {/* Reaction float animation */}
          {reactionAnim && reaction && (
            <div className="absolute left-1/2 bottom-32 -translate-x-1/2 z-30 pointer-events-none animate-bounce text-5xl"
              style={{ filter: `drop-shadow(0 0 12px ${color})` }}>
              {reaction}
            </div>
          )}

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 px-3 pb-3">

              {/* Views + story index */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                  <Eye size={13} />
                  <span>{story.views_count} visualizações</span>
                </div>
                <span className="text-white/50 text-xs">
                  {storyIdx + 1}/{group.stories.length}
                </span>
              </div>

              {/* Reactions */}
              <div className="flex items-center gap-2 mb-3">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); sendReaction(emoji); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all hover:scale-125 active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply input */}
              {currentUser && !isOwn && (
                <form onSubmit={handleReply} className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onFocus={() => setPaused(true)}
                    onBlur={() => setPaused(false)}
                    placeholder={`Responder a ${group.username}...`}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 backdrop-blur-sm"
                    maxLength={200}
                  />
                  <button type="submit" disabled={!reply.trim() || sending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                    style={{ background: color }}>
                    {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={15} className="text-white" />}
                  </button>
                </form>
              )}

              {isOwn && (
                <div className="flex items-center justify-center gap-2 text-white/50 text-xs py-1">
                  <Eye size={12} /> <span>Só tu vês os dados do teu momento</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnails strip (other groups) */}
        {groups.length > 1 && (
          <div className="flex gap-2 mt-3 justify-center">
            {groups.map((g, i) => {
              const c = getClassColor(g.character_class);
              return (
                <button key={g.user_id} onClick={() => { setGroupIdx(i); setStoryIdx(0); setProgress(0); }}
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 transition-all"
                  style={{ border: `2px solid ${i === groupIdx ? c : 'rgba(255,255,255,0.2)'}`, opacity: i === groupIdx ? 1 : 0.5 }}>
                  {g.avatar_url
                    ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: `${c}44`, color: c }}>{g.username.charAt(0).toUpperCase()}</div>
                  }
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Next group button */}
      {groupIdx < groups.length - 1 && (
        <button onClick={() => { setGroupIdx(i => i + 1); setStoryIdx(0); setProgress(0); }}
          className="absolute right-4 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}

// ─── Create Story Modal ───────────────────────────────────────────────────────

function CreateStoryModal({ currentUser, onClose, onCreated }: {
  currentUser: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 50 * 1024 * 1024) { showToast('Ficheiro muito grande (máx 50MB)', 'error'); return; }
    const type = file.type.startsWith('video') ? 'video' : 'image';
    setMediaType(type);
    setUploading(true);
    try {
      const prepared = await prepareMediaForUpload(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.82 });
      const ext = prepared.name.split('.').pop();
      const path = `stories/${currentUser.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, prepared);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      setMediaUrl(publicUrl);
    } catch (err: any) { showToast(err?.message || 'Erro no upload', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !mediaUrl) return;
    setCreating(true);
    try {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('stories').insert({
        user_id: currentUser.id, media_url: mediaUrl, media_type: mediaType, expires_at: expires,
      });
      if (error) throw error;
      showToast('Momento criado! ✨', 'success');
      onCreated();
      onClose();
    } catch { showToast('Erro ao criar momento', 'error'); }
    finally { setCreating(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-bg2 border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="font-bebas text-xl tracking-wide text-text">Novo Momento</h2>
            <p className="text-xs text-text3 mt-0.5">Expira em 24 horas</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-bg3 flex items-center justify-center text-text3 hover:text-text transition-colors">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-5 space-y-4">
          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-colors ${mediaUrl ? 'border-transparent' : 'border-border hover:border-border2'}`}
            style={{ aspectRatio: '9/16', maxHeight: '320px' }}
          >
            {uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg3 gap-3">
                <div className="w-10 h-10 border-2 border-border2 border-t-purple rounded-full animate-spin" />
                <span className="text-sm text-text3">A carregar...</span>
              </div>
            ) : mediaUrl ? (
              <>
                {mediaType === 'image'
                  ? <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                  : <video src={mediaUrl} className="w-full h-full object-cover" muted />
                }
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="text-white text-xs opacity-0 hover:opacity-100">Alterar</span>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setMediaUrl(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg3">
                <div className="w-14 h-14 rounded-full bg-bg4 flex items-center justify-center">
                  <span className="text-2xl">📸</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-text">Clica para seleccionar</p>
                  <p className="text-xs text-text3 mt-1">Imagem ou vídeo · máx 50MB</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs text-text3 bg-bg2 px-2 py-1 rounded-lg border border-border">
                    <ImageIcon size={11} /> Foto
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text3 bg-bg2 px-2 py-1 rounded-lg border border-border">
                    <Video size={11} /> Vídeo
                  </span>
                </div>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
            <button type="submit" disabled={!mediaUrl || creating}
              className="btn btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {creating ? 'A criar...' : '✨ Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StoriesPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerGroupIdx, setViewerGroupIdx] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadStories();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel('stories_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, loadStories)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, loadStories)
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.id]);

  async function loadStories() {
    setLoading(true);
    try {
      let query = supabase.from('stories')
        .select('id, user_id, media_url, media_type, thumbnail_url, views_count, created_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(300); // segurança — momentos já são auto-limitados a 24h, isto evita picos enormes

      const { data: storiesData } = await query;
      if (!storiesData || storiesData.length === 0) { setGroups([]); return; }

      const uids = [...new Set(storiesData.map(s => s.user_id))];
      const [profsRes, charsRes, viewsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', uids),
        supabase.from('characters').select('user_id, name, class, level').in('user_id', uids),
        user ? supabase.from('story_views').select('story_id').eq('user_id', user.id) : { data: [] },
      ]);

      const viewedIds = new Set((viewsRes.data || []).map((v: any) => v.story_id));

      // Sort: own stories first, then unviewed, then viewed
      const groupMap = new Map<string, StoryGroup>();
      uids.forEach(uid => {
        const prof = profsRes.data?.find(p => p.id === uid);
        const char = charsRes.data?.find(c => c.user_id === uid);
        const userStories: Story[] = storiesData
          .filter(s => s.user_id === uid)
          .map(s => ({ ...s, profiles: prof || { username: 'Unknown' }, characters: char, viewed_by_me: viewedIds.has(s.id) }));
        if (userStories.length > 0) {
          groupMap.set(uid, {
            user_id: uid,
            username: prof?.username || 'Unknown',
            avatar_url: prof?.avatar_url,
            character_class: char?.class,
            character_name: char?.name,
            stories: userStories,
            has_unviewed: userStories.some(s => !viewedIds.has(s.id)),
          });
        }
      });

      const sorted = [...groupMap.values()].sort((a, b) => {
        if (user?.id === a.user_id) return -1;
        if (user?.id === b.user_id) return 1;
        if (a.has_unviewed && !b.has_unviewed) return -1;
        if (!a.has_unviewed && b.has_unviewed) return 1;
        return 0;
      });

      setGroups(sorted);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const myGroup = groups.find(g => g.user_id === user?.id);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bebas text-3xl tracking-wide text-text">Momentos</h1>
            <p className="text-xs text-text3 mt-0.5">Desaparecem em 24h · {groups.length} activos</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary text-sm gap-2">
              <Plus size={15} /> Criar Momento
            </button>
          )}
        </div>

        {loading ? (
          /* Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-2xl bg-bg2 border border-border animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-bg2 border border-border rounded-3xl">
            <div className="text-5xl mb-4">📸</div>
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem momentos ainda</h3>
            <p className="text-text3 text-sm mb-6">Partilha um momento — desaparece em 24h!</p>
            {user && (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary text-sm">
                <Plus size={15} /> Criar o primeiro
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Add story card */}
            {user && !myGroup && (
              <button onClick={() => setShowCreate(true)}
                className="aspect-[9/16] rounded-2xl border-2 border-dashed border-border hover:border-purple/50 bg-bg2 flex flex-col items-center justify-center gap-3 transition-all hover:bg-bg3 group">
                <div className="w-12 h-12 rounded-full bg-bg3 group-hover:bg-purple/20 border border-border group-hover:border-purple/40 flex items-center justify-center transition-all">
                  <Plus size={22} className="text-text3 group-hover:text-purple2" />
                </div>
                <span className="text-xs text-text3 group-hover:text-text transition-colors font-medium">Criar Momento</span>
              </button>
            )}
            {groups.map((group, i) => (
              <StoryCard key={group.user_id} group={group} onClick={() => setViewerGroupIdx(i)} />
            ))}
          </div>
        )}
      </div>

      {/* Viewer */}
      {viewerGroupIdx !== null && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={viewerGroupIdx}
          currentUser={user}
          currentProfile={profile}
          onClose={() => setViewerGroupIdx(null)}
          onStoriesUpdated={() => { loadStories(); setViewerGroupIdx(null); }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateStoryModal
          currentUser={user}
          onClose={() => setShowCreate(false)}
          onCreated={loadStories}
        />
      )}
    </div>
  );
}
