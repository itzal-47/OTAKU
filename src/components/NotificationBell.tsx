import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, Check, MessageCircle, Swords, Heart, User, Trophy } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const channel = supabase.channel('notifications');
      channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, () => {
        loadNotifications();
      });
      channel.subscribe();
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  async function loadNotifications() {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  }

  async function markAsRead(id: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllAsRead() {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function getIcon(type: string) {
    switch (type) {
      case 'duel': return <Swords className="text-red" size={16} />;
      case 'duel_win': return <Trophy className="text-amber" size={16} />;
      case 'duel_loss': return <Swords className="text-text3" size={16} />;
      case 'message': return <MessageCircle className="text-teal" size={16} />;
      case 'like': return <Heart className="text-red" size={16} />;
      case 'follow': return <User className="text-purple" size={16} />;
      case 'event': return <Trophy className="text-amber" size={16} />;
      default: return <Bell className="text-purple" size={16} />;
    }
  }

  function formatTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative w-8 h-8 rounded-lg hover:bg-bg3 flex items-center justify-center transition-colors"
      >
        <Bell size={18} className="text-text2 hover:text-text" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg2 border border-border rounded-2xl shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="font-rajdhani font-bold text-text">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-purple2 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text3 text-sm">
                <Bell className="mx-auto mb-2 opacity-30" size={32} />
                Sem notificações
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`flex gap-3 p-3 hover:bg-bg3 transition-colors ${
                    !notification.read ? 'bg-purple/5' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-bg3 flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text font-medium truncate">
                      {notification.title}
                    </div>
                    {notification.message && (
                      <div className="text-xs text-text3 truncate mt-0.5">
                        {notification.message}
                      </div>
                    )}
                    <div className="text-[10px] text-text3 mt-1">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="w-6 h-6 rounded bg-teal/15 text-teal hover:bg-teal/25 flex items-center justify-center flex-shrink-0"
                    >
                      <Check size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setShowDropdown(false)}
            className="block text-center p-3 border-t border-border text-sm text-purple2 hover:bg-bg3"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}