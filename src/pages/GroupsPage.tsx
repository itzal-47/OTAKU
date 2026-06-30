import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { prepareMediaForUpload } from '../lib/imageCompress';
import { useAuth } from '../components/AuthContext';
import { Link } from 'react-router-dom';
import {
  Search, Plus, X, Users, Crown, Flame, Compass, Settings, ChevronRight,
  Lock, Globe2, EyeOff, Image as ImageIcon, Loader2, Sparkles, Menu,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  privacy_type: 'public' | 'private' | 'secret';
  category: string;
  rules: string;
  member_count: number;
  post_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

const CATEGORIES = ['Todos', 'anime', 'gaming', 'memes', 'music', 'art', 'general', 'tecnologia', 'esportes', 'filmes', 'literatura'];

const CATEGORY_EMOJI: Record<string, string> = {
  anime: '🎌', gaming: '🎮', memes: '😂', music: '🎵', art: '🎨',
  general: '💬', tecnologia: '💻', esportes: '⚽', filmes: '🎬', literatura: '📚',
};

type SidebarView = 'discover' | 'popular' | 'mine' | 'managing';

// ─── Helpers ────────────────────────────────────────────────────────────────

function privacyMeta(p: Group['privacy_type']) {
  if (p === 'public') return { label: 'Público', icon: Globe2, color: '#14b8a6' };
  if (p === 'private') return { label: 'Privado', icon: Lock, color: '#f59e0b' };
  return { label: 'Secreto', icon: EyeOff, color: '#ef4444' };
}

// ─── Group Card ─────────────────────────────────────────────────────────────

function GroupCard({
  group, isMember, isAdmin, onJoin, onLeave,
}: {
  group: Group;
  isMember: boolean;
  isAdmin: boolean;
  onJoin: (g: Group) => void;
  onLeave: (id: string) => void;
}) {
  const pm = privacyMeta(group.privacy_type);
  const Icon = pm.icon;
  const emoji = CATEGORY_EMOJI[group.category] || '✨';

  return (
    <div className="bg-bg2 border border-border rounded-2xl overflow-hidden hover:border-border2 transition-all duration-200 group flex flex-col">
      {/* Banner strip */}
      <div className="h-20 relative overflow-hidden" style={{ background: group.banner_url ? undefined : `linear-gradient(135deg, #8b5cf633, #ef444433)` }}>
        {group.banner_url && <img src={group.banner_url} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-transparent to-transparent" />
      </div>

      <div className="p-4 -mt-8 flex-1 flex flex-col">
        <div className="flex items-end gap-3 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-bg3 border-2 border-bg2 flex items-center justify-center text-xl font-bebas text-text2 overflow-hidden flex-shrink-0 shadow-lg">
            {group.avatar_url ? <img src={group.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{emoji}</span>}
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <Link to={`/groups/${group.id}`} className="font-rajdhani font-bold text-base text-text truncate hover:text-purple2 transition-colors block">
              {group.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-bg3 text-text3 font-medium flex items-center gap-1">
                {emoji} {group.category}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: pm.color }}>
                <Icon size={9} /> {pm.label}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-text3 leading-relaxed line-clamp-2 mb-3 flex-1">{group.description || 'Sem descrição.'}</p>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[11px] text-text3 flex items-center gap-1">
            <Users size={11} /> {group.member_count} · {group.post_count} posts
          </span>
          {isMember ? (
            <div className="flex items-center gap-2">
              {isAdmin && <span className="text-[10px] font-semibold text-amber flex items-center gap-0.5"><Crown size={10} /> Admin</span>}
              {!isAdmin && (
                <button onClick={() => onLeave(group.id)} className="text-[11px] text-red hover:underline font-medium">Sair</button>
              )}
              <Link to={`/groups/${group.id}`} className="text-[11px] text-purple2 hover:underline font-semibold">Ver →</Link>
            </div>
          ) : (
            <button onClick={() => onJoin(group)} className="btn btn-primary text-[11px] py-1.5 px-3">
              {group.privacy_type === 'private' ? 'Solicitar' : 'Entrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({
  view, setView, myGroupsCount, managingCount, onCreateClick, onClose,
}: {
  view: SidebarView;
  setView: (v: SidebarView) => void;
  myGroupsCount: number;
  managingCount: number;
  onCreateClick: () => void;
  onClose?: () => void;
}) {
  const items: { id: SidebarView; label: string; icon: any; count?: number }[] = [
    { id: 'discover', label: 'Descobrir', icon: Compass },
    { id: 'popular', label: 'Mais Populares', icon: Flame },
    { id: 'mine', label: 'Meus Grupos', icon: Users, count: myGroupsCount },
    { id: 'managing', label: 'Que Administro', icon: Crown, count: managingCount },
  ];

  return (
    <div className="bg-bg2 border border-border rounded-2xl p-3 flex flex-col gap-1 sticky top-20">
      {onClose && (
        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border md:hidden">
          <span className="font-rajdhani font-bold text-text text-sm">Navegação</span>
          <button onClick={onClose}><X size={18} className="text-text3" /></button>
        </div>
      )}
      <button onClick={onCreateClick} className="btn btn-primary text-sm w-full gap-2 mb-2 justify-center py-2.5">
        <Plus size={15} /> Criar Grupo
      </button>

      {items.map(item => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => { setView(item.id); onClose?.(); }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active ? 'bg-purple/15 text-purple2 border border-purple/30' : 'text-text2 hover:bg-bg3 hover:text-text border border-transparent'
            }`}
          >
            <Icon size={16} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-purple2/20 text-purple2' : 'bg-bg3 text-text3'}`}>
                {item.count}
              </span>
            )}
            {active && <ChevronRight size={13} />}
          </button>
        );
      })}

      <div className="border-t border-border my-1.5" />

      <Link to="/settings/groups" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-text2 hover:bg-bg3 hover:text-text transition-all">
        <Settings size={16} />
        <span className="flex-1 text-left">Configurações</span>
      </Link>
    </div>
  );
}

