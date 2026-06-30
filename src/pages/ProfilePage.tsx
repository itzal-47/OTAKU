import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { CLASS_INFO, type CharacterClass, type UserBadge, type Badge, type UserProfile } from '../types/index';
import { Trophy, Swords, TrendingUp, Medal, Crown, Shield, MessageSquare, Star, Copy, Check, Award, MapPin, User, Sparkles } from 'lucide-react';
import FollowButton from '../components/FollowButton';
import { SkeletonBlock, SkeletonCircle } from '../components/Skeleton';
import { handleError } from '../lib/errorHandler';

export default function ProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<{
    id: string;
    name: string;
    class: CharacterClass;
    level: number;
    xp: number;
    hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    speed: number;
    special: number;
    wins: number;
    losses: number;
    draws: number;
    title?: string;
  } | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userBadges, setUserBadges] = useState<(UserBadge & { badge: Badge })[]>([]);
  const [clanInfo, setClanInfo] = useState<{ name: string; tag: string; role: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, city, province, created_at, is_verified, role, title, title_color')
        .eq('username', username)
        .maybeSingle();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load character
      const { data: charData } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', profileData.id)
        .maybeSingle();

      setCharacter(charData);

      if (charData) {
        // Conta quantos personagens têm MAIS vitórias → posição = esse número + 1
        // Antes carregava TODOS os personagens para fazer findIndex — muito pesado
        const { count } = await supabase
          .from('characters')
          .select('id', { count: 'exact', head: true })
          .gt('wins', charData.wins);
        setRank((count || 0) + 1);
      }

      // Load followers count
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id)
      ]);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);

      // Load badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', profileData.id)
        .order('earned_at', { ascending: false })
        .limit(8);

      setUserBadges((badgesData as any) || []);

      // Load clan info
      const { data: clanMember } = await supabase
        .from('clan_members')
        .select('role, clan:clans(name, tag)')
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (clanMember) {
        setClanInfo({
          name: (clanMember.clan as any)?.name,
          tag: (clanMember.clan as any)?.tag,
          role: clanMember.role,
        });
      }

    } catch (error) {
      handleError(error, () => {}, { context: 'carregar perfil', silent: true });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header skeleton */}
          <div className="bg-bg2 border border-border rounded-2xl overflow-hidden animate-pulse">
            <div className="h-36 bg-bg3" />
            <div className="px-6 pb-6 -mt-10">
              <div className="flex items-end gap-4 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-bg3 flex-shrink-0" />
                <div className="flex-1 pb-2 space-y-2">
                  <SkeletonBlock className="h-6 w-40" />
                  <SkeletonBlock className="h-3.5 w-24" />
                </div>
              </div>
              <div className="flex gap-6 pt-4 border-t border-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <SkeletonBlock className="h-5 w-10" />
                    <SkeletonBlock className="h-2.5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-bg2 border border-border rounded-2xl animate-pulse" />)}
          </div>
          {/* Attributes skeleton */}
          <div className="h-40 bg-bg2 border border-border rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="font-bebas text-4xl text-text mb-4">Usuário não encontrado</h1>
          <Link to="/rankings" className="btn btn-ghost">Ver Rankings</Link>
        </div>
      </div>
    );
  }

  const classInfo = character ? CLASS_INFO[character.class] : null;
  const isOwnProfile = user?.id === profile.id;
  const totalMatches = character ? character.wins + character.losses + character.draws : 0;
  const winRate = totalMatches > 0 ? ((character?.wins || 0) / totalMatches) * 100 : 0;

  function copyUserId() {
    if (profile?.id) {
      navigator.clipboard.writeText(profile.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-slate-950/10">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-6 shadow-xl relative">
          {/* Banner */}
          <div className="h-36 bg-gradient-to-r from-purple/20 via-bg3/80 to-red/10 relative border-b border-border/30">
            {classInfo ? (
              <div className="absolute right-6 top-6 text-7xl opacity-20 animate-pulse-slow">{classInfo.emoji}</div>
            ) : (
              <div className="absolute right-6 top-6 text-7xl opacity-10"><User size={72} className="text-purple" /></div>
            )}
            
            {/* Tag Indicadora se tem RPG ativo ou se é apenas Usuário Comunidade */}
            <div className="absolute left-6 top-4 flex items-center gap-2">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-md border backdrop-blur-sm ${
                character 
                  ? 'bg-purple/20 text-purple-300 border-purple/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {character ? '⚔️ Ficha RPG Ativa' : '👤 Perfil Comunidade'}
              </span>
            </div>
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 -mt-12 relative">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              {/* Avatar Dinâmico */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-bg shadow-xl flex items-center justify-center text-4xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple/30 to-red/20 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 filter drop-shadow-md">
                  {classInfo?.emoji || '👤'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 pt-2 md:pt-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="font-bebas text-3xl tracking-wide text-text">{profile.username}</h1>

                  {/* Title (FUNDADOR / CARGOS) */}
                  {profile.title && (
                    <span className={`px-3 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${
                      profile.title_color === 'gold'
                        ? 'bg-gradient-to-r from-amber via-yellow to-amber text-bg animate-pulse shadow-[0_0_15px_rgba(245,166,35,0.5)]'
                        : 'bg-purple/20 text-purple'
                    }`}>
                      {profile.title}
                    </span>
                  )}

                  {/* Verified Badge */}
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 text-teal" title="Conta Verificada">
                      <Shield size={16} className="fill-current/20" />
                    </span>
                  )}

                  {rank && rank <= 3 && (
                    <span className="text-xl animate-bounce-slow">
                      {rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>

                {/* User ID */}
                <div className="flex items-center gap-2 mb-2 bg-bg3/50 px-2 py-0.5 rounded border border-border/40 w-fit">
                  <span className="text-[11px] font-mono text-text3">ID: {profile.id.substring(0, 8)}...</span>
                  <button
                    onClick={copyUserId}
                    className="text-text3 hover:text-purple transition-colors p-0.5"
                    title="Copiar ID completo"
                  >
                    {copiedId ? <Check size={12} className="text-teal" /> : <Copy size={12} />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-text2 font-medium">
                  {character ? (
                    <>
                      <span className="text-purple font-bold uppercase tracking-wider">{classInfo?.name}</span>
                      <span className="text-text3">·</span>
                      <span className="text-text">Nível {character.level}</span>
                    </>
                  ) : (
                    <span className="text-text3 italic flex items-center gap-1">
                      <Sparkles size={14} className="text-amber-500" /> Cidadão de KambaCity
                    </span>
                  )}
                  {profile.province && (
                    <>
                      <span className="text-text3">·</span>
                      <span className="flex items-center gap-0.5 text-text3">
                        <MapPin size={14} className="text-red-400" /> {profile.province}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 self-start md:self-end mt-4 md:mt-0">
                {isOwnProfile ? (
                  <Link to="/settings" className="btn btn-ghost text-xs uppercase tracking-wider border border-border">
                    Editar Perfil
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/messages"
                      state={{ startChatWith: profile.id }}
                      className="btn btn-ghost text-xs uppercase tracking-wider flex items-center gap-2 border border-border"
                    >
                      <MessageSquare size={14} />
                      Chat
                    </Link>
                    <FollowButton
                      targetUserId={profile.id}
                      targetUsername={profile.username}
                      onFollowChange={() => {
                        loadProfile();
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Redes de Conexões e Números */}
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-border/40">
              <div className="text-left">
                <div className="font-bebas text-xl text-text">{followersCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-text3 font-bold">Seguidores</div>
              </div>
              <div className="text-left">
                <div className="font-bebas text-xl text-text">{followingCount}</div>
                <div className="text-[10px] uppercase tracking-widest text-text3 font-bold">Seguindo</div>
              </div>
              {character && (
                <div className="text-left">
                  <div className="font-bebas text-xl text-text">{totalMatches}</div>
                  <div className="text-[10px] uppercase tracking-widest text-text3 font-bold">Duelos</div>
                </div>
              )}
              {clanInfo && (
                <Link to="/clas" className="text-left group block">
                  <div className="font-bebas text-xl text-purple flex items-center gap-1 group-hover:text-purple2 transition-colors">
                    <Shield size={14} className="fill-current/10" />
                    [{clanInfo.tag}]
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-text3 font-bold">{clanInfo.role}</div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Badges Section */}
        {userBadges.length > 0 && (
          <div className="bg-bg2 border border-border rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-amber" size={18} />
              <span className="text-xs uppercase tracking-widest font-black text-text3">Conquistas Desbloqueadas</span>
              <span className="ml-auto bg-bg3 text-text2 text-xs px-2.5 py-0.5 rounded-full font-bold border border-border/40">
                {userBadges.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {userBadges.map(ub => (
                <div
                  key={ub.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                    ub.badge?.rarity === 'legendary' ? 'bg-amber-500/5 border-amber-500/30 text-amber-400' :
                    ub.badge?.rarity === 'epic' ? 'bg-purple-500/5 border-purple-500/30 text-purple-300' :
                    ub.badge?.rarity === 'rare' ? 'bg-blue-500/5 border-blue-500/30 text-blue-300' :
                    'bg-bg3 border-border/60 text-text2'
                  }`}
                  title={ub.badge?.description}
                >
                  <span className="text-xl filter drop-shadow-sm">{ub.badge?.icon}</span>
                  <span className="text-xs font-bold truncate">{ub.badge?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bloco Condicional: Ficha de Atributos vs Sem Personagem */}
        {character ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Trophy className="text-amber" size={16} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text3">Rank Geral</span>
                </div>
                <div className="font-bebas text-3xl tracking-wide text-text">#{rank || '—'}</div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="text-purple" size={16} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text3">Nível Combatente</span>
                </div>
                <div className="font-bebas text-3xl tracking-wide text-text">{character.level}</div>
                <div className="text-[11px] text-text3 font-mono mt-0.5">{character.xp}/{character.level * 100} XP</div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Medal className="text-teal" size={16} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text3">Vitórias</span>
                </div>
                <div className="font-bebas text-3xl tracking-wide text-teal">{character.wins}</div>
                <div className="text-[11px] text-text3 mt-0.5">{character.losses} derrotas</div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Swords className="text-red" size={16} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-text3">Rendimento</span>
                </div>
                <div className="font-bebas text-3xl tracking-wide text-text">{winRate.toFixed(1)}%</div>
                <div className="text-[11px] text-text3 mt-0.5">Win Rate na Arena</div>
              </div>
            </div>

            {/* Character Stats Atributos */}
            <div className="bg-bg2 border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                <h3 className="font-rajdhani font-black text-xl tracking-wide text-text uppercase">
                  🎭 {character.name} <span className="text-purple2">//</span> Atributos Base
                </h3>
                {character.title && (
                  <span className="text-xs font-bold text-amber bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                    🥇 {character.title}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {[
                  { label: 'HP (Vida)', value: character.hp, max: character.max_hp, color: 'bg-teal' },
                  { label: 'Ataque', value: character.attack, max: 100, color: 'bg-red' },
                  { label: 'Defesa', value: character.defense, max: 100, color: 'bg-purple' },
                  { label: 'Velocidade', value: character.speed, max: 100, color: 'bg-amber' },
                  { label: 'Especial', value: character.special, max: 100, color: 'bg-purple2' },
                ].map(stat => (
                  <div key={stat.label} className="bg-bg3/40 p-2.5 rounded-xl border border-border/30">
                    <div className="flex justify-between text-xs mb-1 font-bold">
                      <span className="text-text2">{stat.label}</span>
                      <span className="text-text font-mono">{stat.value}</span>
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
          </>
        ) : (
          /* Estado do Perfil Obscuro Consertado - Mensagem Maravilhosa */
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-purple/5 to-transparent opacity-50 pointer-events-none" />
            <div className="text-5xl mb-4 animate-bounce-slow">🎭</div>
            <h3 className="font-bebas text-2xl tracking-wide text-text mb-2">Viajante da Comunidade</h3>
            <p className="text-sm text-text3 max-w-md mx-auto mb-6">
              Este usuário faz parte da nossa rede de amizades otaku em Angola, mas ainda não despertou o seu herói interior nem criou uma ficha de atributos RPG.
            </p>
            {isOwnProfile && (
              <Link to="/criar-personagem" className="btn btn-danger text-xs font-bold uppercase tracking-wider px-6 py-2.5 bg-gradient-to-r from-purple to-pink-600 border-none shadow-lg">
                Despertar Meu Avatar RPG
              </Link>
            )}
          </div>
        )}

        {/* Back */}
        <div className="mt-8 text-center">
          <Link to="/rankings" className="text-xs uppercase tracking-widest font-black text-text3 hover:text-purple transition-colors">
            ← Consultar Painel de Classificações
          </Link>
        </div>
      </div>
    </div>
  );
}
