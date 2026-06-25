import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Award, Lock, Check, Zap, Crown, Swords, Users, Image, Eye, Star, Trophy } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xp_reward: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export default function BadgesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<Map<string, UserBadge>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadBadges();
  }, [user]);

  async function loadBadges() {
    setLoading(true);
    try {
      const { data: badges } = await supabase.from('badges').select('*').order('xp_reward', { ascending: true });
      setAllBadges(badges || []);

      if (user) {
        const { data: earned } = await supabase
          .from('user_badges')
          .select('*, badge:badges(*)')
          .eq('user_id', user.id);

        const earnedMap = new Map<string, UserBadge>();
        (earned || []).forEach((ub: any) => earnedMap.set(ub.badge_id, ub));
        setUserBadges(earnedMap);
      }
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { id: 'all', label: 'Todas', icon: Star },
    { id: 'arena', label: 'Arena', icon: Swords },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'character', label: 'Personagem', icon: Zap },
    { id: 'events', label: 'Eventos', icon: Trophy },
    { id: 'special', label: 'Especiais', icon: Crown }
  ];

  const filtered = activeCategory === 'all'
    ? allBadges
    : allBadges.filter(b => b.category === activeCategory);

  const earnedCount = userBadges.size;
  const totalCount = allBadges.length;
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  function getRarityColor(rarity: string) {
    switch (rarity) {
      case 'legendary': return 'border-amber text-amber';
      case 'epic': return 'border-purple2 text-purple2';
      case 'rare': return 'border-purple text-purple';
      default: return 'border-text3 text-text3';
    }
  }

  function getRarityBg(rarity: string) {
    switch (rarity) {
      case 'legendary': return 'bg-amber/10';
      case 'epic': return 'bg-purple2/10';
      case 'rare': return 'bg-purple/10';
      default: return 'bg-bg3';
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-bebas text-4xl md:text-5xl text-text mb-3">
            Conquistas <span className="text-amber">e Badges</span>
          </h1>
          <p className="text-text2 max-w-lg mx-auto mb-6">
            Completa objetivos para desbloquear badges exclusivas e mostra o teu poder!
          </p>

          {/* Progress */}
          <div className="max-w-md mx-auto bg-bg2 border border-border rounded-2xl p-4">
            <div className="flex justify-between text-sm text-text2 mb-2">
              <span>{earnedCount} / {totalCount} badges</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-bg3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple to-amber rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Award size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem badges</h3>
            <p className="text-text3 text-sm">Nenhuma badge encontrada nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(badge => {
              const earned = userBadges.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`bg-bg2 border rounded-2xl p-5 text-center transition-all hover:scale-[1.02] ${
                    earned ? `border-${getRarityColor(badge.rarity).split(' ')[0].replace('border-', '')}` : 'border-border opacity-60'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center text-3xl ${
                    earned ? getRarityBg(badge.rarity) : 'bg-bg3'
                  }`}>
                    {earned ? (
                      <span>{badge.icon}</span>
                    ) : (
                      <Lock size={24} className="text-text3" />
                    )}
                  </div>
                  <h3 className="font-rajdhani font-bold text-text text-sm mb-1">{badge.name}</h3>
                  <p className="text-xs text-text3 mb-2">{badge.description}</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-xs font-semibold capitalize ${getRarityColor(badge.rarity).split(' ')[1]}`}>
                      {badge.rarity}
                    </span>
                    <span className="text-xs text-text3">·</span>
                    <span className="flex items-center gap-0.5 text-xs text-purple2">
                      <Zap size={10} /> {badge.xp_reward}
                    </span>
                  </div>
                  {earned && (
                    <div className="mt-2 text-teal text-xs font-semibold flex items-center justify-center gap-1">
                      <Check size={12} /> Desbloqueado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
