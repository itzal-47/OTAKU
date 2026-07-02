import {
  useEffect, useRef, useState, useCallback, useMemo,
  type TouchEvent as ReactTouchEvent
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { prepareMediaForUpload } from '../lib/imageCompress';
import { handleError } from '../lib/errorHandler';
import {
  Send, Search, Plus, X, Smile, Image as ImageIcon, Mic, Music, Gift,
  MoreVertical, Phone, Video, Check, CheckCheck, Trash2, Flag, UserX,
  BellOff, Filter, ChevronLeft, Play, Pause, Square, Loader2,
  Moon, Sun, Palette
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrivateChat {
  id: string; user1_id: string; user2_id: string;
  last_message_at: string; created_at: string;
  nickname_for_user1?: string; nickname_for_user2?: string;
  theme?: string;
}
interface PrivateMessage {
  id: string; chat_id: string; sender_id: string; content: string;
  read_at: string | null; created_at: string;
  message_type?: string; media_url?: string;
  reactions?: Record<string, string[]>;
  ost_data?: { id: string; title: string; artist: string; audio_url?: string };
}
interface Profile { id: string; username: string; avatar_url: string; province: string; }

const CHAT_THEMES: Record<string, { label: string; accent: string; bg: string }> = {
  purple: { label: 'Roxo', accent: '#8b5cf6', bg: '#8b5cf620' },
  teal: { label: 'Teal', accent: '#14b8a6', bg: '#14b8a620' },
  red: { label: 'Vermelho', accent: '#ef4444', bg: '#ef444420' },
  amber: { label: 'Âmbar', accent: '#f59e0b', bg: '#f59e0b20' },
  pink: { label: 'Rosa', accent: '#ec4899', bg: '#ec489920' },
};

const MSG_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👊', '🫡', '⚔️'];

const EMOJI_CATEGORIES = [
  { label: '😊', emojis: ['😀','😂','🥰','😍','🤩','😎','🥳','😭','😤','😡','🥺','😴','🤔','😏','🙄','😈','👻','🤖'] },
  { label: '👋', emojis: ['👋','🤙','👊','✊','🤜','👏','🙌','🤞','✌️','🤟','🤘','👍','👎','❤️','🔥','⚔️','🛡️','✨'] },
  { label: '🎌', emojis: ['🎌','⛩️','🗾','🌸','🎋','🎎','🎏','🎐','🏮','🎑','🎍','🧧','🎭','🎴','🀄','🎯','🎲','♟️'] },
  { label: '😸', emojis: ['🐱','🦊','🐺','🦁','🐯','🦅','🐉','🦄','🌙','⭐','💫','🔮','💎','🗡️','🏹','💥','🌊','🌋'] },
];

// ─── Emoji Picker ─────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState(0);
  return (
    <div className="absolute bottom-12 left-0 w-72 bg-bg2 border border-border rounded-2xl shadow-2xl z-30 overflow-hidden">
      <div className="flex border-b border-border">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={i} onClick={() => setCat(i)} className={`flex-1 py-2 text-lg transition-colors ${cat === i ? 'bg-purple/20' : 'hover:bg-bg3'}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-9 gap-0.5 p-2 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[cat].emojis.map(e => (
          <button key={e} onClick={() => onSelect(e)} className="w-7 h-7 flex items-center justify-center text-lg hover:bg-bg3 rounded-lg transition-colors">{e}</button>
        ))}
      </div>
    </div>
  );
}

// ─── GIF Picker ───────────────────────────────────────────────────────────────

const GIPHY_KEY = 'dc6zaTOxFJmzC'; // Public beta key — substitui pelo teu em developers.giphy.com

function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('anime');
  const [gifs, setGifs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=pg`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=12&rating=pg`;
      const res = await fetch(url);
      const json = await res.json();
      setGifs((json.data || []).map((g: any) => g.images.fixed_height_small.url));
    } catch { setGifs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search('anime'); }, []);

  return (
    <div className="absolute bottom-12 left-0 w-80 bg-bg2 border border-border rounded-2xl shadow-2xl z-30 overflow-hidden">
      <div className="p-2 border-b border-border flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder="Pesquisar GIFs..." className="flex-1 bg-bg3 rounded-lg px-3 py-1.5 text-sm text-text outline-none" autoFocus />
        <button onClick={() => search(query)} className="btn btn-primary text-xs py-1.5 px-3">Buscar</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-text3" /></div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-2 max-h-52 overflow-y-auto">
          {gifs.map((url, i) => (
            <button key={i} onClick={() => onSelect(url)} className="aspect-square overflow-hidden rounded-lg hover:ring-2 ring-purple transition-all">
              <img src={url} alt="gif" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── OST Picker ───────────────────────────────────────────────────────────────

function OSTPicker({ onSelect, onClose }: { onSelect: (ost: PrivateMessage['ost_data']) => void; onClose: () => void }) {
  const [tracks, setTracks] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('ost_tracks').select('id, title, artist, audio_url, youtube_url')
      .order('likes_count', { ascending: false }).limit(20)
      .then(({ data }) => setTracks(data || []));
  }, []);

  const filtered = tracks.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute bottom-12 left-0 w-80 bg-bg2 border border-border rounded-2xl shadow-2xl z-30 overflow-hidden">
      <div className="p-2 border-b border-border">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar música..." className="w-full bg-bg3 rounded-lg px-3 py-1.5 text-sm text-text outline-none" autoFocus />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.map(t => (
          <button key={t.id} onClick={() => onSelect({ id: t.id, title: t.title, artist: t.artist, audio_url: t.audio_url })}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg3 transition-colors text-left">
            <div className="w-8 h-8 rounded-lg bg-bg3 flex items-center justify-center flex-shrink-0"><Music size={14} className="text-purple2" /></div>
            <div className="min-w-0"><div className="text-sm font-semibold text-text truncate">{t.title}</div><div className="text-xs text-text3 truncate">{t.artist}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, theme, onReact }: {
  msg: PrivateMessage; isMe: boolean; theme: string; onReact: (msgId: string, emoji: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accentColor = CHAT_THEMES[theme]?.accent || '#8b5cf6';
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]) => users.length > 0);
  const myReaction = Object.entries(msg.reactions || {}).find(([, users]) => users.includes('me'))?.[0];

  function startHold() { holdTimer.current = setTimeout(() => setShowReactions(true), 500); }
  function endHold() { if (holdTimer.current) clearTimeout(holdTimer.current); }

  function toggleAudio() {
    const url = msg.ost_data?.audio_url || msg.media_url;
    if (!url) return;
    if (!audioRef.current) { audioRef.current = new Audio(url); audioRef.current.onended = () => setPlaying(false); }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}
      onMouseEnter={() => setShowReactions(false)}
      onTouchStart={startHold} onTouchEnd={endHold} onTouchMove={endHold}>

      {/* Reaction picker on hover (PC) */}
      <div className={`absolute top-0 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} hidden group-hover:flex items-center gap-0.5 bg-bg3 border border-border rounded-full px-1.5 py-1 shadow-lg z-20`}>
        {MSG_REACTIONS.slice(0, 5).map(e => (
          <button key={e} onClick={() => onReact(msg.id, e)} className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform">{e}</button>
        ))}
      </div>

      {/* Reaction picker on long press (Mobile) */}
      {showReactions && (
        <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} flex items-center gap-1 bg-bg3 border border-border rounded-2xl px-2 py-2 shadow-2xl z-30`}>
          {MSG_REACTIONS.map(e => (
            <button key={e} onClick={() => { onReact(msg.id, e); setShowReactions(false); }} className="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 transition-transform">{e}</button>
          ))}
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? `text-white rounded-br-sm` : 'bg-bg3 text-text rounded-bl-sm'}`}
          style={isMe ? { background: accentColor } : undefined}>

          {/* Text */}
          {(!msg.message_type || msg.message_type === 'text') && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}

          {/* Image */}
          {msg.message_type === 'image' && <img src={msg.media_url} alt="" className="rounded-xl max-h-60 max-w-full object-contain cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} />}

          {/* Video */}
          {msg.message_type === 'video' && <video src={msg.media_url} controls className="rounded-xl max-h-60 max-w-full" />}

          {/* GIF */}
          {msg.message_type === 'gif' && <img src={msg.media_url} alt="gif" className="rounded-xl max-h-48 max-w-full" />}

          {/* Audio */}
          {msg.message_type === 'audio' && (
            <div className="flex items-center gap-2 min-w-[140px]">
              <button onClick={toggleAudio} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div className="flex-1 h-1 bg-white/30 rounded-full"><div className="h-full bg-white rounded-full w-0 transition-all" /></div>
              <span className="text-xs opacity-70">🎤</span>
            </div>
          )}

          {/* OST / Music */}
          {msg.message_type === 'ost' && msg.ost_data && (
            <div className="flex items-center gap-2 min-w-[160px]">
              <button onClick={toggleAudio} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 flex-shrink-0">
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{msg.ost_data.title}</div>
                <div className="text-[10px] opacity-70 truncate">{msg.ost_data.artist}</div>
              </div>
              <Music size={14} className="opacity-60 flex-shrink-0" />
            </div>
          )}

          {/* Caption for media */}
          {msg.content && msg.message_type && msg.message_type !== 'text' && (
            <p className="mt-1 text-xs opacity-80">{msg.content}</p>
          )}

          <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-text3'} text-right`}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMe && <span className="ml-1">{msg.read_at ? '✓✓' : '✓'}</span>}
          </p>
        </div>

        {/* Reactions display */}
        {reactionEntries.length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap">
            {reactionEntries.map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${myReaction === emoji ? 'bg-purple/20 border border-purple/40' : 'bg-bg3 border border-border'}`}>
                <span>{emoji}</span>
                {users.length > 1 && <span className="text-text3">{users.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Audio Recorder ───────────────────────────────────────────────────────────

function AudioRecorder({ onRecorded, onCancel }: { onRecorded: (blob: Blob) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        onRecorded(blob);
      };
      recorder.start();
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }).catch(onCancel);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  }

  function cancel() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    chunksRef.current = [];
    onCancel();
  }

  return (
    <div className="flex items-center gap-3 flex-1 bg-red/10 border border-red/30 rounded-xl px-4 py-2">
      <div className="w-2 h-2 rounded-full bg-red animate-pulse" />
      <span className="text-red text-sm font-mono">{String(Math.floor(seconds / 60)).padStart(2,'0')}:{String(seconds % 60).padStart(2,'0')}</span>
      <span className="flex-1 text-text3 text-sm">A gravar...</span>
      <button onClick={cancel} className="text-text3 hover:text-text"><X size={16} /></button>
      <button onClick={stop} className="w-8 h-8 rounded-full bg-red flex items-center justify-center text-white"><Square size={14} /></button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [lastMsgMap, setLastMsgMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showOST, setShowOST] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatResults, setNewChatResults] = useState<Profile[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<string | null>(null);
  activeChatRef.current = activeChat;

  // Close chat menu on outside click
  useEffect(() => {
    if (!chatMenuOpen) return;
    const h = (e: MouseEvent) => { if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setChatMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [chatMenuOpen]);

  // Load chats
  const loadChats = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('private_chats').select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      const list = (data || []) as PrivateChat[];
      setChats(list);

      const otherIds = list.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
      if (otherIds.length) {
        const { data: pData } = await supabase.from('profiles').select('id, username, avatar_url, province').in('id', otherIds);
        const pMap: Record<string, Profile> = {};
        (pData || []).forEach(p => { pMap[p.id] = p as Profile; });
        setProfiles(pMap);
      }

      // Single query for all unread counts (no N+1)
      if (list.length > 0) {
        const ids = list.map(c => c.id);
        const { data: unreadData } = await supabase.from('private_messages')
          .select('chat_id, id').in('chat_id', ids).neq('sender_id', user.id).is('read_at', null)
          .eq('sender_deleted', false);
        const uMap: Record<string, number> = {};
        (unreadData || []).forEach(m => { uMap[m.chat_id] = (uMap[m.chat_id] || 0) + 1; });
        setUnreadMap(uMap);

        // Last message preview
        const { data: lastMsgs } = await supabase.from('private_messages')
          .select('chat_id, content, message_type, created_at')
          .in('chat_id', ids).order('created_at', { ascending: false });
        const lMap: Record<string, string> = {};
        (lastMsgs || []).forEach(m => { if (!lMap[m.chat_id]) lMap[m.chat_id] = m.message_type && m.message_type !== 'text' ? `[${m.message_type}]` : m.content; });
        setLastMsgMap(lMap);
      }
    } catch (err) { handleError(err, showToast, { context: 'carregar conversas', silent: true }); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Auto-start chat from navigation state
  useEffect(() => {
    const startChatWith = (location.state as any)?.startChatWith;
    if (startChatWith && user) {
      window.history.replaceState({}, '');
      openOrCreateChat(startChatWith);
    }
  }, [location.state, user?.id]);

  // Load messages
  const loadMessages = useCallback(async (chatId: string) => {
    if (!user) return;
    try {
      const { data } = await supabase.from('private_messages').select('*')
        .eq('chat_id', chatId).eq('sender_deleted', false)
        .order('created_at', { ascending: true });
      const list = (data || []) as PrivateMessage[];
      setMessages(list);

      // Mark as read
      const unreadIds = list.filter(m => m.sender_id !== user.id && !m.read_at).map(m => m.id);
      if (unreadIds.length) {
        await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
        setUnreadMap(prev => ({ ...prev, [chatId]: 0 }));
      }
    } catch (err) { handleError(err, showToast, { context: 'carregar mensagens', silent: true }); }
  }, [user?.id]);

  useEffect(() => { if (activeChat) loadMessages(activeChat); }, [activeChat, loadMessages]);

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel(`messages_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, async payload => {
        const msg = payload.new as PrivateMessage;
        if (msg.chat_id === activeChatRef.current) {
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.sender_id !== user.id) {
            await supabase.from('private_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id);
            setUnreadMap(prev => ({ ...prev, [msg.chat_id]: 0 }));
          }
        } else if (msg.sender_id !== user.id) {
          setUnreadMap(prev => ({ ...prev, [msg.chat_id]: (prev[msg.chat_id] || 0) + 1 }));
        }
        setLastMsgMap(prev => ({ ...prev, [msg.chat_id]: msg.message_type && msg.message_type !== 'text' ? `[${msg.message_type}]` : msg.content }));
        setChats(prev => {
          const idx = prev.findIndex(c => c.id === msg.chat_id);
          if (idx < 0) { loadChats(); return prev; }
          const updated = [...prev];
          updated[idx] = { ...updated[idx], last_message_at: msg.created_at };
          return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, payload => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .subscribe();

    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.id]);

  async function openOrCreateChat(otherId: string) {
    if (!user || otherId === user.id) return;
    const { data: existing } = await supabase.from('private_chats').select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${user.id})`)
      .maybeSingle();
    if (existing) {
      setActiveChat(existing.id); setMobileShowChat(true); return;
    }
    const { data: newChat } = await supabase.from('private_chats').insert({ user1_id: user.id, user2_id: otherId }).select('id').maybeSingle();
    if (newChat) { setActiveChat(newChat.id); setMobileShowChat(true); loadChats(); }
  }

  // Send message
  async function handleSend(type = 'text', mediaUrl?: string, ostData?: PrivateMessage['ost_data']) {
    if (!user || !activeChat) return;
    if (type === 'text' && !messageInput.trim()) return;
    setSending(true);
    const content = type === 'text' ? messageInput.trim() : (messageInput.trim() || '');
    const tempId = `temp_${Date.now()}`;
    const tempMsg: PrivateMessage = {
      id: tempId, chat_id: activeChat, sender_id: user.id, content,
      read_at: null, created_at: new Date().toISOString(),
      message_type: type, media_url: mediaUrl,
      ost_data: ostData, reactions: {},
    };
    setMessages(prev => [...prev, tempMsg]);
    setMessageInput('');
    try {
      const payload: any = { chat_id: activeChat, sender_id: user.id, content, message_type: type };
      if (mediaUrl) payload.media_url = mediaUrl;
      if (ostData) payload.ost_data = ostData;
      const { data: ins } = await supabase.from('private_messages').insert(payload).select('id').maybeSingle();
      if (ins) setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: ins.id } : m));
      await supabase.from('private_chats').update({ last_message_at: new Date().toISOString() }).eq('id', activeChat);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageInput(content);
      handleError(err, showToast, { context: 'enviar mensagem' });
    } finally { setSending(false); }
  }

  // React to message
  async function handleReact(msgId: string, emoji: string) {
    if (!user) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    const users = reactions[emoji] || [];
    const myIdx = users.indexOf(user.id);
    if (myIdx >= 0) users.splice(myIdx, 1);
    else users.push(user.id);
    reactions[emoji] = users;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m));
    try {
      await supabase.from('private_messages').update({ reactions }).eq('id', msgId);
    } catch { loadMessages(activeChat!); }
  }

  // Upload media
  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChat) return;
    if (file.size > 50 * 1024 * 1024) { showToast('Ficheiro muito grande (máx 50MB)', 'error'); return; }
    setUploadingMedia(true);
    try {
      const prepared = await prepareMediaForUpload(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
      const ext = prepared.name.split('.').pop();
      const path = `messages/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, prepared);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      const type = file.type.startsWith('video') ? 'video' : 'image';
      await handleSend(type, publicUrl);
    } catch (err) { handleError(err, showToast, { context: 'enviar media' }); }
    finally { setUploadingMedia(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  // Audio recorded
  async function handleAudioRecorded(blob: Blob) {
    setRecording(false);
    if (!user || !activeChat) return;
    setUploadingMedia(true);
    try {
      const path = `messages/${user.id}/audio_${Date.now()}.webm`;
      const { error } = await supabase.storage.from('uploads').upload(path, blob);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      await handleSend('audio', publicUrl);
    } catch (err) { handleError(err, showToast, { context: 'enviar áudio' }); }
    finally { setUploadingMedia(false); }
  }

  // Chat actions
  async function handleDeleteChat() {
    if (!activeChat || !user || !confirm('Eliminar esta conversa?')) return;
    await supabase.from('private_messages').update({ sender_deleted: true }).eq('chat_id', activeChat).eq('sender_id', user.id);
    setActiveChat(null); setMobileShowChat(false); loadChats(); setChatMenuOpen(false);
  }

  async function handleMarkUnread(chatId: string) {
    const isUnread = (unreadMap[chatId] || 0) > 0;
    if (isUnread) setUnreadMap(prev => ({ ...prev, [chatId]: 0 }));
    else setUnreadMap(prev => ({ ...prev, [chatId]: 1 }));
  }

  async function handleChangeTheme(theme: string) {
    if (!activeChat) return;
    await supabase.from('private_chats').update({ theme }).eq('id', activeChat);
    setChats(prev => prev.map(c => c.id === activeChat ? { ...c, theme } : c));
    setShowThemePicker(false);
  }

  function handleVideoCall() {
    if (!activeChat) return;
    window.open(`https://meet.jit.si/otakukamba-${activeChat}`, '_blank');
  }

  // Search users for new chat
  useEffect(() => {
    if (!newChatSearch.trim() || newChatSearch.length < 2) { setNewChatResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingUsers(true);
      const { data } = await supabase.from('profiles').select('id, username, avatar_url, province').ilike('username', `%${newChatSearch}%`).neq('id', user?.id || '').limit(8);
      setNewChatResults((data || []) as Profile[]);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(t);
  }, [newChatSearch, user?.id]);

  const activeChatData = useMemo(() => chats.find(c => c.id === activeChat), [chats, activeChat]);
  const otherUser = useMemo(() => {
    if (!activeChatData || !user) return null;
    return profiles[activeChatData.user1_id === user.id ? activeChatData.user2_id : activeChatData.user1_id];
  }, [activeChatData, profiles, user]);
  const chatTheme = activeChatData?.theme || 'purple';
  const accentColor = CHAT_THEMES[chatTheme]?.accent || '#8b5cf6';

  const filteredChats = useMemo(() => {
    let list = chats;
    if (filter === 'unread') list = list.filter(c => (unreadMap[c.id] || 0) > 0);
    if (search.trim()) {
      list = list.filter(c => {
        const otherId = c.user1_id === user?.id ? c.user2_id : c.user1_id;
        return profiles[otherId]?.username?.toLowerCase().includes(search.toLowerCase());
      });
    }
    return list;
  }, [chats, filter, search, unreadMap, profiles, user?.id]);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  // ── Conversation list ──
  const ConversationList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bebas text-2xl text-text flex items-center gap-2">
            Conversas
            {totalUnread > 0 && <span className="px-2 py-0.5 rounded-full bg-red text-white text-xs font-bold">{totalUnread}</span>}
          </h2>
          <button onClick={() => setShowNewChat(true)} className="w-8 h-8 rounded-xl bg-purple flex items-center justify-center text-white hover:bg-purple2 transition-colors"><Plus size={16} /></button>
        </div>
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversa..." className="input w-full pl-9 text-sm py-2" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setFilter('all')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === 'all' ? 'bg-purple/20 text-purple2' : 'text-text3 hover:text-text'}`}>Todas</button>
          <button onClick={() => setFilter('unread')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${filter === 'unread' ? 'bg-purple/20 text-purple2' : 'text-text3 hover:text-text'}`}>
            <BellOff size={11} /> Não lidas
            {totalUnread > 0 && <span className="bg-red text-white text-[9px] px-1 rounded-full">{totalUnread}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-bg3 flex-shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3 bg-bg3 rounded w-24" /><div className="h-2.5 bg-bg3 rounded w-36" /></div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-10 text-text3 text-sm">
            {filter === 'unread' ? 'Sem mensagens não lidas 🎉' : 'Sem conversas ainda.'}
          </div>
        ) : (
          filteredChats.map(chat => {
            const otherId = chat.user1_id === user?.id ? chat.user2_id : chat.user1_id;
            const p = profiles[otherId];
            const isActive = chat.id === activeChat;
            const unread = unreadMap[chat.id] || 0;
            const lastMsg = lastMsgMap[chat.id] || '';
            const timeStr = chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div key={chat.id} className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 ${isActive ? 'bg-purple/10' : 'hover:bg-bg3'}`}
                onClick={() => { setActiveChat(chat.id); setMobileShowChat(true); }}>
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-bg3 flex items-center justify-center text-sm font-bold text-text2">
                    {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p?.username || '?').charAt(0).toUpperCase()}
                  </div>
                  {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-white text-[9px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold text-sm truncate ${unread > 0 ? 'text-text' : 'text-text2'}`}>{p?.username || 'Utilizador'}</span>
                    <span className="text-[10px] text-text3 flex-shrink-0 ml-2">{timeStr}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-text2 font-medium' : 'text-text3'}`}>{lastMsg || 'Iniciar conversa'}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); handleMarkUnread(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-bg4 flex items-center justify-center text-text3 hover:text-text transition-all flex-shrink-0"
                  title={unread > 0 ? 'Marcar como lida' : 'Marcar como não lida'}>
                  {unread > 0 ? <CheckCheck size={11} /> : <Check size={11} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // ── Chat window ──
  const ChatWindow = activeChat && otherUser ? (
    <div className={`flex-1 flex flex-col min-h-0 transition-all ${minimized ? 'max-h-14' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0" style={{ borderBottomColor: `${accentColor}30` }}>
        <button onClick={() => { setMobileShowChat(false); setActiveChat(null); }} className="md:hidden text-text3 hover:text-text flex-shrink-0"><ChevronLeft size={20} /></button>
        <Link to={`/perfil/${otherUser.username}`} className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-bg3 flex items-center justify-center text-sm font-bold text-text2">
            {otherUser.avatar_url ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" /> : otherUser.username.charAt(0).toUpperCase()}
          </div>
        </Link>
        <Link to={`/perfil/${otherUser.username}`} className="flex-1 min-w-0">
          <div className="font-semibold text-text text-sm truncate">{otherUser.username}</div>
          <div className="text-[11px] text-text3">{otherUser.province || 'Online'}</div>
        </Link>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handleVideoCall} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors" title="Videochamada via Jitsi"><Video size={16} /></button>
          <button onClick={() => setMinimized(m => !m)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors hidden md:flex" title="Minimizar">
            {minimized ? '▲' : '▽'}
          </button>
          <div className="relative" ref={chatMenuRef}>
            <button onClick={() => setChatMenuOpen(m => !m)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors"><MoreVertical size={16} /></button>
            {chatMenuOpen && (
              <div className="absolute right-0 top-10 bg-bg3 border border-border rounded-xl shadow-2xl z-30 w-52 py-1 overflow-hidden">
                <button onClick={() => { setShowThemePicker(true); setChatMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-bg4"><Palette size={14} className="text-purple2" /> Tema da conversa</button>
                <button onClick={() => { handleVideoCall(); setChatMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-bg4"><Video size={14} className="text-teal" /> Videochamada</button>
                <div className="border-t border-border my-1" />
                <button onClick={() => { showToast('Funcionalidade em breve', 'info'); setChatMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-bg4"><UserX size={14} className="text-amber" /> Bloquear utilizador</button>
                <button onClick={() => { showToast('Denúncia enviada ao admin', 'success'); setChatMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-bg4"><Flag size={14} className="text-amber" /> Denunciar</button>
                <button onClick={handleDeleteChat} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red hover:bg-bg4"><Trash2 size={14} /> Eliminar conversa</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme picker */}
      {showThemePicker && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg3 flex-shrink-0">
          <span className="text-xs text-text3 mr-1">Tema:</span>
          {Object.entries(CHAT_THEMES).map(([key, val]) => (
            <button key={key} onClick={() => handleChangeTheme(key)} className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${chatTheme === key ? 'border-text scale-110' : 'border-transparent'}`}
              style={{ background: val.accent }} title={val.label} />
          ))}
          <button onClick={() => setShowThemePicker(false)} className="ml-auto text-text3 hover:text-text"><X size={14} /></button>
        </div>
      )}

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="text-4xl mb-3">👋</div>
                <p className="text-text2 text-sm font-semibold">Início da conversa com {otherUser.username}</p>
                <p className="text-text3 text-xs mt-1">Diz olá!</p>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === user?.id} theme={chatTheme} onReact={handleReact} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border flex-shrink-0 relative" style={{ borderTopColor: `${accentColor}30` }}>
            {recording ? (
              <AudioRecorder onRecorded={handleAudioRecorded} onCancel={() => setRecording(false)} />
            ) : (
              <div className="flex items-end gap-2">
                {/* Media buttons */}
                <div className="flex items-center gap-1 flex-shrink-0 pb-1">
                  <div className="relative">
                    <button onClick={() => { setShowEmoji(e => !e); setShowGif(false); setShowOST(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showEmoji ? 'text-purple2 bg-purple/20' : 'text-text3 hover:text-text hover:bg-bg3'}`}><Smile size={17} /></button>
                    {showEmoji && <EmojiPicker onSelect={e => setMessageInput(p => p + e)} onClose={() => setShowEmoji(false)} />}
                  </div>
                  <div className="relative">
                    <button onClick={() => { setShowGif(g => !g); setShowEmoji(false); setShowOST(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showGif ? 'text-teal bg-teal/20' : 'text-text3 hover:text-text hover:bg-bg3'}`}><Gift size={17} /></button>
                    {showGif && <GifPicker onSelect={url => { handleSend('gif', url); setShowGif(false); }} onClose={() => setShowGif(false)} />}
                  </div>
                  <div className="relative">
                    <button onClick={() => { setShowOST(o => !o); setShowEmoji(false); setShowGif(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showOST ? 'text-amber bg-amber/20' : 'text-text3 hover:text-text hover:bg-bg3'}`}><Music size={17} /></button>
                    {showOST && <OSTPicker onSelect={ost => { handleSend('ost', undefined, ost); setShowOST(false); }} onClose={() => setShowOST(false)} />}
                  </div>
                  <button onClick={() => fileRef.current?.click()} disabled={uploadingMedia} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors disabled:opacity-50">
                    {uploadingMedia ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={17} />}
                  </button>
                  <button onClick={() => setRecording(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text3 hover:text-text hover:bg-bg3 transition-colors"><Mic size={17} /></button>
                </div>

                <input ref={inputRef} value={messageInput} onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onClick={() => { setShowEmoji(false); setShowGif(false); setShowOST(false); }}
                  placeholder="Mensagem..." className="flex-1 bg-bg3 border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-border2 transition-colors min-h-[42px] max-h-32 resize-none" />

                <button onClick={() => handleSend()} disabled={sending || !messageInput.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all disabled:opacity-40"
                  style={{ background: accentColor }}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" />
          </div>
        </>
      )}
    </div>
  ) : (
    <div className="flex-1 hidden md:flex items-center justify-center flex-col text-center">
      <div className="text-5xl mb-4">💬</div>
      <h3 className="font-rajdhani font-bold text-xl text-text mb-2">Selecciona uma conversa</h3>
      <p className="text-text3 text-sm">Ou inicia uma nova clicando em +</p>
    </div>
  );

  return (
    <div className="h-screen pt-16 flex flex-col bg-bg">
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: split view | Mobile: list OR chat */}
        <div className={`w-full md:w-80 border-r border-border bg-bg2 flex-shrink-0 flex flex-col ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          {ConversationList}
        </div>
        <div className={`flex-1 flex flex-col min-w-0 bg-bg2 ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
          {ChatWindow}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowNewChat(false)}>
          <div className="bg-bg2 border border-border rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-rajdhani font-bold text-lg text-text">Nova Conversa</h2>
              <button onClick={() => setShowNewChat(false)}><X size={18} className="text-text3" /></button>
            </div>
            <input value={newChatSearch} onChange={e => setNewChatSearch(e.target.value)} placeholder="Buscar utilizador..." className="input w-full text-sm mb-3" autoFocus />
            <div className="space-y-1.5 min-h-[80px]">
              {searchingUsers && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-text3" /></div>}
              {!searchingUsers && newChatSearch.length >= 2 && newChatResults.length === 0 && <p className="text-center text-xs text-text3 py-4">Nenhum utilizador encontrado.</p>}
              {newChatResults.map(p => (
                <button key={p.id} onClick={() => { openOrCreateChat(p.id); setShowNewChat(false); setNewChatSearch(''); }}
                  className="w-full flex items-center gap-3 bg-bg3 rounded-xl p-3 hover:bg-bg4 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-bg flex items-center justify-center text-sm font-bold text-text2 flex-shrink-0">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0"><div className="font-semibold text-text text-sm truncate">{p.username}</div><div className="text-xs text-text3">{p.province || ''}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
