import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Heart, UserPlus, Sparkles, MapPin, Star, Zap, Shuffle } from 'lucide-react';
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
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, province, favorite_animes, favorite_music, favorite_genre, match_visible')
        .eq('match_visible', true)
        .neq('id', user.id)
        .limit(40);

      if (!profilesData || profilesData.length === 0) {
        setSuggestions([]);
        return;
      }

      const { data: existingMatchesData } = await supabase
        .from('user_matches')
        .select('user_id, matched_user_id');

      const matchedIds = new Set<string>();
      (existingMatchesData || []).forEach(m => {
        if (m.user_id === user.id) matchedIds.add(m.matched_user_id);
        if (m.matched_user_id === user.id) matchedIds.add(m.user_id);
      });

      const availableProfiles = profilesData.filter(p => !matchedIds.has(p.id));
      const availableIds = availableProfiles.map(p => p.id);

      // Puxa as fichas de personagens RPG dos candidatos
      const [{ data: charactersData }, { data: myCharacterData }] = await Promise.all([
        supabase.from('characters').select('user_id, name, class, level, wins, losses').in('user_id', availableIds),
        supabase.from('characters').select('class, level').eq('user_id', user.id).maybeSingle()
      ]);

      const myAnimes = profile.favorite_animes || [];
      const myMusic = profile.favorite_music || [];
      const myGenre = profile.favorite_genre;

      const scored: MatchSuggestion[] = availableProfiles.map(p => {
        const theirAnimes = p.favorite_animes || [];
        const theirMusic = p.favorite_music || [];
        const theirGenre = p.favorite_genre;
        const theirChar = charactersData?.find(c => c.user_id === p.id);

        let score = 0;
        const reasons: string[] = [];

        // 1. Afinidade Otaku (Max 35 pontos)
        const commonAnimes = myAnimes.filter((a: string) => theirAnimes.includes(a));
        if (commonAnimes.length > 0) {
          score += Math.min(commonAnimes.length * 6, 35);
          reasons.push(`🍿 Partilham ${commonAnimes.length} anime(s)`);
        }

        if (myGenre && theirGenre && myGenre === theirGenre) {
          score += 15;
          reasons.push(`🔥 Mesma vibe: ${myGenre}`);
        }

        // 2. Proximidade Geográfica (Max 25 pontos)
        if (profile.province && p.province === profile.province) {
          score += 25;
          reasons.push(`📍 Kamba de perto (${p.province})`);
        } else if (p.province) {
          score += 5;
        }

        // 3. Sinergia RPG da Arena (Max 25 pontos)
        if (myCharacterData && theirChar) {
          if (myCharacterData.class === theirChar.class) {
            score += 15;
            reasons.push(`⚔️ Clã de ${CLASS_INFO[theirChar.class as CharacterClass]?.name || 'Guerreiros'}`);
          } else {
            score += 10;
            reasons.push(`🤝 Duo perfeito: ${CLASS_INFO[myCharacterData.class as CharacterClass]?.name || 'Você'} + ${CLASS_INFO[theirChar.class as CharacterClass]?.name || 'Kamba'}`);
          }

          const lvlDiff = Math.abs(myCharacterData.level - theirChar.level);
          if (lvlDiff <= 3) {
            score += 10;
            reasons.push('⚖️ Níveis equilibrados para Arena');
          }
        }

        // Garante pontuação mínima de 15% para preencher a tela de forma empolgante
        score = Math.max(score, 15);
        if (reasons.length === 0) reasons.push('✨ Prontos para se conhecerem');

        return {
          user_id: p.id,
          username: p.username,
          province: p.province || undefined,
          compatibility: Math.min(score, 100),
          reasons: reasons,
          character: theirChar ? { name: theirChar.name, class: theirChar.class as CharacterClass, level: theirChar.level } : undefined
        };
      });

      scored.sort((a, b) => b.compatibility - a.compatibility);
      setSuggestions(scored.slice(0, 12));
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

      // Código Seguro para atualização de XP
      const { data: myChar } = await supabase
        .from('characters')
        .select('xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (myChar) {
        await supabase
          .from('characters')
          .update({ xp: (myChar.xp || 0) + 20 })
          .eq('user_id', user.id);
      }

      showToast('Match efetuado com sucesso! +20 XP obtidos!', 'success');
      setSuggestions(prev => prev.filter(s => s.user_id !== otherUserId));
      loadData();
    } catch (error) {
      console.error(error);
      showToast('Erro ao processar o seu match', 'error');
    } {
      setMatchLoading(null);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <div className="text-center">
          <Heart className="mx-auto mb-4 text-purple2 animate-pulse" size={64} />
          <h1 className="font-bebas text-4xl text-text mb-4">Kamba Match</h1>
          <p className="text-text2 mb-6">Inicia sessão para descobrires a tua alma gémea otaku em Angola!</p>
          <Link to="/login" className="btn btn-primary px-8">Entrar na Conta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-slate-950/20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4 animate-pulse">
            <Sparkles className="text-amber-400" size={16} />
            <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">Radar Otaku Ativo</span>
          </div>
          <h1 className="font-bebas text-5xl tracking-wide text-text mb-3">
            Kamba <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple to-pink-500">Match</span>
          </h1>
          <p className="text-text2 max-w-lg mx-auto text-sm sm:text-base">
            O nosso oráculo cruzou as Províncias, Classes de RPG e Animes favoritos para encontrar as tuas conexões perfeitas em Angola.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8 bg-slate-900/60 p-1.5 rounded-2xl w-fit mx-auto border border-slate-800">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === 'discover'
                ? 'bg-purple/30 text-white border border-purple/40 shadow-inner'
                : 'text-text3 hover:text-text'
            }`}
          >
            <UserPlus size={16} />
            Rastrear
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
              activeTab === 'matches'
                ? 'bg-purple/30 text-white border border-purple/40 shadow-inner'
                : 'text-text3 hover:text-text'
            }`}
          >
            <Heart size={16} />
            Alianças ({existingMatches.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-slate-800 border-t-purple rounded-full animate-spin" />
          </div>
        ) : activeTab === 'discover' ? (
          suggestions.length === 0 ? (
            <div className="text-center py-16 bg-bg2 border border-border rounded-2xl p-8">
              <Shuffle className="mx-auto mb-4 text-text3 opacity-40 animate-spin-slow" size={48} />
              <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sinal do Radar Interrompido</h3>
              <p className="text-text3 max-w-md mx-auto text-sm">
                Varremos todas as províncias e não restam novos Kambas compatíveis no momento. Altera as tuas preferências nas definições!
              </p>
              <Link to="/settings" className="btn btn-ghost mt-6 text-xs uppercase border border-slate-800">Atualizar Preferências</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {suggestions.map(suggestion => {
                const classInfo = suggestion.character ? CLASS_INFO[suggestion.character.class] : null;
                return (
                  <div
                    key={suggestion.user_id}
                    className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:border-purple/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple/10 to-pink-500/10 border border-slate-800 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">
                          {classInfo?.emoji || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/perfil/${suggestion.username}`}
                            className="font-rajdhani font-bold text-lg text-text hover:text-purple transition-colors truncate block"
                          >
                            {suggestion.username}
                          </Link>
                          <div className="text-xs text-text3 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            {suggestion.province && (
                              <span className="flex items-center text-red-400">
                                <MapPin size={12} className="mr-0.5" /> {suggestion.province}
                              </span>
                            )}
                            {suggestion.character && (
                              <>
                                <span className="text-slate-700">·</span>
                                <span className="text-purple font-medium">{classInfo?.name} Nv.{suggestion.character.level}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="text-2xl font-bebas text-purple tracking-wide">
                            {suggestion.compatibility}%
                          </div>
                          <div className="text-[9px] uppercase font-bold tracking-widest text-text3">Afinidade</div>
                        </div>
                      </div>

                      {/* Motivos dinâmicos e inteligentes */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {suggestion.reasons.map((reason, i) => (
                          <span key={i} className="text-[11px] bg-bg3 border border-border/40 text-text2 px-2 py-0.5 rounded-lg font-medium">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      {/* Barra de progresso visual */}
                      <div className="mb-4 bg-slate-950 rounded-full h-1.5 overflow-hidden p-0.5 border border-slate-900">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple to-pink-500 transition-all duration-500"
                          style={{ width: `${suggestion.compatibility}%` }}
                        />
                      </div>

                      <button
                        onClick={() => handleMatch(suggestion.user_id, suggestion.compatibility)}
                        disabled={matchLoading === suggestion.user_id}
                        className="btn btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-purple/80 to-purple border-none hover:from-purple hover:to-pink-600"
                      >
                        {matchLoading === suggestion.user_id ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full anonymity animate-spin" />
                        ) : (
                          <>
                            <Heart size={14} className="fill-current" /> Sintonizar (+20 XP)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          existingMatches.length === 0 ? (
            <div className="text-center py-16 bg-bg2 border border-border rounded-2xl p-8">
              <Heart className="mx-auto mb-4 text-slate-800" size={48} />
              <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Nenhuma Aliança Firmada</h3>
              <p className="text-text3 max-w-sm mx-auto text-sm mb-6">
                Ainda não deste nenhum match bem-sucedido. Ativa o radar e começa as conexões!
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn btn-primary text-xs uppercase tracking-wider">
                Iniciar Varredura
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {existingMatches.map(match => (
                <Link
                  key={match.id}
                  to={`/perfil/${match.matched_user?.username}`}
                  className="flex items-center justify-between gap-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-4 hover:border-purple/30 transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Heart className="text-purple fill-current opacity-80" size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-rajdhani font-bold text-text text-base truncate">
                        {match.matched_user?.username || 'Kamba Anónimo'}
                      </div>
                      {match.matched_user?.province && (
                        <div className="text-xs text-text3 flex items-center mt-0.5">
                          <MapPin size={10} className="mr-1 text-red-400" />
                          {match.matched_user.province}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-purple">
                      {match.compatibility_score}% Sintonizado
                    </div>
                    <div className="text-[10px] text-text3 mt-0.5">
                      {new Date(match.created_at).toLocaleDateString('pt-AO')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Configurações */}
        <div className="mt-10 text-center">
          <Link to="/settings" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text3 hover:text-purple transition-colors">
            <Star size={14} className="text-amber-500" />
            Ajustar Filtros Psíquicos de Match
          </Link>
        </div>
      </div>
    </div>
  );
}
