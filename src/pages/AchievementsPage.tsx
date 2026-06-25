import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Trophy, Flame, Star, Crown, Target, Calendar, Gift,
  ChevronRight, Lock, Unlock, Zap, Award, TrendingUp
} from 'lucide-react';

interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  total_xp_earned: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xp_reward: number;
  earned?: boolean;
  earned_at?: string;
}

interface DailyTask {
  id: string;
  name: string;
  description: string;
  xp_reward: number;
  progress: number;
  target: number;
  completed: boolean;
  icon: string;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-amber-600',
};

const RARITY_BG: Record<string, string> = {
  common: 'bg-gray-500/10 border-gray-500/30',
  rare: 'bg-blue-500/10 border-blue-500/30',
  epic: 'bg-purple-500/10 border-purple-500/30',
  legendary: 'bg-amber-500/10 border-amber-500/30',
};

export default function AchievementsPage() {
  const { user, character } = useAuth();
  const { showToast } = useToast();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  useEffect(() => {
    if (user && character) {
      loadData();
    }
  }, [user, character]);

  async function loadData() {
    setLoading(true);
    try {
      // Load streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      setStreak(streakData);

      // Check if daily claimed today
      if (streakData?.last_activity_date) {
        const lastDate = new Date(streakData.last_activity_date).toDateString();
        const today = new Date().toDateString();
        setDailyClaimed(lastDate === today);
      }

      // Load all badges
      const { data: allBadges } = await supabase
        .from('badges')
        .select('*')
        .order('xp_reward', { ascending: false });

      // Load user's earned badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', user!.id);

      const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

      const combinedBadges = (allBadges || []).map(badge => ({
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
        earned_at: userBadges?.find(ub => ub.badge_id === badge.id)?.earned_at
      }));

      setBadges(combinedBadges);

      // Generate daily tasks based on user activity
      const tasks: DailyTask[] = [
        {
          id: 'duel',
          name: 'Duelos',
          description: 'Participa em duelos',
          xp_reward: 20,
          progress: 0,
          target: 3,
          completed: false,
          icon: '⚔️'
        },
        {
          id: 'post',
          name: 'Publicações',
          description: 'Faz posts no feed',
          xp_reward: 15,
          progress: 0,
          target: 1,
          completed: false,
          icon: '📝'
        },
        {
          id: 'chat',
          name: 'Chat',
          description: 'Mensagens no chat',
          xp_reward: 10,
          progress: 0,
          target: 5,
          completed: false,
          icon: '💬'
        },
        {
          id: 'quest',
          name: 'Missões',
          description: 'Completa missões diárias',
          xp_reward: 30,
          progress: 0,
          target: 3,
          completed: false,
          icon: '🎯'
        }
      ];

      setDailyTasks(tasks);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function claimDailyBonus() {
    if (!user || claiming || dailyClaimed) return;

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_login_bonus', {
        p_user_id: user.id
      });

      if (error) throw error;

      showToast(`+${data} XP de bónus diário! `, 'success');
      setDailyClaimed(true);
      loadData();
    } catch (error) {
      console.error('Error claiming daily:', error);
      showToast('Erro ao reclamr bónus', 'error');
    } finally {
      setClaiming(false);
    }
  }

  const earnedCount = badges.filter(b => b.earned).length;
  const totalXPFromBadges = badges.filter(b => b.earned).reduce((sum, b) => sum + (b.xp_reward || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-14 h-14 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-bebas text-4xl text-text mb-2">Conquistas</h1>
          <p className="text-text3">Acompanha o teu progresso e ganha recompensas</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
            <Flame className="mx-auto text-amber mb-2" size={24} />
            <div className="font-bebas text-3xl text-text">{streak?.current_streak || 0}</div>
            <div className="text-xs text-text3">Sequência Atual</div>
          </div>
          <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
            <Trophy className="mx-auto text-purple mb-2" size={24} />
            <div className="font-bebas text-3xl text-text">{streak?.longest_streak || 0}</div>
            <div className="text-xs text-text3">Maior Sequência</div>
          </div>
          <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
            <Award className="mx-auto text-teal mb-2" size={24} />
            <div className="font-bebas text-3xl text-text">{earnedCount}</div>
            <div className="text-xs text-text3">Badges Ganhas</div>
          </div>
          <div className="bg-bg2 border border-border rounded-xl p-4 text-center">
            <Zap className="mx-auto text-amber mb-2" size={24} />
            <div className="font-bebas text-3xl text-text">{totalXPFromBadges}</div>
            <div className="text-xs text-text3">XP de Badges</div>
          </div>
        </div>

        {/* Daily Bonus Card */}
        <div className="bg-gradient-to-br from-amber/10 via-bg2 to-purple/10 border border-amber/30 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber to-orange flex items-center justify-center">
                <Calendar className="text-white" size={28} />
              </div>
              <div>
                <h2 className="font-rajdhani font-bold text-lg text-text">Bónus Diário</h2>
                <p className="text-sm text-text3">
                  {dailyClaimed
                    ? `Já reclamaste hoje! Amanhã há mais.`
                    : `Conquista XP por entrares todos os dias!`
                  }
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-amber">
                  <Flame size={12} />
                  <span>{streak?.current_streak || 0} dias consecutivos</span>
                </div>
              </div>
            </div>

            <button
              onClick={claimDailyBonus}
              disabled={dailyClaimed || claiming}
              className={`btn ${dailyClaimed ? 'btn-ghost opacity-50' : 'btn-primary'} flex items-center gap-2`}
            >
              {dailyClaimed ? (
                <>
                  <Unlock size={16} />
                  Reclamado
                </>
              ) : claiming ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A reclamar...
                </span>
              ) : (
                <>
                  <Gift size={16} />
                  Reivindicar Bónus
                </>
              )}
            </button>
          </div>

          {/* Streak progress bar */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-text3 mb-2">
              <span>Progresso da sequência</span>
              <span>{streak?.current_streak || 0}/30 dias (XP máximo)</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber via-orange to-red transition-all"
                style={{ width: `${Math.min((streak?.current_streak || 0) / 30 * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-text3">
              <span>10 XP/dia</span>
              <span>+2 XP por cada dia extra</span>
              <span>Max: 70 XP/dia</span>
            </div>
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="mb-8">
          <h2 className="font-rajdhani font-bold text-xl text-text mb-4 flex items-center gap-2">
            <Target className="text-teal" size={20} />
            Tarefas de Hoje
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {dailyTasks.map(task => (
              <div
                key={task.id}
                className={`bg-bg2 border rounded-xl p-4 ${
                  task.completed ? 'border-teal/50 bg-teal/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{task.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text text-sm">{task.name}</div>
                    <div className="text-xs text-text3">{task.description}</div>
                  </div>
                </div>
                <div className="h-1.5 bg-bg rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all ${task.completed ? 'bg-teal' : 'bg-purple'}`}
                    style={{ width: `${(task.progress / task.target) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text3">
                  <span>{task.progress}/{task.target}</span>
                  <span className="text-amber">+{task.xp_reward} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Section */}
        <div>
          <h2 className="font-rajdhani font-bold text-xl text-text mb-4 flex items-center gap-2">
            <Award className="text-purple" size={20} />
            Badges ({earnedCount}/{badges.length})
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {badges.map(badge => (
              <div
                key={badge.id}
                className={`relative rounded-xl p-4 text-center transition-all ${
                  badge.earned
                    ? RARITY_BG[badge.rarity]
                    : 'bg-bg3 border border-border opacity-60'
                }`}
              >
                {/* Icon */}
                <div className={`text-4xl mb-2 ${!badge.earned && 'grayscale'}`}>
                  {badge.earned ? badge.icon : '🔒'}
                </div>

                {/* Name */}
                <div className="font-semibold text-text text-sm mb-1">{badge.name}</div>

                {/* Rarity */}
                <span className={`inline-block text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gradient-to-r ${RARITY_COLORS[badge.rarity]} text-white`}>
                  {badge.rarity}
                </span>

                {/* XP */}
                <div className="text-[10px] text-amber mt-1">+{badge.xp_reward} XP</div>

                {/* Earned badge */}
                {badge.earned && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal rounded-full flex items-center justify-center">
                    <Unlock className="text-white" size={12} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-bg2 border border-border rounded-xl p-6">
          <h3 className="font-rajdhani font-bold text-text mb-2 flex items-center gap-2">
            <TrendingUp className="text-teal" size={18} />
            Dicas para Subir Mais Rápido
          </h3>
          <ul className="space-y-2 text-sm text-text2">
            <li>· Entra todos os dias para manter a sequência e ganhar XP bónus</li>
            <li>· Completa as tarefas diárias para XP extra</li>
            <li>· Participa em duelos e ganha para badges de combate</li>
            <li>· Contribui para o teu clã e ganha reconhecimento</li>
            <li>· Badges raras e épicas dão mais XP - guarda para as melhores!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
