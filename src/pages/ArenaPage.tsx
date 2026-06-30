import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { supabase } from '../lib/supabase';
import { CLASS_INFO, type CharacterClass } from '../types/index';
import {
  Swords, RefreshCw, Clock, AlertCircle, Zap, Shield, Heart, Target, X,
  ChevronRight, Trophy, RotateCcw, Cpu, Search, Send, Crosshair, Radio,
  Activity, Bot, History as HistoryIcon, Crown, Sparkles, MessageSquare,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WaitingFighter {
  duel_id: string; character_id: string; character_name: string; user_id: string; username: string;
  class: CharacterClass; level: number; hp: number; max_hp: number; attack: number; defense: number; speed: number; special: number; created_at: string;
}
interface DuelHistory {
  id: string; opponent_name: string; opponent_class: CharacterClass; result: 'win' | 'loss' | 'draw';
  xp_earned: number; created_at: string; duel_log?: TurnLog[];
}
interface TurnLog {
  turn: number; attacker: string; defender: string; damage: number; attackType: string; remainingHp: number; isCrit: boolean; isDodge: boolean;
}
interface FighterStats { name: string; class: CharacterClass; hp: number; max_hp: number; attack: number; defense: number; speed: number; special: number; }
interface ActiveDuel {
  id: string | null; myChar: FighterStats; oppChar: FighterStats; log: TurnLog[];
  status: 'fighting' | 'completed'; result?: 'win' | 'loss' | 'draw'; xpReward?: number; turn: number;
  isTraining?: boolean;
}
interface ChatMsg { id: string; sender: string; text: string; mine: boolean; }

const SUB_TABS = [
  { id: 'lobby', label: 'Lobby', icon: Radio },
  { id: 'direct', label: 'Desafio Directo', icon: Crosshair },
  { id: 'training', label: 'Treino IA', icon: Bot },
  { id: 'history', label: 'Histórico', icon: HistoryIcon },
] as const;
type SubTab = (typeof SUB_TABS)[number]['id'];

// Bot opponents for training, scaled roughly to player level
const BOT_NAMES = ['Sentinela-X', 'Kage Sombrio', 'Unidade Vermelha', 'Oni Mecânico', 'Ronin de Aço', 'Drone Kunoichi'];
const BOT_CLASSES: CharacterClass[] = ['ninja', 'samurai', 'mage', 'warrior'] as unknown as CharacterClass[];

// ─── Combat Engine (Algorithmic Judge) ───────────────────────────────────────

async function runCombat(
  myChar: FighterStats, oppChar: FighterStats,
  onTick: (log: TurnLog[], myHp: number, oppHp: number, turn: number) => void,
  speedMs = 550,
): Promise<{ log: TurnLog[]; result: 'win' | 'loss' | 'draw'; myHp: number; oppHp: number }> {
  const log: TurnLog[] = [];
  let myHp = myChar.hp, oppHp = oppChar.hp, turn = 1;
  let myTurn = myChar.speed >= oppChar.speed;
  const maxTurns = 50;

  while (myHp > 0 && oppHp > 0 && turn <= maxTurns) {
    const [attacker, defender] = myTurn ? [myChar, oppChar] : [oppChar, myChar];
    const [defenderHp] = myTurn ? [oppHp] : [myHp];
    const [attackerName, defenderName] = myTurn ? [myChar.name, oppChar.name] : [oppChar.name, myChar.name];

    const baseAttack = Math.floor(Math.random() * 20) + 10;
    const statBonus = Math.floor(attacker.attack * 0.4);
    const defenseReduction = Math.floor(defender.defense * 0.25);
    let damage = Math.max(1, baseAttack + statBonus - defenseReduction);

    const critChance = attacker.special / 300;
    const isCrit = Math.random() < critChance;
    if (isCrit) damage = Math.floor(damage * 1.5);

    const dodgeChance = Math.max(0.05, Math.min(0.25, (attacker.speed - defender.speed) / 200));
    const isDodge = Math.random() < dodgeChance;
    if (isDodge) damage = 0;

    const newDefenderHp = Math.max(0, defenderHp - damage);
    if (myTurn) oppHp = newDefenderHp; else myHp = newDefenderHp;

    const attackTypes = ['Ataque Normal', 'Golpe Rápido', 'Investida', 'Ataque Feroz', 'Corte Preciso', 'Combo Neural'];
    let attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
    if (isCrit) attackType = 'OVERCLOCK CRÍTICO!';
    if (isDodge) attackType = 'Desviou!';

    log.push({ turn, attacker: attackerName, defender: defenderName, damage, attackType, remainingHp: newDefenderHp, isCrit, isDodge });
    onTick([...log], myHp, oppHp, turn);
    await new Promise(r => setTimeout(r, speedMs));
    turn++;
    myTurn = !myTurn;
  }

  let result: 'win' | 'loss' | 'draw';
  if (myHp > 0 && oppHp <= 0) result = 'win';
  else if (myHp <= 0 && oppHp > 0) result = 'loss';
  else result = 'draw';

  return { log, result, myHp, oppHp };
}

// ─── HUD Bar ────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  return (
    <div className="relative h-3.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 10px ${color}88` }} />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white" style={{ textShadow: '0 1px 2px black' }}>
        {Math.max(0, hp)}/{maxHp}
      </div>
    </div>
  );
}

