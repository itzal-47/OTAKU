import { useState, useEffect } from 'react';
import { Users, Swords, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface VisitorStatsProps {
  className?: string;
}

export default function VisitorStats({ className = '' }: VisitorStatsProps) {
  const [stats, setStats] = useState({ online: 0, warriors: 0, duels: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const { data, error } = await supabase.rpc('get_visitor_stats');
      if (data && !error) {
        setStats({
          online: data.online || 0,
          warriors: data.warriors || 0,
          duels: data.duels || 0
        });
      }
    } catch {
      // Fallback to manual counts
      const [{ count: warriors }, { count: duels }] = await Promise.all([
        supabase.from('characters').select('*', { count: 'exact', head: true }),
        supabase.from('duels').select('*', { count: 'exact', head: true })
      ]);
      setStats({ online: 1, warriors: warriors || 0, duels: duels || 0 });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;

  return (
    <div className={`flex flex-wrap gap-4 justify-center ${className}`}>
      <div className="bg-bg3/50 rounded-xl px-4 py-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
        <span className="text-text2 text-sm font-medium">{stats.online}</span>
        <span className="text-text3 text-xs">Online</span>
      </div>
      <div className="bg-bg3/50 rounded-xl px-4 py-2 flex items-center gap-2">
        <Swords size={14} className="text-purple" />
        <span className="text-text2 text-sm font-medium">{stats.warriors}</span>
        <span className="text-text3 text-xs">Guerreiros</span>
      </div>
      <div className="bg-bg3/50 rounded-xl px-4 py-2 flex items-center gap-2">
        <Zap size={14} className="text-amber" />
        <span className="text-text2 text-sm font-medium">{stats.duels}</span>
        <span className="text-text3 text-xs">Duelos</span>
      </div>
    </div>
  );
}
