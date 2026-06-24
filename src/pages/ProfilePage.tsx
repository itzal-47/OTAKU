import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { CLASS_INFO, type CharacterClass, type UserBadge, type Badge } from '../types/index';
import { Trophy, Swords, TrendingUp, Clock, Medal, Crown, Users, Award, Shield } from 'lucide-react';
import FollowButton from '../components/FollowButton';

export default function ProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; username: string; city?: string; province?: string; created_at: string } | null>(null);
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

  useEffect(() => {
    loadProfile();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, city, province, created_at')
        .eq('username', username)
        .single();

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
        .single();

      setCharacter(charData);

      if (charData) {
        const { data: allChars } = await supabase
          .from('characters')
          .select('id, wins')
          .order('wins', { ascending: false });

        if (allChars) {
          const pos = allChars.findIndex(c => c.id === charData.id) + 1;
          setRank(pos);
        }
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
        .single();

      if (clanMember) {
        setClanInfo({
          name: (clanMember.clan as any)?.name,
          tag: (clanMember.clan as any)?.tag,
          role: clanMember.role,
        });
      }

    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-14 h-14 rounded-full border-2 border-border2 border-t-purple animate-spin" />
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

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-purple/30 via-bg3 to-red/20 relative">
            {classInfo && (
              <div className="absolute right-4 top-4 text-6xl opacity-30">{classInfo.emoji}</div>
            )}
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 -mt-12 relative">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple to-red flex items-center justify-center text-4xl border-4 border-bg shadow-lg">
                {classInfo?.emoji || '⚔️'}
              </div>

              {/* Info */}
              <div className="flex-1 pt-4 md:pt-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-bebas text-3xl text-text">{profile.username}</h1>
                  {rank && rank <= 3 && (
                    <span className="text-xl">
                      {rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-text3">
                  {character && (
                    <>
                      <span className="text-purple2 font-semibold">{classInfo?.name}</span>
                      <span>·</span>
                      <span>Nv. {character.level}</span>
                    </>
                  )}
                  {profile.province && (
                    <>
                      <span>·</span>
                      <span>📍 {profile.province}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {isOwnProfile ? (
                  <Link to="/settings" className="btn btn-ghost text-sm">
                    Editar Perfil
                  </Link>
                ) : (
                  <FollowButton
                    targetUserId={profile.id}
                    targetUsername={profile.username}
                    onFollowChange={() => {
                      // Refresh counts
                      loadProfile();
                    }}
                  />
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-6 mt-6">
              <button className="text-center">
                <div className="font-bold text-text">{followersCount}</div>
                <div className="text-xs text-text3">Seguidores</div>
              </button>
              <button className="text-center">
                <div className="font-bold text-text">{followingCount}</div>
                <div className="text-xs text-text3">Seguindo</div>
              </button>
              {character && (
                <button className="text-center">
                  <div className="font-bold text-text">{totalMatches}</div>
                  <div className="text-xs text-text3">Duelos</div>
                </button>
              )}
              {clanInfo && (
                <Link to="/clas" className="text-center hover:opacity-80 transition-opacity">
                  <div className="font-bold text-text flex items-center justify-center gap-1">
                    <Shield size={14} className="text-purple" />
                    {clanInfo.tag}
                  </div>
                  <div className="text-xs text-text3 capitalize">{clanInfo.role}</div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Badges Section */}
        {userBadges.length > 0 && (
          <div className="bg-bg2 border border-border rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="text-amber" size={18} />
              <span className="text-xs uppercase tracking-wider text-text3">Conquistas</span>
              <span className="ml-auto text-xs text-text3">{userBadges.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {userBadges.map(ub => (
                <div
                  key={ub.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                    ub.badge?.rarity === 'legendary' ? 'bg-amber/10 border border-amber/30' :
                    ub.badge?.rarity === 'epic' ? 'bg-purple2/10 border border-purple2/30' :
                    ub.badge?.rarity === 'rare' ? 'bg-purple/10 border border-purple/30' :
                    'bg-bg3'
                  }`}
                  title={ub.badge?.description}
                >
                  <span className="text-base">{ub.badge?.icon}</span>
                  <span className="text-xs font-medium text-text">{ub.badge?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {character ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="text-amber" size={18} />
                  <span className="text-xs uppercase tracking-wider text-text3">Rank</span>
                </div>
                <div className="font-bebas text-3xl text-text">#{rank || '—'}</div>
              </div>

              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-purple" size={18} />
                  <span className="text-xs uppercase tracking-wider text-text3">Nível</span>
                </div>
                <div className="font-bebas text-3xl text-text">{character.level}</div>
                <div className="text-xs text-text3">{character.xp}/{character.level * 100} XP</div>
              </div>

              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Medal className="text-teal" size={18} />
                  <span className="text-xs uppercase tracking-wider text-text3">Vitórias</span>
                </div>
                <div className="font-bebas text-3xl text-teal">{character.wins}</div>
                <div className="text-xs text-text3">{character.losses} derrotas</div>
              </div>

              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="text-red" size={18} />
                  <span className="text-xs uppercase tracking-wider text-text3">WR</span>
                </div>
                <div className="font-bebas text-3xl text-text">{winRate.toFixed(1)}%</div>
                <div className="text-xs text-text3">Win Rate</div>
              </div>
            </div>

            {/* Character Stats */}
            <div className="bg-bg2 border border-border rounded-xl p-6">
              <h3 className="font-rajdhani font-bold text-lg text-text mb-4">
                {character.name} — Atributos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'HP', value: character.hp, max: character.max_hp, color: 'bg-teal' },
                  { label: 'Ataque', value: character.attack, max: 100, color: 'bg-red' },
                  { label: 'Defesa', value: character.defense, max: 100, color: 'bg-purple' },
                  { label: 'Velocidade', value: character.speed, max: 100, color: 'bg-amber' },
                  { label: 'Especial', value: character.special, max: 100, color: 'bg-purple2' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text2">{stat.label}</span>
                      <span className="text-text font-semibold">{stat.value}</span>
                    </div>
                    <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stat.color} rounded-full`}
                        style={{ width: `${Math.min((stat.value / stat.max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Title */}
              {character.title && (
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                  <Crown className="text-amber" size={16} />
                  <span className="text-sm text-text2">Título:</span>
                  <span className="font-rajdhani font-bold text-amber">{character.title}</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-bg2 border border-border rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="font-rajdhani font-bold text-lg text-text mb-2">Sem Personagem</h3>
            <p className="text-sm text-text3">Este usuário ainda não criou um personagem.</p>
          </div>
        )}

        {/* Back */}
        <div className="mt-6">
          <Link to="/rankings" className="text-sm text-text3 hover:text-text">
            ← Ver Rankings
          </Link>
        </div>
      </div>
    </div>
  );
}