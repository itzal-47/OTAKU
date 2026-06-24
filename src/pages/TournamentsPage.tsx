import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import {
  Trophy, Calendar, Users, Plus, X, Search, Clock,
  ChevronRight, Crown, Target, Swords, Check, AlertCircle
} from 'lucide-react';
import type { Tournament, TournamentParticipant, TournamentMatch } from '../types/index';

const STATUS_COLORS = {
  upcoming: 'bg-blue/20 text-blue',
  registration: 'bg-teal/20 text-teal',
  active: 'bg-red/20 text-red',
  completed: 'bg-text3/20 text-text3',
  cancelled: 'bg-text3/10 text-text3',
};

const STATUS_LABELS = {
  upcoming: 'Em breve',
  registration: 'Inscrições abertas',
  active: 'Em andamento',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export default function TournamentsPage() {
  const { id } = useParams();
  const { user, profile, character } = useAuth();
  const { showToast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [ registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket' | 'participants'>('overview');

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    max_participants: 32 as 8 | 16 | 32 | 64,
    min_level: 1,
    prize_pool: '',
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (id) {
      loadTournamentDetails(id);
    }
  }, [id]);

  async function loadTournaments() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      // Get participant counts
      if (data) {
        const withCounts = await Promise.all(
          data.map(async t => {
            const { count } = await supabase
              .from('tournament_participants')
              .select('*', { count: 'exact', head: true })
              .eq('tournament_id', t.id);
            return { ...t, participants_count: count || 0 };
          })
        );
        setTournaments(withCounts);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTournamentDetails(tournamentId: string) {
    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      setSelectedTournament(tournament);

      // Load participants
      const { data: partsData } = await supabase
        .from('tournament_participants')
        .select('*, user:profiles(id, username), character:characters(name, class, level)')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      setParticipants(partsData || []);

      // Load matches
      const { data: matchesData } = await supabase
        .from('tournament_matches')
        .select('*, player1:profiles!tournament_matches_player1_id_fkey(id, username), player2:profiles!tournament_matches_player2_id_fkey(id, username), player1_char:characters!tournament_matches_player1_char_id_fkey(name, class), player2_char:characters!tournament_matches_player2_char_id_fkey(name, class)')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      setMatches(matchesData || []);
    } catch (error) {
      console.error('Error loading tournament details:', error);
    }
  }

  async function handleCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile?.is_admin) {
      showToast('Apenas admins podem criar e anunciar torneios', 'error');
      return;
    }

    setRegistering(true);
    try {
      const { error } = await supabase.from('tournaments').insert({
        name: createForm.name,
        description: createForm.description,
        start_date: new Date(createForm.start_date).toISOString(),
        end_date: new Date(createForm.end_date).toISOString(),
        registration_deadline: new Date(createForm.registration_deadline).toISOString(),
        max_participants: createForm.max_participants,
        min_level: createForm.min_level,
        prize_pool: createForm.prize_pool || undefined,
        status: 'upcoming',
        created_by: user.id,
      });

      if (error) throw error;

      showToast('Torneio criado!', 'success');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        registration_deadline: '',
        max_participants: 32,
        min_level: 1,
        prize_pool: '',
      });
      loadTournaments();
    } catch {
      showToast('Erro ao criar torneio', 'error');
    } finally {
      setRegistering(false);
    }
  }

  async function handleRegister(tournamentId: string) {
    if (!user || !character) {
      showToast('Precisas de um personagem', 'info');
      return;
    }

    setRegistering(true);
    try {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: tournamentId,
        user_id: user.id,
        character_id: character.id,
      });

      if (error) throw error;

      showToast('Inscrito no torneio!', 'success');
      loadTournaments();
      if (selectedTournament) loadTournamentDetails(selectedTournament.id);
    } catch (error: any) {
      if (error.code === '23505') {
        showToast('Já estás inscrito', 'error');
      } else {
        showToast('Erro ao inscrever', 'error');
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleUnregister(tournamentId: string) {
    if (!user) return;

    setRegistering(true);
    try {
      await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);

      showToast('Inscrição cancelada', 'info');
      loadTournaments();
      if (selectedTournament) loadTournamentDetails(selectedTournament.id);
    } catch {
      showToast('Erro ao cancelar', 'error');
    } finally {
      setRegistering(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-AO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function getRoundName(round: number, maxRounds: number): string {
    const roundNames: Record<number, string> = {
      [maxRounds]: 'Final',
      [maxRounds - 1]: 'Semifinal',
      [maxRounds - 2]: 'Quartas de Final',
    };
    return roundNames[round] || `Rodada ${round}`;
  }

  const isRegistered = (tournamentId: string) =>
    participants.some(p => p.user_id === user?.id);

  const maxRounds = selectedTournament
    ? Math.log2(selectedTournament.max_participants)
    : 5;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="w-14 h-14 border-2 border-border2 border-t-purple rounded-full animate-spin" />
      </div>
    );
  }

  // Tournament Detail View
  if (id && selectedTournament) {
    const spotsLeft = selectedTournament.max_participants - (selectedTournament.participants_count || 0);
    const canRegister = selectedTournament.status === 'registration' &&
                        spotsLeft > 0 &&
                        character &&
                        character.level >= selectedTournament.min_level;

    return (
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <Link to="/torneios" className="text-text3 hover:text-text text-sm mb-4 inline-flex items-center gap-1">
            <ChevronRight size={16} className="rotate-180" />
            Voltar
          </Link>

          {/* Header */}
          <div className="bg-bg2 border border-border rounded-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${STATUS_COLORS[selectedTournament.status]}`}>
                  {STATUS_LABELS[selectedTournament.status]}
                </div>
                <h1 className="font-bebas text-4xl text-text mb-2">{selectedTournament.name}</h1>
                <p className="text-text2 mb-4">{selectedTournament.description}</p>

                <div className="flex flex-wrap gap-4 text-sm text-text3">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={16} />
                    {formatDate(selectedTournament.start_date)} - {formatDate(selectedTournament.end_date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={16} />
                    {selectedTournament.participants_count || 0}/{selectedTournament.max_participants}
                  </span>
                  {selectedTournament.prize_pool && (
                    <span className="flex items-center gap-1.5 text-amber">
                      <Trophy size={16} />
                      {selectedTournament.prize_pool}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {canRegister && !isRegistered(selectedTournament.id) && (
                  <button
                    onClick={() => handleRegister(selectedTournament.id)}
                    disabled={registering}
                    className="btn btn-primary"
                  >
                    {registering ? 'Inscrevendo...' : 'Inscrever-se'}
                  </button>
                )}
                {isRegistered(selectedTournament.id) && selectedTournament.status === 'registration' && (
                  <button
                    onClick={() => handleUnregister(selectedTournament.id)}
                    disabled={registering}
                    className="btn btn-ghost"
                  >
                    Cancelar Inscrição
                  </button>
                )}
                {!canRegister && !isRegistered(selectedTournament.id) && selectedTournament.status === 'registration' && (
                  <div className="text-sm text-text3">
                    {!character && 'Cria um personagem primeiro'}
                    {character && character.level < selectedTournament.min_level && `Nível mínimo: ${selectedTournament.min_level}`}
                    {spotsLeft <= 0 && 'Vagas esgotadas'}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6 border-t border-border pt-4">
              {[
                { id: 'overview', label: 'Visão Geral' },
                { id: 'bracket', label: 'Chave' },
                { id: 'participants', label: 'Participantes' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id ? 'bg-purple text-white' : 'bg-bg3 text-text2 hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-bg2 border border-border rounded-xl p-5">
                <h3 className="font-rajdhani font-bold text-lg text-text mb-3">Informações</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text3">Início</span>
                    <span className="text-text">{formatDate(selectedTournament.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text3">Fim</span>
                    <span className="text-text">{formatDate(selectedTournament.end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text3">Inscrições até</span>
                    <span className="text-text">{formatDate(selectedTournament.registration_deadline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text3">Nível mínimo</span>
                    <span className="text-text">{selectedTournament.min_level}+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text3">Formato</span>
                    <span className="text-text">Eliminação Direta ({selectedTournament.max_participants})</span>
                  </div>
                </div>
              </div>

              <div className="bg-bg2 border border-border rounded-xl p-5">
                <h3 className="font-rajdhani font-bold text-lg text-text mb-3">Regras</h3>
                <ul className="space-y-2 text-sm text-text2">
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-teal mt-0.5 flex-shrink-0" />
                    Todos os duelos são 1v1 na Arena
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-teal mt-0.5 flex-shrink-0" />
                    O vencedor avança para a próxima rodada
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-teal mt-0.5 flex-shrink-0" />
                    BYE: Se houver número ímpar, um jogador avança automaticamente
                  </li>
                  <li className="flex items-start gap-2">
                    <Check size={16} className="text-teal mt-0.5 flex-shrink-0" />
                    XP bónus por cada vitória
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'bracket' && (
            <div className="bg-bg2 border border-border rounded-xl p-6">
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto text-text3 mb-2" size={32} />
                  <p className="text-text3">Chave ainda não disponível</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: maxRounds }, (_, i) => i + 1).reverse().map(round => {
                    const roundMatches = matches.filter(m => m.round === round);
                    if (roundMatches.length === 0) return null;

                    return (
                      <div key={round}>
                        <h4 className="text-sm font-semibold text-text3 mb-2 uppercase tracking-wider">
                          {getRoundName(round, maxRounds)}
                        </h4>
                        <div className="grid gap-2">
                          {roundMatches.map(match => (
                            <div
                              key={match.id}
                              className="bg-bg3 rounded-lg p-3 flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <div className={`flex items-center gap-2 p-2 rounded ${match.winner_id === match.player1_id ? 'bg-teal/10 border border-teal/30' : ''}`}>
                                  <span className="font-medium text-text">{match.player1?.username || 'TBD'}</span>
                                  {match.winner_id === match.player1_id && <Crown size={14} className="text-amber" />}
                                </div>
                                <div className="text-center text-xs text-text3 my-1">vs</div>
                                <div className={`flex items-center gap-2 p-2 rounded ${match.winner_id === match.player2_id ? 'bg-teal/10 border border-teal/30' : ''}`}>
                                  <span className="font-medium text-text">{match.player2?.username || 'TBD'}</span>
                                  {match.winner_id === match.player2_id && <Crown size={14} className="text-amber" />}
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${match.status === 'completed' ? 'bg-teal/20 text-teal' : 'bg-bg4 text-text3'}`}>
                                {match.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <h3 className="font-rajdhani font-bold text-lg text-text mb-4">
                Participantes ({participants.length})
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {participants.map((p, idx) => (
                  <Link
                    key={p.id}
                    to={`/perfil/${p.user?.username}`}
                    className="flex items-center gap-3 bg-bg3 rounded-lg p-3 hover:bg-bg4 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-red flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">{p.user?.username}</div>
                      <div className="text-xs text-text3">{p.character?.name} · Nv. {p.character?.level}</div>
                    </div>
                    {p.eliminated && (
                      <span className="text-xs text-red">Eliminado</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-bebas text-4xl text-text">Torneios</h1>
            <p className="text-text3 text-sm">Prova o teu valor nos grandes campeonatos</p>
          </div>
          {profile?.is_admin && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
              <Plus size={18} />
              Criar Torneio
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6">
          {['all', 'upcoming', 'registration', 'active', 'completed'].map(filter => (
            <button
              key={filter}
              className="btn btn-ghost text-sm py-2"
            >
              {filter === 'all' ? 'Todos' : STATUS_LABELS[filter as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>

        {/* Tournaments */}
        {tournaments.length === 0 ? (
          <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
            <Trophy className="mx-auto text-text3 mb-4" size={48} />
            <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem torneios</h3>
            <p className="text-text3">Novos torneios são adicionados frequentemente!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map(tournament => {
              const spotsLeft = tournament.max_participants - (tournament.participants_count || 0);
              const userRegistered = participants.some(p => p.user_id === user?.id);

              return (
                <Link
                  key={tournament.id}
                  to={`/torneios/${tournament.id}`}
                  className="block bg-bg2 border border-border rounded-xl p-5 hover:border-purple/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[tournament.status]}`}>
                          {STATUS_LABELS[tournament.status]}
                        </span>
                        {userRegistered && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal/20 text-teal">
                            Inscrito
                          </span>
                        )}
                      </div>
                      <h3 className="font-rajdhani font-bold text-xl text-text mb-1">{tournament.name}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-text3">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(tournament.start_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {tournament.participants_count || 0}/{tournament.max_participants}
                        </span>
                        {tournament.prize_pool && (
                          <span className="flex items-center gap-1 text-amber">
                            <Trophy size={14} />
                            {tournament.prize_pool}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {tournament.status === 'registration' && spotsLeft > 0 && (
                        <span className="text-teal text-sm font-medium">
                          {spotsLeft} vagas
                        </span>
                      )}
                      <ChevronRight className="text-text3" size={20} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-rajdhani font-bold text-xl text-text">Criar Torneio</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-text3 hover:text-text">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div>
                  <label className="text-sm text-text2 mb-1 block">Nome do Torneio</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    className="input"
                    required
                    placeholder="Ex: Torneio de Verão 2026"
                  />
                </div>

                <div>
                  <label className="text-sm text-text2 mb-1 block">Descrição</label>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    className="input min-h-[80px] resize-none"
                    placeholder="Descrição do torneio..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text2 mb-1 block">Início</label>
                    <input
                      type="datetime-local"
                      value={createForm.start_date}
                      onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text2 mb-1 block">Fim</label>
                    <input
                      type="datetime-local"
                      value={createForm.end_date}
                      onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text2 mb-1 block">Limite de Inscrições</label>
                    <input
                      type="datetime-local"
                      value={createForm.registration_deadline}
                      onChange={e => setCreateForm(f => ({ ...f, registration_deadline: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text2 mb-1 block">Participantes</label>
                    <select
                      value={createForm.max_participants}
                      onChange={e => setCreateForm(f => ({ ...f, max_participants: parseInt(e.target.value) as any }))}
                      className="input"
                    >
                      <option value={8}>8</option>
                      <option value={16}>16</option>
                      <option value={32}>32</option>
                      <option value={64}>64</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text2 mb-1 block">Nível Mínimo</label>
                    <input
                      type="number"
                      value={createForm.min_level}
                      onChange={e => setCreateForm(f => ({ ...f, min_level: parseInt(e.target.value) || 1 }))}
                      className="input"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text2 mb-1 block">Prémio (opcional)</label>
                    <input
                      type="text"
                      value={createForm.prize_pool}
                      onChange={e => setCreateForm(f => ({ ...f, prize_pool: e.target.value }))}
                      className="input"
                      placeholder="Ex: 5000 XP + Badge"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost flex-1">
                    Cancelar
                  </button>
                  <button type="submit" disabled={registering} className="btn btn-primary flex-1">
                    {registering ? 'Criando...' : 'Criar Torneio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
