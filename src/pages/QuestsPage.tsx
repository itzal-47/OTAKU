import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Target, Check, Clock, Zap, Award, Swords, MessageSquare, Users, Image, Eye } from 'lucide-react';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  objective_type: string;
  objective_count: number;
  xp_reward: number;
  is_active: boolean;
}

interface UserQuest {
  id: string;
  quest_id: string;
  progress: number;
  completed: boolean;
  completed_at: string;
  quest: Quest;
}

export default function QuestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadQuests();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadQuests() {
    if (!user) return;
    setLoading(true);
    try {
      // Get active quests
      const { data: activeQuests } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true);

      if (!activeQuests) {
        setQuests([]);
        return;
      }

      // Get user progress
      const { data: userQuests } = await supabase
        .from('user_quests')
        .select('*')
        .eq('user_id', user.id);

      const userQuestMap = new Map(userQuests?.map(uq => [uq.quest_id, uq]) || []);

      // Create user_quests entries for new quests
      const newQuests = activeQuests.filter(q => !userQuestMap.has(q.id));
      if (newQuests.length > 0) {
        const inserts = newQuests.map(q => ({
          user_id: user.id,
          quest_id: q.id,
          progress: 0,
          completed: false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }));
        await supabase.from('user_quests').insert(inserts);
        // Reload after insert
        const { data: updatedUserQuests } = await supabase
          .from('user_quests')
          .select('*')
          .eq('user_id', user.id);
        const updatedMap = new Map(updatedUserQuests?.map(uq => [uq.quest_id, uq]) || []);
        
        const formatted: UserQuest[] = activeQuests.map(q => ({
          ...(updatedMap.get(q.id) || { id: '', progress: 0, completed: false, completed_at: '' }),
          quest: q
        }));
        setQuests(formatted);
      } else {
        const formatted: UserQuest[] = activeQuests.map(q => ({
          ...(userQuestMap.get(q.id) || { id: '', progress: 0, completed: false, completed_at: '' }),
          quest: q
        }));
        setQuests(formatted);
      }
    } catch (error) {
      console.error('Error loading quests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function claimQuest(userQuestId: string) {
    if (!user) return;
    setClaimingId(userQuestId);
    try {
      await supabase
        .from('user_quests')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('id', userQuestId);

      showToast('Recompensa reclamada!', 'success');
      loadQuests();
    } catch {
      showToast('Erro ao reclamar', 'error');
    } finally {
      setClaimingId(null);
    }
  }

  function getQuestIcon(objectiveType: string) {
    switch (objectiveType) {
      case 'win_duel': return <Swords size={20} className="text-red" />;
      case 'create_post': return <Image size={20} className="text-purple" />;
      case 'join_group': return <Users size={20} className="text-teal" />;
      case 'send_messages': return <MessageSquare size={20} className="text-amber" />;
      case 'view_stories': return <Eye size={20} className="text-blue" />;
      case 'level_up': return <Zap size={20} className="text-amber" />;
      default: return <Target size={20} className="text-purple" />;
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-bebas text-4xl md:text-5xl text-text mb-3">
            Missões <span className="text-purple2">Diárias</span>
          </h1>
          <p className="text-text2 max-w-lg mx-auto">
            Completa missões diárias para ganhar XP e recompensas. Novas missões todos os dias!
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Target size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Entra para ver as missões</h3>
            <p className="text-text3 text-sm">As missões são para guerreiros registrados.</p>
          </div>
        ) : quests.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Clock size={48} className="mx-auto mb-4 text-text3" />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem missões ativas</h3>
            <p className="text-text3 text-sm">Volta mais tarde para novas missões.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {quests.map((uq) => (
              <div
                key={uq.quest.id}
                className={`bg-bg2 border border-border rounded-2xl p-5 transition-all ${
                  uq.completed ? 'opacity-60' : 'hover:border-purple/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-bg3 flex items-center justify-center flex-shrink-0">
                    {getQuestIcon(uq.quest.objective_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-rajdhani font-bold text-text">{uq.quest.title}</h3>
                      <span className="flex items-center gap-1 text-xs text-purple2 font-bold">
                        <Zap size={12} /> +{uq.quest.xp_reward} XP
                      </span>
                    </div>
                    <p className="text-sm text-text2 mb-3">{uq.quest.description}</p>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-text3 mb-1">
                        <span>Progresso</span>
                        <span>{uq.progress} / {uq.quest.objective_count}</span>
                      </div>
                      <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple rounded-full transition-all"
                          style={{ width: `${Math.min((uq.progress / uq.quest.objective_count) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {uq.completed ? (
                      <div className="flex items-center gap-2 text-teal text-sm font-semibold">
                        <Check size={16} />
                        Completado
                      </div>
                    ) : (
                      <button
                        onClick={() => claimQuest(uq.id)}
                        disabled={claimingId === uq.id || uq.progress < uq.quest.objective_count}
                        className="btn btn-primary text-sm py-2 px-4 disabled:opacity-50"
                      >
                        {claimingId === uq.id ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Reclamando...
                          </span>
                        ) : uq.progress >= uq.quest.objective_count ? (
                          <span className="flex items-center gap-2">
                            <Award size={14} /> Reclamar
                          </span>
                        ) : (
                          'Em progresso'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
