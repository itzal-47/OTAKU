import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { supabase } from '../lib/supabase';
import { CLASS_INFO, type CharacterClass } from '../types/index';
import { Swords, RefreshCw, Clock, AlertCircle, Zap, Shield, Heart, Target, X, ChevronRight, Trophy, RotateCcw } from 'lucide-react';

interface WaitingFighter {
  duel_id: string;
  character_id: string;
  character_name: string;
  user_id: string;
  username: string;
  class: CharacterClass;
  level: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  created_at: string;
}

interface DuelHistory {
  id: string;
  opponent_name: string;
  opponent_class: CharacterClass;
  result: 'win' | 'loss' | 'draw';
  xp_earned: number;
  created_at: string;
  duel_log?: TurnLog[];
}

interface TurnLog {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  attackType: string;
  remainingHp: number;
  isCrit: boolean;
  isDodge: boolean;
}

interface ActiveDuel {
  id: string;
  myChar: {
    name: string;
    class: CharacterClass;
    hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    speed: number;
    special: number;
  };
  oppChar: {
    name: string;
    class: CharacterClass;
    hp: number;
    max_hp: number;
    attack: number;
    defense: number;
    speed: number;
    special: number;
  };
  log: TurnLog[];
  status: 'fighting' | 'completed';
  result?: 'win' | 'loss' | 'draw';
  xpReward?: number;
  turn: number;
}

