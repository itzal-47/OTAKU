import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import GuestCTA from '../components/GuestCTA';
import { Calendar, Heart, MessageCircle, Clock, Tv, ChevronRight } from 'lucide-react';

interface AnimeSchedule {
  id: string;
  title: string;
  episode_number: number | null;
  day_of_week: string;
  time_of_day: string | null;
  streaming_platform: string | null;
  thumbnail_url: string | null;
  synopsis: string | null;
  is_active: boolean;
}

interface AnimeDiscussion {
  id: string;
  anime_schedule_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { username: string };
}

const DAYS_ORDER = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const DAYS_LABELS: Record<string, string> = {
  segunda: 'Segunda',
  terça: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sábado: 'Sábado',
  domingo: 'Domingo'
};

export default function AnimeSchedulePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [schedule, setSchedule] = useState<AnimeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSchedule | null>(null);
  const [discussions, setDiscussions] = useState<AnimeDiscussion[]>([]);
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadSchedule();
    if (user) loadReminders();
  }, [user]);

  useEffect(() => {
    if (selectedAnime) loadDiscussions();
  }, [selectedAnime]);

  async function loadSchedule() {
    try {
      const { data } = await supabase
        .from('anime_schedule')
        .select('*')
        .eq('is_active', true)
        .order('day_of_week');

      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReminders() {
    if (!user) return;
    const { data } = await supabase
      .from('anime_reminders')
      .select('anime_schedule_id')
      .eq('user_id', user.id);
    setReminders(new Set((data || []).map(r => r.anime_schedule_id)));
  }

  async function loadDiscussions() {
    if (!selectedAnime) return;
    const { data } = await supabase
      .from('anime_discussions')
      .select('id, anime_schedule_id, user_id, content, created_at, profiles(username)')
      .eq('anime_schedule_id', selectedAnime.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setDiscussions((data || []) as unknown as AnimeDiscussion[]);
  }

  async function toggleReminder(animeId: string) {
    if (!user) {
      showToast('Entra para adicionar lembretes', 'info');
      return;
    }

    try {
      if (reminders.has(animeId)) {
        await supabase.from('anime_reminders')
          .delete()
          .eq('anime_schedule_id', animeId)
          .eq('user_id', user.id);
        setReminders(prev => {
          const next = new Set(prev);
          next.delete(animeId);
          return next;
        });
        showToast('Lembrete removido', 'info');
      } else {
        await supabase.from('anime_reminders')
          .insert({ anime_schedule_id: animeId, user_id: user.id });
        setReminders(prev => new Set([...prev, animeId]));
        showToast('Vais ser notificado!', 'success');
      }
    } catch {
      showToast('Erro', 'error');
    }
  }

  async function addComment() {
    if (!user || !newComment.trim() || !selectedAnime) return;

    try {
      await supabase.from('anime_discussions').insert({
        anime_schedule_id: selectedAnime.id,
        user_id: user.id,
        content: newComment.trim()
      });
      setNewComment('');
      loadDiscussions();
    } catch {
      showToast('Erro ao comentar', 'error');
    }
  }

  function groupByDay(animes: AnimeSchedule[]) {
    const groups: Record<string, AnimeSchedule[]> = {};
    DAYS_ORDER.forEach(day => groups[day] = []);
    animes.forEach(anime => {
      if (groups[anime.day_of_week]) {
        groups[anime.day_of_week].push(anime);
      }
    });
    return groups;
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-bebas text-3xl md:text-4xl text-text mb-6">
            Calendário <span className="text-purple2">Anime</span>
          </h1>
          <GuestCTA
            title="Acompanha os Teus Animes"
            message="Faz login ou cria a tua conta agora para ouvir músicas, interagir com os Kambas e criar o teu personagem."
          />
        </div>
      </div>
    );
  }

  const grouped = groupByDay(schedule);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-bebas text-3xl md:text-4xl text-text mb-2">
            Calendário <span className="text-purple2">Anime</span>
          </h1>
          <p className="text-text2 text-sm">Acompanha os teus animes favoritos ao longo da semana.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS_ORDER.map(day => (
              <div key={day} className="bg-bg2 border border-border rounded-2xl overflow-hidden">
                <div className="bg-bg3 px-4 py-3 flex items-center gap-3">
                  <Calendar size={18} className="text-purple" />
                  <h2 className="font-rajdhani font-bold text-lg text-text">
                    {DAYS_LABELS[day]}
                  </h2>
                  <span className="text-xs text-text3 bg-bg px-2 py-0.5 rounded-full">
                    {grouped[day].length} animes
                  </span>
                </div>

                <div className="p-4">
                  {grouped[day].length === 0 ? (
                    <p className="text-text3 text-sm text-center py-4">Sem animes agendados</p>
                  ) : (
                    <div className="space-y-3">
                      {grouped[day].map(anime => (
                        <div
                          key={anime.id}
                          className="bg-bg3 rounded-xl p-4 flex items-center gap-4 hover:bg-bg4 transition-colors cursor-pointer"
                          onClick={() => setSelectedAnime(anime)}
                        >
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple/20 to-red/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {anime.thumbnail_url ? (
                              <img src={anime.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Tv className="text-purple" size={24} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-rajdhani font-bold text-text truncate">
                              {anime.title}
                              {anime.episode_number && (
                                <span className="text-purple text-sm ml-1">EP {anime.episode_number}</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-text3 mt-1">
                              {anime.time_of_day && (
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> {anime.time_of_day}
                                </span>
                              )}
                              {anime.streaming_platform && (
                                <span>{anime.streaming_platform}</span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReminder(anime.id);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              reminders.has(anime.id)
                                ? 'bg-red/20 text-red'
                                : 'bg-bg hover:bg-amber/20 text-text3 hover:text-amber'
                            }`}
                          >
                            <Heart size={18} fill={reminders.has(anime.id) ? 'currentColor' : 'none'} />
                          </button>

                          <ChevronRight size={18} className="text-text3" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Discussion Modal */}
        {selectedAnime && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-rajdhani font-bold text-lg text-text">{selectedAnime.title}</h2>
                    <p className="text-xs text-text3">
                      {DAYS_LABELS[selectedAnime.day_of_week]} • {selectedAnime.time_of_day || 'Horário não definido'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAnime(null)}
                    className="text-text3 hover:text-text"
                  >
                    ✕
                  </button>
                </div>
                {selectedAnime.synopsis && (
                  <p className="text-sm text-text2 mt-2">{selectedAnime.synopsis}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle size={16} className="text-purple" />
                  <span className="text-sm font-semibold text-text">Discussão</span>
                </div>

                {discussions.length === 0 ? (
                  <p className="text-text3 text-sm text-center py-4">
                    Sem comentários ainda. Sê o primeiro!
                  </p>
                ) : (
                  discussions.map(d => (
                    <div key={d.id} className="bg-bg3 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-purple">
                          @{d.profiles?.username || 'user'}
                        </span>
                        <span className="text-xs text-text3">
                          {new Date(d.created_at).toLocaleDateString('pt-AO')}
                        </span>
                      </div>
                      <p className="text-sm text-text">{d.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Escreve um comentário..."
                    className="input flex-1 text-sm"
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                  />
                  <button
                    onClick={addComment}
                    disabled={!newComment.trim()}
                    className="btn btn-primary px-4 disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
