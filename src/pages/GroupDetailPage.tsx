import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Users, Crown, Lock, Globe2, EyeOff, Share2, UserPlus, LogOut, Settings,
  Image as ImageIcon, Heart, MessageCircle, Pin, Trash2, CheckCircle2, X,
  Send, Loader2, Camera, Video, MoreHorizontal, Shield, Copy, Maximize2,
  ArrowLeft, Grid3x3, Play,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Group {
  id: string; name: string; description: string; avatar_url: string; banner_url: string;
  privacy_type: 'public' | 'private' | 'secret'; category: string; rules: string;
  member_count: number; post_count: number; created_by: string; created_at: string; updated_at: string;
}
interface GroupMember { id: string; group_id: string; user_id: string; role: string; joined_at: string; }
interface Profile { id: string; username: string; avatar_url: string; province: string; is_admin: boolean; is_super_admin: boolean; }
interface GroupPost {
  id: string; group_id: string; user_id: string; content: string; media_type: string | null; media_url: string | null;
  likes_count: number; comments_count: number; is_pinned: boolean; is_approved: boolean; created_at: string; updated_at: string;
  profile?: Profile; liked_by_me?: boolean;
}
interface Comment { id: string; post_id: string; user_id: string; content: string; created_at: string; profile?: Profile; }

const TABS = ['Feed', 'Multimédia', 'Membros', 'Sobre'] as const;
type Tab = (typeof TABS)[number];

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' });
}

function privacyMeta(p: Group['privacy_type']) {
  if (p === 'public') return { label: 'Público', icon: Globe2, color: '#14b8a6' };
  if (p === 'private') return { label: 'Privado', icon: Lock, color: '#f59e0b' };
  return { label: 'Secreto', icon: EyeOff, color: '#ef4444' };
}

const CATEGORY_EMOJI: Record<string, string> = {
  anime: '🎌', gaming: '🎮', memes: '😂', music: '🎵', art: '🎨',
  general: '💬', tecnologia: '💻', esportes: '⚽', filmes: '🎬', literatura: '📚',
};

// ─── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ url, type, onClose }: { url: string; type: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <X size={20} />
      </button>
      {type === 'video'
        ? <video src={url} controls autoPlay className="max-w-full max-h-[92vh] rounded-xl" onClick={e => e.stopPropagation()} />
        : <img src={url} alt="" className="max-w-full max-h-[92vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
      }
    </div>
  );
}

// ─── Share Modal ────────────────────────────────────────────────────────────

function ShareModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const { showToast } = useToast();
  const url = `${window.location.origin}/groups/${group.id}`;

  async function copyLink() {
    try { await navigator.clipboard.writeText(url); showToast('Link copiado! 📋', 'success'); } catch { showToast('Erro ao copiar', 'error'); }
  }
  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: group.name, text: group.description, url }); } catch { /* cancelled */ }
    } else copyLink();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-rajdhani font-bold text-lg text-text">Partilhar Grupo</h2>
          <button onClick={onClose}><X size={18} className="text-text3" /></button>
        </div>
        <div className="flex items-center gap-2 bg-bg3 border border-border rounded-xl px-3 py-2.5 mb-4">
          <span className="text-xs text-text3 truncate flex-1">{url}</span>
          <button onClick={copyLink} className="text-purple2 flex-shrink-0"><Copy size={14} /></button>
        </div>
        <button onClick={nativeShare} className="btn btn-primary w-full text-sm gap-2">
          <Share2 size={14} /> Partilhar agora
        </button>
      </div>
    </div>
  );
}

// ─── Invite Modal ───────────────────────────────────────────────────────────

function InviteModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from('profiles').select('id, username, avatar_url, province, is_admin, is_super_admin').ilike('username', `%${query}%`).limit(8);
      setResults((data || []) as Profile[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleInvite(profile: Profile) {
    if (!user) return;
    try {
      await supabase.from('notifications').insert({
        user_id: profile.id, type: 'group_invite', title: 'Convite para grupo',
        message: `Foste convidado para o grupo "${group.name}"`,
        data: { group_id: group.id, group_name: group.name },
      });
      setInvited(prev => new Set(prev).add(profile.id));
      showToast(`Convite enviado a ${profile.username}! ✉️`, 'success');
    } catch { showToast('Erro ao convidar', 'error'); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-5 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-rajdhani font-bold text-lg text-text">Convidar Kambas</h2>
          <button onClick={onClose}><X size={18} className="text-text3" /></button>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome de utilizador..." className="input w-full text-sm mb-3" autoFocus />
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[100px]">
          {searching && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-text3" /></div>}
          {!searching && query.length >= 2 && results.length === 0 && <p className="text-center text-xs text-text3 py-4">Nenhum utilizador encontrado.</p>}
          {results.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg3 transition-colors">
              <div className="w-9 h-9 rounded-full bg-bg3 flex items-center justify-center text-xs font-bold text-purple2 overflow-hidden flex-shrink-0">
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-text flex-1 truncate">{p.username}</span>
              <button
                onClick={() => handleInvite(p)}
                disabled={invited.has(p.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${invited.has(p.id) ? 'bg-teal/15 text-teal' : 'bg-purple/15 text-purple2 hover:bg-purple/25'}`}
              >
                {invited.has(p.id) ? '✓ Convidado' : 'Convidar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ─────────────────────────────────────────────────────────

function SettingsModal({ group, onClose, onSaved, onDeleted }: { group: Group; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: group.name, description: group.description, category: group.category, privacy_type: group.privacy_type, rules: group.rules || '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await supabase.from('groups').update(form).eq('id', group.id);
      showToast('Grupo actualizado! ✓', 'success');
      onSaved();
      onClose();
    } catch { showToast('Erro ao guardar', 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      await supabase.from('groups').delete().eq('id', group.id);
      showToast('Grupo apagado', 'success');
      onDeleted();
    } catch { showToast('Erro ao apagar grupo', 'error'); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-bg2 border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-bg2">
          <h2 className="font-bebas text-2xl tracking-wide text-text flex items-center gap-2"><Settings size={20} /> Configurações</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-bg3 flex items-center justify-center text-text3 hover:text-text"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-text3 font-medium mb-1.5 block">Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input w-full text-sm" />
          </div>
          <div>
            <label className="text-xs text-text3 font-medium mb-1.5 block">Descrição</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input w-full text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-medium mb-1.5 block">Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input w-full text-sm">
                {Object.keys(CATEGORY_EMOJI).map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text3 font-medium mb-1.5 block">Privacidade</label>
              <select value={form.privacy_type} onChange={e => setForm({ ...form, privacy_type: e.target.value as any })} className="input w-full text-sm">
                <option value="public">🌍 Público</option>
                <option value="private">🔒 Privado</option>
                <option value="secret">🕶️ Secreto</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-text3 font-medium mb-1.5 block">Regras</label>
            <textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} rows={4} className="input w-full text-sm resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar alterações'}
            </button>
          </div>

          <div className="border-t border-border pt-4 mt-2">
            <p className="text-xs text-text3 mb-2">Zona de perigo</p>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-red hover:underline flex items-center gap-1.5"><Trash2 size={13} /> Apagar este grupo</button>
            ) : (
              <div className="bg-red/10 border border-red/30 rounded-xl p-3">
                <p className="text-xs text-red mb-2">Esta acção é irreversível. Todos os posts e membros serão removidos.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost text-xs py-1.5 flex-1">Cancelar</button>
                  <button onClick={handleDelete} className="bg-red text-white text-xs py-1.5 rounded-lg flex-1 font-semibold">Confirmar exclusão</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────────────

function PostCard({
  post, currentUserId, isAdminOrMod, onLike, onDelete, onPin, onApprove, onOpenComments, onLightbox,
}: {
  post: GroupPost; currentUserId?: string; isAdminOrMod: boolean;
  onLike: (id: string) => void; onDelete: (id: string) => void; onPin: (id: string, p: boolean) => void;
  onApprove: (id: string) => void; onOpenComments: (id: string) => void; onLightbox: (url: string, type: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu]);

  const canDelete = post.user_id === currentUserId || isAdminOrMod;

  return (
    <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-xl bg-bg3 flex items-center justify-center text-sm font-bold text-text2 overflow-hidden flex-shrink-0">
          {post.profile?.avatar_url ? <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (post.profile?.username || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/perfil/${post.profile?.username}`} className="font-rajdhani font-semibold text-text hover:text-purple2 transition-colors text-sm">
            {post.profile?.username || 'Usuário'}
          </Link>
          <p className="text-[11px] text-text3">{timeAgo(post.created_at)}</p>
        </div>
        {post.is_pinned && <span className="text-[10px] text-amber font-semibold flex items-center gap-0.5 flex-shrink-0"><Pin size={10} /> Fixado</span>}
        {!post.is_approved && <span className="text-[10px] text-amber font-semibold flex-shrink-0">Pendente</span>}

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors">
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-9 bg-bg3 border border-border rounded-xl shadow-2xl z-20 w-44 py-1 overflow-hidden">
              {isAdminOrMod && !post.is_approved && (
                <button onClick={() => { onApprove(post.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-teal hover:bg-bg4 flex items-center gap-2"><CheckCircle2 size={13} /> Aprovar</button>
              )}
              {isAdminOrMod && (
                <button onClick={() => { onPin(post.id, !post.is_pinned); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-amber hover:bg-bg4 flex items-center gap-2"><Pin size={13} /> {post.is_pinned ? 'Desfixar' : 'Fixar'}</button>
              )}
              {canDelete && (
                <button onClick={() => { onDelete(post.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red hover:bg-bg4 flex items-center gap-2"><Trash2 size={13} /> Apagar</button>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="px-4 pb-3 text-sm text-text2 whitespace-pre-wrap leading-relaxed">{post.content}</p>

      {post.media_url && (
        <div className="relative cursor-zoom-in group/img" onClick={() => onLightbox(post.media_url!, post.media_type || 'image')}>
          {post.media_type === 'video' ? (
            <div className="relative bg-black">
              <video src={post.media_url} className="w-full max-h-96 object-cover" muted />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"><Play size={20} className="text-white ml-0.5" /></div>
              </div>
            </div>
          ) : (
            <>
              <img src={post.media_url} alt="" className="w-full max-h-96 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center">
                <Maximize2 size={18} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center border-t border-border">
        <button onClick={() => onLike(post.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${post.liked_by_me ? 'text-red' : 'text-text3 hover:text-red hover:bg-bg3'}`}>
          <Heart size={15} fill={post.liked_by_me ? 'currentColor' : 'none'} /> {post.likes_count || 0}
        </button>
        <button onClick={() => onOpenComments(post.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-text3 hover:text-teal hover:bg-bg3 transition-colors">
          <MessageCircle size={15} /> {post.comments_count || 0}
        </button>
      </div>
    </div>
  );
}

// ─── Comments Drawer ────────────────────────────────────────────────────────

function CommentsDrawer({ postId, currentUser, currentProfile, onClose }: { postId: string; currentUser: any; currentProfile: any; onClose: () => void }) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, [postId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('group_post_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    const list = (data || []) as Comment[];
    const uids = [...new Set(list.map(c => c.user_id))];
    if (uids.length) {
      const { data: profs } = await supabase.from('profiles').select('*').in('id', uids);
      list.forEach(c => { c.profile = profs?.find(p => p.id === c.user_id) as Profile; });
    }
    setComments(list);
    setLoading(false);
  }

  async function handleSend() {
    if (!text.trim() || !currentUser) return;
    setSending(true);
    try {
      await supabase.from('group_post_comments').insert({ post_id: postId, user_id: currentUser.id, content: text.trim() });
      setText('');
      load();
    } catch { showToast('Erro ao comentar', 'error'); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-bg2 border border-border rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-rajdhani font-bold text-text">Comentários</h3>
          <button onClick={onClose}><X size={18} className="text-text3" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-text3" /></div>
            : comments.length === 0 ? <p className="text-center text-xs text-text3 py-6">Sem comentários ainda.</p>
            : comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-bg3 flex items-center justify-center text-xs font-bold text-purple2 overflow-hidden flex-shrink-0">
                  {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.profile?.username || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 bg-bg3 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-semibold text-text">{c.profile?.username}</span><span className="text-[10px] text-text3">{timeAgo(c.created_at)}</span></div>
                  <p className="text-xs text-text2">{c.content}</p>
                </div>
              </div>
            ))
          }
        </div>
        {currentUser && (
          <div className="p-4 border-t border-border flex gap-2">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Escreve um comentário..." className="input flex-1 text-sm" />
            <button onClick={handleSend} disabled={!text.trim() || sending} className="btn btn-primary px-3 disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberships, setMemberships] = useState<Record<string, GroupMember>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Feed');
  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; type: string } | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [headerMenu, setHeaderMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    const { data: gData } = await supabase.from('groups').select('*').eq('id', id).maybeSingle();
    if (!gData) { setLoading(false); return; }
    setGroup(gData as Group);

    const { data: mData } = await supabase.from('group_members').select('*').eq('group_id', id);
    const mList = (mData || []) as GroupMember[];
    setMembers(mList);

    const userIds = [...new Set(mList.map(m => m.user_id))];
    if (userIds.length) {
      const { data: pData } = await supabase.from('profiles').select('*').in('id', userIds);
      const pMap: Record<string, Profile> = {};
      (pData || []).forEach(p => { pMap[p.id] = p as Profile; });
      setProfiles(pMap);
    }

    if (user) {
      const { data: myM } = await supabase.from('group_members').select('*').eq('group_id', id).eq('user_id', user.id);
      const myMap: Record<string, GroupMember> = {};
      (myM || []).forEach(m => { myMap[m.group_id] = m as GroupMember; });
      setMemberships(myMap);
    }

    const { data: pData } = await supabase.from('group_posts').select('*').eq('group_id', id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    const pList = (pData || []) as GroupPost[];
    const postUserIds = [...new Set(pList.map(p => p.user_id))];
    if (postUserIds.length) {
      const { data: postProfiles } = await supabase.from('profiles').select('*').in('id', postUserIds);
      const ppMap: Record<string, Profile> = {};
      (postProfiles || []).forEach(p => { ppMap[p.id] = p as Profile; });
      pList.forEach(p => { p.profile = ppMap[p.user_id]; });
    }
    if (user) {
      const { data: likes } = await supabase.from('group_post_likes').select('post_id').eq('user_id', user.id);
      const likedSet = new Set((likes || []).map(l => l.post_id));
      pList.forEach(p => { p.liked_by_me = likedSet.has(p.id); });
    }
    setPosts(pList);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`group_posts_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_posts', filter: `group_id=eq.${id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${id}` }, loadData)
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [id]);

  useEffect(() => {
    if (!headerMenu) return;
    const h = (e: MouseEvent) => { if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setHeaderMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [headerMenu]);

  const myRole = memberships[id || '']?.role || '';
  const isAdminOrMod = myRole === 'admin' || myRole === 'moderator';
  const isCreator = group?.created_by === user?.id;
  const isMember = !!memberships[id || ''];

  const mediaPosts = useMemo(() => posts.filter(p => p.media_url && p.is_approved), [posts]);
  const visiblePosts = useMemo(() => isAdminOrMod ? posts : posts.filter(p => p.is_approved), [posts, isAdminOrMod]);

  async function handleJoin() {
    if (!user || !id || !group) return;
    if (group.privacy_type === 'public') {
      const { error } = await supabase.from('group_members').insert({ group_id: id, user_id: user.id, role: 'member' });
      if (!error) { showToast(`Entraste em ${group.name}! 🎉`, 'success'); loadData(); }
    } else {
      showToast('Este grupo requer aprovação para entrar', 'info');
    }
  }

  async function handleLeave() {
    if (!user || !id || !group) return;
    const member = memberships[id];
    if (!member || member.role === 'admin') return;
    if (!confirm(`Sair de "${group.name}"?`)) return;
    const { error } = await supabase.from('group_members').delete().eq('id', member.id);
    if (!error) { showToast('Saíste do grupo', 'success'); loadData(); }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostFile(file);
    setPostPreview(URL.createObjectURL(file));
  }

  async function handleCreatePost() {
    if (!user || !id || !postContent.trim()) return;
    setPosting(true);
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    if (postFile) {
      mediaType = postFile.type.startsWith('video') ? 'video' : 'image';
      const ext = postFile.name.split('.').pop();
      const path = `groups/${id}/${user.id}_${Date.now()}.${ext}`;
      const { data: up } = await supabase.storage.from('uploads').upload(path, postFile);
      if (up) { const { data } = supabase.storage.from('uploads').getPublicUrl(path); mediaUrl = data?.publicUrl || null; }
    }
    const { error } = await supabase.from('group_posts').insert({
      group_id: id, user_id: user.id, content: postContent.trim(), media_type: mediaType, media_url: mediaUrl,
      is_approved: group?.privacy_type === 'public', is_pinned: false,
    });
    if (!error) {
      setPostContent(''); setPostFile(null); setPostPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      showToast('Publicado!', 'success');
      loadData();
    } else showToast('Erro ao publicar', 'error');
    setPosting(false);
  }

  async function handleLike(postId: string) {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.liked_by_me;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_me: !wasLiked, likes_count: wasLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 } : p));
    try {
      if (wasLiked) {
        await supabase.from('group_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        await supabase.from('group_posts').update({ likes_count: Math.max(0, post.likes_count - 1) }).eq('id', postId);
      } else {
        await supabase.from('group_post_likes').insert({ post_id: postId, user_id: user.id });
        await supabase.from('group_posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId);
      }
    } catch { loadData(); }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Apagar esta publicação?')) return;
    await supabase.from('group_posts').delete().eq('id', postId);
    showToast('Publicação apagada', 'success');
    loadData();
  }

  async function handlePinPost(postId: string, pinned: boolean) { await supabase.from('group_posts').update({ is_pinned: pinned }).eq('id', postId); loadData(); }
  async function handleApprovePost(postId: string) { await supabase.from('group_posts').update({ is_approved: true }).eq('id', postId); showToast('Publicação aprovada', 'success'); loadData(); }
  async function handleChangeRole(memberId: string, newRole: string) { await supabase.from('group_members').update({ role: newRole }).eq('id', memberId); loadData(); }
  async function handleRemoveMember(memberId: string) { if (!confirm('Remover este membro?')) return; await supabase.from('group_members').delete().eq('id', memberId); loadData(); }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="h-48 bg-bg2 rounded-2xl animate-pulse mb-4" />
          <div className="h-8 w-64 bg-bg2 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-40 bg-bg2 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen pt-20 px-4 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h2 className="font-rajdhani font-bold text-xl text-text mb-2">Grupo não encontrado</h2>
        <button onClick={() => navigate('/groups')} className="btn btn-ghost text-sm mt-2">← Voltar a Grupos</button>
      </div>
    );
  }

  const pm = privacyMeta(group.privacy_type);
  const PIcon = pm.icon;

  return (
    <div className="min-h-screen pt-16 pb-16">
      {/* Banner */}
      <div className="relative">
        <div className="h-40 md:h-56 bg-bg3 w-full overflow-hidden relative">
          {group.banner_url ? <img src={group.banner_url} alt="" className="w-full h-full object-cover" /> : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #8b5cf633, #ef444433)' }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
          <button onClick={() => navigate('/groups')} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <ArrowLeft size={17} />
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-bg2 border-4 border-bg flex items-center justify-center text-2xl font-bebas text-text2 overflow-hidden flex-shrink-0 shadow-xl">
              {group.avatar_url ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{CATEGORY_EMOJI[group.category] || '✨'}</span>}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bebas text-text truncate">{group.name}</h1>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-bg3 text-text2">{CATEGORY_EMOJI[group.category]} {group.category}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1" style={{ color: pm.color, background: `${pm.color}15` }}><PIcon size={10} /> {pm.label}</span>
                <span className="text-[11px] text-text3 flex items-center gap-1"><Users size={10} /> {group.member_count}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pb-1 flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowShare(true)} className="w-9 h-9 rounded-xl bg-bg3 border border-border flex items-center justify-center text-text2 hover:text-text hover:border-border2 transition-colors" title="Partilhar">
                <Share2 size={15} />
              </button>
              {isMember && (
                <button onClick={() => setShowInvite(true)} className="w-9 h-9 rounded-xl bg-bg3 border border-border flex items-center justify-center text-text2 hover:text-text hover:border-border2 transition-colors hidden sm:flex" title="Convidar">
                  <UserPlus size={15} />
                </button>
              )}

              {isMember ? (
                <div className="relative" ref={headerMenuRef}>
                  <button onClick={() => setHeaderMenu(!headerMenu)} className="btn btn-ghost text-xs py-2 px-3 gap-1.5">
                    {myRole === 'admin' && <Crown size={12} className="text-amber" />}
                    {myRole === 'admin' ? 'Admin' : myRole === 'moderator' ? 'Moderador' : 'Membro'}
                    <MoreHorizontal size={13} />
                  </button>
                  {headerMenu && (
                    <div className="absolute right-0 top-10 bg-bg3 border border-border rounded-xl shadow-2xl z-20 w-48 py-1 overflow-hidden">
                      <button onClick={() => { setShowInvite(true); setHeaderMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-bg4 flex items-center gap-2.5 sm:hidden"><UserPlus size={13} /> Convidar</button>
                      {isAdminOrMod && (
                        <button onClick={() => { setShowSettings(true); setHeaderMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-bg4 flex items-center gap-2.5"><Settings size={13} className="text-purple2" /> Configurações</button>
                      )}
                      {!isCreator && (
                        <button onClick={() => { handleLeave(); setHeaderMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-red hover:bg-bg4 flex items-center gap-2.5"><LogOut size={13} /> Sair do grupo</button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={handleJoin} className="btn btn-primary text-sm py-2 px-4">
                  {group.privacy_type === 'private' ? 'Solicitar entrada' : 'Entrar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-5 overflow-x-auto scrollbar-thin">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-shrink-0 px-4 py-2.5 font-rajdhani font-semibold text-sm border-b-2 transition-colors ${activeTab === tab ? 'border-purple text-purple2' : 'border-transparent text-text3 hover:text-text'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Feed ── */}
        {activeTab === 'Feed' && (
          <div className="flex flex-col gap-4">
            {isMember && (
              <div className="bg-bg2 border border-border rounded-2xl p-4">
                <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Partilha algo com o grupo..." rows={3} className="input w-full text-sm resize-none" maxLength={1000} />
                {postPreview && (
                  <div className="relative mt-3 rounded-xl overflow-hidden">
                    {postFile?.type.startsWith('video') ? <video src={postPreview} className="w-full max-h-48 object-cover" /> : <img src={postPreview} alt="" className="w-full max-h-48 object-cover" />}
                    <button onClick={() => { setPostFile(null); setPostPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"><X size={13} /></button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs text-text3 hover:text-text border border-border px-2.5 py-1.5 rounded-lg hover:border-border2 transition-colors">
                      <Camera size={13} /> Mídia
                    </button>
                  </div>
                  <button onClick={handleCreatePost} disabled={posting || !postContent.trim()} className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50">
                    {posting ? 'Publicando...' : 'Publicar'}
                  </button>
                </div>
              </div>
            )}

            {visiblePosts.length === 0 ? (
              <div className="text-center text-text3 py-12 bg-bg2 border border-border rounded-2xl">
                <div className="text-4xl mb-2">📭</div>
                Nenhuma publicação ainda. {isMember && 'Sê o primeiro!'}
              </div>
            ) : (
              visiblePosts.map(post => (
                <PostCard
                  key={post.id} post={post} currentUserId={user?.id} isAdminOrMod={isAdminOrMod}
                  onLike={handleLike} onDelete={handleDeletePost} onPin={handlePinPost} onApprove={handleApprovePost}
                  onOpenComments={setActiveComments} onLightbox={(url, type) => setLightbox({ url, type })}
                />
              ))
            )}
          </div>
        )}

        {/* ── Multimédia ── */}
        {activeTab === 'Multimédia' && (
          <div>
            {mediaPosts.length === 0 ? (
              <div className="text-center text-text3 py-12 bg-bg2 border border-border rounded-2xl">
                <Grid3x3 size={36} className="mx-auto mb-3 opacity-40" />
                Sem fotos ou vídeos publicados ainda.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {mediaPosts.map(post => (
                  <button key={post.id} onClick={() => setLightbox({ url: post.media_url!, type: post.media_type || 'image' })} className="relative aspect-square rounded-xl overflow-hidden bg-bg3 group">
                    {post.media_type === 'video' ? (
                      <>
                        <video src={post.media_url!} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Play size={20} className="text-white" /></div>
                      </>
                    ) : (
                      <img src={post.media_url!} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Membros ── */}
        {activeTab === 'Membros' && (
          <div className="bg-bg2 border border-border rounded-2xl p-4">
            <div className="flex flex-col gap-2">
              {members.map(m => {
                const p = profiles[m.user_id];
                return (
                  <div key={m.id} className="flex items-center justify-between bg-bg3 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-bg flex items-center justify-center text-xs font-bold text-text2 overflow-hidden flex-shrink-0">
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/perfil/${p?.username}`} className="font-rajdhani font-semibold text-text hover:text-purple2 transition-colors text-sm truncate block">{p?.username || 'Usuário'}</Link>
                        <p className="text-[11px] text-text3 capitalize flex items-center gap-1">{m.role === 'admin' && <Crown size={9} className="text-amber" />}{m.role === 'moderator' && <Shield size={9} className="text-teal" />}{m.role}</p>
                      </div>
                    </div>
                    {isAdminOrMod && m.user_id !== user?.id && m.user_id !== group.created_by && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select value={m.role} onChange={e => handleChangeRole(m.id, e.target.value)} className="bg-bg border border-border rounded-lg px-2 py-1 text-xs text-text">
                          <option value="member">Membro</option>
                          <option value="moderator">Moderador</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => handleRemoveMember(m.id)} className="text-xs text-red border border-red/40 px-2 py-1 rounded-lg hover:bg-red/10 transition-colors">Remover</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Sobre ── */}
        {activeTab === 'Sobre' && (
          <div className="space-y-4">
            <div className="bg-bg2 border border-border rounded-2xl p-5">
              <h2 className="font-rajdhani font-bold text-lg text-text mb-2">Sobre este grupo</h2>
              <p className="text-sm text-text2 leading-relaxed">{group.description || 'Sem descrição.'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-bg3 rounded-xl p-3"><p className="text-[11px] text-text3">Membros</p><p className="text-lg font-bold text-text">{group.member_count}</p></div>
                <div className="bg-bg3 rounded-xl p-3"><p className="text-[11px] text-text3">Publicações</p><p className="text-lg font-bold text-text">{group.post_count}</p></div>
                <div className="bg-bg3 rounded-xl p-3"><p className="text-[11px] text-text3">Criado em</p><p className="text-sm font-bold text-text">{new Date(group.created_at).toLocaleDateString('pt-AO')}</p></div>
                <div className="bg-bg3 rounded-xl p-3"><p className="text-[11px] text-text3">Privacidade</p><p className="text-sm font-bold text-text capitalize">{pm.label}</p></div>
              </div>
              {isAdminOrMod && (
                <button onClick={() => setShowSettings(true)} className="btn btn-ghost text-xs mt-4 gap-1.5"><Settings size={12} /> Editar informações</button>
              )}
            </div>

            <div className="bg-bg2 border border-border rounded-2xl p-5">
              <h2 className="font-rajdhani font-bold text-lg text-text mb-2">Regras da Comunidade</h2>
              <p className="text-sm text-text2 whitespace-pre-wrap leading-relaxed">{group.rules || 'Nenhuma regra definida pelos administradores.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {lightbox && <Lightbox url={lightbox.url} type={lightbox.type} onClose={() => setLightbox(null)} />}
      {showShare && <ShareModal group={group} onClose={() => setShowShare(false)} />}
      {showInvite && <InviteModal group={group} onClose={() => setShowInvite(false)} />}
      {showSettings && <SettingsModal group={group} onClose={() => setShowSettings(false)} onSaved={loadData} onDeleted={() => navigate('/groups')} />}
      {activeComments && <CommentsDrawer postId={activeComments} currentUser={user} currentProfile={profile} onClose={() => { setActiveComments(null); loadData(); }} />}
    </div>
  );
}