export default function ArenaPage() {
  const { user, profile, character } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'waiting' | 'my-pending' | 'history' | 'create'>('waiting');
  const [waitingFighters, setWaitingFighters] = useState<WaitingFighter[]>([]);
  const [myPendingDuels, setMyPendingDuels] = useState<{ id: string; created_at: string }[]>([]);
  const [duelHistory, setDuelHistory] = useState<DuelHistory[]>([]);
  const [activeDuel, setActiveDuel] = useState<ActiveDuel | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [animating, setAnimating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (character) {
      loadArenaData();
      const channel = supabase.channel('arena_updates');
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, () => {
        loadArenaData();
      });
      channel.subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [character]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDuel?.log]);

  async function loadArenaData() {
    setLoading(true);
    try {
      const { data: waitingDuels } = await supabase
        .from('duels')
        .select('id, challenger_id, created_at, challenger_character_id')
        .is('opponent_id', null)
        .eq('status', 'waiting')
        .neq('challenger_id', user?.id || '')
        .order('created_at', { ascending: true })
        .limit(20);

      if (waitingDuels && waitingDuels.length > 0) {
        const challengerIds = waitingDuels.map(d => d.challenger_id);
        const [{ data: characters }, { data: profiles }] = await Promise.all([
          supabase.from('characters').select('id, name, class, level, hp, max_hp, attack, defense, speed, special, user_id').in('user_id', challengerIds),
          supabase.from('profiles').select('id, username').in('id', challengerIds)
        ]);

        const combined: WaitingFighter[] = waitingDuels.map(duel => {
          const char = characters?.find(c => c.user_id === duel.challenger_id);
          const prof = profiles?.find(p => p.id === duel.challenger_id);
          return {
            duel_id: duel.id,
            character_id: char?.id || '',
            character_name: char?.name || 'Unknown',
            user_id: duel.challenger_id,
            username: prof?.username || 'Unknown',
            class: char?.class as CharacterClass || 'ninja',
            level: char?.level || 1,
            hp: char?.hp || 100,
            max_hp: char?.max_hp || 100,
            attack: char?.attack || 50,
            defense: char?.defense || 50,
            speed: char?.speed || 50,
            special: char?.special || 50,
            created_at: duel.created_at
          };
        }).filter(f => f.character_id);

        setWaitingFighters(combined);
      } else {
        setWaitingFighters([]);
      }

      if (user) {
        const { data: history } = await supabase
          .from('duels')
          .select('id, result, xp_reward, created_at, challenger_id, opponent_id, duel_log')
          .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        if (history && history.length > 0) {
          const opponentIds = history.map(d =>
            d.challenger_id === user.id ? d.opponent_id : d.challenger_id
          ).filter(Boolean);

          const [{ data: oppCharacters }, { data: oppProfiles }] = await Promise.all([
            supabase.from('characters').select('user_id, name, class').in('user_id', opponentIds),
            supabase.from('profiles').select('id, username').in('id', opponentIds)
          ]);

          const formatted: DuelHistory[] = history.map(duel => {
            const oppId = duel.challenger_id === user.id ? duel.opponent_id : duel.challenger_id;
            const oppChar = oppCharacters?.find(c => c.user_id === oppId);
            return {
              id: duel.id,
              opponent_name: oppChar?.name || 'Unknown',
              opponent_class: oppChar?.class as CharacterClass || 'ninja',
              result: duel.result as 'win' | 'loss' | 'draw',
              xp_earned: duel.xp_reward || 0,
              created_at: duel.created_at,
              duel_log: duel.duel_log as unknown as TurnLog[] || undefined
            };
          });

          setDuelHistory(formatted);
        } else {
          setDuelHistory([]);
        }

        const { data: pending } = await supabase
          .from('duels')
          .select('id, created_at')
          .eq('challenger_id', user.id)
          .is('opponent_id', null)
          .eq('status', 'waiting')
          .order('created_at', { ascending: false });
        setMyPendingDuels(pending || []);
      }
    } catch (error) {
      console.error('Error loading arena:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDuel() {
    if (!user || !character) {
      showToast('Cria um personagem primeiro', 'info');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('duels').insert({
        challenger_id: user.id,
        challenger_character_id: character.id,
        status: 'waiting'
      });
      if (error) throw error;
      showToast('Duelo criado! Aguardando oponente...', 'success');
      loadArenaData();
    } catch {
      showToast('Erro ao criar duelo', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinDuel(duelId: string, opponentId: string) {
    if (!user || !character) {
      showToast('Cria um personagem primeiro', 'info');
      return;
    }
    setJoiningId(duelId);
    try {
      const { data: duel, error } = await supabase
        .from('duels')
        .update({
          opponent_id: user.id,
          opponent_character_id: character.id,
          status: 'in_progress'
        })
        .eq('id', duelId)
        .select()
        .single();

      if (error) throw error;
      await simulateDuel(duelId, opponentId);
    } catch {
      showToast('Erro ao entrar no duelo', 'error');
    } finally {
      setJoiningId(null);
    }
  }

  async function simulateDuel(duelId: string, opponentId: string) {
    if (!character) return;
    const { data: opponentChar } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', opponentId)
      .single();
    if (!opponentChar) {
      showToast('Erro ao carregar oponente', 'error');
      return;
    }

    const myChar = { ...character };
    const oppChar = { ...opponentChar };
    const log: TurnLog[] = [];
    let myHp = myChar.hp;
    let oppHp = oppChar.hp;
    let turn = 1;
    const maxTurns = 50;

    // Determine first attacker by speed
    let myTurn = myChar.speed >= oppChar.speed;

    setActiveDuel({
      id: duelId,
      myChar: { ...myChar },
      oppChar: { ...oppChar },
      log: [],
      status: 'fighting',
      turn: 0
    });
    setAnimating(true);

    while (myHp > 0 && oppHp > 0 && turn <= maxTurns) {
      const [attacker, defender] = myTurn ? [myChar, oppChar] : [oppChar, myChar];
      const [attackerHp, defenderHp] = myTurn ? [myHp, oppHp] : [oppHp, myHp];
      const [attackerName, defenderName] = myTurn ? [myChar.name, oppChar.name] : [oppChar.name, myChar.name];

      // Calculate attack
      const baseAttack = Math.floor(Math.random() * 20) + 10; // Random 10-30
      const statBonus = Math.floor(attacker.attack * 0.4);
      const defenseReduction = Math.floor(defender.defense * 0.25);
      let damage = Math.max(1, baseAttack + statBonus - defenseReduction);

      // Critical hit chance based on special
      const critChance = attacker.special / 300;
      const isCrit = Math.random() < critChance;
      if (isCrit) damage = Math.floor(damage * 1.5);

      // Dodge chance based on speed difference
      const dodgeChance = Math.max(0.05, Math.min(0.25, (attacker.speed - defender.speed) / 200));
      const isDodge = Math.random() < dodgeChance;
      if (isDodge) damage = 0;

      let newDefenderHp = Math.max(0, defenderHp - damage);
      if (myTurn) {
        oppHp = newDefenderHp;
      } else {
        myHp = newDefenderHp;
      }

      // Determine attack type
      const attackTypes = ['Ataque Normal', 'Golpe Rápido', 'Investida', 'Ataque Feroz', 'Corte Preciso'];
      let attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
      if (isCrit) attackType = 'ATAQUE CRÍTICO!';
      if (isDodge) attackType = 'Desviou!';

      const turnLog: TurnLog = {
        turn,
        attacker: attackerName,
        defender: defenderName,
        damage,
        attackType,
        remainingHp: newDefenderHp,
        isCrit,
        isDodge
      };
      log.push(turnLog);

      setActiveDuel(prev => prev ? {
        ...prev,
        myChar: { ...prev.myChar, hp: myHp },
        oppChar: { ...prev.oppChar, hp: oppHp },
        log: [...log],
        turn
      } : null);

      await new Promise(r => setTimeout(r, 600));
      turn++;
      myTurn = !myTurn;
    }

    // Determine result
    let result: 'win' | 'loss' | 'draw';
    if (myHp > 0 && oppHp <= 0) result = 'win';
    else if (myHp <= 0 && oppHp > 0) result = 'loss';
    else if (myHp <= 0 && oppHp <= 0) result = 'draw';
    else result = 'draw'; // timeout

    const xpReward = result === 'win' ? 50 : result === 'loss' ? 20 : 30;

    // Update duel
    await supabase
      .from('duels')
      .update({
        result,
        winner_id: result === 'win' ? user?.id : result === 'loss' ? opponentId : null,
        xp_reward: xpReward,
        status: 'completed',
        completed_at: new Date().toISOString(),
        duel_log: log
      })
      .eq('id', duelId);

    // Update my character
    const updates: Record<string, number> = { xp: character.xp + xpReward };
    if (result === 'win') updates.wins = character.wins + 1;
    else if (result === 'loss') updates.losses = character.losses + 1;
    else updates.draws = (character.draws || 0) + 1;

    const xpNeeded = character.level * 100;
    if (updates.xp >= xpNeeded) {
      updates.level = character.level + 1;
      updates.xp = updates.xp - xpNeeded;
      updates.max_hp = Math.floor(character.max_hp * 1.1);
      updates.hp = updates.max_hp;
      updates.attack = Math.floor(character.attack * 1.05);
      updates.defense = Math.floor(character.defense * 1.05);
      updates.speed = Math.floor(character.speed * 1.03);
      updates.special = Math.floor(character.special * 1.05);
      showToast(`Subiste para o nível ${updates.level}!`, 'success');
    }
    await supabase.from('characters').update(updates).eq('id', character.id);

    // Update opponent
    const oppXp = result === 'win' ? 20 : result === 'loss' ? 50 : 30;
    const oppUpdates: Record<string, number> = { xp: opponentChar.xp + oppXp };
    if (result === 'win') oppUpdates.losses = opponentChar.losses + 1;
    else if (result === 'loss') oppUpdates.wins = opponentChar.wins + 1;
    else oppUpdates.draws = (opponentChar.draws || 0) + 1;
    await supabase.from('characters').update(oppUpdates).eq('id', opponentChar.id);

    setActiveDuel(prev => prev ? {
      ...prev,
      status: 'completed',
      result,
      xpReward,
      myChar: { ...prev.myChar, hp: myHp },
      oppChar: { ...prev.oppChar, hp: oppHp },
      log
    } : null);
    setAnimating(false);

    const resultText = result === 'win' ? '🏆 Vitória!' : result === 'loss' ? '💀 Derrota' : '🤝 Empate';
    showToast(`${resultText} +${xpReward} XP`, result === 'win' ? 'success' : result === 'loss' ? 'error' : 'info');
    loadArenaData();
  }

  async function handleCancelDuel(duelId: string) {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('duels')
        .delete()
        .eq('id', duelId)
        .eq('challenger_id', user.id);
      if (error) throw error;
      showToast('Duelo cancelado', 'info');
      loadArenaData();
    } catch {
      showToast('Erro ao cancelar', 'error');
    }
  }

  const filteredFighters = filterLevel === 'all'
    ? waitingFighters
    : waitingFighters.filter(f => {
        const level = parseInt(filterLevel);
        return f.level >= level && f.level < level + 10;
      });

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚔️</div>
          <h1 className="font-bebas text-4xl tracking-wide text-text mb-4">Precisas de um Personagem</h1>
          <p className="text-text2 mb-8">Cria o teu personagem primeiro para poderes duelar na arena.</p>
          <Link to="/criar-personagem" className="btn btn-danger btn-lg">🎭 Criar Personagem</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-bebas text-5xl md:text-6xl tracking-wide text-text mb-4">
            Arena de <span className="text-red">Duelos</span>
          </h1>
          <p className="text-text2 max-w-xl mx-auto">
            Desafia outros guerreiros angolanos. Ganha XP, sobe de nível e torna-te o campeão nacional.
          </p>
          <div className="mt-6 inline-flex items-center gap-4 bg-bg2 border border-border rounded-2xl px-6 py-3">
            <div className="text-3xl">{CLASS_INFO[character.class as CharacterClass]?.emoji}</div>
            <div className="text-left">
              <div className="font-rajdhani font-bold text-text">{character.name}</div>
              <div className="text-xs text-text3">Nv. {character.level} · {character.wins}W/{character.losses}L</div>
            </div>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="text-xs text-text3">{character.xp}/{character.level * 100} XP</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {[
            { id: 'waiting', label: '⚔️ Desafios Abertos', count: filteredFighters.length },
            { id: 'my-pending', label: '⏳ Meus Pendentes', count: myPendingDuels.length },
            { id: 'history', label: '📜 Histórico', count: duelHistory.length },
            { id: 'create', label: '🎯 Criar Duelo' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-purple/20 text-purple2 border border-purple/30'
                  : 'text-text3 hover:text-text hover:bg-bg3'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-bg4 text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Active Duel Overlay */}
        {activeDuel && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto">
            <div className="w-full max-w-2xl">
              {/* Duel Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bebas text-3xl text-text">Duelo em Progresso</h2>
                <button
                  onClick={() => setActiveDuel(null)}
                  className="text-text3 hover:text-text"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Fighters */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex-1 bg-bg2 border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{CLASS_INFO[activeDuel.myChar.class as CharacterClass]?.emoji}</div>
                    <div>
                      <div className="font-rajdhani font-bold text-text">{activeDuel.myChar.name}</div>
                      <div className="text-xs text-text3">{CLASS_INFO[activeDuel.myChar.class as CharacterClass]?.name}</div>
                    </div>
                  </div>
                  <div className="mb-1 text-xs text-text3">HP {activeDuel.myChar.hp}/{activeDuel.myChar.max_hp}</div>
                  <div className="h-3 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal rounded-full transition-all"
                      style={{ width: `${Math.max(0, (activeDuel.myChar.hp / activeDuel.myChar.max_hp) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="font-bebas text-4xl text-amber">VS</div>

                <div className="flex-1 bg-bg2 border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{CLASS_INFO[activeDuel.oppChar.class as CharacterClass]?.emoji}</div>
                    <div>
                      <div className="font-rajdhani font-bold text-text">{activeDuel.oppChar.name}</div>
                      <div className="text-xs text-text3">{CLASS_INFO[activeDuel.oppChar.class as CharacterClass]?.name}</div>
                    </div>
                  </div>
                  <div className="mb-1 text-xs text-text3">HP {activeDuel.oppChar.hp}/{activeDuel.oppChar.max_hp}</div>
                  <div className="h-3 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red rounded-full transition-all"
                      style={{ width: `${Math.max(0, (activeDuel.oppChar.hp / activeDuel.oppChar.max_hp) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Turn Log */}
              <div className="bg-bg2 border border-border rounded-2xl p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {activeDuel.log.map((turn, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        turn.isCrit ? 'bg-amber/10 border border-amber/30' :
                        turn.isDodge ? 'bg-purple/10 border border-purple/30' :
                        i % 2 === 0 ? 'bg-bg3' : 'bg-bg3/50'
                      }`}
                    >
                      <div className="text-xs text-text3 font-mono w-8">#{turn.turn}</div>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-text">{turn.attacker}</span>
                        <span className="text-sm text-text2"> usou </span>
                        <span className={`text-sm font-semibold ${
                          turn.isCrit ? 'text-amber' : turn.isDodge ? 'text-purple' : 'text-teal'
                        }`}>{turn.attackType}</span>
                        {!turn.isDodge && (
                          <>
                            <span className="text-sm text-text2"> em </span>
                            <span className="text-sm font-semibold text-text">{turn.defender}</span>
                            <span className="text-sm text-red font-bold"> -{turn.damage} HP</span>
                          </>
                        )}
                        <span className="text-xs text-text3 ml-2">(HP restante: {turn.remainingHp})</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={logEndRef} />
              </div>

              {/* Result */}
              {activeDuel.status === 'completed' && (
                <div className="mt-4 text-center">
                  <div className={`text-4xl font-bebas mb-2 ${
                    activeDuel.result === 'win' ? 'text-teal' :
                    activeDuel.result === 'loss' ? 'text-red' : 'text-amber'
                  }`}>
                    {activeDuel.result === 'win' ? '🏆 VITÓRIA!' :
                     activeDuel.result === 'loss' ? '💀 DERROTA' : '🤝 EMPATE'}
                  </div>
                  <div className="text-lg text-purple2 font-bold">+{activeDuel.xpReward} XP</div>
                  <button
                    onClick={() => setActiveDuel(null)}
                    className="btn btn-primary mt-4"
                  >
                    <RotateCcw size={16} /> Voltar à Arena
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Waiting Tab */}
        {activeTab === 'waiting' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <select
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                  className="bg-bg3 border border-border2 rounded-lg px-3 py-2 text-sm text-text2"
                >
                  <option value="all">Todos os níveis</option>
                  <option value="1">Nível 1-10</option>
                  <option value="10">Nível 10-20</option>
                  <option value="20">Nível 20-30</option>
                  <option value="30">Nível 30+</option>
                </select>
              </div>
              <button onClick={loadArenaData} disabled={loading} className="btn btn-ghost text-xs px-3 py-2">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-2 border-border2 border-t-purple rounded-full animate-spin" />
              </div>
            ) : filteredFighters.length === 0 ? (
              <div className="text-center py-12 bg-bg2 border border-border rounded-2xl">
                <AlertCircle className="mx-auto mb-4 text-text3" size={48} />
                <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem desafios abertos</h3>
                <p className="text-text3 text-sm mb-6">Sê o primeiro a criar um duelo!</p>
                <button onClick={() => setActiveTab('create')} className="btn btn-danger">⚔️ Criar Duelo</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFighters.map(fighter => (
                  <div key={fighter.duel_id} className="bg-bg2 border border-border rounded-2xl p-5 hover:border-purple/40 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-bg3 flex items-center justify-center text-2xl">
                        {CLASS_INFO[fighter.class]?.emoji || '⚔️'}
                      </div>
                      <div className="flex-1">
                        <div className="font-rajdhani font-bold text-text">{fighter.character_name}</div>
                        <div className="text-xs text-text3">{CLASS_INFO[fighter.class]?.name || 'Classe'} · Nv. {fighter.level}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                      <div className="bg-bg3 rounded-lg p-2">
                        <Heart size={14} className="mx-auto text-teal mb-1" />
                        <div className="text-xs font-bold text-text">{fighter.hp}</div>
                      </div>
                      <div className="bg-bg3 rounded-lg p-2">
                        <Target size={14} className="mx-auto text-red mb-1" />
                        <div className="text-xs font-bold text-text">{fighter.attack}</div>
                      </div>
                      <div className="bg-bg3 rounded-lg p-2">
                        <Shield size={14} className="mx-auto text-purple mb-1" />
                        <div className="text-xs font-bold text-text">{fighter.defense}</div>
                      </div>
                      <div className="bg-bg3 rounded-lg p-2">
                        <Zap size={14} className="mx-auto text-amber mb-1" />
                        <div className="text-xs font-bold text-text">{fighter.level}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text3 mb-4">
                      <span>@{fighter.username}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />{new Date(fighter.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleJoinDuel(fighter.duel_id, fighter.user_id)}
                      disabled={joiningId === fighter.duel_id || animating}
                      className="btn btn-primary w-full justify-center text-sm py-2"
                    >
                      {joiningId === fighter.duel_id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Entrando...
                        </span>
                      ) : '⚔️ Desafiar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Pending Tab */}
        {activeTab === 'my-pending' && (
          <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">
            {myPendingDuels.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto mb-4 text-text3" size={48} />
                <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem duelos pendentes</h3>
                <p className="text-text3 text-sm mb-4">Cria um duelo para encontrares um oponente!</p>
                <button onClick={() => setActiveTab('create')} className="btn btn-danger">Criar Duelo</button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myPendingDuels.map(duel => (
                  <div key={duel.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber/15 flex items-center justify-center">
                        <Clock className="text-amber" size={24} />
                      </div>
                      <div>
                        <div className="font-rajdhani font-bold text-text">Aguardando oponente...</div>
                        <div className="text-xs text-text3">Criado {new Date(duel.created_at).toLocaleString('pt-AO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <button onClick={() => handleCancelDuel(duel.id)} className="btn btn-ghost text-red text-sm py-2">
                      <X size={16} /> Cancelar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-bg2 border border-border rounded-2xl overflow-hidden">
            {duelHistory.length === 0 ? (
              <div className="text-center py-12">
                <Swords className="mx-auto mb-4 text-text3" size={48} />
                <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Sem duelos ainda</h3>
                <p className="text-text3 text-sm">Cria um duelo e começa a tua jornada!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {duelHistory.map(duel => (
                  <div key={duel.id} className="flex items-center gap-4 p-4 hover:bg-bg3/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-bg3 flex items-center justify-center text-xl">
                      {CLASS_INFO[duel.opponent_class]?.emoji || '⚔️'}
                    </div>
                    <div className="flex-1">
                      <div className="font-rajdhani font-bold text-text">{duel.opponent_name}</div>
                      <div className="text-xs text-text3">{new Date(duel.created_at).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                      duel.result === 'win' ? 'bg-teal/15 text-teal' :
                      duel.result === 'loss' ? 'bg-red/15 text-red' : 'bg-amber/15 text-amber'
                    }`}>
                      {duel.result === 'win' ? '🏆 Vitória' : duel.result === 'loss' ? '💀 Derrota' : '🤝 Empate'}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-purple2">+{duel.xp_earned} XP</div>
                    </div>
                    {duel.duel_log && duel.duel_log.length > 0 && (
                      <button
                        onClick={() => {
                          setActiveDuel({
                            id: duel.id,
                            myChar: { ...character, hp: character.hp, max_hp: character.max_hp },
                            oppChar: {
                              name: duel.opponent_name,
                              class: duel.opponent_class,
                              hp: 0,
                              max_hp: 100,
                              attack: 50,
                              defense: 50,
                              speed: 50,
                              special: 50
                            },
                            log: duel.duel_log,
                            status: 'completed',
                            result: duel.result,
                            xpReward: duel.xp_earned,
                            turn: duel.duel_log.length
                          });
                        }}
                        className="btn btn-ghost text-sm py-1 px-2"
                      >
                        <ChevronRight size={16} /> Ver Log
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-bg2 border border-border rounded-2xl p-8 text-center">
              <div className="text-6xl mb-6">⚔️</div>
              <h3 className="font-bebas text-3xl text-text mb-4">Criar Novo Duelo</h3>
              <p className="text-text2 mb-8">Cria um duelo e aguarda um oponente. Quando alguém aceitar, a batalha começa automaticamente!</p>
              <div className="bg-bg3 rounded-xl p-4 mb-6 border border-border">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-2">{CLASS_INFO[character.class as CharacterClass]?.emoji}</div>
                    <div className="font-rajdhani font-bold text-text">{character.name}</div>
                    <div className="text-xs text-text3">Nv. {character.level}</div>
                  </div>
                  <div className="font-bebas text-4xl text-amber">VS</div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-bg4 border border-border2 flex items-center justify-center text-3xl">❓</div>
                    <div className="text-xs text-text3 mt-2">Oponente</div>
                  </div>
                </div>
              </div>
              <button onClick={handleCreateDuel} disabled={creating} className="btn btn-danger btn-lg w-full justify-center">
                {creating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Criando...
                  </span>
                ) : '⚔️ Criar Duelo'}
              </button>
              <p className="text-xs text-text3 mt-4">O duelo ficará aberto por 30 minutos. Cancela a qualquer momento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
