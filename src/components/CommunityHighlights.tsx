import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mic, Music, Swords, Users, Crown, TrendingUp } from 'lucide-react';

// Função utilitária para garantir que o tempo de cache/semana está correto
// Substitui pela tua implementação real se ela for diferente
const getWeekStart = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString();
};

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
      setLoading(true);
      const weekStart = getWeekStart();
      const { data, error } = await supabase
        .from('community_highlights')
        .select('*')
        .gte('created_at', weekStart);

      if (error) throw error;
      
      setHighlights(data || []);
      if (data) await loadDetails(data);
    } catch (error) {
      console.error('Erro detalhado ao carregar destaques:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(highlightsData: Highlight[]) {
    const newDetails: Record<string, any> = {};

    const userIds = [...new Set(highlightsData.filter(h => h.entity_type === 'user').map(h => h.entity_id))];
    const clanIds = [...new Set(highlightsData.filter(h => h.entity_type === 'clan').map(h => h.entity_id))];
    const charIds = [...new Set(highlightsData.filter(h => h.entity_type === 'character').map(h => h.entity_id))];

    try {
      const [usersRes, clansRes, charsRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, username').in('id', userIds) : { data: [] },
        clanIds.length > 0 ? supabase.from('clans').select('id, name, tag').in('id', clanIds) : { data: [] },
        charIds.length > 0 ? supabase.from('characters').select('id, name').in('id', charIds) : { data: [] }
      ]);

      highlightsData.forEach(h => {
        if (!h.entity_id) return;
        
        let found = null;
        if (h.entity_type === 'user') found = usersRes.data?.find((u: any) => u.id === h.entity_id);
        else if (h.entity_type === 'clan') found = clansRes.data?.find((c: any) => c.id === h.entity_id);
        else if (h.entity_type === 'character') found = charsRes.data?.find((ch: any) => ch.id === h.entity_id);
        
        if (found) newDetails[h.type] = found;
      });

      setDetails(newDetails);
    } catch (error) {
      console.error('Erro ao buscar detalhes das entidades:', error);
    }
  }

  if (loading) return <div className="text-text3 text-sm">A carregar destaques...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text">Destaques da Comunidade</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {highlights.map((h) => {
          const config = HIGHLIGHT_CONFIG[h.type];
          if (!config) return null;

          const Icon = config.icon;
          const detail = details[h.type];

          return (
            <div key={h.type} className="bg-bg3 rounded-xl p-3 hover:bg-bg4 transition-colors cursor-pointer group">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={`text-${config.color}`} />
                <span className="text-xs text-text3 uppercase tracking-wide">{config.label}</span>
              </div>

              {detail || h.metadata ? (
                <div>
                  <span className="font-semibold text-sm text-text truncate block">
                    {h.metadata?.name || detail?.username || detail?.name || '...'}
                  </span>
                  {h.metadata?.tag && <span className="text-xs text-purple">[{h.metadata.tag}]</span>}
                  {h.type === 'guerreiro_semana' && (
                    <span className="text-xs text-amber flex items-center gap-1 mt-1">
                      <TrendingUp size={10} /> {h.score} vitórias
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-text3">A processar...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