// ─── Duel Chat (live, ephemeral via broadcast) ───────────────────────────────

function DuelChat({ duelId, username }: { duelId: string; username: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ch = supabase.channel(`duel_chat_${duelId}`)
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        setMessages(prev => [...prev, { id: `${Date.now()}_${Math.random()}`, sender: payload.sender, text: payload.text, mine: payload.sender === username }]);
      })
      .subscribe();
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [duelId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send() {
    if (!text.trim() || !chRef.current) return;
    chRef.current.send({ type: 'broadcast', event: 'msg', payload: { sender: username, text: text.trim() } });
    setText('');
  }

  return (
    <div className="bg-black/40 border border-cyan-500/20 rounded-xl flex flex-col h-44 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-cyan-500/20 flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono uppercase tracking-wider">
        <MessageSquare size={11} /> Canal de Combate
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {messages.length === 0 && <p className="text-[11px] text-text3/60 text-center pt-4">Sem mensagens. Provoca o teu adversário 😈</p>}
        {messages.map(m => (
          <div key={m.id} className={`text-xs ${m.mine ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-2 py-1 rounded-lg ${m.mine ? 'bg-purple/30 text-purple-200' : 'bg-bg3 text-text2'}`}>
              <b className="opacity-70">{m.sender}:</b> {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex border-t border-cyan-500/20">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Mensagem rápida..." className="flex-1 bg-transparent px-3 py-2 text-xs text-text outline-none placeholder-text3/50" maxLength={120} />
        <button onClick={send} className="px-3 text-cyan-400 hover:text-cyan-300"><Send size={13} /></button>
      </div>
    </div>
  );
}

// ─── Duel Overlay ───────────────────────────────────────────────────────────

function DuelOverlay({ duel, username, onClose }: { duel: ActiveDuel; username: string; onClose: () => void }) {
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [duel.log]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-auto"
      style={{ background: 'radial-gradient(ellipse at center, rgba(20,10,40,0.97), rgba(0,0,0,0.99))' }}>

      {/* Scanline / grid backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: 'linear-gradient(rgba(139,92,246,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.15) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl md:text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 flex items-center gap-2">
            <Activity size={20} className="text-cyan-300" /> {duel.isTraining ? 'SIMULAÇÃO DE TREINO' : 'COMBATE EM CURSO'}
          </h2>
          <button onClick={onClose} className="text-text3 hover:text-white transition-colors"><X size={22} /></button>
        </div>

        {/* Fighters HUD */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
          <div className="bg-bg2/80 backdrop-blur border border-cyan-500/30 rounded-2xl p-3.5" style={{ boxShadow: '0 0 25px rgba(34,211,238,0.15)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="text-2xl">{CLASS_INFO[duel.myChar.class as CharacterClass]?.emoji}</div>
              <div className="min-w-0"><div className="font-rajdhani font-bold text-text text-sm truncate">{duel.myChar.name}</div><div className="text-[10px] text-cyan-300/70 font-mono">VOCÊ</div></div>
            </div>
            <HpBar hp={duel.myChar.hp} maxHp={duel.myChar.max_hp} color="#22d3ee" />
          </div>

          <div className="font-bebas text-3xl md:text-4xl text-amber px-1" style={{ textShadow: '0 0 20px rgba(245,158,11,0.6)' }}>VS</div>

          <div className="bg-bg2/80 backdrop-blur border border-pink-500/30 rounded-2xl p-3.5" style={{ boxShadow: '0 0 25px rgba(236,72,153,0.15)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="text-2xl">{CLASS_INFO[duel.oppChar.class as CharacterClass]?.emoji}</div>
              <div className="min-w-0"><div className="font-rajdhani font-bold text-text text-sm truncate">{duel.oppChar.name}</div><div className="text-[10px] text-pink-300/70 font-mono">{duel.isTraining ? 'IA' : 'ADVERSÁRIO'}</div></div>
            </div>
            <HpBar hp={duel.oppChar.hp} maxHp={duel.oppChar.max_hp} color="#ec4899" />
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_220px] gap-3">
          {/* Combat log */}
          <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-3 max-h-[340px] overflow-y-auto font-mono">
            <div className="space-y-1.5">
              {duel.log.map((t, i) => (
                <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${t.isCrit ? 'bg-amber/10 border border-amber/30' : t.isDodge ? 'bg-purple/10 border border-purple/30' : i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                  <span className="text-text3/60 w-6 flex-shrink-0">#{t.turn}</span>
                  <span className="flex-1 text-text2">
                    <b className="text-text">{t.attacker}</b> → <span className={t.isCrit ? 'text-amber font-bold' : t.isDodge ? 'text-purple-300' : 'text-cyan-300'}>{t.attackType}</span>
                    {!t.isDodge && <> <b className="text-text">{t.defender}</b> <span className="text-red font-bold">-{t.damage}</span></>}
                  </span>
                </div>
              ))}
            </div>
            <div ref={logEndRef} />
          </div>

          {/* Side panel: chat (only real duels) or stats */}
          {duel.id && !duel.isTraining ? (
            <DuelChat duelId={duel.id} username={username} />
          ) : (
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-3 flex flex-col justify-center items-center text-center gap-2">
              <Cpu size={22} className="text-pink-300" />
              <p className="text-[11px] text-text3">Modo de treino — sem registo competitivo. Ajuda-te a testar builds.</p>
            </div>
          )}
        </div>

        {duel.status === 'completed' && (
          <div className="mt-5 text-center bg-bg2/80 backdrop-blur border border-border rounded-2xl py-5">
            <div className={`text-4xl font-bebas mb-1 tracking-wide ${duel.result === 'win' ? 'text-teal' : duel.result === 'loss' ? 'text-red' : 'text-amber'}`} style={{ textShadow: duel.result === 'win' ? '0 0 20px rgba(20,184,166,0.6)' : undefined }}>
              {duel.result === 'win' ? '🏆 VITÓRIA' : duel.result === 'loss' ? '💀 DERROTA' : '🤝 EMPATE'}
            </div>
            {!duel.isTraining && <div className="text-base text-purple2 font-bold">+{duel.xpReward} XP</div>}
            <button onClick={onClose} className="btn btn-primary mt-4"><RotateCcw size={15} /> Voltar à Arena</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const { user, character } = useAuth();
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<SubTab>('lobby');
  const [waitingFighters, setWaitingFighters] = useState<WaitingFighter[]>([]);
  const [myPendingDuels, setMyPendingDuels] = useState<{ id: string; created_at: string }[]>([]);
  const [duelHistory, setDuelHistory] = useState<DuelHistory[]>([]);
  const [activeDuel, setActiveDuel] = useState<ActiveDuel | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [animating, setAnimating] = useState(false);
  const arenaChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Direct challenge state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; char?: any }[]>([]);
  const [searching, setSearching] = useState(false);
  const [challenging, setChallenging] = useState<string | null>(null);

  useEffect(() => {
    if (!character) return;
    loadArenaData();
    if (arenaChannelRef.current) supabase.removeChannel(arenaChannelRef.current);
    const ch = supabase.channel('arena_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, loadArenaData).subscribe();
    arenaChannelRef.current = ch;
    return () => { if (arenaChannelRef.current) supabase.removeChannel(arenaChannelRef.current); };
  }, [character?.id]);

  async function loadArenaData() {
    setLoading(true);
    try {
      const { data: waitingDuels } = await supabase.from('duels')
        .select('id, challenger_id, created_at, challenger_character_id')
        .is('opponent_id', null).eq('status', 'waiting').neq('challenger_id', user?.id || '')
        .order('created_at', { ascending: true }).limit(20);

      if (waitingDuels?.length) {
        const ids = waitingDuels.map(d => d.challenger_id);
        const [{ data: chars }, { data: profs }] = await Promise.all([
          supabase.from('characters').select('id, name, class, level, hp, max_hp, attack, defense, speed, special, user_id').in('user_id', ids),
          supabase.from('profiles').select('id, username').in('id', ids),
        ]);
        const combined: WaitingFighter[] = waitingDuels.map(d => {
          const c = chars?.find(x => x.user_id === d.challenger_id);
          const p = profs?.find(x => x.id === d.challenger_id);
          return {
            duel_id: d.id, character_id: c?.id || '', character_name: c?.name || 'Unknown', user_id: d.challenger_id,
            username: p?.username || 'Unknown', class: (c?.class as CharacterClass) || 'ninja', level: c?.level || 1,
            hp: c?.hp || 100, max_hp: c?.max_hp || 100, attack: c?.attack || 50, defense: c?.defense || 50, speed: c?.speed || 50, special: c?.special || 50,
            created_at: d.created_at,
          };
        }).filter(f => f.character_id);
        setWaitingFighters(combined);
      } else setWaitingFighters([]);

      if (user) {
        const { data: history } = await supabase.from('duels')
          .select('id, result, xp_reward, created_at, challenger_id, opponent_id, duel_log')
          .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`).eq('status', 'completed')
          .order('created_at', { ascending: false }).limit(20);

        if (history?.length) {
          const oppIds = history.map(d => d.challenger_id === user.id ? d.opponent_id : d.challenger_id).filter(Boolean);
          const [{ data: oc }] = await Promise.all([supabase.from('characters').select('user_id, name, class').in('user_id', oppIds)]);
          setDuelHistory(history.map(d => {
            const oppId = d.challenger_id === user.id ? d.opponent_id : d.challenger_id;
            const oppChar = oc?.find(c => c.user_id === oppId);
            return {
              id: d.id, opponent_name: oppChar?.name || 'Unknown', opponent_class: (oppChar?.class as CharacterClass) || 'ninja',
              result: d.result as 'win' | 'loss' | 'draw', xp_earned: d.xp_reward || 0, created_at: d.created_at,
              duel_log: (d.duel_log as unknown as TurnLog[]) || undefined,
            };
          }));
        } else setDuelHistory([]);

        const { data: pending } = await supabase.from('duels').select('id, created_at').eq('challenger_id', user.id).is('opponent_id', null).eq('status', 'waiting').order('created_at', { ascending: false });
        setMyPendingDuels(pending || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreateDuel() {
    if (!user || !character) { showToast('Cria um personagem primeiro', 'info'); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from('duels').insert({ challenger_id: user.id, challenger_character_id: character.id, status: 'waiting' });
      if (error) throw error;
      showToast('Desafio lançado! Aguardando adversário...', 'success');
      loadArenaData();
    } catch { showToast('Erro ao criar duelo', 'error'); }
    finally { setCreating(false); }
  }

  async function handleJoinDuel(duelId: string, opponentId: string) {
    if (!user || !character) { showToast('Cria um personagem primeiro', 'info'); return; }
    setJoiningId(duelId);
    try {
      const { data: duel, error } = await supabase.from('duels')
        .update({ opponent_id: user.id, opponent_character_id: character.id, status: 'in_progress' })
        .eq('id', duelId).select().maybeSingle();
      if (error) throw error;
      if (!duel) { showToast('Este duelo já foi aceite', 'info'); loadArenaData(); return; }
      await runRealDuel(duelId, opponentId);
    } catch { showToast('Erro ao entrar no duelo', 'error'); }
    finally { setJoiningId(null); }
  }

  async function runRealDuel(duelId: string, opponentId: string) {
    if (!character) return;
    const { data: opponentChar } = await supabase.from('characters').select('*').eq('user_id', opponentId).maybeSingle();
    if (!opponentChar) { showToast('Erro ao carregar adversário', 'error'); return; }

    const myChar: FighterStats = { ...character };
    const oppChar: FighterStats = { ...opponentChar };
    setActiveDuel({ id: duelId, myChar: { ...myChar }, oppChar: { ...oppChar }, log: [], status: 'fighting', turn: 0 });
    setAnimating(true);

    const { log, result, myHp, oppHp } = await runCombat(myChar, oppChar, (l, mh, oh, t) => {
      setActiveDuel(prev => prev ? { ...prev, myChar: { ...prev.myChar, hp: mh }, oppChar: { ...prev.oppChar, hp: oh }, log: l, turn: t } : null);
    });

    const xpReward = result === 'win' ? 50 : result === 'loss' ? 20 : 30;
    await supabase.from('duels').update({
      result, winner_id: result === 'win' ? user?.id : result === 'loss' ? opponentId : null,
      xp_reward: xpReward, status: 'completed', completed_at: new Date().toISOString(), duel_log: log,
    }).eq('id', duelId);

    const updates: Record<string, number> = { xp: character.xp + xpReward };
    if (result === 'win') updates.wins = character.wins + 1;
    else if (result === 'loss') updates.losses = character.losses + 1;
    else updates.draws = (character.draws || 0) + 1;
    const xpNeeded = character.level * 100;
    if (updates.xp >= xpNeeded) {
      updates.level = character.level + 1; updates.xp -= xpNeeded;
      updates.max_hp = Math.floor(character.max_hp * 1.1); updates.hp = updates.max_hp;
      updates.attack = Math.floor(character.attack * 1.05); updates.defense = Math.floor(character.defense * 1.05);
      updates.speed = Math.floor(character.speed * 1.03); updates.special = Math.floor(character.special * 1.05);
      showToast(`Subiste para o nível ${updates.level}!`, 'success');
    }
    await supabase.from('characters').update(updates).eq('id', character.id);

    const oppXp = result === 'win' ? 20 : result === 'loss' ? 50 : 30;
    const oppUpdates: Record<string, number> = { xp: opponentChar.xp + oppXp };
    if (result === 'win') oppUpdates.losses = opponentChar.losses + 1;
    else if (result === 'loss') oppUpdates.wins = opponentChar.wins + 1;
    else oppUpdates.draws = (opponentChar.draws || 0) + 1;
    await supabase.from('characters').update(oppUpdates).eq('id', opponentChar.id);

    setActiveDuel(prev => prev ? { ...prev, status: 'completed', result, xpReward, myChar: { ...prev.myChar, hp: myHp }, oppChar: { ...prev.oppChar, hp: oppHp }, log } : null);
    setAnimating(false);
    const resultText = result === 'win' ? '🏆 Vitória!' : result === 'loss' ? '💀 Derrota' : '🤝 Empate';
    showToast(`${resultText} +${xpReward} XP`, result === 'win' ? 'success' : result === 'loss' ? 'error' : 'info');
    loadArenaData();
  }

  async function handleCancelDuel(duelId: string) {
    if (!user) return;
    try {
      await supabase.from('duels').update({ status: 'cancelled' }).eq('id', duelId).eq('challenger_id', user.id);
      showToast('Desafio cancelado', 'info');
      loadArenaData();
    } catch { showToast('Erro ao cancelar', 'error'); }
  }

  // ── Direct challenge by username ──
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data: profs } = await supabase.from('profiles').select('id, username').ilike('username', `%${searchQuery}%`).neq('id', user?.id || '').limit(8);
      if (profs?.length) {
        const ids = profs.map(p => p.id);
        const { data: chars } = await supabase.from('characters').select('user_id, name, class, level').in('user_id', ids);
        setSearchResults(profs.map(p => ({ ...p, char: chars?.find(c => c.user_id === p.id) })));
      } else setSearchResults([]);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, user?.id]);

  async function handleDirectChallenge(opponentId: string, opponentUsername: string) {
    if (!user || !character) return;
    setChallenging(opponentId);
    try {
      const { data: newDuel, error } = await supabase.from('duels')
        .insert({ challenger_id: user.id, challenger_character_id: character.id, status: 'waiting' })
        .select('id').maybeSingle();
      if (error || !newDuel) throw error;
      await supabase.from('notifications').insert({
        user_id: opponentId, type: 'duel_challenge', title: 'Desafio directo!',
        message: `${character.name} desafiou-te para um duelo na Arena`,
        data: { duel_id: newDuel.id },
      });
      showToast(`Desafio enviado a ${opponentUsername}! ⚔️`, 'success');
      setSearchQuery(''); setSearchResults([]);
      loadArenaData();
    } catch { showToast('Erro ao enviar desafio', 'error'); }
    finally { setChallenging(null); }
  }

  // ── Training vs AI ──
  async function handleStartTraining(difficulty: 'easy' | 'normal' | 'hard') {
    if (!character) return;
    const mult = difficulty === 'easy' ? 0.7 : difficulty === 'normal' ? 1 : 1.35;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const botClass = BOT_CLASSES[Math.floor(Math.random() * BOT_CLASSES.length)];
    const botChar: FighterStats = {
      name: botName, class: botClass,
      max_hp: Math.floor(character.max_hp * mult), hp: Math.floor(character.max_hp * mult),
      attack: Math.floor(character.attack * mult), defense: Math.floor(character.defense * mult),
      speed: Math.floor(character.speed * mult), special: Math.floor(character.special * mult),
    };
    const myChar: FighterStats = { ...character };
    setActiveDuel({ id: null, myChar: { ...myChar }, oppChar: { ...botChar }, log: [], status: 'fighting', turn: 0, isTraining: true });
    setAnimating(true);
    const { log, result, myHp, oppHp } = await runCombat(myChar, botChar, (l, mh, oh, t) => {
      setActiveDuel(prev => prev ? { ...prev, myChar: { ...prev.myChar, hp: mh }, oppChar: { ...prev.oppChar, hp: oh }, log: l, turn: t } : null);
    }, 400);
    setActiveDuel(prev => prev ? { ...prev, status: 'completed', result, myChar: { ...prev.myChar, hp: myHp }, oppChar: { ...prev.oppChar, hp: oppHp }, log } : null);
    setAnimating(false);
  }

  const filteredFighters = useMemo(() => filterLevel === 'all' ? waitingFighters : waitingFighters.filter(f => {
    const lvl = parseInt(filterLevel); return f.level >= lvl && f.level < lvl + 10;
  }), [waitingFighters, filterLevel]);

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚔️</div>
          <h1 className="font-bebas text-4xl tracking-wide text-text mb-4">Precisas de um Personagem</h1>
          <p className="text-text2 mb-8">Cria o teu personagem primeiro para entrares na Arena.</p>
          <Link to="/criar-personagem" className="btn btn-danger btn-lg">🎭 Criar Personagem</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 relative" style={{ background: 'radial-gradient(ellipse at top, rgba(76,29,149,0.08), transparent 60%)' }}>
      {/* Ambient grid backdrop, futuristic */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.07] -z-10"
        style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="max-w-6xl mx-auto">
        {/* Header HUD */}
        <div className="text-center mb-8">
          <h1 className="font-bebas text-5xl md:text-6xl tracking-widest mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400" style={{ filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.4))' }}>
            ARENA
          </h1>
          <p className="text-text3 text-sm font-mono tracking-wide uppercase">// sistema de combate algorítmico online</p>

          <div className="mt-5 inline-flex items-center gap-4 bg-bg2/80 backdrop-blur border border-cyan-500/20 rounded-2xl px-6 py-3" style={{ boxShadow: '0 0 30px rgba(34,211,238,0.08)' }}>
            <div className="text-3xl">{CLASS_INFO[character.class as CharacterClass]?.emoji}</div>
            <div className="text-left">
              <div className="font-rajdhani font-bold text-text">{character.name}</div>
              <div className="text-xs text-text3 font-mono">Nv.{character.level} · {character.wins}W / {character.losses}L</div>
            </div>
            <div className="h-8 w-px bg-cyan-500/20 mx-1" />
            <div className="text-xs text-cyan-300 font-mono">{character.xp}/{character.level * 100} XP</div>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex justify-center gap-1.5 mb-7 flex-wrap">
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all border ${
                  active ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-200 border-cyan-400/40' : 'text-text3 border-transparent hover:text-text hover:bg-bg3'
                }`} style={active ? { boxShadow: '0 0 15px rgba(34,211,238,0.15)' } : undefined}>
                <Icon size={14} /> {tab.label}
                {tab.id === 'lobby' && filteredFighters.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-[10px]">{filteredFighters.length}</span>}
                {tab.id === 'history' && duelHistory.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-bg4 text-[10px]">{duelHistory.length}</span>}
              </button>
            );
          })}
        </div>

        {/* Active Duel */}
        {activeDuel && <DuelOverlay duel={activeDuel} username={character.name} onClose={() => setActiveDuel(null)} />}

        {/* ── Lobby ── */}
        {subTab === 'lobby' && (
          <div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-bg3 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-text2">
                <option value="all">Todos os níveis</option>
                <option value="1">Nível 1-10</option>
                <option value="10">Nível 10-20</option>
                <option value="20">Nível 20-30</option>
                <option value="30">Nível 30+</option>
              </select>
              <div className="flex gap-2">
                <button onClick={loadArenaData} disabled={loading} className="btn btn-ghost text-xs px-3 py-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar</button>
                <button onClick={handleCreateDuel} disabled={creating || myPendingDuels.length > 0} className="btn btn-danger text-xs px-4 py-2 disabled:opacity-50">
                  {creating ? 'Lançando...' : '⚔️ Lançar Desafio'}
                </button>
              </div>
            </div>

            {myPendingDuels.length > 0 && (
              <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
                <span className="text-sm text-amber flex items-center gap-2"><Clock size={14} /> Tens um desafio aberto à espera de adversário</span>
                <button onClick={() => handleCancelDuel(myPendingDuels[0].id)} className="text-xs text-red hover:underline">Cancelar</button>
              </div>
            )}

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-56 bg-bg2 border border-border rounded-2xl animate-pulse" />)}</div>
            ) : filteredFighters.length === 0 ? (
              <div className="text-center py-14 bg-bg2/60 border border-cyan-500/10 rounded-2xl">
                <AlertCircle className="mx-auto mb-3 text-text3" size={40} />
                <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Sem desafios abertos no lobby</h3>
                <p className="text-text3 text-sm">Lança um desafio e aguarda um adversário entrar.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFighters.map(f => (
                  <div key={f.duel_id} className="bg-bg2/80 backdrop-blur border border-cyan-500/15 rounded-2xl p-5 hover:border-cyan-400/40 transition-colors" style={{ boxShadow: '0 0 20px rgba(34,211,238,0.05)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-bg3 flex items-center justify-center text-2xl border border-cyan-500/20">{CLASS_INFO[f.class]?.emoji || '⚔️'}</div>
                      <div className="flex-1"><div className="font-rajdhani font-bold text-text">{f.character_name}</div><div className="text-xs text-text3">{CLASS_INFO[f.class]?.name} · Nv.{f.level}</div></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                      <div className="bg-bg3 rounded-lg p-2"><Heart size={13} className="mx-auto text-teal mb-1" /><div className="text-xs font-bold text-text">{f.hp}</div></div>
                      <div className="bg-bg3 rounded-lg p-2"><Target size={13} className="mx-auto text-red mb-1" /><div className="text-xs font-bold text-text">{f.attack}</div></div>
                      <div className="bg-bg3 rounded-lg p-2"><Shield size={13} className="mx-auto text-purple mb-1" /><div className="text-xs font-bold text-text">{f.defense}</div></div>
                      <div className="bg-bg3 rounded-lg p-2"><Zap size={13} className="mx-auto text-amber mb-1" /><div className="text-xs font-bold text-text">{f.level}</div></div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text3 mb-4">
                      <span>@{f.username}</span>
                      <span className="flex items-center gap-1"><Clock size={11} />{new Date(f.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button onClick={() => handleJoinDuel(f.duel_id, f.user_id)} disabled={joiningId === f.duel_id || animating} className="btn btn-primary w-full justify-center text-sm py-2">
                      {joiningId === f.duel_id ? 'Entrando...' : '⚔️ Aceitar Desafio'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Direct Challenge ── */}
        {subTab === 'direct' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-bg2/80 backdrop-blur border border-purple-500/20 rounded-2xl p-6" style={{ boxShadow: '0 0 25px rgba(139,92,246,0.08)' }}>
              <div className="flex items-center gap-2 mb-1"><Crosshair size={18} className="text-purple-300" /><h3 className="font-bebas text-2xl tracking-wide text-text">Desafio Directo</h3></div>
              <p className="text-text3 text-sm mb-4">Procura por nome de utilizador e envia um desafio específico. Ele recebe uma notificação e pode aceitar no Lobby.</p>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por username..." className="input w-full pl-10 text-sm" />
              </div>
              <div className="mt-3 space-y-2 min-h-[80px]">
                {searching && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-border2 border-t-purple rounded-full animate-spin" /></div>}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && <p className="text-center text-xs text-text3 py-4">Nenhum kamba encontrado.</p>}
                {searchResults.map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-bg3 rounded-xl px-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-bg flex items-center justify-center text-sm">{r.char ? CLASS_INFO[r.char.class as CharacterClass]?.emoji : '👤'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text truncate">{r.username}</div>
                      <div className="text-[11px] text-text3">{r.char ? `${r.char.name} · Nv.${r.char.level}` : 'Sem personagem'}</div>
                    </div>
                    <button onClick={() => handleDirectChallenge(r.id, r.username)} disabled={!r.char || challenging === r.id} className="btn btn-primary text-xs py-1.5 px-3 disabled:opacity-40">
                      {challenging === r.id ? '...' : 'Desafiar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Training vs AI ── */}
        {subTab === 'training' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-bg2/80 backdrop-blur border border-pink-500/20 rounded-2xl p-6 text-center" style={{ boxShadow: '0 0 25px rgba(236,72,153,0.08)' }}>
              <Cpu size={40} className="mx-auto mb-3 text-pink-300" />
              <h3 className="font-bebas text-2xl tracking-wide text-text mb-2">Simulador de Treino IA</h3>
              <p className="text-text3 text-sm mb-6">Luta contra um adversário gerado algoritmicamente. Não afecta o teu histórico nem ranking — serve só para testares a tua build.</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'easy', label: 'Fácil', sub: '70% stats', color: 'text-teal border-teal/30 hover:bg-teal/10' },
                  { id: 'normal', label: 'Normal', sub: '100% stats', color: 'text-amber border-amber/30 hover:bg-amber/10' },
                  { id: 'hard', label: 'Difícil', sub: '135% stats', color: 'text-red border-red/30 hover:bg-red/10' },
                ] as const).map(d => (
                  <button key={d.id} onClick={() => handleStartTraining(d.id)} className={`border rounded-xl py-3 px-2 transition-colors ${d.color}`}>
                    <div className="font-rajdhani font-bold text-sm">{d.label}</div>
                    <div className="text-[10px] opacity-70 font-mono">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── History ── */}
        {subTab === 'history' && (
          <div className="bg-bg2/80 backdrop-blur border border-border rounded-2xl overflow-hidden">
            {duelHistory.length === 0 ? (
              <div className="text-center py-14">
                <Swords className="mx-auto mb-3 text-text3" size={40} />
                <h3 className="font-rajdhani font-bold text-lg text-text mb-1">Sem duelos ainda</h3>
                <p className="text-text3 text-sm">Entra na Arena e começa a tua jornada de combate.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {duelHistory.map(d => (
                  <div key={d.id} className="flex items-center gap-4 p-4 hover:bg-bg3/50 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-bg3 flex items-center justify-center text-xl">{CLASS_INFO[d.opponent_class]?.emoji || '⚔️'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-rajdhani font-bold text-text truncate">{d.opponent_name}</div>
                      <div className="text-xs text-text3">{new Date(d.created_at).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${d.result === 'win' ? 'bg-teal/15 text-teal' : d.result === 'loss' ? 'bg-red/15 text-red' : 'bg-amber/15 text-amber'}`}>
                      {d.result === 'win' ? '🏆 Vitória' : d.result === 'loss' ? '💀 Derrota' : '🤝 Empate'}
                    </div>
                    <div className="text-sm font-bold text-purple2 flex-shrink-0">+{d.xp_earned} XP</div>
                    {d.duel_log?.length ? (
                      <button onClick={() => setActiveDuel({ id: d.id, myChar: { ...character, name: character.name }, oppChar: { name: d.opponent_name, class: d.opponent_class, hp: 0, max_hp: 100, attack: 50, defense: 50, speed: 50, special: 50 }, log: d.duel_log!, status: 'completed', result: d.result, xpReward: d.xp_earned, turn: d.duel_log!.length })} className="btn btn-ghost text-xs py-1 px-2 flex-shrink-0">
                        <ChevronRight size={15} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