// ─── Create Modal ───────────────────────────────────────────────────────────

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', privacy_type: 'public' as 'public' | 'private' | 'secret', category: 'general', rules: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const prepared = await prepareMediaForUpload(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
      const ext = prepared.name.split('.').pop();
      const path = `groups/avatars/${user.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, prepared);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch { setError('Erro ao carregar imagem'); }
    finally { setUploading(false); }
  }

  async function handleCreate() {
    if (!user) return;
    setError('');
    if (!form.name.trim()) { setError('O nome do grupo é obrigatório.'); return; }
    setLoading(true);
    const { data: newGroup, error: err } = await supabase.rpc('create_group', {
      p_name: form.name.trim(),
      p_description: form.description.trim(),
      p_privacy_type: form.privacy_type,
      p_category: form.category,
      p_rules: form.rules.trim(),
    });
    if (err || !newGroup) {
      setError(err?.message || 'Erro ao criar grupo.');
      setLoading(false);
      return;
    }
    if (avatarUrl) {
      await supabase.from('groups').update({ avatar_url: avatarUrl }).eq('id', (newGroup as any).id);
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-bg2 border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-bg2 z-10">
          <h2 className="font-bebas text-2xl tracking-wide text-text">Criar Grupo</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-bg3 flex items-center justify-center text-text3 hover:text-text transition-colors"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red/10 border border-red/30 rounded-xl px-3 py-2 text-red text-sm">{error}</div>}

          {/* Avatar upload */}
          <div className="flex items-center gap-3">
            <button onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-2xl bg-bg3 border-2 border-dashed border-border hover:border-purple/50 flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors">
              {uploading ? <Loader2 size={18} className="animate-spin text-text3" /> : avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-text3" />}
            </button>
            <div className="text-xs text-text3">Ícone do grupo<br /><span className="text-text3/70">opcional · clica para escolher</span></div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </div>

          <div>
            <label className="text-xs text-text3 font-medium mb-1.5 block">Nome do grupo</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input w-full text-sm" placeholder="Ex: Otakus de Luanda" maxLength={60} />
          </div>

          <div>
            <label className="text-xs text-text3 font-medium mb-1.5 block">Descrição</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="input w-full text-sm resize-none" placeholder="Sobre o que é este grupo?" maxLength={300} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text3 font-medium mb-1.5 block">Privacidade</label>
              <select value={form.privacy_type} onChange={e => setForm({ ...form, privacy_type: e.target.value as any })} className="input w-full text-sm">
                <option value="public">🌍 Público</option>
                <option value="private">🔒 Privado</option>
                <option value="secret">🕶️ Secreto</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text3 font-medium mb-1.5 block">Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input w-full text-sm">
                {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-text3 font-medium mb-1.5 block">Regras (opcional)</label>
            <textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} rows={3} className="input w-full text-sm resize-none" placeholder="Define as regras da comunidade..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn btn-ghost flex-1 py-2.5 text-sm">Cancelar</button>
            <button onClick={handleCreate} disabled={loading} className="btn btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
              {loading ? 'Criando...' : 'Criar Grupo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Request Modal ──────────────────────────────────────────────────────────

function RequestJoinModal({ onClose, onSend, loading }: { onClose: () => void; onSend: (msg: string) => void; loading: boolean }) {
  const [msg, setMsg] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-rajdhani font-bold text-lg text-text">Solicitar Entrada</h2>
          <button onClick={onClose}><X size={18} className="text-text3" /></button>
        </div>
        <p className="text-xs text-text3 mb-3">Este grupo é privado. Envia uma mensagem ao administrador.</p>
        <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} className="input w-full text-sm resize-none mb-4" placeholder="Porque queres entrar neste grupo?" />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1 py-2 text-sm">Cancelar</button>
          <button onClick={() => onSend(msg)} disabled={loading} className="btn btn-primary flex-1 py-2 text-sm disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Record<string, GroupMember>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<SidebarView>('discover');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [requestGroup, setRequestGroup] = useState<Group | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function loadGroups() {
    setLoading(true);
    const { data: allGroups } = await supabase.from('groups').select('*').order('member_count', { ascending: false });
    let visible: Group[] = allGroups || [];

    if (user) {
      const { data: myMemberships } = await supabase.from('group_members').select('group_id, role, id, joined_at').eq('user_id', user.id);
      const map: Record<string, GroupMember> = {};
      (myMemberships || []).forEach(m => { map[m.group_id] = m as GroupMember; });
      setMemberships(map);
      const myIds = new Set(Object.keys(map));
      visible = visible.filter(g => g.privacy_type !== 'secret' || myIds.has(g.id));
    } else {
      visible = visible.filter(g => g.privacy_type === 'public');
    }
    setGroups(visible);
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel('groups_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, loadGroups).subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.id]);

  const myGroupIds = useMemo(() => new Set(Object.keys(memberships)), [memberships]);
  const managingIds = useMemo(() => new Set(Object.entries(memberships).filter(([, m]) => m.role === 'admin').map(([id]) => id)), [memberships]);

  const baseList = useMemo(() => {
    if (view === 'mine') return groups.filter(g => myGroupIds.has(g.id));
    if (view === 'managing') return groups.filter(g => managingIds.has(g.id));
    if (view === 'popular') return [...groups].sort((a, b) => b.member_count - a.member_count).slice(0, 30);
    return groups;
  }, [groups, view, myGroupIds, managingIds]);

  const filteredGroups = useMemo(() => {
    let result = baseList;
    if (selectedCategory !== 'Todos') result = result.filter(g => g.category === selectedCategory);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter(g => g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)); }
    return result;
  }, [baseList, search, selectedCategory]);

  async function handleJoin(group: Group) {
    if (!user) return;
    if (group.privacy_type === 'public') {
      const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'member' });
      if (!error) loadGroups();
    } else {
      setRequestGroup(group);
    }
  }

  async function handleSendRequest(message: string) {
    if (!user || !requestGroup) return;
    setRequestLoading(true);
    await supabase.from('group_join_requests').insert({ group_id: requestGroup.id, user_id: user.id, message: message.trim(), status: 'pending' });
    setRequestLoading(false);
    setRequestGroup(null);
  }

  async function handleLeave(groupId: string) {
    if (!user) return;
    const member = memberships[groupId];
    if (member?.role === 'admin') return;
    const { error } = await supabase.from('group_members').delete().eq('id', member.id);
    if (!error) loadGroups();
  }

  const viewTitles: Record<SidebarView, { title: string; subtitle: string }> = {
    discover: { title: 'Descobrir Grupos', subtitle: 'Explora comunidades de toda a plataforma' },
    popular: { title: 'Mais Populares', subtitle: 'Os grupos com mais membros activos' },
    mine: { title: 'Meus Grupos', subtitle: 'Comunidades de que fazes parte' },
    managing: { title: 'Que Administro', subtitle: 'Grupos onde tens controlo total' },
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Mobile header */}
        <div className="flex items-center justify-between mb-4 md:hidden">
          <button onClick={() => setMobileSidebar(true)} className="flex items-center gap-2 bg-bg2 border border-border rounded-xl px-3 py-2 text-sm text-text2">
            <Menu size={15} /> Menu
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs gap-1.5 py-2">
            <Plus size={13} /> Criar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">

          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar view={view} setView={setView} myGroupsCount={myGroupIds.size} managingCount={managingIds.size} onCreateClick={() => setShowCreate(true)} />
          </div>

          {/* Mobile sidebar drawer */}
          {mobileSidebar && (
            <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileSidebar(false)}>
              <div className="absolute left-0 top-0 bottom-0 w-72 p-3" onClick={e => e.stopPropagation()}>
                <Sidebar view={view} setView={setView} myGroupsCount={myGroupIds.size} managingCount={managingIds.size} onCreateClick={() => { setShowCreate(true); setMobileSidebar(false); }} onClose={() => setMobileSidebar(false)} />
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h1 className="font-bebas text-3xl tracking-wide text-text">{viewTitles[view].title}</h1>
                <p className="text-xs text-text3 mt-0.5">{viewTitles[view].subtitle}</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="hidden md:flex btn btn-primary text-sm gap-2">
                <Plus size={15} /> Criar Grupo
              </button>
            </div>

            {/* Search + categories */}
            <div className="flex flex-col gap-3 mb-5">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar grupos por nome ou descrição..."
                  className="input w-full pl-10 text-sm"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedCategory === cat ? 'bg-purple text-white border-purple' : 'bg-bg2 text-text2 border-border hover:border-border2'
                    }`}
                  >
                    {cat !== 'Todos' && CATEGORY_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-bg2 border border-border rounded-2xl animate-pulse" />)}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-16 bg-bg2 border border-border rounded-2xl">
                <div className="text-5xl mb-3">{view === 'mine' ? '👥' : view === 'managing' ? '👑' : '🔍'}</div>
                <h3 className="font-rajdhani font-bold text-lg text-text mb-1">
                  {view === 'mine' ? 'Ainda não entraste em nenhum grupo' : view === 'managing' ? 'Não administras nenhum grupo' : 'Nenhum grupo encontrado'}
                </h3>
                <p className="text-text3 text-sm mb-4">
                  {view === 'mine' || view === 'managing' ? 'Explora e entra em comunidades que combinam contigo.' : 'Tenta outro termo de busca ou categoria.'}
                </p>
                {(view === 'mine' || view === 'managing') && (
                  <button onClick={() => setView('discover')} className="btn btn-ghost text-sm">Descobrir grupos</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isMember={!!memberships[group.id]}
                    isAdmin={memberships[group.id]?.role === 'admin'}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={loadGroups} />}
      {requestGroup && <RequestJoinModal onClose={() => setRequestGroup(null)} onSend={handleSendRequest} loading={requestLoading} />}
    </div>
  );
}
