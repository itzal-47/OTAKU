import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Heart, UserPlus, Sparkles, Users, MapPin, Star, Zap, Shuffle } from 'lucide-react';
import { CLASS_INFO, type CharacterClass } from '../types/index';

interface MatchSuggestion {
  user_id: string;
  username: string;
  province?: string;
  compatibility: number;
  reasons: string[];
  character?: {
    name: string;
    class: CharacterClass;
    level: number;
  };
}

interface ExistingMatch {
  id: string;
  matched_user_id: string;
  compatibility_score: number;
  created_at: string;
  matched_user?: {
    username: string;
    province?: string;
  };
}

export default function MatchPage() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [existingMatches, setExistingMatches] = useState<ExistingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'matches'>('discover');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      // Load existing matches
      const { data: matchesData } = await supabase
        .from('user_matches')
        .select('id, user_id, matched_user_id, compatibility_score, created_at')
        .or(`user_id.eq.${user!.id},matched_user_id.eq.${user!.id}`);

      if (matchesData && matchesData.length > 0) {
        const otherIds = matchesData.map(m =>
          m.matched_user_id === user!.id ? m.user_id : m.matched_user_id
        );
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id, username, province')
          .in('id', otherIds);

        const formatted: ExistingMatch[] = matchesData.map(m => {
          const otherId = m.matched_user_id === user!.id ? m.user_id : m.matched_user_id;
          const prof = matchedProfiles?.find(p => p.id === otherId);
          return {
            ...m,
            matched_user: prof ? { username: prof.username, province: prof.province || undefined } : undefined
          };
        });
        setExistingMatches(formatted);
      }

      // Generate match suggestions
      await generateSuggestions();
    } catch (error) {
      console.error('Error loading match data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateSuggestions() {
    if (!user || !profile) return;

    try {
      // Get all users with match_visible = true, excluding current user and existing matches
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, province, favorite_animes, favorite_music, favorite_genre, match_visible')
        .eq('match_visible', true)
        .neq('id', user.id)
        .limit(20);

      if (!profilesData || profilesData.length === 0) {
        setSuggestions([]);
        return;
      }

      // Get existing match user IDs
      const { data: existingMatchesData } = await supabase
        .from('user_matches')
        .select('user_id, matched_user_id')
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`);

      const matchedIds = new Set<string>();
      (existingMatchesData || []).forEach(m => {
        if (m.user_id === user.id) matchedIds.add(m.matched_user_id);
        else matchedIds.add(m.user_id);
      });

      // Filter out already matched users
      const availableProfiles = profilesData.filter(p => !matchedIds.has(p.id));

      // Get characters for available profiles
      const availableIds = availableProfiles.map(p => p.id);
      const { data: charactersData } = await supabase
        .from('characters')
        .select('user_id, name, class, level')
        .in('user_id', availableIds);

      // Calculate compatibility scores
      const myAnimes = profile.favorite_animes || [];
      const myMusic = profile.favorite_music || [];
      const myGenre = profile.favorite_genre;

      const scored: MatchSuggestion[] = availableProfiles.map(p => {
        const theirAnimes = p.favorite_animes || [];
        const theirMusic = p.favorite_music || [];
        const theirGenre = p.favorite_genre;

        let score = 0;
        const reasons: string[] = [];

        // Common animes (40 points max)
        const commonAnimes = myAnimes.filter((a: string) => theirAnimes.includes(a));
        if (commonAnimes.length > 0) {
          score += Math.min(commonAnimes.length * 4, 40);
          reasons.push(`${commonAnimes.length} anime${commonAnimes.length > 1 ? 's' : ''} em comum`);
        }

        // Common music (30 points max)
        const commonMusic = myMusic.filter((m: string) => theirMusic.includes(m));
        if (commonMusic.length > 0) {
          score += Math.min(commonMusic.length * 3, 30);
          reasons.push('Gostos musicais similares');
        }

        // Same genre (30 points)
        if (myGenre && theirGenre && myGenre === theirGenre) {
          score += 30;
          reasons.push('Mesmo género favorito');
        }

        // Same province bonus (10 points)
        if (profile.province && p.province === profile.province) {
          score += 10;
          reasons.push('Mesma província');
        }

        // Ensure minimum score of 5 for visible users
        score = Math.max(score, 5);

        const char = charactersData?.find(c => c.user_id === p.id);

        return {
          user_id: p.id,
          username: p.username,
          province: p.province || undefined,
          compatibility: Math.min(score, 100),
          reasons: reasons.length > 0 ? reasons : ['Perfil disponível para match'],
          character: char ? { name: char.name, class: char.class as CharacterClass, level: char.level } : undefined
        };
      });

      // Sort by compatibility
      scored.sort((a, b) => b.compatibility - a.compatibility);
      setSuggestions(scored.slice(0, 10));
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  }

  async function handleMatch(otherUserId: string, compatibility: number) {
    if (!user) return;

    setMatchLoading(otherUserId);
    try {
      const { error } = await supabase.from('user_matches').insert({
        user_id: user.id,
        matched_user_id: otherUserId,
        compatibility_score: compatibility,
        reasons: []
      });

      if (error) throw error;

      // Award +20 XP for making a match
      const { error: xpError } = await supabase
        .from('profiles')
        .update({ total_xp: (profile?.total_xp || 0) + 20 })
        .eq('id', user.id);

      if (!xpError) {
        await supabase
          .from('characters')
          .update({ xp: (await supabase.from('characters').select('xp').eq('user_id', user.id).single()).data?.xp || 0 + 20 })
          .eq('user_id', user.id);
      }

      showToast('Match realizado! +20 XP', 'success');

      // Remove from suggestions and add to matches
      setSuggestions(prev => prev.filter(s => s.user_id !== otherUserId));
      loadData();
    } catch (error) {
      showToast('Erro ao criar match', 'error');
    } finally {
      setMatchLoading(null);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <Heart className="mx-auto mb-4 text-purple2" size={64} />
          <h1 className="font-bebas text-4xl text-text mb-4">Kamba Match</h1>
          <p className="text-text2 mb-6">Entra para descobrir kambas compatíveis contigo!</p>
          <Link to="/login" className="btn btn-primary">Entrar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple/10 border border-purple/30 mb-4">
            <Sparkles className="text-purple2" size={18} />
            <span className="text-purple2 font-semibold text-sm">Sistema de Compatibilidade</span>
          </div>
          <h1 className="font-bebas text-5xl text-text mb-3">
            Kamba <span className="text-purple2">Match</span>
          </h1>
          <p className="text-text2 max-w-lg mx-auto">
            Descobre kambas com gostos similares baseado nos teus animes e músicas favoritos.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'discover'
                ? 'bg-purple/20 text-purple2 border border-purple/30'
                : 'text-text3 hover:text-text hover:bg-bg3'
            }`}
          >
            <UserPlus size={16} />
            Descobrir
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'matches'
                ? 'bg-purple/20 text-purple2 border border-purple/30'
                : 'text-text3 hover:text-text hover:bg-bg3'
            }`}
          >
            <Heart size={16} />
            Meus Matches
            {existingMatches.length > 0 && (
              <span className="bg-purple2 text-white text-xs px-2 py-0.5 rounded-full">
                {existingMatches.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : activeTab === 'discover' ? (
          /* Discover Tab */
          suggestions.length === 0 ? (
            <div className="text-center py-16 bg-bg2 border border-border rounded-2xl">
              <Shuffle className="mx-auto mb-4 text-text3" size={64} />
              <h3 className="font-rajdhani font-bold text-xl text-text mb-2">
                Nenhum Kamba Disponível
              </h3>
              <p className="text-text3 max-w-md mx-auto">
                Ainda não há kambas compatíveis. Volta mais tarde ou convida amigos para a plataforma!
              </p>
              <Link to="/settings" className="btn btn-ghost mt-6">
                Configurar Meu Perfil de Match
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {suggestions.map(suggestion => {
                const classInfo = suggestion.character ? CLASS_INFO[suggestion.character.class] : null;
                return (
                  <div
                    key={suggestion.user_id}
                    className="bg-bg2 border border-border rounded-2xl p-5 hover:border-purple/30 transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple/20 to-red/20 flex items-center justify-center text-2xl">
                        {classInfo?.emoji || '👤'}
                      </div>
                      <div className="flex-1">
                        <Link
                          to={`/perfil/${suggestion.username}`}
                          className="font-rajdhani font-bold text-lg text-text hover:text-purple2"
                        >
                          {suggestion.username}
                        </Link>
                        <div className="text-xs text-text3 flex items-center gap-2">
                          {suggestion.province && (
                            <>
                              <MapPin size={12} />
                              {suggestion.province}
                            </>
                          )}
                          {suggestion.character && (
                            <>
                              <span>·</span>
                              <span>{classInfo?.name} Nv.{suggestion.character.level}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Compatibility Score */}
                      <div className="text-right">
                        <div className="text-2xl font-bebas text-purple2">
                          {suggestion.compatibility}%
                        </div>
                        <div className="text-[10px] text-text3">Compatível</div>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {suggestion.reasons.map((reason, i) => (
                        <span
                          key={i}
                          className="text-xs bg-purple/10 text-purple2 px-2 py-1 rounded-lg"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>

                    {/* Compatibility Bar */}
                    <div className="mb-4">
                      <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple to-purple2"
                          style={{ width: `${suggestion.compatibility}%` }}
                        />
                      </div>
                    </div>

                    {/* Match Button */}
                    <button
                      onClick={() => handleMatch(suggestion.user_id, suggestion.compatibility)}
                      disabled={matchLoading === suggestion.user_id}
                      className="btn btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {matchLoading === suggestion.user_id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Heart size={16} />
                          Conectar (+20 XP)
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Matches Tab */
          existingMatches.length === 0 ? (
            <div className="text-center py-16 bg-bg2 border border-border rounded-2xl">
              <Heart className="mx-auto mb-4 text-text3" size={64} />
              <h3 className="font-rajdhani font-bold text-xl text-text mb-2">
                Sem Matches Ainda
              </h3>
              <p className="text-text3 max-w-md mx-auto mb-6">
                Ainda não fizeste nenhum match. Descobre kambas compatíveis e conecta-te!
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="btn btn-primary"
              >
                <UserPlus size={16} />
                Descobrir Kambas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {existingMatches.map(match => (
                <Link
                  key={match.id}
                  to={`/perfil/${match.matched_user?.username}`}
                  className="flex items-center gap-4 bg-bg2 border border-border rounded-xl p-4 hover:border-purple/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple/20 to-red/20 flex items-center justify-center text-xl">
                    <Heart className="text-purple2" size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="font-rajdhani font-bold text-text">
                      {match.matched_user?.username || 'Kamba'}
                    </div>
                    <div className="text-xs text-text3">
                      {match.matched_user?.province && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {match.matched_user.province}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple2">
                      {match.compatibility_score}% Compatível
                    </div>
                    <div className="text-[10px] text-text3">
                      {new Date(match.created_at).toLocaleDateString('pt-AO')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Settings Hint */}
        <div className="mt-8 text-center">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-sm text-text3 hover:text-purple2 transition-colors"
          >
            <Star size={14} />
            Configurar preferências de match
          </Link>
        </div>
      </div>
    </div>
  );
}
