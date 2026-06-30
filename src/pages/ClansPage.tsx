import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Shield, Users, Trophy, Plus, Search, X, Crown, Star, ArrowLeft,
  ChevronRight, UserPlus, UserX, Settings, TrendingUp, Target, Flame,
  Award, Zap, Gift, Swords, Info, Sparkles, Lock, ShieldCheck,
} from 'lucide-react';
import type { Clan, ClanMember, ClanRequest } from '../types/index';

interface ClanContribution { id: string; user_id: string; type: string; amount: number; source: string; created_at: string; user?: { username: string }; }
interface ClanWithStats extends Clan { clan_level?: number; clan_xp?: number; weekly_contribution?: number; }
interface LegendaryClan { id: string; name: string; tag: string; clan_level?: number; weekly_contribution?: number; total_members: number; logo_url?: string; }

const SOURCE_LABELS: Record<string, string> = {
  new_member: 'Novo membro', duel_win: 'Vitória em duelo', quest: 'Missão completa', donation: 'Doação', event: 'Evento',
};

function getClanLevelProgress(xp: number) {
  const threshold = 1000;
  const level = Math.floor(xp / threshold) + 1;
  const progress = ((xp % threshold) / threshold) * 100;
  return { level, progress };
}

// ─── Outside: Clan Card ───────────────────────────────────────────────────────

