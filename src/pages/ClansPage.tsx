
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Shield, Users, Trophy, Plus, Search, X, Crown, Star,
  Swords, ChevronRight, Loader, UserPlus, UserX, Settings, Trash2,
  TrendingUp, Target, Flame, Award, Zap, Gift
} from 'lucide-react';
import type { Clan, ClanMember, ClanRequest } from '../types/index';

interface ClanContribution {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  source: string;
  created_at: string;
  user?: { username: string };
}

interface ClanWithStats extends Clan {
  clan_level?: number;
  clan_xp?: number;
  weekly_contribution?: number;
}

interface LegendaryClan {
  id: string;
  name: string;
  tag: string;
  clan_level?: number;
  weekly_contribution?: number;
  total_members: number;
  logo_url?: string;
}

export default function ClansPage() {
  const { user, profile, character } = useAuth();
  const { showToast } = useToast();
  const [clans, setClans] = useState<ClanWithStats[]>([]);
  const [legendaryClans, setLegendaryClans] = useState<LegendaryClan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClanDetail, setShowClanDetail] = useState<Clan | null>(null);
  const [myClan, setMyClan] = useState<ClanMember | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);
  const [clanRequests, setClanRequests] = useState<ClanRequest[]>([]);
  const [clanContributions, setClanContributions] = useState<ClanContribution[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'contributions' | 'requests' | 'settings'>('overview');

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    description: '',
    min_level: 1,
  });

  useEffect(() => {
    loadClans();
    loadLegendaryClans();
    if (user) loadMyClan();
  }, [user]);

  async function loadClans() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('clans')
        .select('*')
        .order('weekly_contribution', { ascending: false });

      setClans(data || []);
    } catch (error) {
      console.error('Error loading clans:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLegendaryClans() {
    try {
      const { data } = await supabase
        .from('clans')
        .select('id, name, tag, clan_level, weekly_contribution, total_members, logo_url')
        .order('weekly_contribution', { ascending: false })
        .limit(5);

      setLegendaryClans(data || []);
    } catch (error) {
      console.error('Error loading legendary clans:', error);
    }
  }

  async function loadMyClan() {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('clan_members')
        .select('*, clan:clans(*), user:profiles(id, username), character:characters(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      setMyClan(data);

      if (data?.clan_id) {
        loadClanDetails(data.clan_id);
      }
    } catch {
      setMyClan(null);
    }
  }

  async function loadClanDetails(clanId: string) {
    const [membersRes, requestsRes, contribRes] = await Promise.all([
      supabase
        .from('clan_members')
        .select('*, user:profiles(id, username, province), character:characters(name, class, level)')
        .eq('clan_id', clanId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('clan_requests')
        .select('*, user:profiles(id, username)')
        .eq('clan_id', clanId)
        .eq('status', 'pending'),
      supabase
        .from('clan_contributions')
        .select('*, user:profiles(username)')
        .eq('clan_id', clanId)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    setClanMembers(membersRes.data || []);
    setClanRequests(requestsRes.data || []);
    setClanContributions(contribRes.data || []);
  }

  async function handleCreateClan(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !character) {
      showToast('Cria um personagem primeiro', 'info');
      return;
    }

    const profileData = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isSupremeAdmin = profileData.data?.role === 'supreme_admin';
    const isSecondaryAdmin = profileData.data?.role === 'secondary_admin';

    if (!isSupremeAdmin && !isSecondaryAdmin) {
      showToast('Apenas Admins podem criar clãs', 'error');
      return;
    }

    if (myClan) {
      showToast('Já pertences a um clã', 'error');
      return;
    }

    if (createForm.tag.length < 2 || createForm.tag.length > 5) {
      showToast('Tag deve ter 2-5 caracteres', 'error');
      return;
    }

    // Supreme admin creates approved clans instantly; secondary admin needs approval
    const clanStatus = isSupremeAdmin ? 'approved' : 'pending';

    try {
  const clanStatus = isSupremeAdmin ? 'approved' : 'pending';
try {
  const { data: clanData, error: clanError } = await supabase
    .rpc('create_clan', {
      p_name: createForm.name,
      p_tag: createForm.tag,
      p_description: createForm.description,
      p_min_level: createForm.min_level,
      p_status: clanStatus,
    });

  if (clanError) throw clanError;
  if (!clanData) throw new Error('Erro ao criar clã — tenta novamente');

  if (clanStatus === 'approved') {
    showToast('Clã criado e activado!', 'success');
  } else {
    showToast('Clã criado! Aguardando aprovação do Supreme Admin.', 'info');
  }

  setShowCreateModal(false);
  setCreateForm({ name: '', tag: '', description: '', min_level: 1 });
  loadClans();
  loadMyClan();
  loadLegendaryClans();
} catch (error: any) {
  if (error.code === '23505') {
    showToast('Nome ou tag já existe', 'error');
  } else {
    showToast('Erro ao criar clã', 'error');
  }
}
  }

  async function handleJoinRequest(clan: Clan) {
    if (!user) {
      showToast('Entra para pedir entrada', 'info');
      return;
    }

    if (!character) {
      showToast('Cria um personagem primeiro', 'info');
      return;
    }

    if (character.level < clan.min_level) {
      showToast(`Nível mínimo: ${clan.min_level}`, 'error');
      return;
    }

    if (myClan) {
      showToast('Já pertences a um clã', 'error');
      return;
    }

    try {
      await supabase.from('clan_requests').insert({
        clan_id: clan.id,
        user_id: user.id,
      });

      showToast('Pedido enviado!', 'success');
    } catch {
      showToast('Já pediste entrada', 'error');
    }
  }

  async function handleAcceptRequest(requestId: string, userId: string, clanId: string) {
    try {
      await supabase.from('clan_members').insert({
        clan_id: clanId,
        user_id: userId,
        role: 'member',
      });

      await supabase
        .from('clan_requests')
        .update({ status: 'accepted', reviewed_by: user?.id })
        .eq('id', requestId);

      // Add contribution for joining
      await supabase.rpc('add_clan_contribution', {
        p_clan_id: clanId,
        p_user_id: userId,
        p_type: 'xp',
        p_amount: 50,
        p_source: 'new_member'
      });

      showToast('Membro aceite!', 'success');
      loadClanDetails(clanId);
      loadClans();
      loadLegendaryClans();
    } catch {
      showToast('Erro ao aceitar', 'error');
    }
  }

  async function handleRejectRequest(requestId: string, clanId: string) {
    try {
      await supabase
        .from('clan_requests')
        .update({ status: 'rejected', reviewed_by: user?.id })
        .eq('id', requestId);

      showToast('Pedido rejeitado', 'info');
      loadClanDetails(clanId);
    } catch {
      showToast('Erro ao rejeitar', 'error');
    }
  }

  async function handleLeaveClan() {
    if (!myClan || !user) return;

    try {
      await supabase
        .from('clan_members')
        .delete()
        .eq('user_id', user.id);

      if (myClan.role === 'leader') {
        const officers = clanMembers.filter(m => m.role === 'officer');
        if (officers.length > 0) {
          await supabase
            .from('clan_members')
            .update({ role: 'leader' })
            .eq('id', officers[0].id);
          await supabase
            .from('clans')
            .update({ leader_id: officers[0].user_id })
            .eq('id', myClan.clan_id);
        } else {
          const otherMembers = clanMembers.filter(m => m.user_id !== user.id);
          if (otherMembers.length === 0) {
            await supabase.from('clans').delete().eq('id', myClan.clan_id);
          } else {
            await supabase
              .from('clan_members')
              .update({ role: 'leader' })
              .eq('id', otherMembers[0].id);
            await supabase
              .from('clans')
              .update({ leader_id: otherMembers[0].user_id })
              .eq('id', myClan.clan_id);
          }
        }
      }

      showToast('Saíste do clã', 'info');
      setMyClan(null);
      setShowClanDetail(null);
      loadClans();
      loadLegendaryClans();
    } catch {
      showToast('Erro ao sair', 'error');
    }
  }

  async function handlePromoteMember(memberId: string, clanId: string) {
    try {
      await supabase
        .from('clan_members')
        .update({ role: 'officer' })
        .eq('id', memberId);

      showToast('Membro promovido a officer!', 'success');
      loadClanDetails(clanId);
    } catch {
      showToast('Erro ao promover', 'error');
    }
  }

  async function handleKickMember(memberId: string, clanId: string) {
    try {
      await supabase.from('clan_members').delete().eq('id', memberId);

      await supabase.rpc('decrement_clan_members', { p_clan_id: clanId });

      showToast('Membro removido', 'info');
      loadClanDetails(clanId);
      loadClans();
      loadLegendaryClans();
    } catch {
      showToast('Erro ao remover', 'error');
    }
  }

  const filteredClans = clans.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLeader = myClan?.role === 'leader';
  const isOfficer = myClan?.role === 'officer' || isLeader;

  // Calculate clan level progress
  const getClanLevelProgress = (xp: number) => {
    const levelThreshold = 1000;
    const currentLevel = Math.floor(xp / levelThreshold) + 1;
    const progress = (xp % levelThreshold) / levelThreshold * 100;
    return { level: currentLevel, progress };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-14 h-14 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Legendary Clans - Top of home page */}
        {legendaryClans.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-amber/10 via-bg2 to-purple/10 border border-amber/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="text-amber" size={24} />
              <h2 className="font-bebas text-2xl text-text tracking-wide">Clãs Lendários</h2>
              <span className="text-xs bg-amber/20 text-amber px-2 py-1 rounded-full">Semana</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {legendaryClans.map((clan, idx) => (
                <Link
                  key={clan.id}
                  to={`/clas`}
                  onClick={() => {
                    const fullClan = clans.find(c => c.id === clan.id);
                    if (fullClan) setShowClanDetail(fullClan);
                  }}
                  className="flex-shrink-0 min-w-[180px] bg-bg3 border border-border rounded-xl p-4 hover:border-amber/50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber/30 to-purple/30 flex items-center justify-center text-amber font-bold">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-rajdhani font-bold text-text text-sm">{clan.name}</div>
                      <div className="text-xs text-text3">[{clan.tag}]</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text3">
                    <span className="flex items-center gap-1">
                      <Trophy size={12} className="text-amber" /> Nv.{clan.clan_level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={12} className="text-purple" /> {clan.weekly_contribution}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-bebas text-4xl text-text">Clãs</h1>
            <p className="text-text3 text-sm">Une forças com outros guerreiros e domina o ranking</p>
          </div>
          {user && character && !myClan && (profile?.is_admin || profile?.role === 'secondary_admin' || profile?.role === 'supreme_admin') && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
              <Plus size={18} />
              Criar Clã
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar clãs..."
            className="input pl-10 w-full md:w-80"
          />
        </div>

        {/* My Clan Card */}
        {myClan && myClan.clan && (
          <div className="bg-bg2 border border-purple/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-2xl font-bold">
                  {myClan.clan.tag}
                </div>
                <div>
                  <h2 className="font-rajdhani font-bold text-xl text-text">{myClan.clan.name}</h2>
                  <div className="flex items-center gap-3 text-sm text-text3">
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {myClan.clan.total_members} membros
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={14} /> {myClan.clan.total_wins} vitórias
                    </span>
                    <span className="flex items-center gap-1">
                      <Crown size={14} className="text-amber" /> {myClan.role}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => myClan.clan && setShowClanDetail(myClan.clan)} className="btn btn-ghost flex items-center gap-2">
                Ver Dashboard <ChevronRight size={16} />
              </button>
            </div>

            {/* Clan Level Progress */}
            <div className="bg-bg3 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-teal" />
                  Nível do Clã
                </span>
                <span className="font-bebas text-lg text-amber">
                  Nv. {getClanLevelProgress(myClan.clan.clan_xp || 0).level}
                </span>
              </div>
              <div className="h-2 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple via-amber to-red transition-all"
                  style={{ width: `${getClanLevelProgress(myClan.clan.clan_xp || 0).progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text3">
                <span>{myClan.clan.clan_xp || 0} XP total</span>
                <span>+{myClan.clan.weekly_contribution || 0} esta semana</span>
              </div>
            </div>
          </div>
        )}

        {/* Clans Grid */}
        {filteredClans.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Shield className="mx-auto text-text3 mb-4" size={48} />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem clãs</h3>
            <p className="text-text3">Sê o primeiro a criar um clã!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClans.map(clan => {
              const levelInfo = getClanLevelProgress(clan.clan_xp || 0);
              return (
                <div
                  key={clan.id}
                  className="bg-bg2 border border-border rounded-xl p-5 hover:border-purple/50 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple/20 to-red/20 flex items-center justify-center text-lg font-bold">
                      {clan.tag}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-rajdhani font-bold text-text truncate">{clan.name}</h3>
                      <p className="text-xs text-text3">
                        {clan.total_members} membros · Nv. {levelInfo.level}
                      </p>
                    </div>
                    {!clan.is_recruiting && (
                      <span className="text-xs bg-text3/20 text-text3 px-2 py-1 rounded-full">Fechado</span>
                    )}
                  </div>

                  <p className="text-sm text-text2 mb-4 line-clamp-2">{clan.description || 'Sem descrição'}</p>

                  {/* Weekly contribution badge */}
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="flex items-center gap-1 bg-amber/10 text-amber px-2 py-1 rounded-full">
                      <Zap size={12} />
                      {clan.weekly_contribution || 0} XP/semana
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-text3">
                      <span className="flex items-center gap-1">
                        <Trophy size={14} className="text-amber" />
                        {clan.total_wins}
                      </span>
                    </div>
                    {myClan?.clan_id === clan.id ? (
                      <span className="text-xs text-purple font-semibold">Teu Clã</span>
                    ) : clan.is_recruiting && !myClan ? (
                      <button
                        onClick={() => handleJoinRequest(clan)}
                        className="btn btn-ghost text-xs py-1.5 px-3"
                      >
                        Pedir Entrada
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Clan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-rajdhani font-bold text-xl text-text">Criar Clã</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-text3 hover:text-text">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateClan} className="space-y-4">
                <div>
                  <label className="text-sm text-text2 mb-1 block">Nome do Clã</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Os Vikings"
                    className="input"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                </div>

                <div>
                  <label className="text-sm text-text2 mb-1 block">Tag (2-5 caracteres)</label>
                  <input
                    type="text"
                    value={createForm.tag}
                    onChange={e => setCreateForm(f => ({ ...f, tag: e.target.value.toUpperCase() }))}
                    placeholder="Ex: VKG"
                    className="input uppercase"
                    required
                    minLength={2}
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="text-sm text-text2 mb-1 block">Descrição</label>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descrição do clã..."
                    className="input min-h-[80px] resize-none"
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="text-sm text-text2 mb-1 block">Nível Mínimo</label>
                  <input
                    type="number"
                    value={createForm.min_level}
                    onChange={e => setCreateForm(f => ({ ...f, min_level: parseInt(e.target.value) || 1 }))}
                    min={1}
                    max={100}
                    className="input"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost flex-1">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    Criar Clã
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Clan Dashboard Modal */}
        {showClanDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border bg-gradient-to-r from-purple/10 to-amber/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-2xl font-bold">
                      {showClanDetail.tag}
                    </div>
                    <div>
                      <h2 className="font-rajdhani font-bold text-xl text-text">{showClanDetail.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-text3">
                        <span>{showClanDetail.total_members} membros</span>
                        <span>·</span>
                        <span className="text-amber">Nv. {getClanLevelProgress(showClanDetail.clan_xp || 0).level}</span>
                        <span>·</span>
                        <span>{showClanDetail.total_wins} vitórias</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowClanDetail(null)} className="text-text3 hover:text-text">
                    <X size={20} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'overview', label: 'Dashboard', icon: Target },
                    { id: 'members', label: 'Membros', icon: Users },
                    { id: 'contributions', label: 'Contribuições', icon: TrendingUp },
                    ...(isOfficer ? [{ id: 'requests', label: 'Pedidos', icon: UserPlus }] : []),
                    ...(isLeader ? [{ id: 'settings', label: 'Config', icon: Settings }] : []),
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === tab.id ? 'bg-purple text-white' : 'bg-bg3 text-text2 hover:text-text'
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Description */}
                    <p className="text-text2">{showClanDetail.description || 'Sem descrição'}</p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-bg3 rounded-xl p-4 text-center">
                        <Trophy className="mx-auto text-amber mb-2" size={24} />
                        <div className="text-2xl font-bebas text-text">{showClanDetail.total_wins}</div>
                        <div className="text-xs text-text3">Vitórias</div>
                      </div>
                      <div className="bg-bg3 rounded-xl p-4 text-center">
                        <Users className="mx-auto text-purple mb-2" size={24} />
                        <div className="text-2xl font-bebas text-text">{showClanDetail.total_members}</div>
                        <div className="text-xs text-text3">Membros</div>
                      </div>
                      <div className="bg-bg3 rounded-xl p-4 text-center">
                        <TrendingUp className="mx-auto text-teal mb-2" size={24} />
                        <div className="text-2xl font-bebas text-text">{showClanDetail.clan_xp || 0}</div>
                        <div className="text-xs text-text3">XP Total</div>
                      </div>
                      <div className="bg-bg3 rounded-xl p-4 text-center">
                        <Flame className="mx-auto text-red mb-2" size={24} />
                        <div className="text-2xl font-bebas text-text">{showClanDetail.weekly_contribution || 0}</div>
                        <div className="text-xs text-text3">Semana</div>
                      </div>
                    </div>

                    {/* Level Progress */}
                    <div className="bg-bg3 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-rajdhani font-bold text-text flex items-center gap-2">
                          <Award className="text-amber" size={18} />
                          Progresso do Clã
                        </span>
                        <span className="font-bebas text-xl text-amber">
                          Nível {getClanLevelProgress(showClanDetail.clan_xp || 0).level}
                        </span>
                      </div>
                      <div className="h-3 bg-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple via-amber to-red transition-all"
                          style={{ width: `${getClanLevelProgress(showClanDetail.clan_xp || 0).progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-text3 mt-2">
                        Ganhe XP através de duelos, missões e contribuições dos membros.
                      </p>
                    </div>

                    {/* Top contributors this week */}
                    <div>
                      <h3 className="font-rajdhani font-bold text-text mb-3 flex items-center gap-2">
                        <Gift className="text-purple" size={18} />
                        Contribuições Recentes
                      </h3>
                      {clanContributions.length === 0 ? (
                        <p className="text-text3 text-sm">Sem contribuições ainda.</p>
                      ) : (
                        <div className="space-y-2">
                          {clanContributions.slice(0, 5).map(contrib => (
                            <div key={contrib.id} className="flex items-center justify-between bg-bg3 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-text">{contrib.user?.username || 'Utilizador'}</span>
                                <span className="text-xs text-text3">{contrib.source}</span>
                              </div>
                              <span className="text-sm font-semibold text-teal">+{contrib.amount} XP</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-2">
                    {clanMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-3 bg-bg3 rounded-lg p-3">
                        <Link to={`/perfil/${member.user?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-sm font-bold">
                            {member.user?.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-text truncate">{member.user?.username}</div>
                            <div className="text-xs text-text3">
                              {member.character?.name} · Nv. {member.character?.level}
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          {member.role === 'leader' && <Crown className="text-amber" size={16} />}
                          {member.role === 'officer' && <Star className="text-purple" size={16} />}
                          <span className="text-xs text-text3 capitalize">{member.role}</span>
                          {isOfficer && member.user_id !== user?.id && member.role !== 'leader' && (
                            <div className="flex gap-1">
                              {member.role === 'member' && (
                                <button
                                  onClick={() => handlePromoteMember(member.id, showClanDetail.id)}
                                  className="p-1 text-text3 hover:text-purple"
                                  title="Promover a Officer"
                                >
                                  <Star size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleKickMember(member.id, showClanDetail.id)}
                                className="p-1 text-text3 hover:text-red"
                                title="Remover"
                              >
                                <UserX size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'contributions' && (
                  <div>
                    <h3 className="font-rajdhani font-bold text-text mb-4">Histórico de Contribuições</h3>
                    {clanContributions.length === 0 ? (
                      <p className="text-text3 text-center py-8">Sem contribuições registadas ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {clanContributions.map(contrib => (
                          <div key={contrib.id} className="flex items-center justify-between bg-bg3 rounded-lg p-3">
                            <div>
                              <div className="font-semibold text-text text-sm">{contrib.user?.username || 'Utilizador'}</div>
                              <div className="text-xs text-text3">
                                {contrib.source} · {new Date(contrib.created_at).toLocaleDateString('pt-AO')}
                              </div>
                            </div>
                            <span className="text-teal font-semibold">+{contrib.amount} XP</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'requests' && isOfficer && (
                  <div className="space-y-2">
                    {clanRequests.length === 0 ? (
                      <p className="text-text3 text-center py-8">Sem pedidos pendentes</p>
                    ) : (
                      clanRequests.map(req => (
                        <div key={req.id} className="flex items-center gap-3 bg-bg3 rounded-lg p-3">
                          <Link to={`/perfil/${req.user?.username}`} className="flex-1 min-w-0">
                            <div className="font-semibold text-text">{req.user?.username}</div>
                          </Link>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(req.id, req.user_id, showClanDetail.id)}
                              className="btn btn-primary py-1 px-3 text-xs"
                            >
                              Aceitar
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id, showClanDetail.id)}
                              className="btn btn-ghost py-1 px-3 text-xs"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'settings' && isLeader && (
                  <div className="space-y-4">
                    <div className="bg-red/10 border border-red/30 rounded-xl p-4">
                      <h3 className="font-semibold text-red mb-2">Zona de Perigo</h3>
                      <p className="text-sm text-text2 mb-4">Se saires como líder, a liderança será transferida para o officer mais antigo ou membro mais antigo.</p>
                      <button onClick={handleLeaveClan} className="btn btn-danger text-sm">
                        <UserX size={16} />
                        Sair do Clã
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
