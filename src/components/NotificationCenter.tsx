import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  Bell, X, UserPlus, Swords, Heart, MessageCircle, Users, Shield,
  CheckCircle2, Loader2, BellOff, Trash2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

// Mapeia o tipo de notificação para ícone, cor e destino de navegação.
// Centraliza aqui em vez de espalhar lógica por cada página que cria notificações.
const TYPE_META: Record<string, { icon: any; color: string; route?: (data: any) => string }> = {
  group_invite: { icon: Users, color: 'text-purple2', route: d => `/groups/${d?.group_id}` },
  duel_challenge: { icon: Swords, color: 'text-red', route: () => `/arena` },
  post_like: { icon: Heart, color: 'text-red', route: () => `/feed` },
  post_comment: { icon: MessageCircle, color: 'text-teal', route: () => `/feed` },
  clan_request: { icon: Shield, color: 'text-amber', route: () => `/clans` },
  clan_accepted: { icon: CheckCircle2, color: 'text-teal', route: () => `/clans` },
  follow: { icon: UserPlus, color: 'text-purple2', route: d => `/perfil/${d?.username || ''}` },
  default: { icon: Bell, color: 'text-text3' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short' });
}

// ─── Single notification row ────────────────────────────────────────────────

function NotificationRow({ n, onRead, onNavigate, onDelete }: {
  n: Notification; onRead: (id: string) => void; onNavigate: (n: Notification) => void; onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[n.type] || TYPE_META.default;
  const Icon = meta.icon;

  return (
    <div
      onClick={() => onNavigate(n)}
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${n.read ? 'hover:bg-bg3' : 'bg-purple/5 hover:bg-purple/10'}`}
    >
      <div className={`w-9 h-9 rounded-full bg-bg3 flex items-center justify-center flex-shrink-0 ${meta.color}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${n.read ? 'text-text2' : 'text-text font-medium'}`}>{n.title}</p>
        {n.message && <p className="text-xs text-text3 mt-0.5 line-clamp-2">{n.message}</p>}
        <p className="text-[10px] text-text3/70 mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && <span className="w-2 h-2 rounded-full bg-purple2 flex-shrink-0 mt-1.5" />}
      <button
        onClick={e => { e.stopPropagation(); onDelete(n.id); }}
        className="absolute right-2 top-2 w-6 h-6 rounded-lg flex items-center justify-center text-text3 hover:text-red hover:bg-bg4 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remover"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Main: Bell + Dropdown ───────────────────────────────────────────────────

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listRef = useRef<Notification[]>([]);
  listRef.current = notifications;

  const loadNotifications = useCallback(async (append = false) => {
    if (!user) return;
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const offset = append ? listRef.current.length : 0;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      setHasMore((data?.length || 0) === PAGE_SIZE);
      setNotifications(prev => append ? [...prev, ...(data || [])] : (data || []));
    } catch (err) {
      console.error('[NotificationCenter] erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id]);

  async function loadUnreadCount() {
    if (!user) return;
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
    setUnreadCount(count || 0);
  }

  // Initial load + realtime subscription
  useEffect(() => {
    if (!user) return;
    loadNotifications(false);
    loadUnreadCount();

    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase.channel(`notifications_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Toca um pequeno feedback visual — pulse no sino já é tratado via CSS abaixo
      })
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.id, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function markAsRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  }

  async function markAllAsRead() {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  }

  async function handleDelete(id: string) {
    const wasUnread = notifications.find(n => n.id === id)?.read === false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('notifications').delete().eq('id', id);
  }

  function handleNavigate(n: Notification) {
    if (!n.read) markAsRead(n.id);
    const meta = TYPE_META[n.type] || TYPE_META.default;
    setOpen(false);
    if (meta.route) navigate(meta.route(n.data));
  }

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-text2 hover:text-text hover:bg-bg3 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red text-white text-[9px] font-bold flex items-center justify-center" style={{ boxShadow: '0 0 0 2px var(--color-bg)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[340px] max-w-[90vw] bg-bg2 border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-rajdhani font-bold text-text text-sm">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[11px] text-purple2 hover:underline font-medium">Marcar todas como lidas</button>
              )}
              <button onClick={() => setOpen(false)} className="text-text3 hover:text-text md:hidden"><X size={16} /></button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-text3" /></div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <BellOff size={28} className="text-text3 mb-2" />
                <p className="text-sm text-text3">Sem notificações por agora.</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationRow key={n.id} n={n} onRead={markAsRead} onNavigate={handleNavigate} onDelete={handleDelete} />
              ))
            )}

            {hasMore && !loading && notifications.length > 0 && (
              <div className="flex justify-center py-3">
                <button onClick={() => loadNotifications(true)} disabled={loadingMore} className="text-xs text-text3 hover:text-text font-medium disabled:opacity-50">
                  {loadingMore ? 'A carregar...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper para criar notificações de qualquer página da app.
 * Centraliza o formato — evita inconsistências entre páginas diferentes
 * (ex: GroupDetailPage e ArenaPage já criam notificações manualmente,
 * isto padroniza o "data" e os "type" usados acima em TYPE_META).
 *
 * Uso:
 *   import { sendNotification } from '../components/NotificationCenter';
 *   await sendNotification(opponentId, 'duel_challenge', 'Desafio directo!', `${char.name} desafiou-te`, { duel_id });
 */
export async function sendNotification(
  userId: string,
  type: keyof typeof TYPE_META | string,
  title: string,
  message: string,
  data: Record<string, any> = {}
) {
  try {
    await supabase.from('notifications').insert({ user_id: userId, type, title, message, data, read: false });
  } catch (err) {
    console.error('[sendNotification] falhou:', err);
  }
}
