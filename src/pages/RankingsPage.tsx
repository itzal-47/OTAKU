import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CLASS_INFO, ANGOLAN_PROVINCES, type CharacterClass } from '../types/index';
import { Trophy, Medal, Crown, Globe, TrendingUp, Zap, Shield, Target } from 'lucide-react';

interface RankingEntry {
  rank: number;
  user_id: string;
  username: string;
  character_name: string;
  character_class: CharacterClass;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  win_rate: number;
  city: string | null;
  province: string | null;
}

type TabType = 'nacional' | 'provincia' | 'internacional';
type SortType = 'wins' | 'level' | 'xp' | 'winrate';

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('nacional');
  const [sortBy, setSortBy] = useState<SortType>('wins');
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');

  useEffect(() => {
    loadRankings();
  }, [activeTab, filterProvince, filterClass, sortBy]);

  async function loadRankings() {
    setLoading(true);
    try {
      let query = supabase
        .from('characters')
        .select('id, name, class, level, xp, wins, losses, user_id')
        .limit(100);

      if (filterClass !== 'all') {
        query = query.eq('class', filterClass);
      }

      // Sort by selected metric
      switch (sortBy) {
        case 'wins':
          query = query.order('wins', { ascending: false });
          break;
        case 'level':
          query = query.order('level', { ascending: false });
          break;
        case 'xp':
          query = query.order('xp', { ascending: false });
          break;
        case 'winrate':
          query = query.order('wins', { ascending: false });
          break;
      }

      const { data: characters } = await query;

      if (characters && characters.length > 0) {
        const userIds = characters.map(c => c.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, city, province')
          .in('id', userIds);

        let combined: RankingEntry[] = characters
          .map((char, index): RankingEntry => {
            const prof = profiles?.find(p => p.id === char.user_id);
            const totalMatches = char.wins + char.losses;
            const winRate = totalMatches > 0 ? (char.wins / totalMatches) * 100 : 0;
            return {
              rank: index + 1,
              user_id: char.user_id,
              username: prof?.username || 'Unknown',
              character_name: char.name,
              character_class: char.class as CharacterClass,
              level: char.level,
              xp: char.xp || 0,
              wins: char.wins,
              losses: char.losses,
              win_rate: winRate,
              city: prof?.city || null,
              province: prof?.province || null,
            };
          });

        if (activeTab === 'provincia' && filterProvince !== 'all') {
          combined = combined.filter(r => r.province === filterProvince);
        }

        // Re-rank after filtering and sort
        if (sortBy === 'winrate') {
          combined.sort((a, b) => b.win_rate - a.win_rate);
        }
        combined = combined.map((entry, idx) => ({ ...entry, rank: idx + 1 }));

        setRankings(combined);
      } else {
        setRankings([]);
      }
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  }

  const topThree = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  const getBackground = (pos: number) => {
    switch (pos) {
      case 1: return 'bg-gradient-to-br from-amber/20 via-amber/10 to-bg3 border-amber/40';
      case 2: return 'bg-gradient-to-br from-gray-400/15 via-gray-400/5 to-bg3 border-gray-400/30';
      case 3: return 'bg-gradient-to-br from-amber-900/15 via-red/5 to-bg3 border-amber-800/30';
      default: return 'bg-bg2 border-border';
    }
  };

  const getPositionIcon = (pos: number) => {
    switch (pos) {
      case 1: return <Crown className="text-amber" size={20} />;
      case 2: return <Medal className="text-gray-400" size={20} />;
      case 3: return <Trophy className="text-amber-600" size={20} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide text-text mb-4">
            Rankings <span className="text-purple2">OtakuKamba</span>
          </h1>
          <p className="text-text2 max-w-xl mx-auto">
            Os melhores guerreiros. Subiu ao topo e torna-te uma lenda.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('nacional')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'nacional'
                ? 'bg-purple/20 text-purple2 border border-purple/30'
                : 'text-text3 hover:text-text hover:bg-bg3'
            }`}
          >
            <Trophy size={16} />
            🇦🇴 Nacional
          </button>
          <button
            onClick={() => setActiveTab('provincia')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'provincia'
                ? 'bg-purple/20 text-purple2 border border-purple/30'
                : 'text-text3 hover:text-text hover:bg-bg3'
            }`}
          >
            📍 Por Província
          </button>
          <button
            onClick={() => setActiveTab('internacional')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'internacional'
                ? 'bg-purple/20 text-purple2 border border-purple/30'
                : 'text-text3 hover:text-text hover:bg-bg3'
            }`}
          >
            <Globe size={16} />
            🌍 Internacional
          </button>
        </div>

        {/* International - Coming Soon */}
        {activeTab === 'internacional' ? (
          <div className="text-center py-20 bg-bg2 border border-border rounded-2xl">
            <Globe className="mx-auto mb-6 text-purple2 opacity-30" size={80} />
            <h2 className="font-bebas text-4xl text-text mb-4">BREVEMENTE</h2>
            <p className="text-text2 max-w-md mx-auto mb-6">
              Os rankings internacionais estarão disponíveis em breve.
              Por agora, domina Angola primeiro!
            </p>
            <div className="inline-flex items-center gap-2 bg-purple/10 border border-purple/30 rounded-xl px-4 py-2 text-sm text-purple2">
              <span>🇦🇴</span>
              <span>Disponível apenas em Angola por agora</span>
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {/* Sort By */}
              <div className="flex gap-1 bg-bg3 rounded-lg p-1">
                {[
                  { id: 'wins', label: 'Vitórias', icon: Trophy },
                  { id: 'level', label: 'Nível', icon: TrendingUp },
                  { id: 'xp', label: 'XP', icon: Zap },
                  { id: 'winrate', label: 'Win Rate', icon: Target },
                ].map(sort => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id as SortType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      sortBy === sort.id ? 'bg-purple text-white' : 'text-text3 hover:text-text'
                    }`}
                  >
                    <sort.icon size={12} />
                    {sort.label}
                  </button>
                ))}
              </div>

              {activeTab === 'provincia' && (
                <select
                  value={filterProvince}
                  onChange={e => setFilterProvince(e.target.value)}
                  className="bg-bg3 border border-border2 rounded-lg px-4 py-2 text-sm text-text2"
                >
                  <option value="all">🇦🇴 Toda Angola</option>
                  {ANGOLAN_PROVINCES.map(prov => (
                    <option key={prov} value={prov}>📍 {prov}</option>
                  ))}
                </select>
              )}

              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="bg-bg3 border border-border2 rounded-lg px-4 py-2 text-sm text-text2"
              >
                <option value="all">⚔️ Todas as Classes</option>
                {(Object.entries(CLASS_INFO) as [CharacterClass, typeof CLASS_INFO.ninja][]).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.emoji} {info.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
              </div>
            ) : rankings.length === 0 ? (
              <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
                <Trophy className="mx-auto mb-4 text-text3" size={48} />
                <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem Rankings Ainda</h3>
                <p className="text-text3 text-sm">
                  {activeTab === 'provincia' && filterProvince !== 'all'
                    ? `Nenhum guerreiro registado em ${filterProvince} ainda.`
                    : 'Os duelos ainda não começaram. Sê o primeiro a lutar!'}
                </p>
              </div>
            ) : (
              <>
                {/* Top 3 */}
                {topThree.length > 0 && (
                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {topThree.map((entry, idx) => {
                      const info = CLASS_INFO[entry.character_class];
                      return (
                        <div
                          key={entry.user_id}
                          className={`${getBackground(idx + 1)} border rounded-2xl p-5 relative overflow-hidden`}
                        >
                          {idx === 0 && (
                            <div className="absolute top-0 right-0 w-20 h-20 bg-amber/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                          )}
                          <div className="relative">
                            <div className="flex items-center gap-2 mb-4">
                              <div className={`w-10 h-10 rounded-xl bg-${info?.color || 'purple'}/15 flex items-center justify-center text-xl`}>
                                {info?.emoji || '⚔️'}
                              </div>
                              <div className="flex-1">
                                <div className="font-bebas text-lg tracking-wide text-text">#{idx + 1}</div>
                                <div className="text-xs text-text3">{entry.province || entry.city || 'Angola'}</div>
                              </div>
                              {getPositionIcon(idx + 1)}
                            </div>

                            <div className="font-rajdhani font-bold text-xl text-text mb-1">
                              {entry.username}
                            </div>
                            <div className="text-xs text-text3 mb-4">
                              {entry.character_name} · {info?.name || 'Classe'} Nv.{entry.level}
                            </div>

                            <div className="flex justify-between text-xs">
                              <div>
                                <div className="text-amber font-bold">{entry.wins}</div>
                                <div className="text-text3">Vitórias</div>
                              </div>
                              <div>
                                <div className="text-red font-bold">{entry.losses}</div>
                                <div className="text-text3">Derrotas</div>
                              </div>
                              <div>
                                <div className="text-teal font-bold">{entry.win_rate.toFixed(1)}%</div>
                                <div className="text-text3">Win Rate</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rest of rankings */}
                {rest.length > 0 && (
                  <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">
                    <div className="max-h-[500px] overflow-y-auto">
                      {rest.map((entry) => {
                        const info = CLASS_INFO[entry.character_class];
                        return (
                          <div
                            key={entry.user_id}
                            className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-bg3/50 transition-colors"
                          >
                            <div className="w-10 text-center font-bebas text-lg text-text2">
                              #{entry.rank}
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-bg3 flex items-center justify-center text-xl">
                              {info?.emoji || '⚔️'}
                            </div>
                            <div className="flex-1">
                              <div className="font-rajdhani font-bold text-text">{entry.username}</div>
                              <div className="text-xs text-text3">
                                {entry.character_name} · {info?.name || 'Classe'}
                              </div>
                            </div>
                            <div className="hidden md:flex items-center gap-4 text-xs">
                              <div className="text-center">
                                <div className="font-bold text-teal">{entry.level}</div>
                                <div className="text-text3">Nv</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-purple2">{entry.xp}</div>
                                <div className="text-text3">XP</div>
                              </div>
                            </div>
                            <div className="hidden sm:block text-xs text-text2">
                              📍 {entry.province || entry.city || 'Angola'}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-amber">{entry.wins}W</div>
                              <div className="text-xs text-text3">{entry.losses}L</div>
                            </div>
                            <div className="w-14 text-right">
                              <div className="text-sm font-bold text-teal">{entry.win_rate.toFixed(0)}%</div>
                              <div className="text-[10px] text-text3">WR</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
