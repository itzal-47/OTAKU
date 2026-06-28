import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';
import { CLASS_INFO, type CharacterClass, type Character, type UserQuest, type UserBadge, type Badge } from '../types/index';
import {
  Swords, Trophy, TrendingUp, Settings, LogOut, Target, Award,
  Sparkles, CheckCircle2, Circle, Flame, Copy, Check, Crown, Star
} from 'lucide-react';

interface Duel {
  id: string;
  opponent_name: string;
  opponent_class: CharacterClass;
  result: 'win' | 'loss' | 'draw';
  xp_earned: number;
  created_at: string;
}

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const [userCharacter, setUserCharacter] = useState<Character | null>(null);
  const [recentDuels, setRecentDuels] = useState<Duel[]>([]);
  const [dailyQuests, setDailyQuests] = useState<UserQuest[]>([]);
  const [userBadges, setUserBadges] = useState<(UserBadge & { badge: Badge })[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState({ from: 0, to: 0 });
  
  // Novos estados para os Contadores Reais e Copiar ID
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    async function loadData() {
      try {
        // Carrega dados do Personagem
        const { data: charData } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        setUserCharacter(charData);

        // Busca contadores de Seguidores e Seguindo em tempo real
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
        ]);

        setFollowerCount(followersRes.count || 0);
        setFollowingCount(followingRes.count || 0);

        if (charData) {
          const prevLevel = parseInt(localStorage.getItem('prevLevel') || '0');
          if (charData.level > prevLevel && prevLevel > 0) {
            setLevelUpData({ from: prevLevel, to: charData.level });
            setShowLevelUp(true);
            setTimeout(() => setShowLevelUp(false), 5000);
          }
          localStorage.setItem('prevLevel', charData.level.toString());

          // Get recent duels
          const { data: duels } = await supabase
            .from('duels')
            .select(`id, created_at, result, xp_reward, challenger_id, opponent_id`)
            .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(10);

          if (duels && duels.length > 0) {
            const opponentIds = duels.map(d =>
              d.challenger_id === userId ? d.opponent_id : d.challenger_id
            ).filter(Boolean);

            const { data: oppChars } = await supabase
              .from('characters')
              .select('user_id, name, class')
              .in('user_id', opponentIds);

            const formattedDuels: Duel[] = duels.map(duel => {
              const oppId = duel.challenger_id === userId ? duel.opponent_id : duel.challenger_id;
              const oppChar = oppChars?.find(c => c.user_id === oppId);
              return {
                id: duel.id,
                opponent_name: oppChar?.name || 'Unknown',
                opponent_class: oppChar?.class as CharacterClass || 'ninja',
                result: duel.result as 'win' | 'loss' | 'draw',
                xp_earned: duel.xp_reward || 0,
                created_at: duel.created_at
              };
            });

            setRecentDuels(formattedDuels);
          }

          await loadUserQuests(userId);

          const { data: badgesData } = await supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', userId)
            .order('earned_at', { ascending: false });

          setUserBadges((badgesData as any) || []);
        }

        await supabase.from('user_settings').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [user?.id]);

  async function loadUserQuests(userId: string) {
    try {
      const { data: activeQuests } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'daily');

      if (!activeQuests || activeQuests.length === 0) return;

      const { data: userQuestsData } = await supabase
        .from('user_quests')
        .select('*, quest:quests(*)')
        .eq('user_id', userId)
        .in('quest_id', activeQuests.map(q => q.id))
        .gte('expires_at', new Date().toISOString());

      if (!userQuestsData || userQuestsData.length < activeQuests.length) {
        const existingIds = new Set(userQuestsData?.map(uq => uq.quest_id) || []);
        const toCreate = activeQuests.filter(q => !existingIds.has(q.id));

        if (toCreate.length > 0) {
          await supabase.from('user_quests').insert(
            toCreate.map(quest => ({
              user_id: userId,
              quest_id: quest.id,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }))
          );

          const { data: newData } = await supabase
            .from('user_quests')
            .select('*, quest:quests(*)')
            .eq('user_id', userId)
            .in('quest_id', activeQuests.map(q => q.id))
            .gte('expires_at', new Date().toISOString());

          setDailyQuests((newData as UserQuest[]) || []);
        } else {
          setDailyQuests((userQuestsData as UserQuest[]) || []);
        }
      } else {
        setDailyQuests((userQuestsData as UserQuest[]) || []);
      }
    } catch (err) {
      console.error('Error loading quests:', err);
    }
  }

  function copyIdToClipboard() {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const xpProgress = userCharacter ? (userCharacter.xp % 100) : 0;
  const xpForNextLevel = userCharacter ? (userCharacter.level * 100) : 100;

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-2 border-border2 border-t-purple animate-spin mx-auto mb-4" />
          <p className="text-sm text-text3">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center">
          <h1 className="font-bebas text-4xl text-text mb-4">Precisas de entrar</h1>
          <Link to="/login" className="btn btn-primary btn-lg">Entrar na Arena</Link>
        </div>
      </div>
    );
  }

  const characterInfo = userCharacter?.class ? CLASS_INFO[userCharacter.class as CharacterClass] : null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center animate-bounce-slow">
            <div className="text-8xl mb-4 animate-pulse">🎉</div>
            <h2 className="font-bebas text-6xl text-gradient mb-2">LEVEL UP!</h2>
            <p className="text-2xl text-text mb-4">{levelUpData.from} → {levelUpData.to}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header Consertado e Atualizado */}
        <div className="bg-bg2 border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-5xl relative shadow-lg">
              {characterInfo?.emoji || '⚔️'}
              {userCharacter && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-bg2 rounded-full flex items-center justify-center text-xs font-bold border-2 border-purple text-white">
                  {userCharacter.level}
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="font-bebas text-4xl tracking-wide text-text">
                  {profile?.username || 'Guerreiro'}
                </h1>
                {profile?.title && (
                  <span className="text-[10px] bg-amber/10 text-amber px-2 py-0.5 rounded-full border border-amber/20 uppercase font-bold tracking-wider">
                    {profile.title}
                  </span>
                )}
              </div>

              {/* Bloco de Copiar ID adicionado */}
              <div className="flex items-center gap-1.5 text-xs text-text3 bg-bg3/60 px-2 py-1 rounded-md w-fit border border-border/40">
                <span className="font-mono">ID: {user.id.substring(0, 8)}...</span>
                <button 
                  onClick={copyIdToClipboard}
                  className="hover:text-purple transition-colors p-0.5"
                  title="Copiar ID Completo"
                >
                  {copied ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="text-sm text-text2 flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                <span className="font-medium text-purple">{characterInfo?.name || 'Membro'}</span>
                <span className="text-text3">·</span>
                <span>Nível {userCharacter?.level || 1}</span>
                {profile?.province && (
                  <>
                    <span className="text-text3">·</span>
                    <span className="text-text3">📍 {profile.province}</span>
                  </>
                )}
              </div>

              {/* Grid de Seguidores Idêntico ao Perfil Público */}
              <div className="flex items-center gap-6 pt-3 border-t border-border/40 mt-2">
                <div className="text-center sm:text-left">
                  <div className="font-bebas text-xl text-text">{followerCount}</div>
                  <div className="text-[11px] uppercase tracking-wider text-text3">Seguidores</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="font-bebas text-xl text-text">{followingCount}</div>
                  <div className="text-[11px] uppercase tracking-wider text-text3">Seguindo</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="font-bebas text-xl text-text">
                    {userCharacter ? (userCharacter.wins + userCharacter.losses + userCharacter.draws) : 0}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-text3">Duelos</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 self-end md:self-center">
            <Link to="/settings" className="btn btn-ghost p-3" title="Definições">
              <Settings size={20} />
            </Link>
          </div>
        </div>

        {!userCharacter ? (
          <div className="bg-bg2 border border-border rounded-2xl p-12 text-center">
            <div className="text-6xl mb-6">🎭</div>
            <h2 className="font-bebas text-3xl text-text mb-4">Sem Personagem Criado</h2>
            <p className="text-text2 max-w-md mx-auto mb-8">
              Cria o teu personagem para começar a duelar, ganhar XP e subir no ranking nacional.
            </p>
            <Link to="/criar-personagem" className="btn btn-danger btn-lg">Criar Agora</Link>
          </div>
        ) : (
          <>
            {/* Daily Quests */}
            {dailyQuests.length > 0 && (
              <div className="bg-bg2 border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="text-purple" size={20} />
                  <h3 className="font-rajdhani font-bold text-lg text-text">Missões Diárias</h3>
                  <span className="ml-auto text-xs text-text3">
                    {dailyQuests.filter(q => q.completed).length}/{dailyQuests.length} completas
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {dailyQuests.map(uq => {
                    const quest = uq.quest;
                    if (!quest) return null;
                    const progress = Math.min(uq.progress, quest.objective_count);
                    const isComplete = uq.completed || progress >= quest.objective_count;

                    return (
                      <div
                        key={uq.id}
                        className={`p-3 rounded-xl border ${isComplete ? 'bg-teal/10 border-teal/30' : 'bg-bg3 border-border'}`}
                      >
                        <div className="flex items-start gap-2">
                          {isComplete ? (
                            <CheckCircle2 className="text-teal flex-shrink-0" size={18} />
                          ) : (
                            <Circle className="text-text3 flex-shrink-0" size={18} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text">{quest.title}</div>
                            <div className="text-xs text-text3 mt-0.5">{quest.description}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isComplete ? 'bg-teal' : 'bg-purple'} rounded-full transition-all`}
                                  style={{ width: `${(progress / quest.objective_count) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-text3">{progress}/{quest.objective_count}</span>
                            </div>
                          </div>
                          <div className="text-xs text-amber font-semibold">+{quest.xp_reward} XP</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Badges Section */}
            {userBadges.length > 0 && (
              <div className="bg-bg2 border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="text-amber" size={20} />
                  <h3 className="font-rajdhani font-bold text-lg text-text">Conquistas</h3>
                  <span className="ml-auto text-xs text-text3">{userBadges.length} badges</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {userBadges.slice(0, 8).map(ub => (
                    <div
                      key={ub.id}
                      className="flex items-center gap-2 px-3 py-2 bg-bg3 rounded-lg"
                      title={ub.badge?.description}
                    >
                      <span className="text-xl">{ub.badge?.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-text">{ub.badge?.name}</div>
                        <div className={`text-xs ${
                          ub.badge?.rarity === 'legendary' ? 'text-amber' :
                          ub.badge?.rarity === 'epic' ? 'text-purple2' :
                          ub.badge?.rarity === 'rare' ? 'text-purple' : 'text-text3'
                        }`}>
                          +{ub.badge?.xp_reward} XP
                        </div>
                      </div>
                    </div>
                  ))}
                  {userBadges.length > 8 && (
                    <div className="flex items-center px-3 py-2 bg-bg3 rounded-lg text-text3 text-sm">
                      +{userBadges.length - 8} mais
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-bg2 border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple/15 flex items-center justify-center text-purple">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-text3">Nível</span>
                </div>
                <div className="font-bebas text-4xl text-text">{userCharacter.level}</div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-text3 mb-1">
                    <span>XP</span>
                    <span>{userCharacter.xp % 100}/{xpForNextLevel % 100 || 100}</span>
                  </div>
                  <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple to-red rounded-full transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-bg2 border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center text-teal">
                    <Trophy size={20} />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-text3">Vitórias</span>
                </div>
                <div className="font-bebas text-4xl text-teal">{userCharacter.wins}</div>
                <div className="text-xs text-text3 mt-1">{userCharacter.losses} derrotas</div>
              </div>

              <div className="bg-bg2 border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red/15 flex items-center justify-center text-red">
                    <Swords size={20} />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-text3">Duelos</span>
                </div>
                <div className="font-bebas text-4xl text-text">
                  {userCharacter.wins + userCharacter.losses + userCharacter.draws}
                </div>
                <div className="text-xs text-text3 mt-1">
                  {(() => {
                    const total = userCharacter.wins + userCharacter.losses;
                    const winRate = total > 0 ? (userCharacter.wins / total) * 100 : 0;
                    return `${winRate.toFixed(1)}% win rate`;
                  })()}
                </div>
              </div>

              <div className="bg-bg2 border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber/15 flex items-center justify-center text-amber">
                    <Flame size={20} />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-text3">Título</span>
                </div>
                <div className="font-bebas text-2xl text-amber">
                  {userCharacter.title || 'Novato'}
                </div>
                <div className="text-xs text-text3 mt-1">
                  {profile?.province || 'Angola'}
                </div>
              </div>
            </div>

            {/* Character Stats & Recent Duels */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-bg2 border border-border rounded-2xl p-6">
                <h3 className="font-rajdhani font-bold text-lg text-text mb-5">Atributos</h3>
                <div className="space-y-4">
                  {[
                    { label: 'HP', value: userCharacter.hp, max: userCharacter.max_hp, color: 'bg-teal' },
                    { label: 'Ataque', value: userCharacter.attack, max: 100, color: 'bg-red' },
                    { label: 'Defesa', value: userCharacter.defense, max: 100, color: 'bg-purple' },
                    { label: 'Velocidade', value: userCharacter.speed, max: 100, color: 'bg-amber' },
                    { label: 'Especial', value: userCharacter.special, max: 100, color: 'bg-purple2' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-text2">{stat.label}</span>
                        <span className="text-text font-semibold">{stat.value}/{stat.max}</span>
                      </div>
                      <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg2 border border-border rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-rajdhani font-bold text-lg text-text">Duelos Recentes</h3>
                  <Link to="/arena" className="text-xs text-purple2 hover:underline">Ver todos</Link>
                </div>
                {recentDuels.length === 0 ? (
                  <div className="text-center py-8 text-text3">
                    <Swords className="mx-auto mb-3 opacity-30" size={32} />
                    <p className="text-sm">Sem duelos ainda</p>
                    <Link to="/arena" className="btn btn-ghost mt-4 text-xs px-4 py-2">
                      Primeiro duelo
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentDuels.slice(0, 5).map(duel => (
                      <div key={duel.id} className="flex items-center gap-3 p-3 bg-bg3 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-bg4 flex items-center justify-center text-lg">
                          {CLASS_INFO[duel.opponent_class]?.emoji || '⚔️'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text">{duel.opponent_name}</div>
                          <div className="text-xs text-text3">
                            {new Date(duel.created_at).toLocaleDateString('pt-AO')}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          duel.result === 'win' ? 'bg-teal/15 text-teal' : duel.result === 'loss' ? 'bg-red/15 text-red' : 'bg-amber/15 text-amber'
                        }`}>
                          {duel.result === 'win' ? 'Vitória' : duel.result === 'loss' ? 'Derrota' : 'Empate'}
                        </div>
                        <div className="text-xs text-purple2 font-semibold">+{duel.xp_earned} XP</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-bg2 border border-border rounded-2xl p-6">
              <h3 className="font-rajdhani font-bold text-lg text-text mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Link to="/arena" className="btn btn-danger justify-center py-4">
                  <Swords size={20} />
                  Novo Duelo
                </Link>
                <Link to="/rankings" className="btn btn-ghost justify-center py-4">
                  <Trophy size={20} />
                  Rankings
                </Link>
                <Link to="/clas" className="btn btn-ghost justify-center py-4">
                  <Crown size={20} />
                  Clãs
                </Link>
                <Link to="/torneios" className="btn btn-ghost justify-center py-4">
                  <Star size={20} />
                  Torneios
                </Link>
                <button onClick={signOut} className="btn btn-ghost justify-center py-4 text-text3">
                  <LogOut size={20} />
                  Sair
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
