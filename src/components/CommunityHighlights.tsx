import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Trophy, Mic, Music, Swords, Users, Flame, Crown, TrendingUp } from 'lucide-react';

interface Highlight {
  type: string;
  entity_id: string;
  entity_type?: string;
  score: number;
  metadata: Record<string, any>;
}

const HIGHLIGHT_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  kamba_do_dia: { icon: Crown, label: 'Kamba do Dia', color: 'amber' },
  voz_mais_ouvida: { icon: Mic, label: 'Voz Mais Ouvida', color: 'purple' },
  cla_da_semana: { icon: Users, label: 'Cla da Semana', color: 'teal' },
  ost_trending: { icon: Music, label: 'OST Trending', color: 'red' },
  guerreiro_semana: { icon: Swords, label: 'Guerreiro #1', color: 'amber' }
};

export default function CommunityHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    loadHighlights();
  }, []);

  async function loadHighlights() {
    try {
      const weekStart = getWeekStart();
      const { data } = await supabase
        .from('community_highlights')
        .select('*')
        .eq('week_start', weekStart.toISOString().split('T')[0]);

      if (data && data.length > 0) {
        setHighlights(data);
        loadDetails(data);
      } else {
        // Generate highlights on the fly
        await generateHighlights();
        loadHighlights();
      }
    } catch (e) {
      console.error('Error loading highlights:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(highlightsData: Highlight[]) {
    const newDetails: Record<string, any> = {};

    for (const h of highlightsData) {
      if (!h.entity_id) continue;

      try {
        if (h.entity_type === 'user') {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, title')
            .eq('id', h.entity_id)
            .single();
          newDetails[h.type] = data;
        } else if (h.entity_type === 'clan') {
          const { data } = await supabase
            .from('clans')
            .select('id, name, tag')
            .eq('id', h.entity_id)
            .single();
          newDetails[h.type] = data;
        } else if (h.entity_type === 'character') {
          const { data } = await supabase
            .from('characters')
            .select('id, name, class, wins')
            .eq('id', h.entity_id)
            .single();
          newDetails[h.type] = data;
        }
      } catch {}
    }

    setDetails(newDetails);
  }

  async function generateHighlights() {
    // Kamba do Dia - user with most activity
    const { data: activeUsers } = await supabase
      .from('posts')
      .select('user_id, profiles(username, id, title)')
      .gte('created_at', getWeekStart().toISOString());

    if (activeUsers && activeUsers.length > 0) {
      const userCounts: Record<string, any> = {};
      activeUsers.forEach(p => {
        if (!userCounts[p.user_id]) userCounts[p.user_id] = { count: 0, profile: p.profiles };
        userCounts[p.user_id].count++;
      });

      const topUser = Object.entries(userCounts).sort((a, b) => b[1].count - a[1].count)[0];
      if (topUser) {
        await supabase.from('community_highlights').upsert({
          highlight_type: 'kamba_do_dia',
          entity_id: topUser[0],
          entity_type: 'user',
          score: topUser[1].count,
          week_start: getWeekStart().toISOString().split('T')[0]
        }, { onConflict: 'highlight_type,week_start' });
      }
    }

    // Guerreiro #1 - top duelist
    const { data: topDuelist } = await supabase
      .from('characters')
      .select('id, user_id, name, wins, profiles(id, username)')
      .order('wins', { ascending: false })
      .limit(1)
      .single();

    if (topDuelist) {
      const profileData = Array.isArray(topDuelist.profiles) ? topDuelist.profiles[0] : topDuelist.profiles;
      await supabase.from('community_highlights').upsert({
        highlight_type: 'guerreiro_semana',
        entity_id: topDuelist.id,
        entity_type: 'character',
        score: topDuelist.wins,
        metadata: { name: topDuelist.name, username: profileData?.username },
        week_start: getWeekStart().toISOString().split('T')[0]
      }, { onConflict: 'highlight_type,week_start' });
    }

    // Clan da Semana
    const { data: topClan } = await supabase
      .from('clans')
      .select('id, name, tag, weekly_contribution')
      .order('weekly_contribution', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (topClan) {
      await supabase.from('community_highlights').upsert({
        highlight_type: 'cla_da_semana',
        entity_id: topClan.id,
        entity_type: 'clan',
        score: topClan.weekly_contribution || 0,
        metadata: { name: topClan.name, tag: topClan.tag },
        week_start: getWeekStart().toISOString().split('T')[0]
      }, { onConflict: 'highlight_type,week_start' });
    }
  }

  function getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  }

  if (loading || highlights.length === 0) return null;

  return (
    <div className="bg-bg2 border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="text-amber" size={20} />
        <h2 className="font-rajdhani font-bold text-lg text-text">Destaques da Semana</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {highlights.slice(0, 4).map(h => {
          const config = HIGHLIGHT_CONFIG[h.type];
          if (!config) return null;

          const Icon = config.icon;
          const detail = details[h.type];

          return (
            <div
              key={h.type}
              className="bg-bg3 rounded-xl p-3 hover:bg-bg4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={`text-${config.color}`} />
                <span className="text-xs text-text3 uppercase tracking-wide">
                  {config.label}
                </span>
              </div>

              {detail || h.metadata ? (
                <div>
                  <span className="font-semibold text-sm text-text truncate block">
                    {h.metadata?.name || detail?.username || detail?.name || '...'}
                  </span>
                  {h.metadata?.tag && (
                    <span className="text-xs text-purple">[{h.metadata.tag}]</span>
                  )}
                  {h.type === 'guerreiro_semana' && (
                    <span className="text-xs text-amber flex items-center gap-1 mt-1">
                      <TrendingUp size={10} /> {h.score} vitórias
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-text3">Em breve...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