function ClanCard({ clan, myClanId, onJoin, onOpen }: { clan: ClanWithStats; myClanId?: string; onJoin: (c: Clan) => void; onOpen: (c: Clan) => void }) {
  const levelInfo = getClanLevelProgress(clan.clan_xp || 0);
  const isMine = myClanId === clan.id;

  return (
    <button onClick={() => onOpen(clan)} className="text-left bg-bg2 border border-border rounded-2xl overflow-hidden hover:border-amber/40 transition-all duration-200 group flex flex-col">
      <div className="h-14 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f59e0b22, #ef444422)' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-transparent to-transparent" />
      </div>
      <div className="p-4 -mt-7 flex-1 flex flex-col">
        <div className="flex items-end gap-3 mb-2">
          <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-amber/30 to-red/30 border-2 border-bg2 flex items-center justify-center font-bebas text-lg text-amber shadow-lg flex-shrink-0">
            {clan.tag}
          </div>
          <div className="flex-1 min-w-0 pb-0.5">
            <h3 className="font-rajdhani font-bold text-base text-text truncate">{clan.name}</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-text3">
              <Users size={10} /> {clan.total_members} · <Trophy size={10} className="text-amber" /> Nv.{levelInfo.level}
              {!clan.is_recruiting && <span className="flex items-center gap-0.5 text-red"><Lock size={9} /> Fechado</span>}
            </div>
          </div>
        </div>

        <p className="text-xs text-text3 line-clamp-2 mb-3 flex-1">{clan.description || 'Sem descrição.'}</p>

        <div className="flex items-center gap-1.5 mb-3 text-[10px]">
          <span className="flex items-center gap-1 bg-amber/10 text-amber px-2 py-0.5 rounded-full"><Zap size={10} /> {clan.weekly_contribution || 0} XP/sem</span>
          <span className="flex items-center gap-1 bg-bg3 text-text3 px-2 py-0.5 rounded-full"><Swords size={10} /> {clan.total_wins} vit.</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-[11px] text-text3">Nv. mín. {clan.min_level}</span>
          {isMine ? (
            <span className="text-[11px] font-semibold text-amber">★ Teu Clã</span>
          ) : clan.is_recruiting && !myClanId ? (
            <button onClick={e => { e.stopPropagation(); onJoin(clan); }} className="text-[11px] text-purple2 hover:underline font-semibold">Pedir entrada →</button>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ─── Inside: Full Clan War Room ─────────────────────────────────────────────

function ClanWarRoom({
  clan, members, requests, contributions, myRole, currentUserId,
  membersHasMore, membersLoadingMore, onLoadMoreMembers,
  onBack, onJoinRequest, onAccept, onReject, onPromote, onKick, onLeave,
}: {
  clan: Clan & { clan_xp?: number; weekly_contribution?: number };
  members: ClanMember[]; requests: ClanRequest[]; contributions: ClanContribution[];
  myRole?: string; currentUserId?: string;
  membersHasMore?: boolean; membersLoadingMore?: boolean; onLoadMoreMembers?: () => void;
  onBack: () => void; onJoinRequest: () => void;
  onAccept: (id: string, uid: string) => void; onReject: (id: string) => void;
  onPromote: (id: string) => void; onKick: (id: string) => void; onLeave: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'members' | 'contributions' | 'requests' | 'settings'>('overview');
  const isLeader = myRole === 'leader';
  const isOfficer = myRole === 'officer' || isLeader;
  const isMember = !!myRole;
  const levelInfo = getClanLevelProgress(clan.clan_xp || 0);

  const TABS = [
    { id: 'overview', label: 'Quartel-General', icon: Target },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'contributions', label: 'Contribuições', icon: TrendingUp },
    ...(isOfficer ? [{ id: 'requests', label: 'Pedidos', icon: UserPlus, badge: requests.length }] : []),
    ...(isLeader ? [{ id: 'settings', label: 'Comando', icon: Settings }] : []),
  ] as const;

  return (
    <div
      className="min-h-screen -mt-20 pt-20 pb-16"
      style={{ background: 'radial-gradient(ellipse at top, rgba(245,158,11,0.06), transparent 55%), linear-gradient(180deg, #0c0a09, #0a0a0c)' }}
    >
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] -z-10"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, transparent 1px, transparent 3px)' }} />

      <div className="max-w-5xl mx-auto px-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-text3 hover:text-text text-sm mb-4 transition-colors">
          <ArrowLeft size={14} /> Voltar aos Clãs
        </button>

        <div className="relative bg-gradient-to-br from-bg2 via-bg2 to-amber/5 border border-amber/20 rounded-3xl p-6 mb-6 overflow-hidden" style={{ boxShadow: '0 0 40px rgba(245,158,11,0.06)' }}>
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-amber/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber via-red to-purple flex items-center justify-center text-xl sm:text-2xl font-bebas text-white shadow-xl flex-shrink-0">
                {clan.tag}
              </div>
              <div className="min-w-0">
                <h1 className="font-bebas text-2xl sm:text-3xl tracking-wide text-text truncate">{clan.name}</h1>
                <div className="flex items-center gap-3 text-xs text-text3 flex-wrap mt-1">
                  <span className="flex items-center gap-1"><Users size={11} /> {clan.total_members} membros</span>
                  <span className="flex items-center gap-1 text-amber"><Trophy size={11} /> Nv.{levelInfo.level}</span>
                  <span className="flex items-center gap-1"><Swords size={11} /> {clan.total_wins} vitórias</span>
                </div>
              </div>
            </div>

            {!isMember && clan.is_recruiting && (
              <button onClick={onJoinRequest} className="btn btn-primary text-sm py-2 px-4 flex-shrink-0"><UserPlus size={14} /> Pedir Entrada</button>
            )}
            {isMember && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber/10 text-amber flex-shrink-0">
                {myRole === 'leader' ? <Crown size={12} /> : myRole === 'officer' ? <Star size={12} /> : <ShieldCheck size={12} />}
                {myRole === 'leader' ? 'Líder' : myRole === 'officer' ? 'Oficial' : 'Membro'}
              </span>
            )}
          </div>

          <div className="relative flex gap-1.5 mt-5 overflow-x-auto scrollbar-thin">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${active ? 'bg-amber/15 text-amber border border-amber/30' : 'text-text3 hover:text-text hover:bg-bg3 border border-transparent'}`}>
                  <Icon size={13} /> {t.label}
                  {'badge' in t && t.badge! > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red/20 text-red text-[9px] font-bold">{t.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="bg-bg2 border border-border rounded-2xl p-5">
              <p className="text-text2 text-sm leading-relaxed">{clan.description || 'Sem descrição definida pelo líder.'}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Trophy, color: 'text-amber', label: 'Vitórias', value: clan.total_wins },
                { icon: Users, color: 'text-purple', label: 'Membros', value: clan.total_members },
                { icon: TrendingUp, color: 'text-teal', label: 'XP Total', value: clan.clan_xp || 0 },
                { icon: Flame, color: 'text-red', label: 'Esta semana', value: clan.weekly_contribution || 0 },
              ].map((s, i) => (
                <div key={i} className="bg-bg2 border border-border rounded-xl p-4 text-center">
                  <s.icon className={`mx-auto ${s.color} mb-2`} size={22} />
                  <div className="text-xl font-bebas text-text">{s.value}</div>
                  <div className="text-[11px] text-text3">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-bg2 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-rajdhani font-bold text-text flex items-center gap-2"><Award className="text-amber" size={17} /> Progresso do Clã</span>
                <span className="font-bebas text-lg text-amber">Nível {levelInfo.level}</span>
              </div>
              <div className="h-3 bg-bg rounded-full overflow-hidden border border-border">
                <div className="h-full bg-gradient-to-r from-purple via-amber to-red transition-all" style={{ width: `${levelInfo.progress}%`, boxShadow: '0 0 10px rgba(245,158,11,0.5)' }} />
              </div>
              <p className="text-xs text-text3 mt-2">Ganham XP através de duelos vencidos, missões completas e novas adesões de membros.</p>
            </div>

            <div className="bg-bg2 border border-border rounded-xl p-4">
              <h3 className="font-rajdhani font-bold text-text mb-3 flex items-center gap-2"><Gift className="text-purple" size={17} /> Contribuições Recentes</h3>
              {contributions.length === 0 ? <p className="text-text3 text-sm">Sem contribuições ainda.</p> : (
                <div className="space-y-2">
                  {contributions.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-bg3 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 text-sm"><span className="text-text">{c.user?.username || 'Utilizador'}</span><span className="text-xs text-text3">{SOURCE_LABELS[c.source] || c.source}</span></div>
                      <span className="text-sm font-semibold text-teal">+{c.amount} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="bg-bg2 border border-border rounded-2xl p-4 space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-bg3 rounded-xl p-3">
                <Link to={`/perfil/${m.user?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber to-red flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                    {m.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-text truncate text-sm">{m.user?.username}</div>
                    <div className="text-[11px] text-text3">{m.character?.name} · Nv.{m.character?.level}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.role === 'leader' && <Crown className="text-amber" size={15} />}
                  {m.role === 'officer' && <Star className="text-purple" size={15} />}
                  <span className="text-xs text-text3 capitalize hidden sm:inline">{m.role}</span>
                  {isOfficer && m.user_id !== currentUserId && m.role !== 'leader' && (
                    <div className="flex gap-1">
                      {m.role === 'member' && <button onClick={() => onPromote(m.id)} className="p-1 text-text3 hover:text-purple" title="Promover"><Star size={14} /></button>}
                      <button onClick={() => onKick(m.id)} className="p-1 text-text3 hover:text-red" title="Remover"><UserX size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {membersHasMore && (
              <button
                onClick={onLoadMoreMembers}
                disabled={membersLoadingMore}
                className="w-full py-2.5 text-xs font-semibold text-amber hover:bg-bg3 rounded-xl transition-colors disabled:opacity-50"
              >
                {membersLoadingMore ? 'Carregando...' : 'Carregar mais membros'}
              </button>
            )}
          </div>
        )}

        {tab === 'contributions' && (
          <div className="bg-bg2 border border-border rounded-2xl p-4">
            <h3 className="font-rajdhani font-bold text-text mb-3">Histórico Completo</h3>
            {contributions.length === 0 ? <p className="text-text3 text-center py-8 text-sm">Sem contribuições registadas.</p> : (
              <div className="space-y-2">
                {contributions.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-bg3 rounded-lg p-3">
                    <div>
                      <div className="font-semibold text-text text-sm">{c.user?.username || 'Utilizador'}</div>
                      <div className="text-[11px] text-text3">{SOURCE_LABELS[c.source] || c.source} · {new Date(c.created_at).toLocaleDateString('pt-AO')}</div>
                    </div>
                    <span className="text-teal font-semibold text-sm">+{c.amount} XP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'requests' && isOfficer && (
          <div className="bg-bg2 border border-border rounded-2xl p-4 space-y-2">
            {requests.length === 0 ? <p className="text-text3 text-center py-8 text-sm">Sem pedidos pendentes</p> : requests.map(r => (
              <div key={r.id} className="flex items-center gap-3 bg-bg3 rounded-lg p-3">
                <Link to={`/perfil/${r.user?.username}`} className="flex-1 min-w-0"><div className="font-semibold text-text text-sm">{r.user?.username}</div></Link>
                <div className="flex gap-2">
                  <button onClick={() => onAccept(r.id, r.user_id)} className="btn btn-primary py-1 px-3 text-xs">Aceitar</button>
                  <button onClick={() => onReject(r.id)} className="btn btn-ghost py-1 px-3 text-xs">Rejeitar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && isLeader && (
          <div className="bg-red/10 border border-red/30 rounded-2xl p-5">
            <h3 className="font-semibold text-red mb-2">Zona de Comando</h3>
            <p className="text-sm text-text2 mb-4">Se saíres como líder, a liderança passa automaticamente para o oficial mais antigo, ou para o membro mais antigo se não houver oficiais.</p>
            <button onClick={onLeave} className="btn btn-danger text-sm"><UserX size={15} /> Sair do Clã</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ClansPage() {
  const { user, profile, character } = useAuth();
  const { showToast } = useToast();
  const [clans, setClans] = useState<ClanWithStats[]>([]);
  const [legendaryClans, setLegendaryClans] = useState<LegendaryClan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeClanId, setActiveClanId] = useState<string | null>(null);
  const [myClan, setMyClan] = useState<ClanMember | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [membersOffset, setMembersOffset] = useState(0);
  const [membersHasMore, setMembersHasMore] = useState(true);
  const [membersLoadingMore, setMembersLoadingMore] = useState(false);
  const MEMBERS_PAGE_SIZE = 25;
  const [clanRequests, setClanRequests] = useState<ClanRequest[]>([]);
  const [clanContributions, setClanContributions] = useState<ClanContribution[]>([]);
  const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '', min_level: 1 });

  useEffect(() => { loadClans(); loadLegendaryClans(); if (user) loadMyClan(); }, [user?.id]);
  useEffect(() => { if (activeClanId) loadClanDetails(activeClanId); }, [activeClanId]);

  async function loadClans() {
    setLoading(true);
    const { data } = await supabase.from('clans').select('*').order('weekly_contribution', { ascending: false });
    setClans(data || []);
    setLoading(false);
  }

  async function loadLegendaryClans() {
    const { data } = await supabase.from('clans').select('id, name, tag, clan_level, weekly_contribution, total_members, logo_url').order('weekly_contribution', { ascending: false }).limit(5);
    setLegendaryClans(data || []);
  }

  async function loadMyClan() {
    if (!user) return;
    const { data } = await supabase.from('clan_members').select('*, clan:clans(*), user:profiles(id, username), character:characters(*)').eq('user_id', user.id).maybeSingle();
    setMyClan(data);
  }

  async function loadClanDetails(clanId: string) {
    const [membersRes, requestsRes, contribRes] = await Promise.all([
      supabase.from('clan_members').select('*, user:profiles(id, username, province), character:characters(name, class, level)').eq('clan_id', clanId).order('joined_at', { ascending: true }).range(0, MEMBERS_PAGE_SIZE - 1),
      supabase.from('clan_requests').select('*, user:profiles(id, username)').eq('clan_id', clanId).eq('status', 'pending'),
      supabase.from('clan_contributions').select('*, user:profiles(username)').eq('clan_id', clanId).order('created_at', { ascending: false }).limit(30),
    ]);
    setClanMembers(membersRes.data || []);
    setMembersOffset(membersRes.data?.length || 0);
    setMembersHasMore((membersRes.data?.length || 0) === MEMBERS_PAGE_SIZE);
    setClanRequests(requestsRes.data || []);
    setClanContributions(contribRes.data || []);
  }

  async function loadMoreMembers() {
    if (!activeClanId || membersLoadingMore || !membersHasMore) return;
    setMembersLoadingMore(true);
    const { data } = await supabase.from('clan_members')
      .select('*, user:profiles(id, username, province), character:characters(name, class, level)')
      .eq('clan_id', activeClanId).order('joined_at', { ascending: true })
      .range(membersOffset, membersOffset + MEMBERS_PAGE_SIZE - 1);
    setClanMembers(prev => [...prev, ...(data || [])]);
    setMembersOffset(prev => prev + (data?.length || 0));
    setMembersHasMore((data?.length || 0) === MEMBERS_PAGE_SIZE);
    setMembersLoadingMore(false);
  }

  async function handleCreateClan(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !character) { showToast('Cria um personagem primeiro', 'info'); return; }
    const profileData = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isSupremeAdmin = profileData.data?.role === 'supreme_admin';
    const isSecondaryAdmin = profileData.data?.role === 'secondary_admin';
    if (!isSupremeAdmin && !isSecondaryAdmin) { showToast('Apenas Admins podem criar clãs', 'error'); return; }
    if (myClan) { showToast('Já pertences a um clã', 'error'); return; }
    if (createForm.tag.length < 2 || createForm.tag.length > 5) { showToast('Tag deve ter 2-5 caracteres', 'error'); return; }

    const clanStatus = isSupremeAdmin ? 'approved' : 'pending';
    try {
      const { data: clanData, error: clanError } = await supabase.rpc('create_clan', {
        p_name: createForm.name, p_tag: createForm.tag, p_description: createForm.description, p_min_level: createForm.min_level, p_status: clanStatus,
      });
      if (clanError) throw clanError;
      if (!clanData) throw new Error('Erro ao criar clã');
      showToast(clanStatus === 'approved' ? 'Clã criado e activado!' : 'Clã criado! Aguardando aprovação.', clanStatus === 'approved' ? 'success' : 'info');
      setShowCreateModal(false);
      setCreateForm({ name: '', tag: '', description: '', min_level: 1 });
      loadClans(); loadMyClan(); loadLegendaryClans();
    } catch (error: any) {
      showToast(error.code === '23505' ? 'Nome ou tag já existe' : 'Erro ao criar clã', 'error');
    }
  }

  async function handleJoinRequest(clan: Clan) {
    if (!user) { showToast('Entra para pedir entrada', 'info'); return; }
    if (!character) { showToast('Cria um personagem primeiro', 'info'); return; }
    if (character.level < clan.min_level) { showToast(`Nível mínimo: ${clan.min_level}`, 'error'); return; }
    if (myClan) { showToast('Já pertences a um clã', 'error'); return; }
    try {
      await supabase.from('clan_requests').insert({ clan_id: clan.id, user_id: user.id });
      showToast('Pedido enviado!', 'success');
    } catch { showToast('Já pediste entrada', 'error'); }
  }

  async function handleAcceptRequest(requestId: string, userId: string) {
    if (!activeClanId) return;
    try {
      await supabase.from('clan_members').insert({ clan_id: activeClanId, user_id: userId, role: 'member' });
      await supabase.from('clan_requests').update({ status: 'accepted', reviewed_by: user?.id }).eq('id', requestId);
      await supabase.rpc('add_clan_contribution', { p_clan_id: activeClanId, p_user_id: userId, p_type: 'xp', p_amount: 50, p_source: 'new_member' });
      showToast('Membro aceite!', 'success');
      loadClanDetails(activeClanId); loadClans(); loadLegendaryClans();
    } catch { showToast('Erro ao aceitar', 'error'); }
  }

  async function handleRejectRequest(requestId: string) {
    if (!activeClanId) return;
    await supabase.from('clan_requests').update({ status: 'rejected', reviewed_by: user?.id }).eq('id', requestId);
    showToast('Pedido rejeitado', 'info');
    loadClanDetails(activeClanId);
  }

  async function handleLeaveClan() {
    if (!myClan || !user || !activeClanId) return;
    try {
      await supabase.from('clan_members').delete().eq('user_id', user.id);
      if (myClan.role === 'leader') {
        const officers = clanMembers.filter(m => m.role === 'officer');
        if (officers.length > 0) {
          await supabase.from('clan_members').update({ role: 'leader' }).eq('id', officers[0].id);
          await supabase.from('clans').update({ leader_id: officers[0].user_id }).eq('id', activeClanId);
        } else {
          const others = clanMembers.filter(m => m.user_id !== user.id);
          if (others.length === 0) await supabase.from('clans').delete().eq('id', activeClanId);
          else {
            await supabase.from('clan_members').update({ role: 'leader' }).eq('id', others[0].id);
            await supabase.from('clans').update({ leader_id: others[0].user_id }).eq('id', activeClanId);
          }
        }
      }
      showToast('Saíste do clã', 'info');
      setMyClan(null); setActiveClanId(null);
      loadClans(); loadLegendaryClans();
    } catch { showToast('Erro ao sair', 'error'); }
  }

  async function handlePromoteMember(memberId: string) {
    if (!activeClanId) return;
    await supabase.from('clan_members').update({ role: 'officer' }).eq('id', memberId);
    showToast('Membro promovido a oficial!', 'success');
    loadClanDetails(activeClanId);
  }

  async function handleKickMember(memberId: string) {
    if (!activeClanId) return;
    await supabase.from('clan_members').delete().eq('id', memberId);
    await supabase.rpc('decrement_clan_members', { p_clan_id: activeClanId });
    showToast('Membro removido', 'info');
    loadClanDetails(activeClanId); loadClans(); loadLegendaryClans();
  }

  const filteredClans = useMemo(() => clans.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.tag.toLowerCase().includes(searchQuery.toLowerCase())), [clans, searchQuery]);
  const activeClan = useMemo(() => clans.find(c => c.id === activeClanId), [clans, activeClanId]);
  const canCreate = profile?.is_admin || profile?.role === 'secondary_admin' || profile?.role === 'supreme_admin';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-16"><div className="w-14 h-14 border-2 border-border2 border-t-amber rounded-full animate-spin" /></div>;
  }

  if (activeClan) {
    return (
      <ClanWarRoom
        clan={activeClan} members={clanMembers} requests={clanRequests} contributions={clanContributions}
        membersHasMore={membersHasMore} membersLoadingMore={membersLoadingMore} onLoadMoreMembers={loadMoreMembers}
        myRole={myClan?.clan_id === activeClan.id ? myClan.role : undefined} currentUserId={user?.id}
        onBack={() => setActiveClanId(null)} onJoinRequest={() => handleJoinRequest(activeClan)}
        onAccept={handleAcceptRequest} onReject={handleRejectRequest}
        onPromote={handlePromoteMember} onKick={handleKickMember} onLeave={handleLeaveClan}
      />
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {legendaryClans.length > 0 && (
          <div className="mb-7 bg-gradient-to-br from-amber/10 via-bg2 to-purple/10 border border-amber/25 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <Crown className="text-amber" size={22} />
                <h2 className="font-bebas text-2xl text-text tracking-wide">Clãs Lendários</h2>
                <span className="text-[10px] bg-amber/20 text-amber px-2 py-0.5 rounded-full font-semibold">Top 5 da Semana</span>
              </div>
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-text3"><Info size={11} /> Reseta toda segunda-feira</span>
            </div>
            <p className="text-[11px] text-text3 mb-4">Classificação pelo XP acumulado pelo clã nos últimos 7 dias — vitórias em duelos, missões e novos membros contam.</p>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {legendaryClans.map((clan, idx) => (
                <button key={clan.id} onClick={() => setActiveClanId(clan.id)} className="flex-shrink-0 min-w-[180px] text-left bg-bg3 border border-border rounded-xl p-4 hover:border-amber/50 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${idx === 0 ? 'bg-gradient-to-br from-amber to-amber/50 text-bg' : 'bg-gradient-to-br from-amber/30 to-purple/30 text-amber'}`}>
                      {idx === 0 ? <Crown size={16} /> : `#${idx + 1}`}
                    </div>
                    <div className="min-w-0"><div className="font-rajdhani font-bold text-text text-sm truncate">{clan.name}</div><div className="text-xs text-text3">[{clan.tag}]</div></div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text3">
                    <span className="flex items-center gap-1"><Trophy size={11} className="text-amber" /> Nv.{clan.clan_level || 1}</span>
                    <span className="flex items-center gap-1"><Zap size={11} className="text-purple" /> {clan.weekly_contribution || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="font-bebas text-4xl text-text tracking-wide">Salão dos Clãs</h1>
            <p className="text-text3 text-sm">Une forças com outros guerreiros e domina o ranking semanal</p>
          </div>
          {user && character && !myClan && canCreate && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2"><Plus size={16} /> Criar Clã</button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" size={16} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar clãs por nome ou tag..." className="input pl-10 w-full md:w-80 text-sm" />
        </div>

        {myClan && myClan.clan && (
          <button onClick={() => setActiveClanId(myClan.clan!.id)} className="text-left w-full bg-bg2 border border-amber/30 rounded-2xl p-5 mb-7 hover:border-amber/50 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber to-red flex items-center justify-center text-xl font-bebas text-white">{myClan.clan.tag}</div>
                <div>
                  <h2 className="font-rajdhani font-bold text-lg text-text">{myClan.clan.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-text3">
                    <span className="flex items-center gap-1"><Users size={12} /> {myClan.clan.total_members}</span>
                    <span className="flex items-center gap-1"><Trophy size={12} /> {myClan.clan.total_wins}</span>
                    <span className="flex items-center gap-1 text-amber"><Crown size={12} /> {myClan.role}</span>
                  </div>
                </div>
              </div>
              <span className="flex items-center gap-1 text-sm text-text3"><ChevronRight size={16} /></span>
            </div>
          </button>
        )}

        {filteredClans.length === 0 ? (
          <div className="text-center py-14 bg-bg2 border border-border rounded-2xl">
            <Shield className="mx-auto text-text3 mb-3" size={40} />
            <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Sem clãs encontrados</h3>
            <p className="text-text3 text-sm">{canCreate ? 'Sê o primeiro a criar um clã!' : 'Aguarda um administrador criar o primeiro clã.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClans.map(clan => <ClanCard key={clan.id} clan={clan} myClanId={myClan?.clan_id} onJoin={handleJoinRequest} onOpen={c => setActiveClanId(c.id)} />)}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-rajdhani font-bold text-xl text-text flex items-center gap-2"><Sparkles size={18} className="text-amber" /> Criar Clã</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-text3 hover:text-text"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateClan} className="space-y-4">
                <div><label className="text-sm text-text2 mb-1 block">Nome do Clã</label><input type="text" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Os Vikings" className="input" required minLength={3} maxLength={30} /></div>
                <div><label className="text-sm text-text2 mb-1 block">Tag (2-5 caracteres)</label><input type="text" value={createForm.tag} onChange={e => setCreateForm(f => ({ ...f, tag: e.target.value.toUpperCase() }))} placeholder="Ex: VKG" className="input uppercase" required minLength={2} maxLength={5} /></div>
                <div><label className="text-sm text-text2 mb-1 block">Descrição</label><textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do clã..." className="input min-h-[80px] resize-none" maxLength={200} /></div>
                <div><label className="text-sm text-text2 mb-1 block">Nível Mínimo</label><input type="number" value={createForm.min_level} onChange={e => setCreateForm(f => ({ ...f, min_level: parseInt(e.target.value) || 1 }))} min={1} max={100} className="input" /></div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
                  <button type="submit" className="btn btn-primary flex-1">Criar Clã</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
